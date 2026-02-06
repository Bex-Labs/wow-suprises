/**
 * Admin Orders Management - HYBRID MATCHING VERSION
 * Fixes: Matches orders by Package ID OR Package Name (Fallback)
 */

let allOrders = [];
let ordersSubscription = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof protectAdminRoute === 'function') {
        const isAuth = await protectAdminRoute();
        if (!isAuth) return;
    }
    
    await loadAllOrders();
    setupRealtimeTracking();
    setupFilters();
});

// ------------------------------------------------------------------
// 1. LOAD ORDERS (BRUTE FORCE STRATEGY)
// ------------------------------------------------------------------
async function loadAllOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;"><i class="bi bi-arrow-repeat spin"></i> Loading orders...</td></tr>';

    try {
        const sb = window.sbClient;

        // STEP A: Fetch Bookings
        const { data: bookings, error: bookingError } = await sb
            .from('bookings')
            .select(`*, profiles:user_id ( full_name, email, phone )`)
            .order('created_at', { ascending: false });

        if (bookingError) throw bookingError;

        // STEP B: Fetch ALL Services & Merchants (To ensure we find matches)
        // We fetch all because we need to match by NAME if ID fails
        const { data: services } = await sb
            .from('merchant_services')
            .select('id, service_name, merchant_id, merchants ( id, business_name, email )');

        // Create 2 Lookup Maps
        const serviceIdMap = {};
        const serviceNameMap = {};

        if (services) {
            services.forEach(svc => {
                // Map by ID
                serviceIdMap[svc.id] = svc;
                // Map by Name (Lowercase for safe matching)
                if (svc.service_name) {
                    serviceNameMap[svc.service_name.toLowerCase()] = svc;
                }
            });
        }

        // STEP C: Stitch It All Together
        allOrders = bookings.map(booking => {
            let matchedService = null;

            // 1. Try Match by ID
            if (booking.package_id) {
                matchedService = serviceIdMap[booking.package_id];
            }

            // 2. If no match, Try Match by Name (Fallback)
            if (!matchedService && booking.package_name) {
                matchedService = serviceNameMap[booking.package_name.toLowerCase()];
            }

            // 3. Resolve Merchant Details
            const merchant = matchedService?.merchants;

            return {
                ...booking,
                resolved_package_name: matchedService?.service_name || booking.package_name || 'Custom Package',
                resolved_merchant: {
                    name: merchant?.business_name || 'Unassigned',
                    email: merchant?.email || '',
                    id: merchant?.id || null
                }
            };
        });

        renderOrders(allOrders);
        console.log(`✅ Loaded ${allOrders.length} orders. Found matches using Hybrid Strategy.`);

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
        const merchantName = order.resolved_merchant?.name || 'Unassigned';
        const merchantEmail = order.resolved_merchant?.email || '';
        
        const clientName = order.profiles?.full_name || order.recipient_name || 'Guest User';
        const price = cleanAmount(order.total_amount || order.package_price);
        
        const dateObj = new Date(order.created_at);
        const dateStr = dateObj.toLocaleDateString();
        const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const statusClass = `status-${(order.status || 'pending').toLowerCase()}`;

        // Visual indicator if Unassigned
        const merchantStyle = merchantName === 'Unassigned' ? 'color:#999; font-style:italic;' : 'color:#4f46e5; font-weight:600;';

        return `
        <tr style="border-bottom: 1px solid #eee; transition: background 0.2s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
            <td style="padding: 15px;">
                <div style="font-weight: 700; color: #333;">#${(order.booking_reference || order.id).slice(0, 8).toUpperCase()}</div>
                <div style="font-size: 12px; color: #999;">${dateStr} ${timeStr}</div>
            </td>
            <td style="padding: 15px;">
                <div style="${merchantStyle} display:flex; align-items:center;">
                    <i class="bi bi-shop" style="margin-right:5px;"></i> ${merchantName}
                </div>
                <div style="font-size: 11px; color: #666;">${merchantEmail}</div>
            </td>
            <td style="padding: 15px;">
                <div style="font-weight:500;">${clientName}</div>
                <div style="font-size: 12px; color: #666;">${order.profiles?.email || ''}</div>
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
        </tr>`;
    }).join('');
}

