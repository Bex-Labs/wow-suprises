/**
 * WOW Surprises - Supabase Configuration for Admin System
 * ✅ FIX: Exposes 'window.sbClient' globally for all scripts to use
 */

// ✅ SUPABASE CREDENTIALS
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
        return null;
    }
    
    try {
        // Create Supabase client
        supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // ★ CRITICAL FIX: EXPOSE GLOBALLY FOR OTHER SCRIPTS ★
        window.sbClient = supabaseAdmin; 
        window.supabaseAdmin = supabaseAdmin; 

        console.log('✅ Supabase admin client initialized successfully');
        return supabaseAdmin;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        return null;
    }
}

/**
 * Get Supabase admin client
 */
function getSupabaseAdmin() {
    if (!supabaseAdmin) {
        supabaseAdmin = initSupabaseAdmin();
    }
    return supabaseAdmin;
}

// Auto-initialize when script loads
(function() {
    if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initSupabaseAdmin);
        } else {
            setTimeout(initSupabaseAdmin, 100);
        }
    }
})();

// Make functions available globally
if (typeof window !== 'undefined') {
    window.getSupabaseAdmin = getSupabaseAdmin;
    window.initSupabaseAdmin = initSupabaseAdmin;
}