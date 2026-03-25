// 1. INITIALIZE SUPABASE
const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- MODERN TOAST NOTIFICATION SYSTEM ---
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

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('applicationForm');
    const fileInput = document.getElementById('resume');
    const previewImg = document.getElementById('preview');
    const uploadLabel = document.querySelector('.custom-file-upload span');
    
    // --- PASSWORD TOGGLE LOGIC ---
    const toggleBtns = document.querySelectorAll('.password-toggle');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            // Toggle Icon (Eye vs Eye-Slash)
            this.innerHTML = type === 'password' ? 
                `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>` : 
                `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
        });
    });

    // --- FILE PREVIEW ---
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            uploadLabel.textContent = file.name;
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        }
    });

    // --- SUBMIT FORM ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirmPassword').value;

        if (password !== confirm) {
            showToast("Passwords do not match!", "error");
            return;
        }

        try {
            submitBtn.innerText = "Processing...";
            submitBtn.disabled = true;

            const { data: authData, error: authError } = await _supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (authError) throw authError;
            const user = authData.user;

            let resumeUrl = null;
            const resumeFile = fileInput.files[0];
            if (resumeFile) {
                const fileName = `${user.id}-${Date.now()}.${resumeFile.name.split('.').pop()}`;
                const { error: uploadError } = await _supabase.storage
                    .from('resume')
                    .upload(`applicants/${fileName}`, resumeFile);

                if (!uploadError) {
                    const { data: urlData } = _supabase.storage.from('resume').getPublicUrl(`applicants/${fileName}`);
                    resumeUrl = urlData.publicUrl;
                }
            }

            const { error: dbError } = await _supabase.from('applications').insert([{
                user_id: user.id,
                first_name: document.getElementById('firstName').value,
                last_name: document.getElementById('lastName').value,
                email: email,
                contact: document.getElementById('contact').value,
                position: document.getElementById('position').value,
                department: document.getElementById('department').value,
                resume_url: resumeUrl,
                introduction: document.getElementById('intro').value,
                status: 'Pending'
            }]);

            if (dbError) throw dbError;

            showToast("Registration Successful! Redirecting...", "success");
            setTimeout(() => window.location.href = "index.html", 2000);

        } catch (err) {
            showToast(err.message, "error");
        } finally {
            submitBtn.innerText = "Submit Application";
            submitBtn.disabled = false;
        }
    });
});