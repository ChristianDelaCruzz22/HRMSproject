
const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const ROLE_NAMES = { 'SuperAdmin': 'CEO', 'Admin': 'Manager', 'User': 'Employee' };
let currentRole = 'User'; 
let actualUserId = null;
let isActualSuperAdmin = false; 
let calendarDate = new Date(); 
let allSchedules = []; 
let globalNameMap = {}; 

async function initSchedule() {
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
        setupFilterListener();
        setupSearchListener(); 

        await updateAnnouncementBadge(); 
        updateRecruitmentBadge();
        
        await loadSchedules(); 
        await loadNotifications();
        setupRealtimeSubscriptions();
        

        if (currentRole === 'Admin' || currentRole === 'SuperAdmin') {
            await loadEmployeeDropdown();
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

window.previewRole = function(selectedRole) {
    currentRole = selectedRole; 
    applyRolePermissions(selectedRole); 
    const roleDisplay = document.getElementById('userRole');
    if (roleDisplay) roleDisplay.innerText = ROLE_NAMES[selectedRole] || selectedRole;

    loadSchedules();
    if (selectedRole === 'User') switchTab('calendar');
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

    const headerActions = document.getElementById('headerActions');
    if (isAdmin && headerActions) {
        const oldBtn = document.getElementById('btn-manage-shifts');
        if (oldBtn) oldBtn.remove();

        const manageBtn = document.createElement('button');
        manageBtn.id = 'btn-manage-shifts';
        manageBtn.innerHTML = `<i class="fa fa-plus-circle"></i> Manage Shifts`;
        manageBtn.className = 'btn-primary'; 
        manageBtn.onclick = () => switchTab('management'); 
        headerActions.prepend(manageBtn);
    }
    updateRecruitmentBadge();
}

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.style.display = 'block';
        if (tabName === 'management') targetTab.classList.add('full-wide-view');
    }
    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.innerText.toLowerCase().includes(tabName.toLowerCase()));
    if (btn) btn.classList.add('active');
};


function renderCalendar(schedules) {
    const calendarBody = document.getElementById('calendar-body');
    const monthDisplay = document.getElementById('currentMonthYear');
    if (!calendarBody) return;

    calendarBody.innerHTML = '';
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    monthDisplay.innerText = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty-cell';
        calendarBody.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const dayShifts = schedules.filter(s => s.shift_date === dateStr);
        dayDiv.innerHTML = `<div class="day-header">${day}</div>`;
        
        const shiftContainer = document.createElement('div');
        shiftContainer.className = 'day-shifts-container';

        dayShifts.forEach(shift => {
            const pill = document.createElement('div');
            pill.className = `shift-pill ${shift.status?.toLowerCase() || 'scheduled'}`;
            pill.innerHTML = `<span>${shift.start_time?.slice(0,5)}</span> <i class="fa fa-clock-o"></i>`;
            shiftContainer.appendChild(pill);
        });

        dayDiv.appendChild(shiftContainer);
        calendarBody.appendChild(dayDiv);
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
            .in('audience', ['Everyone', currentRole]) 
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
        console.error("Badge Error:", err.message);
    }
}


