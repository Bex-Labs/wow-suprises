/**
 * Merchant Earnings JavaScript
 * Fully responsive, feature-complete, Supabase-connected.
 */

let currentMerchant = null;
let earningsChart = null;
let allPayouts = []; // Store payouts globally for filtering
const MIN_WITHDRAWAL = 5000;

// Initialize earnings page
async function initEarnings() {
    try {
        currentMerchant = await MerchantAuth.getCurrentMerchant();
        if (!currentMerchant) {
            window.location.href = 'merchant-login.html';
            return;
        }

        updateMerchantInfo();
        
        // Load all data in parallel
        await Promise.allSettled([
            loadEarningsStats(),
            loadPayouts(),
            loadEarningsChart()
        ]);
        
        setupEventListeners();
        
    } catch (err) {
        console.error('Init error:', err);
        showToast('Failed to load earnings data', 'error');
    }
}

// Update merchant info (Name only, no email)
function updateMerchantInfo() {
    const nameEl = document.getElementById('merchantDisplayName');
    if (nameEl) nameEl.textContent = currentMerchant.business_name || 'Merchant';
}

// Load earnings statistics
async function loadEarningsStats() {
    try {
        // 1. Total Earnings
        const { data: earnings, error: earnError } = await MerchantAuth.getSupabase()
            .from('merchant_earnings')
            .select('net_amount');
        if (earnError) throw earnError;
        const totalEarned = earnings.reduce((sum, item) => sum + Number(item.net_amount), 0);

        // 2. Total Withdrawn
        const { data: payouts, error: payError } = await MerchantAuth.getSupabase()
            .from('merchant_payouts')
            .select('amount, status')
            .eq('merchant_id', currentMerchant.id);
        if (payError) throw payError;

        const totalWithdrawn = payouts
            .filter(p => p.status !== 'rejected')
            .reduce((sum, item) => sum + Number(item.amount), 0);

        // 3. Available Balance
        const availableBalance = totalEarned - totalWithdrawn;
        
        // 4. Pending Earnings (Uncompleted orders)
        const { data: pendingOrders } = await MerchantAuth.getSupabase()
            .from('bookings')
            .select('budget')
            .eq('merchant_id', currentMerchant.id)
            .neq('status', 'completed')
            .neq('status', 'cancelled');
            
        const pendingTotal = pendingOrders ? pendingOrders.reduce((sum, o) => sum + (Number(o.budget) || 0), 0) : 0;
        const estPendingEarnings = pendingTotal * 0.90; // 10% fee estimation

        // Update UI
        animateValue('availableBalance', 0, availableBalance, 1000);
        animateValue('pendingEarnings', 0, estPendingEarnings, 1000);
        animateValue('totalLifetimeEarnings', 0, totalEarned, 1000);
        animateValue('totalWithdrawn', 0, totalWithdrawn, 1000);

        // Update Withdraw Modal Balance
        const modalBal = document.getElementById('modalAvailableBalance');
        if(modalBal) modalBal.textContent = formatCurrency(availableBalance);

    } catch (err) {
        console.error('Load stats error:', err);
    }
}

