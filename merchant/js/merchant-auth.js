/**
 * Merchant Authentication Functions
 * Handles all merchant authentication operations
 * FIXED VERSION - Removes .catch() chaining errors
 */

console.log('🔧 merchant-auth.js loading...');

// Check if supabase is loaded
if (typeof merchantSupabase === 'undefined' && typeof supabase === 'undefined' && typeof sbClient === 'undefined') {
    console.error('❌ Supabase client not found! Make sure merchant-config.js is loaded first.');
}

// Create MerchantAuth as a simple object (not a class)
const MerchantAuth = {
    // Get supabase client
    getSupabase() {
        // --- UPDATE: Added window.sbClient to the check ---
        return window.sbClient || window.merchantSupabase || window.supabase;
    },

    /**
     * Register a new merchant
     */
    register: async function(merchantData) {
        try {
            const supabase = this.getSupabase();
            if (!supabase) throw new Error('Supabase client not available');

            console.log('🔄 Starting merchant registration...');

            // Check if email already exists
            const { data: existingMerchant } = await supabase
                .from('merchants')
                .select('email')
                .eq('email', merchantData.email)
                .maybeSingle(); // Changed from single() to maybeSingle()

            if (existingMerchant) {
                throw new Error('Email already registered. Please login instead.');
            }

            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: merchantData.email,
                password: merchantData.password,
                options: {
                    data: {
                        user_type: 'merchant',
                        full_name: merchantData.ownerName
                    },
                    // Ensure this URL is correct for your setup
                    emailRedirectTo: `${window.location.origin}/merchant-login.html?type=signup`
                }
            });

            if (authError) throw authError;

            // Create merchant profile
            const { data: merchantProfile, error: profileError } = await supabase
                .from('merchants')
                .insert([{
                    user_id: authData.user.id,
                    business_name: merchantData.businessName,
                    owner_name: merchantData.ownerName,
                    email: merchantData.email,
                    phone: merchantData.phone,
                    address: merchantData.address,
                    category: merchantData.category,
                    is_active: false,
                    is_verified: false,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (profileError) throw profileError;

            return {
                success: true,
                message: 'Registration successful! Please check your email.',
                data: merchantProfile
            };

        } catch (error) {
            console.error('❌ Registration error:', error);
            return {
                success: false,
                message: error.message || 'Registration failed.'
            };
        }
    },

    /**
     * Login a merchant
     */
    login: async function(email, password) {
        try {
            const supabase = this.getSupabase();
            if (!supabase) throw new Error('Supabase client not available');

            // Attempt login
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            // Get merchant profile
            const { data: merchantProfile, error: profileError } = await supabase
                .from('merchants')
                .select('*')
                .eq('email', email) // Safer to look up by email match first
                .maybeSingle();

            if (profileError || !merchantProfile) {
                console.error('❌ Merchant profile not found:', profileError);
                throw new Error('Merchant profile not found. Please contact support.');
            }

            // Check if merchant is active
            if (!merchantProfile.is_active) {
                // Optional: You can uncomment this if you want to block login for inactive users
                // await supabase.auth.signOut();
                // throw new Error('Account pending approval. Please wait for admin approval.');
                console.warn("⚠️ Account is inactive but login permitted for view-only.");
            }

            console.log('✅ Login successful:', merchantProfile.business_name);

            return {
                success: true,
                message: 'Login successful!',
                merchant: merchantProfile
            };

        } catch (error) {
            console.error('❌ Login error:', error);
            return {
                success: false,
                message: error.message || 'Invalid email or password'
            };
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
            
            // Clear storage
            localStorage.removeItem('merchantData');
            sessionStorage.removeItem('merchantData');
            
            return { success: true };
        } catch (error) {
            console.error('❌ Logout error:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Check if user is authenticated (FIXED)
     */
    isAuthenticated: async function() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) return false;
            
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) return false;
            
            const { user } = session;
            
            // Check metadata
            if (user.user_metadata?.user_type !== 'merchant') return false;
            
            // FIX: Removed .catch() chain, used await + error check
            const { data: merchantProfile, error } = await supabase
                .from('merchants')
                .select('is_active')
                .eq('user_id', user.id)
                .maybeSingle(); // Use maybeSingle to avoid 406 error
            
            if (error || !merchantProfile) {
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Auth check error:', error);
            return false;
        }
    },

    /**
     * Get current merchant profile
     */
    getCurrentMerchant: async function() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) return null;
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            
            // Try ID match first
            let { data: merchant, error } = await supabase
                .from('merchants')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
                
            // Fallback to email match if ID link is missing (Safety net)
            if (!merchant) {
                const { data: merchantByEmail } = await supabase
                    .from('merchants')
                    .select('*')
                    .eq('email', user.email)
                    .maybeSingle();
                merchant = merchantByEmail;
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
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/merchant-reset-password.html?type=recovery`
            });

            if (error) throw error;

            return { success: true, message: 'Password reset email sent.' };
        } catch (error) {
            console.error('❌ Reset password error:', error);
            return { success: false, message: error.message };
        }
    }
};

// Export to window
window.MerchantAuth = MerchantAuth;

// Confirm load
console.log('✅ MerchantAuth loaded successfully');