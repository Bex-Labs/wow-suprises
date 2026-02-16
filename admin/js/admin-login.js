/**
 * WOW Surprises - STRICT Admin Login Handler
 * ONLY ALLOWS ADMIN ACCOUNTS - NO CLIENT ACCESS!
 */

// Switch between Login and Register tabs
function switchAdminTab(tab) {
    const loginTab = document.querySelector('.admin-tab:first-child');
    const registerTab = document.querySelector('.admin-tab:last-child');
    const loginForm = document.getElementById('adminLoginForm');
    const registerForm = document.getElementById('adminRegisterForm');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    }
}

// Admin Login Form Handler
document.addEventListener('DOMContentLoaded', () => {
    
    // Check if already logged in AS ADMIN
    checkExistingAdminSession();
    
    // Setup login form submission
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        // Clone to remove any previous listeners that might cause double submits
        const newLoginForm = loginForm.cloneNode(true);
        loginForm.parentNode.replaceChild(newLoginForm, loginForm);
        newLoginForm.addEventListener('submit', handleAdminLoginSubmit);
    }
    
    // Setup register form submission
    const registerForm = document.getElementById('adminRegisterForm');
    if (registerForm) {
        const newRegisterForm = registerForm.cloneNode(true);
        registerForm.parentNode.replaceChild(newRegisterForm, registerForm);
        newRegisterForm.addEventListener('submit', handleAdminRegisterSubmit);
    }
    
    // Auto-focus email field
    const loginEmailField = document.getElementById('loginEmail');
    if (loginEmailField) {
        loginEmailField.focus();
    }
});

/**
 * Check if user is already logged in AS ADMIN
 */