async function loadSchedules(filterMonth = null) {
    if (!filterMonth) {
        filterMonth = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}`;
    }

    let query = _supabase.from('schedules').select('*');
    if (currentRole === 'User') query = query.eq('user_id', actualUserId);
    
    query = query.gte('shift_date', `${filterMonth}-01`)
                 .lt('shift_date', getNextMonthFirstDay(filterMonth));

    const { data: schedules, error } = await query.order('shift_date', { ascending: true });
    if (error) return;

    const { data: staff } = await _supabase.from('employees').select('user_id, first_name, last_name');
    globalNameMap = {};
    if (staff) staff.forEach(s => globalNameMap[s.user_id] = `${s.first_name} ${s.last_name || ""}`);

    allSchedules = schedules || []; 
    updateStats(allSchedules, staff?.length || 0);
    updateActiveShift(allSchedules); 
    renderCalendar(allSchedules);
    renderTable(allSchedules);
}

function setupSearchListener() {
    const searchInput = document.getElementById('tableSearch'); 
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allSchedules.filter(s => {
                const empName = (globalNameMap[s.user_id] || "").toLowerCase();
                return empName.includes(term);
            });
            renderTable(filtered);
        });
    }
}

function renderTable(schedules) {
    const grid = document.getElementById('schedule-grid');
    if (!grid) return;
    if (schedules && schedules.length > 0) {
        grid.innerHTML = `
            <table class="dashboard-table">
                <thead><tr><th>Employee</th><th>Date</th><th>Shift</th><th>Status</th></tr></thead>
                <tbody>
                    ${schedules.map(s => `
                        <tr>
                            <td><strong>${globalNameMap[s.user_id] || 'Employee'}</strong></td>
                            <td>${s.shift_date}</td>
                            <td>${s.start_time?.slice(0,5)} - ${s.end_time?.slice(0,5)}</td>
                            <td><span class="status-badge ${s.status?.toLowerCase()}">${s.status || 'Active'}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    } else {
        grid.innerHTML = `<div class="notif-empty" style="padding:40px;">No matching schedules found.</div>`;
    }
}


function updateActiveShift(schedules) {
    const statusEl = document.getElementById('active-shift-status');
    const actionContainer = document.getElementById('shift-action-container');
    const activeNowEl = document.getElementById('stat-active-now'); 

    const now = new Date();
    const todayStr = now.toLocaleDateString('sv-SE'); 
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    
    const currentlyWorkingList = schedules.filter(s => {
        if (s.shift_date !== todayStr || s.status === 'Completed') return false;
        const start = timeToMinutes(s.start_time);
        const end = timeToMinutes(s.end_time);
        return currentMinutes >= start && currentMinutes <= end;
    });
    if (activeNowEl) activeNowEl.innerText = currentlyWorkingList.length;

    
    if (statusEl && actionContainer) {
        const myShift = schedules.find(s => s.user_id === actualUserId && s.shift_date === todayStr);
        
        
        actionContainer.innerHTML = '';

        if (myShift) {
            if (myShift.status === 'Completed') {
                statusEl.innerHTML = `<span class="badge-active" >SHIFT FINISHED</span>`;
                return;
            }

            const start = timeToMinutes(myShift.start_time);
            const end = timeToMinutes(myShift.end_time);
            
            if (currentMinutes >= start && currentMinutes <= end) {
                statusEl.innerHTML = `<span class="badge-active">ACTIVE NOW</span> until ${myShift.end_time.slice(0,5)}`;
                
               
                actionContainer.innerHTML = `
                    <button onclick="finishShift('${myShift.id}')" class="btn-primary" style="background:#10b981; padding: 5px 15px; font-size: 12px;">
                        <i class="fa fa-check"></i> Finish Shift
                    </button>`;
            } else if (currentMinutes < start) {
                statusEl.innerHTML = `<span class="badge-waiting">UPCOMING</span> starts at ${myShift.start_time.slice(0,5)}`;
            } else {
                statusEl.innerHTML = `<span class="badge-off">SHIFT EXPIRED</span>`;
               
                actionContainer.innerHTML = `<button onclick="finishShift('${myShift.id}')" class="btn-outline">Mark as Finished</button>`;
            }
        } else {
            statusEl.innerHTML = `<span class="badge-off">NO SHIFT TODAY</span>`;
        }
    }
}


window.finishShift = async function(shiftId) {
    if (!confirm("Are you sure you want to finish your shift for today?")) return;

    const { error } = await _supabase
        .from('schedules')
        .update({ status: 'Completed' })
        .eq('id', shiftId);

    if (error) {
        alert("Error finishing shift: " + error.message);
    } else {
        alert("Shift marked as Completed!");
        
        await loadSchedules();
    }
};

function timeToMinutes(t) {
    if (!t) return 0;
    const parts = t.split(':').map(Number);
    return (parts[0] * 60) + (parts[1] || 0);
}


async function loadEmployeeDropdown() {
    const { data: employees } = await _supabase.from('employees').select('user_id, first_name, last_name').eq('status', 'Approved');
    const select = document.getElementById('assignEmployee');
    if (select && employees) {
        select.innerHTML = employees.map(e => `<option value="${e.user_id}">${e.first_name} ${e.last_name}</option>`).join('');
    }
}

window.saveNewShift = async function() {
    const userId = document.getElementById('assignEmployee').value;
    const dateVal = document.getElementById('assignDate').value;
    const startTime = document.getElementById('assignStart').value;
    const endTime = document.getElementById('assignEnd').value;

    if (!dateVal || !startTime || !endTime) { alert("Please fill in all details."); return; }

    try {
        
        const { error: shiftError } = await _supabase.from('schedules').insert([{ 
            user_id: userId, 
            shift_date: dateVal, 
            start_time: startTime, 
            end_time: endTime, 
            status: 'Active',
            shift_name: 'Standard Shift' 
        }]);

        if (shiftError) {
            console.error("Shift Error:", shiftError);
            alert("Database Error: " + shiftError.message);
            return;
        }

      
        const msg = `New shift assigned: ${dateVal} from ${startTime.slice(0,5)} to ${endTime.slice(0,5)}`;
        
        const { error: notifError } = await _supabase.from('notifications').insert([{
            receiver_id: userId,
            sender_id: actualUserId, 
            message: msg,
            is_read: false,
            type: 'shift_assignment',
            created_at: new Date().toISOString()
        }]);

        if (notifError) {
            console.warn("Notification failed, but shift was saved:", notifError.message);
        }

        
        alert("Success! Shift Assigned and Employee Notified.");
        
        
        await loadSchedules(); 
        switchTab('calendar');

    } catch (err) {
        console.error("Unexpected Script Error:", err);
        alert("A script error occurred. Check the console for details.");
    }
};




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

    if (error) return;

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

async function updateRecruitmentBadge() {
    if (currentRole === 'User') return;
    const { count } = await _supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
    const badge = document.getElementById('badge-count');
    if (badge) {
        badge.innerText = count || 0;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}


function updateStats(schedules, totalEmp) {
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const scheduledToday = schedules.filter(s => s.shift_date === todayStr).length;
    
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    let weekends = 0;
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
        const day = new Date(year, month, d).getDay();
        if (day === 0 || day === 6) weekends++;
    }

    if(document.getElementById('stat-scheduled-today')) document.getElementById('stat-scheduled-today').innerText = scheduledToday;
    if(document.getElementById('stat-total-employees')) document.getElementById('stat-total-employees').innerText = totalEmp;
    if(document.getElementById('weekend-rest-count')) document.getElementById('weekend-rest-count').innerText = weekends;
}

window.changeMonth = async function(step) {
    calendarDate.setMonth(calendarDate.getMonth() + step);
    const filterVal = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth()+1).padStart(2, '0')}`;
    const filterInput = document.getElementById('filterMonth');
    if (filterInput) filterInput.value = filterVal;
    await loadSchedules(filterVal);
};

function setupFilterListener() {
    const monthFilter = document.getElementById('filterMonth');
    const statusFilter = document.getElementById('scheduleStatusFilter'); 

    if (monthFilter) {
        monthFilter.addEventListener('change', (e) => {
            const [y, m] = e.target.value.split('-');
            calendarDate = new Date(y, m - 1, 1);
            loadSchedules(e.target.value);
        });
    }

    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            applyAllFilters();
        });
    }
}



