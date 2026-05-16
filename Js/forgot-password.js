
const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);


const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const submitBtn = document.getElementById('submitBtn');
const successState = document.getElementById('successState');
const toastContainer = document.getElementById('toast-container');
const emailInput = document.getElementById('email');


function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}


forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Sending...';

    try {
        const { data, error } = await _supabase.auth.resetPasswordForEmail(email, {
            
            redirectTo: window.location.origin + '/update-password.html',
        });

        if (error) throw error;

        showToast('Reset link has been sent!', 'success');
        
        
        forgotPasswordForm.style.display = 'none';
        successState.style.display = 'block';

    } catch (error) {
        showToast(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Send Reset Link';
    }
});