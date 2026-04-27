// merchant/js/merchant-config.js
//
// FIX 1: The root js/config.js was pointing at the WRONG Supabase project.
//         The correct project is hvhpqobxhyuxbifdtbcj.supabase.co.
//         Both this file and js/config.js now use the same URL and key so
//         every part of the app talks to the same auth database.
//
// FIX 2: Guard against double-initialisation. If window.sbClient already
//         exists, reuse it instead of creating a second client, which causes
//         auth state race conditions.

const MERCHANT_SUPABASE_URL      = 'https://hvhpqobxhyuxbifdtbcj.supabase.co';
const MERCHANT_SUPABASE_ANON_KEY = 'sb_publishable_ZJztir1bOdtgJZcRbw1OWw_yUMxtok0';

// Keep a config object for any code that reads window.SUPABASE_CONFIG
window.SUPABASE_CONFIG = {
  url:     MERCHANT_SUPABASE_URL,
  anonKey: MERCHANT_SUPABASE_ANON_KEY
};

if (typeof supabase === 'undefined') {
  console.error('❌ Supabase library not loaded. Check the CDN <script> tag comes before merchant-config.js.');
} else if (window.sbClient) {
  // Already initialised — reuse the existing client so auth state is shared
  window.merchantSupabase = window.sbClient;
  console.log('✅ merchant-config.js: reusing existing sbClient');
} else {
  window.sbClient        = supabase.createClient(MERCHANT_SUPABASE_URL, MERCHANT_SUPABASE_ANON_KEY);
  window.merchantSupabase = window.sbClient;
  console.log('✅ merchant-config.js: Supabase client initialised');
}
