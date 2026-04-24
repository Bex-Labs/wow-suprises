/**
 * WOW Surprises - Admin Authentication (Supabase Integrated)
 * Updated: redirects now point to unified ../login.html
 */

// Helper to get the correct folder path (works on localhost AND Vercel subfolders)
function getBasePath() {
  const currentPath = window.location.pathname;
  const folderPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
  return `${window.location.origin}${folderPath}`;
}

// ─── Unified login URL (single source of truth) ───────────────────────────────
const ADMIN_LOGIN_URL = '../login.html';

/**
 * Admin registration with Supabase
 */
async function adminRegister(userData) {
  try {
    const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : (window.sbClient || window.supabase);
    if (!sb) throw new Error('Supabase client not initialized');

    console.log('🔐 Starting admin registration for:', userData.email);

    const loginRedirectUrl = `${window.location.origin}/login.html`;

    const { data: authData, error: authError } = await sb.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.name,
          phone:     userData.phone,
          role:      'admin'
        },
        emailRedirectTo: loginRedirectUrl
      }
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Registration failed - no user returned');

    console.log('✅ User created in Supabase Auth:', authData.user.id);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: existingProfile } = await sb
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (existingProfile) console.log('✅ Profile confirmed via Trigger');

    const adminSession = {
      id:              authData.user.id,
      email:           authData.user.email,
      name:            userData.name,
      role:            'admin',
      permissions:     ['all'],
      avatar:          null,
      loginTime:       new Date().toISOString(),
      supabaseSession: authData.session
    };

    sessionStorage.setItem('adminSession', JSON.stringify(adminSession));
    console.log('✅ Admin session created');

    try {
      if (typeof logAdminActivity === 'function') {
        await logAdminActivity({
          admin_id:   authData.user.id,
          action:     'register',
          details:    'New admin account created',
          user_agent: navigator.userAgent
        });
      }
    } catch (logError) { console.warn('⚠️ Could not log activity:', logError); }

    return adminSession;
  } catch (error) {
    console.error('❌ Admin registration error:', error);
    throw error;
  }
}

/**
 * Admin login with Supabase
 */
async function adminLogin(email, password, rememberMe = false) {
  try {
    const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : (window.sbClient || window.supabase);
    if (!sb) throw new Error('Supabase client not initialized');

    console.log('🔐 Attempting login for:', email);

    const { data: authData, error: authError } = await sb.auth.signInWithPassword({ email, password });
    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Authentication failed - no user returned');

    console.log('✅ Auth successful, user ID:', authData.user.id);

    const { data: profile, error: profileError } = await sb
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) {
      await sb.auth.signOut();
      throw new Error('Failed to fetch user profile: ' + profileError.message);
    }

    // Fallback to user_metadata if no profile row yet
    let userRole = profile ? profile.role : authData.user.user_metadata?.role;
    let userName = profile
      ? (profile.full_name || profile.name)
      : authData.user.user_metadata?.full_name;

    if (!profile && !userRole) {
      await sb.auth.signOut();
      throw new Error('User profile not found. Please contact administrator.');
    }

    if (userRole !== 'admin') {
      await sb.auth.signOut();
      throw new Error('Access denied. Admin privileges required.');
    }

    if (profile && profile.status && profile.status !== 'active') {
      await sb.auth.signOut();
      throw new Error('Your account has been suspended. Please contact administrator.');
    }

    const adminSession = {
      id:              authData.user.id,
      email:           authData.user.email,
      name:            userName || 'Admin',
      role:            'admin',
      permissions:     profile?.permissions || ['all'],
      avatar:          profile?.avatar_url || null,
      loginTime:       new Date().toISOString(),
      supabaseSession: authData.session
    };

    if (rememberMe) {
      localStorage.setItem('adminSession', JSON.stringify(adminSession));
    } else {
      sessionStorage.setItem('adminSession', JSON.stringify(adminSession));
    }

    try {
      if (typeof logAdminActivity === 'function') {
        await logAdminActivity({
          admin_id:   authData.user.id,
          action:     'login',
          details:    'Admin logged in successfully',
          ip_address: null,
          user_agent: navigator.userAgent
        });
      }
    } catch (logError) { console.warn('⚠️ Could not log activity:', logError); }

    return adminSession;
  } catch (error) {
    console.error('❌ Admin login error:', error);
    throw error;
  }
}

