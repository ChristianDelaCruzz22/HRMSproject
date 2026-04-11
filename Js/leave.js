/**
 * leave.js - HRMS Core Logic
 */

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

    if (profile && profile.status === 'Approved') {
        currentRole = profile.role;
        isActualSuperAdmin = (profile.role === 'SuperAdmin');
        
        updateUserHeader(profile);
        applyRolePermissions(currentRole);
        
        await loadLeaveBalances();
        await loadMyRequests();
        await loadNotifications();
        await updateRecruitmentBadge();
        setupRealtimeSubscriptions();

        // Ensure Admin View Loads immediately if user is Admin/SuperAdmin
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

/** * RECRUITMENT BADGE LOGIC */
async function updateRecruitmentBadge() {
    if (currentRole === 'User') return;
    const { count } = await _supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
    const badge = document.getElementById('badge-count');
    if (badge) {
        badge.innerText = count || 0;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

/** * UI & ROLE LOGIC */
window.previewRole = function(selectedRole) {
    currentRole = selectedRole; 
    applyRolePermissions(selectedRole); 
    const roleDisplay = document.getElementById('userRole');
    if (roleDisplay) roleDisplay.innerText = ROLE_NAMES[selectedRole] || selectedRole;

    const adminPanel = document.getElementById('admin-leave-panel');
    if (adminPanel) {
        if (selectedRole === 'Admin' || selectedRole === 'SuperAdmin') {
            adminPanel.style.display = 'block';
            loadAdminRequests();
        } else {
            adminPanel.style.display = 'none';
        }
    }
    updateRecruitmentBadge(); 
};

function updateUserHeader(profile) {
    document.getElementById('userName').innerText = `${profile.first_name} ${profile.last_name || ""}`;
    document.getElementById('userRole').innerText = ROLE_NAMES[currentRole] || currentRole;
    const thumb = document.getElementById('userInitials');
    if (profile.avatar_url) {
        thumb.style.backgroundImage = `url('${profile.avatar_url}')`;
        thumb.style.backgroundSize = 'cover';
        thumb.innerText = "";
    } else {
        thumb.innerText = (profile.first_name[0] + (profile.last_name ? profile.last_name[0] : "")).toUpperCase();
    }
}

function applyRolePermissions(role) {
    const isAdmin = (role === 'Admin' || role === 'SuperAdmin');
    document.querySelectorAll('.auth-admin').forEach(el => el.style.display = isAdmin ? 'block' : 'none');
    document.querySelectorAll('.auth-super').forEach(el => el.style.display = (role === 'SuperAdmin') ? 'block' : 'none');
    const switcher = document.getElementById('superAdminTools');
    if (switcher) switcher.style.display = isActualSuperAdmin ? 'flex' : 'none';
}

/** * LEAVE CORE FUNCTIONS */
async function loadLeaveBalances() {
    const { data: balances } = await _supabase.from('leave_balance').select('*').eq('user_id', actualUserId);
    if (balances) {
        balances.forEach(bal => {
            const type = bal.leave_type.toLowerCase();
            let prefix = type === 'vacation' ? 'vl' : (type === 'sick' ? 'sl' : 'el');
            if (document.getElementById(`${prefix}-rem`)) {
                document.getElementById(`${prefix}-rem`).innerText = bal.remaining;
                document.getElementById(`${prefix}-used`).innerText = bal.used;
            }
        });
    }
}

async function loadMyRequests() {
    const { data } = await _supabase.from('leave_requests').select('*').eq('user_id', actualUserId).order('created_at', { ascending: false });
    const tbody = document.getElementById('myLeaveTableBody');
    if (tbody) {
        tbody.innerHTML = data && data.length > 0 ? data.map(r => `
            <tr>
                <td>${r.leave_type}</td>
                <td>${r.start_date} - ${r.end_date}</td>
                <td>${r.total_days}</td>
                <td><span class="status-badge status-${r.status.toLowerCase()}">${r.status}</span></td>
            </tr>`).join('') : '<tr><td colspan="4">No leave history.</td></tr>';
    }
}

async function loadAdminRequests() {
    // Fetch pending requests with employee names
    const { data, error } = await _supabase
        .from('leave_requests')
        .select('*, employees:user_id(first_name, last_name)')
        .eq('status', 'Pending')
        .order('created_at', { ascending: true });

    const tbody = document.getElementById('adminLeaveTableBody');
    if (tbody) {
        if (data && data.length > 0) {
            tbody.innerHTML = data.map(r => `
                <tr>
                    <td><strong>${r.employees?.first_name || 'User'} ${r.employees?.last_name || ''}</strong></td>
                    <td>${r.leave_type}</td>
                    <td>${r.start_date} to ${r.end_date}</td>
                    <td><small>${r.reason}</small></td>
                    <td><span class="status-badge status-pending">${r.status}</span></td>
                    <td>
                        <button class="btn-approve" onclick="processLeave('${r.id}', 'Approved', '${r.user_id}', '${r.leave_type}', ${r.total_days})">Approve</button>
                        <button class="btn-reject" onclick="processLeave('${r.id}', 'Rejected', '${r.user_id}')">Reject</button>
                    </td>
                </tr>`).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No pending leave reviews.</td></tr>';
        }
    }
}

window.processLeave = async function(id, status, uid, type, days) {
    const { error } = await _supabase.from('leave_requests').update({ status }).eq('id', id);
    if (!error) {
        if (status === 'Approved') {
            const { data: b } = await _supabase.from('leave_balance').select('*').eq('user_id', uid).eq('leave_type', type).single();
            if (b) await _supabase.from('leave_balance').update({ used: b.used + days, remaining: b.remaining - days }).eq('id', b.id);
        }
        
        // Notify the Employee
        await _supabase.from('notifications').insert([{
            receiver_id: uid,
            sender_id: actualUserId,
            message: `Your ${type} leave request has been ${status.toLowerCase()}.`,
            is_read: false
        }]);

        await loadAdminRequests(); 
        await loadLeaveBalances(); 
        await loadMyRequests();
    }
};

/** * NOTIFICATION & REALTIME */
async function loadNotifications() {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');
    if (!list) return;
    const { data } = await _supabase.from('notifications').select('*').eq('receiver_id', actualUserId).order('created_at', { ascending: false }).limit(10);
    if (data && data.length > 0) {
        const unread = data.filter(n => !n.is_read).length;
        if (badge) {
            badge.innerText = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }
        list.innerHTML = data.map(n => `
            <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markAsRead('${n.id}')">
                <p>${n.message}</p>
                <small>${new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
            </div>`).join('');
    } else {
        list.innerHTML = `<div class="notif-empty">No new notifications</div>`;
        if (badge) badge.style.display = 'none';
    }
}

window.markAsRead = async function(id) {
    await _supabase.from('notifications').update({ is_read: true }).eq('id', id);
    await loadNotifications();
};

function setupRealtimeSubscriptions() {
    _supabase.channel('leave-updates').on('postgres_changes', { 
        event: '*', schema: 'public', table: 'leave_requests' 
    }, () => {
        loadMyRequests();
        if (currentRole === 'Admin' || currentRole === 'SuperAdmin') loadAdminRequests();
    }).subscribe();

    _supabase.channel('notif-updates').on('postgres_changes', { 
        event: '*', schema: 'public', table: 'notifications', filter: `receiver_id=eq.${actualUserId}` 
    }, () => loadNotifications()).subscribe();
}

/** * UTILS */
function calculateDays(s, e) {
    const start = new Date(s);
    const end = new Date(e);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

window.handleSignOut = async () => { await _supabase.auth.signOut(); window.location.href = "index.html"; };
window.toggleDropdown = () => document.getElementById('profileMenu').classList.toggle('show');
window.toggleNotifPanel = () => document.getElementById('notifPanel').classList.toggle('show');

/** * FORM SUBMISSION HANDLER */
async function handleLeaveFormSubmit(e) {
    e.preventDefault();
    if (!actualUserId) return alert("Session expired.");

    const leaveType = document.getElementById('leaveType').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const reason = document.getElementById('leaveReason').value;
    
    if (!leaveType || !startDate || !endDate || !reason) return alert('Fill all fields');
    
    const totalDays = calculateDays(startDate, endDate);

    // 1. Insert Request
    const { data: request, error: reqError } = await _supabase
        .from('leave_requests')
        .insert([{
            user_id: actualUserId,
            leave_type: leaveType,
            start_date: startDate,
            end_date: endDate,
            total_days: parseInt(totalDays),
            reason: reason,
            status: 'Pending'
        }]).select().single();
    
    if (reqError) {
        alert('Error: ' + reqError.message);
    } else {
        // 2. Notify Admins & SuperAdmins
        const { data: admins } = await _supabase
            .from('employees')
            .select('user_id')
            .in('role', ['Admin', 'SuperAdmin']);

        if (admins) {
            const adminNotifs = admins.map(admin => ({
                receiver_id: admin.user_id,
                sender_id: actualUserId,
                message: `New ${leaveType} leave request from ${document.getElementById('userName').innerText}.`,
                is_read: false
            }));
            await _supabase.from('notifications').insert(adminNotifs);
        }

        alert('Leave request submitted!');
        document.getElementById('leaveForm').reset();
        await loadMyRequests();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initLeave();
    const leaveForm = document.getElementById('leaveForm');
    if (leaveForm) leaveForm.addEventListener('submit', handleLeaveFormSubmit);
});