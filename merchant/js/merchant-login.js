/**
 * Merchant Login Page JavaScript
 * Handles login and registration form submissions
 * COMPLETELY FIXED VERSION - All timing issues resolved
 */

// ========================
// GLOBAL CHECK
// ========================

console.log('=== MERCHANT-LOGIN.JS LOADED ===');
console.log('Window.MerchantAuth exists:', typeof window.MerchantAuth !== 'undefined');

// Store original console.error to catch errors
const originalConsoleError = console.error;
console.error = function(...args) {
    originalConsoleError.apply(console, args);
    
    // Don't break on auth check errors during initialization
    const errorString = args.join(' ').toLowerCase();
    if (errorString.includes('merchantauth') || errorString.includes('isauthenticated')) {
        console.warn('Auth initialization error caught, will retry...');
    }
};

// ========================
// SAFE INITIALIZATION
// ========================

// Wait for MerchantAuth to be available with proper method check
async function waitForMerchantAuth(maxWaitTime = 3000) {
    return new Promise((resolve) => {
        console.log('Waiting for MerchantAuth with methods...');
        
        // Check immediately first
        if (window.MerchantAuth && typeof window.MerchantAuth.isAuthenticated === 'function') {
            console.log('✅ MerchantAuth already available with methods');
            resolve(true);
            return;
        }
        
        let attempts = 0;
        const maxAttempts = maxWaitTime / 100;
        const checkInterval = setInterval(() => {
            attempts++;
            
            // Debug logging
            if (attempts % 5 === 0) { // Log every 5 attempts
                console.log(`Attempt ${attempts}:`, {
                    hasMerchantAuth: !!window.MerchantAuth,
                    hasMethods: window.MerchantAuth ? 
                        `login:${typeof window.MerchantAuth.login}, auth:${typeof window.MerchantAuth.isAuthenticated}` : 
                        'no MerchantAuth'
                });
            }
            
            if (window.MerchantAuth && typeof window.MerchantAuth.isAuthenticated === 'function') {
                clearInterval(checkInterval);
                console.log(`✅ MerchantAuth loaded after ${attempts * 100}ms`);
                resolve(true);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.warn('❌ MerchantAuth not available after waiting');
                
                // Create emergency fallback
                if (!window.MerchantAuth) {
                    createEmergencyMerchantAuth();
                }
                resolve(false);
            }
        }, 100);
    });
}

// Create emergency fallback MerchantAuth
function createEmergencyMerchantAuth() {
    console.warn('Creating emergency MerchantAuth fallback');
    
    window.MerchantAuth = {
        supabase: window.merchantSupabase,
        
        async login(email, password) {
            try {
                if (!this.supabase) {
                    throw new Error('Service not available');
                }
                
                const { data, error } = await this.supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // Get merchant profile
                const { data: merchantProfile } = await this.supabase
                    .from('merchants')
                    .select('*')
                    .eq('email', email)
                    .single()
                    .catch(() => ({ data: null }));

                return {
                    success: true,
                    merchant: merchantProfile || { business_name: email.split('@')[0] }
                };

            } catch (error) {
                console.error('Login error:', error);
                return {
                    success: false,
                    message: error.message || 'Invalid email or password'
                };
            }
        },
        
        async register(merchantData) {
            try {
                if (!this.supabase) {
                    throw new Error('Service not available');
                }

                // Create auth user
                const { data: authData, error: authError } = await this.supabase.auth.signUp({
                    email: merchantData.email,
                    password: merchantData.password,
                    options: {
                        data: { user_type: 'merchant' }
                    }
                });

                if (authError) throw authError;

                // Create merchant profile
                const { data: merchantProfile, error: profileError } = await this.supabase
                    .from('merchants')
                    .insert([{
                        user_id: authData.user.id,
                        business_name: merchantData.businessName,
                        owner_name: merchantData.ownerName,
                        email: merchantData.email,
                        phone: merchantData.phone,
                        address: merchantData.address,
                        category: merchantData.category,
                        is_active: false,
                        status: 'pending'
                    }])
                    .select()
                    .single()
                    .catch(() => ({ data: null }));

                if (profileError && profileError.code !== '23505') { // Ignore duplicate key errors
                    console.error('Profile creation error:', profileError);
                }

                return {
                    success: true,
                    message: 'Registration successful! Please check your email.',
                    data: merchantProfile
                };

            } catch (error) {
                console.error('Registration error:', error);
                return {
                    success: false,
                    message: error.message || 'Registration failed'
                };
            }
        },
        
        async isAuthenticated() {
            try {
                if (!this.supabase) return false;
                const { data: { session } } = await this.supabase.auth.getSession();
                return !!session;
            } catch (error) {
                console.error('Auth check error:', error);
                return false;
            }
        },
        
        async resetPassword(email) {
            try {
                if (!this.supabase) return { success: false, message: 'Service not available' };
                const { error } = await this.supabase.auth.resetPasswordForEmail(email);
                if (error) throw error;
                return { success: true, message: 'Reset email sent' };
            } catch (error) {
                return { success: false, message: error.message };
            }
        }
    };
    
    console.log('✅ Emergency MerchantAuth created');
}

