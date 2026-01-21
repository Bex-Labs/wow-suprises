/**
 * Admin Payouts Management
 */

document.addEventListener('DOMContentLoaded', async () => {
    if (!await protectAdminRoute()) return;
    loadPayouts();
});

async function loadPayouts() {
    try {
        // Join with merchants to get names
        const { data, error } = await supabaseAdmin
            .from('merchant_payouts')
            .select(`
                *,
                merchants ( business_name )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        renderPayouts(data);
    } catch (err) {
        console.error(err);
        alert('Failed to load payouts');
    }
}

function renderPayouts(list) {
    const tbody = document.getElementById('payoutsList');
    if(list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center;">No payout requests found.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(p => {
        const merchantName = p.merchants?.business_name || 'Unknown';
        const isPending = p.status === 'pending';
        
        return `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px;"><strong>${merchantName}</strong></td>
            <td style="padding: 12px;">${formatCurrency(p.amount)}</td>
            <td style="padding: 12px;">
                <div style="font-size:12px;">${p.bank_name || 'N/A'}</div>
                <div style="font-weight:600;">${p.account_number || 'N/A'}</div>
            </td>
            <td style="padding: 12px;">
                <span class="badge badge-${isPending ? 'warning' : 'success'}">${p.status}</span>
            </td>
            <td style="padding: 12px;">
                ${isPending ? 
                    `<button onclick="markPaid('${p.id}')" class="admin-btn admin-btn-sm admin-btn-success">Mark as Paid</button>` : 
                    `<span style="color:green; font-size:12px;"><i class="bi bi-check-all"></i> Paid</span>`
                }
            </td>
        </tr>
    `}).join('');
}

window.markPaid = async function(id) {
    if(!confirm('Confirm that you have transferred the funds manually?')) return;
    
    const { error } = await supabaseAdmin
        .from('merchant_payouts')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('id', id);

    if(!error) {
        alert('Status updated to Paid.');
        loadPayouts();
    } else {
        alert('Error updating status.');
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
}