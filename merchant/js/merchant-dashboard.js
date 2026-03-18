/**
 * Merchant Dashboard JavaScript
 * Fixed: Replaced inline-styled recent orders list with enterprise table physics
 */

let currentMerchant = null;
let realtimeSubscriptions = [];

// Initialize dashboard
async function initDashboard() {
    try {
        currentMerchant = await MerchantAuth.getCurrentMerchant();
        
        if (!currentMerchant) {
            showToast('Session expired. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = 'merchant-login.html';
            }, 2000);
            return;
        }
        
        console.log("Merchant loaded:", currentMerchant.business_name);

        updateMerchantInfo();
        
        await Promise.allSettled([
            loadStatistics(),
            loadRecentOrders(),
            loadTopServices(),
            loadWeeklySummary(),
            loadCatalogHealth()
        ]);
        
        setupRealtimeSubscriptions();
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

// Update merchant information in UI
function updateMerchantInfo() {
    const businessNameElements = document.querySelectorAll('#merchantBusinessName, #merchantDisplayName');
    businessNameElements.forEach(el => {
        if (el) el.textContent = currentMerchant.business_name || 'Merchant';
    });
    
    const ratingElement = document.getElementById('merchantRating');
    if (ratingElement) {
        const rating = currentMerchant.rating || 0;
        ratingElement.textContent = rating.toFixed(1);
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const supabase = MerchantAuth.getSupabase();
        
        const { data: orders, error: ordersError } = await supabase
            .from('bookings')
            .select('id, status, budget, created_at')
            .eq('merchant_id', currentMerchant.id);
        
        if (ordersError) throw ordersError;
        
        const totalOrders = orders?.length || 0;
        const pendingOrders = orders?.filter(o => o.status === 'pending' || o.status === 'confirmed').length || 0;
        
        const { data: earnings, error: earningsError } = await supabase
            .from('merchant_earnings')
            .select('net_amount, created_at')
            .eq('merchant_id', currentMerchant.id);
        
        if (earningsError) console.error('Earnings error:', earningsError);
        
        const totalEarnings = earnings?.reduce((sum, e) => sum + parseFloat(e.net_amount || 0), 0) || 0;
        
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthEarnings = earnings?.filter(e => new Date(e.created_at) >= lastMonth)
            .reduce((sum, e) => sum + parseFloat(e.net_amount || 0), 0) || 0;
        
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        const previousMonthEarnings = earnings?.filter(e => {
            const date = new Date(e.created_at);
            return date >= twoMonthsAgo && date < lastMonth;
        }).reduce((sum, e) => sum + parseFloat(e.net_amount || 0), 0) || 0;
        
        const earningsTrend = previousMonthEarnings > 0 
            ? ((lastMonthEarnings - previousMonthEarnings) / previousMonthEarnings * 100).toFixed(1)
            : 0;
        
        const lastMonthOrders = orders?.filter(o => new Date(o.created_at) >= lastMonth).length || 0;
        const previousMonthOrders = orders?.filter(o => {
            const date = new Date(o.created_at);
            return date >= twoMonthsAgo && date < lastMonth;
        }).length || 0;
        
        const ordersTrend = previousMonthOrders > 0
            ? ((lastMonthOrders - previousMonthOrders) / previousMonthOrders * 100).toFixed(1)
            : 0;
        
        animateValue('totalOrders', 0, totalOrders, 1000);
        animateValue('pendingOrders', 0, pendingOrders, 1000);
        
        const totalEarningsEl = document.getElementById('totalEarnings');
        if(totalEarningsEl) totalEarningsEl.textContent = formatCurrency(totalEarnings, 'NGN');
        
        const pendingBadge = document.getElementById('pendingOrdersBadge');
        if(pendingBadge) pendingBadge.textContent = pendingOrders;
        
        updateTrendUI('ordersTrend', ordersTrend);
        updateTrendUI('earningsTrend', earningsTrend);
        
        const { data: reviews, error: reviewsError } = await supabase
            .from('merchant_reviews')
            .select('rating')
            .eq('merchant_id', currentMerchant.id);
        
        if (!reviewsError && reviews) {
            const totalReviewsEl = document.getElementById('totalReviews');
            if (totalReviewsEl) {
                totalReviewsEl.textContent = `${reviews.length} review${reviews.length !== 1 ? 's' : ''}`;
            }
        }
        
    } catch (error) {
        console.error('Load statistics error:', error);
    }
}

// Helper to update trend UI
function updateTrendUI(elementId, value) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    el.textContent = `${Math.abs(value)}%`;
    const trendCard = el.closest('.stat-card-trend');
    if (trendCard) {
        trendCard.className = value >= 0 ? 'stat-card-trend up' : 'stat-card-trend down';
        const icon = trendCard.querySelector('i');
        if(icon) icon.className = value >= 0 ? 'bi bi-arrow-up' : 'bi bi-arrow-down';
    }
}

