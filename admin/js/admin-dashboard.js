/**
 * WOW Surprises - Admin Dashboard FINAL VERSION
 * Fixed: 'Active Users' card now correctly fetches 'client' role instead of 'user'
 */

let bookingTrendsChart = null;
let revenueCategoryChart = null;

// Cache for lookups
let usersCache = {};
let packagesCache = {};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Dashboard initializing...');
    
    // Protect route
    const isAuth = await protectAdminRoute();
    if (!isAuth) return;
    
    // Load all dashboard data
    await loadDashboardData();
    
    console.log('✅ Dashboard ready with real data!');
});

// ==========================================
// LOAD ALL DASHBOARD DATA
// ==========================================

async function loadDashboardData() {
    try {
        // Load users and packages first (for cache)
        await loadCacheData();
        
        // Load all sections in parallel
        await Promise.all([
            loadStatistics(),
            loadBookingTrends(),
            loadRevenueByCategory(),
            loadRecentBookings(),
            loadTopPackages()
        ]);
        
        console.log('✅ All dashboard data loaded');
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ==========================================
// LOAD CACHE DATA
// ==========================================

async function loadCacheData() {
    try {
        const sb = getSupabaseAdmin();
        
        // Load all users
        const { data: users } = await sb.from('profiles').select('*');
        usersCache = {};
        (users || []).forEach(user => {
            usersCache[user.id] = user;
        });
        
        // Load all packages
        const { data: packages } = await sb.from('packages').select('*');
        packagesCache = {};
        (packages || []).forEach(pkg => {
            packagesCache[pkg.id] = pkg;
        });
        
        console.log('✅ Cache loaded:', Object.keys(usersCache).length, 'users,', Object.keys(packagesCache).length, 'packages');
        
    } catch (error) {
        console.error('Error loading cache:', error);
    }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getBookingStatus(booking) {
    return booking.booking_status || booking.status || 'unknown';
}

function getPaymentStatus(booking) {
    return booking.payment_status || booking.payment || 'unknown';
}

function getTotalAmount(booking) {
    return parseFloat(booking.total_amount || booking.amount || booking.price || 0);
}

function getUserName(userId) {
    const user = usersCache[userId];
    return user ? (user.full_name || user.name || 'Unknown User') : 'Unknown User';
}

function getPackageName(packageId) {
    const pkg = packagesCache[packageId];
    return pkg ? (pkg.title || pkg.name || 'Unknown Package') : 'Unknown Package';
}

function getPackageCategory(packageId) {
    const pkg = packagesCache[packageId];
    return pkg ? pkg.category : 'other';
}

// ==========================================
// STATISTICS CARDS
// ==========================================

async function loadStatistics() {
    try {
        const sb = getSupabaseAdmin();
        
        // Fetch bookings and users separately
        const [bookingsResult, usersResult] = await Promise.all([
            sb.from('bookings').select('*'),
            // FIX: Changed 'user' to 'client' to match your database role
            sb.from('profiles').select('*').eq('role', 'client') 
        ]);
        
        const bookings = bookingsResult.data || [];
        const users = usersResult.data || [];
        
        console.log('📊 Loaded bookings:', bookings.length);
        console.log('👥 Loaded users (clients):', users.length);
        
        // 1. Total Bookings
        const totalBookings = bookings.length;
        document.getElementById('totalBookings').textContent = totalBookings;
        
        // 2. Total Revenue (only from paid bookings)
        const totalRevenue = bookings
            .filter(b => getPaymentStatus(b) === 'paid')
            .reduce((sum, b) => sum + getTotalAmount(b), 0);
        document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
        
        // 3. Active Users (FIX: Now using the correct 'client' list)
        // We check if status is 'active' OR if status is undefined (assume active for legacy)
        const activeUsers = users.filter(u => u.status === 'active' || !u.status).length;
        document.getElementById('activeUsers').textContent = activeUsers;
        
        // 4. Pending Bookings
        const pendingBookings = bookings.filter(b => getBookingStatus(b) === 'pending').length;
        document.getElementById('pendingBookings').textContent = pendingBookings;
        
        // Update sidebar badge if it exists
        const badge = document.getElementById('pendingBookingsBadge');
        if (badge) {
            badge.textContent = pendingBookings;
            badge.style.display = pendingBookings > 0 ? 'inline-flex' : 'none';
        }
        
        // --- Calculate Trends (Percentages) ---
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        
        // Booking Trend
        const currentMonthBookings = bookings.filter(b => new Date(b.created_at) >= currentMonthStart).length;
        const previousMonthBookings = bookings.filter(b => {
            const date = new Date(b.created_at);
            return date >= previousMonthStart && date < currentMonthStart;
        }).length;
        const bookingsTrend = calculatePercentageChange(currentMonthBookings, previousMonthBookings);
        updateTrendUI('bookingsTrend', bookingsTrend);
        
        // Revenue Trend
        const currentMonthRevenue = bookings
            .filter(b => new Date(b.created_at) >= currentMonthStart && getPaymentStatus(b) === 'paid')
            .reduce((sum, b) => sum + getTotalAmount(b), 0);
        const previousMonthRevenue = bookings
            .filter(b => {
                const date = new Date(b.created_at);
                return date >= previousMonthStart && date < currentMonthStart && getPaymentStatus(b) === 'paid';
            })
            .reduce((sum, b) => sum + getTotalAmount(b), 0);
        const revenueTrend = calculatePercentageChange(currentMonthRevenue, previousMonthRevenue);
        updateTrendUI('revenueTrend', revenueTrend);
        
        // Users Trend
        const currentMonthUsers = users.filter(u => new Date(u.created_at) >= currentMonthStart).length;
        const previousMonthUsers = users.filter(u => {
            const date = new Date(u.created_at);
            return date >= previousMonthStart && date < currentMonthStart;
        }).length;
        const usersTrend = calculatePercentageChange(currentMonthUsers, previousMonthUsers);
        updateTrendUI('usersTrend', usersTrend);
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function updateTrendUI(elementId, value) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    el.textContent = Math.abs(value) + '%';
    // You can add logic here to change color/icon based on positive/negative
}

// ==========================================
// BOOKING TRENDS CHART
// ==========================================

async function loadBookingTrends(days = 30) {
    try {
        const sb = getSupabaseAdmin();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data: bookings } = await sb
            .from('bookings')
            .select('*')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });
        
        const bookingsByDate = {};
        const revenueByDate = {};
        
        // Initialize dates
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (days - 1 - i));
            const dateStr = date.toISOString().split('T')[0];
            bookingsByDate[dateStr] = 0;
            revenueByDate[dateStr] = 0;
        }
        
        (bookings || []).forEach(booking => {
            const dateStr = booking.created_at.split('T')[0];
            if (bookingsByDate.hasOwnProperty(dateStr)) {
                bookingsByDate[dateStr]++;
                if (getPaymentStatus(booking) === 'paid') {
                    revenueByDate[dateStr] += getTotalAmount(booking);
                }
            }
        });
        
        const labels = Object.keys(bookingsByDate).map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        if (bookingTrendsChart) bookingTrendsChart.destroy();
        
        const ctx = document.getElementById('bookingTrendsChart');
        if (!ctx) return;
        
        bookingTrendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Bookings',
                        data: Object.values(bookingsByDate),
                        borderColor: '#000',
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Revenue (₦)',
                        data: Object.values(revenueByDate), // No longer dividing by 1000 for accuracy
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { position: 'top' } },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Bookings' } },
                    y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Revenue' } }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading booking trends:', error);
    }
}

