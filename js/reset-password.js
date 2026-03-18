// Password Reset Logic

// Password Visibility Toggle Function
function togglePasswordVisibility(inputId, iconElement) {
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
}

// Handle Reset Password Form Submission
document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!newPassword || !confirmPassword) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = document.querySelector('#resetPasswordForm .btn-primary');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Updating Password...';
        
        const supabase = window.getSupabaseClient();
        
        // Supabase function to update the user's password using the active recovery session
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            console.error('❌ Password update error:', error);
            throw error;
        }
        
        console.log('✅ Password updated successfully');
        
        showToast('Password updated successfully! Redirecting to login...', 'success');
        
        // Redirect to login page after successful reset
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Reset error:', error);
        
        let errorMessage = 'Failed to update password. Please try again.';
        if (error.message.includes('Auth session missing')) {
            errorMessage = 'Your reset link is invalid or has expired. Please request a new one.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showToast(errorMessage, 'error');
        
        // Reset button
        const submitBtn = document.querySelector('#resetPasswordForm .btn-primary');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Update Password';
    }
});

// Add loading animation for spin class
const spinStyle = document.createElement('style');
spinStyle.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .spin {
        animation: spin 1s linear infinite;
        display: inline-block;
    }
`;
document.head.appendChild(spinStyle);