/**
 * WOW Surprises - Admin Authentication (Supabase Integrated)
 * Handles admin login, registration, session management, and route protection with Supabase
 */

/**
 * Admin registration with Supabase
 * @param {Object} userData - User data {name, email, phone, password}
 * @returns {Promise<Object>} Admin session
 */
async function adminRegister(userData) {
    try {
        const sb = getSupabaseAdmin();
        
        if (!sb) {
            throw new Error('Supabase client not initialized');
        }
        
        console.log('🔐 Starting admin registration for:', userData.email);
        
        // Sign up with Supabase
        const { data: authData, error: authError } = await sb.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    full_name: userData.name,
                    phone: userData.phone,
                    role: 'admin' // Set role as admin in metadata
                },
                emailRedirectTo: window.location.origin + '/admin-dashboard-supabase.html'
            }
        });
        
        if (authError) {
            console.error('❌ Auth error:', authError);
            throw new Error(authError.message);
        }
        
        if (!authData.user) {
            throw new Error('Registration failed - no user returned');
        }
        
        console.log('✅ User created in Supabase Auth:', authData.user.id);
        
        // Wait a moment for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify profile was created and update role
        const { data: existingProfile, error: checkError } = await sb
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();
        
        if (checkError || !existingProfile) {
            console.log('⚠️ Profile not found, creating manually...');
            
            // Create profile manually with admin role
            const { data: newProfile, error: profileError } = await sb
                .from('profiles')
                .insert([{
                    id: authData.user.id,
                    email: userData.email,
                    full_name: userData.name,
                    name: userData.name,
                    phone: userData.phone,
                    role: 'admin',
                    permissions: ['all'],
                    status: 'active',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (profileError) {
                console.error('❌ Profile creation error:', profileError);
                throw new Error('Failed to create admin profile: ' + profileError.message);
            }
            
            console.log('✅ Profile created manually:', newProfile);
        } else {
            console.log('✅ Profile exists, updating role...');
            
            // Update existing profile to ensure admin role
            const { error: updateError } = await sb
                .from('profiles')
                .update({
                    role: 'admin',
                    permissions: ['all'],
                    status: 'active',
                    full_name: userData.name,
                    phone: userData.phone
                })
                .eq('id', authData.user.id);
            
            if (updateError) {
                console.error('❌ Profile update error:', updateError);
                throw new Error('Failed to set admin role: ' + updateError.message);
            }
            
            console.log('✅ Profile updated with admin role');
        }
        
        // Create admin session
        const adminSession = {
            id: authData.user.id,
            email: authData.user.email,
            name: userData.name,
            role: 'admin',
            permissions: ['all'],
            avatar: null,
            loginTime: new Date().toISOString(),
            supabaseSession: authData.session
        };
        
        // Store in sessionStorage
        sessionStorage.setItem('adminSession', JSON.stringify(adminSession));
        
        console.log('✅ Admin session created');
        
        // Log admin registration activity
        try {
            await logAdminActivity({
                admin_id: authData.user.id,
                action: 'register',
                details: 'New admin account created',
                user_agent: navigator.userAgent
            });
        } catch (logError) {
            console.warn('⚠️ Could not log activity:', logError);
            // Don't fail registration if logging fails
        }
        
        return adminSession;
        
    } catch (error) {
        console.error('❌ Admin registration error:', error);
        throw error;
    }
}

/**
 * Admin login with Supabase
 * @param {string} email 
 * @param {string} password 
 * @param {boolean} rememberMe 
 * @returns {Promise<Object>} Admin session
 */
async function adminLogin(email, password, rememberMe = false) {
    try {
        const sb = getSupabaseAdmin();
        
        if (!sb) {
            throw new Error('Supabase client not initialized');
        }
        
        console.log('🔐 Attempting login for:', email);
        
        // Sign in with Supabase
        const { data: authData, error: authError } = await sb.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (authError) {
            console.error('❌ Auth error:', authError.message);
            throw new Error(authError.message);
        }
        
        if (!authData.user) {
            throw new Error('Authentication failed - no user returned');
        }
        
        console.log('✅ Auth successful, user ID:', authData.user.id);
        
        // Get user profile to check if admin
        console.log('📋 Fetching user profile...');
        const { data: profile, error: profileError } = await sb
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();
        
        if (profileError) {
            console.error('❌ Profile fetch error:', profileError);
            // Sign out if profile fetch fails
            await sb.auth.signOut();
            throw new Error('Failed to fetch user profile: ' + profileError.message);
        }
        
        if (!profile) {
            console.error('❌ No profile found for user');
            await sb.auth.signOut();
            throw new Error('User profile not found. Please contact administrator.');
        }
        
        console.log('✅ Profile found:', {
            email: profile.email,
            role: profile.role,
            status: profile.status
        });
        
        // Check if user has admin role
        if (profile.role !== 'admin') {
            console.error('❌ User is not an admin. Role:', profile.role);
            // Sign out non-admin users
            await sb.auth.signOut();
            throw new Error('Access denied. Admin privileges required.');
        }
        
        console.log('✅ Admin role verified');
        
        // Check if account is active
        if (profile.status !== 'active') {
            console.error('❌ Account is not active. Status:', profile.status);
            await sb.auth.signOut();
            throw new Error('Your account has been suspended. Please contact administrator.');
        }
        
        // Create admin session object
        const adminSession = {
            id: authData.user.id,
            email: authData.user.email,
            name: profile.full_name || profile.name || 'Admin',
            role: profile.role,
            permissions: profile.permissions || ['all'],
            avatar: profile.avatar_url || null,
            loginTime: new Date().toISOString(),
            supabaseSession: authData.session
        };
        
        // Store in localStorage or sessionStorage
        if (rememberMe) {
            localStorage.setItem('adminSession', JSON.stringify(adminSession));
            console.log('✅ Session saved to localStorage');
        } else {
            sessionStorage.setItem('adminSession', JSON.stringify(adminSession));
            console.log('✅ Session saved to sessionStorage');
        }
        
        // Log admin login activity
        try {
            await logAdminActivity({
                admin_id: authData.user.id,
                action: 'login',
                details: 'Admin logged in successfully',
                ip_address: null,
                user_agent: navigator.userAgent
            });
            console.log('✅ Login activity logged');
        } catch (logError) {
            console.warn('⚠️ Could not log activity:', logError);
            // Don't fail login if logging fails
        }
        
        return adminSession;
        
    } catch (error) {
        console.error('❌ Admin login error:', error);
        throw error;
    }
}

/**
 * Get current admin session
 * @returns {Promise<Object|null>} Admin session or null
 */
async function getCurrentAdmin() {
    try {
        // Check stored session first
        let storedSession = sessionStorage.getItem('adminSession');
        if (!storedSession) {
            storedSession = localStorage.getItem('adminSession');
        }
        
        if (!storedSession) {
            return null;
        }
        
        const adminSession = JSON.parse(storedSession);
        
        // Verify with Supabase
        const sb = getSupabaseAdmin();
        const { data: { session }, error } = await sb.auth.getSession();
        
        if (error || !session) {
            // Clear invalid session
            sessionStorage.removeItem('adminSession');
            localStorage.removeItem('adminSession');
            return null;
        }
        
        // Verify user is still admin
        const { data: profile, error: profileError } = await sb
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
        
        if (profileError || !profile || profile.role !== 'admin') {
            // User is no longer admin, clear session
            await sb.auth.signOut();
            sessionStorage.removeItem('adminSession');
            localStorage.removeItem('adminSession');
            return null;
        }
        
        return adminSession;
        
    } catch (error) {
        console.error('Error getting current admin:', error);
        return null;
    }
}

/**
 * Check if current user is an admin
 * @returns {Promise<boolean>}
 */
async function isAdmin() {
    const admin = await getCurrentAdmin();
    return admin && admin.role === 'admin';
}

/**
 * Admin logout
 */
async function adminLogout() {
    try {
        const admin = await getCurrentAdmin();
        
        if (admin) {
            // Log logout activity
            await logAdminActivity({
                admin_id: admin.id,
                action: 'logout',
                details: 'Admin logged out',
                user_agent: navigator.userAgent
            });
        }
        
        // Sign out from Supabase
        const sb = getSupabaseAdmin();
        await sb.auth.signOut();
        
        // Clear local sessions
        sessionStorage.removeItem('adminSession');
        localStorage.removeItem('adminSession');
        
        // Show toast
        if (typeof showToast === 'function') {
            showToast('Logged out successfully', 'success');
        }
        
        // Redirect to admin login
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        if (typeof showToast === 'function') {
            showToast('Error logging out', 'error');
        }
    }
}

/**
 * Require admin authentication (for protected routes)
 * @returns {Promise<boolean>} True if authenticated
 */
async function requireAdminAuth() {
    try {
        const admin = await getCurrentAdmin();
        
        if (!admin) {
            if (typeof showToast === 'function') {
                showToast('Please login to access the admin dashboard', 'error');
            }
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 1500);
            return false;
        }
        
        // Check if user is admin
        if (admin.role !== 'admin') {
            if (typeof showToast === 'function') {
                showToast('Access denied. Admin privileges required.', 'error');
            }
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('Auth check error:', error);
        if (typeof showToast === 'function') {
            showToast('Authentication error', 'error');
        }
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 1500);
        return false;
    }
}