function showAnnBadge() {
    const badge = document.getElementById('ann-badge-nav');
    if (badge) {
        badge.style.display = 'flex';
    }
}


window.clearAnnBadge = () => {
    const badge = document.getElementById('ann-badge-nav');
    if (badge) {
        badge.style.display = 'none';
    }
};

function applyAllFilters() {
    const searchTerm = document.getElementById('tableSearch')?.value.toLowerCase() || "";
    const statusType = document.getElementById('scheduleStatusFilter')?.value || "All";
    const now = new Date();

    const filtered = allSchedules.filter(s => {
        const empName = (globalNameMap[s.user_id] || "").toLowerCase();
        const matchesSearch = empName.includes(searchTerm);
        
        const shiftEnd = new Date(`${s.shift_date}T${s.end_time}`);
        const isDone = now > shiftEnd || s.status === 'Completed';

        let matchesStatus = true;
        if (statusType === 'Active') matchesStatus = !isDone;
        if (statusType === 'Completed') matchesStatus = isDone;

        return matchesSearch && matchesStatus;
    });

    renderTable(filtered);
}

function getNextMonthFirstDay(filterMonth) {
    let [year, month] = filterMonth.split('-').map(Number);
    month++; if (month > 12) { month = 1; year++; }
    return `${year}-${month.toString().padStart(2, '0')}-01`;
}

function setupRealtimeSubscriptions() {
    _supabase
        .channel('hr-notifs')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'notifications', 
            filter: `receiver_id=eq.${actualUserId}` 
        }, () => {
            loadNotifications();
        })
        .subscribe();

        _supabase
    .channel('announcement-updates')
    .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'announcements' }, 
        () => {
            console.log("New announcement detected! Updating badge...");
            updateAnnouncementBadge();
        }
    )
    .subscribe();   
}

window.handleSignOut = async () => { await _supabase.auth.signOut(); window.location.href = "index.html"; };
window.toggleDropdown = () => document.getElementById('profileMenu').classList.toggle('show');
window.toggleNotifPanel = () => document.getElementById('notifPanel').classList.toggle('show');

document.addEventListener('DOMContentLoaded', initSchedule);