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
let _lastProfileData = null; 

let workforceChart = null;

async function initDashboard() {
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (!session) { 
        window.location.href = "index.html"; 
        return; 
    }

    const { data: profile, error } = await _supabase
        .from('employee')
        .select(`
            first_name, 
            last_name, 
            role, 
            status, 
            avatar_url, 
            user_id,
            created_at,
            job (
                position,
                department (
                    department_name
                )
            )
        `)
        .eq('user_id', session.user.id)
        .single();

    if (profile && (profile.status === 'Approved' || profile.status === 'online' || profile.status === 'offline')) {
        
        _lastProfileData = profile;

        const fName = profile.first_name || "Employee";
        const lName = profile.last_name || "";
        const role = profile.role || 'User';

        
        document.querySelectorAll('#userName').forEach(el => {
            el.innerText = `${fName} ${lName}`;
        });

        const userRoleEl = document.getElementById('userRole'); 
        if (userRoleEl) {
            userRoleEl.innerText = ROLE_NAMES[role] || role; 
        }

        const switcher = document.getElementById('superAdminTools');
        if (role === 'SuperAdmin') {
            if (switcher) {
                switcher.style.setProperty('display', 'flex', 'important');
            }
        } else {
            if (switcher) switcher.style.display = 'none';
        }

        
            document.querySelectorAll('#userName').forEach(el => {
                el.innerText = `${fName} ${lName}`;
            });

        
            const roleTag = document.getElementById('role-tag');
            if (roleTag) {
                const roleName = profile.role || 'User';
                roleTag.innerText = roleName.toUpperCase();
            }

            
            const deptTag = document.getElementById('department-tag');
            if (deptTag) {
                
                const deptName = profile.job?.department?.department_name || "General";
                deptTag.innerText = deptName.toUpperCase();
            }

            
            const roleBadge = document.getElementById('role-badge');
            if (roleBadge) {
                roleBadge.style.background = "#eff6ff"; 
                roleBadge.style.color = "#3b82f6";
            }

            const deptBadge = document.getElementById('department-badge');
            if (deptBadge) {
                deptBadge.style.background = "#f5f3ff"; 
                deptBadge.style.color = "#7c3aed";
            }

            
            const userRoleLabel = document.getElementById('userRole');
            if (userRoleLabel) {
                userRoleLabel.innerText = ROLE_NAMES[role] || role;
            }

       
        const welcomeMsg = document.getElementById('welcome-message');
        const dateDisplay = document.getElementById('dashboard-date');
        
        if (welcomeMsg) {
            const hours = new Date().getHours();
            let greeting = "Good Morning";
            if (hours >= 12 && hours < 17) greeting = "Good Afternoon";
            if (hours >= 17) greeting = "Good Evening";
            welcomeMsg.innerHTML = `${greeting}, <span>${fName} ${lName}</span>!`;
        }

        if (dateDisplay) {
            const now = new Date();
            const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
            dateDisplay.innerText = now.toLocaleDateString('en-US', options);
        }

      
        const thumbEl = document.getElementById('userInitials');
        if (thumbEl) {
            if (profile.avatar_url) {
                thumbEl.innerText = ""; 
                thumbEl.style.backgroundImage = `url('${profile.avatar_url}')`;
                thumbEl.style.backgroundSize = 'cover';
            } else {
                thumbEl.innerText = (fName[0] + (lName[0] || "")).toUpperCase();
            }
        }

    
        document.querySelectorAll('.nav-item, .nav-group-label').forEach(el => {
            el.removeAttribute('hidden');
            el.style.display = 'block';
        });

     
        const adminSection = document.querySelector('.auth-admin');
        const superSection = document.querySelector('.auth-super');

        if (adminSection) adminSection.setAttribute('hidden', 'true');
        if (superSection) superSection.setAttribute('hidden', 'true');

        
        if (role === 'SuperAdmin' || role === 'Admin') {
            if (adminSection) {
                adminSection.removeAttribute('hidden');
                adminSection.style.display = 'block';

                
                const allowedLinks = [
                    'employee-management.html', 
                    'directory.html', 
                    'departments.html', 
                    'recruitment.html'
                ];

                adminSection.querySelectorAll('.nav-item').forEach(item => {
                    const link = item.querySelector('a')?.getAttribute('href');
                    if (allowedLinks.includes(link)) {
                        item.removeAttribute('hidden');
                        item.style.display = 'block';
                    } else {
                        // Keep things like "Training" hidden
                        item.setAttribute('hidden', 'true');
                        item.style.display = 'none';
                    }
                });
            }
        }

        try {
            actualUserRole = role;
            currentRole = role;
            
            
            const switcher = document.getElementById('superAdminTools');
            if (role === 'SuperAdmin' && switcher) switcher.style.display = 'flex';

            await applyRoleUI(role, profile);
            setupRecruitmentBadgeRealtime();
            updateSidebarVisibility(profile.role);
            loadNotifications();
        } catch (e) {
            console.error("Content loading failed, but UI is updated:", e);
        }

    } else {
        if (error || !profile || profile.status === 'Pending') {
            await _supabase.auth.signOut();
            window.location.href = "index.html";
        }
    }
}

