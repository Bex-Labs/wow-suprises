/**
 * Merchant Auth Guard
 * Ensures user is logged in before page content loads, prevents redirect loops.
 */
(async function() {
    // 1. Check which page we are currently on
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('merchant-login.html');

    // 2. Wait slightly to ensure Supabase config has run
    let retries = 10;
    while (!window.sbClient && retries > 0) {
        await new Promise(r => setTimeout(r, 50));
        retries--;
    }

    if (!window.sbClient) {
        console.error("Auth Guard Failed: Client missing.");
        if (!isLoginPage) window.location.replace('merchant-login.html');
        return;
    }

    try {
        // 3. Securely check session via Supabase
        const { data: { session }, error } = await window.sbClient.auth.getSession();

        if (error) throw error;

        // 4. The Routing Logic
        if (!session) {
            console.log("⛔ No active session.");
            // If they are NOT on the login page, kick them to login
            if (!isLoginPage) {
                window.location.replace('merchant-login.html');
            }
        } else {
            console.log("✅ Merchant Session Active:", session.user.email);
            // If they have a session but are sitting on the login page, push to dashboard
            if (isLoginPage) {
                window.location.replace('merchant-dashboard.html');
            }
        }
    } catch (error) {
        console.error("Auth Guard Error:", error);
        // Fallback: if auth fails entirely, kick to login (unless already there)
        if (!isLoginPage) {
            window.location.replace('merchant-login.html');
        }
    }
})();