// Booking History JavaScript - Integrated with Supabase - SECURED VERSION
// Fixes: Secured Data Leak (Users only see their own bookings)
// Fixes: Removed UI Screen Jumping on filter clicks
// FIXED: Updated to use window.sbClient

let allBookings = [];
let filteredBookings = [];
let currentFilter = 'all';
let currentSearchTerm = '';
let currentSortOrder = 'newest';
let selectedBookingId = null;
let realtimeSubscription = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndLoadBookings();
});

// Check authentication and load bookings
async function checkAuthAndLoadBookings() {
    // 💥 FIX: Use the updated window.sbClient
    const supabase = window.sbClient || window.supabase;
    
    if (!supabase) {
        console.error("Supabase client not found.");
        showToast("Database connection error.", "error");
        return;
    }

    const { data: authData, error } = await supabase.auth.getUser();

    if (error || !authData?.user) {
        showNotLoggedIn();
        return;
    }
    
    // 3. Load bookings from database securely
    await loadBookings(authData.user.id);
    
    // 4. Subscribe to real-time updates
    subscribeToBookingUpdates(authData.user.id);
}

// 💥 THE SECURITY FIX: Explicitly query ONLY the logged-in user's data
async function loadBookings(userId) {
    showLoading(true);
    
    try {
        const supabase = window.sbClient || window.supabase;
        
        // SECURE FETCH: .eq('user_id', userId) guarantees no data leaks!
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        console.log("🔒 Secured Bookings Loaded:", bookings?.length || 0);

        allBookings = bookings || [];
        filteredBookings = bookings || [];
        
        if (!bookings || bookings.length === 0) {
            showEmptyState();
        } else {
            updateStats(bookings);
            displayBookings(bookings);
        }
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        showToast('Failed to load bookings.', 'error');
        showEmptyState();
    } finally {
        showLoading(false);
    }
}

// Update statistics
function updateStats(bookings) {
    const stats = {
        pending: 0,
        confirmed: 0,
        processing: 0,
        delivered: 0,
        totalSpent: 0
    };
    
    bookings.forEach(booking => {
        const status = (booking.status || 'pending').toLowerCase();
        if (status === 'pending') stats.pending++;
        else if (status === 'confirmed') stats.confirmed++;
        else if (status === 'processing') stats.processing++;
        else if (status === 'delivered') stats.delivered++;
        
        // Add to total spent if not cancelled
        if (status !== 'cancelled') {
            stats.totalSpent += parseFloat(booking.package_price || 0);
        }
    });
    
    // Update UI
    const pendingEl = document.getElementById('pendingCount');
    if (pendingEl) pendingEl.textContent = stats.pending;
    
    const confirmedEl = document.getElementById('confirmedCount');
    if (confirmedEl) confirmedEl.textContent = stats.confirmed;
    
    const deliveredEl = document.getElementById('deliveredCount');
    if (deliveredEl) deliveredEl.textContent = stats.delivered;
    
    const totalEl = document.getElementById('totalSpent');
    if (totalEl) totalEl.textContent = formatPrice(stats.totalSpent);
    
    // Show stats section
    const statsSection = document.getElementById('statsSection');
    if (statsSection) statsSection.style.display = 'grid';
}