function updateUserHeader(profile) {
    const fName = profile.first_name || "User";
    const lName = profile.last_name || "";
    document.getElementById('userName').innerText = `${fName} ${lName}`;
    
    const thumbEl = document.getElementById('userInitials');
    if (profile.avatar_url) {
        thumbEl.innerText = ""; 
        thumbEl.style.backgroundImage = `url('${profile.avatar_url}')`;
    } else {
        thumbEl.innerText = (fName[0] + (lName[0] || "")).toUpperCase();
        thumbEl.style.backgroundImage = 'none';
    }
}



function setupRecruitmentBadgeRealtime() {
   
    _supabase
        .channel('public:employee')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employee' }, () => {
            updateRecruitmentBadge();
        })
        .subscribe();

    updateRecruitmentBadge(); 
}

async function updateRecruitmentBadge() {
    
    if (currentRole === 'User') return;

    const { count, error } = await _supabase
        .from('employee')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

    const badge = document.getElementById('badge-count');
    if (badge) {
        if (count > 0) {
            badge.innerText = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

async function getFinancialStats() {
    const now = new Date();
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: payrollData } = await _supabase
        .from('payroll')
        .select('amount')
        .gte('payment_date', firstDayMonth);
    
    const totalPayroll = payrollData?.reduce((sum, item) => sum + item.amount, 0) || 0;

    const { count: currentCount } = await _supabase
        .from('employee')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Approved');

    const { count: lastMonthCount } = await _supabase
        .from('employee')
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

async function applyRoleUI(role, profile) {
    const analyticsPanel = document.getElementById('analytics-panel');
    const sideChartPanel = document.getElementById('side-chart-panel');
    const tableTitle = document.getElementById('table-title');

   
    if (analyticsPanel) analyticsPanel.style.display = 'block';
    if (sideChartPanel) sideChartPanel.style.display = 'block';

    
    if (role === 'SuperAdmin') {
        
        renderStats('SuperAdmin', profile);
        renderQuickActions('SuperAdmin');
        initGrowthChart(); 
        updateChartData();
        initWorkforceChart('SuperAdmin');
        renderMainTable('SuperAdmin');
        if (tableTitle) tableTitle.innerHTML = '<i class="fa fa-list-alt"></i> Company-wide Activity';

    } else if (role === 'Admin') {
        
        renderStats('Admin', profile);
        renderQuickActions('Admin');
        initWorkforceChart('Admin');
        renderMainTable('Admin');
        if (tableTitle) tableTitle.innerHTML = '<i class="fa fa-list-alt"></i> Department Activity';
       
        if (analyticsPanel) analyticsPanel.style.display = 'none';

    } else {
      
        renderStats('User', profile);
        renderQuickActions('User');
        
        if (analyticsPanel) analyticsPanel.style.display = 'none';
        if (sideChartPanel) sideChartPanel.style.display = 'none';
        if (tableTitle) tableTitle.innerHTML = '<i class="fa fa-history"></i> My Career History';
        renderPersonalTable(profile.user_id); 
    }
}

async function renderPersonalTable() {
    const body = document.getElementById('activity-body');
    if (!body) return;

    
    const title = document.getElementById('table-title');
    if (title) title.innerHTML = `<i class="fa fa-users"></i> My Colleagues`;

    
    const { data: employees, error } = await _supabase
        .from('employee')
        .select('first_name, last_name, status, created_at, avatar_url, role')
        .eq('status', 'Approved') 
        .order('first_name', { ascending: true });

        allActivities = employees || [];
        displayActivities(allActivities);

    if (error) {
        console.error("Error fetching colleagues:", error);
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Error loading team list.</td></tr>';
        return;
    }

    if (!employees || employees.length === 0) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No colleagues found.</td></tr>';
        return;
    }

    // 3. Map through all employees to create the table rows
    body.innerHTML = employees.map(emp => {
        const initials = `${emp.first_name[0]}${emp.last_name ? emp.last_name[0] : ''}`.toUpperCase();
        
        const avatarUI = emp.avatar_url 
            ? `<img src="${emp.avatar_url}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">`
            : `<div style="width:30px; height:30px; border-radius:50%; background:#e2e8f0; color:#475569; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600;">${initials}</div>`;

        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${avatarUI}
                        ${emp.first_name} ${emp.last_name || ''}
                    </div>
                </td>
                <td>Team Member</td>
                <td><span class="status-badge ${emp.status.toLowerCase()}">${emp.status}</span></td>
                <td>${new Date(emp.created_at).toLocaleDateString()}</td>
            </tr>
        `;
    }).join('');
}



function initGrowthChart() {
    const ctx = document.getElementById('mainChart')?.getContext('2d');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Hiring Trend',
                data: [5, 10, 8, 15, 20, 24],
                borderColor: '#3b82f6',
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

async function renderPersonalCards(profile) {
    const container = document.getElementById('stats-container');
    if (!container) return;

    const position = profile.job?.position || "Not Assigned";
    const department = profile.job?.department?.department_name || "General";
    const status = profile.status || "Active";
    
    
    const hiredDate = new Date(profile.created_at).toLocaleDateString();

    container.innerHTML = `
        <div class="stat-card-new blue-var">
            <div class="stat-details"><span>Current Position</span><h2>${position}</h2></div>
            <div class="stat-icon"><i class="fa fa-briefcase"></i></div>
        </div>
        <div class="stat-card-new purple-var">
            <div class="stat-details"><span>Department</span><h2>${department}</h2></div>
            <div class="stat-icon"><i class="fa fa-building"></i></div>
        </div>
        <div class="stat-card-new green-var">
            <div class="stat-details"><span>Status</span><h2>${status}</h2></div>
            <div class="stat-icon"><i class="fa fa-check-circle"></i></div>
        </div>
        <div class="stat-card-new orange-var">
            <div class="stat-details"><span>Date Hired</span><h2>${hiredDate}</h2></div>
            <div class="stat-icon"><i class="fa fa-calendar"></i></div>
        </div>
    `;
}

async function initWorkforceChart(role) {
    if (role === 'User') return;
    const ctx = document.getElementById('deptChart')?.getContext('2d');
    if (!ctx) return;

    
    const { data } = await _supabase
        .from('employee')
        .select(`
            job (
                department (
                    department_name
                )
            )
        `);

    const counts = {};
    if (data) {
        data.forEach(item => {
            const name = item.job?.department?.department_name || 'Unassigned';
            counts[name] = (counts[name] || 0) + 1;
        });
    }

    if (workforceChart) workforceChart.destroy();
    workforceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            plugins: { legend: { position: 'bottom' } }
        }
    });
}


let allActivities = []; 

async function renderMainTable(role, profile) {
    const body = document.getElementById('activity-body');
    if (!body) return;

    if (role !== 'User') {
        const { data: recent, error } = await _supabase
            .from('employee')
            .select('first_name, last_name, status, created_at, avatar_url')
            .order('created_at', { ascending: false })
            .limit(10); 

        if (error) {
            console.error("Fetch error:", error);
            return;
        }

        allActivities = recent || []; 
        displayActivities(allActivities);
    }
}

function updateStatusCards(profile) {
    const posTag = document.getElementById('role-tag'); 
    const deptTag = document.getElementById('department-tag');

    if (posTag) {
        posTag.innerText = profile.position || "Not Assigned";
    }
    if (deptTag) {
        deptTag.innerText = profile.department || "General";
    }
}

function displayActivities(data) {
    const body = document.getElementById('activity-body');
    if (!body) return;

    if (!data || data.length === 0) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No matching records found.</td></tr>';
        return;
    }

    body.innerHTML = data.map(r => {
        
        const initials = `${r.first_name[0]}${r.last_name[0]}`.toUpperCase();
        
       
        const avatarUI = r.avatar_url 
            ? `<img src="${r.avatar_url}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">`
            : `<div style="width:30px; height:30px; border-radius:50%; background:#e2e8f0; color:#475569; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600;">${initials}</div>`;

        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${avatarUI}
                        ${r.first_name} ${r.last_name}
                    </div>
                </td>
                <td>New Registration</td>
                <td><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></td>
                <td>${new Date(r.created_at).toLocaleDateString()}</td>
            </tr>`;
    }).join('');
}

function handleActivitySearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    const filtered = allActivities.filter(item => {
        const fullName = `${item.first_name} ${item.last_name}`.toLowerCase();
        return fullName.includes(searchTerm) || 
               item.status.toLowerCase().includes(searchTerm);
    });

    displayActivities(filtered);
}


document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('keyup', handleActivitySearch);
    }
});

