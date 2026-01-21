/**
 * Admin Orders Management - FIXED VERSION
 * Fetches real data with correct joins (Ambiguous relationship fixed)
 */

let allOrders = [];
let ordersSubscription = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth
    const isAuth = await protectAdminRoute();
    if (!isAuth) return;
    
    // 2. Load Orders
    await loadAllOrders();
    
    // 3. Setup Realtime & Filters
    setupRealtimeTracking();
    setupFilters();
});

// ------------------------------------------------------------------
// 1. LOAD ORDERS (With Explicit Joins)
// ------------------------------------------------------------------
async function loadAllOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;"><i class="bi bi-arrow-repeat spin"></i> Loading...</td></tr>';

    try {
        const sb = getSupabaseAdmin();

        // FIX: We use '!bookings_user_id_fkey' to tell Supabase WHICH relationship to use.
        // We alias it back to 'profiles' so the rest of the code works.
        const { data, error } = await sb
            .from('bookings')
            .select(`
                *,
                merchants ( id, business_name, email ),
                profiles:profiles!bookings_user_id_fkey ( id, full_name, email, phone )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        allOrders = data || [];
        renderOrders(allOrders);
        console.log('✅ Loaded', allOrders.length, 'orders');

    } catch (err) {
        console.error('Error loading orders:', err);
        if(tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error: ${err.message}</td></tr>`;
    }
}

// ------------------------------------------------------------------
// 2. RENDER TABLE
// ------------------------------------------------------------------
function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#666;">No orders found.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        // 1. Resolve Merchant Name
        const merchantName = order.merchants?.business_name || 'Unassigned';
        
        // 2. Resolve Client Name
        // Try profile first, then fallback to manual input 'customer_name'
        const clientName = order.profiles?.full_name || order.customer_name || 'Guest';
        
        // 3. Resolve Price
        // Check all 3 possible price columns
        const rawPrice = order.total_amount || order.package_price || order.budget || 0;
        const price = cleanAmount(rawPrice);

        // 4. Format Date
        const dateObj = new Date(order.created_at);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const statusClass = `status-${(order.status || 'pending').toLowerCase()}`;

        return `
        <tr style="border-bottom: 1px solid #eee; transition: background 0.2s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
            <td style="padding: 15px;">
                <div style="font-weight: 700; color: #333;">#${(order.booking_reference || order.id).slice(0, 8).toUpperCase()}</div>
                <div style="font-size: 12px; color: #999;">${dateStr}</div>
            </td>
            <td style="padding: 15px;">
                <div style="font-weight: 600; color: #4f46e5;">${merchantName}</div>
                <div style="font-size: 11px; color: #666;">${order.merchants?.email || ''}</div>
            </td>
            <td style="padding: 15px;">
                <div style="font-weight:500;">${clientName}</div>
                <div style="font-size: 12px; color: #666;">${order.location || 'Online'}</div>
            </td>
            <td style="padding: 15px; font-weight: 600;">
                ${formatCurrency(price)}
            </td>
            <td style="padding: 15px;">
                <span class="status-badge ${statusClass}">${order.status || 'pending'}</span>
            </td>
            <td style="padding: 15px;">
                <button onclick="openOrderModal('${order.id}')" class="admin-btn admin-btn-sm admin-btn-secondary">
                    <i class="bi bi-eye"></i> Details
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

// ------------------------------------------------------------------
// 3. MODAL LOGIC (Details Button)
// ------------------------------------------------------------------
window.openOrderModal = function(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if(!order) return;

    // Create Modal HTML dynamically if it doesn't exist
    if(!document.getElementById('orderModal')) {
        const modalHtml = `
        <div id="orderModal" class="modal" style="display:none; position:fixed; z-index:1000; left:0; top:0; width:100%; height:100%; overflow:auto; background-color:rgba(0,0,0,0.5);">
            <div class="modal-content" style="background-color:#fefefe; margin:5% auto; padding:0; border:1px solid #888; width:80%; max-width:800px; border-radius:12px;">
                <div class="modal-header" style="padding:20px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="margin:0; font-size:20px;">Order Details</h2>
                    <span class="close" onclick="closeOrderModal()" style="font-size:28px; cursor:pointer;">&times;</span>
                </div>
                <div class="modal-body" id="orderModalBody" style="padding:25px;"></div>
                <div class="modal-footer" style="padding:20px; border-top:1px solid #eee; text-align:right; background:#f9fafb; border-radius:0 0 12px 12px;">
                    <button onclick="closeOrderModal()" class="admin-btn admin-btn-secondary">Close</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const modal = document.getElementById('orderModal');
    const body = document.getElementById('orderModalBody');
    
    // Format Data for Modal
    const price = cleanAmount(order.total_amount || order.package_price || order.budget);
    const clientName = order.profiles?.full_name || order.customer_name || 'Guest';
    const clientPhone = order.profiles?.phone || 'N/A';
    const merchantName = order.merchants?.business_name || 'Not assigned yet';

    body.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px; background:#f8f9fa; padding:15px; border-radius:8px;">
            <div>
                <small style="color:#666;">ORDER REFERENCE</small>
                <div style="font-size:18px; font-weight:bold;">#${(order.booking_reference || order.id).toUpperCase()}</div>
            </div>
            <div style="text-align:right;">
                <small style="color:#666;">TOTAL AMOUNT</small>
                <div style="font-size:18px; font-weight:bold; color:#22c55e;">${formatCurrency(price)}</div>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div>
                <label style="font-weight:600; font-size:12px; color:#666;">PACKAGE</label>
                <div>${order.package_name || 'Custom Package'}</div>
            </div>
            <div>
                <label style="font-weight:600; font-size:12px; color:#666;">STATUS</label>
                <div><span class="status-badge status-${(order.status || 'pending').toLowerCase()}">${order.status || 'Pending'}</span></div>
            </div>
            <div>
                <label style="font-weight:600; font-size:12px; color:#666;">CLIENT</label>
                <div>${clientName} <br><small>${order.profiles?.email || ''} • ${clientPhone}</small></div>
            </div>
            <div>
                <label style="font-weight:600; font-size:12px; color:#666;">MERCHANT</label>
                <div>${merchantName}</div>
            </div>
            <div>
                <label style="font-weight:600; font-size:12px; color:#666;">RECIPIENT</label>
                <div>${order.recipient_name || 'N/A'}</div>
            </div>
            <div>
                <label style="font-weight:600; font-size:12px; color:#666;">SURPRISE DATE</label>
                <div>${formatDate(order.surprise_date)}</div>
            </div>
        </div>

        <div style="margin-top:20px;">
            <label style="display:block; font-size:12px; color:#666; font-weight:600; margin-bottom:5px;">NOTES</label>
            <div style="background:#f9f9f9; padding:10px; border:1px solid #eee; border-radius:4px;">
                ${order.special_instructions || order.special_requests || 'None provided.'}
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

