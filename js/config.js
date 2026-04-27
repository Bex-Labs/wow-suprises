// js/config.js
//
// FIX: Updated to the correct Supabase project URL and publishable key.
//      The previous URL (znivkrreeqzvlqwutxzb.supabase.co) was wrong —
//      it pointed at a different project than the merchant portal, meaning
//      login.html and the merchant dashboard were authenticating against
//      completely separate databases. Both now use hvhpqobxhyuxbifdtbcj.

const SUPABASE_CONFIG = {
  url:     'https://hvhpqobxhyuxbifdtbcj.supabase.co',
  anonKey: 'sb_publishable_ZJztir1bOdtgJZcRbw1OWw_yUMxtok0'
};

// Initialise the shared client and assign to window.sbClient.
// Every other script (supabaseApi.js, merchant-config.js, merchant-auth-guard.js)
// checks for window.sbClient first and reuses it, so this runs exactly once.
if (typeof supabase !== 'undefined') {
  window.sbClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  console.log('✅ Supabase client initialised (config.js)');
} else {
  console.error('❌ Supabase library not loaded. Check the CDN <script> tag comes before config.js.');
}

window.SUPABASE_CONFIG = SUPABASE_CONFIG;
