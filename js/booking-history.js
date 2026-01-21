// Booking History JavaScript - Integrated with Supabase

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
    const user = getCurrentUser();
    
    // Also verify with Supabase
    if (typeof API !== 'undefined' && API.auth) {
        try {
            const authenticated = await API.auth.isAuthenticated();
            if (!authenticated && !user) {
                showNotLoggedIn();
                return;
            }
        } catch (error) {
            console.error('Auth check error:', error);
            if (!user) {
                showNotLoggedIn();
                return;
            }
        }
    } else if (!user) {
        showNotLoggedIn();
        return;
    }
    
    // Load bookings from database
    await loadBookings();
    
    // Subscribe to real-time updates
    subscribeToBookingUpdates();
}

// Load bookings from Supabase database
async function loadBookings() {
    showLoading(true);
    
    try {
        // Fetch bookings from Supabase
        const bookings = await API.bookings.getBookings();
        
        allBookings = bookings;
        filteredBookings = bookings;
        
        if (bookings.length === 0) {
            showEmptyState();
        } else {
            updateStats(bookings);
            displayBookings(bookings);
        }
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        showToast('Failed to load bookings: ' + error.message, 'error');
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
        const status = booking.status.toLowerCase();
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
    document.getElementById('pendingCount').textContent = stats.pending;
    document.getElementById('confirmedCount').textContent = stats.confirmed;
    document.getElementById('deliveredCount').textContent = stats.delivered;
    document.getElementById('totalSpent').textContent = formatPrice(stats.totalSpent);
    
    // Show stats section
    document.getElementById('statsSection').style.display = 'grid';
}

// Display bookings
function displayBookings(bookings) {
    const container = document.getElementById('bookingsList');
    
    // Hide all states
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('noResultsState').style.display = 'none';
    document.getElementById('notLoggedInState').style.display = 'none';
    
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
        const status = booking.status.toLowerCase();
        const canCancel = status === 'pending' || status === 'confirmed';
        
        return `
            <div class="booking-card">
                <div class="booking-card-header">
                    <div class="booking-card-title">
                        <h3>${booking.package_name}</h3>
                        <div class="booking-reference">
                            <i class="bi bi-tag"></i>
                            ${booking.booking_reference}
                        </div>
                    </div>
                    <span class="booking-status status-${status}">
                        ${booking.status}
                    </span>
                </div>
                
                <div class="booking-card-body">
                    <div class="booking-detail-item">
                        <div class="detail-label">
                            <i class="bi bi-person"></i>
                            Recipient
                        </div>
                        <div class="detail-value">${booking.recipient_name}</div>
                    </div>
                    
                    <div class="booking-detail-item">
                        <div class="detail-label">
                            <i class="bi bi-telephone"></i>
                            Phone
                        </div>
                        <div class="detail-value">${booking.recipient_phone}</div>
                    </div>
                    
                    <div class="booking-detail-item">
                        <div class="detail-label">
                            <i class="bi bi-calendar"></i>
                            Delivery Date
                        </div>
                        <div class="detail-value">${formatDate(booking.delivery_date)}</div>
                    </div>
                    
                    <div class="booking-detail-item">
                        <div class="detail-label">
                            <i class="bi bi-clock"></i>
                            Time
                        </div>
                        <div class="detail-value">${booking.delivery_time}</div>
                    </div>
                    
                    <div class="booking-detail-item">
                        <div class="detail-label">
                            <i class="bi bi-cash"></i>
                            Amount
                        </div>
                        <div class="detail-value">${formatPrice(parseFloat(booking.package_price))}</div>
                    </div>
                    
                    <div class="booking-detail-item">
                        <div class="detail-label">
                            <i class="bi bi-calendar-plus"></i>
                            Booked On
                        </div>
                        <div class="detail-value">${formatDate(booking.created_at)}</div>
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
    currentSearchTerm = document.getElementById('searchInput').value.toLowerCase();
    applyFiltersAndSort();
}

// Sort bookings
function sortBookings() {
    currentSortOrder = document.getElementById('sortOrder').value;
    applyFiltersAndSort();
}

// Apply filters and sorting
function applyFiltersAndSort() {
    let results = [...allBookings];
    
    // Apply status filter
    if (currentFilter !== 'all') {
        results = results.filter(booking => {
            return booking.status.toLowerCase() === currentFilter.toLowerCase();
        });
    }
    
    // Apply search
    if (currentSearchTerm) {
        results = results.filter(booking => {
            const searchLower = currentSearchTerm;
            return (
                booking.booking_reference.toLowerCase().includes(searchLower) ||
                booking.recipient_name.toLowerCase().includes(searchLower) ||
                booking.package_name.toLowerCase().includes(searchLower) ||
                booking.recipient_phone.includes(currentSearchTerm)
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
                return parseFloat(b.package_price) - parseFloat(a.package_price);
            case 'price-low':
                return parseFloat(a.package_price) - parseFloat(b.package_price);
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
    document.getElementById('searchInput').value = '';
    document.getElementById('sortOrder').value = 'newest';
    
    // Display all bookings
    filteredBookings = allBookings;
    displayBookings(allBookings);
}

// View booking details
async function viewBookingDetails(bookingId) {
    try {
        // Fetch booking details from database
        const booking = await API.bookings.getBooking(bookingId);
        
        if (!booking) {
            showToast('Booking not found', 'error');
            return;
        }
        
        // Display in modal
        const modal = document.getElementById('viewModal');
        const detailsDiv = document.getElementById('bookingDetails');
        
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
                        <span class="booking-status status-${booking.status}">${booking.status}</span>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">Package</span>
                    <span class="detail-row-value">${booking.package_name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">Booked On</span>
                    <span class="detail-row-value">${formatDateTime(booking.created_at)}</span>
                </div>
            </div>
            
            <div class="details-section">
                <div class="details-section-title">Recipient Information</div>
                <div class="detail-row">
                    <span class="detail-row-label">Name</span>
                    <span class="detail-row-value">${booking.recipient_name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">Phone Number</span>
                    <span class="detail-row-value">${booking.recipient_phone}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">Delivery Address</span>
                    <span class="detail-row-value">${booking.recipient_address}</span>
                </div>
            </div>
            
            <div class="details-section">
                <div class="details-section-title">Delivery Information</div>
                <div class="detail-row">
                    <span class="detail-row-label">Delivery Date</span>
                    <span class="detail-row-value">${formatDate(booking.delivery_date)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-row-label">Delivery Time</span>
                    <span class="detail-row-value">${booking.delivery_time}</span>
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
                        <span class="booking-status status-${booking.payment_status || 'pending'}">
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
                <span>${formatPrice(parseFloat(booking.package_price))}</span>
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
        showToast('Failed to load booking details: ' + error.message, 'error');
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
        // Show loading
        const btn = document.querySelector('.btn-danger');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Cancelling...';
        
        // Cancel booking in database
        await API.bookings.cancelBooking(selectedBookingId);
        
        showToast('Booking cancelled successfully', 'success');
        closeCancelModal();
        
        // Reload bookings
        await loadBookings();
        
        // Reapply current filters
        applyFiltersAndSort();
        
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showToast('Failed to cancel booking: ' + error.message, 'error');
        
        // Reset button
        const btn = document.querySelector('.btn-danger');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-x-circle"></i> Yes, Cancel Booking';
    }
}

// Refresh bookings
async function refreshBookings() {
    const btn = document.getElementById('refreshBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Refreshing...';
    
    await loadBookings();
    
    // Reapply current filters
    if (currentFilter !== 'all' || currentSearchTerm) {
        applyFiltersAndSort();
    }
    
    btn.disabled = false;
    btn.innerHTML = originalText;
    showToast('Bookings refreshed', 'success');
}

// Subscribe to real-time updates
function subscribeToBookingUpdates() {
    if (!API || !API.bookings || !API.bookings.subscribeToUpdates) {
        console.log('Real-time updates not available');
        return;
    }
    
    realtimeSubscription = API.bookings.subscribeToUpdates((payload) => {
        console.log('Real-time update received:', payload);
        // Reload bookings when changes occur
        loadBookings().then(() => {
            // Reapply filters if any are active
            if (currentFilter !== 'all' || currentSearchTerm) {
                applyFiltersAndSort();
            }
        });
    });
}

// Close modals
function closeViewModal() {
    document.getElementById('viewModal').style.display = 'none';
}

function closeCancelModal() {
    document.getElementById('cancelModal').style.display = 'none';
    selectedBookingId = null;
}

// Show states
function showLoading(show) {
    document.getElementById('loadingState').style.display = show ? 'block' : 'none';
    document.getElementById('bookingsList').style.display = show ? 'none' : 'grid';
}

function showEmptyState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('bookingsList').style.display = 'none';
    document.getElementById('noResultsState').style.display = 'none';
    document.getElementById('notLoggedInState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('statsSection').style.display = 'none';
}

function showNoResults() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('bookingsList').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('notLoggedInState').style.display = 'none';
    document.getElementById('noResultsState').style.display = 'block';
}

function showNotLoggedIn() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('bookingsList').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('noResultsState').style.display = 'none';
    document.getElementById('notLoggedInState').style.display = 'block';
    document.getElementById('statsSection').style.display = 'none';
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
        realtimeSubscription.unsubscribe();
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