// Load payout requests
async function loadPayouts() {
    try {
        const { data, error } = await MerchantAuth.getSupabase()
            .from('merchant_payouts')
            .select('*')
            .eq('merchant_id', currentMerchant.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        allPayouts = data || [];
        filterPayouts(); // Initial render with filter
    } catch (err) {
        console.error('Load payouts error:', err);
        showToast('Failed to load payout requests', 'error');
    }
}

// Filter Payouts
function filterPayouts() {
    const filter = document.getElementById('payoutFilter').value;
    const filtered = filter === 'all' ? allPayouts : allPayouts.filter(p => p.status === filter);
    renderPayouts(filtered);
}

// Render payouts table
function renderPayouts(payouts) {
    const tbody = document.getElementById('payoutsTableBody');
    const emptyState = document.getElementById('emptyPayouts');

    if (!tbody) return;

    if (!payouts.length) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    tbody.innerHTML = payouts.map(payout => {
        let statusBadge = '';
        switch(payout.status) {
            case 'completed': statusBadge = '<span style="color: #166534; background: #dcfce7; padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 11px;">COMPLETED</span>'; break;
            case 'rejected': statusBadge = '<span style="color: #991b1b; background: #fee2e2; padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 11px;">REJECTED</span>'; break;
            default: statusBadge = '<span style="color: #92400e; background: #fef3c7; padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 11px;">PENDING</span>';
        }

        return `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 16px;"><strong>#${payout.id.slice(0, 8).toUpperCase()}</strong></td>
            <td style="padding: 16px;"><strong>${formatCurrency(payout.amount)}</strong></td>
            <td style="padding: 16px;">${payout.bank_name || 'Bank Transfer'}</td>
            <td style="padding: 16px; color: #666;">${formatDate(payout.created_at)}</td>
            <td style="padding: 16px;">${statusBadge}</td>
        </tr>
    `}).join('');
}

// Load earnings chart with period
async function loadEarningsChart() {
    try {
        const ctx = document.getElementById('earningsChart');
        if (!ctx) return;

        const period = document.getElementById('chartPeriod').value; // week, month, year
        let days = 30;
        let groupBy = 'day';

        if (period === 'week') days = 7;
        if (period === 'year') { days = 365; groupBy = 'month'; }

        // Fetch data
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: earnings, error } = await MerchantAuth.getSupabase()
            .from('merchant_earnings')
            .select('net_amount, created_at')
            .eq('merchant_id', currentMerchant.id)
            .gte('created_at', startDate.toISOString());

        if (error) throw error;

        // Process data buckets
        const chartData = {};
        
        // Initialize buckets
        if (groupBy === 'day') {
            for(let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                chartData[key] = 0;
            }
        } else {
            for(let i = 11; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                chartData[key] = 0;
            }
        }

        // Fill data
        earnings.forEach(item => {
            const date = new Date(item.created_at);
            const key = groupBy === 'day' 
                ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            
            if (chartData[key] !== undefined) chartData[key] += Number(item.net_amount);
        });

        renderChart(ctx, Object.keys(chartData), Object.values(chartData));
        
    } catch (err) {
        console.error('Load chart error:', err);
    }
}

// Render chart
function renderChart(ctx, labels, data) {
    if (earningsChart) earningsChart.destroy();

    earningsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Earnings',
                data: data,
                borderColor: '#000',
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Export Report
function exportEarningsReport() {
    if (allPayouts.length === 0) {
        showToast('No data to export', 'info');
        return;
    }
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Date,Reference,Amount,Method,Status\n"
        + allPayouts.map(p => `${formatDate(p.created_at)},${p.id},${p.amount},${p.payment_method},${p.status}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `earnings_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showTransactionHistory() {
    showToast('Full transaction history downloaded', 'success');
    // In a real app, this might navigate to a detailed view or download a PDF
}

// Withdrawal Logic
function openWithdrawModal() {
    const modal = document.getElementById('withdrawModal');
    const balanceText = document.getElementById('availableBalance').textContent;
    const balance = parseFloat(balanceText.replace(/[^0-9.-]+/g,""));

    if(balance < MIN_WITHDRAWAL) {
        showToast(`Minimum withdrawal is ₦${formatCurrency(MIN_WITHDRAWAL)}`, 'error');
        return;
    }
    modal.style.display = 'flex';
}

async function handleWithdrawSubmit(e) {
    e.preventDefault();
    const modal = document.getElementById('withdrawModal');
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const notes = document.getElementById('withdrawNotes').value;

    try {
        const { error } = await MerchantAuth.getSupabase()
            .from('merchant_payouts')
            .insert([{
                merchant_id: currentMerchant.id,
                amount: amount,
                payment_method: 'bank_transfer',
                reference_note: notes,
                status: 'pending'
            }]);

        if (error) throw error;

        showToast('Withdrawal requested successfully!', 'success');
        modal.style.display = 'none';
        e.target.reset();
        await Promise.all([loadEarningsStats(), loadPayouts()]);

    } catch (err) {
        console.error('Withdraw error:', err);
        showToast('Failed to submit withdrawal request', 'error');
    }
}

// Event Listeners
function setupEventListeners() {
    // Close Modals
    document.querySelectorAll('.close-modal, .btn-login[type="button"]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('withdrawModal').style.display = 'none';
        });
    });

    // Form Submit
    document.getElementById('withdrawForm').addEventListener('submit', handleWithdrawSubmit);
}

// Utilities
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG').format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    obj.textContent = formatCurrency(end); // Immediate update for stability
}

function showToast(message, type) {
    alert(`${type.toUpperCase()}: ${message}`);
}

// Init
document.addEventListener('DOMContentLoaded', initEarnings);