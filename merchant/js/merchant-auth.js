/**
 * Merchant Authentication Functions
 * Handles all merchant authentication operations
 * FIXED VERSION - Simple object approach
 */

console.log('🔧 merchant-auth.js loading...');

// Check if supabase is loaded
if (typeof merchantSupabase === 'undefined' && typeof supabase === 'undefined') {
    console.error('❌ Supabase client not found! Make sure merchant-config.js is loaded first.');
}

// Create MerchantAuth as a simple object (not a class)
const MerchantAuth = {
    // Get supabase client
    getSupabase() {
        return window.merchantSupabase || window.supabase;
    },

    /**
     * Register a new merchant
     */
    register: async function(merchantData) {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Supabase client not available');
            }

            console.log('🔄 Starting merchant registration...');
            console.log('📧 Email:', merchantData.email);

            // Check if email already exists
            const { data: existingMerchant } = await supabase
                .from('merchants')
                .select('email')
                .eq('email', merchantData.email)
                .maybeSingle();

            if (existingMerchant) {
                throw new Error('Email already registered. Please login instead.');
            }

            // Create auth user
            console.log('📝 Creating auth user...');
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: merchantData.email,
                password: merchantData.password,
                options: {
                    data: {
                        user_type: 'merchant',
                        full_name: merchantData.ownerName
                    },
                    emailRedirectTo: `${window.location.origin}/merchant-login.html?type=signup`
                }
            });

            if (authError) {
                console.error('❌ Auth signup error:', authError);
                throw authError;
            }

            console.log('✅ Auth user created:', authData.user.id);

            // Create merchant profile
            console.log('📝 Creating merchant profile...');
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

            if (profileError) {
                console.error('❌ Profile creation error:', profileError);
                throw profileError;
            }

            console.log('✅ Merchant profile created:', merchantProfile.id);

            return {
                success: true,
                message: 'Registration successful! Please check your email to verify your account. Your account will be activated after admin approval.',
                data: merchantProfile
            };

        } catch (error) {
            console.error('❌ Registration error:', error);
            return {
                success: false,
                message: error.message || 'Registration failed. Please try again.'
            };
        }
    },

    /**
     * Login a merchant
     */
    login: async function(email, password) {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Supabase client not available');
            }

            console.log('🔄 Starting login...');
            console.log('📧 Email:', email);

            // Attempt login
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            console.log('✅ Auth login successful');

            // Get merchant profile
            const { data: merchantProfile, error: profileError } = await supabase
                .from('merchants')
                .select('*')
                .eq('email', email)
                .single();

            if (profileError) {
                console.error('❌ Merchant profile not found:', profileError);
                throw new Error('Merchant profile not found. Please contact support.');
            }

            // Check if merchant is active
            if (!merchantProfile.is_active) {
                await supabase.auth.signOut();
                throw new Error('Account pending approval. Please wait for admin approval.');
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
            if (!supabase) {
                throw new Error('Supabase client not available');
            }

            const { error } = await supabase.auth.signOut();
            
            if (error) throw error;
            
            // Clear local storage
            localStorage.removeItem('merchantData');
            localStorage.removeItem('merchantEmail');
            sessionStorage.removeItem('merchantData');
            
            console.log('✅ Logout successful');
            
            return {
                success: true,
                message: 'Logged out successfully'
            };
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            return {
                success: false,
                message: error.message || 'Logout failed'
            };
        }
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated: async function() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) return false;
            
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) return false;
            
            // Get user from session
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) return false;
            
            // Check if user is a merchant
            if (user.user_metadata?.user_type !== 'merchant') {
                return false;
            }
            
            // Check if merchant profile exists and is active
            const { data: merchantProfile } = await supabase
                .from('merchants')
                .select('is_active')
                .eq('user_id', user.id)
                .single()
                .catch(() => ({ data: null }));
            
            if (!merchantProfile || !merchantProfile.is_active) {
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
            
            const { data: merchant } = await supabase
                .from('merchants')
                .select('*')
                .eq('user_id', user.id)
                .single();
                
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
            if (!supabase) {
                throw new Error('Service not available');
            }

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/merchant-reset-password.html?type=recovery`
            });

            if (error) throw error;

            return {
                success: true,
                message: 'Password reset email sent. Please check your inbox.'
            };

        } catch (error) {
            console.error('❌ Reset password error:', error);
            return {
                success: false,
                message: error.message || 'Failed to send reset email'
            };
        }
    }
};

// Export MerchantAuth to window object
window.MerchantAuth = MerchantAuth;

// Confirm MerchantAuth is loaded
console.log('✅ MerchantAuth loaded successfully');
console.log('Available methods:', Object.keys(MerchantAuth));

// Verify all methods exist
const methods = ['login', 'register', 'logout', 'isAuthenticated', 'getCurrentMerchant', 'resetPassword'];
methods.forEach(method => {
    if (typeof MerchantAuth[method] === 'function') {
        console.log(`  ✅ ${method}: function`);
    } else {
        console.error(`  ❌ ${method}: NOT a function!`);
    }
});