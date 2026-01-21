/**
 * Admin Analytics JavaScript - FINAL COMPLETE VERSION
 * Features: Charts, Currency Cleaning, Date Sorting, AND Percentage Comparisons
 */

let analyticsData = {
    bookings: [],
    previousBookings: [], // Added for comparison
    users: [],
    previousUsers: [],    // Added for comparison
    packages: []
};

let dateRangeStart = null;
let dateRangeEnd = null;
let chartInstances = {}; 

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await protectAdminRoute();
    if (!isAuth) return;
    
    loadAdminName();
    setDefaultDateRange(365); // Default to 1 year view
    await loadAnalyticsData();
});

async function loadAdminName() {
    const user = await getCurrentAdmin();
    if (user && user.name) {
        const nameEl = document.getElementById('adminName');
        if (nameEl) nameEl.textContent = user.name;
    }
}

// --------------------------------------------------------
// 📅 DATE HANDLING
// --------------------------------------------------------
function setDefaultDateRange(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    dateRangeStart = start;
    dateRangeEnd = end;
    
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if(startInput && endInput) {
        startInput.valueAsDate = dateRangeStart;
        endInput.valueAsDate = dateRangeEnd;
    }
}

function updateDateRange() {
    const range = document.getElementById('dateRange').value;
    const customInputs = document.getElementById('customDateInputs');
    
    if (range === 'custom') {
        customInputs.style.display = 'flex';
        return;
    }
    
    customInputs.style.display = 'none';
    setDefaultDateRange(parseInt(range));
    loadAnalyticsData();
}

function applyCustomDate() {
    const startInput = document.getElementById('startDate').value;
    const endInput = document.getElementById('endDate').value;
    
    if (!startInput || !endInput) return;
    
    dateRangeStart = new Date(startInput);
    dateRangeEnd = new Date(endInput);
    loadAnalyticsData();
}