window.previewRole = async function(roleValue) {

    currentRole = roleValue;

    updateSidebarVisibility(roleValue);

    if (_lastProfileData) {
        await renderStats(roleValue, _lastProfileData);
        renderQuickActions(roleValue); 
        await initCharts(roleValue);
        
        const tableTitle = document.getElementById('table-title');
        if (tableTitle) {
            tableTitle.innerText = (roleValue === 'User') ? 'My Career History' : 'Recent Activity';
        }
    }
    
    try {
        await renderStats(roleValue, _lastProfileData);
        await initCharts(roleValue);
        
        const tableTitle = document.getElementById('table-title');
        if (tableTitle) {
            tableTitle.innerText = (roleValue === 'User') ? 'My Career History' : 'Recent Activity';
        }
    } catch (error) {
        console.error("Preview render failed:", error);
    }
};

function updateSidebarVisibility(role) {
    const adminSection = document.querySelector('.auth-admin');
    const superSection = document.querySelector('.auth-super');
    const userRoleEl = document.getElementById('userRole');

    if (userRoleEl) {
        userRoleEl.innerText = ROLE_NAMES[role] || role;
    }

    
    if (adminSection) adminSection.style.display = 'none';
    if (superSection) superSection.style.display = 'none';

    
    if (role === 'SuperAdmin' || role === 'Admin') {
        if (adminSection) {
            adminSection.style.display = 'block';
            adminSection.removeAttribute('hidden');

            
            const allowed = [
                'employee-management.html', 
                'directory.html', 
                'departments.html', 
                'recruitment.html'
            ];

            adminSection.querySelectorAll('.nav-item').forEach(item => {
                const link = item.querySelector('a')?.getAttribute('href');
                if (allowed.includes(link)) {
                    item.style.display = 'block';
                    item.removeAttribute('hidden');
                } else {
                    item.style.display = 'none';
                }
            });
        }

        
        if (role === 'SuperAdmin' && superSection) {
            superSection.style.display = 'block';
            superSection.removeAttribute('hidden');
        }
    } 
}

