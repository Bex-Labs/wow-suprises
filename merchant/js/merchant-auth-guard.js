/**
 * Merchant Auth Guard - Fixed version
 * Redirects to unified ../login.html to eliminate redirect loop
 */
(async function() {
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.includes('login.html');

  if (isLoginPage) return;

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
      console.log('⛔ No session, redirecting to login.');
      window.location.replace('../login.html');
      return;
    }

    const role = session.user.user_metadata?.role;
    if (role && role !== 'merchant') {
      console.warn('⛔ Not a merchant account.');
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
