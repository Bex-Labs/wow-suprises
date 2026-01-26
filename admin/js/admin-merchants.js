/**
 * Admin Merchants Management
 * Handles listing, verifying, and suspending merchants.
 */

let allMerchants = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Admin Auth
    if (typeof requireAdminAuth === 'function') {
        const isAuth = await requireAdminAuth();
        if (!isAuth) return;
    }
    
    // 2. Load Data
    loadMerchants();
});

// ============================================
// 1. LOAD MERCHANTS
// ============================================
async function loadMerchants() {
    const tbody = document.getElementById('merchantsList');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:30px;">Loading merchants...</td></tr>';

    try {
        // Use the helper function if available, or fallback to global
        const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : window.supabaseAdmin;
        
        if (!sb) throw new Error('Supabase client not initialized');

        const { data, error } = await sb
            .from('merchants')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allMerchants = data || [];
        renderMerchants(allMerchants);
        updateStats(allMerchants);

    } catch (err) {
        console.error('Load Error:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${err.message}</td></tr>`;
    }
}

// ============================================
// 2. RENDER LIST
// ============================================
function renderMerchants(list) {
    const tbody = document.getElementById('merchantsList');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:30px; color:#666;">No registered merchants found.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(m => {
        const statusClass = m.is_active ? 'success' : 'danger';
        const verifyClass = m.verification_status === 'verified' ? 'success' : 'warning';
        
        return `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 15px;">
                <div style="font-weight:600; color:#000;">${m.business_name || 'N/A'}</div>
                <div style="font-size:12px; color:#666;">ID: ${(m.id || '').slice(0,8)}...</div>
            </td>
            <td style="padding: 15px;">
                <div>${m.owner_name || 'Unknown'}</div>
                <div style="font-size:12px; color:#666;">${m.email || 'N/A'}</div>
            </td>
            <td style="padding: 15px;">
                <span class="badge" style="background:${m.is_active ? '#dcfce7' : '#fee2e2'}; color:${m.is_active ? '#166534' : '#991b1b'}; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:600;">
                    ${m.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td style="padding: 15px;">
                <span class="badge" style="background:${m.verification_status==='verified'?'#dbeafe':'#fef3c7'}; color:${m.verification_status==='verified'?'#1e40af':'#92400e'}; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:600; text-transform:uppercase;">
                    ${m.verification_status || 'pending'}
                </span>
            </td>
            <td style="padding: 15px;">
                <div style="display:flex; gap:8px;">
                    <button onclick="viewMerchant('${m.id}')" class="admin-btn" style="background:#f3f4f6; color:#000; border:1px solid #ddd; padding:6px 10px; border-radius:4px; cursor:pointer;">Docs</button>
                    ${m.verification_status !== 'verified' ? 
                        `<button onclick="verifyMerchant('${m.id}')" class="admin-btn" style="background:#22c55e; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">Verify</button>` : 
                        `<button onclick="suspendMerchant('${m.id}')" class="admin-btn" style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">Suspend</button>`
                    }
                </div>
            </td>
        </tr>
    `}).join('');
}

// ============================================
// 3. STATS & ACTIONS
// ============================================
function updateStats(list) {
    const pending = list.filter(m => m.verification_status === 'pending').length;
    const active = list.filter(m => m.is_active).length;
    
    setText('pendingCount', pending);
    setText('activeCount', active);
}

function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.textContent = text;
}

// View Merchant Modal
window.viewMerchant = function(id) {
    const m = allMerchants.find(x => x.id === id);
    if (!m) return;

    // Handle documents (assuming standard object structure)
    const docs = m.documents || {};
    let html = '<div style="display:grid; gap:10px;">';
    
    if (Object.keys(docs).length > 0) {
        if(docs.id_document) html += `<a href="${getDocUrl(docs.id_document)}" target="_blank" style="display:block; padding:10px; background:#f9f9f9; border:1px solid #eee; text-decoration:none; color:#333;">📄 View ID Document</a>`;
        if(docs.business_certificate) html += `<a href="${getDocUrl(docs.business_certificate)}" target="_blank" style="display:block; padding:10px; background:#f9f9f9; border:1px solid #eee; text-decoration:none; color:#333;">🏢 View Business Certificate</a>`;
    } else {
        html += '<p style="color:#666; font-style:italic;">No documents uploaded by merchant.</p>';
    }
    html += '</div>';

    const titleEl = document.getElementById('modalTitle');
    const contentEl = document.getElementById('modalContent');
    const modal = document.getElementById('docModal');

    if(titleEl) titleEl.textContent = m.business_name;
    if(contentEl) contentEl.innerHTML = html;
    if(modal) modal.style.display = 'flex';
}

function getDocUrl(path) {
    // Basic helper to get URL if it's just a path string
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : window.supabaseAdmin;
    const { data } = sb.storage.from('merchant-documents').getPublicUrl(path);
    return data.publicUrl;
}

// Verify Action
window.verifyMerchant = async function(id) {
    if(!confirm('Approve this merchant and activate account?')) return;
    
    const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : window.supabaseAdmin;
    const { error } = await sb.from('merchants').update({ 
        verification_status: 'verified', 
        is_active: true,
        status: 'active' // Ensure legacy status field is updated too
    }).eq('id', id);
    
    if(!error) {
        alert('Merchant Verified Successfully!');
        const modal = document.getElementById('docModal');
        if(modal) modal.style.display = 'none';
        loadMerchants();
    } else {
        alert('Error: ' + error.message);
    }
}

// Suspend Action
window.suspendMerchant = async function(id) {
    if(!confirm('Suspend this merchant account? They will lose access.')) return;
    
    const sb = typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : window.supabaseAdmin;
    const { error } = await sb.from('merchants').update({ 
        is_active: false,
        status: 'suspended' 
    }).eq('id', id);
    
    if(!error) loadMerchants();
    else alert('Error: ' + error.message);
}

// Close Modal Helper
window.closeDocModal = function() {
    const modal = document.getElementById('docModal');
    if(modal) modal.style.display = 'none';
}