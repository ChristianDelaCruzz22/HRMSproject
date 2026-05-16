
const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let userProfile = null;
let currentRoleView = null;
let currentFilter = 'All';
let allEmployees = [];


async function init() {
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (!session) {
        window.location.href = "index.html";
        return;
    }
    
    currentUser = session.user;

    
    await fetchUserProfile();
    await fetchEmployees();
    await updateRecruitmentBadge();
    await updateAnnouncementBadge();
    
    setupUIListeners();
    await updateMessageBadge();
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

window.filterEmployees = (filterType) => {
    currentFilter = filterType;

    
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.innerText === filterType);
    });

    let filteredList = [];

    if (filterType === 'All') {
        filteredList = allEmployees;
    } else if (filterType === 'Active') {
        
        filteredList = allEmployees.filter(emp => 
            emp.status === 'Approved' || emp.status === 'online'
        );
    } else {
        
        filteredList = allEmployees.filter(emp => emp.status === filterType);
    }

    
    renderEmployeeTable(filteredList);
};


window.searchEmployees = () => {
    const term = document.getElementById('empSearch').value.toLowerCase();
    
    
    let baseList = allEmployees;
    if (currentFilter === 'Active') {
        baseList = allEmployees.filter(e => e.status === 'Approved' || e.status === 'online');
    } else if (currentFilter !== 'All') {
        baseList = allEmployees.filter(e => e.status === currentFilter);
    }

    
    const filtered = baseList.filter(e => 
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(term) || 
        e.email.toLowerCase().includes(term)
    );
    
    renderEmployeeTable(filtered);
};


window.closeEditModal = () => {
    document.getElementById('editModal').style.display = 'none';
};



