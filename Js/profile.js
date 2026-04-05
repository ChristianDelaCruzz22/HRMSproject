const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const ROLE_NAMES = { 
    'SuperAdmin': 'CEO', 
    'Admin': 'Manager', 
    'User': 'Employee' 
};


document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (!session) { 
        window.location.href = "index.html"; 
        return; 
    }

  
    updateElement('session-email', session.user.email); 
    updateElement('p-email-display', session.user.email); 
    updateElement('p-password-display', '••••••••••••');

    
    const { data: profile, error } = await _supabase
        .from('applications')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

    if (error) {
        console.error("Error fetching profile:", error.message);
        return;
    }

    if (profile) {
        populateProfileUI(profile);
        applyRolePermissions(profile.role); 
        loadNotifications(); // <--- This will now populate the list
        updateApplicantBadge();
    }
});


function populateProfileUI(p) {
    const fName = p.first_name || "User";
    const lName = p.last_name || "";
    const fullName = `${fName} ${lName}`.trim();
    const initials = (fName[0] + (lName[0] || "")).toUpperCase();   

    const superTools = document.getElementById('superAdminTools');
    if (superTools) {
        superTools.style.display = (p.role === 'SuperAdmin') ? 'flex' : 'none';
    }

    updateElement('userName', fullName);
    updateElement('userRole', ROLE_NAMES[p.role] || 'Employee');
    updateElement('topInitials', initials); 
    updateElement('mainInitials', initials); 
    updateElement('userInitials', initials);
    updateElement('disp-full-name', fullName);
    updateElement('disp-pos-dept', `${p.position || 'Staff'} | ${p.department || 'Operations'}`);

    updateElement('p-empid', `EMP-2026-${p.id}`);
    updateElement('p-contact', p.contact || 'Not Provided'); 
    updateElement('p-address', p.address || 'Not Provided');
    updateElement('p-dob', p.dob || 'Not Provided');
    updateElement('p-dept', p.department || 'General');
    updateElement('p-location', p.work_location || 'On-site');
    updateElement('p-hired', p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A');
    updateElement('p-sysrole', ROLE_NAMES[p.role]);

    const avatarIds = ['userInitials', 'topInitials', 'mainInitials', 'modalInitials'];
    avatarIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (p.avatar_url) {
                const timestampUrl = `${p.avatar_url}?t=${new Date().getTime()}`;
                el.innerText = ""; 
                el.style.backgroundImage = `url('${timestampUrl}')`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
            } else {
                el.innerText = initials;
                el.style.backgroundImage = 'none';
            }
        }
    });

    const pillContainer = document.getElementById('role-pill-container');
    if (pillContainer) {
        const pillColor = p.role === 'SuperAdmin' ? '#6366f1' : (p.role === 'Admin' ? '#10b981' : '#64748b');
        pillContainer.innerHTML = `
            <span style="background:${pillColor}15; color:${pillColor}; padding:4px 12px; border-radius:99px; font-size:11px; font-weight:700; border: 1px solid ${pillColor}30;">
                <i class="fa fa-shield"></i> ${ROLE_NAMES[p.role].toUpperCase()} ACCOUNT
            </span>
        `;
    }
}


function applyRolePermissions(role) {
    const isAdmin = (role === 'Admin' || role === 'SuperAdmin');
    const isSuper = (role === 'SuperAdmin');

    document.querySelectorAll('.auth-admin').forEach(el => el.style.display = isAdmin ? 'block' : 'none');
    document.querySelectorAll('.auth-super').forEach(el => el.style.display = isSuper ? 'block' : 'none');

    const adminCard = document.getElementById('adminPrivilegeCard');
    if (adminCard) adminCard.style.display = isAdmin ? 'block' : 'none';

    const tools = document.getElementById('superAdminTools');
    if (tools) tools.style.display = isSuper ? 'flex' : 'none'; 
}

function previewRole(val) {
    updateElement('topRole', ROLE_NAMES[val] + " ");
    updateElement('p-sysrole', ROLE_NAMES[val]);
    applyRolePermissions(val);
    
    const tools = document.getElementById('superAdminTools');
    if (tools) tools.style.display = 'flex';
    
    const pillContainer = document.getElementById('role-pill-container');
    if (pillContainer) {
        const pillColor = val === 'SuperAdmin' ? '#6366f1' : (val === 'Admin' ? '#10b981' : '#64748b');
        pillContainer.innerHTML = `
            <span style="background:${pillColor}15; color:${pillColor}; padding:4px 12px; border-radius:99px; font-size:11px; font-weight:700; border: 1px solid ${pillColor}30;">
                <i class="fa fa-eye"></i> ${ROLE_NAMES[val].toUpperCase()} 
            </span>
        `;
    }
}


function openEditModal() {
    updateElement('modalInitials', document.getElementById('mainInitials').innerText);
    updateElement('view-empid', document.getElementById('p-empid').innerText);
    updateElement('view-hired', document.getElementById('p-hired').innerText);
    updateElement('view-sysrole', document.getElementById('p-sysrole').innerText);

    const fullNameParts = document.getElementById('disp-full-name').innerText.split(' ');
    document.getElementById('edit-fname').value = fullNameParts[0] || '';
    document.getElementById('edit-lname').value = fullNameParts.slice(1).join(' ') || '';
    
    document.getElementById('edit-contact').value = document.getElementById('p-contact').innerText.replace('Not Provided', '');
    document.getElementById('edit-address').value = document.getElementById('p-address').innerText.replace('Not Provided', '');
    document.getElementById('edit-dept').value = document.getElementById('p-dept').innerText;
    document.getElementById('edit-location').value = document.getElementById('p-location').innerText;

    const dobValue = document.getElementById('p-dob').innerText;
    if (dobValue !== 'Not Provided') document.getElementById('edit-dob').value = dobValue;

    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'flex';
}

