/**
 * Merchant Booking Management JavaScript - FULLY FUNCTIONAL
 * FIXED: UI injection now uses enterprise table classes, NO logic touched.
 */

let allBookings = [];
let filteredBookings = [];
let currentBooking = null;
let currentMerchantId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Merchant bookings page loading...');
    
    if (typeof MerchantAuth === 'undefined') {
        console.error('❌ MerchantAuth library missing');
        return;
    }

    await initMerchant();
});

// ============================================
// 1. INITIALIZE MERCHANT CONTEXT
// ============================================
async function initMerchant() {
    try {
        if (!await MerchantAuth.isAuthenticated()) {
            console.log('❌ Not authenticated, redirecting...');
            window.location.replace('../login.html');
            return;
        }

        const merchant = await MerchantAuth.getCurrentMerchant();
        
        if (merchant) {
            currentMerchantId = merchant.id;
            console.log('✅ Merchant Context Loaded:', merchant.business_name);
            
            const nameEl = document.getElementById('merchantDisplayName');
            if(nameEl) nameEl.textContent = merchant.business_name;

            await loadBookings();
            setupRealtime();
        } else {
            console.error('❌ No merchant profile found for this user.');
        }

    } catch (error) {
        console.error('❌ Init Error:', error);
    }
}

// ============================================
// 2. LOAD BOOKINGS (MERCHANT SPECIFIC)
// ============================================
async function loadBookings() {
    try {
        console.log('📥 Loading merchant bookings...');
        const sb = MerchantAuth.getSupabase();
        
        const { data: bookings, error } = await sb
            .from('bookings')
            .select(`
                *,
                profiles:user_id ( full_name, email, phone )
            `)
            .eq('merchant_id', currentMerchantId)
            .neq('status', 'cancelled') 
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`✅ Fetched ${bookings?.length || 0} bookings`);
        
        allBookings = (bookings || []).map(booking => ({
            ...booking,
            client_name: booking.profiles?.full_name || booking.customer_name || 'Guest Client',
            client_phone: booking.profiles?.phone || 'N/A'
        }));
        
        filteredBookings = [...allBookings];
        
        updateStats();
        displayBookings(filteredBookings);
        
        const pendingCount = allBookings.filter(b => b.status === 'pending').length;
        const badge = document.getElementById('actionNeededBadge');
        if(badge) {
            badge.textContent = pendingCount;
            badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }

    } catch (error) {
        console.error('❌ Error loading bookings:', error);
        const tbody = document.getElementById('bookingsTableBody');
        if(tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #dc2626;">Error: ${error.message}</td></tr>`;
    }
}

// ============================================
// 3. UPDATE STATISTICS
// ============================================
function updateStats() {
    const stats = {
        pending: 0,
        confirmed: 0,
        processing: 0,
        out_for_delivery: 0, 
        completed: 0
    };
    
    allBookings.forEach(booking => {
        const status = (booking.status || 'pending').toLowerCase();
        if (stats.hasOwnProperty(status)) {
            stats[status]++;
        }
    });
    
    setText('pendingCount', stats.pending);
    setText('confirmedCount', stats.confirmed || 0); 
    setText('processingCount', stats.processing);
    setText('deliveryCount', stats.out_for_delivery);
    setText('completedCount', stats.completed);
    setText('totalBookingsCount', `${allBookings.length} active`);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if(el) el.textContent = value;
}

