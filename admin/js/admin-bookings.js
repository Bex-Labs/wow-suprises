/**
 * Admin Bookings Management JavaScript - FULLY FUNCTIONAL
 * All 17 functions working with Supabase integration
 */

let allBookings = [];
let filteredBookings = [];
let currentBooking = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Bookings page loading...');
    
    // Protect admin route
    const isAuth = await requireAdminAuth();
    if (!isAuth) {
        console.log('❌ Not authenticated, redirecting...');
        return;
    }
    
    console.log('✅ Authenticated');
    
    // Load admin name
    loadAdminName();
    
    // Load all bookings
    await loadAllBookings();
});

// Load admin name from session
function loadAdminName() {
    try {
        const adminSession = sessionStorage.getItem('adminSession') || localStorage.getItem('adminSession');
        if (adminSession) {
            const admin = JSON.parse(adminSession);
            const nameEl = document.getElementById('adminName');
            if (nameEl && admin.name) {
                nameEl.textContent = admin.name;
                console.log('✅ Admin name loaded:', admin.name);
            }
        }
    } catch (error) {
        console.error('Error loading admin name:', error);
    }
}

// ============================================
// 1. LOAD ALL BOOKINGS FROM DATABASE
// ============================================
async function loadAllBookings() {
    try {
        console.log('📥 Loading bookings from database...');
        const sb = getSupabaseAdmin();
        
        if (!sb) {
            throw new Error('Supabase client not initialized');
        }
        
        // Fetch all bookings with user info
        const { data: bookings, error } = await sb
            .from('bookings')
            .select(`
                *,
                profiles:user_id (
                    full_name,
                    name,
                    email,
                    phone
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
        
        console.log(`✅ Fetched ${bookings?.length || 0} bookings from database`);
        
        // Transform data
        allBookings = (bookings || []).map(booking => ({
            ...booking,
            client_name: booking.profiles?.full_name || booking.profiles?.name || 'Unknown Client',
            client_email: booking.profiles?.email || 'No email',
            client_phone: booking.profiles?.phone || booking.recipient_phone || 'No phone'
        }));
        
        filteredBookings = [...allBookings];
        
        console.log(`✅ Loaded ${allBookings.length} bookings`);
        
        // Update UI
        updateStats();
        displayBookings(filteredBookings);
        
    } catch (error) {
        console.error('❌ Error loading bookings:', error);
        showToast('Failed to load bookings: ' + error.message, 'error');
        
        // Show empty state
        document.getElementById('bookingsTableBody').innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #999;">
                    <i class="bi bi-exclamation-triangle" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                    <strong>Error loading bookings</strong><br>
                    ${error.message}
                </td>
            </tr>
        `;
    }
}

// ============================================
// 2. UPDATE STATISTICS
// ============================================
function updateStats() {
    const stats = {
        pending: 0,
        confirmed: 0,
        processing: 0,
        delivered: 0,
        cancelled: 0
    };
    
    allBookings.forEach(booking => {
        const status = (booking.status || 'pending').toLowerCase();
        if (stats.hasOwnProperty(status)) {
            stats[status]++;
        }
    });
    
    // Update stat cards
    const pendingEl = document.getElementById('pendingCount');
    const confirmedEl = document.getElementById('confirmedCount');
    const processingEl = document.getElementById('processingCount');
    const deliveredEl = document.getElementById('deliveredCount');
    const totalEl = document.getElementById('totalBookingsCount');
    
    if (pendingEl) pendingEl.textContent = stats.pending;
    if (confirmedEl) confirmedEl.textContent = stats.confirmed;
    if (processingEl) processingEl.textContent = stats.processing;
    if (deliveredEl) deliveredEl.textContent = stats.delivered;
    if (totalEl) totalEl.textContent = `${allBookings.length} bookings`;
    
    console.log('📊 Stats updated:', stats);
}

// ============================================
// 3. DISPLAY BOOKINGS IN TABLE
// ============================================
function displayBookings(bookings) {
    const tbody = document.getElementById('bookingsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) {
        console.error('❌ Table body not found!');
        return;
    }
    
    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        console.log('📭 No bookings to display');
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    tbody.innerHTML = bookings.map(booking => `
        <tr>
            <td>
                <strong>${booking.booking_reference || 'N/A'}</strong>
            </td>
            <td>
                <div class="client-info">
                    <div class="client-name">${booking.client_name}</div>
                    <div class="client-email" style="font-size: 12px; color: #666;">${booking.client_email}</div>
                </div>
            </td>
            <td>${booking.package_name || 'N/A'}</td>
            <td>
                <div class="recipient-info">
                    <div>${booking.recipient_name || 'N/A'}</div>
                    <small style="color: #666;">${booking.recipient_phone || 'N/A'}</small>
                </div>
            </td>
            <td>${formatDate(booking.delivery_date)} ${booking.delivery_time ? '<br><small>' + formatTime(booking.delivery_time) + '</small>' : ''}</td>
            <td><strong>${formatCurrency(parseFloat(booking.package_price || 0))}</strong></td>
            <td>
                ${getStatusBadge(booking.status || 'pending', 'booking')}
            </td>
            <td>
                ${getStatusBadge(booking.payment_status || 'pending', 'payment')}
            </td>
            <td>
                <div class="action-buttons" style="display: flex; gap: 8px;">
                    <button class="btn-icon" onclick="viewBooking('${booking.id}')" title="View Details" style="padding: 6px 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="editBooking('${booking.id}')" title="Edit" style="padding: 6px 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${booking.status !== 'cancelled' ? `
                        <button class="btn-icon btn-danger" onclick="confirmCancelBooking('${booking.id}')" title="Cancel" style="padding: 6px 10px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="bi bi-x-circle"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
    
    console.log(`✅ Displayed ${bookings.length} bookings in table`);
}

// ============================================
// 4. VIEW BOOKING DETAILS
// ============================================
function viewBooking(bookingId) {
    try {
        console.log('👁️ Viewing booking:', bookingId);
        const booking = allBookings.find(b => b.id === bookingId);
        
        if (!booking) {
            showToast('Booking not found', 'error');
            return;
        }
        
        const modal = document.getElementById('viewModal');
        const modalBody = document.getElementById('viewModalBody');
        
        if (!modal || !modalBody) {
            console.error('❌ Modal elements not found!');
            return;
        }
        
        modalBody.innerHTML = `
            <div class="booking-details-view" style="padding: 20px;">
                <div class="details-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
                    <div class="detail-section" style="background: #f9fafb; padding: 16px; border-radius: 8px;">
                        <h3 style="margin-bottom: 16px;"><i class="bi bi-info-circle"></i> Booking Information</h3>
                        <div class="detail-row" style="margin-bottom: 12px;">
                            <span class="label" style="font-weight: 600; color: #666;">Reference:</span>
                            <span class="value"><strong>${booking.booking_reference || 'N/A'}</strong></span>
                        </div>
                        <div class="detail-row" style="margin-bottom: 12px;">
                            <span class="label" style="font-weight: 600; color: #666;">Status:</span>
                            <span class="value">${getStatusBadge(booking.status || 'pending', 'booking')}</span>
                        </div>
                        <div class="detail-row" style="margin-bottom: 12px;">
                            <span class="label" style="font-weight: 600; color: #666;">Package:</span>
                            <span class="value">${booking.package_name || 'N/A'}</span>
                        </div>
                        <div class="detail-row" style="margin-bottom: 12px;">
                            <span class="label" style="font-weight: 600; color: #666;">Amount:</span>
                            <span class="value"><strong>${formatCurrency(parseFloat(booking.package_price || 0))}</strong></span>
                        </div>
                        <div class="detail-row">
                            <span class="label" style="font-weight: 600; color: #666;">Booked On:</span>
                            <span class="value">${formatDate(booking.created_at, true)}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section" style="background: #f9fafb; padding: 16px; border-radius: 8px;">
                        <h3 style="margin-bottom: 16px;"><i class="bi bi-person"></i> Client Information</h3>
                        <div class="detail-row" style="margin-bottom: 12px;">
                            <span class="label" style="font-weight: 600; color: #666;">Name:</span>
                            <span class="value">${booking.client_name}</span>
                        </div>
                        <div class="detail-row" style="margin-bottom: 12px;">
                            <span class="label" style="font-weight: 600; color: #666;">Email:</span>
                            <span class="value">${booking.client_email}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label" style="font-weight: 600; color: #666;">Phone:</span>
                            <span class="value">${booking.client_phone}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section" style="background: #f9fafb; padding: 16px; border-radius: 8px;">
                        <h3 style="margin-bottom: 16px;"><i class="bi bi-gift"></i> Recipient Information</h3>
                        <div class="detail-row" style="margin-bottom: 12px;">
                            <span class="label" style="font-weight: 600; color: #666;">Name:</span>
                            <span class="value">${booking.recipient_name || 'N/A'}</span>
                        </div>
                        <div class="detail-row" style="margin-bottom: 12px;">
                            <span class="label" style="font-weight: 600; color: #666;">Phone:</span>
                            <span class="value">${booking.recipient_phone || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label" style="font-weight: 600; color: #666;">Address:</span>
                            <span class="value">${booking.recipient_address || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section" style="background: #f9fafb; padding: 16px; border-radius: 8px;">
                        <h3 style="margin-bottom: 16px;"><i class="bi bi-calendar"></i> Delivery Information</h3>
                        <div class="detail-row" style="margin-bottom: 12px;">
                            <span class="label" style="font-weight: 600; color: #666;">Date:</span>
                            <span class="value">${formatDate(booking.delivery_date)}</span>
                        </div>
                        <div class="detail-row" style="margin-bottom: 12px;">
                            <span class="label" style="font-weight: 600; color: #666;">Time:</span>
                            <span class="value">${booking.delivery_time ? formatTime(booking.delivery_time) : 'Not specified'}</span>
                        </div>
                        ${booking.special_message ? `
                            <div class="detail-row">
                                <span class="label" style="font-weight: 600; color: #666;">Message:</span>
                                <span class="value" style="font-style: italic;">"${booking.special_message}"</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="detail-section" style="background: #f9fafb; padding: 16px; border-radius: 8px;">
                        <h3 style="margin-bottom: 16px;"><i class="bi bi-credit-card"></i> Payment Information</h3>
                        <div class="detail-row" style="margin-bottom: 12px;">
                            <span class="label" style="font-weight: 600; color: #666;">Status:</span>
                            <span class="value">${getStatusBadge(booking.payment_status || 'pending', 'payment')}</span>
                        </div>
                        ${booking.payment_reference ? `
                            <div class="detail-row">
                                <span class="label" style="font-weight: 600; color: #666;">Reference:</span>
                                <span class="value">${booking.payment_reference}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${booking.admin_notes ? `
                        <div class="detail-section" style="background: #fef3c7; padding: 16px; border-radius: 8px;">
                            <h3 style="margin-bottom: 16px;"><i class="bi bi-sticky"></i> Admin Notes</h3>
                            <div class="admin-notes-view" style="white-space: pre-wrap;">
                                ${booking.admin_notes}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="modal-actions" style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="btn-primary" onclick="editBooking('${booking.id}'); closeViewModal();" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        <i class="bi bi-pencil"></i> Edit Booking
                    </button>
                    <button class="btn-secondary" onclick="closeViewModal()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
        console.log('✅ View modal opened');
        
    } catch (error) {
        console.error('❌ Error viewing booking:', error);
        showToast('Failed to load booking details', 'error');
    }
}

// ============================================
// 5. EDIT BOOKING
// ============================================
function editBooking(bookingId) {
    try {
        console.log('✏️ Editing booking:', bookingId);
        const booking = allBookings.find(b => b.id === bookingId);
        
        if (!booking) {
            showToast('Booking not found', 'error');
            return;
        }
        
        currentBooking = booking;
        
        const modal = document.getElementById('editModal');
        const modalBody = document.getElementById('editModalBody');
        
        if (!modal || !modalBody) {
            console.error('❌ Modal elements not found!');
            return;
        }
        
        modalBody.innerHTML = `
            <form id="editBookingForm" onsubmit="saveBooking(event)" style="padding: 20px;">
                <div class="form-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Booking Reference</label>
                        <input type="text" value="${booking.booking_reference || 'N/A'}" disabled style="width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 6px; background: #f3f4f6;">
                    </div>
                    
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Status *</label>
                        <select name="status" required style="width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 6px;">
                            <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="processing" ${booking.status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="delivered" ${booking.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Payment Status *</label>
                        <select name="payment_status" required style="width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 6px;">
                            <option value="pending" ${booking.payment_status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="paid" ${booking.payment_status === 'paid' ? 'selected' : ''}>Paid</option>
                            <option value="refunded" ${booking.payment_status === 'refunded' ? 'selected' : ''}>Refunded</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Delivery Date *</label>
                        <input type="date" name="delivery_date" value="${booking.delivery_date || ''}" required style="width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 6px;">
                    </div>
                    
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Delivery Time</label>
                        <input type="time" name="delivery_time" value="${booking.delivery_time || ''}" style="width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 6px;">
                    </div>
                    
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Admin Notes</label>
                        <textarea name="admin_notes" rows="4" placeholder="Add notes visible only to admins..." style="width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 6px; font-family: inherit;">${booking.admin_notes || ''}</textarea>
                    </div>
                </div>
                
                <div class="modal-actions" style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
                    <button type="submit" class="btn-primary" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        <i class="bi bi-check-circle"></i> Save Changes
                    </button>
                    <button type="button" class="btn-secondary" onclick="closeEditModal()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Cancel
                    </button>
                </div>
            </form>
        `;
        
        modal.style.display = 'block';
        console.log('✅ Edit modal opened');
        
    } catch (error) {
        console.error('❌ Error editing booking:', error);
        showToast('Failed to load booking for editing', 'error');
    }
}

// ============================================
// 6. SAVE BOOKING CHANGES
// ============================================
async function saveBooking(event) {
    event.preventDefault();
    
    if (!currentBooking) {
        showToast('No booking selected', 'error');
        return;
    }
    
    const form = event.target;
    const formData = new FormData(form);
    
    const updates = {
        status: formData.get('status'),
        payment_status: formData.get('payment_status'),
        delivery_date: formData.get('delivery_date'),
        delivery_time: formData.get('delivery_time') || null,
        admin_notes: formData.get('admin_notes') || null,
        updated_at: new Date().toISOString()
    };
    
    try {
        console.log('💾 Saving booking changes...', updates);
        
        const sb = getSupabaseAdmin();
        
        const { data, error } = await sb
            .from('bookings')
            .update(updates)
            .eq('id', currentBooking.id)
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('✅ Booking updated successfully');
        showToast('Booking updated successfully', 'success');
        closeEditModal();
        
        // Reload bookings
        await loadAllBookings();
        
    } catch (error) {
        console.error('❌ Error saving booking:', error);
        showToast('Failed to update booking: ' + error.message, 'error');
    }
}

// ============================================
// 7. CONFIRM CANCEL BOOKING
// ============================================
function confirmCancelBooking(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    if (confirm(`Are you sure you want to cancel booking ${booking.booking_reference}?\n\nThis action will mark the booking as cancelled.`)) {
        cancelBooking(bookingId);
    }
}

// ============================================
// 8. CANCEL BOOKING
// ============================================
async function cancelBooking(bookingId) {
    try {
        console.log('🚫 Cancelling booking:', bookingId);
        
        const sb = getSupabaseAdmin();
        
        const { data, error } = await sb
            .from('bookings')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', bookingId)
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('✅ Booking cancelled successfully');
        showToast('Booking cancelled successfully', 'success');
        
        // Reload bookings
        await loadAllBookings();
        
    } catch (error) {
        console.error('❌ Error cancelling booking:', error);
        showToast('Failed to cancel booking: ' + error.message, 'error');
    }
}

// ============================================
// 9. SEARCH BOOKINGS
// ============================================
function searchBookings() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    console.log('🔍 Searching for:', searchTerm);
    
    if (!searchTerm) {
        filteredBookings = [...allBookings];
    } else {
        filteredBookings = allBookings.filter(booking => {
            return (
                (booking.booking_reference || '').toLowerCase().includes(searchTerm) ||
                (booking.client_name || '').toLowerCase().includes(searchTerm) ||
                (booking.client_email || '').toLowerCase().includes(searchTerm) ||
                (booking.recipient_name || '').toLowerCase().includes(searchTerm) ||
                (booking.recipient_phone || '').includes(searchTerm) ||
                (booking.package_name || '').toLowerCase().includes(searchTerm)
            );
        });
    }
    
    console.log(`✅ Found ${filteredBookings.length} matching bookings`);
    displayBookings(filteredBookings);
}

// ============================================
// 10. FILTER BOOKINGS
// ============================================
function filterBookings() {
    const statusFilter = document.getElementById('statusFilter').value.toLowerCase();
    const paymentFilter = document.getElementById('paymentFilter').value.toLowerCase();
    
    console.log('🔍 Filtering - Status:', statusFilter, 'Payment:', paymentFilter);
    
    filteredBookings = allBookings.filter(booking => {
        const bookingStatus = (booking.status || 'pending').toLowerCase();
        const bookingPayment = (booking.payment_status || 'pending').toLowerCase();
        
        const matchesStatus = !statusFilter || bookingStatus === statusFilter;
        const matchesPayment = !paymentFilter || bookingPayment === paymentFilter;
        
        return matchesStatus && matchesPayment;
    });
    
    console.log(`✅ Filtered to ${filteredBookings.length} bookings`);
    displayBookings(filteredBookings);
}

// ============================================
// 11. SORT BOOKINGS
// ============================================
function sortBookings() {
    const sortOrder = document.getElementById('sortOrder').value;
    
    console.log('📊 Sorting by:', sortOrder);
    
    filteredBookings.sort((a, b) => {
        switch(sortOrder) {
            case 'newest':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'oldest':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'delivery':
                return new Date(a.delivery_date) - new Date(b.delivery_date);
            case 'amount-high':
                return parseFloat(b.package_price || 0) - parseFloat(a.package_price || 0);
            case 'amount-low':
                return parseFloat(a.package_price || 0) - parseFloat(b.package_price || 0);
            default:
                return 0;
        }
    });
    
    displayBookings(filteredBookings);
}

// ============================================
// 12. CLEAR FILTERS
// ============================================
function clearFilters() {
    console.log('🧹 Clearing all filters');
    
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('paymentFilter').value = '';
    document.getElementById('sortOrder').value = 'newest';
    
    filteredBookings = [...allBookings];
    displayBookings(filteredBookings);
    
    showToast('Filters cleared', 'info');
}

// ============================================
// 13. REFRESH BOOKINGS
// ============================================
async function refreshBookings() {
    console.log('🔄 Refreshing bookings...');
    
    const btn = event?.target?.closest('button');
    if (btn) {
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Refreshing...';
        
        await loadAllBookings();
        
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    } else {
        await loadAllBookings();
    }
    
    showToast('Bookings refreshed', 'success');
}

// ============================================
// 14. EXPORT TO PDF
// ============================================
function exportBookings() {
    try {
        console.log('📄 Exporting bookings to PDF...');
        
        if (filteredBookings.length === 0) {
            showToast('No bookings to export', 'warning');
            return;
        }
        
        showToast('Generating PDF...', 'info');
        
        // Check if jsPDF is available
        if (typeof window.jspdf === 'undefined') {
            showToast('PDF library not loaded', 'error');
            console.error('jsPDF library not found');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('WOW Surprises - Bookings Report', 14, 20);
        
        // Add date
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Total Bookings: ${filteredBookings.length}`, 14, 34);
        
        // Prepare table data
        const tableData = filteredBookings.map(booking => [
            booking.booking_reference || 'N/A',
            booking.client_name,
            booking.package_name || 'N/A',
            booking.recipient_name || 'N/A',
            formatDate(booking.delivery_date),
            formatCurrency(parseFloat(booking.package_price || 0)),
            booking.status || 'pending',
            booking.payment_status || 'pending'
        ]);
        
        // Add table
        doc.autoTable({
            startY: 40,
            head: [['Reference', 'Client', 'Package', 'Recipient', 'Delivery', 'Amount', 'Status', 'Payment']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [102, 126, 234] },
            styles: { fontSize: 9 },
            columnStyles: {
                5: { halign: 'right' }
            }
        });
        
        // Save PDF
        const filename = `WOW-Bookings-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        
        console.log('✅ PDF exported:', filename);
        showToast('PDF exported successfully', 'success');
        
    } catch (error) {
        console.error('❌ Export error:', error);
        showToast('Failed to export bookings: ' + error.message, 'error');
    }
}

// ============================================
// 15. CLOSE EDIT MODAL
// ============================================
function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentBooking = null;
    console.log('✅ Edit modal closed');
}

// ============================================
// 16. CLOSE VIEW MODAL
// ============================================
function closeViewModal() {
    const modal = document.getElementById('viewModal');
    if (modal) {
        modal.style.display = 'none';
    }
    console.log('✅ View modal closed');
}

// Close modal on outside click
window.onclick = function(event) {
    const editModal = document.getElementById('editModal');
    const viewModal = document.getElementById('viewModal');
    
    if (event.target === editModal) {
        closeEditModal();
    }
    if (event.target === viewModal) {
        closeViewModal();
    }
}

// ============================================
// 17. ADMIN LOGOUT
// ============================================
async function adminLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        console.log('🚪 Logging out...');
        
        const sb = getSupabaseAdmin();
        if (sb) {
            await sb.auth.signOut();
        }
        
        // Clear sessions
        sessionStorage.clear();
        localStorage.removeItem('adminSession');
        
        showToast('Logged out successfully', 'success');
        
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        // Force redirect anyway
        window.location.href = 'admin-login.html';
    }
}

console.log('✅ Admin bookings script loaded');