/**
 * Merchant Authentication Functions
 * Handles all merchant authentication operations
 * FIXED VERSION - Blazing fast session checks & Smart Vercel Subfolder Routing
 */

console.log('🔧 merchant-auth.js loading...');

// Check if supabase is loaded
if (typeof merchantSupabase === 'undefined' && typeof supabase === 'undefined' && typeof sbClient === 'undefined') {
    console.error('❌ Supabase client not found! Make sure merchant-config.js is loaded first.');
}

const MerchantAuth = {
    // Get supabase client
    getSupabase() {
        return window.sbClient || window.merchantSupabase || window.supabase;
    },

    // Helper to get the correct folder path (works on localhost AND Vercel subfolders)
    getBasePath() {
        const currentPath = window.location.pathname;
        const folderPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        return `${window.location.origin}${folderPath}`;
    },

    /**
     * Register a new merchant
     */
    register: async function(merchantData) {
        try {
            const supabase = this.getSupabase();
            if (!supabase) throw new Error('Supabase client not available');

            console.log('🔄 Starting merchant registration...');

            // Dynamically calculate the login URL so it doesn't 404 on Vercel
            const loginRedirectUrl = `${this.getBasePath()}/merchant-login.html`;

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: merchantData.email,
                password: merchantData.password,
                options: {
                    data: {
                        user_type: 'merchant',
                        business_name: merchantData.businessName,
                        owner_name: merchantData.ownerName,
                        phone: merchantData.phone,
                        address: merchantData.address,
                        category: merchantData.category
                    },
                    // Routes verification emails perfectly to the Merchant Login page
                    emailRedirectTo: loginRedirectUrl
                }
            });

            if (authError) throw authError;
            
            if (authData.user && !authData.session) {
                return {
                    success: true,
                    message: 'Registration successful! Please check your email to verify your account.',
                    data: authData.user
                };
            }

            return { success: true, message: 'Registration successful!', data: authData.user };

        } catch (error) {
            console.error('❌ Registration error:', error);
            return { success: false, message: error.message || 'Registration failed.' };
        }
    },

    /**
     * Login a merchant
     */
    login: async function(email, password) {
        try {
            const supabase = this.getSupabase();
            if (!supabase) throw new Error('Supabase client not available');

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            const { data: merchantProfile, error: profileError } = await supabase
                .from('merchants')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (profileError || !merchantProfile) {
                throw new Error('Merchant profile not found. Please contact support.');
            }

            if (!merchantProfile.is_active) {
                console.warn("⚠️ Account is inactive but login permitted for view-only.");
            }

            console.log('✅ Login successful:', merchantProfile.business_name);

            // Cache the profile immediately upon login for instant access
            localStorage.setItem('merchantData', JSON.stringify(merchantProfile));

            return {
                success: true,
                message: 'Login successful!',
                merchant: merchantProfile
            };

        } catch (error) {
            console.error('❌ Login error:', error);
            return { success: false, message: error.message || 'Invalid email or password' };
        }
    },

    /**
     * Logout merchant
     */
    logout: async function() {
        try {
            const supabase = this.getSupabase();
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            // Clear all cached data
            localStorage.removeItem('merchantData');
            sessionStorage.removeItem('merchantData');
            
            return { success: true };
        } catch (error) {
            console.error('❌ Logout error:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Check if user is authenticated 
     * Blazing fast session check. No DB queries allowed here!
     */
    isAuthenticated: async function() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) return false;
            
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) return false;
            
            // Just verify the JWT token metadata. 
            if (session.user.user_metadata?.user_type !== 'merchant') return false;
            
            return true;
            
        } catch (error) {
            console.error('❌ Auth check error:', error);
            return false;
        }
    },

    /**
     * Get current merchant profile
     * Prioritize LocalStorage for instant loading
     */
    getCurrentMerchant: async function() {
        try {
            // 1. Try to load instantly from cache
            const cachedData = localStorage.getItem('merchantData');
            if (cachedData) {
                try {
                    return JSON.parse(cachedData);
                } catch (e) {
                    console.warn('Corrupt merchant cache, clearing...');
                    localStorage.removeItem('merchantData');
                }
            }

            // 2. Fallback to Database if cache is empty
            const supabase = this.getSupabase();
            if (!supabase) return null;
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            
            let { data: merchant, error } = await supabase
                .from('merchants')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
                
            if (!merchant) {
                const { data: merchantByEmail } = await supabase
                    .from('merchants')
                    .select('*')
                    .eq('email', user.email)
                    .maybeSingle();
                merchant = merchantByEmail;
            }
                
            // Cache it for next time
            if (merchant) {
                localStorage.setItem('merchantData', JSON.stringify(merchant));
            }

            return merchant;
        } catch (error) {
            console.error('❌ Get merchant error:', error);
            return null;
        }
    },

    /**
     * Reset password
     */
    resetPassword: async function(email) {
        try {
            const supabase = this.getSupabase();
            
            // Dynamically calculate the reset URL so it doesn't 404 on Vercel
            const resetRedirectUrl = `${this.getBasePath()}/merchant-reset-password.html?type=recovery`;

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                // Routes password reset emails back to the exact merchant reset page
                redirectTo: resetRedirectUrl
            });

            if (error) throw error;

            return { success: true, message: 'Password reset email sent.' };
        } catch (error) {
            console.error('❌ Reset password error:', error);
            return { success: false, message: error.message };
        }
    }
};

window.MerchantAuth = MerchantAuth;
console.log('✅ MerchantAuth loaded successfully');

// ==========================================
// GLOBAL LOGOUT FUNCTION
// Attached to the window so every HTML page can trigger it
// ==========================================
window.merchantLogout = async function() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            // Clean up any active realtime subscriptions if they exist on the current page
            if (typeof realtimeSubscription !== 'undefined' && realtimeSubscription) {
                MerchantAuth.getSupabase().removeChannel(realtimeSubscription);
            } else if (typeof realtimeSubscriptions !== 'undefined' && Array.isArray(realtimeSubscriptions)) {
                realtimeSubscriptions.forEach(sub => MerchantAuth.getSupabase().removeChannel(sub));
            }
            
            // Call the logout function on the MerchantAuth object
            await MerchantAuth.logout();
            
            if (typeof showToast === 'function') {
                showToast('Logged out successfully', 'success');
            }
            
            setTimeout(() => {
                // Using replace so they can't hit the back button into a logged-in page
                window.location.replace('merchant-login.html');
            }, 1000);
            
        } catch (error) {
            console.error('Logout error:', error);
            if (typeof showToast === 'function') {
                showToast('Logout failed', 'error');
            }
        }
    }
};