async function checkExistingAdminSession() {
    try {
        if (typeof AdminAuth === 'undefined') return;
        
        const admin = await AdminAuth.getCurrentAdmin();
        
        if (admin && admin.role === 'admin') {
            // Already logged in as admin, redirect to dashboard
            showToast('Already logged in. Redirecting to admin dashboard...', 'info');
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1000);
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

/**
 * Handle ADMIN login form submission
 * STRICT: ONLY accepts accounts with role='admin'
 */
async function handleAdminLoginSubmit(e) {
    // FIX: THIS IS CRITICAL - STOPS THE RELOAD
    e.preventDefault();
    
    const form = e.target;
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText');
    const originalText = loginText ? loginText.textContent : 'Sign In';
    
    // Get form values
    const email = form.loginEmail.value.trim();
    const password = form.loginPassword.value;
    const rememberMe = form.rememberMe.checked;
    
    // Validation
    if (!email) {
        showToast('Please enter your email address', 'error');
        form.loginEmail.focus();
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        form.loginEmail.focus();
        return;
    }
    
    if (!password) {
        showToast('Please enter your password', 'error');
        form.loginPassword.focus();
        return;
    }
    
    // Show loading state
    if(loginBtn) loginBtn.disabled = true;
    if(loginText) loginText.textContent = 'Signing in...';
    
    try {
        console.log('🔐 ADMIN LOGIN: Attempting login for:', email);
        
        // Attempt login using admin-auth.js function via window.AdminAuth
        const session = await AdminAuth.adminLogin(email, password, rememberMe);
        
        console.log('✅ ADMIN LOGIN: Login successful!');
        
        // Success!
        showToast('Admin login successful! Redirecting to dashboard...', 'success');
        
        // Redirect to ADMIN dashboard
        setTimeout(() => {
            window.location.href = 'admin-dashboard.html';
        }, 1500);
        
    } catch (error) {
        // Show error
        console.error('❌ ADMIN LOGIN: Login error:', error);
        
        let errorMessage = error.message;
        
        // Customize error messages
        if (errorMessage.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password';
        } else if (errorMessage.includes('Email not confirmed')) {
            errorMessage = 'Please verify your email address';
        } else if (errorMessage.includes('Admin privileges required')) {
            errorMessage = '⛔ ACCESS DENIED!\n\nThis account does not have admin privileges.\n\nUse the CLIENT login page instead.';
        } else if (errorMessage.includes('Access denied')) {
            errorMessage = '⛔ ADMIN ACCESS ONLY!\n\nThis login is for administrators only.\nClient accounts cannot login here.';
        }
        
        showToast(errorMessage, 'error');
        
        // Reset button
        if(loginBtn) loginBtn.disabled = false;
        if(loginText) loginText.textContent = originalText;
        
        // Clear password field
        form.loginPassword.value = '';
        form.loginPassword.focus();
    }
}

/**
 * Handle ADMIN register form submission
 * Creates account with role='admin'
 */
async function handleAdminRegisterSubmit(e) {
    // FIX: THIS IS CRITICAL - STOPS THE RELOAD
    e.preventDefault();
    
    const form = e.target;
    const registerBtn = document.getElementById('registerBtn');
    const registerText = document.getElementById('registerText');
    const originalText = registerText ? registerText.textContent : 'Create Account';
    
    // Get form values
    const name = form.registerName.value.trim();
    const email = form.registerEmail.value.trim();
    const phone = form.registerPhone.value.trim();
    const password = form.registerPassword.value;
    const confirmPassword = form.registerConfirmPassword.value;
    const agreeTerms = form.agreeTerms.checked;
    
    // Validation
    if (!name) {
        showToast('Please enter your full name', 'error');
        form.registerName.focus();
        return;
    }
    
    if (!email) {
        showToast('Please enter your email address', 'error');
        form.registerEmail.focus();
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        form.registerEmail.focus();
        return;
    }
    
    if (!phone) {
        showToast('Please enter your phone number', 'error');
        form.registerPhone.focus();
        return;
    }
    
    if (!password) {
        showToast('Please enter a password', 'error');
        form.registerPassword.focus();
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        form.registerPassword.focus();
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        form.registerConfirmPassword.focus();
        return;
    }
    
    if (!agreeTerms) {
        showToast('Please agree to the terms and conditions', 'error');
        return;
    }
    
    // Show loading state
    if(registerBtn) registerBtn.disabled = true;
    if(registerText) registerText.textContent = 'Creating admin account...';
    
    try {
        console.log('📝 ADMIN REGISTER: Creating admin account for:', email);
        
        // Attempt registration using admin-auth.js function
        await AdminAuth.adminRegister({
            name: name,
            email: email,
            phone: phone,
            password: password
        });
        
        console.log('✅ ADMIN REGISTER: Registration successful!');
        
        // Success!
        showToast('Admin account created successfully! Redirecting to dashboard...', 'success');
        
        // Redirect to ADMIN dashboard
        setTimeout(() => {
            window.location.href = 'admin-dashboard.html';
        }, 2000);
        
    } catch (error) {
        // Show error
        console.error('❌ ADMIN REGISTER: Registration error:', error);
        
        let errorMessage = error.message;
        
        // Customize error messages
        if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
            errorMessage = 'An admin account with this email already exists';
        } else if (errorMessage.includes('weak password')) {
            errorMessage = 'Please use a stronger password';
        } else if (errorMessage.includes('fetch')) {
            errorMessage = 'Network Error: Please check your internet connection.';
        }
        
        showToast(errorMessage, 'error');
        
        // Reset button
        if(registerBtn) registerBtn.disabled = false;
        if(registerText) registerText.textContent = originalText;
    }
}

/**
 * Handle forgot password click
 */
function handleForgotPassword(e) {
    e.preventDefault();
    showToast('Password reset feature coming soon! Contact your system administrator.', 'info');
}

/**
 * Email validation helper
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Simple Toast fallback if utils.js isn't loaded
if (typeof showToast === 'undefined') {
    window.showToast = function(message, type) {
        const container = document.getElementById('toastContainer') || document.body;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'error' ? '#ef4444' : '#22c55e'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            font-family: system-ui, -apple-system, sans-serif;
            animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
}