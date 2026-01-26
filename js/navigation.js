// Navigation Component - Dynamically updates based on login status

// Update navigation on page load
document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
});

// Function to update navigation based on login status
async function updateNavigation() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    // Check both local storage and Supabase session
    // Helper to safely get user from storage if Utils exists, otherwise direct
    const localUser = (typeof Storage !== 'undefined' && typeof Storage.get === 'function') 
        ? Storage.get('currentUser') 
        : JSON.parse(localStorage.getItem('currentUser'));
        
    let user = localUser;
    
    // Also check Supabase session if API is available
    // (Using window.sbClient or window.supabase from config)
    const client = window.sbClient || window.supabase;
    
    if (client && client.auth) {
        try {
            const { data: { user: supabaseUser } } = await client.auth.getUser();
            
            if (supabaseUser && !localUser) {
                // Sync local storage with Supabase
                const userInfo = {
                    id: supabaseUser.id,
                    email: supabaseUser.email,
                    name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
                    phone: supabaseUser.user_metadata?.phone || ''
                };
                
                if (typeof Storage !== 'undefined') {
                    Storage.set('currentUser', userInfo);
                } else {
                    localStorage.setItem('currentUser', JSON.stringify(userInfo));
                }
                user = userInfo;
            }
        } catch (error) {
            console.error('Error checking Supabase session:', error);
        }
    }
    
    // Define the Standard Links that ALWAYS appear
    const commonLinks = `
        <li><a href="index.html">Home</a></li>
        <li><a href="custom-package.html">Custom Package</a></li>
        <li><a href="reviews.html">Reviews</a></li>
    `;

    if (user) {
        // User is logged in - show user menu with logout
        navLinks.innerHTML = `
            ${commonLinks}
            <li><a href="booking-history.html">My Bookings</a></li>
            <li class="user-menu">
                <span class="user-name">
                    <i class="bi bi-person-circle"></i> ${user.name || user.email || 'User'}
                </span>
                <button onclick="handleLogout()" class="btn-logout">
                    <i class="bi bi-box-arrow-right"></i> Logout
                </button>
            </li>
        `;
    } else {
        // User is not logged in - show login link
        navLinks.innerHTML = `
            ${commonLinks}
            <li><a href="booking-history.html">My Bookings</a></li>
            <li><a href="login.html" id="authLink">Login</a></li>
        `;
    }
    
    // Add active class to current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
        // Simple check to match href
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

// Handle logout
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }
    
    try {
        // Show loading state
        const logoutBtn = document.querySelector('.btn-logout');
        if (logoutBtn) {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Logging out...';
        }
        
        // Call Supabase logout if available
        const client = window.sbClient || window.supabase;
        if (client && client.auth) {
            await client.auth.signOut();
        }
        
        // Clear local storage
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('selectedPackageId');
        
        // Redirect to home page
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Logout error:', error);
        // Force logout anyway
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

// Add styles for user menu
const navStyle = document.createElement('style');
navStyle.textContent = `
    .user-menu {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-left: 10px;
    }
    
    .user-name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: #333;
        font-size: 15px;
    }
    
    .user-name i {
        font-size: 20px;
        color: #555;
    }
    
    .btn-logout {
        background: #dc3545;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    
    .btn-logout:hover {
        background: #c82333;
        transform: translateY(-1px);
    }
    
    @media (max-width: 768px) {
        .user-menu {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
            margin-left: 0;
            margin-top: 10px;
        }
        
        .btn-logout {
            width: 100%;
            justify-content: center;
        }
    }
`;
document.head.appendChild(navStyle);