window.closeOrderModal = function() {
    document.getElementById('orderModal').style.display = 'none';
}

// Close on outside click
window.onclick = function(event) {
    const modal = document.getElementById('orderModal');
    if (event.target === modal) {
        closeOrderModal();
    }
}

// ------------------------------------------------------------------
// 4. UTILS & FILTERS
// ------------------------------------------------------------------
function setupFilters() {
    const searchInput = document.getElementById('searchOrder');
    const statusSelect = document.getElementById('statusFilter');

    if(!searchInput || !statusSelect) return;

    function filterData() {
        const query = searchInput.value.toLowerCase();
        const status = statusSelect.value;

        const filtered = allOrders.filter(order => {
            const mName = (order.merchants?.business_name || '').toLowerCase();
            const cName = (order.profiles?.full_name || order.customer_name || '').toLowerCase();
            const ref = (order.booking_reference || order.id).toLowerCase();
            
            const matchesSearch = ref.includes(query) || cName.includes(query) || mName.includes(query);
            const matchesStatus = status === 'all' || order.status === status;

            return matchesSearch && matchesStatus;
        });

        renderOrders(filtered);
    }

    searchInput.addEventListener('input', filterData);
    statusSelect.addEventListener('change', filterData);
}

function setupRealtimeTracking() {
    const sb = getSupabaseAdmin();
    if(ordersSubscription) sb.removeChannel(ordersSubscription);

    ordersSubscription = sb.channel('admin-orders-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
            loadAllOrders(); // Reload on any change
        })
        .subscribe();
}

function cleanAmount(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const cleaned = value.toString().replace(/[₦,NGN\s]/g, '');
    return parseFloat(cleaned) || 0;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
}

function formatDate(dateStr) {
    if(!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB');
}