// Animate number counting
function animateValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (end === 0) {
        element.textContent = 0;
        return;
    }
    
    const range = end - start;
    const increment = range / (duration / 16); 
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}

// ==========================================
// RECENT ORDERS LIST (FIXED: Enterprise Table Physics)
// ==========================================
async function loadRecentOrders() {
    try {
        const supabase = MerchantAuth.getSupabase();
        const { data: orders, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('merchant_id', currentMerchant.id)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        const ordersList = document.getElementById('recentOrdersList');
        if (!ordersList) return;
        
        if (!orders || orders.length === 0) {
            ordersList.innerHTML = `
                <div style="padding: 60px 40px; text-align: center; color: #64748b;">
                    <i class="bi bi-box-seam" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px; display: block;"></i>
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #0f172a;">No orders yet</h3>
                    <p style="margin: 0; font-size: 13px;">Orders will appear here once customers book your services.</p>
                </div>
            `;
            return;
        }

        // Build the table header
        let html = `
            <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Build the table rows
        orders.forEach(order => {
            // Determine status class based on existing CSS rules in merchant.css
            let statusClass = 'status-pending';
            if (order.status === 'confirmed' || order.status === 'active') statusClass = 'status-confirmed';
            if (order.status === 'in-progress') statusClass = 'status-in-progress';
            if (order.status === 'completed' || order.status === 'delivered') statusClass = 'status-completed';
            if (order.status === 'cancelled' || order.status === 'suspended') statusClass = 'status-cancelled';

            const displayId = order.id ? order.id.substring(0, 8).toUpperCase() : 'N/A';
            const customerName = order.recipient_name || 'Customer';
            const dateStr = formatDate(order.delivery_date || order.created_at, 'short');
            const amountStr = order.package_price ? formatCurrency(order.package_price, 'NGN') : 'N/A';

            html += `
                <tr>
                    <td style="font-weight: 600; color: #0f172a; white-space: nowrap;">
                        #${displayId}
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="bi bi-person" style="color: #64748b;"></i>
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${customerName}</span>
                        </div>
                    </td>
                    <td style="white-space: nowrap;">
                        <div style="display: flex; align-items: center; gap: 8px; color: #64748b;">
                            <i class="bi bi-calendar"></i> ${dateStr}
                        </div>
                    </td>
                    <td style="font-weight: 600; color: #0f172a;">
                        ${amountStr}
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${order.status || 'Pending'}
                        </span>
                    </td>
                    <td>
                        <a href="merchant-order-details.html?id=${order.id}" class="merchant-btn merchant-btn-secondary" style="padding: 6px 12px; font-size: 12px;">
                            View
                        </a>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        ordersList.innerHTML = html;
        
    } catch (error) {
        console.error('Load recent orders error:', error);
    }
}

// Load catalog health metrics
async function loadCatalogHealth() {
    try {
        const supabase = MerchantAuth.getSupabase();
        
        const { data: services, error } = await supabase
            .from('merchant_services')
            .select('is_active')
            .eq('merchant_id', currentMerchant.id);
        
        if (error) throw error;
        
        const total = services?.length || 0;
        const active = services?.filter(s => s.is_active === true).length || 0;
        const inactive = total - active;
        
        animateValue('catalogTotal', 0, total, 800);
        animateValue('catalogActive', 0, active, 800);
        animateValue('catalogInactive', 0, inactive, 800);
        
    } catch (error) {
        console.error('Load catalog health error:', error);
    }
}

// Load top services with performance metrics
async function loadTopServices() {
    try {
        const supabase = MerchantAuth.getSupabase();
        const { data: services, error } = await supabase
            .from('merchant_services') 
            .select('*')
            .eq('merchant_id', currentMerchant.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(3);
        
        if (error) throw error;
        
        const servicesList = document.getElementById('topServicesList');
        if (!servicesList) return;
        
        if (!services || services.length === 0) {
            servicesList.innerHTML = `
                <div style="padding: 60px 20px; text-align: center; color: #64748b;">
                    <i class="bi bi-gift" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px; display: block;"></i>
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #0f172a;">No services yet</h3>
                    <p style="margin: 0 0 16px 0; font-size: 13px;">Add your first service to start receiving orders.</p>
                    <a href="merchant-services.html" class="merchant-btn merchant-btn-primary">
                        <i class="bi bi-plus-circle"></i> Add Service
                    </a>
                </div>
            `;
            return;
        }
        
        servicesList.innerHTML = services.map(service => `
            <div style="padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; transition: all 0.2s;"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.04)'"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <div style="font-weight: 600; color: #0f172a; margin-bottom: 8px; font-size: 14px;">
                    ${service.service_name}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 16px; font-weight: 700; color: #16a34a;">
                        ${formatCurrency(service.base_price, 'NGN')}
                    </div>
                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">
                        ${service.service_category || 'General'}
                    </span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Load top services error:', error);
    }
}

// Load weekly summary with better calculations
async function loadWeeklySummary() {
    try {
        const supabase = MerchantAuth.getSupabase();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const { data: weekOrders, error } = await supabase
            .from('bookings')
            .select('status, package_price, created_at')
            .eq('merchant_id', currentMerchant.id)
            .gte('created_at', oneWeekAgo.toISOString());
        
        if (error) throw error;
        
        const totalWeekOrders = weekOrders?.length || 0;
        const completedWeekOrders = weekOrders?.filter(o => o.status === 'completed' || o.status === 'delivered').length || 0;
        const weekEarnings = weekOrders
            ?.filter(o => o.status === 'completed' || o.status === 'delivered')
            .reduce((sum, o) => sum + parseFloat(o.package_price || 0), 0) || 0;
        
        animateValue('weekOrders', 0, totalWeekOrders, 800);
        animateValue('weekCompleted', 0, completedWeekOrders, 800);
        
        const weekEarningsEl = document.getElementById('weekEarnings');
        if (weekEarningsEl) {
            weekEarningsEl.textContent = formatCurrency(weekEarnings, 'NGN');
        }
        
    } catch (error) {
        console.error('Load weekly summary error:', error);
    }
}

// Setup real-time subscriptions with cleanup
function setupRealtimeSubscriptions() {
    const supabase = MerchantAuth.getSupabase();
    
    realtimeSubscriptions.forEach(sub => {
        supabase.removeChannel(sub);
    });
    realtimeSubscriptions = [];
    
    const ordersChannel = supabase
        .channel('merchant-orders')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'bookings',
                filter: `merchant_id=eq.${currentMerchant.id}`
            }, 
            (payload) => {
                console.log('Realtime update:', payload);
                
                if (payload.eventType === 'INSERT') {
                    if(typeof showToast === 'function') showToast('🎉 New order received!', 'success');
                    playNotificationSound();
                }
                
                loadStatistics();
                loadRecentOrders();
                loadWeeklySummary();
            }
        )
        .subscribe();
    
    realtimeSubscriptions.push(ordersChannel);
}

// Play notification sound with fallback
function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGa57OahUBELTqXh8LdjGwU2jdXxzn0vBSh+zPDfkj4IEl601+ysYBsEMord8Mpbc1q5mlw63yd2u2cn0hs6jnzf2gljhr486u3dkgm2y/HOfC8FJHbE8OKYSwoWbL3u8b');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio play ignored by browser:', e));
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Logout function with confirmation
async function merchantLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            const supabase = MerchantAuth.getSupabase();
            await MerchantAuth.logout();
            
            realtimeSubscriptions.forEach(sub => {
                supabase.removeChannel(sub);
            });
            
            if(typeof showToast === 'function') showToast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = 'merchant-login.html';
            }, 1000);
        } catch (error) {
            console.error('Logout error:', error);
            if(typeof showToast === 'function') showToast('Logout failed', 'error');
        }
    }
}

// Format currency helper
function formatCurrency(amount, currency = 'NGN') {
    if (isNaN(amount)) amount = 0;
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Format date helper with better formatting
function formatDate(dateString, format = 'default') {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    if (format === 'short') {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
    
    if (format === 'long') {
        return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
    
    return date.toLocaleDateString();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    const supabase = MerchantAuth.getSupabase();
    if(supabase) {
        realtimeSubscriptions.forEach(sub => {
            supabase.removeChannel(sub);
        });
    }
});