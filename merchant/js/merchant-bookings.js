/**
 * Merchant Booking Management JavaScript - FULLY FUNCTIONAL
 * Adapted from Admin Logic for Merchant Specific Use
 */

let allBookings = [];
let filteredBookings = [];
let currentBooking = null;
let currentMerchantId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Merchant bookings page loading...');
    
    // Check if Auth is loaded
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
        const sb = MerchantAuth.getSupabase();
        
        if (!MerchantAuth.isAuthenticated()) {
            console.log('❌ Not authenticated, redirecting...');
            window.location.href = 'merchant-login.html';
            return;
        }

        const merchant = await MerchantAuth.getCurrentMerchant();
        
        if (merchant) {
            currentMerchantId = merchant.id;
            console.log('✅ Merchant Context Loaded:', merchant.business_name);
            
            // Update UI
            const nameEl = document.getElementById('merchantDisplayName');
            if(nameEl) nameEl.textContent = merchant.business_name;

            // Load Data
            await loadBookings();
            setupRealtime();
        } else {
            console.error('❌ No merchant profile found for this user.');
            // alert('Error: Account not linked to a merchant profile.');
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
        
        // Fetch bookings ASSIGNED to this merchant
        // We join 'profiles' to get client info directly
        const { data: bookings, error } = await sb
            .from('bookings')
            .select(`
                *,
                profiles:user_id ( full_name, email, phone )
            `)
            .eq('merchant_id', currentMerchantId)
            .neq('status', 'cancelled') // Option: hide cancelled from active view
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`✅ Fetched ${bookings?.length || 0} bookings`);
        
        // Transform data for consistency
        allBookings = (bookings || []).map(booking => ({
            ...booking,
            client_name: booking.profiles?.full_name || booking.customer_name || 'Guest Client',
            client_phone: booking.profiles?.phone || 'N/A'
        }));
        
        filteredBookings = [...allBookings];
        
        updateStats();
        displayBookings(filteredBookings);
        
        // Update Sidebar Badge
        const pendingCount = allBookings.filter(b => b.status === 'pending').length;
        const badge = document.getElementById('actionNeededBadge');
        if(badge) {
            badge.textContent = pendingCount;
            badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }

    } catch (error) {
        console.error('❌ Error loading bookings:', error);
        const tbody = document.getElementById('bookingsTableBody');
        if(tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
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
        out_for_delivery: 0, // Merchant specific status
        completed: 0
    };
    
    allBookings.forEach(booking => {
        const status = (booking.status || 'pending').toLowerCase();
        if (stats.hasOwnProperty(status)) {
            stats[status]++;
        }
    });
    
    // Update stat cards
    setText('pendingCount', stats.pending);
    setText('confirmedCount', stats.confirmed || 0); // Reuse processing card if needed or map correctly
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
// 4. DISPLAY BOOKINGS TABLE
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
    
    tbody.innerHTML = bookings.map(booking => `
        <tr>
            <td style="padding:15px;">
                <strong>${(booking.booking_reference || booking.id).slice(0,8).toUpperCase()}</strong>
            </td>
            <td style="padding:15px;">
                <div style="font-weight:600;">${booking.package_name || 'Custom'}</div>
                <small style="color:#666;">${booking.client_name}</small>
            </td>
            <td style="padding:15px;">
                <div>${booking.recipient_name || 'N/A'}</div>
                <small style="color:#666;">${booking.location || ''}</small>
            </td>
            <td style="padding:15px;">
                <div style="font-weight:500;">${formatDate(booking.surprise_date)}</div>
                <small style="color:#666;">${booking.surprise_time || 'Anytime'}</small>
            </td>
            <td style="padding:15px;">
                ${getStatusBadge(booking.status)}
            </td>
            <td style="padding:15px;">
                <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="openJobModal('${booking.id}')">
                    Manage
                </button>
            </td>
        </tr>
    `).join('');
}

