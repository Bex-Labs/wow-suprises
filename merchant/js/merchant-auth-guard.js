/**
 * Merchant Auth Guard
 * Fixed: redirects to unified ../login.html instead of merchant-login.html
 * This eliminates the redirect loop caused by merchant-login.html → login.html → dashboard → loop
 */

(async function() {
  const currentPath  = window.location.pathname;
  const isLoginPage  = currentPath.includes('login.html'); // catches both login.html AND merchant-login.html

  // Already on a login page — don't do anything, let login.html handle it
  if (isLoginPage) return;

  // Wait for Supabase client to initialize (up to 500ms)
  let retries = 10;
  while (!window.sbClient && retries > 0) {
    await new Promise(r => setTimeout(r, 50));
    retries--;
  }

  if (!window.sbClient) {
    console.error('Auth Guard: Supabase client not found.');
    window.location.replace('../login.html');
    return;
  }

  try {
    const { data: { session }, error } = await window.sbClient.auth.getSession();

    if (error) throw error;

    if (!session) {
      // No session — redirect to unified login
      console.log('⛔ No active session, redirecting to login.');
      window.location.replace('../login.html');
      return;
    }

    // Session exists — verify it's a merchant account
    const role = session.user.user_metadata?.role;
    if (role && role !== 'merchant') {
      console.warn('⛔ Not a merchant account, redirecting to login.');
      await window.sbClient.auth.signOut();
      window.location.replace('../login.html');
      return;
    }

    console.log('✅ Merchant session active:', session.user.email);

  } catch (err) {
    console.error('Auth Guard Error:', err);
    window.location.replace('../login.html');
  }

})();
