
const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let userProfile = null;
let currentRoleView = null;
let currentFilter = 'All';
let allEmployees = [];


async function init() {
    console.log("System: Initializing Employee Management...");
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


window.openEditModal = async (userId) => {
    
    const emp = allEmployees.find(e => e.user_id === userId);
    if (!emp) return;

    if (userProfile.role === 'Admin' && emp.role === 'SuperAdmin') {
        alert("Access Denied: Admins cannot modify SuperAdmin accounts.");
        return;
    }
    
    const deptDropdown = document.getElementById('editDepartment');
    try {
        const { data: depts, error: deptError } = await _supabase
            .from('department')
            .select('department_name');

        if (depts && deptDropdown) {
            
            deptDropdown.innerHTML = depts.map(d => 
                `<option value="${d.department_name}" ${d.department_name === emp.department ? 'selected' : ''}>
                    ${d.department_name}
                </option>`
            ).join('');
        }
    } catch (err) {
        console.error("Failed to sync departments:", err);
    }
    
    const avatarContainer = document.getElementById('editModalAvatar');
    const emailDisplay = document.getElementById('editModalEmail');

    if (avatarContainer) {
        if (emp.avatar_url) {
            avatarContainer.innerHTML = `<img src="${emp.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            avatarContainer.style.background = "transparent";
        } else {
            const initials = (emp.first_name[0] + emp.last_name[0]).toUpperCase();
            avatarContainer.innerText = initials;
            avatarContainer.style.background = "#f1f5f9";
            avatarContainer.style.display = "flex";
            avatarContainer.style.alignItems = "center";
            avatarContainer.style.justifyContent = "center";
        }
    }

    if (emailDisplay) {
        emailDisplay.innerText = emp.email;
    }

    
    document.getElementById('editUserId').value = emp.user_id;
    document.getElementById('editFirstName').value = emp.first_name;
    document.getElementById('editLastName').value = emp.last_name;
    document.getElementById('editRole').value = emp.role;

    
    document.getElementById('editModal').style.display = 'flex';
};


window.closeEditModal = () => {
    document.getElementById('editModal').style.display = 'none';
};



document.getElementById('editEmployeeForm').onsubmit = async (e) => {
    e.preventDefault();
    
    
    const userId = document.getElementById('editUserId').value;
    const adminName = document.getElementById('userName')?.innerText || "Admin";
    
    
    const emp = allEmployees.find(e => e.user_id === userId);
    
    if (!emp) {
        alert("Error: Employee data not found in local cache.");
        return;
    }

    try {
        
        const selectedDeptName = document.getElementById('editDepartment').value;
        console.log("Searching for department ID for:", selectedDeptName);

        const { data: deptData, error: deptLookupError } = await _supabase
            .from('department')
            .select('id')
            .ilike('department_name', selectedDeptName.trim())
            .single();
            
        if (deptLookupError || !deptData) {
            throw new Error(`Department '${selectedDeptName}' not found in the database master list.`);
        }

        
        const { error: empError } = await _supabase
            .from('employee')
            .update({
                first_name: document.getElementById('editFirstName').value.trim(),
                last_name: document.getElementById('editLastName').value.trim(),
                role: document.getElementById('editRole').value,
                modified_by_name: adminName,
                modified_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (empError) throw empError;

        
        console.log(`Syncing Job Table: Employee ${emp.id} -> Dept ${deptData.id}`);
        
        const { error: jobError } = await _supabase
            .from('job')
            .upsert({
                employee_id: emp.id,        
                department_id: deptData.id, 
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'employee_id'   
            });

        if (jobError) throw jobError;

        
        alert("Employee and Department updated successfully!");
        closeEditModal();
        
        
        if (typeof fetchEmployees === 'function') {
            await fetchEmployees(); 
        }

    } catch (err) {
        console.error("Critical Update Failure:", err);
        alert("Failed to update: " + err.message);
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
            console.log("Audit Trail created successfully.");
        }

        showToast("Profile and Audit Log updated!", "success");

    } catch (err) {
        console.error("Update Error:", err.message);
        showToast(err.message, "error");
    }
}




async function fetchEmployees() {
    try {
        console.log("System: Fetching data from 'job' table...");

        
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
        console.error("Linkage Error:", err.message);
        
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

    
    const password = document.getElementById('addPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    const genderEl = document.querySelector('input[name="gender"]:checked');
    const genderValue = genderEl ? genderEl.value : null;

    try {
       
        const selectedDept = document.getElementById('addDept').value;
        const { data: deptData, error: deptLookupError } = await _supabase
            .from('department')
            .select('id')
            .ilike('department_name', selectedDept.trim())
            .single();

        if (deptLookupError || !deptData) {
            throw new Error(`Department '${selectedDept}' not found. Please ensure it exists in the master list.`);
        }

        
        const newEmployeeData = {
            user_id: crypto.randomUUID(), 
            first_name: document.getElementById('addFirstName').value.trim(),
            last_name: document.getElementById('addLastName').value.trim(),
            email: document.getElementById('addEmail').value.trim(),
            dob: document.getElementById('addDOB').value,
            gender: genderValue,
            contact: document.getElementById('addPhone')?.value || null, 
            introduction: document.getElementById('addIntro')?.value || null, 
            status: 'Pending',
            role: 'User'
        };

        const { data: savedEmp, error: empError } = await _supabase
            .from('employee')
            .insert([newEmployeeData])
            .select() 
            .single();

        if (empError) throw empError;

        const { error: jobError } = await _supabase
            .from('job')
            .insert([{
                employee_id: savedEmp.id,
                department_id: deptData.id,
                position: document.getElementById('addPosition').value.trim()
            }]);

        if (jobError) throw jobError;

        
        alert("New employee added successfully!");
        document.getElementById('addEmployeeForm').reset();
        closeAddModal();
        
        
        if (typeof fetchEmployees === 'function') {
            await fetchEmployees();
        }

    } catch (err) {
        console.error("Add Employee Error:", err);
        alert("Failed to add employee: " + err.message);
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

    const pass = document.getElementById('addPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;

    if (pass !== confirmPass) {
        alert("Passwords do not match! Please check again.");
        return; 
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
                <td>${emp.department || 'N/A'}</td>
                <td><span class="status-tag status-${emp.status}">${emp.status}</span></td>
                <td style="text-align:right;">
                    <button class="btn-action" onclick="openEditModal('${emp.user_id}')"><i class="fa fa-pencil"></i></button>
                    <button class="btn-action ${isInactive ? 'btn-reactivate' : 'btn-delete'}" onclick="toggleStatus('${emp.user_id}', '${emp.status}')">
                        <i class="fa ${isInactive ? 'fa-unlock' : 'fa-ban'}"></i>
                    </button>
                </td>
            </tr>
        `;
    });
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