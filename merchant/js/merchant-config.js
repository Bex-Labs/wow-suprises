/**
 * Merchant Supabase Configuration
 */

const SUPABASE_URL = 'https://znivkrreeqzvlqwutxzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaXZrcnJlZXF6dmxxd3V0eHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTQ1MjMsImV4cCI6MjA3NjU3MDUyM30.N6Ik08awwvORMYYKAA1BUj64VER3Kf1YUsm2xFE8His';

if (typeof supabase !== 'undefined') {
    // Initialize Client
    window.sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Also assign to merchantSupabase for backward compatibility if needed
    window.merchantSupabase = window.sbClient;
    
    console.log('✅ Supabase Client Initialized (window.sbClient)');
} else {
    console.error('❌ CRITICAL: Supabase Library not loaded.');
}

window.MERCHANT_CONSTANTS = {
    USER_TYPE: 'merchant',
    APPROVAL_STATUS: {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        SUSPENDED: 'suspended'
    }
};