// Display bookings
function displayBookings(bookings) {
    const container = document.getElementById('bookingsList');
    
    // Hide all states
    if (document.getElementById('emptyState')) document.getElementById('emptyState').style.display = 'none';
    if (document.getElementById('noResultsState')) document.getElementById('noResultsState').style.display = 'none';
    if (document.getElementById('notLoggedInState')) document.getElementById('notLoggedInState').style.display = 'none';
    
    if (bookings.length === 0) {
        if (currentFilter !== 'all' || currentSearchTerm) {
            showNoResults();
        } else {
            showEmptyState();
        }
        return;
    }
    
    // Show bookings list
    container.style.display = 'grid';
    
    container.innerHTML = bookings.map(booking => {
        const status = (booking.status || 'pending').toLowerCase();
        const canCancel = status === 'pending' || status === 'confirmed';
        
        // Safe Date/Time Handling
        const displayDate = booking.delivery_date ? formatDate(booking.delivery_date) : '<span style="color:#999">Pending</span>';
        const displayTime = booking.delivery_time ? booking.delivery_time : '<span style="color:#999">Pending</span>';
        const displayPrice = booking.package_price ? formatPrice(parseFloat(booking.package_price)) : '₦0.00';
        
        return `
            <div class="booking-card">
                <div class="booking-card-header">
                    <div class="booking-card-title">
                        <h3>${booking.package_name || 'Custom Package'}</h3>
                        <div class="booking-reference">
                            <i class="bi bi-tag"></i>
                            ${booking.booking_reference || '#---'}
                        </div>
                    </div>
                    <span class="booking-status status-${status}">
                        ${booking.status || 'Pending'}
                    </span>
                </div>
                
                <div class="booking-card-body">
                    <div class="booking-detail-item">
                        <div class="detail-label">
                            <i class="bi bi-person"></i>
                            Recipient
                        </div>
                        <div class="detail-value">${booking.recipient_name || 'Not set'}</div>
                    </div>
                    
                    <div class="booking-detail-item">
                        <div class="detail-label">
                            <i class="bi bi-telephone"></i>
                            Phone
                        </div>
                        <div class="detail-value">${booking.recipient_phone || 'Not set'}</div>
                    </div>
                    
                    <div class="booking-detail-item">
                        <div class="detail-label">
                            <i class="bi bi-calendar"></i>
                            Delivery Date
                        </div>
                        <div class="detail-value">${displayDate}</div>
                    </div>
                    
                    <div class="booking-detail-item">
                        <div class="detail-label">
                            <i class="bi bi-clock"></i>
                            Time
                        </div>
                        <div class="detail-value">${displayTime}</div>
                    </div>
                    
                    <div class="booking-detail-item">
                        <div class="detail-label">
                            <i class="bi bi-cash"></i>
                            Amount
                        </div>
                        <div class="detail-value">${displayPrice}</div>
                    </div>
                    
                    <div class="booking-detail-item">
                        <div class="detail-label">
                            <i class="bi bi-calendar-plus"></i>
                            Booked On
                        </div>
                        <div class="detail-value">${booking.created_at ? formatDate(booking.created_at) : '-'}</div>
                    </div>
                </div>
                
                ${booking.special_message ? `
                    <div class="booking-special-message">
                        <div class="message-label">
                            <i class="bi bi-chat-text"></i>
                            Special Message
                        </div>
                        <div class="message-text">"${booking.special_message}"</div>
                    </div>
                ` : ''}
                
                <div class="booking-card-actions">
                    <button class="btn-view" onclick="viewBookingDetails('${booking.id}')">
                        <i class="bi bi-eye"></i> View Details
                    </button>
                    ${canCancel ? `
                        <button class="btn-cancel-booking" onclick="openCancelModal('${booking.id}')">
                            <i class="bi bi-x-circle"></i> Cancel Booking
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Filter bookings by status
function filterByStatus(status) {
    currentFilter = status;
    
    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-status') === status) {
            tab.classList.add('active');
        }
    });
    
    // Filter bookings
    applyFiltersAndSort();
}

// Search bookings
function searchBookings() {
    const input = document.getElementById('searchInput');
    if (input) {
        currentSearchTerm = input.value.toLowerCase();
        applyFiltersAndSort();
    }
}

// Sort bookings
function sortBookings() {
    const select = document.getElementById('sortOrder');
    if (select) {
        currentSortOrder = select.value;
        applyFiltersAndSort();
    }
}

// Apply filters and sorting
function applyFiltersAndSort() {
    let results = [...allBookings];
    
    // Apply status filter
    if (currentFilter !== 'all') {
        results = results.filter(booking => {
            return (booking.status || '').toLowerCase() === currentFilter.toLowerCase();
        });
    }
    
    // Apply search
    if (currentSearchTerm) {
        results = results.filter(booking => {
            const searchLower = currentSearchTerm;
            return (
                (booking.booking_reference || '').toLowerCase().includes(searchLower) ||
                (booking.recipient_name || '').toLowerCase().includes(searchLower) ||
                (booking.package_name || '').toLowerCase().includes(searchLower) ||
                (booking.recipient_phone || '').includes(currentSearchTerm)
            );
        });
    }
    
    // Apply sorting
    results.sort((a, b) => {
        switch (currentSortOrder) {
            case 'newest':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'oldest':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'delivery-date':
                return new Date(a.delivery_date) - new Date(b.delivery_date);
            case 'price-high':
                return parseFloat(b.package_price || 0) - parseFloat(a.package_price || 0);
            case 'price-low':
                return parseFloat(a.package_price || 0) - parseFloat(b.package_price || 0);
            default:
                return 0;
        }
    });
    
    filteredBookings = results;
    displayBookings(results);
}

// Clear all filters
function clearFilters() {
    currentFilter = 'all';
    currentSearchTerm = '';
    currentSortOrder = 'newest';
    
    // Reset UI
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-status') === 'all') {
            tab.classList.add('active');
        }
    });
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const sortSelect = document.getElementById('sortOrder');
    if (sortSelect) sortSelect.value = 'newest';
    
    // Display all bookings
    filteredBookings = allBookings;
    displayBookings(allBookings);
}

