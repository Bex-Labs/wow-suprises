// Navigation Component - Dynamically updates based on login status

document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
});

async function updateNavigation() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    let user = null;
    const client = window.sbClient || window.supabase || (window.getSupabaseClient ? window.getSupabaseClient() : null);
    
    // 1. Await Supabase FIRST to prevent the race condition
    if (client && client.auth) {
        try {
            const { data, error } = await client.auth.getSession();
            if (data?.session?.user) {
                const supabaseUser = data.session.user;
                user = {
                    id: supabaseUser.id,
                    email: supabaseUser.email,
                    name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
                    phone: supabaseUser.user_metadata?.phone || ''
                };
                
                if (typeof Storage !== 'undefined') {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                }
            }
        } catch (error) {
            console.error('Error checking Supabase session:', error);
        }
    }
    
    // 2. Fallback to Local Storage
    if (!user) {
        const localUser = (typeof Storage !== 'undefined' && typeof Storage.get === 'function') 
            ? Storage.get('currentUser') 
            : JSON.parse(localStorage.getItem('currentUser'));
        user = localUser;
    }
    
    const commonLinks = `
        <li><a href="index.html">Home</a></li>
        <li><a href="custom-package.html">Custom Package</a></li>
        <li><a href="reviews.html">Reviews</a></li>
    `;

    if (user) {
        // No name display, no red button — simple Logout link matching index.html
        navLinks.innerHTML = `
            ${commonLinks}
            <li><a href="booking-history.html">My Bookings</a></li>
            <li><a href="#" id="authLink" onclick="handleLogout(); return false;">Logout</a></li>
        `;
    } else {
        navLinks.innerHTML = `
            ${commonLinks}
            <li><a href="booking-history.html">My Bookings</a></li>
            <li><a href="login.html" id="authLink">Login</a></li>
        `;
    }
    
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        const client = window.sbClient || window.supabase || (window.getSupabaseClient ? window.getSupabaseClient() : null);
        if (client && client.auth) {
            await client.auth.signOut();
        }
        
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('selectedPackageId');
        
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}