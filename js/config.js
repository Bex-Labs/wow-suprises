// js/config.js

const SUPABASE_CONFIG = {
    url: 'https://znivkrreeqzvlqwutxzb.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaXZrcnJlZXF6dmxxd3V0eHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTQ1MjMsImV4cCI6MjA3NjU3MDUyM30.N6Ik08awwvORMYYKAA1BUj64VER3Kf1YUsm2xFE8His'
};

// --- THIS WAS MISSING: Actually Initialize the Connection ---
if (typeof supabase !== 'undefined') {
    // Create the client and make it global as 'window.sbClient'
    window.sbClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    console.log('✅ Supabase Client Initialized and Ready!');
} else {
    console.error('❌ Supabase Library not loaded! Make sure the script tag is in your HTML head.');
}

// Export for compatibility
window.SUPABASE_CONFIG = SUPABASE_CONFIG;