// --------------------------------------------------------
// 🛠️ DATA LOADING (CURRENT & PREVIOUS PERIOD)
// --------------------------------------------------------
async function loadAnalyticsData() {
    try {
        const sb = getSupabaseAdmin();
        
        // Calculate Previous Period (for comparison %)
        // If current range is 30 days, previous range is the 30 days BEFORE that.
        const duration = dateRangeEnd.getTime() - dateRangeStart.getTime();
        const prevStart = new Date(dateRangeStart.getTime() - duration);
        const prevEnd = new Date(dateRangeStart.getTime());

        console.log('📅 Comparison Period:', prevStart.toLocaleDateString(), 'to', prevEnd.toLocaleDateString());

        // 1. Fetch CURRENT Bookings
        const { data: bookings, error: bookingsError } = await sb
            .from('bookings')
            .select(`*, profiles:user_id(full_name, name, email)`)
            .gte('created_at', dateRangeStart.toISOString())
            .lte('created_at', dateRangeEnd.toISOString())
            .order('created_at', { ascending: true });
        
        if (bookingsError) throw bookingsError;
        analyticsData.bookings = bookings || [];

        // 2. Fetch PREVIOUS Bookings (Comparison)
        const { data: prevBookings } = await sb
            .from('bookings')
            .select('budget, total_amount, package_price, status')
            .gte('created_at', prevStart.toISOString())
            .lte('created_at', prevEnd.toISOString());
        analyticsData.previousBookings = prevBookings || [];

        // 3. Fetch CURRENT Users
        const { data: users, error: usersError } = await sb
            .from('profiles')
            .select('*')
            .gte('created_at', dateRangeStart.toISOString())
            .lte('created_at', dateRangeEnd.toISOString());
        if (usersError) throw usersError;
        analyticsData.users = users || [];

        // 4. Fetch PREVIOUS Users (Comparison)
        const { data: prevUsers } = await sb
            .from('profiles')
            .select('role')
            .gte('created_at', prevStart.toISOString())
            .lte('created_at', prevEnd.toISOString());
        analyticsData.previousUsers = prevUsers || [];

        // 5. Fetch Packages
        const { data: packages, error: packagesError } = await sb
            .from('packages')
            .select('*');
        if (packagesError) throw packagesError;
        analyticsData.packages = packages || [];
        
        console.log('✅ Data Loaded');
        
        calculateMetrics();
        renderAllCharts();
        displayTopPerformers();
        
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// --------------------------------------------------------
// 🛠️ HELPERS
// --------------------------------------------------------
function cleanAmount(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const cleaned = value.toString().replace(/[₦,NGN\s]/g, '');
    return parseFloat(cleaned) || 0;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
}

function calculatePercentageChange(current, previous) {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

// --------------------------------------------------------
// 📊 METRICS CALCULATION (WITH COMPARISONS)
// --------------------------------------------------------
function calculateMetrics() {
    // --- Current Period ---
    const totalRevenue = calculateTotalRevenue(analyticsData.bookings);
    const totalBookings = analyticsData.bookings.length;
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const newClients = analyticsData.users.filter(u => u.role === 'client').length;

    // --- Previous Period ---
    const prevRevenue = calculateTotalRevenue(analyticsData.previousBookings);
    const prevBookings = analyticsData.previousBookings.length;
    const prevAvgValue = prevBookings > 0 ? prevRevenue / prevBookings : 0;
    const prevClients = analyticsData.previousUsers.filter(u => u.role === 'client').length;

    // --- Update DOM Values ---
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('totalBookings').textContent = totalBookings;
    document.getElementById('avgBookingValue').textContent = formatCurrency(avgBookingValue);
    document.getElementById('newClients').textContent = newClients;

    // --- Update Percentage Indicators ---
    updateTrendIndicator('revenueChange', totalRevenue, prevRevenue);
    updateTrendIndicator('bookingsChange', totalBookings, prevBookings);
    updateTrendIndicator('avgChange', avgBookingValue, prevAvgValue);
    updateTrendIndicator('clientsChange', newClients, prevClients);
}

function calculateTotalRevenue(list) {
    return list
        .filter(b => (b.status || '').toLowerCase() !== 'cancelled' && (b.status || '').toLowerCase() !== 'rejected')
        .reduce((sum, b) => {
            const val = b.total_amount || b.package_price || b.budget || 0;
            return sum + cleanAmount(val);
        }, 0);
}

function updateTrendIndicator(elementId, current, previous) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const percent = calculatePercentageChange(current, previous);
    const isPositive = percent >= 0;
    const arrow = isPositive ? 'up' : 'down';
    const colorClass = isPositive ? 'positive' : 'negative'; // Assumes you have CSS for .positive (green) and .negative (red)

    // Using inline style fallback just in case CSS class is missing
    const colorStyle = isPositive ? 'color: #22c55e;' : 'color: #ef4444;';

    el.innerHTML = `<i class="bi bi-arrow-${arrow}" style="${colorStyle}"></i> <span style="${colorStyle}">${Math.abs(percent)}%</span>`;
}

// --------------------------------------------------------
// 📈 CHARTS
// --------------------------------------------------------
function renderAllCharts() {
    renderRevenueChart();
    renderBookingsChart();
    renderPackagesChart();
    renderStatusChart();
}

function destroyChart(key) {
    if (chartInstances[key]) {
        chartInstances[key].destroy();
        chartInstances[key] = null;
    }
}

function renderRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    const dailyData = new Map();
    analyticsData.bookings.forEach(b => {
        if((b.status || '').toLowerCase() === 'cancelled') return;
        const date = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const val = b.total_amount || b.package_price || b.budget || 0;
        const current = dailyData.get(date) || 0;
        dailyData.set(date, current + cleanAmount(val));
    });

    const labels = Array.from(dailyData.keys());
    const data = Array.from(dailyData.values());

    destroyChart('revenue');
    chartInstances.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue',
                data: data,
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

function renderBookingsChart() {
    const ctx = document.getElementById('bookingsChart');
    if (!ctx) return;

    const dailyData = new Map();
    analyticsData.bookings.forEach(b => {
        const date = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const current = dailyData.get(date) || 0;
        dailyData.set(date, current + 1);
    });

    const labels = Array.from(dailyData.keys());
    const data = Array.from(dailyData.values());

    destroyChart('bookings');
    chartInstances.bookings = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Bookings', data: data, backgroundColor: '#3b82f6', borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

function renderPackagesChart() {
    const ctx = document.getElementById('packagesChart');
    if (!ctx) return;

    const counts = {};
    analyticsData.bookings.forEach(b => {
        const pkgName = b.package_name || 'Custom Request';
        counts[pkgName] = (counts[pkgName] || 0) + 1;
    });

    destroyChart('packages');
    chartInstances.packages = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{ data: Object.values(counts), backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function renderStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    const counts = {};
    analyticsData.bookings.forEach(b => {
        const status = (b.status || 'pending').toLowerCase();
        const label = status.charAt(0).toUpperCase() + status.slice(1);
        counts[label] = (counts[label] || 0) + 1;
    });

    destroyChart('status');
    chartInstances.status = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(counts),
            datasets: [{ data: Object.values(counts), backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#6b7280'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

// --------------------------------------------------------
// 🏆 TOP PERFORMERS
// --------------------------------------------------------
function displayTopPerformers() {
    // 1. Top Packages
    const pkgStats = {};
    analyticsData.bookings.forEach(b => {
        const name = b.package_name || 'Custom';
        const val = cleanAmount(b.total_amount || b.package_price || b.budget || 0);
        if(!pkgStats[name]) pkgStats[name] = { count: 0, revenue: 0 };
        pkgStats[name].count++;
        pkgStats[name].revenue += val;
    });

    const sortedPkgs = Object.entries(pkgStats).map(([name, stat]) => ({ name, ...stat })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const pkgContainer = document.getElementById('topPackagesList');
    if(pkgContainer) {
        pkgContainer.innerHTML = sortedPkgs.map((p, i) => `
            <div class="top-item" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <div><span style="font-weight:bold; margin-right:10px;">${i+1}.</span> ${p.name}</div>
                <div style="text-align:right;">
                    <div style="font-weight:600;">${formatCurrency(p.revenue)}</div>
                    <div style="font-size:12px; color:#666;">${p.count} bookings</div>
                </div>
            </div>`).join('') || '<p style="text-align:center; padding:10px;">No data</p>';
    }

    // 2. Top Clients
    const clientStats = {};
    analyticsData.bookings.forEach(b => {
        const name = b.customer_name || b.profiles?.full_name || 'Guest';
        const val = cleanAmount(b.total_amount || b.package_price || b.budget || 0);
        if(!clientStats[name]) clientStats[name] = { count: 0, spent: 0 };
        clientStats[name].count++;
        clientStats[name].spent += val;
    });

    const sortedClients = Object.entries(clientStats).map(([name, stat]) => ({ name, ...stat })).sort((a, b) => b.spent - a.spent).slice(0, 5);
    const clientContainer = document.getElementById('topClientsList');
    if(clientContainer) {
        clientContainer.innerHTML = sortedClients.map((c, i) => `
            <div class="top-item" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <div><span style="font-weight:bold; margin-right:10px;">${i+1}.</span> ${c.name}</div>
                <div style="text-align:right;">
                    <div style="font-weight:600;">${formatCurrency(c.spent)}</div>
                    <div style="font-size:12px; color:#666;">${c.count} orders</div>
                </div>
            </div>`).join('') || '<p style="text-align:center; padding:10px;">No data</p>';
    }

    // 3. Category Revenue
    const catStats = {};
    analyticsData.bookings.forEach(b => {
        const pkgName = b.package_name || 'Custom';
        let category = 'Custom Request';
        const foundPkg = analyticsData.packages.find(p => p.title === pkgName || p.name === pkgName);
        if(foundPkg) category = foundPkg.category;
        
        const val = cleanAmount(b.total_amount || b.package_price || b.budget || 0);
        catStats[category] = (catStats[category] || 0) + val;
    });

    const sortedCats = Object.entries(catStats).map(([name, val]) => ({ name, val })).sort((a, b) => b.val - a.val).slice(0, 5);
    const totalRev = Object.values(catStats).reduce((a, b) => a + b, 0);
    const catContainer = document.getElementById('categoryRevenue');
    if(catContainer) {
        catContainer.innerHTML = sortedCats.map((c, i) => {
            const percent = totalRev > 0 ? ((c.val / totalRev) * 100).toFixed(1) : 0;
            return `
            <div class="top-item" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <div><span style="font-weight:bold; margin-right:10px;">${i+1}.</span> ${c.name}</div>
                <div style="text-align:right;">
                    <div style="font-weight:600;">${formatCurrency(c.val)}</div>
                    <div style="font-size:12px; color:#666;">${percent}% of total</div>
                </div>
            </div>`;
        }).join('') || '<p style="text-align:center; padding:10px;">No data</p>';
    }
}

// --------------------------------------------------------
// ♻️ REFRESH
// --------------------------------------------------------
async function refreshAnalytics() {
    await loadAnalyticsData();
    showToast('Dashboard Refreshed', 'success');
}

function exportReport() {
    alert('PDF Export functionality requires jsPDF configuration.');
}