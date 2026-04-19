
document.addEventListener('DOMContentLoaded', async () => {
   
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (session) {
        const userId = session.user.id;

    
        updateAnnouncementBadge();
        setupAnnouncementRealtime();

        await loadUserSettings(userId);
        
    
        const prefForm = document.getElementById('preferencesForm');
        if (prefForm) {
            prefForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveUserSettings(userId);
            });
        }
    } else {
  
        window.location.href = 'index.html';
    }
});

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


async function loadUserSettings(userId) {
    const { data, error } = await _supabase
        .from('employees')
        .select('theme_preference, email_notifications, timezone, time_format')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error("Error loading preferences:", error.message);
        return;
    }

    if (data) {
     
        if(document.getElementById('pref-theme')) 
            document.getElementById('pref-theme').value = data.theme_preference || 'light';
        
        if(document.getElementById('pref-email-notif')) 
            document.getElementById('pref-email-notif').checked = data.email_notifications !== false;

        if(document.getElementById('pref-timezone')) 
            document.getElementById('pref-timezone').value = data.timezone || 'UTC+8';
            
        if(document.getElementById('pref-timeformat')) 
            document.getElementById('pref-timeformat').value = data.time_format || '12h';
        
        
        applyTheme(data.theme_preference);
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
        console.error("Badge Error:", err.message);
    }
}

function setupAnnouncementRealtime() {
    _supabase
        .channel('announcement-prefs')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'announcements' }, 
            () => updateAnnouncementBadge()
        )
        .subscribe();
}




async function saveUserSettings(userId) {
    const settings = {
        theme_preference: document.getElementById('pref-theme').value,
        email_notifications: document.getElementById('pref-email-notif').checked,
        timezone: document.getElementById('pref-timezone').value,
        time_format: document.getElementById('pref-timeformat').value,
        updated_at: new Date()
    };

    const { error } = await _supabase
        .from('employees')
        .update(settings)
        .eq('user_id', userId);

    if (error) {
        showStatusPopup("Failed to save changes: " + error.message, "error");
    } else {
        showStatusPopup("Preferences updated successfully!", "success");
        
     
        applyTheme(settings.theme_preference);
    }
}


async function triggerPasswordReset() {
    const { data: { user } } = await _supabase.auth.getUser();
    
  
    const { error } = await _supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin + '/reset-password.html',
    });

    if (error) {
        showStatusPopup(error.message, "error");
    } else {
        showStatusPopup("A reset link has been sent to " + user.email, "success");
    }
}


function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function showStatusPopup(message, type) {
    const popup = document.createElement('div');
    popup.className = `status-popup ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

    popup.innerHTML = `
        <div class="status-icon"><i class="fa ${icon}"></i></div>
        <div class="status-text">${message}</div>
    `;
    
    document.body.appendChild(popup);
    

    setTimeout(() => {
        popup.classList.add('fade-out');
        setTimeout(() => popup.remove(), 500);
    }, 3000);
}