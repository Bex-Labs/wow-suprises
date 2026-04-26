// admin/js/admin-config.js

const SUPABASE_CONFIG = {
  url: 'https://hvhpqobxhyuxbifdtbcj.supabase.co',
  anonKey: 'sb_publishable_ZJztir1bOdtgJZcRbw1OWw_yUMxtok0'
};

// Initialize Supabase client for admin portal
if (typeof supabase !== 'undefined') {
  window.sbClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  window.getSupabaseAdmin = () => window.sbClient;
  console.log('✅ Admin Supabase Client Initialized!');
} else {
  console.error('❌ Supabase Library not loaded!');
}

window.SUPABASE_CONFIG = SUPABASE_CONFIG;
