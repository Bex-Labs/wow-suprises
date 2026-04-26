// js/config.js

const SUPABASE_CONFIG = {
  url: 'https://hvhpqobxhyuxbifdtbcj.supabase.co',
  anonKey: 'sb_publishable_ZJztir1bOdtgJZcRbw1OWw_yUMxtok0'
};

// Initialize Supabase client globally
if (typeof supabase !== 'undefined') {
  window.sbClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  console.log('✅ Supabase Client Initialized and Ready!');
} else {
  console.error('❌ Supabase Library not loaded! Make sure the CDN script tag is in your HTML.');
}

// Export for compatibility
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
