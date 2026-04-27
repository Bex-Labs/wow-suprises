// merchant/js/merchant-auth-guard.js
// FIX: Replaced one-shot getSession() call with onAuthStateChange listener.
//
// WHY THIS FIXES THE LOOP:
//   The old pattern was:
//     const session = await getSession();
//     if (!session) redirect to login;
//
//   When a user was redirected here right after signing in on login.html,
//   the Supabase client on THIS page was a freshly-created instance
//   (from merchant-config.js). Even though the session token was already
//   written to localStorage by login.html's client, the new instance
//   hadn't yet hydrated its internal auth state. getSession() returned null
//   on that first call, the guard kicked the user back to login.html, which
//   then saw a valid session and sent them back — infinite loop.
//
//   onAuthStateChange fires AFTER the client has fully hydrated from
//   localStorage, so the session is always present when it's legitimately
//   there. This eliminates the false-null race entirely.

(function () {
  'use strict';

  // Resolve the Supabase client — reuse window.sbClient if already created
  // by merchant-config.js, otherwise create it now.
  function getClient() {
    if (window.sbClient) return window.sbClient;

    const cfg = window.MERCHANT_SUPABASE_CONFIG || window.SUPABASE_CONFIG;
    if (!cfg) {
      console.error('❌ merchant-auth-guard: No Supabase config found.');
      return null;
    }
    if (typeof window.supabase === 'undefined') {
      console.error('❌ merchant-auth-guard: Supabase library not loaded.');
      return null;
    }

    window.sbClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    return window.sbClient;
  }

  const LOGIN_URL  = '../login.html';
  const GUARD_PAGE = window.location.pathname; // e.g. /merchant/merchant-dashboard.html

  function redirectToLogin() {
    // Pass current page as returnUrl so login.html can send them back after sign-in
    const encoded = encodeURIComponent(GUARD_PAGE + window.location.search);
    window.location.replace(`${LOGIN_URL}?returnUrl=${encoded}`);
  }

  // Show the page body only once auth is confirmed, to avoid a flash
  // of the protected content before the guard has a chance to redirect.
  document.documentElement.style.visibility = 'hidden';

  function revealPage() {
    document.documentElement.style.visibility = '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const client = getClient();
    if (!client) {
      // Can't verify auth — fail safe by redirecting to login
      redirectToLogin();
      return;
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      // Unsubscribe after the first event — we only need the initial state.
      subscription.unsubscribe();

      if (!session || !session.user) {
        console.warn('merchant-auth-guard: No active session. Redirecting to login.');
        redirectToLogin();
        return;
      }

      const role = session.user.user_metadata?.role || 'customer';

      if (role !== 'merchant') {
        console.warn(`merchant-auth-guard: Expected role "merchant", got "${role}". Redirecting.`);
        redirectToLogin();
        return;
      }

      // ✅ Valid merchant session — reveal the page
      console.log('✅ merchant-auth-guard: Merchant session confirmed.');
      revealPage();

      // Expose merchant info globally for dashboard scripts to consume
      window.currentMerchant = {
        id:           session.user.id,
        email:        session.user.email,
        name:         session.user.user_metadata?.full_name  || session.user.email.split('@')[0],
        businessName: session.user.user_metadata?.business_name || 'My Business',
        phone:        session.user.user_metadata?.phone || '',
        role:         'merchant'
      };

      // Also keep localStorage in sync so other scripts that read it directly
      // always have an up-to-date entry.
      try {
        const stored = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!stored || stored.id !== session.user.id) {
          localStorage.setItem('currentUser', JSON.stringify(window.currentMerchant));
        }
      } catch (e) { /* non-critical */ }
    });
  });

})();

// ─── LOGOUT HELPER ───────────────────────────────────────────────────────────
// Called from sidebar "Logout" link via onclick="merchantLogout()"

async function merchantLogout() {
  try {
    const client = window.sbClient;
    if (client) await client.auth.signOut();
  } catch (e) {
    console.warn('Sign-out error (continuing anyway):', e);
  }
  localStorage.removeItem('currentUser');
  sessionStorage.removeItem('currentUser');
  window.location.href = '../login.html';
}