function getStatusBadge(status) {
    const s = (status || 'pending').toLowerCase();
    const colors = {
        pending: 'background:#fef3c7; color:#92400e;',
        confirmed: 'background:#dbeafe; color:#1e40af;',
        processing: 'background:#e0e7ff; color:#3730a3;',
        out_for_delivery: 'background:#f3e8ff; color:#6b21a8;',
        completed: 'background:#dcfce7; color:#166534;',
        cancelled: 'background:#fee2e2; color:#991b1b;'
    };
    const style = colors[s] || colors.pending;
    return `<span class="status-badge" style="padding:4px 10px; border-radius:12px; font-size:11px; font-weight:600; text-transform:uppercase; ${style}">${s.replace(/_/g, ' ')}</span>`;
}

// ============================================
// 5. MANAGE JOB MODAL (VIEW & EDIT)
// ============================================
window.openJobModal = function(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    currentBooking = booking;
    
    const modal = document.getElementById('jobModal');
    
    // 1. Header Info
    setText('modalRef', `#${(booking.booking_reference || booking.id).slice(0,8).toUpperCase()}`);
    setText('modalDate', `Due: ${formatDate(booking.surprise_date)}`);
    
    // 2. Requirements
    setText('modalPackage', booking.package_name || 'Custom');
    setText('modalRecipient', booking.recipient_name || 'N/A');
    setText('modalAddress', booking.location || 'N/A');
    setText('modalPhone', booking.recipient_phone || 'N/A');
    
    const instrEl = document.getElementById('modalInstructions');
    if(instrEl) instrEl.textContent = booking.special_instructions || 'None provided.';

    // 3. Render Tracker & Actions
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
        // Note: Using CSS classes from your html styling
        html += `
            <div class="step-item ${isActive ? 'active' : ''}" style="text-align:center; position:relative; z-index:1; background:white; width:25%;">
                <div class="step-circle" style="width:30px; height:30px; border-radius:50%; margin:0 auto 5px; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid ${isActive ? '#22c55e' : '#e5e7eb'}; background:${isActive ? '#22c55e' : 'white'}; color:${isActive ? 'white' : '#666'};">
                    ${idx + 1}
                </div>
                <div class="step-label" style="font-size:11px; font-weight:600; color:${isActive ? '#22c55e' : '#999'}; text-transform:uppercase;">${label}</div>
            </div>`;
    });
    
    const tracker = document.getElementById('statusTracker');
    if(tracker) {
        tracker.innerHTML = html;
        tracker.style.display = 'flex';
        tracker.style.justifyContent = 'space-between';
        tracker.style.position = 'relative';
        // Add logic for the line connecting dots in CSS ideally
    }
}

function renderActions(booking) {
    const container = document.getElementById('actionButtons');
    let btns = '';

    if (booking.status === 'pending') {
        btns = `
            <button onclick="updateStatus('confirmed')" class="admin-btn" style="background:#22c55e; color:white; border:none; padding:12px; border-radius:6px; cursor:pointer;">Accept Order</button>
            <button onclick="updateStatus('rejected')" class="admin-btn" style="background:#ef4444; color:white; border:none; padding:12px; border-radius:6px; cursor:pointer;">Reject</button>
        `;
    } else if (booking.status === 'confirmed') {
        btns = `<button onclick="updateStatus('processing')" class="admin-btn" style="background:#000; color:white; border:none; padding:12px; border-radius:6px; cursor:pointer; grid-column:span 2;">Start Processing</button>`;
    } else if (booking.status === 'processing') {
        btns = `<button onclick="updateStatus('out_for_delivery')" class="admin-btn" style="background:#000; color:white; border:none; padding:12px; border-radius:6px; cursor:pointer; grid-column:span 2;">Send for Delivery</button>`;
    } else if (booking.status === 'out_for_delivery') {
        btns = `<button onclick="updateStatus('completed')" class="admin-btn" style="background:#22c55e; color:white; border:none; padding:12px; border-radius:6px; cursor:pointer; grid-column:span 2;">Confirm Delivered</button>`;
    } else {
        btns = `<div style="grid-column:span 2; text-align:center; color:green; font-weight:bold; padding:10px;">Order Completed ✅</div>`;
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
        loadBookings(); // Reload table
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
    
    // Re-apply search if exists
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
        if(sort === 'delivery') return new Date(a.surprise_date) - new Date(b.surprise_date);
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