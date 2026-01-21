/**
 * Merchant Dashboard JavaScript
 * Fixed: Table names and Relationships (Direct merchant_id filtering)
 */

let currentMerchant = null;
let realtimeSubscriptions = [];

// Initialize dashboard
async function initDashboard() {
    try {
        showLoadingState();
        
        // Get current merchant
        currentMerchant = await MerchantAuth.getCurrentMerchant();
        
        if (!currentMerchant) {
            showToast('Session expired. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = 'merchant-login.html';
            }, 2000);
            return;
        }
        
        console.log("Merchant loaded:", currentMerchant);

        // Update UI with merchant info
        updateMerchantInfo();
        
        // Load dashboard data in parallel
        await Promise.allSettled([
            loadStatistics(),
            loadRecentOrders(),
            loadTopServices(),
            loadWeeklySummary()
        ]);
        
        // Set up real-time subscriptions
        setupRealtimeSubscriptions();
        
        hideLoadingState();
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showToast('Failed to load dashboard data', 'error');
        hideLoadingState();
    }
}

// Show loading state
function showLoadingState() {
    const mainContent = document.querySelector('.merchant-main');
    if (mainContent) {
        mainContent.style.opacity = '0.6';
        mainContent.style.pointerEvents = 'none';
    }
}

// Hide loading state
function hideLoadingState() {
    const mainContent = document.querySelector('.merchant-main');
    if (mainContent) {
        mainContent.style.opacity = '1';
        mainContent.style.pointerEvents = 'auto';
    }
}

// Update merchant information in UI
function updateMerchantInfo() {
    // FIX: Using snake_case 'business_name' to match your DB schema
    const businessNameElements = document.querySelectorAll('#merchantBusinessName, #merchantDisplayName');
    businessNameElements.forEach(el => {
        if (el) el.textContent = currentMerchant.business_name || 'Merchant';
    });
    
    // Update rating display
    const ratingElement = document.getElementById('merchantRating');
    if (ratingElement) {
        const rating = currentMerchant.rating || 0;
        ratingElement.textContent = rating.toFixed(1);
    }
}

