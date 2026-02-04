/**
 * HOMEPAGE PACKAGES LOADER
 * Fetches active services from Supabase and renders them on index.html
 */

let allServices = [];

document.addEventListener('DOMContentLoaded', () => {
    // Only run this if we are on the homepage
    if (document.getElementById('packagesGrid')) {
        loadHomepagePackages();
    }
});

async function loadHomepagePackages() {
    const grid = document.getElementById('packagesGrid');
    const loader = document.getElementById('loadingSpinner');
    const noResults = document.getElementById('noResults');

    // 1. Show Loading Spinner
    if (loader) loader.style.display = 'block';
    if (grid) grid.style.display = 'none';
    if (noResults) noResults.style.display = 'none';

    // 2. Wait for Supabase Config
    if (typeof window.sbClient === 'undefined') {
        console.warn("Supabase not ready, retrying...");
        setTimeout(loadHomepagePackages, 500);
        return;
    }

    try {
        // 3. Fetch Active Services from Database
        // We use 'merchant_services' table, NOT the old 'API' mock
        const { data: services, error } = await window.sbClient
            .from('merchant_services')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 4. Handle Empty or Success
        if (!services || services.length === 0) {
            if (loader) loader.style.display = 'none';
            if (noResults) noResults.style.display = 'block';
            return;
        }

        // 5. Render to Grid
        allServices = services; // Save for filtering
        renderGrid(services);
        
        if (loader) loader.style.display = 'none';
        if (grid) grid.style.display = 'grid';

    } catch (err) {
        console.error("Homepage Package Error:", err);
        if (grid) {
            grid.style.display = 'block';
            grid.innerHTML = `
                <div style="text-align:center; padding: 40px; color: #dc2626; grid-column: 1/-1;">
                    <i class="bi bi-exclamation-triangle" style="font-size: 2rem;"></i>
                    <p><strong>Failed to connect to database.</strong></p>
                    <p style="font-size:0.9rem; color:#666;">${err.message}</p>
                </div>
            `;
        }
        if (loader) loader.style.display = 'none';
    }
}

function renderGrid(services) {
    const grid = document.getElementById('packagesGrid');
    if (!grid) return;

    grid.innerHTML = services.map(pkg => {
        // Format Price
        const price = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(pkg.base_price || 0);
        
        // Handle Image
        const imgUrl = pkg.image_url || 'images/default-package.jpg';

        // NOTE: This links directly to custom-package.html instead of opening a modal
        return `
            <div class="package-card">
                <div class="package-image">
                    <img src="${imgUrl}" alt="${pkg.service_name}" onerror="this.src='https://placehold.co/600x400?text=WOW'">
                    <span class="category-tag">${pkg.category || 'Surprise'}</span>
                </div>
                <div class="package-content">
                    <div class="package-header">
                        <h3>${pkg.service_name}</h3>
                        <span class="price-tag">${price}</span>
                    </div>
                    <p class="package-desc">${pkg.description ? pkg.description.substring(0, 80) + '...' : 'No description.'}</p>
                    <div class="package-features">
                        <span><i class="bi bi-star-fill" style="color:gold"></i> 5.0</span>
                        <span><i class="bi bi-clock"></i> 24h Delivery</span>
                    </div>
                    
                    <a href="custom-package.html?service_id=${pkg.id}" class="btn-select">
                        Select Package <i class="bi bi-arrow-right"></i>
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Filter Logic (Triggered by HTML inputs)
 */
window.applyFilters = function() {
    const category = document.getElementById('categoryFilter').value.toLowerCase();
    const search = document.getElementById('searchInput').value.toLowerCase();
    const maxPrice = document.getElementById('priceRange').value;

    const filtered = allServices.filter(s => {
        // Category Match
        const catMatch = !category || category === '' || (s.category && s.category.toLowerCase() === category);
        
        // Search Match
        const searchMatch = !search || (s.service_name || '').toLowerCase().includes(search);
        
        // Price Match
        const priceMatch = (s.base_price || 0) <= parseInt(maxPrice);

        return catMatch && searchMatch && priceMatch;
    });

    renderGrid(filtered);
    
    // Show/Hide No Results
    const noResults = document.getElementById('noResults');
    const grid = document.getElementById('packagesGrid');
    
    if (filtered.length === 0) {
        if(noResults) noResults.style.display = 'block';
        if(grid) grid.style.display = 'none';
    } else {
        if(noResults) noResults.style.display = 'none';
        if(grid) grid.style.display = 'grid';
    }
};

// Expose simple scroll function
window.scrollToPackages = function() {
    const el = document.getElementById('packages');
    if(el) el.scrollIntoView({behavior:'smooth'});
};