/**
 * Check admin permission
 * @param {string} permission 
 * @returns {Promise<boolean>}
 */
async function hasPermission(permission) {
    try {
        const admin = await getCurrentAdmin();
        
        if (!admin) return false;
        
        // Super admin has all permissions
        if (admin.permissions.includes('all')) return true;
        
        return admin.permissions.includes(permission);
        
    } catch (error) {
        console.error('Permission check error:', error);
        return false;
    }
}

/**
 * Log admin activity to Supabase
 * @param {Object} activity 
 */
async function logAdminActivity(activity) {
    try {
        const sb = getSupabaseAdmin();
        
        const activityLog = {
            admin_id: activity.admin_id,
            action: activity.action,
            details: activity.details || null,
            ip_address: activity.ip_address || null,
            user_agent: activity.user_agent || null,
            metadata: activity.metadata || null,
            created_at: new Date().toISOString()
        };
        
        const { error } = await sb
            .from('admin_activity_logs')
            .insert([activityLog]);
        
        if (error) {
            console.error('Failed to log activity:', error);
        }
        
    } catch (error) {
        console.error('Error logging admin activity:', error);
    }
}

/**
 * Get admin activity logs
 * @param {Object} filters 
 * @returns {Promise<Array>}
 */
async function getAdminActivityLogs(filters = {}) {
    try {
        const sb = getSupabaseAdmin();
        
        let query = sb
            .from('admin_activity_logs')
            .select('*')
            .order('created_at', { ascending: false });
        
        // Apply filters
        if (filters.adminId) {
            query = query.eq('admin_id', filters.adminId);
        }
        
        if (filters.action) {
            query = query.eq('action', filters.action);
        }
        
        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }
        
        if (filters.endDate) {
            query = query.lte('created_at', filters.endDate);
        }
        
        if (filters.limit) {
            query = query.limit(filters.limit);
        }
        
        const { data, error } = await query;
        
        if (error) {
            throw error;
        }
        
        return data || [];
        
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        return [];
    }
}

