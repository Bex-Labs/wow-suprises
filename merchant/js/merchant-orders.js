/**
 * Merchant Orders JavaScript
 * Fixed: Business Name display and Event Listeners
 */

let currentMerchant = null;
let allOrders = [];
let filteredOrders = [];
let realtimeSubscription = null;

// Initialize orders page
async function initOrders() {
    try {
        // Get current merchant
        currentMerchant = await MerchantAuth.getCurrentMerchant();
        
        if (!currentMerchant) {
            console.error('❌ Could not load merchant profile — no auth session.');
            window.location.replace('../login.html');
            return;
        }
        
        // FIX: Update merchant name using snake_case (matches DB)
        const nameEl = document.getElementById('merchantDisplayName');
        if (nameEl) nameEl.textContent = currentMerchant.business_name || 'Merchant';
        
        // Initialize Search and Filter Listeners
        setupEventListeners();

        // Load orders
        await loadOrders();
        
        // Setup real-time updates
        setupRealtimeUpdates();
        
    } catch (error) {
        console.error('Orders initialization error:', error);
        showToast('Failed to load orders', 'error');
    }
}

// Setup Event Listeners for Search and Filters
function setupEventListeners() {
    const searchInput = document.getElementById('searchOrders');
    const statusSelect = document.getElementById('statusFilter');
    const dateSelect = document.getElementById('dateFilter');
    const exportBtn = document.getElementById('exportOrdersBtn'); // Assuming you have an export button

    if (searchInput) {
        searchInput.addEventListener('input', filterOrders);
    }
    
    if (statusSelect) {
        statusSelect.addEventListener('change', filterOrders);
    }
    
    if (dateSelect) {
        dateSelect.addEventListener('change', filterOrders);
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportOrders);
    }
}