/**
 * Get current admin session
 */
async function getCurrentAdmin() {
  try {
    let storedSession = sessionStorage.getItem('adminSession') || localStorage.getItem('adminSession');
    if (!storedSession) return null;

    const adminSession = JSON.parse(storedSession);

    const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : (window.sbClient || window.supabase);
    const { data: { session }, error } = await sb.auth.getSession();

    if (error || !session) {
      sessionStorage.removeItem('adminSession');
      localStorage.removeItem('adminSession');
      return null;
    }

    const { data: profile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profile && profile.role !== 'admin') {
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
 */
async function isAdmin() {
  const admin = await getCurrentAdmin();
  return admin && admin.role === 'admin';
}

/**
 * Admin logout — redirects to unified login page
 */
async function adminLogout() {
  try {
    const admin = await getCurrentAdmin();

    if (admin) {
      try {
        if (typeof logAdminActivity === 'function') {
          await logAdminActivity({
            admin_id:   admin.id,
            action:     'logout',
            details:    'Admin logged out',
            user_agent: navigator.userAgent
          });
        }
      } catch(e) { console.warn('Log failed'); }
    }

    const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : (window.sbClient || window.supabase);
    await sb.auth.signOut();

    sessionStorage.removeItem('adminSession');
    localStorage.removeItem('adminSession');
    localStorage.removeItem('currentUser');

    if (typeof showToast === 'function') showToast('Logged out successfully', 'success');

    // ✅ Redirect to unified login page
    setTimeout(() => { window.location.href = ADMIN_LOGIN_URL; }, 800);

  } catch (error) {
    console.error('Logout error:', error);
    if (typeof showToast === 'function') showToast('Error logging out', 'error');
    window.location.href = ADMIN_LOGIN_URL;
  }
}

/**
 * Require admin authentication — redirects to unified login on failure
 */
async function requireAdminAuth() {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      if (typeof showToast === 'function') showToast('Please login to access the admin dashboard', 'error');
      // ✅ Redirect to unified login page
      setTimeout(() => { window.location.href = ADMIN_LOGIN_URL; }, 1200);
      return false;
    }

    if (admin.role !== 'admin') {
      if (typeof showToast === 'function') showToast('Access denied. Admin privileges required.', 'error');
      // ✅ Redirect to unified login page
      setTimeout(() => { window.location.href = ADMIN_LOGIN_URL; }, 1200);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Auth check error:', error);
    if (typeof showToast === 'function') showToast('Authentication error', 'error');
    // ✅ Redirect to unified login page
    setTimeout(() => { window.location.href = ADMIN_LOGIN_URL; }, 1200);
    return false;
  }
}

/**
 * Check admin permission
 */
async function hasPermission(permission) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return false;
    if (admin.permissions && admin.permissions.includes('all')) return true;
    return admin.permissions && admin.permissions.includes(permission);
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Log admin activity to Supabase
 */
async function logAdminActivity(activity) {
  try {
    const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : (window.sbClient || window.supabase);
    const { error } = await sb.from('admin_activity_logs').insert([{
      admin_id:   activity.admin_id,
      action:     activity.action,
      details:    activity.details    || null,
      ip_address: activity.ip_address || null,
      user_agent: activity.user_agent || null,
      metadata:   activity.metadata   || null,
      created_at: new Date().toISOString()
    }]);
    if (error) console.warn('Failed to log activity (table may not exist):', error.message);
  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
}

/**
 * Get admin activity logs
 */
async function getAdminActivityLogs(filters = {}) {
  try {
    const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : (window.sbClient || window.supabase);
    let query = sb.from('admin_activity_logs').select('*').order('created_at', { ascending: false });
    if (filters.adminId)   query = query.eq('admin_id', filters.adminId);
    if (filters.action)    query = query.eq('action', filters.action);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate)   query = query.lte('created_at', filters.endDate);
    if (filters.limit)     query = query.limit(filters.limit);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }
}

/**
 * Protect admin route — call at top of every admin page
 */
async function protectAdminRoute() {
  if (document.body.classList.contains('admin-page')) {
    const isAuthenticated = await requireAdminAuth();
    if (!isAuthenticated) return false;
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

    // Update name elements
    ['adminName', 'adminUserName', 'adminDisplayName'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = admin.name || 'Admin';
    });
    document.querySelectorAll('.admin-user-name, .user-name').forEach(el => {
      el.textContent = admin.name || 'Admin';
    });
    document.querySelectorAll('.admin-user-email, .user-email').forEach(el => {
      el.textContent = admin.email || '';
    });

    // Avatar
    document.querySelectorAll('.user-avatar').forEach(container => {
      container.innerHTML = admin.avatar
        ? `<img src="${admin.avatar}" alt="${admin.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : '<span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 1;">person</span>';
    });

    // Initials
    document.querySelectorAll('.admin-avatar-initials').forEach(el => {
      el.textContent = (admin.name || 'A').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    });

  } catch (error) {
    console.error('Error displaying admin info:', error);
  }
}

/**
 * Check if user should have admin access
 */
async function checkAdminAccess() {
  try {
    const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : (window.sbClient || window.supabase);
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) return false;
    const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
    return profile?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
}

/**
 * Add admin nav link to client pages if user is admin
 */
async function addAdminNavLink() {
  try {
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) return;
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || document.querySelector('.admin-nav-link')) return;
    const adminLi = document.createElement('li');
    adminLi.className = 'admin-nav-link';
    adminLi.innerHTML = `
      <a href="admin/admin-dashboard.html" style="
        background: var(--color-primary, #6200EE);
        color: #fff;
        padding: 8px 20px;
        border-radius: 999px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        transition: all 0.2s;
      ">
        <span class="material-symbols-outlined" style="font-size:18px;">admin_panel_settings</span>
        Admin
      </a>`;
    navLinks.insertBefore(adminLi, navLinks.firstChild);
  } catch (error) {
    console.error('Error adding admin nav link:', error);
  }
}

/**
 * Update pending bookings badge in sidebar
 */
async function updateGlobalBadge() {
  try {
    const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : (window.sbClient || window.supabase);
    const { count, error } = await sb
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (error) throw error;
    const badge = document.getElementById('pendingBookingsBadge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

/**
 * Setup realtime listener for booking changes
 */
function setupGlobalRealtime() {
  const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : (window.sbClient || window.supabase);
  sb.channel('global-badge-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
      updateGlobalBadge();
    })
    .subscribe();
}

/**
 * Admin reset password
 */
async function resetAdminPassword(email) {
  try {
    const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : (window.sbClient || window.supabase);
    if (!sb) throw new Error('Supabase client not initialized');
    const resetRedirectUrl = `${getBasePath()}/admin-reset-password.html?type=recovery`;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: resetRedirectUrl });
    if (error) throw error;
    return { success: true, message: 'Password reset email sent.' };
  } catch (error) {
    console.error('❌ Reset password error:', error);
    return { success: false, message: error.message };
  }
}

// ─── Auto-protect on page load ────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await protectAdminRoute();
    await addAdminNavLink();
    if (isAuth) {
      updateGlobalBadge();
      setupGlobalRealtime();
    }
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.AdminAuth = {
    adminLogin, adminRegister, adminLogout,
    getCurrentAdmin, isAdmin, requireAdminAuth,
    hasPermission, protectAdminRoute,
    logAdminActivity, getAdminActivityLogs,
    checkAdminAccess, updateGlobalBadge,
    setupGlobalRealtime, resetAdminPassword, getBasePath
  };

  // Also expose top-level for legacy calls
  window.adminLogout         = adminLogout;
  window.getCurrentAdmin     = getCurrentAdmin;
  window.requireAdminAuth    = requireAdminAuth;
  window.protectAdminRoute   = protectAdminRoute;
  window.updateGlobalBadge   = updateGlobalBadge;
  window.setupGlobalRealtime = setupGlobalRealtime;
}
