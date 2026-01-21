/**
 * Merchant Reviews JavaScript
 * Features: List, Filter, Sort, Reply, Stats
 */

let currentMerchant = null;
let allReviews = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        currentMerchant = await MerchantAuth.getCurrentMerchant();
        if (!currentMerchant) {
            window.location.href = 'merchant-login.html';
            return;
        }

        updateHeader();
        await loadReviews();
        
        // Mobile Sidebar
        const toggle = document.getElementById('sidebarToggle');
        if(toggle) {
            toggle.addEventListener('click', () => {
                document.getElementById('merchantSidebar').classList.toggle('active');
            });
        }

    } catch (err) {
        console.error('Init error:', err);
    }
});

function updateHeader() {
    document.getElementById('merchantName').textContent = currentMerchant.business_name || 'Merchant';
    if (currentMerchant.logo_url) {
        const headerAvatar = document.getElementById('headerAvatar');
        headerAvatar.innerHTML = `<img src="${currentMerchant.logo_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        headerAvatar.style.background = 'transparent';
        headerAvatar.style.border = 'none';
    }
}

// 1. Fetch Data
async function loadReviews() {
    try {
        const { data, error } = await merchantSupabase
            .from('merchant_reviews')
            .select('*')
            .eq('merchant_id', currentMerchant.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        allReviews = data || [];
        updateStats();
        renderReviews(allReviews);

    } catch (err) {
        console.error('Reviews error:', err);
        document.getElementById('reviewsContainer').innerHTML = '<p style="color:red; text-align:center">Failed to load reviews.</p>';
    }
}

// 2. Render List
function renderReviews(reviews) {
    const container = document.getElementById('reviewsContainer');
    
    if (reviews.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #999; background: #fff; border-radius: 12px; border: 1px solid #eee;">
                <i class="bi bi-chat-square-quote" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                <p>No reviews match your filters.</p>
            </div>`;
        return;
    }

    container.innerHTML = reviews.map(r => {
        const initials = (r.customer_name || 'A').charAt(0).toUpperCase();
        const stars = '★'.repeat(Math.round(r.rating)) + '☆'.repeat(5 - Math.round(r.rating));
        
        // Check if replied
        const hasReply = r.merchant_reply && r.merchant_reply.trim() !== '';
        
        return `
            <div class="review-card" id="review-${r.id}">
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-avatar">${initials}</div>
                        <div class="review-meta">
                            <h4>${escapeHtml(r.customer_name || 'Anonymous')}</h4>
                            <span>${new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="stars">${stars}</div>
                </div>
                
                <p style="line-height: 1.6; color: #333;">${escapeHtml(r.comment || 'No comment provided.')}</p>
                
                ${hasReply ? `
                    <div class="merchant-reply">
                        <div class="reply-header">
                            <span><i class="bi bi-arrow-return-right"></i> Your Reply</span>
                            <span>${new Date(r.replied_at || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <p style="margin: 0; font-size: 14px; color: #444;">${escapeHtml(r.merchant_reply)}</p>
                    </div>
                ` : `
                    <button class="btn-text" onclick="toggleReplyForm('${r.id}')" style="color: #000; font-size: 13px; margin-top: 10px;">
                        <i class="bi bi-reply"></i> Reply to customer
                    </button>
                `}

                <div class="reply-input-area" id="reply-form-${r.id}">
                    <textarea class="reply-textarea" id="reply-text-${r.id}" rows="3" placeholder="Write your reply here..."></textarea>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-login" onclick="submitReply('${r.id}')" style="width: auto; padding: 8px 16px; font-size: 13px;">Post Reply</button>
                        <button class="btn-text" onclick="toggleReplyForm('${r.id}')" style="color: #666;">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 3. Update Statistics Sidebar
function updateStats() {
    const total = allReviews.length;
    const avg = total > 0 
        ? (allReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / total).toFixed(1) 
        : "0.0";

    document.getElementById('avgRatingDisplay').textContent = avg;
    document.getElementById('totalCountDisplay').textContent = total;
    document.getElementById('avgStarsDisplay').textContent = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));

    // Distribution Bars
    const counts = {5:0, 4:0, 3:0, 2:0, 1:0};
    allReviews.forEach(r => {
        const rating = Math.round(r.rating || 0);
        if(counts[rating] !== undefined) counts[rating]++;
    });

    const barsHtml = Object.keys(counts).sort((a,b) => b-a).map(star => {
        const count = counts[star];
        const percent = total > 0 ? (count / total) * 100 : 0;
        return `
            <div class="star-row">
                <span style="width: 30px;">${star} ★</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
                <span style="width: 30px; text-align: right;">${count}</span>
            </div>
        `;
    }).join('');
    
    document.getElementById('ratingBars').innerHTML = barsHtml;
}

// 4. Filtering Logic
window.filterReviews = function() {
    const ratingFilter = document.getElementById('ratingFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;

    let filtered = [...allReviews];

    // Apply Rating Filter
    if (ratingFilter !== 'all') {
        filtered = filtered.filter(r => Math.round(r.rating) == ratingFilter);
    }

    // Apply Sorting
    filtered.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        
        switch(sortFilter) {
            case 'newest': return dateB - dateA;
            case 'oldest': return dateA - dateB;
            case 'highest': return b.rating - a.rating;
            case 'lowest': return a.rating - b.rating;
            default: return dateB - dateA;
        }
    });

    renderReviews(filtered);
}

// 5. Reply Functions
window.toggleReplyForm = function(id) {
    const form = document.getElementById(`reply-form-${id}`);
    if (form) form.classList.toggle('active');
}

window.submitReply = async function(id) {
    const textarea = document.getElementById(`reply-text-${id}`);
    const text = textarea.value.trim();

    if (!text) return alert('Please write a reply first.');

    try {
        // Update DB
        const { error } = await merchantSupabase
            .from('merchant_reviews')
            .update({ 
                merchant_reply: text,
                replied_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        alert('Reply posted successfully!');
        
        // Reload data to refresh UI
        await loadReviews();

    } catch (err) {
        console.error('Reply error:', err);
        alert('Failed to post reply.');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}