// Load statistics with caching
async function loadStatistics() {
    try {
        // FIX: Direct filter using merchant_id (Requires the SQL update I gave you)
        const { data: orders, error: ordersError } = await merchantSupabase
            .from('bookings')
            .select('id, status, budget, created_at')
            .eq('merchant_id', currentMerchant.id);
        
        if (ordersError) throw ordersError;
        
        // Calculate statistics
        const totalOrders = orders?.length || 0;
        const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
        const pendingOrders = orders?.filter(o => o.status === 'pending' || o.status === 'confirmed').length || 0;
        
        // Get earnings
        // CHECK: Ensure table is 'merchant_earnings' or just 'earnings'
        const { data: earnings, error: earningsError } = await merchantSupabase
            .from('merchant_earnings')
            .select('net_amount, created_at')
            .eq('merchant_id', currentMerchant.id);
        
        if (earningsError) console.error('Earnings error (check table name):', earningsError);
        
        const totalEarnings = earnings?.reduce((sum, e) => sum + parseFloat(e.net_amount || 0), 0) || 0;
        
        // Calculate last month earnings for trend
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
        
        // Calculate trends
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
        
        // Update UI with animation
        animateValue('totalOrders', 0, totalOrders, 1000);
        animateValue('pendingOrders', 0, pendingOrders, 1000);
        
        const totalEarningsEl = document.getElementById('totalEarnings');
        if(totalEarningsEl) totalEarningsEl.textContent = formatCurrency(totalEarnings, 'NGN');
        
        const pendingBadge = document.getElementById('pendingOrdersBadge');
        if(pendingBadge) pendingBadge.textContent = pendingOrders;
        
        // Update trends with proper styling
        updateTrendUI('ordersTrend', ordersTrend);
        updateTrendUI('earningsTrend', earningsTrend);
        
        // Get reviews count
        const { data: reviews, error: reviewsError } = await merchantSupabase
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
    
    const range = end - start;
    const increment = range / (duration / 16); // 60fps
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

// Load recent orders
async function loadRecentOrders() {
    try {
        // FIX: Direct filter (requires merchant_id in bookings table)
        const { data: orders, error } = await merchantSupabase
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
                <div style="padding: 60px 40px; text-align: center; color: #666;">
                    <i class="bi bi-box-seam" style="font-size: 64px; color: #e0e0e0; margin-bottom: 20px; display: block;"></i>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #333;">No orders yet</h3>
                    <p style="margin: 0; font-size: 14px;">Orders will appear here once customers book your services.</p>
                </div>
            `;
            return;
        }
        
        ordersList.innerHTML = orders.map(order => {
            const statusColors = {
                'pending': '#f59e0b',
                'confirmed': '#3b82f6',
                'in-progress': '#8b5cf6',
                'completed': '#22c55e',
                'cancelled': '#ef4444'
            };
            
            return `
                <div style="padding: 16px 24px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: space-between; transition: background 0.2s;" 
                     onmouseover="this.style.background='#f9f9f9'" 
                     onmouseout="this.style.background='transparent'">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #000; margin-bottom: 4px;">
                            Order #${order.id.substring(0, 8).toUpperCase()}
                        </div>
                        <div style="font-size: 13px; color: #666; display: flex; align-items: center; gap: 12px;">
                            <span><i class="bi bi-person"></i> ${order.recipient_name || 'Customer'}</span>
                            <span><i class="bi bi-calendar"></i> ${formatDate(order.surprise_date, 'short')}</span>
                            ${order.budget ? `<span><i class="bi bi-currency-exchange"></i> ${formatCurrency(order.budget, 'NGN')}</span>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: ${statusColors[order.status] || '#6b7280'}15; color: ${statusColors[order.status] || '#6b7280'};">
                            ${order.status}
                        </span>
                        <a href="merchant-order-details.html?id=${order.id}" 
                           style="color: #000; text-decoration: none; font-weight: 600; padding: 8px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: background 0.2s;"
                           onmouseover="this.style.background='#f0f0f0'"
                           onmouseout="this.style.background='transparent'">
                            <i class="bi bi-arrow-right"></i>
                        </a>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Load recent orders error:', error);
    }
}

// Load top services with performance metrics
async function loadTopServices() {
    try {
        // FIX: Using 'merchant_services' table
        const { data: services, error } = await merchantSupabase
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
                <div style="padding: 60px 20px; text-align: center; color: #666;">
                    <i class="bi bi-gift" style="font-size: 64px; color: #e0e0e0; margin-bottom: 20px; display: block;"></i>
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #333;">No services yet</h3>
                    <p style="margin: 0 0 16px 0; font-size: 14px;">Add your first service to start receiving orders.</p>
                    <a href="merchant-services.html" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                        <i class="bi bi-plus-circle"></i> Add Service
                    </a>
                </div>
            `;
            return;
        }
        
        servicesList.innerHTML = services.map(service => `
            <div style="padding: 16px; background: #f9f9f9; border-radius: 10px; border: 1px solid #e0e0e0; transition: all 0.2s;"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.08)'"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <div style="font-weight: 600; color: #000; margin-bottom: 8px; font-size: 15px;">
                    ${service.service_name}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 18px; font-weight: 700; color: #22c55e;">
                        ${formatCurrency(service.base_price, 'NGN')}
                    </div>
                    <span style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 600;">
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
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        // FIX: Direct filter (requires merchant_id in bookings)
        const { data: weekOrders, error } = await merchantSupabase
            .from('bookings')
            .select('status, budget, created_at')
            .eq('merchant_id', currentMerchant.id)
            .gte('created_at', oneWeekAgo.toISOString());
        
        if (error) throw error;
        
        const totalWeekOrders = weekOrders?.length || 0;
        const completedWeekOrders = weekOrders?.filter(o => o.status === 'completed').length || 0;
        const weekEarnings = weekOrders
            ?.filter(o => o.status === 'completed')
            .reduce((sum, o) => sum + parseFloat(o.budget || 0), 0) || 0;
        
        // Animate the values
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
    // Clean up existing subscriptions
    realtimeSubscriptions.forEach(sub => {
        merchantSupabase.removeChannel(sub);
    });
    realtimeSubscriptions = [];
    
    // Subscribe to new orders
    const ordersChannel = merchantSupabase
        .channel('merchant-orders')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'bookings',
                filter: `merchant_id=eq.${currentMerchant.id}` // Direct filter now works!
            }, 
            (payload) => {
                console.log('Realtime update:', payload);
                
                if (payload.eventType === 'INSERT') {
                    showToast('🎉 New order received!', 'success');
                    playNotificationSound();
                }
                
                // Reload data
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
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGa57OahUBELTqXh8LdjGwU2jdXxzn0vBSh+zPDfkj4IEl601+ysYBsEMord8Mp3LgUlecjw45hECBdstuvssGwcBDSJ0/HOfC8FJHbE8OKYSwoWbL3u8b');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (e) {
        console.log('Audio not supported:', e);
    }
}

// Logout function with confirmation
async function merchantLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await MerchantAuth.logout();
            
            // Clean up subscriptions
            realtimeSubscriptions.forEach(sub => {
                merchantSupabase.removeChannel(sub);
            });
            
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

// Handle visibility change (refresh when tab becomes visible)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentMerchant) {
        loadStatistics();
        loadRecentOrders();
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    realtimeSubscriptions.forEach(sub => {
        merchantSupabase.removeChannel(sub);
    });
});