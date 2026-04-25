/**
 * Merchant Authentication Functions
 * Handles all merchant authentication operations
 * Updated: redirects now point to unified ../login.html
 */

console.log('🔧 merchant-auth.js loading...');

if (typeof merchantSupabase === 'undefined' && typeof supabase === 'undefined' && typeof sbClient === 'undefined') {
  console.error('❌ Supabase client not found! Make sure merchant-config.js is loaded first.');
}

// ─── Unified login URL (single source of truth) ───────────────────────────────
const MERCHANT_LOGIN_URL = '../login.html';

const MerchantAuth = {

  getSupabase() {
    return window.sbClient || window.merchantSupabase || window.supabase;
  },

  // Helper to get the correct folder path (works on localhost AND Vercel subfolders)
  getBasePath() {
    const currentPath = window.location.pathname;
    const folderPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    return `${window.location.origin}${folderPath}`;
  },

  /**
   * Register a new merchant
   */
  register: async function(merchantData) {
    try {
      const supabase = this.getSupabase();
      if (!supabase) throw new Error('Supabase client not available');

      console.log('🔄 Starting merchant registration...');

      // ✅ Email confirmation redirects to unified login
      const loginRedirectUrl = `${window.location.origin}/login.html`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: merchantData.email,
        password: merchantData.password,
        options: {
          data: {
            full_name:     merchantData.ownerName,
            role:          'merchant',
            business_name: merchantData.businessName,
            phone:         merchantData.phone,
            address:       merchantData.address,
            category:      merchantData.category
          },
          emailRedirectTo: loginRedirectUrl
        }
      });

      if (authError) throw authError;

      if (authData.user && !authData.session) {
        return {
          success: true,
          message: 'Registration successful! Please check your email to verify your account.',
          data: authData.user
        };
      }

      return { success: true, message: 'Registration successful!', data: authData.user };
    } catch (error) {
      console.error('❌ Registration error:', error);
      return { success: false, message: error.message || 'Registration failed.' };
    }
  },

  /**
   * Login a merchant
   */
  login: async function(email, password) {
    try {
      const supabase = this.getSupabase();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Verify role
      const userRole = data.user.user_metadata?.role;
      if (userRole && userRole !== 'merchant') {
        await supabase.auth.signOut();
        throw new Error('This account is not a merchant account.');
      }

      const { data: merchantProfile, error: profileError } = await supabase
        .from('merchants')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (profileError || !merchantProfile) {
        throw new Error('Merchant profile not found. Please contact support.');
      }

      if (!merchantProfile.is_active) {
        console.warn('⚠️ Account is inactive but login permitted for view-only.');
      }

      console.log('✅ Login successful:', merchantProfile.business_name);
      localStorage.setItem('merchantData', JSON.stringify(merchantProfile));

      return {
        success: true,
        message: 'Login successful!',
        merchant: merchantProfile
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, message: error.message || 'Invalid email or password' };
    }
  },

  /**
   * Logout merchant — redirects to unified login
   */
  logout: async function() {
    try {
      const supabase = this.getSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      localStorage.removeItem('merchantData');
      sessionStorage.removeItem('merchantData');
      localStorage.removeItem('currentUser');

      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Check if user is authenticated as merchant
   */
  isAuthenticated: async function() {
    try {
      const supabase = this.getSupabase();
      if (!supabase) return false;

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return false;

      const role = session.user.user_metadata?.role;
      if (role && role !== 'merchant') return false;

      return true;
    } catch (error) {
      console.error('❌ Auth check error:', error);
      return false;
    }
  },

  /**
   * Require merchant auth — redirects to unified login on failure
   */
  requireAuth: async function() {
    const authenticated = await this.isAuthenticated();
    if (!authenticated) {
      console.warn('⚠️ Not authenticated, redirecting to login...');
      // ✅ Redirect to unified login page
      window.location.replace(MERCHANT_LOGIN_URL);
      return false;
    }
    return true;
  },

  /**
   * Get current merchant profile — cache first
   */
  getCurrentMerchant: async function() {
    try {
      // 1. Cache first for instant load
      const cachedData = localStorage.getItem('merchantData');
      if (cachedData) {
        try { return JSON.parse(cachedData); }
        catch (e) { localStorage.removeItem('merchantData'); }
      }

      // 2. Fallback to DB
      const supabase = this.getSupabase();
      if (!supabase) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      let { data: merchant } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!merchant) {
        const { data: byEmail } = await supabase
          .from('merchants')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        merchant = byEmail;
      }

      if (merchant) localStorage.setItem('merchantData', JSON.stringify(merchant));
      return merchant;
    } catch (error) {
      console.error('❌ Get merchant error:', error);
      return null;
    }
  },

  /**
   * Reset password — redirects to merchant reset page
   */
  resetPassword: async function(email) {
    try {
      const supabase = this.getSupabase();
      // ✅ Reset still goes to merchant-specific reset page (that's fine)
      const resetRedirectUrl = `${this.getBasePath()}/merchant-reset-password.html?type=recovery`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetRedirectUrl
      });
      if (error) throw error;
      return { success: true, message: 'Password reset email sent.' };
    } catch (error) {
      console.error('❌ Reset password error:', error);
      return { success: false, message: error.message };
    }
  }
};

window.MerchantAuth = MerchantAuth;
console.log('✅ MerchantAuth loaded — Unified Login Version');

// ─── GLOBAL LOGOUT ────────────────────────────────────────────────────────────
window.merchantLogout = async function() {
  if (!confirm('Are you sure you want to logout?')) return;
  try {
    // Clean up realtime subscriptions
    if (typeof realtimeSubscription !== 'undefined' && realtimeSubscription) {
      MerchantAuth.getSupabase().removeChannel(realtimeSubscription);
    } else if (typeof realtimeSubscriptions !== 'undefined' && Array.isArray(realtimeSubscriptions)) {
      realtimeSubscriptions.forEach(sub => MerchantAuth.getSupabase().removeChannel(sub));
    }

    await MerchantAuth.logout();

    if (typeof showToast === 'function') showToast('Logged out successfully', 'success');

    // ✅ Redirect to unified login page
    setTimeout(() => { window.location.replace(MERCHANT_LOGIN_URL); }, 800);
  } catch (error) {
    console.error('Logout error:', error);
    if (typeof showToast === 'function') showToast('Logout failed', 'error');
    window.location.replace(MERCHANT_LOGIN_URL);
  }
};
