const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const ROLE_NAMES = { 'SuperAdmin': 'CEO', 'Admin': 'Manager', 'User': 'Employee' };
let currentRole = 'User'; 
let actualUserId = null;
let isActualSuperAdmin = false; 


async function initAttendance() {
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
        startLiveClock();
        setupFilterListener();
        
       
        await checkTodayStatus(actualUserId);
        await loadAttendanceLogs(); 
        await updateSummaryStats(); 
        
       
        setupRealtimeSubscriptions();
        loadNotifications();
    } else {
        await _supabase.auth.signOut();
        window.location.href = "index.html";
    }
}


function updateUserHeader(profile) {
    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.innerText = `${profile.first_name} ${profile.last_name || ""}`;
    
    const roleEl = document.getElementById('userRole');
    if (roleEl) roleEl.innerText = ROLE_NAMES[currentRole] || currentRole;

    const thumb = document.getElementById('userInitials');
    if (thumb) {
        if (profile.avatar_url) {
            thumb.innerText = "";
            thumb.style.backgroundImage = `url('${profile.avatar_url}')`;
            thumb.style.backgroundSize = 'cover';
        } else {
            thumb.innerText = (profile.first_name[0] + (profile.last_name ? profile.last_name[0] : "")).toUpperCase();
        }
    }
}

function applyRolePermissions(role) {
    const isAdmin = (role === 'Admin' || role === 'SuperAdmin');
    document.querySelectorAll('.auth-admin').forEach(el => el.style.display = isAdmin ? 'block' : 'none');
    document.querySelectorAll('.auth-super').forEach(el => el.style.display = (role === 'SuperAdmin') ? 'block' : 'none');

    const switcher = document.getElementById('superAdminTools');
    if (switcher) switcher.style.display = isActualSuperAdmin ? 'flex' : 'none';
    
    updateRecruitmentBadge();
}

window.previewRole = async function(roleValue) {
    currentRole = roleValue;
    const roleEl = document.getElementById('userRole');
    if (roleEl) roleEl.innerText = ROLE_NAMES[roleValue] || roleValue;
    
    applyRolePermissions(roleValue);
    await loadAttendanceLogs();
    await updateSummaryStats();
};



async function loadAttendanceLogs(filterMonth = null, filterStatus = 'All') {
    const body = document.getElementById('attendance-tbody');
    const tableHeader = document.querySelector('.dashboard-table thead tr');
    if (!body) return;

    body.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Fetching records...</td></tr>`;

    let query = _supabase.from('attendance').select('*');
    
    
    if (currentRole === 'User') {
        query = query.eq('user_id', actualUserId);
    }
    
    
    if (filterMonth) {
        query = query.gte('date', `${filterMonth}-01`).lt('date', getNextMonthFirstDay(filterMonth));
    }

    
    if (filterStatus !== 'All') {
        if (filterStatus === 'Present') {
            
            query = query.eq('status', 'On Time');
        } else {
            query = query.eq('status', filterStatus);
        }
    }

    const { data: logs, error } = await query.order('date', { ascending: false });

    if (error) {
        body.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">${error.message}</td></tr>`;
        return;
    }

    const { data: staff } = await _supabase.from('employees').select('user_id, first_name, last_name');
    const nameMap = {};
    if (staff) {
        staff.forEach(s => nameMap[s.user_id] = `${s.first_name} ${s.last_name || ""}`);
    }

    if (logs && logs.length > 0) {
        body.innerHTML = logs.map(log => {
            const statusClass = log.status ? log.status.toLowerCase().replace(' ', '-') : 'present';
            const empName = nameMap[log.user_id] || "Unknown Staff";
            const tIn = log.time_in ? new Date(log.time_in).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', hour12: true}) : '--:--';
            const tOut = log.time_out ? new Date(log.time_out).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', hour12: true}) : '--:--';

            return `
                <tr>
                    <td style="font-weight:700; color:#1e293b;">${empName}</td>
                    <td>${log.date}</td>
                    <td>${tIn}</td>
                    <td>${tOut}</td>
                    <td><span class="status-tag ${statusClass}">${log.status}</span></td>
                    <td>${log.hours_worked || '0.00'} hrs</td>
                </tr>
            `;
        }).join('');
    } else {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">No records found matching this status.</td></tr>`;
    }
}


async function updateSummaryStats(filterMonth = null) {
    let query = _supabase.from('attendance').select('*');
    if (currentRole === 'User') query = query.eq('user_id', actualUserId);
    if (filterMonth) query = query.gte('date', `${filterMonth}-01`).lt('date', getNextMonthFirstDay(filterMonth));

    const { data } = await query;
    if (data) {
        document.getElementById('sum-present').innerText = data.length;
        document.getElementById('sum-late').innerText = data.filter(d => d.status && d.status.includes('Late')).length;
        const totalHrs = data.reduce((sum, d) => sum + (parseFloat(d.hours_worked) || 0), 0);
        document.getElementById('sum-hours').innerText = totalHrs.toFixed(1) + "h";
    }
}