document.getElementById('editEmployeeForm').onsubmit = async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const emp = allEmployees.find(e => e.user_id === userId);
    
    
    const adminName = typeof userProfile !== 'undefined' 
        ? `${userProfile.first_name} ${userProfile.last_name}` 
        : "Admin";

   
    const newFirstName = document.getElementById('editFirstName').value;
    const newLastName = document.getElementById('editLastName').value;
    const newRole = document.getElementById('editRole').value;
    const newDeptName = document.getElementById('editDepartment').value;
    const newPosition = document.getElementById('editPosition').value;

    try {
        
        const { data: deptData, error: deptError } = await _supabase
            .from('department')
            .select('id')
            .eq('department_name', newDeptName)
            .single();

        if (deptError) throw new Error("Department not found");

        
        const { error: empError } = await _supabase
            .from('employee')
            .update({
                first_name: newFirstName,
                last_name: newLastName,
                role: newRole,
                modified_by_name: adminName,
                modified_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (empError) throw empError;

        
        const { error: jobError } = await _supabase
            .from('job')
            .upsert({
                employee_id: emp.id,
                department_id: deptData.id,
                position: newPosition,
                updated_at: new Date().toISOString()
            }, { onConflict: 'employee_id' });

        if (jobError) throw jobError;

        
        const { error: historyError } = await _supabase
            .from('jobhistory')
            .insert([{
                employee_id: emp.id,
                department_id: deptData.id,
                position: newPosition,
                role: newRole, 
                status: 'Active',
                start_date: new Date().toISOString() 
            }]);

        if (historyError) throw historyError;

        
        alert("Update Successful! Profile and Timeline are now in sync.");
        
        if (typeof closeEditModal === 'function') closeEditModal();
        
        
        if (typeof fetchEmployees === 'function') {
            await fetchEmployees();
        }

    } catch (err) {
        console.error("Critical Update Failure:", err);
        alert("Update failed: " + err.message);
    }
};


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
            thumbContainer.style.background = "transparent";
        } else {
            const initials = (userProfile.first_name[0] + userProfile.last_name[0]).toUpperCase();
            thumbContainer.innerText = initials;
            thumbContainer.style.background = "#e2e8f0";
            thumbContainer.style.display = "flex";
            thumbContainer.style.alignItems = "center";
            thumbContainer.style.justifyContent = "center";
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

async function updateMessageBadge() {
    try {
        
        const { count, error } = await _supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUser.id)
            .eq('is_read', false);

        if (error) throw error;

        
        const badge = document.getElementById('msg-badge-nav');
        if (badge) {
            if (count > 0) {
                badge.innerText = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (err) {
        console.error("Message Badge Error:", err.message);
    }
}

window.previewRole = (newRole) => {
    currentRoleView = newRole;
    renderUserUI();
};


async function updateRecruitmentBadge() {
    try {
        const { count } = await _supabase
            .from('employee')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Pending');

        const badge = document.getElementById('badge-count');
        if (badge && count > 0) {
            badge.innerText = count;
            badge.style.display = 'flex';
        } else if (badge) {
            badge.style.display = 'none';
        }
    } catch(e) {
        console.error("Recruitment Badge Error:", e);
    }
}

async function updateAnnouncementBadge() {
    try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data, error } = await _supabase
            .from('announcements')
            .select('id')
            .gt('created_at', twentyFourHoursAgo.toISOString()) 
            .limit(1);

        const badge = document.getElementById('ann-badge-nav');
        if (badge) {
            badge.style.display = (data && data.length > 0) ? 'flex' : 'none';
            if (data && data.length > 0) badge.innerText = "!";
        }
    } catch (err) {
        console.error("Announcement Badge Error:", err);
    }
}

async function updateEmployeeProfile(employeeId, newDetails) {
    try {
        
        const cleanDeptName = newDetails.departmentName.trim();
        const cleanPosition = newDetails.position.trim();

        
        const { data: deptData } = await _supabase
            .from('department')
            .select('id')
            .ilike('department_name', cleanDeptName)
            .single();

        if (!deptData) throw new Error("Department not found.");

        
        const { error: jobUpdateError } = await _supabase
            .from('job')
            .update({
                department_id: deptData.id,
                position: cleanPosition,
                updated_at: new Date().toISOString()
            })
            .eq('employee_id', employeeId);

        if (jobUpdateError) throw jobUpdateError;

        
        const { error: historyError } = await _supabase
            .from('jobhistory')
            .insert([{
                employee_id: employeeId,
                department_id: deptData.id,
                position: cleanPosition,
                change_reason: newDetails.reason || 'Profile Update',
                effective_date: new Date().toISOString()
            }]);

        if (historyError) {
            console.error("Audit Trail failed, but profile updated:", historyError);
        } else {
            alert("Audit Trail created successfully.");
        }

        showToast("Profile and Audit Log updated!", "success");

    } catch (err) {
        console.error("Update Error:", err.message);
        showToast(err.message, "error");
    }
}




async function fetchEmployees() {
    try {
        

        
        const { data: employees, error: empError } = await _supabase
            .from('employee')
            .select('*')
            .order('last_name', { ascending: true });

        if (empError) throw empError;

        
        const { data: jobDetails, error: jobError } = await _supabase
            .from('job')
            .select(`
                employee_id,
                position,
                department:department_id (
                    department_name
                )
            `);

        if (jobError) throw jobError;

        
        allEmployees = employees.map(emp => {
    
    const jobRecord = jobDetails?.find(j => j.employee_id === emp.id);
    
    
    let deptName = 'N/A';
    
    if (jobRecord?.department) {
        
        if (Array.isArray(jobRecord.department)) {
            deptName = jobRecord.department[0]?.department_name || 'N/A';
        } 
        
        else {
            deptName = jobRecord.department.department_name || 'N/A';
        }
    }
    
    return {
        ...emp,
        position: jobRecord?.position || 'N/A',
        department: deptName
    };
});

        
        updateSummaryStats();
        renderEmployeeTable(allEmployees);

    } catch (err) {
        alert("Linkage Error: " + err.message);
        
        const tbody = document.getElementById('employee-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6">Error: ${err.message}</td></tr>`;
    }
}



window.openAddModal = async () => {
    
    document.getElementById('addEmployeeForm').reset();
    
    
    await syncDepartmentDropdown('addDept');
    
    
    document.getElementById('addModal').style.display = 'flex';
};

window.closeAddModal = () => {
    document.getElementById('addModal').style.display = 'none';
};


const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

document.getElementById('addEmployeeForm').onsubmit = async (e) => {
    e.preventDefault();

    
    const { data: sessionData } = await _supabase.auth.getSession();
    const adminSession = sessionData.session;

    const email = document.getElementById('addEmail').value.trim();
    const password = document.getElementById('addPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const firstName = document.getElementById('addFirstName').value.trim();
    const lastName = document.getElementById('addLastName').value.trim();
    const selectedDept = document.getElementById('addDept').value;
    const position = document.getElementById('addPosition').value.trim();
    const dob = document.getElementById('addDOB').value;
    const phone = document.getElementById('addPhone')?.value || null;
    const intro = document.getElementById('addIntro')?.value || null;

    const genderEl = document.querySelector('input[name="gender"]:checked');
    const genderValue = genderEl ? genderEl.value : null;

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        
        const { data: deptData, error: deptLookupError } = await _supabase
            .from('department')
            .select('id')
            .ilike('department_name', selectedDept.trim())
            .single();

        if (deptLookupError || !deptData) {
            throw new Error(`Department '${selectedDept}' not found.`);
        }

        
        const { data: authData, error: authError } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { first_name: firstName, last_name: lastName }
            }
        });

        if (authError) throw authError;
        const newAuthUserId = authData.user.id;

        
        const { data: savedEmp, error: empError } = await _supabase
            .from('employee')
            .insert([{
                user_id: newAuthUserId,
                first_name: firstName,
                last_name: lastName,
                email: email,
                dob: dob,
                gender: genderValue,
                contact: phone,
                introduction: intro,
                status: 'Approved',
                role: 'User'
            }])
            .select() 
            .single();

        if (empError) throw empError;

        
        const { error: jobError } = await _supabase
            .from('job')
            .insert([{
                employee_id: savedEmp.id,
                department_id: deptData.id,
                position: position
            }]);

        if (jobError) throw jobError;

        alert("Employee account created successfully!");
        
        
        if (adminSession) {
            await _supabase.auth.setSession(adminSession);
            alert("System: Admin session restored.");
        }

        document.getElementById('addEmployeeForm').reset();
        closeAddModal();
        
        if (typeof fetchEmployees === 'function') {
            await fetchEmployees();
        }

    } catch (err) {
        console.error("Critical Add Error:", err);
        
        
        if (adminSession) await _supabase.auth.setSession(adminSession);
        
        alert("Failed to create account: " + err.message);
    }
};

