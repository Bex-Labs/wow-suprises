/**
 * Merchant Booking Management Logic
 * Handles real-time status updates and "Job Ticket" view.
 */

let myBookings = [];
let currentMerchantId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initMerchant();
});

// 1. Initialize & Get Merchant ID
async function initMerchant() {
    const sb = getSupabaseAdmin();
    const { data: { user } } = await sb.auth.getUser();
    
    if(!user) return window.location.href = 'merchant-login.html';

    // Get Merchant ID linked to this login
    const { data: merchant } = await sb
        .from('merchants')
        .select('id, business_name')
        .eq('email', user.email)
        .single();

    if(merchant) {
        currentMerchantId = merchant.id;
        document.getElementById('merchantName').textContent = merchant.business_name;
        loadBookings();
        setupRealtime();
    } else {
        alert('Error: No merchant profile found.');
    }
}

// 2. Load Bookings
async function loadBookings() {
    const tbody = document.getElementById('bookingsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:40px;">Fetching new orders...</td></tr>';

    try {
        const sb = getSupabaseAdmin();
        const { data, error } = await sb
            .from('bookings')
            .select('*')
            .eq('merchant_id', currentMerchantId) // CRITICAL: Only show assigned orders
            .order('created_at', { ascending: false });

        if(error) throw error;

        myBookings = data || [];
        renderTable(myBookings);

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${err.message}</td></tr>`;
    }
}

// 3. Render Table
function renderTable(orders) {
    const tbody = document.getElementById('bookingsTableBody');
    if(orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:40px;">No orders found.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:15px; font-weight:bold;">#${(order.booking_reference || order.id).slice(0,8).toUpperCase()}</td>
            <td style="padding:15px;">${order.package_name || 'Custom'}</td>
            <td style="padding:15px;">${new Date(order.surprise_date).toDateString()}</td>
            <td style="padding:15px;">
                ${order.special_instructions ? '<i class="bi bi-exclamation-circle text-warning"></i> Has Notes' : 'Standard'}
            </td>
            <td style="padding:15px;">
                <span class="status-badge status-${order.status}">${order.status.replace('_', ' ')}</span>
            </td>
            <td style="padding:15px;">
                <button onclick="openJobModal('${order.id}')" class="admin-btn admin-btn-sm admin-btn-primary">
                    Manage Job
                </button>
            </td>
        </tr>
    `).join('');
}

// 4. THE CORE: Manage Job Modal
window.openJobModal = function(orderId) {
    const order = myBookings.find(o => o.id === orderId);
    if(!order) return;

    const modal = document.getElementById('jobModal');
    
    // Fill Data
    document.getElementById('modalRef').textContent = `Order #${(order.booking_reference || order.id).slice(0,8).toUpperCase()}`;
    document.getElementById('modalDate').textContent = `Surprise Date: ${new Date(order.surprise_date).toDateString()}`;
    
    document.getElementById('modalPackage').textContent = order.package_name || 'Custom';
    document.getElementById('modalRecipient').textContent = order.recipient_name || 'N/A';
    document.getElementById('modalAddress').textContent = order.location || 'N/A'; // Assuming 'location' field
    document.getElementById('modalPhone').textContent = order.recipient_phone || 'N/A';
    document.getElementById('modalInstructions').textContent = order.special_instructions || 'None provided.';
    document.getElementById('modalMessage').textContent = order.personal_message || 'None.';

    // Render Progress Tracker
    renderTracker(order.status);

    // Render Action Buttons based on Workflow
    renderActions(order);

    modal.style.display = 'block';
}

function renderTracker(status) {
    const steps = ['pending', 'processing', 'out_for_delivery', 'completed'];
    const currentIdx = steps.indexOf(status) === -1 ? 0 : steps.indexOf(status); // Default to 0 if cancelled/rejected

    let html = '';
    steps.forEach((step, idx) => {
        const isActive = idx <= currentIdx;
        const icon = step === 'completed' ? 'check-lg' : (idx + 1);
        const label = step.replace(/_/g, ' ').toUpperCase();
        
        html += `
            <div class="tracker-step ${isActive ? 'active' : ''}">
                <div class="step-dot">${isActive ? '<i class="bi bi-check"></i>' : idx+1}</div>
                <p>${label}</p>
            </div>
        `;
    });
    document.getElementById('statusTracker').innerHTML = html;
}

function renderActions(order) {
    const container = document.getElementById('actionButtons');
    let btns = '';

    if (order.status === 'pending') {
        btns = `
            <button onclick="updateStatus('${order.id}', 'confirmed')" class="btn-action success">
                <i class="bi bi-check-circle"></i> Accept Order
            </button>
            <button onclick="updateStatus('${order.id}', 'rejected')" class="btn-action" style="color:red; border-color:red;">
                <i class="bi bi-x-circle"></i> Reject Order
            </button>
        `;
    } else if (order.status === 'confirmed') {
        btns = `
            <button onclick="updateStatus('${order.id}', 'processing')" class="btn-action primary" style="grid-column: span 2;">
                <i class="bi bi-gear"></i> Start Processing (Preparing Gift)
            </button>
        `;
    } else if (order.status === 'processing') {
        btns = `
            <button onclick="updateStatus('${order.id}', 'out_for_delivery')" class="btn-action primary" style="grid-column: span 2;">
                <i class="bi bi-truck"></i> Mark Out for Delivery
            </button>
        `;
    } else if (order.status === 'out_for_delivery') {
        btns = `
            <button onclick="updateStatus('${order.id}', 'completed')" class="btn-action success" style="grid-column: span 2;">
                <i class="bi bi-check-lg"></i> Mark Delivered & Completed
            </button>
        `;
    } else {
        btns = `<div style="grid-column: span 2; text-align:center; color:green; font-weight:bold;">Job Completed ✅</div>`;
    }

    container.innerHTML = btns;
}

window.closeJobModal = function() {
    document.getElementById('jobModal').style.display = 'none';
}

// 5. Update Status (Updates Admin & Client automatically via DB)
window.updateStatus = async function(orderId, newStatus) {
    const sb = getSupabaseAdmin();
    
    // Optimistic UI update
    if(typeof showToast === 'function') showToast('Updating status...', 'info');

    try {
        const { error } = await sb
            .from('bookings')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if(error) throw error;

        if(typeof showToast === 'function') showToast(`Order marked as ${newStatus}`, 'success');
        
        closeJobModal();
        loadBookings(); // Refresh list

    } catch(err) {
        console.error(err);
        alert('Failed to update status.');
    }
}

// 6. Realtime
function setupRealtime() {
    const sb = getSupabaseAdmin();
    sb.channel('merchant-jobs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `merchant_id=eq.${currentMerchantId}` }, 
        () => {
            loadBookings();
        })
        .subscribe();
}

// 7. Filtering
window.filterBookings = function(status) {
    // Update active tab UI
    document.querySelectorAll('.admin-btn-sm').forEach(b => b.classList.remove('active-filter', 'btn-primary'));
    event.target.classList.add('active-filter');

    if(status === 'all') {
        renderTable(myBookings);
    } else {
        renderTable(myBookings.filter(o => o.status === status));
    }
}