async function loadNotifications() {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');
    if (!list) return;

    const { data, error } = await _supabase
        .from('notifications')
        .select('*')
        .eq('receiver_id', actualUserId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error || !data || data.length === 0) {
        list.innerHTML = `<div class="notif-empty">No new notifications</div>`;
        if (badge) badge.style.display = 'none';
        return;
    }

    const unreadCount = data.filter(n => !n.is_read).length;
    if (badge) {
        badge.innerText = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    list.innerHTML = data.map(n => `
        <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markAsRead('${n.id}')">
            <div class="notif-content">
                <p class="notif-text">${n.message}</p>
                <small class="notif-time">${new Date(n.created_at).toLocaleDateString()}</small>
            </div>
        </div>
    `).join('');
}

window.markAsRead = async (id) => {
    await _supabase.from('notifications').update({ is_read: true }).eq('id', id);
    loadNotifications();
};

window.toggleNotifPanel = () => {
    const panel = document.getElementById('notifPanel');
    if (panel) panel.classList.toggle('show');
};


function setupRealtimeSubscriptions() {
   
    _supabase.channel('notif-channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `receiver_id=eq.${actualUserId}` }, () => {
        loadNotifications();
    })
    .subscribe();

    _supabase.channel('recruitment-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        updateRecruitmentBadge();
    })
    .subscribe();
}

async function updateRecruitmentBadge() {
    if (currentRole === 'User') return;
    const { count } = await _supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
    const badge = document.getElementById('badge-count');
    if (badge) {
        badge.innerText = count || 0;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}


async function handleTimeIn() {
    const now = new Date();
    const isLate = (now.getHours() > 9) || (now.getHours() === 9 && now.getMinutes() > 0);
    const { error } = await _supabase.from('attendance').insert([{
        user_id: actualUserId,
        date: now.toISOString().split('T')[0],
        time_in: now.toISOString(),
        status: isLate ? 'Late' : 'On Time'
    }]);
    if (error) alert(error.message); else location.reload();
}

async function handleTimeOut() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const { data: record } = await _supabase.from('attendance').select('*').eq('user_id', actualUserId).eq('date', today).single();
    if (record) {
        if (!confirm("Confirm Time Out?")) return;
        const hours = ((now - new Date(record.time_in)) / (1000 * 60 * 60)).toFixed(2);
        const { error } = await _supabase.from('attendance').update({ time_out: now.toISOString(), hours_worked: hours }).eq('id', record.id);
        if (error) alert(error.message); else location.reload();
    }
}

async function checkTodayStatus(userId) {
    const today = new Date().toISOString().split('T')[0];
    const { data: record } = await _supabase.from('attendance').select('*').eq('user_id', userId).eq('date', today).single();
    const btnIn = document.getElementById('btn-time-in');
    const btnOut = document.getElementById('btn-time-out');
    const msg = document.getElementById('att-status-msg');
    
    if (!record) {
        if (btnIn) btnIn.disabled = false;
        if (btnOut) btnOut.disabled = true;
    } else if (record.time_in && !record.time_out) {
        if (btnIn) btnIn.disabled = true;
        if (btnOut) btnOut.disabled = false;
        if (msg) msg.innerText = "Shift in progress...";
    } else {
        if (btnIn) btnIn.disabled = true;
        if (btnOut) btnOut.disabled = true;
        if (msg) msg.innerText = "Workday completed.";
    }
}

function startLiveClock() {
    setInterval(() => {
        const now = new Date();
        const timeEl = document.getElementById('live-time');
        const dateEl = document.getElementById('live-date');
        if (timeEl) timeEl.innerText = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        if (dateEl) dateEl.innerText = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }, 1000);
}

function setupFilterListener() {
    const monthPicker = document.getElementById('filterMonth');
    const statusPicker = document.getElementById('filterStatus'); // New listener

    if (monthPicker) {
        monthPicker.addEventListener('change', () => {
            const mVal = monthPicker.value;
            const sVal = statusPicker ? statusPicker.value : 'All';
            loadAttendanceLogs(mVal, sVal);
            updateSummaryStats(mVal); 
        });
    }

    if (statusPicker) {
        statusPicker.addEventListener('change', () => {
            const mVal = monthPicker ? monthPicker.value : null;
            const sVal = statusPicker.value;
            loadAttendanceLogs(mVal, sVal);
        });
    }
}

function getNextMonthFirstDay(filterMonth) {
    let [year, month] = filterMonth.split('-').map(Number);
    month++; if (month > 12) { month = 1; year++; }
    return `${year}-${month.toString().padStart(2, '0')}-01`;
}

window.handleSignOut = async () => { await _supabase.auth.signOut(); window.location.href = "index.html"; };
window.toggleDropdown = () => document.getElementById('profileMenu')?.classList.toggle('show');

document.addEventListener('DOMContentLoaded', initAttendance);