async function syncDepartmentDropdown(elementId) {
    const dropdown = document.getElementById(elementId);
    if (!dropdown) return;

    try {
        const { data: depts, error } = await _supabase
            .from('department')
            .select('department_name')
            .order('department_name', { ascending: true });

        if (error) throw error;

        if (depts) {

            dropdown.innerHTML = depts.map(d => 
                `<option value="${d.department_name}">${d.department_name}</option>`
            ).join('');
        }
    } catch (err) {
        console.error("Failed to fetch departments for dropdown:", err);
        dropdown.innerHTML = `<option value="">Error loading departments</option>`;
    }
}

window.togglePasswordVisibility = (inputId, iconId) => {
    const passwordInput = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    
    if (!passwordInput || !icon) return;

    if (passwordInput.type === 'password') {
        
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        icon.style.color = '#3b82f6'; 
    } else {
        
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        icon.style.color = '#94a3b8'; 
    }

    
};



function renderEmployeeTable(employees) {
    const tbody = document.getElementById('employee-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    
    let listToDisplay = employees;

    
    if (userProfile.role === 'Admin') {
        listToDisplay = employees.filter(emp => emp.role !== 'SuperAdmin');
    } 
    
    else if (userProfile.role !== 'SuperAdmin') {
        listToDisplay = employees.filter(emp => emp.role !== 'SuperAdmin');
    }
   

    listToDisplay.forEach(emp => {
        const isInactive = emp.status === 'Deactivated';
        const initials = (emp.first_name[0] + emp.last_name[0]).toUpperCase();
        const avatarHtml = emp.avatar_url ? 
            `<img src="${emp.avatar_url}" style="width:100%; height:100%; border-radius:8px; object-fit:cover;">` : 
            initials;

        const modDate = emp.modified_at ? new Date(emp.modified_at).toLocaleDateString() : '';
        const modBy = emp.modified_by_name ? `By: ${emp.modified_by_name}` : '';

        tbody.innerHTML += `
            <tr style="${isInactive ? 'opacity: 0.6; background: #fff1f2;' : ''}">
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div class="profile-thumb-small" style="width:34px; height:34px; border-radius:8px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; color:#64748b;">
                            ${avatarHtml}
                        </div>
                        <div>
                            <span style="font-weight:600; display:block;">${emp.first_name} ${emp.last_name}</span>
                            <small style="font-size:10px; color:#94a3b8;">${modBy} ${modDate}</small>
                        </div>
                    </div>
                </td>
                <td>${emp.email}</td>
                <td>${emp.role}</td>
                <td style="font-weight: 500; color: #1e293b;">${emp.position || 'N/A'}</td>
                <td>${emp.department || 'N/A'}</td>
                <td><span class="status-tag status-${emp.status}">${emp.status}</span></td>
                <td style="text-align:right;">
                    <!-- View Profile Button -->
                    <button class="btn-action" title="View Profile" onclick="viewProfile('${emp.user_id}')">
                        <i class="fa fa-eye"></i>
                    </button>
                    
                    <!-- Edit/Promote Button -->
                    <button class="btn-action" title="Edit/Promote" onclick="openEditModal('${emp.user_id}')">
                        <i class="fa fa-pencil"></i>
                    </button>

                    <button class="btn-action ${isInactive ? 'btn-reactivate' : 'btn-delete'}" onclick="toggleStatus('${emp.user_id}', '${emp.status}')">
                        <i class="fa ${isInactive ? 'fa-unlock' : 'fa-ban'}"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}



const setField = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
        el.value = value || '';
    } else {
        console.warn(`Missing HTML Element: ID "${id}" not found.`);
    }
};

window.viewProfile = async (userId) => {
    const emp = allEmployees.find(e => e.user_id === userId);
    if (!emp) return;

    
    document.getElementById('editModal').style.display = 'flex';
    document.getElementById('viewProfileCard').style.display = 'block';
    document.getElementById('editFormContainer').style.display = 'none';

    
    const avatarContainer = document.getElementById('viewModalAvatar');
    avatarContainer.style.cssText = 'display: flex; justify-content: center; margin-bottom: 20px;';

    if (emp.avatar_url) {
        avatarContainer.innerHTML = `<img src="${emp.avatar_url}" style="width:100px; height:100px; border-radius:50%; object-fit:cover; border: 4px solid #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">`;
    } else {
        const initials = ((emp.first_name?.[0] || '') + (emp.last_name?.[0] || '')).toUpperCase();
        avatarContainer.innerHTML = `<div style="width:100px; height:100px; border-radius:50%; background:#6366f1; color:white; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:700; border: 4px solid #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">${initials}</div>`;
    }

    
    document.getElementById('viewFullDisplayName').innerText = `${emp.first_name} ${emp.last_name}`;
    document.getElementById('viewCurrentEmail').innerText = emp.email || 'N/A';

    
    document.getElementById('viewCurrentPosition').innerText = emp.position || 'Position Not Set';
    document.getElementById('viewCurrentDept').innerText = emp.department || 'N/A';

    
    fetchJobHistory(emp.id); 
};

async function renderTimeline(employeeId) {
    const container = document.getElementById('jobTimelineSection');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center; font-size:12px; color:#94a3b8;">Loading history...</p>';

    
    const { data: history, error } = await _supabase
        .from('jobhistory')
        .select(`
            position,
            start_date,
            department:department_id ( name )
        `)
        .eq('employee_id', employeeId)
        .order('start_date', { ascending: false });

    if (error || !history || history.length === 0) {
        container.innerHTML = `
            <div style="border: 1px dashed #e2e8f0; border-radius: 12px; padding: 20px; text-align: center;">
                <p style="font-size: 13px; color: #94a3b8; margin: 0;">No job history recorded yet.</p>
            </div>`;
        return;
    }

    container.innerHTML = history.map((item, index) => {
        const isCurrent = index === 0;
        
        const dateStr = new Date(item.start_date).toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric' 
        });

        return `
            <div style="display: flex; gap: 15px; margin-bottom: 20px; position: relative;">
                <!-- Vertical Line -->
                ${index !== history.length - 1 ? '<div style="position:absolute; left:6px; top:20px; bottom:-20px; width:2px; background:#f1f5f9;"></div>' : ''}
                
                <!-- Dot -->
                <div style="width:14px; height:14px; border-radius:50%; background:${isCurrent ? '#3b82f6' : '#cbd5e1'}; border: 3px solid #fff; z-index:1; margin-top:4px; box-shadow: 0 0 0 1px #f1f5f9;"></div>
                
                <!-- Content Card -->
                <div style="flex:1; background:#fff; border: 1px solid #f1f5f9; padding:12px; border-radius:12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-weight:700; color:#1e293b; font-size:13px;">${item.position}</span>
                        ${isCurrent ? '<span style="background:#dcfce7; color:#166534; font-size:9px; font-weight:800; padding:2px 8px; border-radius:10px;">PRESENT</span>' : ''}
                    </div>
                    <div style="font-size:11px; color:#64748b; display:flex; gap:10px;">
                        <span><i class="fa fa-sitemap"></i> ${item.department?.name || 'No Dept'}</span>
                        <span><i class="fa fa-calendar"></i> ${dateStr}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function handlePromotion(employeeId, newPosition, newDeptId) {
   
    const { error: jobError } = await _supabase
        .from('job')
        .update({ 
            position: newPosition, 
            department_id: newDeptId,
            updated_at: new Date().toISOString() 
        })
        .eq('employee_id', employeeId);

    if (jobError) throw jobError;

    
    const { error: historyError } = await _supabase
        .from('jobhistory')
        .insert([{
            employee_id: employeeId,
            position: newPosition,
            department_id: newDeptId,
            start_date: new Date().toISOString(),
            status: 'Active' 
        }]);

    if (historyError) throw historyError;
    
    
    alert("Promotion recorded successfully!");
}

async function fetchJobHistory(employeeId) {
    const historyContainer = document.getElementById('jobTimelineSection');
    const headerPosition = document.getElementById('viewCurrentPosition');
    const headerDept = document.getElementById('viewCurrentDept');
    
    if (!historyContainer) return;

    historyContainer.innerHTML = '<p style="text-align:center; font-size:12px; color:#94a3b8;">Loading history...</p>';

    try {
        
        const { data, error } = await _supabase
            .from('jobhistory')
            .select(`
                position,
                start_date,
                department:department_id ( department_name )
            `)
            .eq('employee_id', employeeId)
            .order('start_date', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            historyContainer.innerHTML = `<div ...>No job history recorded yet.</div>`;
            
            headerPosition.innerText = "No Position Set";
            headerDept.innerText = "N/A";
            return;
        }

        
        const latestJob = data[0];
        headerPosition.innerText = latestJob.position;
        headerDept.innerText = latestJob.department?.department_name || 'General';
        

        historyContainer.innerHTML = data.map((job, index) => {
            const isCurrent = index === 0; 
            const startDate = new Date(job.start_date).toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric', year: 'numeric' 
            });

            return `
            <div style="display: flex; gap: 15px; margin-bottom: 20px; position: relative;">
                ${index !== data.length - 1 ? '<div style="position:absolute; left:6px; top:20px; bottom:-20px; width:2px; background:#f1f5f9;"></div>' : ''}
                <div style="width:14px; height:14px; border-radius:50%; background:${isCurrent ? '#3b82f6' : '#cbd5e1'}; border: 3px solid #fff; z-index:1; margin-top:4px; box-shadow: 0 0 0 1px #f1f5f9;"></div>
                <div style="flex:1; background:#fff; border: 1px solid #f1f5f9; padding:12px; border-radius:12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-weight:700; color:#1e293b; font-size:13px;">${job.position}</span>
                        ${isCurrent ? '<span style="background:#dcfce7; color:#166534; font-size:9px; font-weight:800; padding:2px 8px; border-radius:10px;">PRESENT</span>' : ''}
                    </div>
                    <div style="font-size:11px; color:#64748b; display:flex; gap:10px;">
                        <span><i class="fa fa-sitemap"></i> ${job.department?.department_name || 'General'}</span>
                        <span><i class="fa fa-calendar"></i> ${startDate}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error("Timeline Fetch Error:", err);
        historyContainer.innerHTML = '<p style="color:red; font-size:12px;">Failed to load history.</p>';
    }
}


async function recordJobHistory(userId, position, department) {
    const { error } = await _supabase
        .from('jobhistory')
        .insert([{
            user_id: userId,
            position: position,
            department: department,
            effective_date: new Date().toISOString() 
        }]);

    if (error) console.error("Error recording history:", error);
}

window.editProfile = (userId) => {
    const emp = allEmployees.find(e => e.user_id === userId);
    if (!emp) return;

    
    document.getElementById('viewProfileCard').style.display = 'none';
    document.getElementById('editFormContainer').style.display = 'block';

    
    const editAvatarContainer = document.getElementById('editModalAvatar'); 
    editAvatarContainer.style.cssText = 'display: flex; justify-content: center; margin-bottom: 20px;';
    
    const initials = ((emp.first_name?.[0] || '') + (emp.last_name?.[0] || '')).toUpperCase();
    editAvatarContainer.innerHTML = emp.avatar_url 
        ? `<img src="${emp.avatar_url}" style="width:100px; height:100px; border-radius:50%; object-fit:cover; border: 4px solid #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">`
        : `<div style="width:100px; height:100px; border-radius:50%; background:#6366f1; color:white; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:700; border: 4px solid #fff;">${initials}</div>`;

    
    document.getElementById('editFirstName').value = emp.first_name || '';
    document.getElementById('editLastName').value = emp.last_name || '';
    document.getElementById('editPosition').value = emp.position || '';
    document.getElementById('editDepartment').value = emp.department_id || '';
    document.getElementById('editAccessRole').value = emp.role || 'Employee'; 

    
    document.getElementById('saveProfileBtn').onclick = () => saveProfileChanges(emp);
};

async function saveProfileChanges(oldData) {
    
    const newFirstName = document.getElementById('editFirstName').value;
    const newLastName = document.getElementById('editLastName').value;
    const newPosition = document.getElementById('editPosition').value; 
    const newDeptName = document.getElementById('editDepartment').value;
    const newRole = document.getElementById('editRole').value;

    try {
        
        const { data: deptData } = await _supabase
            .from('department')
            .select('id')
            .eq('department_name', newDeptName)
            .single();

        const deptId = deptData ? deptData.id : null;

    
        const { error: updateError } = await _supabase
            .from('employee')
            .update({
                first_name: newFirstName,
                last_name: newLastName,
                role: newRole,
                modified_at: new Date().toISOString()
            })
            .eq('id', oldData.id); 

        if (updateError) throw updateError;

        
        await _supabase.from('job').upsert({
            employee_id: oldData.id,
            department_id: deptId,
            position: newPosition,
            updated_at: new Date().toISOString()
        }, { onConflict: 'employee_id' });

        
        const { error: historyError } = await _supabase
            .from('jobhistory')
            .insert([{
                employee_id: oldData.id,
                department_id: deptId,
                position: newPosition,
                status: 'Active',
                start_date: new Date().toISOString() 
            }]);

        if (historyError) throw historyError;

        alert("Profile and Timeline updated successfully!");
        
        
        closeEditModal();
        await fetchEmployees(); 
        
    } catch (err) {
        console.error("Save failed:", err);
        alert("Error: " + err.message);
    }
}


window.openEditModal = async (userId) => {
    const emp = allEmployees.find(e => e.user_id === userId);
    if (!emp) return;

   
    document.getElementById('editModal').style.display = 'flex';
    document.getElementById('viewProfileCard').style.display = 'none';
    document.getElementById('editFormContainer').style.display = 'block';

    
    document.getElementById('editUserId').value = emp.user_id;
    document.getElementById('editFirstName').value = emp.first_name || '';
    document.getElementById('editLastName').value = emp.last_name || '';
    document.getElementById('editRole').value = emp.role || 'User';
    document.getElementById('editPosition').value = emp.position || '';
    
 
    await syncDepartmentDropdown('editDepartment');
    document.getElementById('editDepartment').value = emp.department || '';

    
    const editAvatar = document.getElementById('editModalAvatar');
    if (editAvatar) {
        if (emp.avatar_url) {
            editAvatar.innerHTML = `<img src="${emp.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } else {
            const initials = ((emp.first_name?.[0] || '') + (emp.last_name?.[0] || '')).toUpperCase();
            editAvatar.innerText = initials;
        }
    }

    document.getElementById('saveProfileBtn').onclick = () => saveProfileChanges(emp);
};

function renderModalAvatar(emp) {
    const container = document.getElementById('editModalAvatar');
    if (!container) return;
    
    if (emp.avatar_url) {
        container.innerHTML = `<img src="${emp.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
        const initials = ((emp.first_name?.[0] || '') + (emp.last_name?.[0] || '')).toUpperCase();
        container.innerText = initials;
        container.style.background = "#f1f5f9";
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";
    }
}


async function fillModalData(emp) {
    document.getElementById('editUserId').value = emp.user_id;
    document.getElementById('editFirstName').value = emp.first_name || '';
    document.getElementById('editLastName').value = emp.last_name || '';
    document.getElementById('editRole').value = emp.role || '';
    document.getElementById('editPosition').value = emp.position || '';
    
    await syncDepartmentDropdown('editDepartment');
    document.getElementById('editDepartment').value = emp.department || '';

    const avatarContainer = document.getElementById('editModalAvatar');
    if (avatarContainer) {
        if (emp.avatar_url) {
            avatarContainer.innerHTML = `<img src="${emp.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } else {
            avatarContainer.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:50%; font-weight:bold;">${(emp.first_name[0] + emp.last_name[0]).toUpperCase()}</div>`;
        }
    }
}

window.toggleStatus = async (userId, currentStatus) => {
    const isDeactivating = currentStatus !== 'Deactivated';
    const newStatus = isDeactivating ? 'Deactivated' : 'Approved';
    const adminName = document.getElementById('userName')?.innerText || "Admin";

    if (confirm(isDeactivating ? "Deactivate account?" : "Reactivate account?")) {
        const { error } = await _supabase
            .from('employee')
            .update({ 
                status: newStatus,
                modified_by_name: adminName,
                modified_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (!error) {
            fetchEmployees();
        } else {
            alert("Error: " + error.message);
        }
    }
};

function updateSummaryStats() {
    let visibleEmployees = allEmployees;
    
   
    if (userProfile.role === 'Admin') {
        visibleEmployees = allEmployees.filter(e => e.role !== 'SuperAdmin');
    }

    document.getElementById('count-total').innerText = visibleEmployees.length;
    document.getElementById('count-approved').innerText = visibleEmployees.filter(e => e.status === 'Approved' || e.status === 'online').length;
    document.getElementById('count-pending').innerText = visibleEmployees.filter(e => e.status === 'Pending').length;
    document.getElementById('count-inactive').innerText = visibleEmployees.filter(e => e.status === 'Deactivated').length;
}


function setupUIListeners() {
    window.toggleDropdown = () => document.getElementById('profileMenu')?.classList.toggle('show');
    window.toggleNotifPanel = () => document.getElementById('notifPanel')?.classList.toggle('show');

    window.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-trigger')) document.getElementById('profileMenu')?.classList.remove('show');
        if (!e.target.closest('.notif-wrapper')) document.getElementById('notifPanel')?.classList.remove('show');
    });
}

window.handleSignOut = async () => {
    await _supabase.from('employee').update({ status: 'offline' }).eq('user_id', currentUser.id);
    await _supabase.auth.signOut();
    window.location.href = "index.html";
};


window.searchEmployees = () => {
    const term = document.getElementById('empSearch').value.toLowerCase();
    const filtered = allEmployees.filter(e => 
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(term) || 
        e.email.toLowerCase().includes(term)
    );
    renderEmployeeTable(filtered);
};