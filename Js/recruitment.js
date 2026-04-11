
const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const ROLE_NAMES = { 'SuperAdmin': 'CEO', 'Admin': 'Manager', 'User': 'Employee' };
let currentRole = 'User';
let actualUserRole = 'User';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) { 
        window.location.href = "index.html"; 
        return; 
    }

  
    const { data: profile } = await _supabase
        .from('employees')
        .select('*')
        .eq('user_id', session.user.id)
        .single();


    if (profile && profile.status === 'Approved' && (profile.role === 'Admin' || profile.role === 'SuperAdmin')) {
        actualUserRole = profile.role;
        currentRole = actualUserRole;
        
        updateHeaderUI(profile);
        applySidebarRoles(profile.role);
        
        
        if (actualUserRole === 'SuperAdmin') {
            const adminTools = document.getElementById('superAdminTools');
            if (adminTools) adminTools.style.display = 'flex';
        }

        
        loadApplicants('Pending');
        updateBadge();
        loadNotifications(); 
        
    } else {
        
        window.location.href = "dashboard.html";
    }
});

function updateHeaderUI(p) {
    const fName = p.first_name || "User";
    const lName = p.last_name || "";
    const fullName = `${fName} ${lName}`.trim();
    const initials = (fName[0] + (lName[0] || "")).toUpperCase();

    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    if (nameEl) nameEl.innerText = fullName;
    if (roleEl) roleEl.innerText = ROLE_NAMES[p.role] || p.role;

    const thumbEl = document.getElementById('userInitials');
    if (thumbEl) {
        if (p.avatar_url) {
            thumbEl.innerText = ""; 
            thumbEl.style.backgroundImage = `url('${p.avatar_url}?t=${new Date().getTime()}')`;
            thumbEl.style.backgroundSize = 'cover';
            thumbEl.style.backgroundPosition = 'center';
        } else {
            thumbEl.innerText = initials;
            thumbEl.style.backgroundImage = 'none';
        }
    }
}

function applySidebarRoles(role) {
    const isAdmin = (role === 'Admin' || role === 'SuperAdmin');
    const isSuper = (role === 'SuperAdmin');
    document.querySelectorAll('.auth-admin').forEach(el => el.style.display = isAdmin ? 'block' : 'none');
    document.querySelectorAll('.auth-super').forEach(el => el.style.display = isSuper ? 'block' : 'none');
}


async function loadApplicants(status) {
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === status);
    });

    const list = document.getElementById('applicants-list');
    if (!list) return;
    
    list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:40px; color:#64748b;">Loading...</td></tr>';

    const { data, error } = await _supabase
        .from('employees')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        list.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:#94a3b8;">No ${status.toLowerCase()} applications found.</td></tr>`;
        return;
    }

    list.innerHTML = data.map(app => {
        const resumeClass = (status === 'Approved') ? 'resume-btn resume-btn-approved' : 'resume-btn';
        
        let actionColumn = '';
        if (status === 'Pending') {
            actionColumn = `
                <button onclick="handleAction('${app.user_id}', 'Rejected')" class="btn-action-reject">Reject</button>
                <button onclick="handleAction('${app.user_id}', 'Approved')" class="btn-action-approve">Approve</button>
            `;
        } else if (status === 'Rejected') {
            actionColumn = `
                <button onclick="handleAction('${app.user_id}', 'Pending')" class="btn-action-recheck">
                    <i class="fa fa-refresh"></i> Recheck
                </button>
            `;
        } else {
            const statusClass = status.toLowerCase();
            actionColumn = `<span class="status-tag ${statusClass}">${status}</span>`;
        }

        return `
            <tr>
                <td>
                    <div style="font-weight:700; color:#1e293b; font-size:15px;">${app.first_name} ${app.last_name}</div>
                    <div style="margin-top:8px;">
                        <a href="${app.resume_url}" target="_blank" class="${resumeClass}">
                            <i class="fa fa-file-pdf-o"></i> View Resume
                        </a>
                    </div>
                </td>
                <td><span class="pos-tag">${app.position || 'Employee'}</span></td>
                <td style="color:#64748b; font-size:13px;">${new Date(app.created_at).toLocaleDateString()}</td>
                <td style="text-align:right;">${actionColumn}</td>
            </tr>
        `;
    }).join('');
}

async function handleAction(uid, newStatus) {
    const confirmMsg = newStatus === 'Pending' 
        ? "Move this applicant back to Pending?" 
        : `Are you sure you want to ${newStatus.toLowerCase()} this applicant?`;

    if (!confirm(confirmMsg)) return;


    const roleToAssign = newStatus === 'Approved' ? 'User' : null;

    const { error } = await _supabase
        .from('employees')
        .update({ status: newStatus, role: roleToAssign })
        .eq('user_id', uid);

    if (error) {
        console.error("Action Error:", error.message);
        alert("Failed to update status.");
        return;
    }

    
    const { data: { user } } = await _supabase.auth.getUser();
    let notifyMsg = "";
    if (newStatus === 'Approved') notifyMsg = "Your application has been Approved! Welcome to the team.";
    else if (newStatus === 'Rejected') notifyMsg = "Your application status has been updated to Rejected.";
    else if (newStatus === 'Pending') notifyMsg = "Your application is being re-evaluated.";

    await _supabase.from('notifications').insert([{
        sender_id: user.id,
        receiver_id: uid,
        message: notifyMsg,
        type: 'direct',
        is_read: false
    }]);

   
    const activeTab = document.querySelector('.filter-btn.active').innerText;
    loadApplicants(activeTab);
    updateBadge();
}


async function updateBadge() {
    const { count } = await _supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

    const badge = document.getElementById('badge-count');
    if (badge) {
        badge.innerText = count || 0;
        badge.style.display = (count > 0) ? 'inline-block' : 'none';
    }
}


async function loadNotifications() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;
    const badge = document.getElementById('notif-badge');
    const { data } = await _supabase.from('notifications').select('id').eq('receiver_id', user.id).eq('is_read', false);
    if (badge) {
        const count = data ? data.length : 0;
        badge.innerText = count;
        badge.style.display = count > 0 ? 'flex' : 'none'; // Keeps our centering fix
    }
}

function toggleNotifPanel() { document.getElementById('notifPanel')?.classList.toggle('show'); }
function toggleDropdown() { document.getElementById('profileMenu')?.classList.toggle('show'); }
async function handleSignOut() { await _supabase.auth.signOut(); window.location.href = "index.html"; }

function previewRole(val) {
    currentRole = val;
    const roleEl = document.getElementById('userRole');
    if (roleEl) roleEl.innerText = ROLE_NAMES[val] || val;
    applySidebarRoles(val);

   
    if (actualUserRole === 'SuperAdmin') {
        const adminTools = document.getElementById('superAdminTools');
        if (adminTools) adminTools.style.display = 'flex';
    }
}


document.addEventListener('click', (e) => {
    const notifPanel = document.getElementById('notifPanel');
    const notifTrigger = document.querySelector('.notif-icon-container');
    const profileMenu = document.getElementById('profileMenu');
    const profileTrigger = document.querySelector('.profile-trigger');

    if (notifPanel && notifTrigger && !notifTrigger.contains(e.target) && !notifPanel.contains(e.target)) {
        notifPanel.classList.remove('show');
    }
    if (profileMenu && profileTrigger && !profileTrigger.contains(e.target) && !profileMenu.contains(e.target)) {
        profileMenu.classList.remove('show');
    }
});
