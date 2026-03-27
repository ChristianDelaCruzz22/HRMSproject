
const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let originalRole = 'User'; 
let currentAppFilter = 'Pending';


async function initDashboard() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) { window.location.href = "index.html"; return; }

    const user = session.user;

    const { data: profile } = await _supabase
        .from('applications')
        .select('first_name, last_name, role, status')
        .eq('user_id', user.id)
        .single();

    if (profile && profile.status === 'Approved') {
        const fName = profile.first_name || "User";
        const lName = profile.last_name || "";
        
        document.getElementById('userName').innerText = `${fName} ${lName}`.trim();
        document.getElementById('userInitials').innerText = (fName[0] + (lName[0] || "")).toUpperCase();

        originalRole = profile.role || 'User';
        document.getElementById('userRole').innerText = originalRole;

        if (originalRole === 'SuperAdmin') {
            document.getElementById('superAdminTools').style.display = 'flex';
        }

        applyRoleUI(originalRole);
        updateApplicantBadge();
        loadNotifications(); 
    } else {
        await _supabase.auth.signOut();
        window.location.href = "index.html";
    }
}


function previewRole(role) {

    document.getElementById('userRole').innerText = role + " (Preview)";
    
    
    applyRoleUI(role);
    
   
    showSection('dashboard');
    
    console.log(`UI successfully switched to ${role} preview.`);
}

function applyRoleUI(role) {
    const isAdmin = (role === 'Admin' || role === 'SuperAdmin');
    const isSuper = (role === 'SuperAdmin');

    document.querySelectorAll('.auth-admin').forEach(el => el.style.display = isAdmin ? 'block' : 'none');
    document.querySelectorAll('.auth-super').forEach(el => el.style.display = isSuper ? 'block' : 'none');
}



async function loadNotifications() {
    const { data: { user } } = await _supabase.auth.getUser();
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');

    const { data, error } = await _supabase
        .from('notifications')
        .select('*')
        .or(`receiver_id.eq.${user.id},type.eq.broadcast`)
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        list.innerHTML = '<div class="notif-empty">No new notifications</div>';
        badge.style.display = 'none';
        return;
    }

    const unreadCount = data.filter(n => !n.is_read).length;
    badge.innerText = unreadCount;
    badge.style.display = unreadCount > 0 ? 'block' : 'none';

    list.innerHTML = '';
    data.forEach((n, index) => {
        const item = document.createElement('div');
        item.className = `notif-item ${n.is_read ? 'read' : 'unread'}`;
        
      
        item.style.animationDelay = `${index * 0.05}s`;
        
        item.innerHTML = `
            <div class="notif-content">
                <p style="margin:0; font-size:13px; color:#1e293b;">${n.message}</p>
                <span style="font-size:10px; color:#94a3b8;">${new Date(n.created_at).toLocaleTimeString()}</span>
            </div>
            ${!n.is_read ? `<button onclick="markAsRead(${n.id})" class="btn-read-check" title="Mark as read"><i class="fa fa-check"></i></button>` : ''}
        `;
        list.appendChild(item);
    });
}

function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    const bellIcon = document.querySelector('.notif-icon-container i');
    
 
    bellIcon.classList.add('bell-animate');
    setTimeout(() => bellIcon.classList.remove('bell-animate'), 400);

    
    const isOpening = !panel.classList.contains('show');
    
    if (isOpening) {
        panel.classList.add('show');
        loadNotifications(); 
    } else {
        panel.classList.remove('show');
    }
}

async function markAsRead(id) {
    const { error } = await _supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (!error) loadNotifications();
}


document.addEventListener('click', (e) => {
    const panel = document.getElementById('notifPanel');
    const trigger = document.querySelector('.notif-icon-container');
    if (panel && !trigger.contains(e.target) && !panel.contains(e.target)) {
        panel.classList.remove('show');
    }
});



async function loadApplicants(statusFilter = 'Pending') {
    currentAppFilter = statusFilter;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === statusFilter);
    });

    const list = document.getElementById('applicants-list');
    list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading...</td></tr>';

    const { data, error } = await _supabase
        .from('applications')
        .select('*')
        .eq('status', statusFilter)
        .order('created_at', { ascending: false });

    if (error) return;

    list.innerHTML = '';
    if (data.length === 0) {
        list.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#94a3b8;">No ${statusFilter.toLowerCase()} applications.</td></tr>`;
        return;
    }

    data.forEach(app => {
        const row = document.createElement('tr');
        const actions = statusFilter === 'Pending' ? `
            <button onclick="rejectApplicant('${app.user_id}')" class="btn-action-reject">Reject</button>
            <button onclick="approveApplicant('${app.user_id}')" class="btn-action-approve">Approve</button>
        ` : `<span class="status-tag ${statusFilter.toLowerCase()}">${statusFilter}</span>`;

        row.innerHTML = `
            <td><div style="font-weight:600;">${app.first_name} ${app.last_name}</div></td>
            <td style="color:#64748b; font-size:13px;">${app.position || 'Employee'}</td>
            <td style="color:#64748b; font-size:13px;">${new Date(app.created_at).toLocaleDateString()}</td>
            <td style="text-align:right;">${actions}</td>
        `;
        list.appendChild(row);
    });
}

async function approveApplicant(uid) {
    if(!confirm("Approve this user?")) return;
    const { data: { user } } = await _supabase.auth.getUser();

    const { error } = await _supabase.from('applications').update({ status: 'Approved', role: 'User' }).eq('user_id', uid);
    
    if (!error) {
     
        await _supabase.from('notifications').insert([{
            sender_id: user.id,
            receiver_id: uid,
            message: "Congratulations! Your application has been Approved. You can now access full employee features.",
            type: 'direct'
        }]);

        loadApplicants('Pending');
        updateApplicantBadge();
    }
}

async function rejectApplicant(uid) {
    if(!confirm("Reject this user?")) return;
    const { data: { user } } = await _supabase.auth.getUser();

    const { error } = await _supabase.from('applications').update({ status: 'Rejected' }).eq('user_id', uid);
    
    if (!error) {
        // AUTOMATIC NOTIFICATION
        await _supabase.from('notifications').insert([{
            sender_id: user.id,
            receiver_id: uid,
            message: "Thank you for your interest. Unfortunately, your application was not selected at this time.",
            type: 'direct'
        }]);

        loadApplicants('Pending');
        updateApplicantBadge();
    }
}



async function updateApplicantBadge() {
    const { count } = await _supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
    const badge = document.getElementById('badge-count');
    if (badge) {
        badge.innerText = count || 0;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

function showSection(id) {
    ['dashboard', 'recruitment'].forEach(s => {
        const section = document.getElementById(`section-${s}`);
        const nav = document.getElementById(`nav-${s}`);
        if(section) section.style.display = (s === id) ? 'block' : 'none';
        if(nav) nav.classList.toggle('active', s === id);
    });
    
    const title = document.getElementById('topbar-title');
    title.innerText = id === 'dashboard' ? 'Dashboard Overview' : 'Recruitment Management';

    if (id === 'recruitment') loadApplicants('Pending');
}

function toggleDropdown() {
    const m = document.getElementById('profileMenu');
    m.style.display = m.style.display === 'block' ? 'none' : 'block';
}

async function handleSignOut() {
    await _supabase.auth.signOut();
    window.location.href = "index.html";
}

window.onload = initDashboard;
