
const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);


let currentUser = null;
let userProfile = null;
let currentRoleView = null;
let allApprovedEmployees = [];


async function init() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = "index.html";
        return;
    }
    currentUser = session.user;

    await fetchUserProfile();
    await fetchDirectory(); 
    await updateBadges();   

    await loadFilterDepartments();
    
    setupUIListeners();
}

document.addEventListener('DOMContentLoaded', init);


async function fetchUserProfile() {
    try {
        const { data, error } = await _supabase
            .from('employee')
            .select('*')
            .eq('user_id', currentUser.id) 
            .single();

        if (data) {
            userProfile = data;
            currentRoleView = data.role;
            renderUserUI();
        }
    } catch (err) {
        console.error("Profile Fetch Error:", err);
    }
}

function renderUserUI() {
    if (!userProfile) return;

    
    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.innerText = `${userProfile.first_name} ${userProfile.last_name}`;
    
    
    const roleDisplay = { 'SuperAdmin': 'CEO ', 'Admin': 'Manager ', 'User': 'Employee ' };
    const roleEl = document.getElementById('userRole');
    if (roleEl) roleEl.innerText = roleDisplay[currentRoleView] || currentRoleView;

    const thumbContainer = document.getElementById('userInitials');
    if (thumbContainer) {
        if (userProfile.avatar_url) {
            thumbContainer.innerHTML = `<img src="${userProfile.avatar_url}" style="width:100%; height:100%; border-radius:30%; object-fit:cover;">`;
        } else {
            const initials = (userProfile.first_name[0] + userProfile.last_name[0]).toUpperCase();
            thumbContainer.innerText = initials;
        }
    }

    
    document.querySelectorAll('.auth-admin').forEach(el => {
        el.style.display = (currentRoleView === 'Admin' || currentRoleView === 'SuperAdmin') ? 'block' : 'none';
    });
    document.querySelectorAll('.auth-super').forEach(el => {
        el.style.display = (currentRoleView === 'SuperAdmin') ? 'block' : 'none';
    });


    const switcher = document.getElementById('superAdminTools');
    if (userProfile.role === 'SuperAdmin' && switcher) {
        switcher.style.display = 'flex';
        const roleSwitchEl = document.getElementById('roleSwitcher');
        if (roleSwitchEl) roleSwitchEl.value = currentRoleView;
    }
}

async function updateBadges() {
    
    const { count: pendingCount } = await _supabase
        .from('employee')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');
    const recruitBadge = document.getElementById('badge-count');
    if (recruitBadge) {
        recruitBadge.innerText = pendingCount;
        recruitBadge.style.display = pendingCount > 0 ? 'flex' : 'none';
    }

    
    const { count: msgCount } = await _supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);
    const msgBadge = document.getElementById('msg-badge-nav');
    if (msgBadge) {
        msgBadge.innerText = msgCount > 99 ? '99+' : msgCount;
        msgBadge.style.display = msgCount > 0 ? 'flex' : 'none';
    }

    
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const { data: annData } = await _supabase
        .from('announcements')
        .select('id')
        .gt('created_at', twentyFourHoursAgo.toISOString()) 
        .limit(1);
    const annBadge = document.getElementById('ann-badge-nav');
    if (annBadge) {
        annBadge.style.display = (annData && annData.length > 0) ? 'flex' : 'none';
        if (annData && annData.length > 0) annBadge.innerText = "!";
    }
}


window.fetchDirectory = async () => {
    try {
        const grid = document.getElementById('directoryGrid');
        
        
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return;

        
        const { data, error } = await _supabase
            .from('employee')
            .select(`
                *,
                job (
                    department_id,
                    position,
                    department ( department_name )
                )
            `)
            .order('last_name', { ascending: true });

        if (error) throw error;

        
        const filteredData = data.filter(emp => {
            
            if (userProfile.role !== 'SuperAdmin' && emp.role === 'SuperAdmin') {
                
                return emp.user_id === session.user.id; 
            }
            return true;
        });

        
        allApprovedEmployees = filteredData.map(emp => {
            return {
                ...emp,
                role: emp.role,
                dept_id: emp.job ? emp.job.department_id : null,
                position: emp.job ? emp.job.position : "Staff",
                department_name: emp.job?.department?.department_name || "Operations"
            };
        });

        
        renderDirectoryCards(allApprovedEmployees);

    } catch (err) {
        console.error("Directory Critical Error:", err);
        const grid = document.getElementById('directoryGrid');
        if (grid) grid.innerHTML = `<p style="colopenAddModalor:red; padding: 20px;">Error: ${err.message}</p>`;
    }
};