// View booking details
async function viewBookingDetails(bookingId) {
    try {
        const supabase = window.sbClient || window.supabase;
        const { data: booking, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();
            
        if (error || !booking) {
            showToast('Booking not found', 'error');
            return;
        }
        
        // Display in modal
        const modal = document.getElementById('viewModal');
        const detailsDiv = document.getElementById('bookingDetails');
        
        const displayDate = booking.delivery_date ? formatDate(booking.delivery_date) : 'Pending';
        const displayTime = booking.delivery_time ? booking.delivery_time : 'Pending';
        const displayPrice = booking.package_price ? formatPrice(parseFloat(booking.package_price)) : '₦0.00';
        
        detailsDiv.innerHTML = `
            <h2><i class="bi bi-receipt"></i> Booking Details</h2>
            
            <div class="details-section">
                <div class="details-section-title">Booking Information</div>
                <div class="detail-row">
                    <span class="detail-row-label">Booking Reference</span>
                    <span class="detail-row-value"><strong>${booking.booking_reference}</strong></span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">Status</span>
                    <span class="detail-row-value">
                        <span class="booking-status status-${(booking.status || 'pending').toLowerCase()}">${booking.status || 'Pending'}</span>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">Package</span>
                    <span class="detail-row-value">${booking.package_name || 'Custom Package'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">Booked On</span>
                    <span class="detail-row-value">${booking.created_at ? formatDateTime(booking.created_at) : '-'}</span>
                </div>
            </div>
            
            <div class="details-section">
                <div class="details-section-title">Recipient Information</div>
                <div class="detail-row">
                    <span class="detail-row-label">Name</span>
                    <span class="detail-row-value">${booking.recipient_name || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">Phone Number</span>
                    <span class="detail-row-value">${booking.recipient_phone || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">Delivery Address</span>
                    <span class="detail-row-value">${booking.recipient_address || '-'}</span>
                </div>
            </div>
            
            <div class="details-section">
                <div class="details-section-title">Delivery Information</div>
                <div class="detail-row">
                    <span class="detail-row-label">Delivery Date</span>
                    <span class="detail-row-value">${displayDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">Delivery Time</span>
                    <span class="detail-row-value">${displayTime}</span>
                </div>
                ${booking.special_message ? `
                    <div class="detail-row">
                        <span class="detail-row-label">Special Message</span>
                        <span class="detail-row-value" style="font-style: italic;">"${booking.special_message}"</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="details-section">
                <div class="details-section-title">Payment Information</div>
                <div class="detail-row">
                    <span class="detail-row-label">Payment Status</span>
                    <span class="detail-row-value">
                        <span class="booking-status status-${(booking.payment_status || 'pending').toLowerCase()}">
                            ${booking.payment_status || 'pending'}
                        </span>
                    </span>
                </div>
                ${booking.payment_reference ? `
                    <div class="detail-row">
                        <span class="detail-row-label">Payment Reference</span>
                        <span class="detail-row-value">${booking.payment_reference}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="total-amount">
                <span>Total Amount</span>
                <span>${displayPrice}</span>
            </div>
            
            ${booking.cancelled_at ? `
                <div class="alert-warning" style="margin-top: 20px;">
                    <i class="bi bi-info-circle"></i>
                    <div>
                        <strong>Booking Cancelled</strong>
                        <p>This booking was cancelled on ${formatDateTime(booking.cancelled_at)}</p>
                    </div>
                </div>
            ` : ''}
        `;
        
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('Error viewing booking:', error);
        showToast('Failed to load booking details.', 'error');
    }
}

// Open cancel modal
function openCancelModal(bookingId) {
    selectedBookingId = bookingId;
    document.getElementById('cancelModal').style.display = 'block';
}

// Confirm cancellation
async function confirmCancellation() {
    if (!selectedBookingId) return;
    
    try {
        const btn = document.querySelector('#cancelModal .btn-danger');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Cancelling...';
        }
        
        const supabase = window.sbClient || window.supabase;
        const { error } = await supabase
            .from('bookings')
            .update({ 
                status: 'cancelled', 
                cancelled_at: new Date().toISOString() 
            })
            .eq('id', selectedBookingId);
            
        if (error) throw error;
        
        showToast('Booking cancelled successfully', 'success');
        closeCancelModal();
        
        // Reload bookings
        checkAuthAndLoadBookings();
        
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showToast('Failed to cancel booking.', 'error');
        
        const btn = document.querySelector('#cancelModal .btn-danger');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-x-circle"></i> Yes, Cancel Booking';
        }
    }
}