// ------------------------------------------------------------------
// 3. MODAL LOGIC
// ------------------------------------------------------------------
window.openOrderModal = function(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if(!order) return;

    if(!document.getElementById('orderModal')) createModalHtml();

    const modal = document.getElementById('orderModal');
    const body = document.getElementById('orderModalBody');
    
    const price = cleanAmount(order.total_amount || order.package_price);
    const clientName = order.profiles?.full_name || order.recipient_name || 'Guest';
    const merchantName = order.resolved_merchant?.name || 'Unassigned';

    body.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px; background:#f8f9fa; padding:15px; border-radius:8px;">
            <div>
                <small style="color:#666;">ORDER REF</small>
                <div style="font-size:18px; font-weight:bold;">#${(order.booking_reference || order.id).toUpperCase()}</div>
            </div>
            <div style="text-align:right;">
                <small style="color:#666;">TOTAL</small>
                <div style="font-size:18px; font-weight:bold; color:#22c55e;">${formatCurrency(price)}</div>
            </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div><label style="font-weight:bold; font-size:12px; color:#666;">PACKAGE</label><div>${order.resolved_package_name}</div></div>
            <div><label style="font-weight:bold; font-size:12px; color:#666;">STATUS</label><div>${order.status}</div></div>
            <div><label style="font-weight:bold; font-size:12px; color:#666;">CLIENT</label><div>${clientName}</div></div>
            <div><label style="font-weight:bold; font-size:12px; color:#666;">MERCHANT</label><div style="color:#4f46e5; font-weight:bold;">${merchantName}</div></div>
            <div><label style="font-weight:bold; font-size:12px; color:#666;">ADDRESS</label><div>${order.recipient_address || 'N/A'}</div></div>
            <div><label style="font-weight:bold; font-size:12px; color:#666;">DELIVERY</label><div>${formatDate(order.surprise_date)}</div></div>
        </div>
        <div style="margin-top:20px; background:#f9f9f9; padding:10px; border:1px solid #eee;">
            <strong>Notes:</strong> ${order.special_instructions || 'None'}
        </div>
    `;
    modal.style.display = 'block';
}

function createModalHtml() {
    const html = `
    <div id="orderModal" class="modal" style="display:none; position:fixed; z-index:1000; left:0; top:0; width:100%; height:100%; overflow:auto; background:rgba(0,0,0,0.5);">
        <div class="modal-content" style="background:#fff; margin:5% auto; padding:20px; width:80%; max-width:600px; border-radius:8px;">
            <span class="close" onclick="document.getElementById('orderModal').style.display='none'" style="float:right; cursor:pointer; font-size:24px;">&times;</span>
            <h2>Order Details</h2>
            <div id="orderModalBody"></div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

// ------------------------------------------------------------------
// 4. UTILS
// ------------------------------------------------------------------
function setupRealtimeTracking() {
    const sb = window.sbClient;
    if(ordersSubscription) sb.removeChannel(ordersSubscription);
    ordersSubscription = sb.channel('admin-orders-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => loadAllOrders())
        .subscribe();
}

function setupFilters() {
    const input = document.getElementById('searchOrder');
    if(input) input.addEventListener('input', () => {
        const term = input.value.toLowerCase();
        const filtered = allOrders.filter(o => 
            (o.resolved_merchant?.name || '').toLowerCase().includes(term) ||
            (o.booking_reference || '').toLowerCase().includes(term)
        );
        renderOrders(filtered);
    });
}

function cleanAmount(val) { return parseFloat(val) || 0; }
function formatCurrency(val) { return '₦' + val.toLocaleString('en-NG'); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-GB') : 'N/A'; }