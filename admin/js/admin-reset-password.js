document.addEventListener('DOMContentLoaded', () => {
    
    // Check if the URL has the Supabase recovery hash
    if (!window.location.hash || !window.location.hash.includes('type=recovery')) {
        if (typeof showToast === 'function') {
            showToast('Invalid or expired reset link. Please try again.', 'error');
        }
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 3000);
    }

    const updateForm = document.getElementById('adminUpdatePasswordForm');
    
    if (updateForm) {
        updateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmNewPassword').value;
            const updateBtn = document.getElementById('updateBtn');
            const updateText = document.getElementById('updateText');
            
            if (newPassword !== confirmPassword) {
                if (typeof showToast === 'function') showToast('Passwords do not match', 'error');
                return;
            }
            
            try {
                updateBtn.disabled = true;
                updateText.innerHTML = `<i class="bi bi-arrow-repeat" style="animation: spin 1s linear infinite;"></i> Updating...`;
                
                const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : (window.sbClient || window.supabase);
                
                // Supabase automatically uses the session established by the URL hash
                const { error } = await sb.auth.updateUser({
                    password: newPassword
                });
                
                if (error) throw error;
                
                if (typeof showToast === 'function') {
                    showToast('Password updated successfully! Redirecting...', 'success');
                } else {
                    alert('Password updated successfully!');
                }
                
                // Redirect to login page
                setTimeout(() => {
                    window.location.href = 'admin-login.html';
                }, 2000);
                
            } catch (error) {
                console.error('Update Error:', error);
                if (typeof showToast === 'function') {
                    showToast(error.message || 'Failed to update password', 'error');
                } else {
                    alert(error.message || 'Failed to update password');
                }
            } finally {
                updateBtn.disabled = false;
                updateText.textContent = 'Update Password';
            }
        });
    }
});

// Password Toggle Helper
window.togglePasswordVisibility = function(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        iconElement.classList.remove('bi-eye-slash');
        iconElement.classList.add('bi-eye');
    } else {
        input.type = 'password';
        iconElement.classList.remove('bi-eye');
        iconElement.classList.add('bi-eye-slash');
    }
};