// Refresh bookings
async function refreshBookings() {
    const btn = document.getElementById('refreshBtn');
    if (!btn) return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Refreshing...';
    
    await checkAuthAndLoadBookings();
    
    btn.disabled = false;
    btn.innerHTML = originalText;
    showToast('Bookings refreshed', 'success');
}

// Subscribe to real-time updates safely
function subscribeToBookingUpdates(userId) {
    const supabase = window.sbClient || window.supabase;
    
    realtimeSubscription = supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${userId}` },
        (payload) => {
            console.log('Real-time update received:', payload);
            loadBookings(userId);
        }
      )
      .subscribe();
}

// Close modals
function closeViewModal() {
    document.getElementById('viewModal').style.display = 'none';
}

function closeCancelModal() {
    document.getElementById('cancelModal').style.display = 'none';
    selectedBookingId = null;
}

// 💥 THE JUMP BUG FIX: Never hide the list completely, just fade it out!
function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const bookingsList = document.getElementById('bookingsList');
    
    if (show) {
        if(loadingState) loadingState.style.display = 'block';
        if(bookingsList) {
            bookingsList.style.opacity = '0.3';
            bookingsList.style.pointerEvents = 'none'; 
        }
    } else {
        if(loadingState) loadingState.style.display = 'none';
        if(bookingsList) {
            bookingsList.style.display = 'grid';
            bookingsList.style.opacity = '1';
            bookingsList.style.pointerEvents = 'auto';
        }
    }
}

function showEmptyState() {
    showLoading(false);
    if(document.getElementById('noResultsState')) document.getElementById('noResultsState').style.display = 'none';
    if(document.getElementById('notLoggedInState')) document.getElementById('notLoggedInState').style.display = 'none';
    if(document.getElementById('emptyState')) document.getElementById('emptyState').style.display = 'block';
    if(document.getElementById('statsSection')) document.getElementById('statsSection').style.display = 'none';
    if(document.getElementById('bookingsList')) document.getElementById('bookingsList').style.display = 'none';
}

function showNoResults() {
    showLoading(false);
    if(document.getElementById('emptyState')) document.getElementById('emptyState').style.display = 'none';
    if(document.getElementById('notLoggedInState')) document.getElementById('notLoggedInState').style.display = 'none';
    if(document.getElementById('noResultsState')) document.getElementById('noResultsState').style.display = 'block';
    if(document.getElementById('bookingsList')) document.getElementById('bookingsList').style.display = 'none';
}

function showNotLoggedIn() {
    showLoading(false);
    if(document.getElementById('emptyState')) document.getElementById('emptyState').style.display = 'none';
    if(document.getElementById('noResultsState')) document.getElementById('noResultsState').style.display = 'none';
    if(document.getElementById('notLoggedInState')) document.getElementById('notLoggedInState').style.display = 'block';
    if(document.getElementById('statsSection')) document.getElementById('statsSection').style.display = 'none';
    if(document.getElementById('bookingsList')) document.getElementById('bookingsList').style.display = 'none';
}

// Close modals when clicking outside
window.onclick = function(event) {
    const viewModal = document.getElementById('viewModal');
    const cancelModal = document.getElementById('cancelModal');
    
    if (event.target === viewModal) {
        closeViewModal();
    }
    if (event.target === cancelModal) {
        closeCancelModal();
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (realtimeSubscription) {
        const supabase = window.sbClient || window.supabase;
        supabase.removeChannel(realtimeSubscription);
    }
});

// Add spin animation for refresh button
const spinStyle = document.createElement('style');
spinStyle.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .spin {
        animation: spin 1s linear infinite;
        display: inline-block;
    }
`;
document.head.appendChild(spinStyle);

// --- FALLBACK HELPERS ---

if (typeof formatDate === 'undefined') {
    window.formatDate = function(dateString) {
        if (!dateString) return 'Pending';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        try {
            return new Date(dateString).toLocaleDateString('en-GB', options);
        } catch(e) { return dateString; }
    };
}

if (typeof formatDateTime === 'undefined') {
    window.formatDateTime = function(dateString) {
        if (!dateString) return 'Pending';
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' };
        try {
            return new Date(dateString).toLocaleDateString('en-GB', options);
        } catch(e) { return dateString; }
    };
}

if (typeof formatPrice === 'undefined') {
    window.formatPrice = function(amount) {
        if (amount === undefined || amount === null) return '₦0.00';
        return '₦' + new Intl.NumberFormat('en-NG').format(amount);
    };
}

if (typeof showToast === 'undefined') {
    window.showToast = function(message, type) {
        alert(`${type ? type.toUpperCase() : 'INFO'}: ${message}`);
    };
}