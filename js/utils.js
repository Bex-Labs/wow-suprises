// js/utils.js — WOW Surprises Utilities
// Fixed: auth loop resolved by using Supabase as source of truth

// ─── PRICE & DATE FORMATTERS ─────────────────────────────────────────────────
function formatPrice(price) {
  return '₦' + Number(price).toLocaleString('en-NG');
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

function formatDateTime(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleString('en-US', options);
}

// ─── ID & REFERENCE GENERATORS ───────────────────────────────────────────────
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateBookingReference() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let reference = 'WOW-';
  for (let i = 0; i < 8; i++) {
    reference += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return reference;
}

// ─── VALIDATORS ──────────────────────────────────────────────────────────────
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return phone.replace(/\D/g, '').length >= 10;
}

// ─── TOAST NOTIFICATION ──────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const existing = document.querySelector('.wow-toast');
  if (existing) existing.remove();

  const colors = { success: '#22c55e', error: '#B00020', info: '#6200EE', warning: '#f59e0b' };
  const icons  = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

  const toast = document.createElement('div');
  toast.className = 'wow-toast';
  toast.innerHTML = `<span>${icons[type] || icons.info}</span> <span>${message}</span>`;
  toast.style.cssText = `
    position:fixed; top:20px; right:20px; z-index:99999;
    padding:14px 22px; background:${colors[type] || colors.info}; color:#fff;
    border-radius:999px; box-shadow:0 4px 20px rgba(0,0,0,0.15);
    display:flex; align-items:center; gap:10px;
    font-family:'Be Vietnam Pro',sans-serif; font-weight:600; font-size:14px;
    animation:wowToastIn .3s ease-out; max-width:380px;
  `;
  if (!document.getElementById('wowToastStyle')) {
    const s = document.createElement('style');
    s.id = 'wowToastStyle';
    s.textContent = `
      @keyframes wowToastIn  { from { transform:translateX(120%); opacity:0; } to { transform:translateX(0); opacity:1; } }
      @keyframes wowToastOut { from { transform:translateX(0); opacity:1; } to { transform:translateX(120%); opacity:0; } }
    `;
    document.head.appendChild(s);
  }
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'wowToastOut .3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── LOCAL STORAGE HELPERS ───────────────────────────────────────────────────
const Storage = {
  set(key, value)  { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch(e) { return false; } },
  get(key)         { try { const i = localStorage.getItem(key); return i ? JSON.parse(i) : null; } catch(e) { return null; } },
  remove(key)      { try { localStorage.removeItem(key); return true; } catch(e) { return false; } },
  clear()          { try { localStorage.clear(); return true; } catch(e) { return false; } }
};

const SessionStorage = {
  set(key, value)  { try { sessionStorage.setItem(key, JSON.stringify(value)); return true; } catch(e) { return false; } },
  get(key)         { try { const i = sessionStorage.getItem(key); return i ? JSON.parse(i) : null; } catch(e) { return null; } },
  remove(key)      { try { sessionStorage.removeItem(key); return true; } catch(e) { return false; } }
};

// ─── QUERY PARAMS ─────────────────────────────────────────────────────────────
function getQueryParam(param) {
  return new URLSearchParams(window.location.search).get(param);
}

// ─── AUTH HELPERS (Supabase as source of truth) ───────────────────────────────
//
// IMPORTANT: These are async. Always await them.
// The old synchronous isLoggedIn() caused the refresh loop because
// it only checked localStorage which is empty on first load.
//

/**
 * Get the current Supabase session.
 * Returns the session object or null — never redirects.
 */
async function getSession() {
  try {
    const client = window.sbClient;
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session) return null;
    return data.session;
  } catch (e) {
    return null;
  }
}

/**
 * Get the current logged-in user from Supabase.
 * Returns the user object or null.
 */
async function getCurrentUser() {
  try {
    const session = await getSession();
    if (!session) return null;
    // Also cache in localStorage for other parts of the app
    const userInfo = {
      id:    session.user.id,
      email: session.user.email,
      name:  session.user.user_metadata?.full_name || session.user.email.split('@')[0],
      phone: session.user.user_metadata?.phone || '',
      role:  session.user.user_metadata?.role || 'customer'
    };
    Storage.set('currentUser', userInfo);
    return userInfo;
  } catch (e) {
    return null;
  }
}

/**
 * Check if user is logged in.
 * Uses Supabase session as source of truth to prevent auth loops.
 */
async function isLoggedIn() {
  const session = await getSession();
  return session !== null;
}

/**
 * Require login — redirects to login.html if not authenticated.
 * Safe to call on page load without causing loops.
 *
 * Usage: await requireLogin();
 */
async function requireLogin(redirectPath = 'login.html') {
  // Prevent redirect loops — if we're already on the login page, do nothing
  if (window.location.pathname.includes('login.html')) return false;

  const session = await getSession();
  if (!session) {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.replace(`${redirectPath}?returnUrl=${returnUrl}`);
    return false;
  }
  return true;
}

/**
 * Logout the current user — clears Supabase session + localStorage.
 */
async function logoutUser() {
  try {
    const client = window.sbClient;
    if (client) await client.auth.signOut();
  } catch (e) { /* silent */ }
  Storage.remove('currentUser');
  SessionStorage.remove('currentUser');
  SessionStorage.remove('selectedPackageId');
  showToast('Logged out successfully', 'success');
  setTimeout(() => { window.location.href = 'index.html'; }, 1000);
}

// ─── LEGACY SYNC HELPERS (kept for backward compatibility) ───────────────────
// These check localStorage only — used by older parts of the app.
// Prefer the async versions above for any new code.
function getCurrentUserSync() {
  return Storage.get('currentUser') || SessionStorage.get('currentUser');
}
function isLoggedInSync() {
  return getCurrentUserSync() !== null;
}

// Export globals
window.Storage        = Storage;
window.SessionStorage = SessionStorage;
window.showToast      = showToast;
window.formatPrice    = formatPrice;
window.formatDate     = formatDate;
window.formatDateTime = formatDateTime;
window.getQueryParam  = getQueryParam;
window.isLoggedIn     = isLoggedIn;
window.isLoggedInSync = isLoggedInSync;
window.getCurrentUser = getCurrentUser;
window.getCurrentUserSync = getCurrentUserSync;
window.requireLogin   = requireLogin;
window.logoutUser     = logoutUser;
window.getSession     = getSession;
window.generateId     = generateId;
window.generateBookingReference = generateBookingReference;
window.validateEmail  = validateEmail;
window.validatePhone  = validatePhone;
