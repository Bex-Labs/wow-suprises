/**
 * Admin Merchants Management
 */

let allMerchants = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!await protectAdminRoute()) return;
    loadMerchants();
});

async function loadMerchants() {
    try {
        const { data, error } = await supabaseAdmin.from('merchants').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        allMerchants = data;
        renderMerchants(data);
        updateStats(data);
    } catch (err) {
        console.error(err);
        alert('Failed to load merchants');
    }
}

function renderMerchants(list) {
    const tbody = document.getElementById('merchantsList');
    tbody.innerHTML = list.map(m => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px;">
                <div style="font-weight:600">${m.business_name || 'N/A'}</div>
                <div style="font-size:12px; color:#666;">ID: ${m.id.slice(0,8)}</div>
            </td>
            <td style="padding: 12px;">${m.email || 'N/A'}</td>
            <td style="padding: 12px;">
                <span class="badge ${m.is_active ? 'badge-success' : 'badge-danger'}">
                    ${m.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td style="padding: 12px;">
                <span class="badge badge-${m.verification_status === 'verified' ? 'success' : 'warning'}">
                    ${m.verification_status}
                </span>
            </td>
            <td style="padding: 12px;">
                <button onclick="viewMerchant('${m.id}')" class="admin-btn admin-btn-sm admin-btn-secondary">View Docs</button>
                ${m.verification_status !== 'verified' ? 
                    `<button onclick="verifyMerchant('${m.id}')" class="admin-btn admin-btn-sm admin-btn-primary">Verify</button>` : 
                    `<button onclick="suspendMerchant('${m.id}')" class="admin-btn admin-btn-sm admin-btn-danger">Suspend</button>`
                }
            </td>
        </tr>
    `).join('');
}

function updateStats(list) {
    document.getElementById('pendingCount').textContent = list.filter(m => m.verification_status === 'pending').length;
    document.getElementById('activeCount').textContent = list.filter(m => m.is_active).length;
}

window.viewMerchant = function(id) {
    const m = allMerchants.find(x => x.id === id);
    const docs = m.documents || {};
    
    let html = '<ul>';
    if(docs.id_document) html += `<li><a href="${getDocUrl(docs.id_document.path)}" target="_blank">View ID Document</a></li>`;
    if(docs.business_certificate) html += `<li><a href="${getDocUrl(docs.business_certificate.path)}" target="_blank">View Business Cert</a></li>`;
    html += '</ul>';
    
    if(Object.keys(docs).length === 0) html = '<p>No documents uploaded yet.</p>';

    document.getElementById('modalTitle').textContent = m.business_name;
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('approveBtn').onclick = () => verifyMerchant(id);
    document.getElementById('docModal').style.display = 'flex';
}

function getDocUrl(path) {
    const { data } = supabaseAdmin.storage.from('merchant-documents').getPublicUrl(path);
    return data.publicUrl;
}

window.verifyMerchant = async function(id) {
    if(!confirm('Approve this merchant?')) return;
    const { error } = await supabaseAdmin.from('merchants').update({ 
        verification_status: 'verified', is_active: true 
    }).eq('id', id);
    
    if(!error) {
        alert('Merchant Verified!');
        document.getElementById('docModal').style.display = 'none';
        loadMerchants();
    }
}

window.suspendMerchant = async function(id) {
    if(!confirm('Suspend this merchant account?')) return;
    const { error } = await supabaseAdmin.from('merchants').update({ 
        is_active: false 
    }).eq('id', id);
    if(!error) loadMerchants();
}