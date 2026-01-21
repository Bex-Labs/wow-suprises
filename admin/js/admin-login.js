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
        loginForm.addEventListener('submit', handleAdminLoginSubmit);
    }
    
    // Setup register form submission
    const registerForm = document.getElementById('adminRegisterForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleAdminRegisterSubmit);
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
        const admin = await getCurrentAdmin();
        
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
    e.preventDefault();
    
    const form = e.target;
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText');
    
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
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        form.loginPassword.focus();
        return;
    }
    
    // Show loading state
    loginBtn.disabled = true;
    loginText.textContent = 'Signing in...';
    
    try {
        console.log('🔐 ADMIN LOGIN: Attempting login for:', email);
        
        // Attempt login using admin-auth.js function
        const session = await adminLogin(email, password, rememberMe);
        
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
        loginBtn.disabled = false;
        loginText.textContent = 'Sign In';
        
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
    e.preventDefault();
    
    const form = e.target;
    const registerBtn = document.getElementById('registerBtn');
    const registerText = document.getElementById('registerText');
    
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
    registerBtn.disabled = true;
    registerText.textContent = 'Creating admin account...';
    
    try {
        console.log('📝 ADMIN REGISTER: Creating admin account for:', email);
        
        // Attempt registration using admin-auth.js function
        await adminRegister({
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
        }
        
        showToast(errorMessage, 'error');
        
        // Reset button
        registerBtn.disabled = false;
        registerText.textContent = 'Create Admin Account';
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