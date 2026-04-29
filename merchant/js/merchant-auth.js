/**
 * merchant/js/merchant-auth.js
 * Merchant Authentication Functions
 *
 * FIX 1: isAuthenticated() replaced one-shot getSession() with
 *         onAuthStateChange so it waits for the client to fully hydrate
 *         before returning false. The old getSession() call returned null
 *         immediately after a cross-page navigation, before the new client
 *         instance had read the token from localStorage — causing a false
 *         "not logged in" result and triggering the redirect loop.
 *
 * FIX 2: Role check in isAuthenticated() now looks for user_metadata.role
 *         === 'merchant' (set by login.html and supabaseApi.js) in addition
 *         to the legacy user_metadata.user_type === 'merchant' field set by
 *         MerchantAuth.register(). Both are accepted so existing accounts
 *         and new accounts work.
 *
 * FIX 3: logout() now also clears 'currentUser' from both localStorage and
 *         sessionStorage — the key used by login.html — so no stale session
 *         data is left behind after sign-out.
 *
 * FIX 4: login() now stores the session under 'currentUser' (matching
 *         login.html's key) in addition to 'merchantData', so the auth guard
 *         and login.html's session check both see a consistent state.
 */

console.log('🔧 merchant-auth.js loading...');

if (typeof window.sbClient === 'undefined' &&
    typeof window.merchantSupabase === 'undefined' &&
    typeof window.supabase === 'undefined') {
  console.error('❌ Supabase client not found! Make sure merchant-config.js is loaded first.');
}

const MerchantAuth = {

  getSupabase() {
    return window.sbClient || window.merchantSupabase || null;
  },

  // Helper: resolves the correct base path on both localhost and Vercel subfolders
  getBasePath() {
    const p = window.location.pathname;
    return window.location.origin + p.substring(0, p.lastIndexOf('/'));
  },

  /**
   * Register a new merchant
   */
  register: async function (merchantData) {
    try {
      const supabase = this.getSupabase();
      if (!supabase) throw new Error('Supabase client not available');

      const loginRedirectUrl = `${this.getBasePath()}/merchant-login.html`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email:    merchantData.email,
        password: merchantData.password,
        options: {
          data: {
            // FIX: write BOTH role keys so every part of the codebase can find it
            role:          'merchant',
            user_type:     'merchant',
            full_name:     merchantData.ownerName,
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
          data:    authData.user
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
  login: async function (email, password) {
    try {
      const supabase = this.getSupabase();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

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

      // Cache under 'merchantData' for MerchantAuth consumers
      localStorage.setItem('merchantData', JSON.stringify(merchantProfile));

      // FIX: also write 'currentUser' so login.html's session check and
      //      merchant-auth-guard.js both see a consistent stored identity
      const currentUser = {
        id:           data.user.id,
        email:        data.user.email,
        name:         merchantProfile.owner_name || data.user.email.split('@')[0],
        businessName: merchantProfile.business_name,
        phone:        merchantProfile.phone || '',
        role:         'merchant'
      };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      return { success: true, message: 'Login successful!', merchant: merchantProfile };

    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, message: error.message || 'Invalid email or password' };
    }
  },

  /**
   * Logout merchant
   */
  logout: async function () {
    try {
      const supabase = this.getSupabase();
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      // FIX: clear ALL storage keys used across the codebase
      localStorage.removeItem('merchantData');
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('merchantData');
      sessionStorage.removeItem('currentUser');
    }
    return { success: true };
  },

  /**
   * Check if current user is an authenticated merchant.
   *
   * FIX: Uses a Promise wrapping onAuthStateChange instead of getSession()
   * so we wait for the Supabase client to fully hydrate its auth state from
   * localStorage before returning a verdict. The old getSession() call could
   * return null in the brief window after a cross-page navigation before the
   * new client instance had finished reading the stored token.
   */
  isAuthenticated: async function () {
    return new Promise((resolve) => {
      const supabase = this.getSupabase();
      if (!supabase) { resolve(false); return; }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        subscription.unsubscribe(); // one-shot — we only need the initial state

        if (!session || !session.user) { resolve(false); return; }

        const meta = session.user.user_metadata || {};
        // FIX: accept both role keys so legacy and new accounts both pass
        const isMerchant = meta.role === 'merchant' || meta.user_type === 'merchant';
        resolve(isMerchant);
      });
    });
  },

  /**
   * Get current merchant profile (cache-first)
   */
  getCurrentMerchant: async function () {
    try {
      // 1. Try cache first for instant load
      const cachedData = localStorage.getItem('merchantData');
      if (cachedData) {
        try { return JSON.parse(cachedData); }
        catch (e) {
          console.warn('Corrupt merchant cache, clearing...');
          localStorage.removeItem('merchantData');
        }
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
        const { data: merchantByEmail } = await supabase
          .from('merchants')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        merchant = merchantByEmail;
      }

      if (merchant) {
        localStorage.setItem('merchantData', JSON.stringify(merchant));
        return merchant;
      }

      // 3. Safety-net fallback: the merchants table has no row for this user
      //    (e.g. they signed up via the unified login.html which only creates an
      //    auth record). Build a minimal merchant object from user_metadata so
      //    the dashboard can render without looping back to login.
      //
      //    The _synthesized flag signals that no real DB row exists yet — the
      //    profile page should upsert the full record when the merchant saves.
      console.warn('⚠️ No merchants table row found for authenticated user — building from user_metadata');
      const meta = user.user_metadata || {};
      const fallback = {
        user_id:       user.id,
        email:         user.email,
        owner_name:    meta.full_name     || user.email.split('@')[0],
        business_name: meta.business_name || meta.full_name || user.email.split('@')[0],
        phone:         meta.phone         || '',
        role:          'merchant',
        is_active:     true,
        _synthesized:  true
      };
      localStorage.setItem('merchantData', JSON.stringify(fallback));
      return fallback;

    } catch (error) {
      console.error('❌ Get merchant error:', error);
      return null;
    }
  },

  /**
   * Reset password
   */
  resetPassword: async function (email) {
    try {
      const supabase = this.getSupabase();
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
console.log('✅ MerchantAuth loaded successfully');

// ─── GLOBAL LOGOUT ────────────────────────────────────────────────────────────

window.merchantLogout = async function () {
  if (confirm('Are you sure you want to logout?')) {
    try {
      // Clean up any active realtime subscriptions on the current page
      const supabase = MerchantAuth.getSupabase();
      if (supabase) {
        if (typeof realtimeSubscription !== 'undefined' && realtimeSubscription) {
          supabase.removeChannel(realtimeSubscription);
        } else if (typeof realtimeSubscriptions !== 'undefined' && Array.isArray(realtimeSubscriptions)) {
          realtimeSubscriptions.forEach(sub => supabase.removeChannel(sub));
        }
      }

      await MerchantAuth.logout();

      if (typeof showToast === 'function') showToast('Logged out successfully', 'success');

      setTimeout(() => window.location.replace('merchant-login.html'), 800);

    } catch (error) {
      console.error('Logout error:', error);
      if (typeof showToast === 'function') showToast('Logout failed', 'error');
    }
  }
};
