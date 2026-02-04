/**
 * Client Homepage Logic - FINAL FIX
 */

// 1. Run Immediately
checkLocalAuth();

document.addEventListener('DOMContentLoaded', () => {
    // 2. Run again when DOM is ready
    checkLocalAuth();
    initializeUI();
    setupLogout();
    
    // 3. Setup Image Error Handler
    const logo = document.getElementById('navLogo');
    if (logo) {
        logo.onerror = function() {
            this.style.display = 'none';
            const textLogo = document.createElement('div');
            textLogo.style.fontWeight = '800';
            textLogo.style.fontSize = '24px';
            textLogo.innerText = 'WOW SURPRISES';
            this.parentElement.appendChild(textLogo);
        };
    }
});

function checkLocalAuth() {
    // Get Elements
    const guestState = document.getElementById('guest-state');
    const userState = document.getElementById('user-state');
    const nameDisplay = document.getElementById('user-name-display');
    
    if (!guestState || !userState) return;

    // Check Storage
    const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    
    if (userStr && userStr !== "undefined" && userStr !== "null") {
        // --- LOGGED IN ---
        try {
            const user = JSON.parse(userStr);
            let name = "User";
            
            // Extract Name safely
            if (user.user_metadata && user.user_metadata.full_name) {
                name = user.user_metadata.full_name.split(' ')[0];
            } else if (user.email) {
                name = user.email.split('@')[0];
            }

            // Update UI
            if (nameDisplay) nameDisplay.innerHTML = `<i class="bi bi-person-circle"></i> Hi, ${name}`;
            
            guestState.style.display = 'none';
            userState.style.display = 'block'; // Or 'flex'
            
        } catch (e) {
            console.error("Auth Error:", e);
            // Fallback to guest if data is corrupt
            guestState.style.display = 'block';
            userState.style.display = 'none';
        }
    } else {
        // --- LOGGED OUT ---
        guestState.style.display = 'block';
        userState.style.display = 'none';
    }
}

function setupLogout() {
    const btn = document.getElementById('logout-btn');
    if (btn) {
        btn.onclick = async function() {
            if(!confirm("Are you sure you want to log out?")) return;
            
            // Clear Local
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');
            
            // Clear Supabase
            if (typeof window.sbClient !== 'undefined') {
                await window.sbClient.auth.signOut();
            }
            
            window.location.reload();
        };
    }
}

// --- UI INITIALIZATION ---
function initializeUI() {
    // Price Slider
    const range = document.getElementById('priceRange');
    const display = document.getElementById('priceValue');
    if(range && display) {
        range.addEventListener('input', function() {
            display.textContent = '₦0 - ₦' + parseInt(this.value).toLocaleString();
        });
    }
    
    // Back to Top
    const backBtn = document.getElementById('backToTop');
    if(backBtn) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) backBtn.classList.add('show');
            else backBtn.classList.remove('show');
        });
        backBtn.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));
    }
}

// Global Helpers
window.scrollToPackages = function() {
    const el = document.getElementById('packages');
    if(el) el.scrollIntoView({behavior:'smooth'});
};

window.closeModal = function() {
    const modal = document.getElementById('packageModal');
    if(modal) modal.style.display = 'none';
};

window.filterByCategory = function(cat) {
    window.scrollToPackages();
    const filter = document.getElementById('categoryFilter');
    if(filter) {
        filter.value = cat;
        // Trigger change event if needed by packages.js
        const event = new Event('change');
        filter.dispatchEvent(event);
    }
};