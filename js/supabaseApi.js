// Supabase API Integration for Wow Surprises
// FIX: Always reuse window.sbClient — never create a second instance.
//      A second createClient() call produces a separate auth state object,
//      so getSession() on one instance returns null right after another
//      instance signs in, which is the root cause of the merchant auth loop.

// ─── CLIENT INIT ─────────────────────────────────────────────────────────────

function initializeSupabase() {
  // Reuse the client that config.js already created.
  if (window.sbClient) return window.sbClient;

  if (!window.SUPABASE_CONFIG) {
    console.error('❌ Supabase config not found. Check config.js loads before supabaseApi.js.');
    return null;
  }

  if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase library not loaded. Check the CDN <script> tag.');
    return null;
  }

  window.sbClient = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );

  console.log('✅ Supabase client initialized by supabaseApi.js');
  return window.sbClient;
}

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────

const Storage = {
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('localStorage write failed', e); }
  },
  get(key) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) { console.warn('localStorage remove failed', e); }
  }
};

const SessionStorage = {
  set(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('sessionStorage write failed', e); }
  },
  get(key) {
    try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
  },
  remove(key) {
    try { sessionStorage.removeItem(key); } catch (e) { console.warn('sessionStorage remove failed', e); }
  }
};

// ─── CURRENT USER HELPER ─────────────────────────────────────────────────────

function getCurrentUser() {
  return Storage.get('currentUser') || SessionStorage.get('currentUser') || null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

const API = {

  init() {
    return initializeSupabase();
  },

  // ── AUTH ───────────────────────────────────────────────────────────────────

  auth: {

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
            role: userData.role || 'customer',
            business_name: userData.business_name || null,
            ...userData
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const userInfo = {
          id: data.user.id,
          email: data.user.email,
          name: userData.name,
          phone: userData.phone,
          role: userData.role || 'customer',   // FIX: always persist role
          created_at: new Date().toISOString()
        };
        Storage.set('currentUser', userInfo);
      }

      return data;
    },

    async signIn(email, password, rememberMe = false) {
      const supabase = initializeSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        const userInfo = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
          phone: data.user.user_metadata?.phone || '',
          role: data.user.user_metadata?.role || 'customer',  // FIX: always persist role
          created_at: data.user.created_at
        };

        if (rememberMe) {
          Storage.set('currentUser', userInfo);
        } else {
          SessionStorage.set('currentUser', userInfo);
        }
      }

      return data;
    },

    async signOut() {
      const supabase = initializeSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      Storage.remove('currentUser');
      SessionStorage.remove('currentUser');
    },

    async getCurrentUser() {
      const supabase = initializeSupabase();
      if (!supabase) return null;

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) { console.error('Error getting user:', error); return null; }
      return user;
    },

    async getSession() {
      const supabase = initializeSupabase();
      if (!supabase) return null;

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) { console.error('Error getting session:', error); return null; }
      return session;
    },

    async isAuthenticated() {
      const session = await this.getSession();
      return session !== null;
    },

    async logout() {
      return await this.signOut();
    }
  },

  // ── PACKAGES ───────────────────────────────────────────────────────────────

  packages: {

    async getPackages(filters = {}) {
      const supabase = initializeSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      let query = supabase
        .from('packages')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

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

  // ── BOOKINGS ───────────────────────────────────────────────────────────────

  bookings: {

    async getBookings(status = null) {
      const supabase = initializeSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

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

    async createBooking(bookingData) {
      const supabase = initializeSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      console.log('📝 Creating booking with data:', bookingData);

      const dbBooking = {
        user_id: user.id,
        package_name: bookingData.packageName || bookingData.package_name,
        package_price: parseFloat(bookingData.packagePrice || bookingData.package_price || bookingData.totalAmount || 0),
        recipient_name: bookingData.recipientName || bookingData.recipient_name,
        recipient_phone: bookingData.recipientPhone || bookingData.recipient_phone,
        recipient_address: bookingData.deliveryAddress || bookingData.recipient_address,
        surprise_date: bookingData.surpriseDate || bookingData.surprise_date,
        surprise_time: bookingData.surpriseTime || bookingData.surprise_time,
        timezone: bookingData.timezone || 'WAT',
        flexible_timing: bookingData.flexibleTiming || false,
        personal_message: bookingData.personalMessage || bookingData.personal_message || null,
        special_requests: bookingData.specialRequests || bookingData.special_requests || null,
        addons: bookingData.addons || [],
        status: bookingData.status || 'pending',
        payment_status: bookingData.paymentStatus || bookingData.payment_status || 'pending',
        payment_reference: bookingData.paymentReference || bookingData.payment_reference || null,
        flutterwave_reference: bookingData.transactionId || bookingData.flutterwave_reference || null,
        total_amount: parseFloat(bookingData.totalAmount || bookingData.packagePrice || 0)
      };

      console.log('💾 Database payload:', dbBooking);

      const { data, error } = await supabase
        .from('bookings')
        .insert(dbBooking)
        .select()
        .single();

      if (error) { console.error('❌ Database insert error:', error); throw error; }

      console.log('✅ Booking created successfully:', data);
      return data;
    },

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

    async cancelBooking(bookingId) {
      const supabase = initializeSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

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

      return {
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
    },

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

    subscribeToUpdates(callback) {
      const supabase = initializeSupabase();
      if (!supabase) { console.error('Supabase not initialized'); return null; }

      const user = getCurrentUser();
      if (!user) return null;

      return supabase
        .channel('bookings-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` },
          (payload) => { console.log('Booking updated:', payload); if (callback) callback(payload); }
        )
        .subscribe();
    }
  }
};

// ─── BOOT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  API.init();
});

window.API = API;
window.getCurrentUser = getCurrentUser;
window.getSupabaseClient = initializeSupabase;

console.log('✅ supabaseApi.js loaded');
