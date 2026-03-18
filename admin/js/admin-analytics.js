/**
 * Admin Analytics JavaScript - ORIGINAL STRUCTURE PRESERVED
 * Fixes: Chart Dropdown Logic, Time Grouping, and PDF Export ONLY
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
    setDefaultDateRange(365); // RESTORED: Default to 1 year view to show all data
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

        // 5. Fetch Packages (RESTORED: using 'packages' table as requested)
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

// FIX: Helper to group dates based on dropdown selection
function getChartGroupKey(dateString, period) {
    const d = new Date(dateString);
    if (period === 'daily') {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (period === 'weekly') {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(d.setDate(diff));
        return 'Wk of ' + startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (period === 'monthly') {
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    const colorStyle = isPositive ? 'color: #22c55e;' : 'color: #ef4444;';

    el.innerHTML = `<i class="bi bi-arrow-${arrow}" style="${colorStyle}"></i> <span style="${colorStyle}">${Math.abs(percent)}%</span>`;
}

// --------------------------------------------------------
// 📈 CHARTS (FIXED TIME DROPDOWNS)
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

// FIX: Expose chart updates to window so HTML onchange can trigger them
window.updateRevenueChart = function() { renderRevenueChart(); };
window.updateBookingsChart = function() { renderBookingsChart(); };

function renderRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    // FIX: Read the dropdown value
    const periodSelect = document.getElementById('revenueChartPeriod');
    const period = periodSelect ? periodSelect.value : 'monthly';

    const dailyData = new Map();
    analyticsData.bookings.forEach(b => {
        if((b.status || '').toLowerCase() === 'cancelled') return;
        
        // FIX: Group data dynamically based on selection
        const dateKey = getChartGroupKey(b.created_at, period);
        
        const val = b.total_amount || b.package_price || b.budget || 0;
        const current = dailyData.get(dateKey) || 0;
        dailyData.set(dateKey, current + cleanAmount(val));
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

    // FIX: Read the dropdown value
    const periodSelect = document.getElementById('bookingsChartPeriod');
    const period = periodSelect ? periodSelect.value : 'monthly';

    const dailyData = new Map();
    analyticsData.bookings.forEach(b => {
        // FIX: Group data dynamically
        const dateKey = getChartGroupKey(b.created_at, period);
        const current = dailyData.get(dateKey) || 0;
        dailyData.set(dateKey, current + 1);
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
// ♻️ REFRESH & EXPORT
// --------------------------------------------------------
window.refreshAnalytics = async function() {
    await loadAnalyticsData();
    if(typeof showToast === 'function') showToast('Dashboard Refreshed', 'success');
}

// FIX: Added actual jsPDF Generator instead of alert placeholder
window.exportReport = function() {
    try {
        if(typeof showToast === 'function') showToast('Generating PDF Report...', 'info');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Document Details
        doc.setProperties({ title: 'WOW Surprises - Analytics Report' });
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        doc.text('Analytics & Performance Report', 14, 22);

        // Date Context
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const startStr = dateRangeStart ? dateRangeStart.toLocaleDateString() : 'N/A';
        const endStr = dateRangeEnd ? dateRangeEnd.toLocaleDateString() : 'N/A';
        doc.text(`Reporting Period: ${startStr} to ${endStr}`, 14, 30);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 35);

        // Core Metrics
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Key Metrics Summary', 14, 48);

        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.text(`Total Revenue: ${document.getElementById('totalRevenue').textContent}`, 14, 56);
        doc.text(`Total Bookings: ${document.getElementById('totalBookings').textContent}`, 14, 62);
        doc.text(`Average Booking Value: ${document.getElementById('avgBookingValue').textContent}`, 14, 68);
        doc.text(`New Clients Acquired: ${document.getElementById('newClients').textContent}`, 14, 74);

        // Top Packages Table Data
        const pkgStats = {};
        analyticsData.bookings.forEach(b => {
            const name = b.package_name || 'Custom Request';
            const val = cleanAmount(b.total_amount || b.package_price || b.budget || 0);
            if(!pkgStats[name]) pkgStats[name] = { count: 0, revenue: 0 };
            pkgStats[name].count++;
            pkgStats[name].revenue += val;
        });

        const topPkgs = Object.entries(pkgStats)
            .map(([name, stat]) => [name, stat.count.toString(), formatCurrency(stat.revenue)])
            .sort((a,b) => cleanAmount(b[2]) - cleanAmount(a[2]))
            .slice(0, 10); // Top 10

        if (topPkgs.length > 0) {
            doc.autoTable({
                startY: 85,
                head: [['Top Performing Packages', 'Total Bookings', 'Revenue Generated']],
                body: topPkgs,
                theme: 'grid',
                headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } }
            });
        }

        doc.save(`WOW_Analytics_Report_${new Date().getTime()}.pdf`);
        if(typeof showToast === 'function') showToast('Report Exported Successfully!', 'success');

    } catch (error) {
        console.error('Export Error:', error);
        if(typeof showToast === 'function') {
            showToast('Failed to generate PDF. Check console.', 'error');
        } else {
            alert('Failed to generate PDF.');
        }
    }
}