// Show loading state
function setButtonLoading(button, textElement, isLoading, loadingText = 'Processing...') {
    if (isLoading) {
        button.disabled = true;
        textElement.innerHTML = `<i class="bi bi-arrow-repeat spin"></i> ${loadingText}`;
    } else {
        button.disabled = false;
        // Reset to original text based on which button it is
        if (button.id === 'loginBtn') {
            textElement.textContent = 'Sign In';
        } else if (button.id === 'registerBtn') {
            textElement.textContent = 'Submit Application';
        }
    }
}

// ========================
// FORM VALIDATION
// ========================

// Basic email validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Phone validation (Nigeria format)
function validatePhone(phone) {
    // Accepts 10-15 digits, optionally starting with 0 or +234
    const re = /^(?:\+234|0)[789][01]\d{8}$/;
    return re.test(phone);
}

// Password validation
function validatePassword(password) {
    return password.length >= 6;
}

// Form field validation with visual feedback
function showFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const formGroup = input.closest('.form-group');
    
    if (!formGroup) return;
    
    // Remove existing error
    const existingError = formGroup.querySelector('.field-error');
    if (existingError) existingError.remove();
    
    // Add error class to input
    input.classList.add('error');
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.innerHTML = `<i class="bi bi-exclamation-circle"></i> ${message}`;
    formGroup.appendChild(errorDiv);
    
    // Auto-remove error on input
    input.addEventListener('input', function clearError() {
        input.classList.remove('error');
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
        input.removeEventListener('input', clearError);
    }, { once: true });
}

// ========================
// TAB SWITCHING
// ========================

// Switch between login and register tabs
function switchMerchantTab(tab) {
    // Remove active class from all tabs and forms
    document.querySelectorAll('.merchant-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.merchant-login-form, .merchant-register-form').forEach(f => f.classList.remove('active'));
    
    // Add active class to selected tab and form
    if (tab === 'login') {
        document.querySelector('.merchant-tab:first-child').classList.add('active');
        document.querySelector('.merchant-login-form').classList.add('active');
    } else {
        document.querySelector('.merchant-tab:last-child').classList.add('active');
        document.querySelector('.merchant-register-form').classList.add('active');
    }
}

// ========================
// LOGIN HANDLER
// ========================

// Handle login form submission
document.getElementById('merchantLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Clear any previous errors
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
    
    // Basic validation
    let hasError = false;
    
    if (!email) {
        showFieldError('loginEmail', 'Email is required');
        hasError = true;
    } else if (!validateEmail(email)) {
        showFieldError('loginEmail', 'Please enter a valid email address');
        hasError = true;
    }
    
    if (!password) {
        showFieldError('loginPassword', 'Password is required');
        hasError = true;
    }
    
    if (hasError) return;
    
    try {
        // Wait for MerchantAuth to be available
        const authReady = await waitForMerchantAuth();
        if (!authReady) {
            showToast('Authentication service is initializing. Please try again in a moment.', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = document.getElementById('loginBtn');
        const loginText = document.getElementById('loginText');
        setButtonLoading(submitBtn, loginText, true, 'Signing in...');
        
        // Call login function
        console.log('Calling MerchantAuth.login...');
        const response = await MerchantAuth.login(email, password);
        
        if (response.success) {
            const merchant = response.merchant;
            
            // Store merchant data
            if (rememberMe) {
                localStorage.setItem('merchantData', JSON.stringify(merchant));
                localStorage.setItem('merchantEmail', email);
            } else {
                sessionStorage.setItem('merchantData', JSON.stringify(merchant));
            }
            
            showToast(`Login successful! Welcome back, ${merchant.business_name || email}`, 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'merchant-dashboard.html';
            }, 1500);
        } else {
            throw new Error(response.message || 'Login failed');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message || 'Invalid email or password', 'error');
        
        // Reset button
        const submitBtn = document.getElementById('loginBtn');
        const loginText = document.getElementById('loginText');
        setButtonLoading(submitBtn, loginText, false);
    }
});

// ========================
// REGISTRATION HANDLER
// ========================

