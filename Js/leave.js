
const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const ROLE_NAMES = { 'SuperAdmin': 'CEO', 'Admin': 'Manager', 'User': 'Employee' };
let currentRole = 'User';
let actualUserId = null;
let isActualSuperAdmin = false;


async function initLeave() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) { window.location.href = "index.html"; return; }

    actualUserId = session.user.id;

    const { data: profile } = await _supabase
        .from('employees')
        .select('*')
        .eq('user_id', actualUserId)
        .single();

    if (profile && (profile.status === 'Approved' || profile.status === 'online' || profile.status === 'offline')) {
        currentRole = profile.role;
        isActualSuperAdmin = (profile.role === 'SuperAdmin');
        
        updateUserHeader(profile);
        applyRolePermissions(currentRole);

        await updateAnnouncementBadge();
        
        
        await loadLeaveBalances();
        await loadMyRequests();
        await loadNotifications();
        setupRealtimeSubscriptions();

        await updateRecruitmentBadge(); 
        setupRecruitmentSubscription();

        if (currentRole === 'Admin' || currentRole === 'SuperAdmin') {
            const adminPanel = document.getElementById('admin-leave-panel');
            if (adminPanel) adminPanel.style.display = 'block';
            await loadAdminRequests();
        }
    } else {
        await _supabase.auth.signOut();
        window.location.href = "index.html";
    }
}

const updateMessageBadge = async () => {
    try {
        // 1. Get the current session
        const { data: { session } } = await _supabase.auth.getSession();
        
        if (!session) return; 

        const userId = session.user.id;

        const { count, error } = await _supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', userId)
            .eq('is_read', false);

        if (error) throw error;

        const badge = document.getElementById('msg-badge');
        if (badge) {
            if (count > 0) {
                badge.innerText = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (err) {
        console.error("Badge Error:", err.message);
    }
};


_supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        updateMessageBadge();
    }
});


document.addEventListener('DOMContentLoaded', updateMessageBadge);


function updateUserHeader(profile) {
    document.getElementById('userName').innerText = `${profile.first_name} ${profile.last_name || ""}`;
    document.getElementById('userRole').innerText = ROLE_NAMES[currentRole] || currentRole;
    
    const thumb = document.getElementById('userInitials');
    if (thumb) {
        if (profile.avatar_url && profile.avatar_url.trim() !== "") {
            thumb.innerHTML = `<img src="${profile.avatar_url}" style="width:100%; height:100%; border-radius: 25%; object-fit:cover;">`;
        } else {
            thumb.innerText = (profile.first_name[0] + (profile.last_name ? profile.last_name[0] : "")).toUpperCase();
        }
    }
}

function setupRealtimeSubscriptions() {
    
    _supabase.channel('leave-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        loadMyRequests();
        if (currentRole === 'Admin' || currentRole === 'SuperAdmin') loadAdminRequests();
    }).subscribe();

    
    _supabase.channel('announcement-realtime').on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'announcements' 
    }, () => {
        updateAnnouncementBadge();
    }).subscribe();
}

async function updateAnnouncementBadge() {
    try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        
        const { data, error } = await _supabase
            .from('announcements')
            .select('id')
            .gt('created_at', twentyFourHoursAgo.toISOString())
            .in('audience', ['Everyone', currentRole === 'User' ? 'Employee' : 'Admin Only', currentRole])
            .limit(1);

        if (error) throw error;

        const badge = document.getElementById('ann-badge-nav');
        if (badge) {
            if (data && data.length > 0) {
                badge.style.display = 'flex';
                badge.innerText = "!";
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (err) {
        console.error("Announcement badge error:", err.message);
    }
}

async function updateRecruitmentBadge() {
    try {
        const { count, error } = await _supabase
            .from('employees') 
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Pending');

        if (error) {
            console.error("Recruitment Count Error:", error.message);
            return;
        }

        const badgeElement = document.getElementById('badge-count');
        if (badgeElement) {
            if (count > 0) {
                badgeElement.innerText = count;
                badgeElement.style.display = 'flex';
            } else {
                badgeElement.style.display = 'none';
            }
        }
    } catch (err) {
        console.error("Badge Error:", err);
    }
}


function setupRecruitmentSubscription() {
    _supabase.channel('recruitment-badge').on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'employees' 
    }, () => {
        updateRecruitmentBadge();
    }).subscribe();
}

