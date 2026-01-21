/**
 * WOW Surprises - Supabase Configuration for Admin System
 * 
 * ✅ CONFIGURED with your Supabase credentials
 */

// ✅ SUPABASE CREDENTIALS CONFIGURED
const SUPABASE_URL = 'https://znivkrreeqzvlqwutxzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaXZrcnJlZXF6dmxxd3V0eHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTQ1MjMsImV4cCI6MjA3NjU3MDUyM30.N6Ik08awwvORMYYKAA1BUj64VER3Kf1YUsm2xFE8His';

// Initialize Supabase client
let supabaseAdmin = null;

/**
 * Initialize Supabase client for admin
 */
function initSupabaseAdmin() {
    // Check if already initialized
    if (supabaseAdmin) {
        console.log('✅ Supabase already initialized');
        return supabaseAdmin;
    }
    
    // Check if Supabase library is loaded
    if (typeof window === 'undefined' || !window.supabase) {
        console.error('❌ Supabase library not loaded. Make sure you included the script tag.');
        showToast('Supabase library not loaded', 'error');
        return null;
    }
    
    // Check if credentials are configured
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.error('❌ Supabase credentials not configured!');
        console.error('Please update SUPABASE_URL and SUPABASE_ANON_KEY in js/supabase-admin-config.js');
        showToast('Please configure Supabase credentials', 'error');
        return null;
    }
    
    try {
        // Create Supabase client
        supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase admin client initialized successfully');
        console.log('Project URL:', SUPABASE_URL);
        return supabaseAdmin;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        showToast('Failed to connect to Supabase', 'error');
        return null;
    }
}

/**
 * Get Supabase admin client
 * @returns {Object} Supabase client
 */
function getSupabaseAdmin() {
    if (!supabaseAdmin) {
        supabaseAdmin = initSupabaseAdmin();
    }
    
    if (!supabaseAdmin) {
        console.error('❌ Supabase client not available');
        return null;
    }
    
    return supabaseAdmin;
}

/**
 * Check if Supabase is configured and ready
 */
function checkSupabaseConfig() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.warn('⚠️ Supabase not configured yet!');
        console.warn('Update js/supabase-admin-config.js with your credentials');
        return false;
    }
    return true;
}

// Auto-initialize when script loads
(function() {
    if (typeof window !== 'undefined') {
        // Wait for DOM and Supabase library to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initSupabaseAdmin);
        } else {
            // DOM already loaded
            setTimeout(initSupabaseAdmin, 100);
        }
    }
})();

// Make functions available globally
if (typeof window !== 'undefined') {
    window.getSupabaseAdmin = getSupabaseAdmin;
    window.initSupabaseAdmin = initSupabaseAdmin;
    window.checkSupabaseConfig = checkSupabaseConfig;
}