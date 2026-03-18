document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('merchantForgotForm');
    
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('resetEmail').value.trim();
            const resetBtn = document.getElementById('resetBtn');
            const resetText = document.getElementById('resetText');
            
            if (!email) {
                if (typeof showToast === 'function') showToast('Please enter your email', 'error');
                return;
            }
            
            try {
                // Show loading
                resetBtn.disabled = true;
                resetText.innerHTML = `<i class="bi bi-arrow-repeat" style="animation: spin 1s linear infinite;"></i> Sending...`;
                
                // Call Auth
                const response = await MerchantAuth.resetPassword(email);
                
                if (response.success) {
                    if (typeof showToast === 'function') {
                        showToast('Reset link sent! Please check your email.', 'success');
                    } else {
                        alert('Reset link sent! Please check your email.');
                    }
                    forgotForm.reset();
                } else {
                    throw new Error(response.message || 'Failed to send reset link');
                }
                
            } catch (error) {
                console.error('Reset Error:', error);
                if (typeof showToast === 'function') {
                    showToast(error.message, 'error');
                } else {
                    alert(error.message);
                }
            } finally {
                // Restore button
                resetBtn.disabled = false;
                resetText.textContent = 'Send Reset Link';
            }
        });
    }
});