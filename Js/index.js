const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);



function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || ''}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}


function resetLoginUI() {
    const submitBtn = document.querySelector('.btn-primary');
    const loginForm = document.querySelector('.login-form');

    if (submitBtn) {
        submitBtn.innerText = "Sign In";
        submitBtn.disabled = false;
    }

    if (loginForm) {
        loginForm.dataset.loading = "false";
    }
}


document.addEventListener('DOMContentLoaded', async () => {

    const loginForm = document.querySelector('.login-form');
    const googleBtn = document.querySelector('.btn-google');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.querySelector('.password-toggle');

    
    _supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            await handleUserStatus(session.user);
        }
    });


    const { data: { session } } = await _supabase.auth.getSession();
    if (session) await handleUserStatus(session.user);


    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPass = passwordInput.type === 'password';
            passwordInput.type = isPass ? 'text' : 'password';
        });
    }

  
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            const { error } = await _supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + "/index.html"
                }
            });

            if (error) showToast(error.message, "error");
        });
    }

  
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = passwordInput.value;
            const submitBtn = loginForm.querySelector('.btn-primary');

            try {
                loginForm.dataset.loading = "true";
                submitBtn.innerText = "Verifying...";
                submitBtn.disabled = true;

                const { data, error } = await _supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                await handleUserStatus(data.user);

            } catch (err) {
                showToast(err.message, "error");
                resetLoginUI();
            }
        });
    }
});


async function handleSignOut() {
    try {
        const { data: { session } } = await _supabase.auth.getSession();

        if (session) {
            await _supabase
                .from('employee')
                .update({ status: 'offline' })
                .eq('user_id', session.user.id);
        }

        await _supabase.auth.signOut();
        window.location.href = "index.html";

    } catch (err) {
        console.error("Sign out error:", err.message);
        await _supabase.auth.signOut();
        window.location.href = "index.html";
    }
}


async function handleUserStatus(user) {
    try {
        const { data: appData, error } = await _supabase
            .from('employee')
            .select('status, role')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw error;

        // No profile yet
        if (!appData) {
            showToast("Complete your profile...", "info");
            setTimeout(() => {
                window.location.href = "register.html";
            }, 1500);
            return;
        }

        const allowedStatuses = ['Approved', 'online', 'offline'];
        const isManagement = ['Admin', 'SuperAdmin'].includes(appData.role);

        if (allowedStatuses.includes(appData.status) || isManagement) {

            await _supabase
                .from('employee')
                .update({
                    status: 'online',
                    last_seen: new Date().toISOString()
                })
                .eq('user_id', user.id);

            showToast("Access Granted", "success");

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);

        } else {
            await _supabase.auth.signOut();
            showToast(`Status: ${appData.status}`, "info");
            resetLoginUI();
        }

    } catch (err) {
        console.error("Verification Error:", err);
        showToast("Account verification failed.", "error");
        resetLoginUI();
    }
}
