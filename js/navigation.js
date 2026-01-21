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
    const localUser = getCurrentUser();
    let user = localUser;
    
    // Also check Supabase session if API is available
    if (typeof API !== 'undefined' && API.auth) {
        try {
            const supabaseUser = await API.auth.getCurrentUser();
            if (supabaseUser && !localUser) {
                // Sync local storage with Supabase
                const userInfo = {
                    id: supabaseUser.id,
                    email: supabaseUser.email,
                    name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
                    phone: supabaseUser.user_metadata?.phone || ''
                };
                Storage.set('currentUser', userInfo);
                user = userInfo;
            }
        } catch (error) {
            console.error('Error checking Supabase session:', error);
        }
    }
    
    if (user) {
        // User is logged in - show user menu with logout
        navLinks.innerHTML = `
            <li><a href="index.html">Home</a></li>
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
            <li><a href="index.html">Home</a></li>
            <li><a href="booking-history.html">My Bookings</a></li>
            <li><a href="login.html">Login</a></li>
        `;
    }
    
    // Add active class to current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
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
            logoutBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Logging out...';
        }
        
        // Call Supabase logout if available
        if (typeof API !== 'undefined' && API.auth && API.auth.signOut) {
            await API.auth.signOut();
        }
        
        // Clear local storage
        Storage.remove('currentUser');
        SessionStorage.remove('currentUser');
        SessionStorage.remove('selectedPackageId');
        
        showToast('Logged out successfully', 'success');
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out. Please try again.', 'error');
        
        // Still try to clear local storage
        Storage.remove('currentUser');
        SessionStorage.remove('currentUser');
        
        // Redirect anyway
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }
}

// Add styles for user menu
const navStyle = document.createElement('style');
navStyle.textContent = `
    .user-menu {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .user-name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        color: #000000;
        font-size: 15px;
    }
    
    .user-name i {
        font-size: 20px;
    }
    
    .btn-logout {
        background: #dc2626;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        font-family: 'Inter', sans-serif;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    
    .btn-logout:hover {
        background: #b91c1c;
        transform: translateY(-1px);
    }
    
    .btn-logout:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }
    
    .btn-logout i {
        font-size: 16px;
    }
    
    @media (max-width: 768px) {
        .user-menu {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
        }
        
        .btn-logout {
            width: 100%;
            justify-content: center;
        }
    }
`;
document.head.appendChild(navStyle);