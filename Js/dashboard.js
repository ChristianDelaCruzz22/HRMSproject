const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const ROLE_NAMES = {
    'SuperAdmin': 'CEO',
    'Admin': 'Manager',
    'User': 'Employee'
};

let currentRole = 'User'; 
let actualUserRole = 'User'; 
let attendanceChart, deptChart;


async function initDashboard() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) { 
        window.location.href = "index.html"; 
        return; 
    }

    const { data: profile, error } = await _supabase
        .from('applications')
        .select('first_name, last_name, role, status, avatar_url, user_id')
        .eq('user_id', session.user.id)
        .single();

    if (profile && profile.status === 'Approved') {
        const fName = profile.first_name || "User";
        const lName = profile.last_name || "";
        document.getElementById('userName').innerText = `${fName} ${lName}`;
        
       
        const thumbEl = document.getElementById('userInitials');
        if (profile.avatar_url) {
            thumbEl.innerText = ""; 
            thumbEl.style.backgroundImage = `url('${profile.avatar_url}')`;
            thumbEl.style.backgroundSize = 'cover';
            thumbEl.style.backgroundPosition = 'center';
        } else {
            thumbEl.innerText = (fName[0] + (lName[0] || "")).toUpperCase();
            thumbEl.style.backgroundImage = 'none';
        }

        actualUserRole = profile.role || 'User';
        currentRole = actualUserRole;
        
        applyRoleUI(currentRole, session.user.id);

        if (actualUserRole === 'SuperAdmin') {
            const tools = document.getElementById('superAdminTools');
            if (tools) tools.style.display = 'flex';
        }

        loadNotifications();
    } else {
        await _supabase.auth.signOut();
        window.location.href = "index.html";
    }
}


async function getFinancialStats() {
    const now = new Date();
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

   
    const { data: payrollData } = await _supabase
        .from('payroll')
        .select('amount')
        .gte('payment_date', firstDayMonth);
    
    const totalPayroll = payrollData?.reduce((sum, item) => sum + item.amount, 0) || 0;

    
    const { count: currentCount } = await _supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Approved');

    const { count: lastMonthCount } = await _supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Approved')
        .lt('created_at', firstDayMonth);

    let growthStr = "+0%";
    if (lastMonthCount > 0) {
        const diff = ((currentCount - lastMonthCount) / lastMonthCount) * 100;
        growthStr = (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
    }

    return {
        payroll: "₱" + (totalPayroll / 1000).toFixed(1) + "k",
        growth: growthStr
    };
}


async function applyRoleUI(role, userId) {
    const isAdmin = (role === 'Admin' || role === 'SuperAdmin');
    const isSuper = (role === 'SuperAdmin');

    document.querySelectorAll('.auth-admin').forEach(el => el.style.display = isAdmin ? 'block' : 'none');
    document.querySelectorAll('.auth-super').forEach(el => el.style.display = isSuper ? 'block' : 'none');
    
    const roleDisplay = document.getElementById('userRole');
    if (roleDisplay) roleDisplay.innerText = ROLE_NAMES[role] || role;

    await renderStats(role, userId);
    renderQuickActions(role);
    renderContentLayout(role);
    fetchRecentActivity(role, userId);
    initCharts(role);
}

window.previewRole = function(roleValue) {
    currentRole = roleValue;
    applyRoleUI(roleValue, null); 
};

async function renderStats(role, userId) {
    const container = document.getElementById('stats-container');
    if (!container) return;

    if (role === 'SuperAdmin') {
        const { count: emps } = await _supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'Approved');
        const { count: depts } = await _supabase.from('departments').select('*', { count: 'exact', head: true });
        const { count: alerts } = await _supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
        const financials = await getFinancialStats(); // Real Payroll & Growth

        container.innerHTML = `
            <div class="stat-card-new"><div class="icon-box blue"><i class="fa fa-users"></i></div><div class="details"><span>Total Employees</span><h2>${emps || 0}</h2></div></div>
            <div class="stat-card-new"><div class="icon-box purple"><i class="fa fa-building"></i></div><div class="details"><span>Departments</span><h2>${depts || 0}</h2></div></div>
            <div class="stat-card-new"><div class="icon-box green"><i class="fa fa-money"></i></div><div class="details"><span>Payroll MTD</span><h2>${financials.payroll}</h2></div></div>
            <div class="stat-card-new"><div class="icon-box orange"><i class="fa fa-line-chart"></i></div><div class="details"><span>Growth</span><h2>${financials.growth}</h2></div></div>
            <div class="stat-card-new"><div class="icon-box red"><i class="fa fa-warning"></i></div><div class="details"><span>Alerts</span><h2>${alerts || 0}</h2></div></div>
        `;
    } else if (role === 'Admin') {
        const { count: emps } = await _supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'Approved');
        const { count: alerts } = await _supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
        
        container.innerHTML = `
            <div class="stat-card-new"><div class="icon-box blue"><i class="fa fa-users"></i></div><div class="details"><span>Team Size</span><h2>${emps || 0}</h2></div></div>
            <div class="stat-card-new"><div class="icon-box green"><i class="fa fa-check"></i></div><div class="details"><span>Present Today</span><h2>12</h2></div></div>
            <div class="stat-card-new"><div class="icon-box purple"><i class="fa fa-envelope-open"></i></div><div class="details"><span>Pending Leaves</span><h2>${alerts || 0}</h2></div></div>
        `;
    } else {
        // Dynamic Employee Stats
        const { data: att } = await _supabase.from('attendance').select('status').eq('user_id', userId);
        const { data: bal } = await _supabase.from('leave_balances').select('remaining').eq('user_id', userId).single();
        const pct = att?.length ? Math.round((att.filter(a => a.status === 'On Time').length / att.length) * 100) : 0;

        container.innerHTML = `
            <div class="stat-card-new"><div class="icon-box blue"><i class="fa fa-calendar-check-o"></i></div><div class="details"><span>Attendance</span><h2>${pct}%</h2></div></div>
            <div class="stat-card-new"><div class="icon-box purple"><i class="fa fa-plane"></i></div><div class="details"><span>Leave Balance</span><h2>${bal?.remaining || 0} Days</h2></div></div>
        `;
    }
}


