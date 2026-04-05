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

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('applicationForm');
    const fileInput = document.getElementById('resume');
    const uploadLabel = document.querySelector('.custom-file-upload span');

    
    const { data: { session } } = await _supabase.auth.getSession();
    const googleUser = session ? session.user : null;

    
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            uploadLabel.textContent = this.files[0].name;
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirmPassword').value;

        try {
            submitBtn.disabled = true;
            submitBtn.innerText = "Processing Auth...";
            
            let finalUser;

            
            if (googleUser && googleUser.email === email) {
                
                const { data: updateData, error: updateError } = await _supabase.auth.updateUser({
                    password: password
                });
                if (updateError) throw updateError;
                finalUser = updateData.user;
            } else {
              
                if (password !== confirm) throw new Error("Passwords do not match!");
                const { data: authData, error: authError } = await _supabase.auth.signUp({
                    email: email,
                    password: password,
                });
                if (authError) throw authError;
                finalUser = authData.user;
            }

            if (!finalUser) throw new Error("Auth failed. No user found.");

            
            let resumeUrl = null;
            const resumeFile = fileInput.files[0];

            if (resumeFile) {
                submitBtn.innerText = "Uploading file...";
                
                
                const fileExt = resumeFile.name.split('.').pop();
                const fileName = `resume_${finalUser.id}_${Date.now()}.${fileExt}`;

                const { data: uploadData, error: uploadError } = await _supabase.storage
                    .from('resume')
                    .upload(fileName, resumeFile, {
                        cacheControl: '3600',
                        upsert: true 
                    });

                if (uploadError) {
                    console.error("Upload Error Details:", uploadError);
                    
                    showToast("File upload failed: " + uploadError.message, "error");
                } else {
                    const { data: urlData } = _supabase.storage
                        .from('resume')
                        .getPublicUrl(fileName);
                    resumeUrl = urlData.publicUrl;
                }
            }

           
            submitBtn.innerText = "Finalizing Application...";
            const { error: dbError } = await _supabase.from('applications').insert([{
                user_id: finalUser.id,
                first_name: document.getElementById('firstName').value.trim(),
                last_name: document.getElementById('lastName').value.trim(),
                email: email,
                contact: document.getElementById('contact').value,
                position: document.getElementById('position').value,
                department: document.getElementById('department').value,
                resume_url: resumeUrl, // This will be null if upload failed
                introduction: document.getElementById('intro').value,
                status: 'Pending',
                role: 'User'
            }]);

            if (dbError) throw dbError;

            showToast("Success! Redirecting...", "success");
            await _supabase.auth.signOut();
            setTimeout(() => { window.location.href = "index.html"; }, 2000);

        } catch (err) {
            console.error("Critical Error:", err);
            showToast(err.message, "error");
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Application";
        }
    });
});