
const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let userProfile = null;
let currentRoleView = null; 


async function init() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = "index.html";
        return;
    }
    currentUser = session.user;

    await fetchUserProfile();
    setupRealtime();
    updateRecruitmentBadge();
    updateAnnouncementBadge();

    document.getElementById('filterAudience').addEventListener('change', fetchAnnouncements);
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
    const { data, error } = await _supabase
        .from('employees')
        .select('first_name, last_name, role, avatar_url')
        .eq('user_id', currentUser.id)
        .single();

    if (data) {
        userProfile = data;
        currentRoleView = data.role;

        const thumb = document.getElementById('userInitials');
       
        if (data.avatar_url) {
            thumb.innerHTML = `<img src="${data.avatar_url}" style="width:100%; height:100%; border-radius:30%; object-fit:cover;">`;
            thumb.style.background = "transparent"; 
        } else {
            thumb.innerText = (data.first_name[0] + data.last_name[0]).toUpperCase();
            thumb.style.background = "#e2e8f0";
        }

        renderUserUI();
        fetchAnnouncements();
    }
}

function renderUserUI() {
   
    const fullName = `${userProfile.first_name} ${userProfile.last_name}`;
    document.getElementById('userName').innerText = fullName;
    document.getElementById('userInitials').innerText = (userProfile.first_name[0] + userProfile.last_name[0]).toUpperCase();

    const thumbContainer = document.getElementById('userInitials');
    if (userProfile.avatar_url) {
       
        thumbContainer.innerHTML = `<img src="${userProfile.avatar_url}" style="width:100%; height:100%; border-radius:25%; object-fit:cover;">`;
        thumbContainer.style.background = "transparent";
    } else {
    
        thumbContainer.innerText = (userProfile.first_name[0] + userProfile.last_name[0]).toUpperCase();
        thumbContainer.style.background = "#e2e8f0"; 
    }

    
    const roleDisplay = {
        'SuperAdmin': 'CEO ',
        'Admin': 'Manager ',
        'User': 'Employee '
    };
    document.getElementById('userRole').innerText = roleDisplay[currentRoleView] || currentRoleView;

    
    const switcher = document.getElementById('superAdminTools');
    if (userProfile.role === 'SuperAdmin') {
        switcher.style.display = 'block';
        document.getElementById('roleSwitcher').value = currentRoleView;
    }

    
    document.querySelectorAll('.auth-admin').forEach(el => {
        el.style.display = (currentRoleView === 'Admin' || currentRoleView === 'SuperAdmin') ? 'block' : 'none';
    });
    document.querySelectorAll('.auth-super').forEach(el => {
        el.style.display = (currentRoleView === 'SuperAdmin') ? 'block' : 'none';
    });
}


window.previewRole = (newRole) => {
    currentRoleView = newRole;
    renderUserUI();
    fetchAnnouncements(); 
};


    async function fetchAnnouncements() {
    const grid = document.getElementById('announcementGrid');
    const filterValue = document.getElementById('filterAudience').value; 

    let query = _supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

    
    if (currentRoleView === 'User') {
        query = query.in('audience', ['Everyone', 'Employee']);
    } else if (currentRoleView === 'Admin') {
        query = query.in('audience', ['Everyone', 'Admin Only', 'Employee']);
    }

    
    if (filterValue !== 'All') {
        query = query.eq('audience', filterValue);
    }

    const { data, error } = await query;

    if (error) {
        grid.innerHTML = `<p style="padding:20px; color:red;">Error loading posts.</p>`;
        return;
    }

    renderCards(data);
}

async function saveAnnouncement() {
    const title = document.getElementById('annTitle').value;
    const content = quill.root.innerHTML; 
    const audience = document.getElementById('modalAudience').value;

    const { error } = await _supabase
        .from('announcements')
        .insert([{
            title: title,
            content_html: content,
            audience: audience,
            author_id: currentUser.id,
            author_name: `${userProfile.first_name} ${userProfile.last_name}`,
            author_avatar_url: userProfile.avatar_url
        }]);

    if (error) {
        alert("Error saving: " + error.message);
    } else {
        closeModal();
        
        await fetchAnnouncements(); 
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
            .limit(1);

        if (error) throw error;

        // Use the ID you have in your HTML: 'ann-badge-nav'
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
        console.error("Error updating announcement badge:", err.message);
    }
}

