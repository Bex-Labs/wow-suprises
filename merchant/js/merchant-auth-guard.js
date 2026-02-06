/**
 * Merchant Auth Guard
 * Ensures user is logged in before page content loads.
 */
(async function() {
    // Wait slightly to ensure config has run
    if (!window.sbClient) {
        console.warn("Auth Guard waiting for Supabase...");
        await new Promise(r => setTimeout(r, 50));
    }

    if (!window.sbClient) {
        console.error("Auth Guard Failed: Client missing.");
        window.location.href = 'merchant-login.html';
        return;
    }

    const { data: { session } } = await window.sbClient.auth.getSession();

    if (!session) {
        console.log("⛔ No active session. Redirecting...");
        window.location.href = 'merchant-login.html';
    } else {
        console.log("✅ Merchant Session Active:", session.user.email);
    }
})();