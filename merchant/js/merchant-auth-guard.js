// merchant-auth-guard.js
// Quick check to see if we have a session before loading the heavy UI
(function() {
    const sbKey = 'sb-znivkrreeqzvlqwutxzb-auth-token'; // Your Supabase project local storage key
    const session = localStorage.getItem(sbKey);
    
    if (!session) {
        console.log('No session found in guard, redirecting...');
        window.location.href = 'merchant-login.html';
    }
})();