function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }

document.getElementById('editProfileForm').onsubmit = async (e) => {
    e.preventDefault();
    const { data: { session } } = await _supabase.auth.getSession();
    
    const fileInput = document.getElementById('profileInput');
    const file = fileInput.files[0];
    let publicUrl = null;

    try {
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await _supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;
            const { data } = _supabase.storage.from('avatars').getPublicUrl(fileName);
            publicUrl = data.publicUrl;
        }

        const updates = {
            first_name: document.getElementById('edit-fname').value,
            last_name: document.getElementById('edit-lname').value,
            contact: document.getElementById('edit-contact').value,
            address: document.getElementById('edit-address').value,
            dob: document.getElementById('edit-dob').value,
            department: document.getElementById('edit-dept').value,
            work_location: document.getElementById('edit-location').value,
            updated_at: new Date()
        };

        if (publicUrl) updates.avatar_url = publicUrl;

        const { error } = await _supabase.from('applications').update(updates).eq('user_id', session.user.id);
        if (error) throw error;

        showToast("Profile Updated", "Changes saved successfully.", "success");
        setTimeout(() => location.reload(), 1500); 

    } catch (error) {
        showToast("Update Error", error.message, "error");
    }
};


function updateElement(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function triggerFileSelect() { document.getElementById('profileInput').click(); }

function handleImageUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewCircle = document.getElementById('modalInitials');
            previewCircle.innerText = "";
            previewCircle.style.backgroundImage = `url('${e.target.result}')`;
            previewCircle.style.backgroundSize = 'cover';
            previewCircle.style.backgroundPosition = 'center';
            previewCircle.style.border = '2px solid #6366f1';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function handleChangeEmail() {
    const newEmail = prompt("Enter your new email address:");
    if (newEmail && newEmail.includes('@')) {
        const { error } = await _supabase.auth.updateUser({ email: newEmail });
        if (error) showToast("Update Failed", error.message, "error");
        else showToast("Verification Sent", "Please check your email to confirm.", "success");
    }
}

async function handleChangePassword() {
    const newPass = prompt("Enter new password (min. 6 chars):");
    if (newPass && newPass.length >= 6) {
        const { error } = await _supabase.auth.updateUser({ password: newPass });
        if (error) showToast("Update Failed", error.message, "error");
        else showToast("Success", "Password updated successfully.", "success");
    }
}

function showToast(title, message, type = 'success') {
    let container = document.querySelector('.toast-container') || document.createElement('div');
    if (!container.className) {
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    const color = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b';

    toast.innerHTML = `
        <i class="fa ${icon}" style="color: ${color}"></i>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-msg">${message}</span>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}


async function handleSignOut() { await _supabase.auth.signOut(); window.location.href = "index.html"; }
function toggleDropdown() { document.getElementById('profileMenu')?.classList.toggle('show'); }
function toggleNotifPanel() { 
    const panel = document.getElementById('notifPanel');
    if (panel) {
        panel.classList.toggle('show'); 
        if (panel.classList.contains('show')) loadNotifications(); 
    }
}

async function updateApplicantBadge() {
    const { count } = await _supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
    const badge = document.getElementById('badge-count');
    if (badge) { badge.innerText = count || 0; badge.style.display = count > 0 ? 'inline-block' : 'none'; }
}


async function loadNotifications() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');

    const { data, error } = await _supabase
        .from('notifications')
        .select('*')
        .or(`receiver_id.eq.${user.id},type.eq.broadcast`)
        .order('created_at', { ascending: false });

    if (error) return;

  
    if (badge && data) {
        const unreadCount = data.filter(n => !n.is_read).length;
        badge.innerText = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none'; // 'flex' for centering
    }

    
    if (list) {
        if (!data || data.length === 0) {
            list.innerHTML = '<div class="notif-empty" style="text-align:center; padding:20px; color:#94a3b8;">No notifications</div>';
            return;
        }

        list.innerHTML = data.map(n => `
            <div class="notif-item ${n.is_read ? 'read' : 'unread'}" onclick="markAsRead('${n.id}')" 
                 style="padding:12px; border-bottom:1px solid #f1f5f9; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                <div class="notif-content">
                    <p style="margin:0; font-size:13px; font-weight:${n.is_read ? '400' : '600'}; color:#1e293b;">${n.message}</p>
                    <small style="color:#94a3b8; font-size:11px;">${new Date(n.created_at).toLocaleTimeString()}</small>
                </div>
                ${!n.is_read ? '<div class="unread-dot" style="width:8px; height:8px; background:#ef4444; border-radius:50%;"></div>' : ''}
            </div>
        `).join('');
    }
}

async function markAsRead(id) {
    const { error } = await _supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    
    if (!error) loadNotifications(); 
}


document.addEventListener('click', (e) => {
    const notifPanel = document.getElementById('notifPanel');
    const notifTrigger = document.querySelector('.notif-wrapper');
    const profileMenu = document.getElementById('profileMenu');
    const profileTrigger = document.querySelector('.profile-trigger');

    if (notifPanel && notifTrigger && !notifTrigger.contains(e.target) && !notifPanel.contains(e.target)) {
        notifPanel.classList.remove('show');
    }
    if (profileMenu && profileTrigger && !profileTrigger.contains(e.target) && !profileMenu.contains(e.target)) {
        profileMenu.classList.remove('show');
    }
});