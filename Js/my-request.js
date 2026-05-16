
const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);


const ROLE_NAMES = { 'SuperAdmin': 'CEO', 'Admin': 'Manager', 'User': 'Employee' };
let allRequests = [];
let currentUser = null;
let currentRole = 'User';


async function init() {
    console.log("System: Initializing My Requests...");
    
    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();
    
    if (sessionError || !session) {
        window.location.href = "index.html";
        return;
    }
    
    currentUser = session.user;

    await fetchUserProfile();
    await fetchMyRequests();

    await updateRecruitmentBadge();
    setupRecruitmentSubscription();

    await updateAnnouncementBadge();
    setupAnnouncementRealtime();
    
    setupUIControls();
    setupEventListeners();
    subscribeToChanges();
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


async function fetchUserProfile() {
    try {
        const { data, error } = await _supabase
            .from('employees')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (data) {
            const fullName = `${data.first_name} ${data.last_name}`;
            const displayRole = ROLE_NAMES[data.role] || data.role;

            if(document.getElementById('userName')) document.getElementById('userName').innerText = fullName;
            if(document.getElementById('userRole')) document.getElementById('userRole').innerText = displayRole;
            
            const initialsDiv = document.getElementById('userInitials');
            if(initialsDiv) {
                initialsDiv.innerText = (data.first_name[0] + data.last_name[0]).toUpperCase();
                
                if (data.avatar_url) {
                    initialsDiv.style.backgroundImage = `url('${data.avatar_url}')`;
                    initialsDiv.style.backgroundSize = 'cover';
                    initialsDiv.style.backgroundPosition = 'center';
                    initialsDiv.innerText = ''; 
                }
            }

            if (data.role === 'SuperAdmin') {
                if(document.getElementById('superAdminTools')) document.getElementById('superAdminTools').style.display = 'block';
                document.querySelectorAll('.auth-super, .auth-admin').forEach(el => el.style.display = 'block');
            } else if (data.role === 'Admin') {
                document.querySelectorAll('.auth-admin').forEach(el => el.style.display = 'block');
            }
        }
    } catch (err) {
        console.error("Profile Error:", err);
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

function setupAnnouncementRealtime() {
    _supabase.channel('announcement-my-requests')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, () => {
            updateAnnouncementBadge();
        })
        .subscribe();
}

async function updateRecruitmentBadge() {
    try {
        const { count, error } = await _supabase
            .from('employees') 
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Pending'); 

        if (error) return;

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
    _supabase.channel('recruitment-badge-my-req').on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'employees' 
    }, () => {
        updateRecruitmentBadge();
    }).subscribe();
}

async function fetchMyRequests() {
    try {
        const { data, error } = await _supabase
            .from('leave_requests')
            .select(`*, employees!user_id (first_name, last_name)`)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        allRequests = data || [];
        renderDashboard();
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}


function renderDashboard() {
    
    if(document.getElementById('total-req')) document.getElementById('total-req').innerText = allRequests.length;
    if(document.getElementById('pending-req')) document.getElementById('pending-req').innerText = allRequests.filter(r => r.status === 'Pending').length;
    if(document.getElementById('approved-req')) document.getElementById('approved-req').innerText = allRequests.filter(r => r.status === 'Approved').length;
    if(document.getElementById('rejected-req')) document.getElementById('rejected-req').innerText = allRequests.filter(r => r.status === 'Rejected').length;

    renderTable(allRequests);
}


function renderTable(dataToDisplay) {
    const tbody = document.getElementById('requestTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (dataToDisplay.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px; color:#94a3b8;">No requests found.</td></tr>`;
        return;
    }

    dataToDisplay.forEach(item => {
        const tr = document.createElement('tr');
        const empName = item.employees ? `${item.employees.first_name} ${item.employees.last_name}` : "User";
        const dateSub = new Date(item.created_at).toLocaleDateString();
        
        let actionBtn = item.status === 'Pending' 
            ? `<button class="btn-cancel" onclick="handleCancel('${item.id}')" style="background:#fee2e2; color:#ef4444; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600;">Cancel</button>` 
            : `<button class="btn-outline" onclick="handleView('${item.id}')" style="border:1px solid #e2e8f0; background:white; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600;">View</button>`;

        tr.innerHTML = `
            <td><strong>${empName}</strong></td>
            <td><strong>Leave</strong><br><small style="color:#64748b">${item.leave_type}</small></td>
            <td>${dateSub}</td>
            <td>${item.start_date} to ${item.end_date}</td>
            <td><span class="badge status-${item.status.toLowerCase()}">${item.status}</span></td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}


window.handleCancel = async function(id) {
    if(!confirm("Cancel this request?")) return;
    const { error } = await _supabase.from('leave_requests').update({ status: 'Cancelled' }).eq('id', id);
    if (error) alert(error.message);
    else await fetchMyRequests();
};

window.handleView = function(id) {
    const req = allRequests.find(r => r.id === id);
    if(req) {
        alert(`REQUEST DETAILS\nType: ${req.leave_type}\nReason: ${req.reason || 'None'}\nStatus: ${req.status}`);
    }
};


function setupUIControls() {
    window.toggleDropdown = () => document.getElementById('profileMenu').classList.toggle('show');
    window.toggleNotifPanel = () => document.getElementById('notifPanel').classList.toggle('show');

    window.handleSignOut = async () => {
        await _supabase.auth.signOut();
        window.location.href = "index.html";
    };

    window.previewRole = (role) => {
        const display = ROLE_NAMES[role] || role;
        document.getElementById('userRole').innerText = display;
        updateAnnouncementBadge();
        
        if (role === 'User') {
            document.querySelectorAll('.auth-super, .auth-admin').forEach(el => el.style.display = 'none');
        } else if (role === 'Admin') {
            document.querySelectorAll('.auth-super').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.auth-admin').forEach(el => el.style.display = 'block');
        } else {
            document.querySelectorAll('.auth-super, .auth-admin').forEach(el => el.style.display = 'block');
        }
    };

    window.onclick = (e) => {
        if (!e.target.closest('.profile-trigger')) {
            const pm = document.getElementById('profileMenu');
            if(pm) pm.classList.remove('show');
        }
        if (!e.target.closest('.notif-wrapper')) {
            const np = document.getElementById('notifPanel');
            if(np) np.classList.remove('show');
        }
    };
}

function setupEventListeners() {
    const filterType = document.getElementById('filterType');
    const filterStatus = document.getElementById('filterStatus');

    const applyFilters = () => {
        const tVal = filterType ? filterType.value : 'all';
        const sVal = filterStatus ? filterStatus.value : 'all';

        const filtered = allRequests.filter(req => {
            const matchesType = (tVal === 'all' || 'Leave' === tVal); 
            const matchesStatus = (sVal === 'all' || req.status === sVal);
            return matchesType && matchesStatus;
        });

        renderTable(filtered); 
    };

    if(filterType) filterType.addEventListener('change', applyFilters);
    if(filterStatus) filterStatus.addEventListener('change', applyFilters);
}   

function subscribeToChanges() {
    _supabase.channel('my-req').on('postgres_changes', { 
        event: '*', schema: 'public', table: 'leave_requests', filter: `user_id=eq.${currentUser.id}` 
    }, fetchMyRequests).subscribe();
}

document.addEventListener('DOMContentLoaded', init);