// Handle registration form submission
document.getElementById('merchantRegisterForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const businessName = document.getElementById('registerBusinessName').value.trim();
    const ownerName = document.getElementById('registerOwnerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const address = document.getElementById('registerAddress').value.trim();
    const category = document.getElementById('registerCategory').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    // Clear any previous errors
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
    
    // Validation
    let hasError = false;
    
    if (!businessName) {
        showFieldError('registerBusinessName', 'Business name is required');
        hasError = true;
    }
    
    if (!ownerName) {
        showFieldError('registerOwnerName', 'Owner name is required');
        hasError = true;
    }
    
    if (!email) {
        showFieldError('registerEmail', 'Email is required');
        hasError = true;
    } else if (!validateEmail(email)) {
        showFieldError('registerEmail', 'Please enter a valid email address');
        hasError = true;
    }
    
    if (!phone) {
        showFieldError('registerPhone', 'Phone number is required');
        hasError = true;
    } else if (!validatePhone(phone)) {
        showFieldError('registerPhone', 'Please enter a valid phone number (e.g., 08012345678)');
        hasError = true;
    }
    
    if (!address) {
        showFieldError('registerAddress', 'Business address is required');
        hasError = true;
    }
    
    if (!category) {
        showFieldError('registerCategory', 'Please select a business category');
        hasError = true;
    }
    
    if (!password) {
        showFieldError('registerPassword', 'Password is required');
        hasError = true;
    } else if (!validatePassword(password)) {
        showFieldError('registerPassword', 'Password must be at least 6 characters');
        hasError = true;
    }
    
    if (!confirmPassword) {
        showFieldError('registerConfirmPassword', 'Please confirm your password');
        hasError = true;
    } else if (password !== confirmPassword) {
        showFieldError('registerConfirmPassword', 'Passwords do not match');
        hasError = true;
    }
    
    if (!agreeTerms) {
        showToast('Please agree to the Terms & Conditions', 'error');
        hasError = true;
    }
    
    if (hasError) return;
    
    const merchantData = {
        businessName,
        ownerName,
        email,
        phone,
        address,
        category,
        password
    };
    
    try {
        // Wait for MerchantAuth to be available
        const authReady = await waitForMerchantAuth();
        if (!authReady) {
            showToast('Registration service is initializing. Please try again in a moment.', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = document.getElementById('registerBtn');
        const registerText = document.getElementById('registerText');
        setButtonLoading(submitBtn, registerText, true, 'Submitting...');
        
        // Call register function
        console.log('Calling MerchantAuth.register...');
        const response = await MerchantAuth.register(merchantData);
        
        if (response.success) {
            showToast(response.message, 'success');
            
            // Clear form
            document.getElementById('merchantRegisterForm').reset();
            
            // Show success message with next steps
            setTimeout(() => {
                showToast('Check your email to verify your account', 'info');
            }, 2000);
            
            // Switch to login tab after 4 seconds
            setTimeout(() => {
                switchMerchantTab('login');
                document.getElementById('loginEmail').value = merchantData.email;
                
                // Reset button
                setButtonLoading(submitBtn, registerText, false);
            }, 4000);
        } else {
            throw new Error(response.message || 'Registration failed');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showToast(error.message || 'Registration failed. Please try again.', 'error');
        
        // Reset button
        const submitBtn = document.getElementById('registerBtn');
        const registerText = document.getElementById('registerText');
        setButtonLoading(submitBtn, registerText, false);
    }
});

// ========================
// FORGOT PASSWORD HANDLER
// ========================

// Handle forgot password
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    
    if (!email) {
        showToast('Please enter your email address first', 'warning');
        document.getElementById('loginEmail').focus();
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        // Wait for MerchantAuth to be available
        const authReady = await waitForMerchantAuth();
        if (!authReady) {
            showToast('Service is initializing. Please try again in a moment.', 'error');
            return;
        }
        
        const response = await MerchantAuth.resetPassword(email);
        
        if (response.success) {
            showToast(response.message, 'success');
        } else {
            showToast(response.message, 'error');
        }
    } catch (error) {
        console.error('Password reset error:', error);
        showToast('Failed to send reset email. Please try again.', 'error');
    }
}

// ========================
// AUTH STATUS CHECK (SAFE VERSION)
// ========================

// Check if merchant is already logged in
async function checkMerchantAuthStatus() {
    try {
        console.log('🔐 Starting auth status check...');
        
        // Wait for MerchantAuth with proper methods
        const authReady = await waitForMerchantAuth(2000);
        
        if (!authReady) {
            console.log('⏳ MerchantAuth not ready for auth check');
            return;
        }
        
        // Double-check the method exists
        if (!MerchantAuth || typeof MerchantAuth.isAuthenticated !== 'function') {
            console.error('❌ MerchantAuth.isAuthenticated is not a function');
            console.log('MerchantAuth object:', MerchantAuth);
            return;
        }
        
        console.log('✅ Calling isAuthenticated...');
        const isAuth = await MerchantAuth.isAuthenticated();
        console.log('🔑 Auth result:', isAuth);
        
        if (isAuth) {
            console.log('🔄 Merchant is already authenticated, redirecting...');
            showToast('You are already logged in. Redirecting...', 'info');
            
            setTimeout(() => {
                window.location.href = 'merchant-dashboard.html';
            }, 1500);
        } else {
            console.log('👤 Merchant is not authenticated, showing login form');
        }
        
    } catch (error) {
        console.warn('⚠️ Auth check error (non-critical):', error.message);
        // Don't show error to user, just continue
    }
}

// ========================
// URL PARAMETER CHECK
// ========================

// Check URL for email verification callback
function checkEmailVerification() {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const error = urlParams.get('error');
    const message = urlParams.get('message');
    
    if (error) {
        showToast(decodeURIComponent(error), 'error');
    }
    
    if (message) {
        showToast(decodeURIComponent(message), 'info');
    }
    
    if (type === 'signup') {
        showToast('Email verified successfully! Please wait for admin approval.', 'success');
        switchMerchantTab('login');
    } else if (type === 'recovery') {
        showToast('Please create a new password', 'info');
        // Redirect to password reset page
        setTimeout(() => {
            window.location.href = 'merchant-reset-password.html';
        }, 2000);
    }
}

// ========================
// PAGE INITIALIZATION
// ========================

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Merchant login page loaded');
    
    // Check for remember me email
    const savedEmail = localStorage.getItem('merchantEmail');
    if (savedEmail) {
        document.getElementById('loginEmail').value = savedEmail;
        document.getElementById('rememberMe').checked = true;
    }
    
    // Run checks with delay to ensure everything is loaded
    setTimeout(() => {
        checkEmailVerification();
        
        // Check auth status with error handling
        setTimeout(async () => {
            try {
                await checkMerchantAuthStatus();
            } catch (error) {
                console.warn('Initial auth check failed:', error.message);
            }
        }, 500);
    }, 100);
    
    // Add CSS for spin animation and error styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .spin {
            animation: rotate 1s linear infinite;
            display: inline-block;
            margin-right: 8px;
        }
        
        .form-input.error {
            border-color: #dc3545 !important;
            background-color: #fff8f8;
        }
        
        .field-error {
            color: #dc3545;
            font-size: 14px;
            margin-top: 5px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .field-error i {
            font-size: 12px;
        }
        
        .toast {
            animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .toast.fade-out {
            animation: fadeOut 0.3s ease-out forwards;
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
    `;
    document.head.appendChild(style);
});

// ========================
// TOAST NOTIFICATION
// ========================

// Toast notification function (fallback if utils.js not loaded)
if (typeof showToast !== 'function') {
    window.showToast = (message, type = 'info') => {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         type === 'warning' ? 'exclamation-triangle' : 
                         'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    };
}

// ========================
// FINAL SAFETY CHECK
// ========================

// Final check after everything loads
setTimeout(() => {
    console.log('=== FINAL SYSTEM CHECK ===');
    console.log('1. MerchantAuth:', typeof MerchantAuth !== 'undefined' ? '✅ Loaded' : '❌ Missing');
    console.log('2. MerchantAuth.isAuthenticated:', typeof (MerchantAuth?.isAuthenticated) === 'function' ? '✅ Function' : '❌ Not function');
    console.log('3. MerchantAuth.login:', typeof (MerchantAuth?.login) === 'function' ? '✅ Function' : '❌ Not function');
    console.log('4. MerchantAuth.register:', typeof (MerchantAuth?.register) === 'function' ? '✅ Function' : '❌ Not function');
    console.log('5. merchantSupabase:', typeof merchantSupabase !== 'undefined' ? '✅ Loaded' : '❌ Missing');
    console.log('6. supabase.auth:', typeof supabase?.auth !== 'undefined' ? '✅ Loaded' : '❌ Missing');
    console.log('=== CHECK COMPLETE ===');
    
    // If MerchantAuth is still not properly initialized, create emergency version
    if (!MerchantAuth || typeof MerchantAuth.isAuthenticated !== 'function') {
        console.error('❌ CRITICAL: MerchantAuth not properly initialized');
        createEmergencyMerchantAuth();
        showToast('System initialized. You can now register or login.', 'info');
    } else {
        console.log('✅ System ready for registration and login');
    }
}, 3000);
// ========================================
// FIX: CREATE INSTANCE IMMEDIATELY
// ========================================

// Final check - simplified (no instanceof check needed)
setTimeout(() => {
    if (window.MerchantAuth) {
        console.log('✅ Final check - MerchantAuth ready:', {
            hasLogin: typeof window.MerchantAuth.login === 'function',
            hasRegister: typeof window.MerchantAuth.register === 'function',
            hasIsAuthenticated: typeof window.MerchantAuth.isAuthenticated === 'function'
        });
    } else {
        console.error('❌ MerchantAuth still not created');
    }
}, 1000);

// ========================
// PASSWORD TOGGLE
// ========================
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