// Load all orders
async function loadOrders() {
    try {
        showLoadingState();
        
        // Now works perfectly because we added 'merchant_id' to bookings table
        const { data: orders, error } = await MerchantAuth.getSupabase()
            .from('bookings')
            .select('*')
            .eq('merchant_id', currentMerchant.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allOrders = orders || [];
        filteredOrders = [...allOrders];
        
        // Update pending badge
        const pendingCount = allOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
        const badge = document.getElementById('pendingOrdersBadge');
        if (badge) badge.textContent = pendingCount;
        
        hideLoadingState();
        displayOrders();
        
        // Apply any existing filters (in case user typed before load)
        filterOrders();
        
    } catch (error) {
        console.error('Load orders error:', error);
        showToast('Failed to load orders', 'error');
        hideLoadingState();
        showEmptyState();
    }
}

// Display orders in the list
function displayOrders() {
    const ordersList = document.getElementById('ordersList');
    const ordersCount = document.getElementById('ordersCount');
    const emptyState = document.getElementById('ordersEmpty');
    
    if (!ordersList) return;
    
    // Update count
    if (ordersCount) ordersCount.textContent = filteredOrders.length;
    
    // Show empty state if no orders
    if (filteredOrders.length === 0) {
        ordersList.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // Status colors and icons
    const statusConfig = {
        'pending': { color: '#f59e0b', icon: 'clock', bgColor: '#fef3c7', label: 'Pending' },
        'confirmed': { color: '#3b82f6', icon: 'check-circle', bgColor: '#dbeafe', label: 'Confirmed' },
        'in-progress': { color: '#8b5cf6', icon: 'truck', bgColor: '#ede9fe', label: 'In Progress' },
        'completed': { color: '#22c55e', icon: 'check-circle-fill', bgColor: '#dcfce7', label: 'Completed' },
        'cancelled': { color: '#ef4444', icon: 'x-circle', bgColor: '#fee2e2', label: 'Cancelled' }
    };
    
    // Generate orders HTML
    ordersList.innerHTML = filteredOrders.map(order => {
        const status = statusConfig[order.status] || statusConfig['pending'];
        // Fix date parsing
        const orderDate = order.surprise_date ? new Date(order.surprise_date) : new Date();
        const createdDate = new Date(order.created_at);
        const isUrgent = (orderDate - new Date()) < (24 * 60 * 60 * 1000); // Less than 24 hours
        
        return `
            <div class="order-row" style="cursor: pointer; padding: 16px; border-bottom: 1px solid #eee; transition: background 0.2s;" 
                 onclick="window.location.href='merchant-order-details.html?id=${order.id}'"
                 onmouseover="this.style.background='#f9f9f9'"
                 onmouseout="this.style.background='transparent'">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div style="width: 48px; height: 48px; background: ${status.bgColor}; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="bi bi-${status.icon}" style="font-size: 24px; color: ${status.color};"></i>
                    </div>
                    
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px; flex-wrap: wrap;">
                            <span style="font-weight: 700; color: #000; font-size: 15px;">
                                Order #${order.id.substring(0, 8).toUpperCase()}
                            </span>
                            ${isUrgent && order.status !== 'completed' && order.status !== 'cancelled' ? 
                                `<span style="padding: 3px 8px; background: #fee2e2; color: #dc2626; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                                    <i class="bi bi-exclamation-triangle-fill"></i> Urgent
                                </span>` 
                                : ''}
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 16px; font-size: 13px; color: #666; flex-wrap: wrap;">
                            <span><i class="bi bi-person"></i> ${order.recipient_name || 'Unknown'}</span>
                            <span><i class="bi bi-calendar"></i> ${formatDate(orderDate, 'short')}</span>
                            <span><i class="bi bi-clock"></i> ${order.surprise_time || 'Anytime'}</span>
                            ${order.location ? `<span><i class="bi bi-geo-alt"></i> ${truncateText(order.location, 30)}</span>` : ''}
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 16px; flex-shrink: 0;">
                        ${order.budget ? 
                            `<div style="text-align: right;">
                                <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Amount</div>
                                <div style="font-size: 18px; font-weight: 700; color: #22c55e;">${formatCurrency(order.budget, 'NGN')}</div>
                            </div>` 
                            : ''}
                        
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                            <span style="padding: 6px 12px; background: ${status.bgColor}; color: ${status.color}; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">
                                ${status.label}
                            </span>
                            <span style="font-size: 11px; color: #999; white-space: nowrap;">
                                ${getTimeAgo(createdDate)}
                            </span>
                        </div>
                        
                        <i class="bi bi-chevron-right" style="font-size: 20px; color: #ccc;"></i>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filter orders based on search, status, and date
function filterOrders() {
    const searchTerm = document.getElementById('searchOrders')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const dateFilter = document.getElementById('dateFilter')?.value || 'all';
    
    filteredOrders = allOrders.filter(order => {
        // Search filter
        const matchesSearch = !searchTerm || 
            order.id.toLowerCase().includes(searchTerm) ||
            order.recipient_name?.toLowerCase().includes(searchTerm) ||
            order.recipient_phone?.includes(searchTerm) ||
            order.location?.toLowerCase().includes(searchTerm);
        
        // Status filter
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        
        // Date filter
        let matchesDate = true;
        if (dateFilter !== 'all') {
            const orderDate = new Date(order.created_at);
            const now = new Date();
            
            if (dateFilter === 'today') {
                matchesDate = orderDate.toDateString() === now.toDateString();
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                matchesDate = orderDate >= weekAgo;
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                matchesDate = orderDate >= monthAgo;
            }
        }
        
        return matchesSearch && matchesStatus && matchesDate;
    });
    
    displayOrders();
}

// Export orders to CSV
function exportOrders() {
    if (filteredOrders.length === 0) {
        showToast('No orders to export', 'warning');
        return;
    }
    
    try {
        // Prepare CSV data
        const headers = ['Order ID', 'Customer Name', 'Phone', 'Email', 'Date', 'Time', 'Location', 'Status', 'Amount', 'Created'];
        const rows = filteredOrders.map(order => [
            order.id.substring(0, 8).toUpperCase(),
            order.recipient_name || '',
            order.recipient_phone || '',
            order.recipient_email || '',
            formatDate(new Date(order.surprise_date), 'short'),
            order.surprise_time || '',
            order.location || '',
            order.status,
            order.budget || 0,
            formatDate(new Date(order.created_at), 'short')
        ]);
        
        // Create CSV content
        let csvContent = headers.join(',') + '\n';
        csvContent += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Orders exported successfully', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export orders', 'error');
    }
}

// Setup real-time updates
function setupRealtimeUpdates() {
    // Clean up existing subscription
    if (realtimeSubscription) {
        MerchantAuth.getSupabase().removeChannel(realtimeSubscription);
    }
    
    // Subscribe to order changes
    realtimeSubscription = MerchantAuth.getSupabase()
        .channel('orders-changes')
        .on('postgres_changes',
            {
                event: '*', // All events (INSERT, UPDATE, DELETE)
                schema: 'public',
                table: 'bookings',
                filter: `merchant_id=eq.${currentMerchant.id}`
            },
            (payload) => {
                console.log('Order change detected:', payload);
                
                if (payload.eventType === 'INSERT') {
                    showToast('🎉 New order received!', 'success');
                    playNotificationSound();
                } else if (payload.eventType === 'UPDATE') {
                    showToast('Order updated', 'info');
                }
                
                // Reload orders
                loadOrders();
            }
        )
        .subscribe();
}

// Show loading state
function showLoadingState() {
    const loading = document.getElementById('ordersLoading');
    const list = document.getElementById('ordersList');
    const empty = document.getElementById('ordersEmpty');
    
    if (loading) loading.style.display = 'block';
    if (list) list.innerHTML = '';
    if (empty) empty.style.display = 'none';
}

// Hide loading state
function hideLoadingState() {
    const loading = document.getElementById('ordersLoading');
    if (loading) loading.style.display = 'none';
}

// Show empty state
function showEmptyState() {
    const empty = document.getElementById('ordersEmpty');
    const list = document.getElementById('ordersList');
    
    if (list) list.innerHTML = '';
    if (empty) empty.style.display = 'block';
}

// Helper: Get time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }
    
    return 'Just now';
}

// Helper: Truncate text
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Helper: Format currency
function formatCurrency(amount, currency = 'NGN') {
    if (isNaN(amount)) amount = 0;
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Helper: Format date
function formatDate(date, format = 'default') {
    if (!date || isNaN(date.getTime())) return 'N/A';
    
    if (format === 'short') {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
    
    return date.toLocaleDateString();
}

// Play notification sound
function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGa57OahUBELTqXh8LdjGwU2jdXxzn0vBSh+zPDfkj4IEl601+ysYBsEMord8Mpbc1q5mlw63yd2u2cn0hs6jnzf2gljhr486u3dkgm2y/HOfC8FJHbE8OKYSwoWbL3u8b');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (e) {
        console.log('Audio not supported:', e);
    }
}

// Logout function
async function merchantLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            if (realtimeSubscription) {
                MerchantAuth.getSupabase().removeChannel(realtimeSubscription);
            }
            await MerchantAuth.logout();
            showToast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = 'merchant-login.html';
            }, 1000);
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Logout failed', 'error');
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initOrders();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (realtimeSubscription) {
        MerchantAuth.getSupabase().removeChannel(realtimeSubscription);
    }
});