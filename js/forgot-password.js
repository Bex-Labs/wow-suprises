document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgotPasswordForm');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('resetEmail');
            const email = emailInput.value.trim();
            const submitBtn = form.querySelector('button[type="submit"]');
            
            if (!email) {
                if(typeof showToast === 'function') showToast('Please enter your email address', 'error');
                else alert('Please enter your email address');
                return;
            }
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Sending...';
                
                // FIX: Use the updated window.sbClient instead of the old getSupabaseClient()
                const supabaseClient = window.sbClient || window.supabase;
                
                if (!supabaseClient) {
                    throw new Error("Database client not initialized. Please check your internet connection and refresh.");
                }
                
                // Send the email and route them to the actual reset page
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password.html`
                });

                if (error) throw error;
                
                if(typeof showToast === 'function') {
                    showToast('Reset link sent! Please check your email.', 'success');
                } else {
                    alert('Reset link sent! Please check your email.');
                }
                
                emailInput.value = ''; // Clear the input
                
                submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Sent Successfully';
                
            } catch (error) {
                console.error('❌ Forgot Password error:', error);
                
                if(typeof showToast === 'function') {
                    showToast(error.message, 'error');
                } else {
                    alert(error.message);
                }
                
                // Restore button
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-send"></i> Send Reset Link';
            }
        });
    }
});

// Helper for loading spinner
const spinStyle = document.createElement('style');
spinStyle.textContent = `
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; display: inline-block; }
`;
document.head.appendChild(spinStyle);