/**
 * Protect admin route
 * Call this at the top of every admin page
 */
async function protectAdminRoute() {
    // Only check if we're on an admin page
    if (document.body.classList.contains('admin-page')) {
        const isAuthenticated = await requireAdminAuth();
        
        if (!isAuthenticated) {
            // Redirect handled in requireAdminAuth
            return false;
        }
        
        // Display admin info in UI
        await displayAdminInfo();
        return true;
    }
    return true;
}

/**
 * Display admin info in the header
 */
async function displayAdminInfo() {
    try {
        const admin = await getCurrentAdmin();
        
        if (!admin) return;
        
        console.log('📝 Displaying admin info:', admin.name, admin.avatar);
        
        // Update all possible name element IDs
        const nameIds = ['adminName', 'adminUserName', 'adminDisplayName'];
        nameIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = admin.name || 'Admin';
            }
        });
        
        // Update all name elements by class
        const adminNameElements = document.querySelectorAll('.admin-user-name, .user-name');
        adminNameElements.forEach(el => {
            el.textContent = admin.name || 'Admin';
        });
        
        // Update all email displays
        const adminEmailElements = document.querySelectorAll('.admin-user-email, .user-email');
        adminEmailElements.forEach(el => {
            el.textContent = admin.email || '';
        });
        
        // Update avatar images
        const avatarContainers = document.querySelectorAll('.user-avatar');
        avatarContainers.forEach(container => {
            if (admin.avatar) {
                container.innerHTML = `<img src="${admin.avatar}" alt="${admin.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                container.innerHTML = '<i class="bi bi-person-circle"></i>';
            }
        });
        
        // Set avatar initials as fallback
        const adminAvatars = document.querySelectorAll('.admin-avatar-initials');
        adminAvatars.forEach(el => {
            const initials = (admin.name || 'A')
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            el.textContent = initials;
        });
        
        console.log('✅ Admin info displayed successfully');
        
    } catch (error) {
        console.error('Error displaying admin info:', error);
    }
}

/**
 * Check if user should have admin access
 */
async function checkAdminAccess() {
    try {
        const sb = getSupabaseAdmin();
        
        // Get current user
        const { data: { user }, error } = await sb.auth.getUser();
        
        if (error || !user) return false;
        
        // Check if user is admin
        const { data: profile, error: profileError } = await sb
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (profileError || !profile) return false;
        
        return profile.role === 'admin';
        
    } catch (error) {
        console.error('Error checking admin access:', error);
        return false;
    }
}

/**
 * Add admin navigation link to client pages (if user is admin)
 */
async function addAdminNavLink() {
    try {
        const hasAccess = await checkAdminAccess();
        
        if (!hasAccess) return;
        
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;
        
        // Check if admin link already exists
        if (document.querySelector('.admin-nav-link')) return;
        
        // Create admin link
        const adminLi = document.createElement('li');
        adminLi.className = 'admin-nav-link';
        adminLi.innerHTML = `
            <a href="admin-dashboard.html" class="btn-admin" style="
                background: #000;
                color: #fff;
                padding: 8px 20px;
                border-radius: 8px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s;
            ">
                <i class="bi bi-shield-check"></i>
                <span>Admin Dashboard</span>
            </a>
        `;
        
        // Insert at beginning of nav
        navLinks.insertBefore(adminLi, navLinks.firstChild);
        
    } catch (error) {
        console.error('Error adding admin nav link:', error);
    }
}

/**
 * 🚀 UPDATE GLOBAL BADGE (FIX FOR ZERO COUNT)
 * Fetches pending bookings and updates the sidebar badge
 */
async function updateGlobalBadge() {
    try {
        const sb = getSupabaseAdmin();
        
        // Count all bookings where status is 'pending'
        const { count, error } = await sb
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (error) throw error;

        // Find the badge element (it exists in the sidebar on every page)
        const badge = document.getElementById('pendingBookingsBadge');
        
        if (badge) {
            badge.textContent = count;
            
            // Show red badge if > 0
            if (count > 0) {
                badge.style.display = 'inline-flex';
                badge.style.background = '#dc2626';
                badge.style.color = 'white';
                badge.style.borderRadius = '50%';
                badge.style.padding = '2px 6px';
                badge.style.fontSize = '11px';
                badge.style.marginLeft = 'auto';
            } else {
                badge.style.display = 'none';
            }
        }

    } catch (error) {
        console.error('Error updating badge:', error);
    }
}

/**
 * 🔔 SETUP GLOBAL REALTIME (FIX FOR LIVE UPDATES)
 * Listens for new bookings on ANY page
 */
function setupGlobalRealtime() {
    const sb = getSupabaseAdmin();
    
    sb.channel('global-badge-updates')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bookings' },
            () => {
                // Refresh the badge immediately when DB changes
                updateGlobalBadge();
            }
        )
        .subscribe();
}

// Auto-protect admin routes on page load
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        const isAuth = await protectAdminRoute();
        await addAdminNavLink();
        
        // ✅ ADDED: Run badge logic if logged in
        if (isAuth) {
            updateGlobalBadge();
            setupGlobalRealtime();
        }
    });
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        adminLogin,
        adminRegister,
        adminLogout,
        getCurrentAdmin,
        isAdmin,
        requireAdminAuth,
        hasPermission,
        protectAdminRoute,
        logAdminActivity,
        getAdminActivityLogs,
        checkAdminAccess,
        updateGlobalBadge, // Exported
        setupGlobalRealtime // Exported
    };
}