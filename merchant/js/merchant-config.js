/**
 * Merchant Supabase Configuration
 */

// Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://znivkrreeqzvlqwutxzb.supabase.co';
// FIXED: No spaces in the key
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaXZrcnJlZXF6dmxxd3V0eHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTQ1MjMsImV4cCI6MjA3NjU3MDUyM30.N6Ik08awwvORMYYKAA1BUj64VER3Kf1YUsm2xFE8His';

// Check if Supabase SDK is loaded
if (!window.supabase) {
    console.error('Supabase SDK not loaded');
} else {
    // Initialize Supabase client
    window.merchantSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Merchant Supabase client initialized');
}

// Merchant constants
window.MERCHANT_CONSTANTS = {
    USER_TYPE: 'merchant',
    APPROVAL_STATUS: {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        SUSPENDED: 'suspended'
    }
};

