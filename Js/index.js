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
            const isManual = loginForm && loginForm.dataset.loading === "true";
            if (!isManual) {
                await handleUserStatus(session.user);
            }
        }
    });


    const { data: { session } } = await _supabase.auth.getSession();
    if (session) await handleUserStatus(session.user);
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPass = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPass ? 'text' : 'password');
            togglePasswordBtn.innerHTML = isPass 
                ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
                : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        });
    }

    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            const { error } = await _supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
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

                const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                await handleUserStatus(data.user);
            } catch (err) {
                showToast(err.message, "error");
                resetLoginUI();
            }
        });
    }


    async function handleUserStatus(user) {
        try {
        
           

            const { data: appData, error: dbError } = await _supabase
                .from('applications')
                .select('status')
                .eq('user_id', user.id)
                .maybeSingle();

            if (dbError) throw dbError;

           
            if (!appData) {
                showToast("Authenticated. Completing profile...", "info");
                setTimeout(() => { window.location.href = "register.html"; }, 1500);
                return;
            }

            if (appData.status === 'Approved') {
                showToast("Access Granted. Redirecting...", "success");
                setTimeout(() => { window.location.href = "dashboard.html"; }, 1000);
            } else {
                await _supabase.auth.signOut();
                showToast(`Status: ${appData.status}. Access restricted.`, "info");
                resetLoginUI();
            }

        } catch (err) {
            console.error("Status Check Error:", err);
            showToast("Account verification failed.", "error");
            resetLoginUI();
        }
    }

});