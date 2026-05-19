
const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let allDepartments = [];
let allEmployees = [];
let currentUser = null; 
let currentRoleView = null;
let userProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = "index.html";
        return;
    }
    currentUser = session.user;

    await fetchUserProfile();
    await fetchData();
    await updateBadges();
    setupEventListeners();
});

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

window.previewRole = (newRole) => {
    currentRoleView = newRole;
    renderUserUI();

    if (typeof renderTable === 'function') {
        renderTable(allDepartments, lastFetchedJobs);
    }
};

window.toggleNotifPanel = () => {
    const panel = document.getElementById('notifPanel');
    if (panel) {
        panel.classList.toggle('show');
    }
};


window.addEventListener('click', (e) => {
    // 1. Handle Profile Dropdown
    if (!e.target.closest('.profile-trigger')) {
        const menu = document.getElementById('profileMenu');
        if (menu) menu.style.display = 'none';
    }

   
    if (!e.target.closest('.notif-wrapper')) {
        const panel = document.getElementById('notifPanel');
        if (panel && panel.classList.contains('show')) {
            panel.classList.remove('show');
        }
    }
    
    
    const modal = document.getElementById('deptModal');
    if (event.target == modal) closeModal();
});

async function updateBadges() {
    
    const { count: pendingCount, error: recruitError } = await _supabase
        .from('employee')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

    if (recruitError) {
        console.error("Error fetching recruitment count:", recruitError);
    } else {
        const recruitBadge = document.getElementById('badge-count');
        if (recruitBadge) {
            
            recruitBadge.innerText = pendingCount;
            recruitBadge.style.display = pendingCount > 0 ? 'flex' : 'none';
        }
    }

}

function setupUIListeners() {
    window.toggleDropdown = () => document.getElementById('profileMenu')?.classList.toggle('show');
    window.toggleNotifPanel = () => document.getElementById('notifPanel')?.classList.toggle('show');

    window.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-trigger')) document.getElementById('profileMenu')?.classList.remove('show');
        if (!e.target.closest('.notif-wrapper')) document.getElementById('notifPanel')?.classList.remove('show');
    });
}


function setupEventListeners() {
    window.toggleDropdown = () => {
        const menu = document.getElementById('profileMenu');
        if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    };

    window.onclick = (event) => {
        
        if (!event.target.closest('.profile-trigger')) {
            const menu = document.getElementById('profileMenu');
            if (menu) menu.style.display = 'none';
        }
       
        if (!event.target.closest('.notif-wrapper')) {
            const panel = document.getElementById('notifPanel');
            if (panel && panel.classList.contains('animate-in')) {
                panel.classList.remove('animate-in');
                setTimeout(() => { panel.style.display = 'none'; }, 200);
            }
        }

        const modal = document.getElementById('deptModal');
        if (event.target == modal) closeModal();
    };
}


let lastFetchedJobs = []; 
async function fetchData() {
    try {
        const { data: depts, error: dError } = await _supabase
            .from('department')
            .select('*')
            .order('department_name', { ascending: true });

        const { data: jobs, error: jError } = await _supabase
            .from('job')
            .select('department_id, employee_id');

        if (dError || jError) throw dError || jError;

        allDepartments = depts;
        lastFetchedJobs = jobs; 
        
        updateStats(depts, jobs);
        renderTable(depts, jobs);
        populateManagerDropdown();
    } catch (err) {
        console.error("Data Fetch Error:", err);
    }
}

function updateStats(depts, jobs) {
    document.getElementById('totalDepts').textContent = depts.length;
    document.getElementById('totalEmps').textContent = jobs.length;

    const counts = {};
    jobs.forEach(j => counts[j.department_id] = (counts[j.department_id] || 0) + 1);
    
    let maxId = null;
    let maxVal = -1;
    for (const id in counts) {
        if (counts[id] > maxVal) {
            maxVal = counts[id];
            maxId = id;
        }
    }

    const largest = depts.find(d => d.id === maxId);
    document.getElementById('largestDept').textContent = largest ? largest.department_name : '--';
    
    const newest = depts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    document.getElementById('newestDept').textContent = newest ? newest.department_name : '--';
}


