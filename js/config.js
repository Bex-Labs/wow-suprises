// Supabase Configuration - Wow Surprises
// VERIFIED WORKING KEY (from admin system)

const SUPABASE_CONFIG = {
    url: 'https://znivkrreeqzvlqwutxzb.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaXZrcnJlZXF6dmxxd3V0eHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTQ1MjMsImV4cCI6MjA3NjU3MDUyM30.N6Ik08awwvORMYYKAA1BUj64VER3Kf1YUsm2xFE8His'
};

// Export configuration
window.SUPABASE_CONFIG = SUPABASE_CONFIG;

console.log('✅ Supabase configuration loaded');
console.log('📍 Project URL:', SUPABASE_CONFIG.url);

// Verify key format
if (SUPABASE_CONFIG.anonKey && SUPABASE_CONFIG.anonKey.startsWith('eyJ')) {
    console.log('✅ API key format looks valid');
} else {
    console.error('❌ API key format looks invalid!');
}