async function fetchRecentActivity(role, userId) {
    const body = document.getElementById('activity-body');
    if (!body) return;

    let query = _supabase.from('attendance').select('*, applications(first_name, last_name)').order('created_at', { ascending: false }).limit(5);
    if (role === 'User' && userId) query = query.eq('user_id', userId);
    
    const { data } = await query;
    body.innerHTML = (!data || data.length === 0) ? 
        `<tr><td colspan="4" style="text-align:center; padding:20px;">No recent activity found.</td></tr>` :
        data.map(item => `
            <tr>
                <td>${item.applications?.first_name || 'User'}</td>
                <td>Clock In</td>
                <td><span class="badge ${item.status.toLowerCase()}">${item.status}</span></td>
                <td>${new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            </tr>
        `).join('');
}

function initCharts(role) {
    const chartSection = document.getElementById('distribution-container');
    if (chartSection) chartSection.style.display = (role === 'User') ? 'none' : 'block';

    const ctxAtt = document.getElementById('attendanceChart')?.getContext('2d');
    if (ctxAtt) {
        if (attendanceChart) attendanceChart.destroy();
        attendanceChart = new Chart(ctxAtt, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                datasets: [{ label: 'Attendance %', data: [95, 98, 92, 97, 99], borderColor: '#3b82f6', tension: 0.4 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const ctxDept = document.getElementById('deptChart')?.getContext('2d');
    if (ctxDept && role !== 'User') {
        if (deptChart) deptChart.destroy();
        deptChart = new Chart(ctxDept, {
            type: 'doughnut',
            data: {
                labels: ['IT', 'HR', 'Sales', 'Admin'],
                datasets: [{ data: [40, 20, 30, 10], backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'] }]
            }
        });
    }
}


function renderQuickActions(role) {
    const list = document.getElementById('actions-list');
    if (!list) return;

    const actions = (role === 'User') ? [
        { label: 'Time In / Out', icon: 'fa-clock-o', class: 'primary', fn: 'handleTimeAction()' },
        { label: 'File Leave', icon: 'fa-calendar-plus-o', class: '', fn: "window.location.href='leave.html'" },
        { label: 'Profile', icon: 'fa-user', class: '', fn: "window.location.href='settings.html'" }
    ] : [
        { label: 'Add Employee', icon: 'fa-user-plus', class: 'primary', fn: "window.location.href='directory.html'" },
        { label: 'Reports', icon: 'fa-file-pdf-o', class: '', fn: "window.location.href='reports.html'" },
        { label: 'Departments', icon: 'fa-sitemap', class: '', fn: "window.location.href='departments.html'" }
    ];

    list.innerHTML = actions.map(a => `
        <button class="action-btn ${a.class}" onclick="${a.fn}">
            <i class="fa ${a.icon}"></i> ${a.label}
        </button>
    `).join('');
}

function renderContentLayout(role) {
    const title = document.getElementById('table-title');
    const head = document.getElementById('table-head-row');
    if (!title || !head) return;

    if (role === 'User') {
        title.innerHTML = `<i class="fa fa-history"></i> My Attendance Logs`;
        head.innerHTML = `<th>Date</th><th>Type</th><th>Status</th><th>Time</th>`;
    } else {
        title.innerHTML = `<i class="fa fa-history"></i> Recent Activity`;
        head.innerHTML = `<th>Employee</th><th>Action</th><th>Status</th><th>Time</th>`;
    }
}

async function loadNotifications() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;
    const { data } = await _supabase.from('notifications').select('*').or(`receiver_id.eq.${user.id},type.eq.broadcast`);
    const unread = data?.filter(n => !n.is_read).length || 0;
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.innerText = unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }
}

window.handleSignOut = async function() {
    await _supabase.auth.signOut();
    window.location.href = "index.html";
};

window.toggleDropdown = () => document.getElementById('profileMenu')?.classList.toggle('show');
window.toggleNotifPanel = () => document.getElementById('notifPanel')?.classList.toggle('show');

document.addEventListener('DOMContentLoaded', initDashboard);