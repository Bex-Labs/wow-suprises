// Supabase API Integration for Wow Surprises - FIXED VERSION
// ✅ Corrected column names: surprise_date, surprise_time, recipient_address
// ✅ Proper mapping for all booking fields

// Initialize Supabase client (will use config from config.js)
let supabaseClient = null;

// Initialize the client
function initializeSupabase() {
    if (!window.SUPABASE_CONFIG) {
        console.error('Supabase configuration not found. Please check config.js');
        return null;
    }
    
    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(
            window.SUPABASE_CONFIG.url,
            window.SUPABASE_CONFIG.anonKey
        );
        console.log('✅ Supabase client initialized');
    }
    
    return supabaseClient;
}

// API namespace
const API = {
    // Initialize
    init() {
        return initializeSupabase();
    },

    // Authentication methods
    auth: {
        // Sign up new user
        async signUp(email, password, userData = {}) {
            const supabase = initializeSupabase();
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: userData.name,
                        phone: userData.phone,
                        ...userData
                    }
                }
            });
            
            if (error) throw error;
            
            // Store user in local storage
            if (data.user) {
                const userInfo = {
                    id: data.user.id,
                    email: data.user.email,
                    name: userData.name,
                    phone: userData.phone,
                    created_at: new Date().toISOString()
                };
                Storage.set('currentUser', userInfo);
            }
            
            return data;
        },

        // Sign in user
        async signIn(email, password, rememberMe = false) {
            const supabase = initializeSupabase();
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            // Store user info
            if (data.user) {
                const userInfo = {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
                    phone: data.user.user_metadata?.phone || '',
                    created_at: data.user.created_at
                };
                
                // Use localStorage or sessionStorage based on rememberMe
                if (rememberMe) {
                    Storage.set('currentUser', userInfo);
                } else {
                    SessionStorage.set('currentUser', userInfo);
                }
            }
            
            return data;
        },

        // Sign out user
        async signOut() {
            const supabase = initializeSupabase();
            if (!supabase) throw new Error('Supabase not initialized');

            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            // Clear local storage
            Storage.remove('currentUser');
            SessionStorage.remove('currentUser');
        },

        // Get current user from Supabase
        async getCurrentUser() {
            const supabase = initializeSupabase();
            if (!supabase) return null;

            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
                console.error('Error getting user:', error);
                return null;
            }
            return user;
        },

        // Get current session
        async getSession() {
            const supabase = initializeSupabase();
            if (!supabase) return null;

            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Error getting session:', error);
                return null;
            }
            return session;
        },

        // Check if user is authenticated
        async isAuthenticated() {
            const session = await this.getSession();
            return session !== null;
        },

        // Logout (alias for signOut)
        async logout() {
            return await this.signOut();
        }
    },

    // Package methods
    packages: {
        // Get all packages
        async getPackages(filters = {}) {
            const supabase = initializeSupabase();
            if (!supabase) throw new Error('Supabase not initialized');

            let query = supabase
                .from('packages')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false });
            
            // Apply filters if provided
            if (filters.category) {
                query = query.eq('category', filters.category);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            return data || [];
        },

        // Get single package by ID
        async getPackage(packageId) {
            const supabase = initializeSupabase();
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase
                .from('packages')
                .select('*')
                .eq('id', packageId)
                .single();
            
            if (error) throw error;
            return data;
        }
    },

    // Booking methods
    bookings: {
        // Get all bookings for current user
        async getBookings(status = null) {
            const supabase = initializeSupabase();
            if (!supabase) throw new Error('Supabase not initialized');

            let query = supabase
                .from('bookings')
                .select('*')
                .order('created_at', { ascending: false });
            
            // Filter by status if provided and not 'all'
            if (status && status !== 'all') {
                query = query.eq('status', status);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            return data || [];
        },

        // Get single booking by ID
        async getBooking(bookingId) {
            const supabase = initializeSupabase();
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('id', bookingId)
                .single();
            
            if (error) throw error;
            return data;
        },

        // ========================================
        // FIXED: Create new booking with correct column names
        // ========================================
        async createBooking(bookingData) {
            const supabase = initializeSupabase();
            if (!supabase) throw new Error('Supabase not initialized');

            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            if (!user) throw new Error('User not authenticated');
            
            console.log('📝 Creating booking with data:', bookingData);
            
            // Transform field names from camelCase to snake_case for database
            // ✅ FIXED: Using correct column names that match the database schema
            const dbBooking = {
                user_id: user.id,
                
                // Package info
                package_name: bookingData.packageName || bookingData.package_name,
                package_price: parseFloat(bookingData.packagePrice || bookingData.package_price || bookingData.totalAmount || 0),
                
                // Recipient info
                recipient_name: bookingData.recipientName || bookingData.recipient_name,
                recipient_phone: bookingData.recipientPhone || bookingData.recipient_phone,
                recipient_address: bookingData.deliveryAddress || bookingData.recipient_address, // ✅ FIXED
                
                // ✅ FIXED: Use surprise_date and surprise_time columns
                surprise_date: bookingData.surpriseDate || bookingData.surprise_date,
                surprise_time: bookingData.surpriseTime || bookingData.surprise_time,
                
                // ✅ NEW: Additional surprise fields
                timezone: bookingData.timezone || 'WAT',
                flexible_timing: bookingData.flexibleTiming || false,
                
                // ✅ FIXED: Use personal_message (not special_message)
                personal_message: bookingData.personalMessage || bookingData.personal_message || null,
                special_requests: bookingData.specialRequests || bookingData.special_requests || null,
                
                // ✅ NEW: Add-ons support
                addons: bookingData.addons || [],
                
                // Status fields
                status: bookingData.status || 'pending',
                payment_status: bookingData.paymentStatus || bookingData.payment_status || 'pending',
                payment_reference: bookingData.paymentReference || bookingData.payment_reference || null,
                flutterwave_reference: bookingData.transactionId || bookingData.flutterwave_reference || null,
                
                // Total amount
                total_amount: parseFloat(bookingData.totalAmount || bookingData.packagePrice || 0)
            };
            
            console.log('💾 Database payload:', dbBooking);
            
            // Insert booking (booking_reference is auto-generated by trigger)
            const { data, error } = await supabase
                .from('bookings')
                .insert(dbBooking)
                .select()
                .single();
            
            if (error) {
                console.error('❌ Database insert error:', error);
                throw error;
            }
            
            console.log('✅ Booking created successfully:', data);
            return data;
        },

        // Update booking
        async updateBooking(bookingId, updates) {
            const supabase = initializeSupabase();
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase
                .from('bookings')
                .update(updates)
                .eq('id', bookingId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },

        // Cancel booking
        async cancelBooking(bookingId) {
            const supabase = initializeSupabase();
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase
                .from('bookings')
                .update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString()
                })
                .eq('id', bookingId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },

        // Get booking statistics
        async getBookingStats() {
            const supabase = initializeSupabase();
            if (!supabase) throw new Error('Supabase not initialized');

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await supabase
                .from('bookings')
                .select('status, package_price')
                .eq('user_id', user.id);
            
            if (error) throw error;
            
            const stats = {
                total: data.length,
                pending: data.filter(b => b.status === 'pending').length,
                confirmed: data.filter(b => b.status === 'confirmed').length,
                processing: data.filter(b => b.status === 'processing').length,
                delivered: data.filter(b => b.status === 'delivered').length,
                cancelled: data.filter(b => b.status === 'cancelled').length,
                totalSpent: data
                    .filter(b => b.status !== 'cancelled')
                    .reduce((sum, b) => sum + parseFloat(b.package_price || 0), 0)
            };
            
            return stats;
        },

        // Search bookings
        async searchBookings(searchTerm) {
            const supabase = initializeSupabase();
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .or(`booking_reference.ilike.%${searchTerm}%,recipient_name.ilike.%${searchTerm}%,package_name.ilike.%${searchTerm}%,recipient_phone.like.%${searchTerm}%`)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        },

        // Subscribe to real-time updates
        subscribeToUpdates(callback) {
            const supabase = initializeSupabase();
            if (!supabase) {
                console.error('Supabase not initialized');
                return null;
            }

            const user = getCurrentUser();
            if (!user) return null;
            
            const subscription = supabase
                .channel('bookings-changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'bookings',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload) => {
                        console.log('Booking updated:', payload);
                        if (callback) callback(payload);
                    }
                )
                .subscribe();
            
            return subscription;
        }
    }
};

// Initialize Supabase on load
document.addEventListener('DOMContentLoaded', () => {
    API.init();
});

// Export for use in other files
window.API = API;
window.getSupabaseClient = initializeSupabase;

console.log('✅ supabaseApi.js loaded - FIXED VERSION with correct column names');