// ============================================
// 4. DISPLAY BOOKINGS TABLE (UI UPDATED ONLY)
// ============================================
function displayBookings(bookings) {
    const tbody = document.getElementById('bookingsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) return;
    
    if (!bookings || bookings.length === 0) {
        tbody.style.display = 'none';
        if(emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if(emptyState) emptyState.style.display = 'none';
    tbody.style.display = 'table-row-group';
    
    // UI Change: Swapped inline styles for standard table layout with text truncation
    tbody.innerHTML = bookings.map(booking => `
        <tr style="cursor: pointer;" onclick="openJobModal('${booking.id}')">
            <td>
                <div style="font-weight: 700; color: #0f172a;">#${(booking.booking_reference || booking.id).slice(0,8).toUpperCase()}</div>
            </td>
            <td>
                <div style="font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${booking.package_name || 'Custom'}</div>
                <div style="font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;"><i class="bi bi-person"></i> ${booking.client_name}</div>
            </td>
            <td>
                <div style="font-weight: 500; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${booking.recipient_name || 'N/A'}</div>
                <div style="font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;"><i class="bi bi-geo-alt"></i> ${booking.recipient_address || booking.location || 'N/A'}</div>
            </td>
            <td style="white-space: nowrap;">
                <div style="font-weight: 500; color: #334155;"><i class="bi bi-calendar"></i> ${formatDate(booking.delivery_date || booking.surprise_date)}</div>
                <div style="font-size: 12px; color: #64748b;"><i class="bi bi-clock"></i> ${booking.delivery_time || booking.surprise_time || 'Anytime'}</div>
            </td>
            <td>
                ${getStatusBadge(booking.status)}
            </td>
            <td>
                <button class="merchant-btn merchant-btn-secondary" style="padding: 6px 12px; font-size: 12px;">
                    Manage <i class="bi bi-chevron-right" style="font-size: 10px;"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// UI Change: Updated to match CSS badge classes instead of inline color strings
function getStatusBadge(status) {
    const s = (status || 'pending').toLowerCase();
    let statusClass = 'status-pending'; // Default
    
    if (s === 'confirmed') statusClass = 'status-confirmed';
    if (s === 'processing') statusClass = 'status-in-progress';
    if (s === 'out_for_delivery') statusClass = 'status-in-progress'; 
    if (s === 'completed') statusClass = 'status-completed';
    if (s === 'cancelled' || s === 'rejected') statusClass = 'status-cancelled';

    return `<span class="status-badge ${statusClass}">${s.replace(/_/g, ' ')}</span>`;
}

// ============================================
// 5. MANAGE JOB MODAL (VIEW & EDIT)
// ============================================
window.openJobModal = function(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    currentBooking = booking;
    
    const modal = document.getElementById('jobModal');
    
    setText('modalRef', `#${(booking.booking_reference || booking.id).slice(0,8).toUpperCase()}`);
    setText('modalDate', `Due: ${formatDate(booking.delivery_date || booking.surprise_date)}`);
    
    setText('modalPackage', booking.package_name || 'Custom');
    setText('modalRecipient', booking.recipient_name || 'N/A');
    setText('modalAddress', booking.recipient_address || booking.location || 'N/A');
    setText('modalPhone', booking.recipient_phone || 'N/A');
    
    const instrEl = document.getElementById('modalInstructions');
    if(instrEl) instrEl.textContent = booking.special_message || booking.special_instructions || 'None provided.';

    renderTracker(booking.status);
    renderActions(booking);

    modal.style.display = 'block';
}

function renderTracker(status) {
    const steps = ['pending', 'confirmed', 'processing', 'out_for_delivery'];
    const currentIdx = steps.indexOf(status);
    
    let html = '';
    steps.forEach((step, idx) => {
        const isActive = idx <= currentIdx;
        const label = step === 'pending' ? 'Request' : step.replace(/_/g, ' ');
        html += `
            <div class="track-step ${isActive ? 'active' : ''}" style="width:25%;">
                <div class="track-icon">
                    ${idx + 1}
                </div>
                <div class="track-label">${label}</div>
            </div>`;
    });
    
    const tracker = document.getElementById('statusTracker');
    if(tracker) {
        tracker.innerHTML = html;
    }
}

function renderActions(booking) {
    const container = document.getElementById('actionButtons');
    let btns = '';

    if (booking.status === 'pending') {
        btns = `
            <button onclick="updateStatus('confirmed')" class="merchant-btn" style="background:#22c55e; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer;">Accept Order</button>
            <button onclick="updateStatus('rejected')" class="merchant-btn" style="background:#ef4444; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer;">Reject</button>
        `;
    } else if (booking.status === 'confirmed') {
        btns = `<button onclick="updateStatus('processing')" class="merchant-btn" style="background:#0f172a; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; grid-column:span 2;">Start Processing</button>`;
    } else if (booking.status === 'processing') {
        btns = `<button onclick="updateStatus('out_for_delivery')" class="merchant-btn" style="background:#0f172a; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; grid-column:span 2;">Send for Delivery</button>`;
    } else if (booking.status === 'out_for_delivery') {
        btns = `<button onclick="updateStatus('completed')" class="merchant-btn" style="background:#22c55e; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; grid-column:span 2;">Confirm Delivered</button>`;
    } else {
        btns = `<div style="grid-column:span 2; text-align:center; color:#16a34a; font-weight:700; padding:10px;">Order Completed ✅</div>`;
    }

    if(container) container.innerHTML = btns;
}

window.closeJobModal = function() {
    const modal = document.getElementById('jobModal');
    if(modal) modal.style.display = 'none';
    currentBooking = null;
}

// ============================================
// 6. UPDATE STATUS
// ============================================
window.updateStatus = async function(newStatus) {
    if(!currentBooking) return;
    if(!confirm(`Update status to ${newStatus.toUpperCase()}?`)) return;

    try {
        const sb = MerchantAuth.getSupabase();
        
        const { error } = await sb
            .from('bookings')
            .update({ 
                status: newStatus, 
                updated_at: new Date() 
            })
            .eq('id', currentBooking.id);

        if(error) throw error;

        closeJobModal();
        loadBookings(); 
        if(typeof showToast === 'function') showToast('Status updated successfully', 'success');

    } catch (err) {
        console.error('Update Error:', err);
        alert('Failed to update status');
    }
}

// ============================================
// 7. SEARCH & FILTER
// ============================================
window.searchBookings = function() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    
    if(!term) {
        filteredBookings = [...allBookings];
    } else {
        filteredBookings = allBookings.filter(b => 
            (b.booking_reference || '').toLowerCase().includes(term) ||
            (b.client_name || '').toLowerCase().includes(term) ||
            (b.package_name || '').toLowerCase().includes(term)
        );
    }
    displayBookings(filteredBookings);
}

window.filterBookings = function() {
    const status = document.getElementById('statusFilter').value;
    
    if(!status) {
        filteredBookings = [...allBookings];
    } else {
        filteredBookings = allBookings.filter(b => b.status === status);
    }
    
    const term = document.getElementById('searchInput').value.toLowerCase();
    if(term) {
        filteredBookings = filteredBookings.filter(b => 
            (b.booking_reference || '').toLowerCase().includes(term) ||
            (b.client_name || '').toLowerCase().includes(term)
        );
    }
    
    displayBookings(filteredBookings);
}

window.sortBookings = function() {
    const sort = document.getElementById('sortOrder').value;
    
    filteredBookings.sort((a,b) => {
        if(sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if(sort === 'delivery') return new Date(a.delivery_date || a.surprise_date) - new Date(b.delivery_date || b.surprise_date);
        return 0;
    });
    
    displayBookings(filteredBookings);
}

// ============================================
// 8. REALTIME & UTILS
// ============================================
function setupRealtime() {
    const sb = MerchantAuth.getSupabase();
    sb.channel('merchant-booking-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `merchant_id=eq.${currentMerchantId}` }, 
        () => { 
            console.log('🔔 Realtime update received');
            loadBookings(); 
        })
        .subscribe();
}

function formatDate(dateStr) {
    if(!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

function formatCurrency(amount) {
    if(!amount) return '₦0';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
}