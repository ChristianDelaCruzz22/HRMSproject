
const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const ROLE_NAMES = { 'SuperAdmin': 'CEO', 'Admin': 'Manager', 'User': 'Employee' };
let currentRole = 'User';
let actualUserRole = 'User';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) { window.location.href = "index.html"; return; }

    
    const { data: profile } = await _supabase
        .from('employee')
        .select('*, job(position)')
        .eq('user_id', session.user.id)
        .single();

    if (profile && (profile.role === 'Admin' || profile.role === 'SuperAdmin')) {
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
        
        
        try { loadNotifications(); } catch(e) {  }
        try { updateMessageBadge(); } catch(e) {  }
        
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



document.addEventListener('DOMContentLoaded', updateMessageBadge);

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
    
    list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:40px;">Loading...</td></tr>';

    try {
        const { data, error } = await _supabase
            .from('employee') 
            .select('*, job(position)')
            .ilike('status', status) 
            .order('created_at', { ascending: false });

        

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:#94a3b8;">No ${status.toLowerCase()} applicants found.</td></tr>`;
            return;
        }

        list.innerHTML = data.map(app => {
    

        const resumeClass = (status === 'Approved') ? 'resume-btn resume-btn-approved' : 'resume-btn';
        const displayPosition = (app.job && app.job.length > 0) ? app.job[0].position : 'Employee';
        
        
        const targetId = app.id || app.user_id;

        let actionColumn = '';
        if (status === 'Pending') {
            actionColumn = `
                <button onclick="handleAction('${targetId}', 'Rejected')" class="btn-action-reject">Reject</button>
                <button onclick="handleAction('${targetId}', 'Approved')" class="btn-action-approve">Approve</button>
            `;
        } else if (status === 'Approved') {
            const modDate = app.modified_at ? new Date(app.modified_at).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'N/A';
            const modBy = app.modified_by_name || 'System';
            
            actionColumn = `
                <div class="approved-info-container">
                    <span class="status-tag approved">Approved</span>
                    <div class="audit-trail">
                        <span class="audit-user"><i class="fa fa-user-check"></i> ${modBy}</span>
                        <span class="audit-date">${modDate}</span>
                    </div>
                </div>
            `;
        } else if (status === 'Rejected') {
            actionColumn = `
                <button onclick="handleAction('${targetId}', 'Pending')" class="btn-action-recheck">
                    <i class="fa fa-refresh"></i> Recheck
                </button>
            `;
        } else {
            actionColumn = `<span class="status-tag ${status.toLowerCase()}">${status}</span>`;
        }

        return `
            <tr>
                <td>
                    <div style="font-weight:700; color:#1e293b;">${app.first_name} ${app.last_name}</div>
                    <div style="margin-top:8px;">
                        <a href="${app.resume_url}" target="_blank" class="${resumeClass}">
                            <i class="fa fa-file-pdf-o"></i> View Resume
                        </a>
                    </div>
                </td>
                <td><span class="pos-tag">${displayPosition}</span></td>
                <td style="color:#64748b;">${new Date(app.created_at).toLocaleDateString()}</td>
                <td style="text-align:right;">${actionColumn}</td>
            </tr>
        `;
    }).join('');
    } catch (err) {
        console.error("Fetch Error:", err.message);
        list.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Error: ${err.message}</td></tr>`;
    }
}



async function handleAction(rowId, newStatus) {
    if (!rowId || rowId === 'undefined') return;
    if (!confirm(`Set status to ${newStatus}?`)) return;

    try {
        
        const adminName = document.getElementById('userName')?.innerText || "Unknown Admin";

        const updates = { 
            status: newStatus,
            modified_by_name: adminName, 
            modified_at: new Date().toISOString() 
        };
        if (newStatus === 'Approved') updates.role = 'User';

        const { data, error } = await _supabase
            .from('employee')
            .update(updates)
            .eq('id', rowId) 
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            alert("Update failed: Record not found.");
            return;
        }

        
        if (window.showToast) {
            showToast(`Status: ${newStatus}`, "success");
        } else {
            alert(`Successfully updated to ${newStatus}`);
        }
        
        
        const activeTab = document.querySelector('.filter-btn.active')?.innerText || 'Pending';
        await loadApplicants(activeTab);
        if (window.updateBadge) await updateBadge();

    } catch (err) {
        console.error("Action Error:", err.message);
        alert("Error: " + err.message);
    }
}


async function updateBadge() {
    const { count } = await _supabase
        .from('employee')
        .select('*', { count: 'exact', head: true })
        .ilike('status', 'Pending');

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
        badge.style.display = count > 0 ? 'flex' : 'none'; 
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