function renderTable(depts, jobs) {
    const tbody = document.getElementById('deptTableBody');
    tbody.innerHTML = depts.map(dept => {
        const empCount = jobs.filter(j => j.department_id === dept.id).length;
    
        const displayStatus = dept.status || 'Active'; 
        const statusClass = displayStatus.toLowerCase();

        return `
            <tr>
                <td><span class="dept-code">${dept.department_code || 'N/A'}</span></td>
                <td class="dept-name-cell">${dept.department_name}</td>
                <td>
                    <div class="manager-info">
                        <i class="fa fa-user-circle"></i>
                        <span>${dept.manager_name || 'Unassigned'}</span>
                    </div>
                </td>
                <td><span class="member-count">${empCount} Members</span></td>
                <td><span class="status-badge ${statusClass}">${displayStatus}</span></td>
                <td>
                    <div class="action-wrapper">
                        <button class="action-btn view" onclick="viewDept('${dept.id}')">
                            <i class="fa fa-eye"></i>
                        </button>
                        ${userProfile.role !== 'User' ? `
                            <button class="action-btn edit" onclick="openEditModal('${dept.id}')">
                                <i class="fa fa-pencil"></i>
                            </button>
                            <button class="action-btn delete" onclick="deleteDept('${dept.id}')">
                                <i class="fa fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}


window.openEditModal = (id) => {
    const modal = document.getElementById('deptModal');
    // Find the specific department in your local data array
    const dept = allDepartments.find(d => d.id === id);
    
    if (!dept) return;

    document.getElementById('modalTitle').textContent = "Edit Department";
    document.getElementById('editDeptId').value = dept.id;

    document.getElementById('modalDeptName').value = dept.department_name || "";
    document.getElementById('modalDeptCode').value = dept.department_code || "";
    document.getElementById('modalDeptDesc').value = dept.description || "";
    document.getElementById('modalDeptManager').value = dept.manager_id || "";
    document.getElementById('modalDeptStatus').value = dept.status || "Active";

    modal.classList.add('active');
    modal.style.display = 'flex';
};

window.openAddModal = () => {
    const modal = document.getElementById('deptModal');
    document.getElementById('deptForm').reset();
    document.getElementById('editDeptId').value = ""; // Clear UUID for new entries
    document.getElementById('modalTitle').textContent = "Add New Department";
    
    modal.classList.add('active');
    modal.style.display = 'flex';
};

window.closeModal = () => {
    const modal = document.getElementById('deptModal');
    modal.classList.remove('active');
    modal.style.display = 'none';
};


document.getElementById('deptForm').onsubmit = async (e) => {
    e.preventDefault();

    const id = document.getElementById('editDeptId').value;
    const managerSelect = document.getElementById('modalDeptManager');
    
    const selectedManagerName = managerSelect.options[managerSelect.selectedIndex].text;

    const formData = {
        department_name: document.getElementById('modalDeptName').value,
        department_code: document.getElementById('modalDeptCode').value,
        description: document.getElementById('modalDeptDesc').value,
        manager_id: managerSelect.value || null,
        manager_name: selectedManagerName === "Select Manager" ? "Unassigned" : selectedManagerName,
        status: document.getElementById('modalDeptStatus').value
    };

    try {
        const { error } = await _supabase
            .from('department')
            .upsert({ id: id || undefined, ...formData });

        if (error) throw error;
        closeModal();
        await fetchData(); 
    } catch (err) {
        alert("Update failed: " + err.message);
    }
};

async function populateManagerDropdown() {
    const select = document.getElementById('modalDeptManager');
    const { data } = await _supabase
        .from('employee')
        .select('id, first_name, last_name, role') 
        .in('role', ['Admin', 'SuperAdmin']);

    if (data) {
        let html = '<option value="">Select Manager</option>';
        data.forEach(m => {
        
            html += `<option value="${m.id}">${m.first_name} ${m.last_name}</option>`;
        });
        select.innerHTML = html;
    }
}

window.viewDept = async (id) => {
    const dept = allDepartments.find(d => d.id === id);
    if (!dept) return;
    
    document.getElementById('detailDeptName').textContent = dept.department_name;
    
    const { data: jobs, error } = await _supabase
        .from('job')
        .select(`
            position,
            employee (
                first_name,
                last_name,
                avatar_url
            )
        `)
        .eq('department_id', id);

    const list = document.getElementById('deptEmployeeList');
    
    if (error || !jobs || jobs.length === 0) {
        list.innerHTML = "<p style='padding: 20px; color: #64748b; text-align: center;'>No employees found.</p>";
    } else {
        list.innerHTML = jobs.map(j => {
            const emp = j.employee;
            if (!emp) return ''; 

        
            const jobTitle = j.position || 'Staff'; 
            const initials = (emp.first_name[0] + emp.last_name[0]).toUpperCase();

            return `
                <div class="emp-item" style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid #f1f5f9;">
                    <div style="width:38px; height:38px; background:#3b82f6; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:13px; overflow:hidden;">
                        ${emp.avatar_url ? `<img src="${emp.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` : initials}
                    </div>
                    <div>
                        <div style="font-weight:600; font-size:14px; color:#0f172a;">${emp.first_name} ${emp.last_name}</div>
                        <div style="font-size:12px; color:#64748b;">${jobTitle}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    document.getElementById('deptDetailDrawer').classList.add('open');
};

window.closeDrawer = () => {
    document.getElementById('deptDetailDrawer').classList.remove('open');
};

window.filterDeptTable = () => {
    const searchTerm = document.getElementById('deptSearch').value.toLowerCase();
    
    const filtered = allDepartments.filter(d => 
        d.department_name.toLowerCase().includes(searchTerm) ||
        (d.department_code && d.department_code.toLowerCase().includes(searchTerm))
    );

    if (currentViewMode === 'table') {
        renderTable(filtered, lastFetchedJobs); 
    } else {
        renderCards(filtered);
    }
};

window.deleteDept = async (id) => {
    const dept = allDepartments.find(d => d.id === id);
    const deptName = dept ? dept.department_name : "this department";

    if (!confirm(`Are you sure you want to permanently delete ${deptName}?\nThis will also remove all job assignments and tracking history linked to it.`)) return;

    try {
        
        const { error: jobError } = await _supabase
            .from('job')
            .delete()
            .eq('department_id', id);

        if (jobError) throw jobError;

        
        const { error: historyError } = await _supabase
            .from('jobhistory')
            .delete()
            .eq('department_id', id);

        if (historyError) throw historyError;

        
        const { error: deptError } = await _supabase
            .from('department')
            .delete()
            .eq('id', id);

        if (deptError) throw deptError;
        
        
        await fetchData();
        alert(`"${deptName}" was successfully and permanently deleted.`);

    } catch (err) {
        console.error("Complete delete sequence failed:", err);
        alert("Error deleting department: " + (err.message || err));
    }
};

window.openDeptSummary = () => {

    const searchTerm = document.getElementById('deptSearch').value.toLowerCase();
    const dept = allDepartments.find(d => 
        d.department_name.toLowerCase().includes(searchTerm)
    ) || allDepartments[0]; 

    if (!dept) return;


    const modal = document.getElementById('deptModal');
    document.getElementById('modalTitle').textContent = "Department Details";
    
    document.getElementById('modalDeptName').value = dept.department_name;
    document.getElementById('modalDeptCode').value = dept.department_code || "N/A";
    document.getElementById('modalDeptDesc').value = dept.description || "No description provided.";
    document.getElementById('modalDeptStatus').value = dept.status || "Active";
    
    const managerSelect = document.getElementById('modalDeptManager');
    managerSelect.value = dept.manager_id || "";

   
    const saveBtn = document.querySelector('.btn-save'); 
    if (saveBtn) saveBtn.style.display = 'none';

    modal.classList.add('active');
    modal.style.display = 'flex';
};


const originalClose = window.closeModal;
window.closeModal = () => {
    originalClose();
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) saveBtn.style.display = 'block';
};


let currentViewMode = 'table'; 

window.switchView = (mode) => {
    currentViewMode = mode;
    
    
    const tableCont = document.getElementById('tableViewContainer');
    const cardCont = document.getElementById('cardViewContainer');
    const btnTable = document.getElementById('btnTableView');
    const btnCard = document.getElementById('btnCardView');

    if (mode === 'table') {
        tableCont.style.display = 'block';
        cardCont.style.display = 'none';
        btnTable.classList.add('active');
        btnCard.classList.remove('active');
    } else {
        tableCont.style.display = 'none';
        cardCont.style.display = 'block';
        btnCard.classList.add('active');
        btnTable.classList.remove('active');
    }

  
    filterDeptTable(); 
};


function renderCards(depts) {
    const grid = document.getElementById('deptCardGrid');
    if (!grid) return;

    grid.innerHTML = depts.map(dept => {
        const managerName = dept.manager_name || 'Unassigned';
        const initial = managerName !== 'Unassigned' ? managerName.charAt(0).toUpperCase() : '?';
        
        return `
            <div class="dept-card" style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: transform 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div>
                        <span style="font-size: 11px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">
                            ${dept.department_code || 'N/A'}
                        </span>
                        <h3 style="margin-top: 10px; font-size: 18px; color: #0f172a;">${dept.department_name}</h3>
                    </div>
                    <span class="status-badge ${dept.status?.toLowerCase() || 'active'}">${dept.status || 'Active'}</span>
                </div>

                <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 20px; min-height: 44px;">
                    ${dept.description || 'No description provided for this department.'}
                </p>

                <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: #e0e7ff; color: #4338ca; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; border: 1px solid #c7d2fe;">
                            ${initial}
                        </div>
                        <div>
                            <div style="font-size: 10px; color: #94a3b8; font-weight: 700;">MANAGER</div>
                            <div style="font-size: 13px; font-weight: 600; color: #475569;">${managerName}</div>
                        </div>
                    </div>
                    <div class="action-wrapper">
                         <button class="action-btn view" onclick="viewDept('${dept.id}')"><i class="fa fa-eye"></i></button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.handleSignOut = async () => {
    await _supabase.from('employee').update({ status: 'offline' }).eq('user_id', currentUser.id);
    await _supabase.auth.signOut();
    window.location.href = "index.html";
};