async function renderStats(role, profile) {
    const container = document.getElementById('stats-container');
    if (!container) return;

    
    if (role === 'SuperAdmin') {
        const [allEmps, pending, depts, promos] = await Promise.all([
            _supabase.from('employee').select('status'),
            _supabase.from('employee').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
            _supabase.from('department').select('*', { count: 'exact', head: true }),
            _supabase.from('jobhistory').select('*', { count: 'exact', head: true }) // Recent Promotions
        ]);

        const stats = {
            total: allEmps.data?.length || 0,
            online: allEmps.data?.filter(e => e.status === 'online').length || 0,
            offline: allEmps.data?.filter(e => e.status === 'offline').length || 0,
            pending: pending.count || 0,
            depts: depts.count || 0,
            promos: promos.count || 0
        };

        container.innerHTML = `
            <div class="stat-card-new blue-var"><div class="stat-details"><span>Total Employees</span><h2>${stats.total}</h2></div><div class="stat-icon"><i class="fa fa-users"></i></div></div>
            <div class="stat-card-new green-var"><div class="stat-details"><span>Active Online</span><h2>${stats.online}</h2></div><div class="stat-icon"><i class="fa fa-circle"></i></div></div>
            <div class="stat-card-new gray-var"><div class="stat-details"><span>Offline Staff</span><h2>${stats.offline}</h2></div><div class="stat-icon"><i class="fa fa-moon"></i></div></div>
            <div class="stat-card-new orange-var"><div class="stat-details"><span>Pending Applicants</span><h2>${stats.pending}</h2></div><div class="stat-icon"><i class="fa fa-user-plus"></i></div></div>
            <div class="stat-card-new purple-var"><div class="stat-details"><span>Total Departments</span><h2>${stats.depts}</h2></div><div class="stat-icon"><i class="fa fa-sitemap"></i></div></div>
            <div class="stat-card-new gold-var"><div class="stat-details"><span>Recent Promotions</span><h2>${stats.promos}</h2></div><div class="stat-icon"><i class="fa fa-trophy"></i></div></div>
        `;

    } else if (role === 'Admin') {
        const [allEmps, pending] = await Promise.all([
            _supabase.from('employee').select('status'),
            _supabase.from('employee').select('*', { count: 'exact', head: true }).eq('status', 'Pending')
        ]);

        container.innerHTML = `
            <div class="stat-card-new blue-var"><div class="stat-details"><span>Team Size</span><h2>${allEmps.data?.length || 0}</h2></div><div class="stat-icon"><i class="fa fa-handshake"></i></div></div>
            <div class="stat-card-new green-var"><div class="stat-details"><span>Active Members</span><h2>${allEmps.data?.filter(e => e.status === 'online').length || 0}</h2></div><div class="stat-icon"><i class="fa fa-check"></i></div></div>
            <div class="stat-card-new orange-var"><div class="stat-details"><span>Recruitment Queue</span><h2>${pending.count || 0}</h2></div><div class="stat-icon"><i class="fa fa-clock"></i></div></div>
        `;

    } else {

        const job = Array.isArray(profile?.job) ? profile.job[0] : profile?.job;
        const dept = Array.isArray(job?.department) ? job.department[0] : job?.department;


        const position = job?.position || "Not Assigned";
        const department = dept?.department_name || "General";
        const status = profile?.status || "Active";
        
        const hiredDate = profile?.created_at 
            ? new Date(profile.created_at).toLocaleDateString()
            : "N/A";

        container.innerHTML = `
            <div class="stat-card-new blue-var">
                <div class="stat-details"><span>Current Position</span><h2>${position}</h2></div>
                <div class="stat-icon"><i class="fa fa-briefcase"></i></div>
            </div>
            <div class="stat-card-new purple-var">
                <div class="stat-details"><span>Department</span><h2>${department}</h2></div>
                <div class="stat-icon"><i class="fa fa-building"></i></div>
            </div>
            <div class="stat-card-new green-var">
                <div class="stat-details"><span>Employment Status</span><h2>${status}</h2></div>
                <div class="stat-icon"><i class="fa fa-check-circle"></i></div>
            </div>
            <div class="stat-card-new orange-var">
                <div class="stat-details"><span>Date Hired</span><h2>${hiredDate}</h2></div>
                <div class="stat-icon"><i class="fa fa-calendar"></i></div>
            </div>
        `;
    }
}