window.previewRole = async function(selectedRole) {
    currentRole = selectedRole;
    const roleDisplay = document.getElementById('userRole');
    if (roleDisplay) roleDisplay.innerText = ROLE_NAMES[selectedRole] || selectedRole;

    applyRolePermissions(selectedRole);

    const adminPanel = document.getElementById('admin-leave-panel');
    if (adminPanel) {
        if (selectedRole === 'Admin' || selectedRole === 'SuperAdmin') {
            adminPanel.style.display = 'block';
            await loadAdminRequests();
        } else {
            adminPanel.style.display = 'none';
        }
    }
};


async function loadLeaveBalances() {
    console.log("Fetching live request counts from Supabase...");

  
    const { data: requests, error } = await _supabase
        .from('leave_requests')
        .select('leave_type, status')
        .eq('user_id', actualUserId);

    if (error) {
        console.error("Supabase Fetch Error:", error.message);
        return;
    }

    
    const counts = {
        vacation: { approved: 0, total: 0 },
        sick: { approved: 0, total: 0 },
        emergency: { approved: 0, total: 0 }
    };

    
    if (requests) {
        requests.forEach(req => {
            const type = req.leave_type.toLowerCase();
            let key = "";

            if (type.includes('vacation')) key = 'vacation';
            else if (type.includes('sick')) key = 'sick';
            else if (type.includes('emergency')) key = 'emergency';

            if (key) {
                counts[key].total += 1; 
                if (req.status === 'Approved') {
                    counts[key].approved += 1; 
                }
            }
        });
    }

    
    updateCardDisplay('vl', counts.vacation);
    
    
    updateCardDisplay('sl', counts.sick);
    
    
    updateCardDisplay('el', counts.emergency);
}

function updateCardDisplay(prefix, data) {
    const remEl = document.getElementById(`${prefix}-rem`); 
    const usedEl = document.getElementById(`${prefix}-used`); 

    if (remEl) {
        
        remEl.innerText = data.total; 
    }
    if (usedEl) {
        
        usedEl.innerText = data.approved; 
    }
}


async function loadAdminRequests() {
    const filterType = document.getElementById('typeFilter')?.value || 'All';
    console.log("Filtering by:", filterType);

    
    let query = _supabase
        .from('leave_requests')
        .select(`*, employees!user_id (first_name, last_name)`)
        .eq('status', 'Pending');

    if (filterType !== 'All') {
        query = query.eq('leave_type', filterType);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    
    if (error || !data || (data.length > 0 && !data[0].employees)) {
        console.warn("Join failed or error occurred, using manual merge fallback.");
        
        
        let { data: requests } = await _supabase
            .from('leave_requests')
            .select('*')
            .eq('status', 'Pending');

        
        if (filterType !== 'All') {
            requests = (requests || []).filter(r => r.leave_type === filterType);
        }

        const { data: emps } = await _supabase
            .from('employees')
            .select('user_id, first_name, last_name');

        const merged = (requests || []).map(r => ({
            ...r,
            employees: emps.find(e => e.user_id === r.user_id) || null
        }));
        
        renderAdminTable(merged);
    } else {
        
        renderAdminTable(data);
    }
}

function renderAdminTable(data) {
    const tbody = document.getElementById('adminLeaveTableBody');
    if (!tbody) return;

    tbody.innerHTML = data.length > 0 ? data.map(r => `
        <tr>
            <td><strong>${r.employees?.first_name || "Employee"} ${r.employees?.last_name || ""}</strong></td>
            <td>${r.leave_type}</td>
            <td>${r.start_date} to ${r.end_date}</td>
            <td><small>${r.reason || 'N/A'}</small></td>
            <td><span class="status-badge status-pending">PENDING</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-approve" onclick="processLeave('${r.id}', 'Approved', '${r.user_id}', '${r.leave_type}', ${r.total_days})">Approve</button>
                    <button class="btn-reject" onclick="processLeave('${r.id}', 'Rejected', '${r.user_id}')">Reject</button>
                </div>
            </td>
        </tr>`).join('') : '<tr><td colspan="6" style="text-align:center; padding: 20px;">No pending reviews.</td></tr>';
}


async function handleLeaveFormSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('leaveType').value;
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    const days = Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

    const { error } = await _supabase.from('leave_requests').insert([{
        user_id: actualUserId,
        leave_type: type,
        start_date: start,
        end_date: end,
        total_days: days,
        reason: document.getElementById('leaveReason').value,
        status: 'Pending'
    }]);

    if (error) alert("Failed: " + error.message);
    else {
        alert("Success: Request sent!");
        document.getElementById('leaveForm').reset();
        await loadMyRequests();
    }
}