function renderCards(posts) {
    const grid = document.getElementById('announcementGrid');
    
    grid.innerHTML = posts.map(post => {
        const authorImg = post.author_avatar_url; 
        const initial = post.author_name ? post.author_name[0] : 'A';

        const postDate = new Date(post.created_at);
        const hours24 = 24 * 60 * 60 * 1000;
        const isNew = (new Date() - postDate) < hours24;

        const newBadge = isNew 
            ? `<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; margin-right: 8px; display: inline-block; vertical-align: middle;">NEW</span>` 
            : '';

        const avatarMarkup = (authorImg && authorImg !== "") 
            ? `<img src="${authorImg}" style="width:100%; height:100%; object-fit:cover; display:block;">`
            : `<div style="width:100%; height:100%; background:#ef4444; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">${initial}</div>`;

        const isAuthor = post.author_id === currentUser.id;
        const deleteIcon = isAuthor 
            ? `<i class="fa fa-trash" onclick="deletePost('${post.id}')" style="cursor:pointer; color: #cbd5e1; font-size: 14px;"></i>` 
            : '';

        return `
        <div class="ann-card" style="position: relative; background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
            
            <div style="position: absolute; top: 20px; right: 20px; display: flex; gap: 10px; align-items: center;">
                <span style="background: #fee2e2; color: #ef4444; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase;">
                    ${post.audience}
                </span>
                ${deleteIcon} 
            </div>

            <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #1e293b; font-weight: 700; padding-right: 100px;">
                ${post.title || 'Untitled Announcement'}
            </h3>

            <div class="ann-card-content" style="color: #475569; line-height: 1.6; font-size: 15px; margin-bottom: 20px;">
                ${post.content_html}
            </div>

            <div style="padding-top: 15px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width:32px; height:32px; border-radius:50%; overflow:hidden; flex-shrink:0; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center;">
                         ${avatarMarkup} 
                    </div>
                    
                    <span style="font-size: 14px; color: #1e293b; font-weight: 600; line-height: 1;">
                        ${post.author_name}
                    </span>
                </div>

                <span style="font-size: 12px; color: #94a3b8; font-weight: 500;">
                    ${new Date(post.created_at).toLocaleDateString()}
                </span>
                
            </div>
        </div>
        `;
    }).join('');
}


window.openAnnouncements = () => {
    
    const badge = document.getElementById('ann-badge-nav');
    if (badge) badge.style.display = 'none';

    
    fetchAnnouncements();

};


window.execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    document.getElementById('editorContent').focus();
};



window.triggerInlineImage = () => document.getElementById('inlineImageInput').click();

window.handleInlineImage = async (input) => {
    const file = input.files[0];
    if (!file) return;

    const filePath = `uploads/${Date.now()}_${file.name}`;
    const { data, error } = await _supabase.storage.from('announcement-media').upload(filePath, file);

    if (data) {
        const { data: { publicUrl } } = _supabase.storage.from('announcement-media').getPublicUrl(filePath);
        document.execCommand('insertImage', false, publicUrl);
    }
};

window.insertEmoji = () => {
    const emoji = prompt("Paste an emoji here:");
    if (emoji) execCmd('insertText', emoji);
};

window.promptLink = () => {
    const url = prompt("Enter link URL:", "https://");
    if (url) execCmd('createLink', url);
};

document.getElementById('annForm').onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('.btn-save');
    submitBtn.disabled = true;

    const payload = {
        title: document.getElementById('annTitle').value,
        audience: document.getElementById('annAudience').value,
        content_html: document.getElementById('editorContent').innerHTML,
        author_name: `${userProfile.first_name} ${userProfile.last_name}`,
        author_id: currentUser.id,
        author_avatar_url: userProfile.avatar_url
    };

    const { error } = await _supabase.from('announcements').insert([payload]);

    if (!error) {
        closeModal();
        fetchAnnouncements();
    } else {
        alert("Error: " + error.message);
    }
    submitBtn.disabled = false;
};


function setupRealtime() {
    _supabase
        .channel('ann_changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
            const newPost = payload.new;
            
            if (newPost.audience === 'Everyone' || newPost.audience === userProfile.role) {
                showNavBadge();
                fetchAnnouncements();
            }
        })
        .subscribe();
}

function showNavBadge() {
    const badge = document.getElementById('ann-badge-nav');
    if (badge) {
        badge.style.display = 'flex';
        badge.innerText = "!";
    }
}

async function updateRecruitmentBadge() {
    const { count } = await _supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

    const badge = document.getElementById('badge-count');
    if (badge) {
        badge.innerText = count || 0;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}


window.openModal = () => document.getElementById('annModal').style.display = 'flex';
window.closeModal = () => {
    document.getElementById('annModal').style.display = 'none';
    document.getElementById('annForm').reset();
    document.getElementById('editorContent').innerHTML = '';
};

window.toggleDropdown = () => {
    const menu = document.getElementById('profileMenu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
};

window.deletePost = async (id) => {
    if (confirm("Delete this post permanently?")) {
        
        const { error } = await _supabase
            .from('announcements')
            .delete()
            .eq('id', id)
            .eq('author_id', currentUser.id);

        if (error) {
            alert("Error: You can only delete your own posts.");
            console.error(error);
        } else {
            fetchAnnouncements();
        }
    }
};

window.handleSignOut = async () => {
    await _supabase.auth.signOut();
    window.location.href = "index.html";
};


window.onclick = (e) => {
    if (!e.target.closest('.profile-trigger')) {
        document.getElementById('profileMenu').style.display = 'none';
    }
};

document.addEventListener('DOMContentLoaded', init);