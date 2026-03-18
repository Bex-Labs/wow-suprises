// Login Page JavaScript - Supabase Integrated - FIXED VERSION

// Switch between login and register tabs
function switchTab(tab) {
    // Remove active class from all tabs and forms
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.login-form, .register-form').forEach(f => f.classList.remove('active'));
    
    // Add active class to selected tab and form
    if (tab === 'login') {
        document.querySelector('.tab:first-child').classList.add('active');
        document.querySelector('.login-form').classList.add('active');
    } else {
        document.querySelector('.tab:last-child').classList.add('active');
        document.querySelector('.register-form').classList.add('active');
    }
}

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

// NOTE: The "Forgot Password" prompt popup has been completely removed.
// The "Forgot Password" link in your HTML should now act as a normal link: 
// <a href="forgot-password.html" class="forgot-password">Forgot Password?</a>

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    console.log('🔐 LOGIN ATTEMPT:', email);
    
    // Basic validation
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = document.querySelector('.login-form .btn-primary');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Logging in...';
        
        console.log('🔐 Attempting login for:', email);
        
        // Call Supabase login directly
        const supabase = window.getSupabaseClient();
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (authError) {
            console.error('❌ Auth error:', authError);
            throw authError;
        }
        
        console.log('✅ Auth successful:', authData.user.email);
        
        // Get user profile to check role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();
        
        if (profileError) {
            console.error('❌ Profile error:', profileError);
            throw new Error('Could not load user profile');
        }
        
        console.log('✅ Profile loaded:', profile.role, profile.email);
        
        // Check if account is active
        if (profile.status !== 'active') {
            throw new Error('Your account is not active. Please contact support.');
        }
        
        // Save remember me preference
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('userEmail', email);
        }
        
        console.log('👤 User role:', profile.role);
        
        // Redirect based on role
        if (profile.role === 'admin') {
            console.log('🔑 Admin detected - redirecting to admin dashboard');
            showToast('Welcome Admin! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/admin/dashboard.html';
            }, 1000);
        } else if (profile.role === 'client' || profile.role === 'user') {
            console.log('👤 Client detected - redirecting to index');
            showToast('Login successful! Welcome back.', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            console.error('❌ Unknown role:', profile.role);
            throw new Error('Invalid account type');
        }
        
    } catch (error) {
        console.error('❌ Login error:', error);
        let errorMessage = 'Login failed. Please check your credentials.';
        
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please confirm your email address before logging in.';
        } else if (error.message.includes('User not found')) {
            errorMessage = 'No account found with this email.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showToast(errorMessage, 'error');
        
        // Reset button
        const submitBtn = document.querySelector('.login-form .btn-primary');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Login';
    }
});

// Handle registration form submission
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    console.log('📝 REGISTRATION ATTEMPT:', email);
    
    // Validation
    if (!name || !email || !phone || !password || !confirmPassword) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (!validatePhone(phone)) {
        showToast('Please enter a valid phone number', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    
    if (!agreeTerms) {
        showToast('Please agree to the Terms & Conditions', 'error');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = document.querySelector('.register-form .btn-primary');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Creating account...';
        
        console.log('📝 Creating account for:', email);
        
        // Get Supabase client directly
        const supabase = window.getSupabaseClient();
        
        // Sign up with Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    phone: phone,
                    role: 'client' // Ensure the trigger knows this is a client
                },
                // 💥 FIXED: Ensure email verification links send the user to the correct page
                emailRedirectTo: `${window.location.origin}/login.html`
            }
        });
        
        if (authError) {
            console.error('❌ Auth error:', authError);
            throw authError;
        }
        
        console.log('✅ Auth account created:', authData.user.id);
        
        // Create profile in profiles table with role='client'
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: authData.user.id,
                email: email,
                full_name: name,
                name: name,
                phone: phone,
                role: 'client',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            });
        
        if (profileError) {
            console.error('⚠️ Profile error:', profileError);
            console.log('Profile might have been created by database trigger');
        } else {
            console.log('✅ Client profile created with role=client');
        }
        
        showToast('Registration successful! You can now login.', 'success');
        
        // Switch to login tab and pre-fill email
        setTimeout(() => {
            switchTab('login');
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginEmail').focus();
            
            // Clear and reset register form
            document.getElementById('registerForm').reset();
            const submitBtn = document.querySelector('.register-form .btn-primary');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-person-plus"></i> Create Account';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        let errorMessage = 'Registration failed. Please try again.';
        
        if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
            errorMessage = 'This email is already registered. Please login instead.';
        } else if (error.message.includes('Password')) {
            errorMessage = 'Password is too weak. Use at least 6 characters.';
        } else if (error.message.includes('Email rate limit exceeded')) {
            errorMessage = 'Too many registration attempts. Please try again later.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showToast(errorMessage, 'error');
        
        // Reset button
        const submitBtn = document.querySelector('.register-form .btn-primary');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-person-plus"></i> Create Account';
    }
});

// Social login function with Google Auth only
async function socialLogin(provider) {
    if (provider === 'google') {
        try {
            console.log(`Initiating Google login...`);
            const supabase = window.getSupabaseClient();
            
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/index.html`
                }
            });
            
            if (error) throw error;
            
        } catch (error) {
            console.error('❌ Google login error:', error);
            showToast('Failed to initialize Google login. Please try again.', 'error');
        }
    }
}

// Pre-fill email if remembered
window.addEventListener('DOMContentLoaded', () => {
    const rememberedEmail = localStorage.getItem('userEmail');
    const rememberMe = localStorage.getItem('rememberMe');
    
    if (rememberMe === 'true' && rememberedEmail) {
        document.getElementById('loginEmail').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
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