window.openAddModal = () => {
    const modal = document.getElementById('deptModal');
    document.getElementById('modalTitle').textContent = "Add New Department";
    document.getElementById('deptForm').reset();
    document.getElementById('editDeptId').value = "";
    
    
    modal.style.display = 'flex'; 
};

function renderDirectoryCards(list) {
    const grid = document.getElementById('directoryGrid');
    if (!grid) return;
    
    if (list.length === 0) {
        grid.innerHTML = `<div class="loading-container" style="grid-column: 1/-1;"><p>No colleagues found.</p></div>`;
        return;
    }

    grid.innerHTML = list.map(emp => {
        const initials = ((emp.first_name?.[0] || '') + (emp.last_name?.[0] || '')).toUpperCase();
        return `
            <div class="employee-card">
                <div class="card-avatar">${emp.avatar_url ? `<img src="${emp.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : initials}</div>
                <div class="card-main-info">
                    <h3 class="card-fullname">${emp.first_name} ${emp.last_name}</h3>
                    <p class="card-position">${emp.position}</p> 
                    <p class="card-department">${emp.department_name}</p>
                </div>        
                <div class="card-contact-list">
                    <div class="contact-item"><i class="fa fa-envelope-o"></i> <span>${emp.email}</span></div>
                    <div class="contact-item"><i class="fa fa-phone"></i> <span>${emp.contact || 'No contact'}</span></div>
                </div>
                <div class="card-footer-actions">
                    <button class="btn-view-action" style="width: 100%;" onclick="showFullProfile('${emp.user_id}')">
                        <i class="fa fa-eye"></i> View Profile
                    </button>
                </div>
            </div>
        `;
    }).join('');
}


window.filterDirectory = () => {
    const searchTerm = document.getElementById('dirSearch').value.toLowerCase().trim();
    const deptFilter = document.getElementById('filterDept').value; 
    const roleFilter = document.getElementById('filterRole').value; 

    const filtered = allApprovedEmployees.filter(emp => {
        
        const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm);
        
        
        const matchesDept = (deptFilter === 'all') || (emp.dept_id === deptFilter);


        const matchesRole = (roleFilter === 'all') || (emp.role === roleFilter);

        return matchesSearch && matchesDept && matchesRole;
    });

    renderDirectoryCards(filtered);
};

async function loadFilterDepartments() {
    const deptSelect = document.getElementById('filterDept');
    if (!deptSelect) return;

    try {
        const { data: depts, error } = await _supabase
            .from('department') 
            .select('id, department_name')
            .order('department_name', { ascending: true });

        if (error) throw error;

        let html = '<option value="all">All Departments</option>';
        depts.forEach(d => {
            
            html += `<option value="${d.id}">${d.department_name}</option>`;
        });
        
        deptSelect.innerHTML = html;
    } catch (err) {
        console.error("Error loading filter departments:", err);
    }
}


async function populateFilterDepartments() {
    const { data: departments, error } = await _supabase
        .from('department') 
        .select('id, name')
        .order('name', { ascending: true });

    if (error) {
        console.error("Error fetching departments for filter:", error);
        return;
    }

    const filterDeptSelect = document.getElementById('filterDept');
    if (!filterDeptSelect) return;

    
    filterDeptSelect.innerHTML = '<option value="all">All Departments</option>';
    
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id; 
        option.textContent = dept.name;
        filterDeptSelect.appendChild(option);
    });
}

async function fetchJobHistory(employeeUuid) {
    const historyContainer = document.getElementById('jobHistoryList');
    if (!historyContainer) return;

    try {
        const { data, error } = await _supabase
            .from('jobhistory')
            .select(`
                *,
                department ( department_name )
            `)
            .eq('employee_id', employeeUuid)
            .order('start_date', { ascending: false }); 

        if (error) throw error;

        if (!data || data.length === 0) {
            historyContainer.innerHTML = '<p style="font-size:13px; color:#94a3b8;">No career records found.</p>';
            return;
        }

        historyContainer.innerHTML = data.map((job, index) => {
            
            const isLatest = index === 0 && !job.end_date;
            
            const startDate = new Date(job.start_date).toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric', year: 'numeric' 
            });
            
            const endDate = job.end_date 
                ? new Date(job.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                : (isLatest ? 'Present' : 'Ended');

            return `
            <div style="padding: 12px; border-left: 3px solid ${isLatest ? '#3b82f6' : '#cbd5e1'}; margin-bottom: 12px; position: relative; padding-left: 20px; background: white; border-radius: 0 8px 8px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="width: 12px; height: 12px; background: ${isLatest ? '#3b82f6' : '#94a3b8'}; border-radius: 50%; position: absolute; left: -8px; top: 16px; border: 2px solid white;"></div>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <strong style="font-size:14px; color:#1e293b;">${job.position}</strong>
                    ${isLatest ? '<span style="background:#dcfce7; color:#15803d; font-size:10px; padding:2px 8px; border-radius:10px; font-weight:700;">CURRENT</span>' : ''}
                </div>
                
                <div style="font-size:12px; color:#475569; margin-top: 4px;">
                    <i class="fa fa-sitemap"></i> ${job.department?.department_name || 'Unassigned'} 
                    <span style="margin: 0 5px;">•</span> 
                    <i class="fa fa-map-marker"></i> ${job.work_location || 'Not Specified'}
                </div>
                
                <div style="margin-top: 8px; font-size:11px; color:#94a3b8; font-weight: 500;">
                    ${startDate} — ${endDate}
                </div>
            </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Timeline Error:", err);
        historyContainer.innerHTML = '<p style="color:#ef4444;">Error loading career data.</p>';
    }
}

window.showFullProfile = async (userId) => {
    const emp = allApprovedEmployees.find(e => e.user_id === userId);
    if (!emp) return;

    const modal = document.getElementById('profileViewModal');
    
    
    modal.innerHTML = `
        <div class="modal-content-card" style="max-width: 600px; width: 90%;">
            <button class="modal-close-btn" onclick="closeProfileModal()"><i class="fa fa-times"></i></button>

            <div class="modal-profile-header" style="text-align: center;">
                <div class="card-avatar" style="width: 80px; height: 80px; margin: 0 auto 10px;">
                    ${emp.avatar_url ? `<img src="${emp.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : (emp.first_name[0] + emp.last_name[0]).toUpperCase()}
                </div>
                <h2 style="margin: 0;">${emp.first_name} ${emp.last_name}</h2>
                <p style="color: #3b82f6; font-weight: 600; margin-top: 4px;">${emp.position}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <div class="info-group">
                    <label style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Department</label>
                    <p style="margin: 0; font-weight: 500;">${emp.department_name}</p>
                </div>
                <div class="info-group">
                    <label style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Email</label>
                    <p style="margin: 0; font-weight: 500;">${emp.email}</p>
                </div>
            </div>

            <div style="margin-top: 25px;">
                <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 10px;">Job History & Timeline</label>
                <div id="jobHistoryList" style="max-height: 300px; overflow-y: auto; background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <i class="fa fa-spinner fa-spin"></i> Loading timeline...
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    fetchJobHistory(emp.id); 
};

window.closeProfileModal = () => {
    document.getElementById('profileViewModal').style.display = 'none';
};


window.startCommunication = (userId) => {
    
    window.location.href = `messages.html?user=${userId}`;
}; 

function setupUIListeners() {
    window.toggleDropdown = () => document.getElementById('profileMenu')?.classList.toggle('show');
    window.toggleNotifPanel = () => document.getElementById('notifPanel')?.classList.toggle('show');

    window.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-trigger')) document.getElementById('profileMenu')?.classList.remove('show');
        if (!e.target.closest('.notif-wrapper')) document.getElementById('notifPanel')?.classList.remove('show');
    });
}

window.previewRole = (newRole) => {
    currentRoleView = newRole;
    renderUserUI();
    
    if (typeof renderTable === 'function') {
        renderTable(allDepartments, lastFetchedJobs);
    }
};

window.handleSignOut = async () => {
    await _supabase.from('employee').update({ status: 'offline' }).eq('user_id', currentUser.id);
    await _supabase.auth.signOut();
    window.location.href = "index.html";
};