async function handleFilterChange() {
    const months = document.getElementById('timeFilter').value;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    await initCharts(currentRole, startDate.toISOString());
}


async function initCharts(role, dateLimit = null) {
    let query = _supabase.from('hiring_trends').select('*');
    
    if (dateLimit) {
        query = query.gte('created_at', dateLimit);
    }
    
    const { data, error } = await query;
    
}

let hiringChart = null; 

async function updateChartData() {
    const timeFilter = document.getElementById('timeFilter');
    if (!timeFilter) return;

    const monthsToSubtract = parseInt(timeFilter.value);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToSubtract);

    
    const { data, error } = await _supabase
        .from('hiring_trends')
        .select('month, count, created_at')
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching hiring data:", error);
        return;
    }

    renderHiringChart(data);
}

function renderHiringChart(data) {
    const canvas = document.getElementById('mainChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');

    
    if (hiringChart) {
        hiringChart.destroy();
    }

    
    const labels = data.map(row => row.month); 
    const counts = data.map(row => row.count);

    hiringChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'New Hires',
                data: counts,
                borderColor: '#3b82f6', 
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                tension: 0.4, 
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false } 
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: { stepSize: 1, color: '#64748b' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b' }
                }
            }
        }
    });
}

async function fetchRecentActivity(role, userId) {
    const body = document.getElementById('activity-body');
    if (!body) return;

    // Show a loading state
    body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading logs...</td></tr>';

    let query = _supabase
        .from('attendance')
        .select('*, employee(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(10);

    // If it's a regular employee, only show THEIR logs
    if (role === 'User' && userId) {
        query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;

    if (error) {
        console.error("Supabase Error:", error);
        body.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Error loading data.</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        body.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:#94a3b8;">
            <i class="fa fa-calendar-check" style="display:block; font-size:2rem; margin-bottom:10px; opacity:0.5;"></i>
            No attendance logs found yet.
        </td></tr>`;
        return;
    }

    body.innerHTML = data.map(item => {
        const date = new Date(item.created_at).toLocaleDateString();
        const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const type = item.type || 'Clock In'; // Fallback if type column is missing
        const status = item.status || 'Success';

        return `
            <tr>
                <td>${date}</td>
                <td><i class="fa fa-sign-in-alt" style="color:#3b82f6; margin-right:8px;"></i>${type}</td>
                <td><span class="status-badge ${status.toLowerCase()}">${status}</span></td>
                <td>${time}</td>
            </tr>
        `;
    }).join('');
}

async function initCharts(role) {
    const chartSection = document.getElementById('distribution-container');
    if (chartSection) {
        chartSection.style.display = (role === 'User') ? 'none' : 'block';
    }

    if (role === 'User') return;

    
    const { data: employees, error } = await _supabase
        .from('employee')
        .select(`
            status,
            job (
                department (
                    department_name
                )
            )
        `);

    if (error || !employees) return;

    
    const deptCounts = {};
    const recruitCounts = { Pending: 0, Approved: 0, Rejected: 0 };

    employees.forEach(emp => {
       
        const dName = emp.job?.department?.department_name || 'Unassigned';
        deptCounts[dName] = (deptCounts[dName] || 0) + 1;

       
        if (recruitCounts[emp.status] !== undefined) {
            recruitCounts[emp.status]++;
        }
    });

    
    const ctxRecruit = document.getElementById('attendanceChart')?.getContext('2d');
    if (ctxRecruit) {
        if (window.recruitChartInstance) window.recruitChartInstance.destroy();
        
        window.recruitChartInstance = new Chart(ctxRecruit, {
            type: 'bar', 
            data: {
                labels: Object.keys(recruitCounts),
                datasets: [{
                    label: 'Applicants',
                    data: Object.values(recruitCounts),
                    backgroundColor: ['#f59e0b', '#10b981', '#ef4444'], // Orange, Green, Red
                    borderRadius: 6
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    
    const ctxDept = document.getElementById('deptChart')?.getContext('2d');
    if (ctxDept) {
        if (window.deptChartInstance) window.deptChartInstance.destroy();

        window.deptChartInstance = new Chart(ctxDept, {
            type: 'doughnut',
            data: {
                labels: Object.keys(deptCounts),
                datasets: [{
                    data: Object.values(deptCounts),
                    backgroundColor: ['#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#6366f1'],
                    borderWidth: 0
                }]
            },
            options: { 
                cutout: '70%',
                plugins: { 
                    legend: { position: 'bottom' } 
                }
            }
        });
    }
}

function renderQuickActions(role) {
    const list = document.getElementById('actions-list');
    if (!list) return;


    list.innerHTML = '';

    const actions = {
        SuperAdmin: [
            { label: 'Management', icon: 'fa-users', class: 'primary', link: 'directory.html' },
            { label: 'Recruitment', icon: 'fa-user-plus', class: '', link: 'recruitment.html' },
            { label: 'Departments', icon: 'fa-sitemap', class: '', link: 'departments.html' }
        ],
        Admin: [
            { label: 'Recruitment', icon: 'fa-user-plus', class: 'primary', link: 'recruitment.html' },
            { label: 'Directory', icon: 'fa-address-book', class: '', link: 'directory.html' },
            { label: 'My Profile', icon: 'fa-user', class: '', link: 'profile.html' }
        ],
        User: [
            { label: 'My Profile', icon: 'fa-user', class: 'primary', link: 'profile.html' },
            { label: 'Directory', icon: 'fa-search', class: '', fn: "toggleDirectoryDrawer()" },
        ]
    };

    const roleActions = actions[role] || actions.User;

    
    list.innerHTML = roleActions.map(a => {
        const clickAction = a.fn ? a.fn : `window.location.href='${a.link}'`;
        return `
            <button class="action-btn ${a.class}" onclick="${clickAction}">
                <i class="fa ${a.icon}"></i> ${a.label}
            </button>
        `;
    }).join('');
}

let allEmployeesCache = [];

async function toggleDirectoryDrawer() {
    const drawer = document.getElementById('directoryDrawer');
    const overlay = document.getElementById('drawerOverlay');
    
    drawer.classList.toggle('open');
    overlay.classList.toggle('show');

    
    if (drawer.classList.contains('open') && allEmployeesCache.length === 0) {
        await loadDrawerEmployees();
    }
}

async function loadDrawerEmployees() {
    const listContainer = document.getElementById('drawerEmployeeList');
    
    const { data, error } = await _supabase
        .from('employee')
        .select(`
            first_name, last_name, avatar_url, status,
            job (position, department (department_name))
        `)
        .eq('status', 'Approved');

    if (error) {
        listContainer.innerHTML = '<p>Error loading directory.</p>';
        return;
    }

    allEmployeesCache = data;
    renderDrawerList(data);
}

function renderDrawerList(employees) {
    const listContainer = document.getElementById('drawerEmployeeList');
    
    if (employees.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding:40px; color:#94a3b8;">
                <i class="fa fa-search" style="font-size:2rem; margin-bottom:10px;"></i>
                <p>No colleagues found.</p>
            </div>`;
        return;
    }

    listContainer.innerHTML = employees.map(emp => {
        const initials = (emp.first_name[0] + (emp.last_name ? emp.last_name[0] : "")).toUpperCase();
        const statusClass = emp.status === 'online' ? 'online' : 'offline';

        return `
            <div class="drawer-item">
                <div class="drawer-avatar">
                    ${emp.avatar_url 
                        ? `<img src="${emp.avatar_url}">` 
                        : `<span>${initials}</span>`}
                    <div class="status-indicator ${statusClass}"></div>
                </div>
                <div class="drawer-info">
                    <strong>${emp.first_name} ${emp.last_name}</strong>
                    <span>${emp.job?.position || 'Staff'} • ${emp.job?.department?.department_name || 'General'}</span>
                </div>
            </div>
        `;
    }).join('');
}

function filterDrawerList() {
    const term = document.getElementById('drawerSearchInput').value.toLowerCase();
    const filtered = allEmployeesCache.filter(emp => 
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(term)
    );
    renderDrawerList(filtered);
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