/**
 * STRICT ADMIN AUTHENTICATION GUARD
 * ==================================
 * 
 * This script MUST be loaded FIRST in all admin pages.
 * Blocks access instantly if user is not authenticated.
 * 
 * CRITICAL: Place this as the FIRST script in <head> of every admin page!
 */

(function() {
    'use strict';
    
    console.log('🔒 Admin Auth Guard: Starting strict authentication check...');
    
    /**
     * Check if user has valid admin session
     */
    function hasValidAdminSession() {
        try {
            // Check sessionStorage first
            let session = sessionStorage.getItem('adminSession');
            
            // If not in sessionStorage, check localStorage
            if (!session) {
                session = localStorage.getItem('adminSession');
            }
            
            // No session found
            if (!session) {
                console.log('❌ No admin session found');
                return false;
            }
            
            // Parse session
            const adminSession = JSON.parse(session);
            
            // Validate session data
            if (!adminSession || !adminSession.id || !adminSession.email || !adminSession.role) {
                console.log('❌ Invalid session data');
                return false;
            }
            
            // Check if user is admin
            if (adminSession.role !== 'admin') {
                console.log('❌ User is not admin. Role:', adminSession.role);
                return false;
            }
            
            console.log('✅ Valid admin session found:', adminSession.email);
            return true;
            
        } catch (error) {
            console.error('❌ Error checking session:', error);
            return false;
        }
    }
    
    /**
     * Redirect to admin login page
     */
    function redirectToLogin() {
        console.log('🔄 Redirecting to admin login...');
        
        // Prevent any page content from loading
        document.documentElement.style.display = 'none';
        
        // Clear any stored sessions
        sessionStorage.removeItem('adminSession');
        localStorage.removeItem('adminSession');
        
        // Redirect immediately
        const loginUrl = window.location.pathname.includes('/admin/') 
            ? 'admin-login.html' 
            : '/admin/admin-login.html';
        
        window.location.replace(loginUrl);
        
        // Stop script execution
        throw new Error('Authentication required');
    }
    
    /**
     * Block page load
     */
    function blockPageLoad() {
        // Hide entire page immediately
        document.documentElement.style.display = 'none';
        
        // Show loading screen
        const style = document.createElement('style');
        style.textContent = `
            .auth-guard-screen {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: #000;
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            .auth-guard-spinner {
                width: 50px;
                height: 50px;
                border: 4px solid rgba(255,255,255,0.2);
                border-top-color: #fff;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        const screen = document.createElement('div');
        screen.className = 'auth-guard-screen';
        screen.innerHTML = '<div class="auth-guard-spinner"></div>';
        document.body.appendChild(screen);
    }
    
    /**
     * Allow page load
     */
    function allowPageLoad() {
        console.log('✅ Authentication verified - allowing page load');
        document.documentElement.style.display = '';
    }
    
    // ==========================================
    // MAIN GUARD EXECUTION
    // ==========================================
    
    console.log('🔒 Checking admin authentication...');
    
    // Check if user is authenticated
    if (!hasValidAdminSession()) {
        console.log('❌ AUTHENTICATION FAILED - BLOCKING ACCESS');
        
        // Block page immediately
        blockPageLoad();
        
        // Redirect to login
        redirectToLogin();
        
    } else {
        console.log('✅ AUTHENTICATION PASSED - ALLOWING ACCESS');
        
        // Allow page to load
        allowPageLoad();
        
        // Additional verification with Supabase will happen in admin-auth.js
        // This is just the first line of defense
    }
    
})();

/**
 * INSTALLATION INSTRUCTIONS:
 * ==========================
 * 
 * Add this script as the FIRST script in <head> of EVERY admin page:
 * 
 * <head>
 *     <meta charset="UTF-8">
 *     <title>Admin Page</title>
 *     
 *     <!-- CRITICAL: Load auth guard FIRST! -->
 *     <script src="js/admin-auth-guard.js"></script>
 *     
 *     <!-- Then load other scripts -->
 *     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *     ...
 * </head>
 * 
 * This ensures NO admin page can be accessed without authentication!
 */