// ==========================================
// REVENUE BY CATEGORY CHART
// ==========================================

async function loadRevenueByCategory() {
    try {
        const sb = getSupabaseAdmin();
        const { data: bookings } = await sb.from('bookings').select('*');
        
        const revenueByCategory = {};
        
        (bookings || []).forEach(booking => {
            if (getPaymentStatus(booking) === 'paid') {
                const category = getPackageCategory(booking.package_id) || 'Other';
                // Capitalize
                const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
                
                if (!revenueByCategory[categoryName]) revenueByCategory[categoryName] = 0;
                revenueByCategory[categoryName] += getTotalAmount(booking);
            }
        });
        
        const labels = Object.keys(revenueByCategory);
        const data = Object.values(revenueByCategory);
        
        if (revenueCategoryChart) revenueCategoryChart.destroy();
        
        const ctx = document.getElementById('revenueByCategory');
        if (!ctx) return;
        
        if (labels.length === 0) {
            // Optional: Show placeholder if no data
            return; 
        }
        
        revenueCategoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
        
    } catch (error) {
        console.error('Error loading revenue chart:', error);
    }
}

// ==========================================
// RECENT BOOKINGS LIST
// ==========================================

async function loadRecentBookings() {
    try {
        const sb = getSupabaseAdmin();
        const { data: bookings } = await sb
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        const container = document.getElementById('recentBookingsList');
        if (!container) return;
        
        if (!bookings || bookings.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No bookings yet</div>';
            return;
        }
        
        let html = '<div class="list-group">';
        bookings.forEach(booking => {
            const userName = getUserName(booking.user_id);
            const packageName = getPackageName(booking.package_id);
            const status = getBookingStatus(booking);
            // Badge color mapping
            const statusColors = { completed:'success', confirmed:'info', cancelled:'danger', pending:'warning' };
            const badgeColor = statusColors[status] || 'secondary';
            
            html += `
                <div class="list-item" style="padding: 12px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600;">${packageName}</div>
                        <div style="font-size: 12px; color: #666;">
                            <i class="bi bi-person"></i> ${userName} &bull; ${formatDate(booking.created_at)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge badge-${badgeColor}" style="margin-bottom: 4px; display: inline-block;">${status}</span>
                        <div style="font-weight: 600;">${formatCurrency(getTotalAmount(booking))}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent bookings:', error);
    }
}

// ==========================================
// TOP PACKAGES LIST
// ==========================================

async function loadTopPackages() {
    try {
        const sb = getSupabaseAdmin();
        const { data: bookings } = await sb.from('bookings').select('package_id');
        
        const packageCounts = {};
        (bookings || []).forEach(b => {
            const pid = b.package_id;
            if(pid) packageCounts[pid] = (packageCounts[pid] || 0) + 1;
        });
        
        const topPackages = Object.keys(packageCounts)
            .map(pkgId => ({
                ...packagesCache[pkgId],
                count: packageCounts[pkgId]
            }))
            .filter(pkg => pkg.id) // Filter out nulls if package deleted
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
            
        const container = document.getElementById('topPackagesList');
        if(!container) return;
        
        if(topPackages.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No popular packages yet</div>';
            return;
        }
        
        let html = '<div class="list-group">';
        topPackages.forEach((pkg, idx) => {
            const title = pkg.title || pkg.name || 'Unknown';
            html += `
                <div class="list-item" style="padding: 12px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 15px;">
                    <div style="background: #f0f0f0; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">${idx+1}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${title}</div>
                        <div style="font-size: 12px; color: #666;">${pkg.category || 'General'}</div>
                    </div>
                    <div style="font-weight: 600;">${pkg.count} bookings</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading top packages:', error);
    }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

if (typeof window.formatCurrency === 'undefined') {
    window.formatCurrency = function(amount, currency = '₦') {
        if (!amount || isNaN(amount)) return `${currency}0`;
        return `${currency}${parseFloat(amount).toLocaleString('en-NG')}`;
    };
}

if (typeof window.formatDate === 'undefined') {
    window.formatDate = function(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
    };
}

if (typeof window.calculatePercentageChange === 'undefined') {
    window.calculatePercentageChange = function(current, previous) {
        if (!previous || previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };
}