window.processLeave = async function(id, status, uid, type, days) {
    const { error } = await _supabase.from('leave_requests').update({ status }).eq('id', id);
    if (error) { alert("Error: " + error.message); return; }

    if (status === 'Approved') {
        const { data: b } = await _supabase.from('leave_balances').select('*').eq('user_id', uid).ilike('leave_type', `%${type}%`).single();
        if (b) {
            await _supabase.from('leave_balances').update({
                used: (b.used || 0) + days,
                remaining: (b.remaining || 0) - days
            }).eq('id', b.id);
        }
    }

    await _supabase.from('notifications').insert([{
        receiver_id: uid, sender_id: actualUserId,
        message: `Your ${type} leave request has been ${status}.`, is_read: false
    }]);

    alert(`Request ${status}!`);
    await loadAdminRequests();
    await loadLeaveBalances();
    await loadMyRequests();
};


async function loadMyRequests() {
    const { data } = await _supabase.from('leave_requests').select('*').eq('user_id', actualUserId).order('created_at', { ascending: false });
    const tbody = document.getElementById('myLeaveTableBody');
    if (tbody) {
        tbody.innerHTML = (data && data.length > 0) ? data.map(r => `
            <tr>
                <td>${r.leave_type}</td>
                <td>${r.start_date} - ${r.end_date}</td>
                <td>${r.total_days}</td>
                <td><span class="status-badge status-${r.status.toLowerCase()}">${r.status}</span></td>
            </tr>`).join('') : '<tr><td colspan="4">No leave history.</td></tr>';
    }
}

async function loadNotifications() {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');
    if (!list) return;

    const { data } = await _supabase.from('notifications').select('*').eq('receiver_id', actualUserId).order('created_at', { ascending: false }).limit(5);

    if (data) {
        const unread = data.filter(n => !n.is_read).length;
        if (badge) {
            badge.innerText = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }
        list.innerHTML = data.length > 0 ? data.map(n => `
            <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markAsRead('${n.id}')">
                <p>${n.message}</p>
                <small>${new Date(n.created_at).toLocaleTimeString()}</small>
            </div>`).join('') : '<div class="notif-empty">No new notifications</div>';
    }
}

window.markAsRead = async function(id) {
    await _supabase.from('notifications').update({ is_read: true }).eq('id', id);
    await loadNotifications();
};


function applyRolePermissions(role) {
    const isAdmin = (role === 'Admin' || role === 'SuperAdmin');
    document.querySelectorAll('.auth-admin').forEach(el => el.style.display = isAdmin ? 'block' : 'none');
    document.querySelectorAll('.auth-super').forEach(el => el.style.display = (role === 'SuperAdmin') ? 'block' : 'none');
    
    const switcher = document.getElementById('superAdminTools');
    if (switcher) switcher.style.display = isActualSuperAdmin ? 'flex' : 'none';
}

function setupRealtimeSubscriptions() {
    _supabase.channel('leave-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        loadMyRequests();
        if (currentRole === 'Admin' || currentRole === 'SuperAdmin') loadAdminRequests();
    }).subscribe();
}

window.handleSignOut = async () => { await _supabase.auth.signOut(); window.location.href = "index.html"; };
window.toggleDropdown = () => document.getElementById('profileMenu').classList.toggle('show');
window.toggleNotifPanel = () => document.getElementById('notifPanel').classList.toggle('show');

document.addEventListener('DOMContentLoaded', () => {
    initLeave();
    const form = document.getElementById('leaveForm');
    if (form) form.addEventListener('submit', handleLeaveFormSubmit);
});