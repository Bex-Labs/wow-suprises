/**
 * Reviews Page Logic
 * Adapts to existing SUPABASE_CONFIG to initialize client
 * FIXED: Now pointing to 'site_feedback' to avoid package_id constraint errors.
 */

let sbClient = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Supabase Client using your existing config
    if (typeof supabase !== 'undefined' && window.SUPABASE_CONFIG) {
        try {
            sbClient = supabase.createClient(
                window.SUPABASE_CONFIG.url, 
                window.SUPABASE_CONFIG.anonKey
            );
            console.log('✅ Reviews: Database connection established');
        } catch (err) {
            console.error('❌ Failed to initialize Supabase client:', err);
            return;
        }
    } else {
        console.error('❌ Supabase library or Config missing.');
        return;
    }

    // 2. Run Page Logic
    await checkAuthStatus();
    await loadReviews();
    initializeStarRating();
    initializeForm();
});

// ==========================================
// 1. AUTH CHECK
// ==========================================
async function checkAuthStatus() {
    const loginPrompt = document.getElementById('loginPrompt');
    const formSection = document.getElementById('reviewFormSection');
    const authLink = document.getElementById('authLink');

    // Check Auth
    const { data: { session } } = await sbClient.auth.getSession();

    if (session) {
        // User is Logged In
        if(loginPrompt) loginPrompt.style.display = 'none';
        if(formSection) formSection.style.display = 'block';
        
        if(authLink) {
            authLink.textContent = 'Logout';
            authLink.href = '#';
            authLink.onclick = async (e) => {
                e.preventDefault();
                await sbClient.auth.signOut();
                sessionStorage.clear(); // Clear local session data
                window.location.reload();
            };
        }
    } else {
        // User is Guest
        if(loginPrompt) loginPrompt.style.display = 'block';
        if(formSection) formSection.style.display = 'none';
    }
}

// ==========================================
// 2. LOAD REVIEWS
// ==========================================
async function loadReviews() {
    const container = document.getElementById('reviewsContainer');
    const loader = document.getElementById('loadingReviews');
    
    try {
        // Fetch reviews from the new site_feedback table
        const { data: reviews, error } = await sbClient
            .from('site_feedback')
            .select(`
                *,
                profiles:user_id ( full_name )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if(loader) loader.style.display = 'none';

        if (!reviews || reviews.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:40px; color:#666;">
                    <i class="bi bi-chat-square-quote" style="font-size:48px; display:block; margin-bottom:10px;"></i>
                    <p>No reviews yet. Be the first to share your experience!</p>
                </div>`;
            return;
        }

        container.innerHTML = reviews.map(review => {
            // Handle missing name gracefully
            const name = review.profiles?.full_name || 'Anonymous User';
            const initial = name.charAt(0).toUpperCase();
            const date = new Date(review.created_at).toLocaleDateString('en-GB', {
                year: 'numeric', month: 'short', day: 'numeric'
            });

            return `
                <div class="review-card">
                    <div style="display:flex; align-items:center; margin-bottom:15px;">
                        <div class="reviewer-avatar">${initial}</div>
                        <div>
                            <h4 style="margin:0; font-size:16px;">${escapeHtml(name)}</h4>
                            <span style="font-size:12px; color:#888;">${date}</span>
                        </div>
                    </div>
                    <div style="margin-bottom:10px;">
                        ${generateStars(review.rating)}
                    </div>
                    ${review.title ? `<h4 style="margin:0 0 8px 0; font-size:16px;">${escapeHtml(review.title)}</h4>` : ''}
                    <p style="color:#555; line-height:1.5; margin:0;">${escapeHtml(review.comment)}</p>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Error loading reviews:', err);
        if(loader) loader.innerHTML = '<p style="color:red">Failed to load reviews.</p>';
    }
}

// ==========================================
// 3. SUBMIT REVIEW
// ==========================================
function initializeForm() {
    const form = document.getElementById('reviewForm');
    if(!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        
        // Form Data
        const rating = document.getElementById('ratingValue').value;
        const title = document.getElementById('reviewTitle').value;
        const comment = document.getElementById('reviewComment').value;

        if (!rating || rating === "0") {
            alert('Please select a star rating.');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Submitting...';

            // Get User ID
            const { data: { user } } = await sbClient.auth.getUser();
            
            if (!user) throw new Error('You must be logged in.');

            // Insert to the new site_feedback table
            const { error } = await sbClient
                .from('site_feedback')
                .insert([{
                    user_id: user.id,
                    rating: parseInt(rating),
                    title: title,
                    comment: comment
                }]);

            if (error) throw error;

            alert('Review submitted successfully!');
            form.reset();
            resetStars();
            loadReviews(); // Refresh list immediately

        } catch (err) {
            console.error('Submit error:', err);
            alert('Failed to submit review: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    });
}

// ==========================================
// 4. UTILS & UI
// ==========================================
function initializeStarRating() {
    const stars = document.querySelectorAll('#starContainer i');
    const input = document.getElementById('ratingValue');

    if(!stars.length) return;

    stars.forEach(star => {
        star.addEventListener('click', function() {
            const val = this.getAttribute('data-val');
            input.value = val;
            highlightStars(val);
        });
    });
}

function highlightStars(count) {
    const stars = document.querySelectorAll('#starContainer i');
    stars.forEach(s => {
        if(s.getAttribute('data-val') <= count) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });
}

function resetStars() {
    const input = document.getElementById('ratingValue');
    if(input) input.value = "";
    highlightStars(0);
}

function generateStars(count) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += i <= count 
            ? '<i class="bi bi-star-fill star-filled"></i> ' 
            : '<i class="bi bi-star-fill star-empty"></i> ';
    }
    return html;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}