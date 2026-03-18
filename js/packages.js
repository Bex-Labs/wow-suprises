/**
 * HOMEPAGE PACKAGES LOADER & SMART FILTER ENGINE
 * Handles instant filtering by Category, Search, and Price
 */

let allPackages = []; // Master list stored in memory for instant speed

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('packagesGrid')) {
        loadPackagesStrict();
    }
});

async function loadPackagesStrict() {
    const grid = document.getElementById('packagesGrid');
    const loader = document.getElementById('loadingSpinner');

    if(loader) loader.style.display = 'block';
    
    // Wait for Supabase Client to initialize
    let attempts = 0;
    while (typeof window.sbClient === 'undefined' && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }

    if (typeof window.sbClient === 'undefined') {
        if(loader) loader.style.display = 'none';
        if(grid) grid.innerHTML = `<div class="alert alert-error">Database connection error.</div>`;
        return;
    }

    try {
        const { data, error } = await window.sbClient
            .from('merchant_services')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        allPackages = data || [];

        if (allPackages.length === 0) {
            if(loader) loader.style.display = 'none';
            document.getElementById('emptyState').style.display = 'block';
            return;
        }

        // Initial Render of all items
        renderProductionGrid(allPackages);
        if(loader) loader.style.display = 'none';

    } catch (err) {
        console.error("❌ CRITICAL ERROR:", err);
        if(loader) loader.style.display = 'none';
        if(grid) grid.innerHTML = `<div class="alert alert-error">Error loading packages.</div>`;
    }
}

/**
 * THE SMART FILTER ENGINE
 * Logic: Matches Search Bar + Category Dropdown + Price Slider
 */
window.applyFilters = function() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const categoryTerm = document.getElementById('categoryFilter').value;
    const maxPrice = parseInt(document.getElementById('priceRange').value);
    const sortBy = document.getElementById('sortFilter').value;

    let filtered = allPackages.filter(pkg => {
        // 1. SMART SEARCH: Checks Title, Description, AND Category Column
        const matchesSearch = searchTerm === "" || 
                              pkg.service_name.toLowerCase().includes(searchTerm) || 
                              pkg.description.toLowerCase().includes(searchTerm) ||
                              pkg.category.toLowerCase().replace(/_/g, ' ').includes(searchTerm);
        
        // 2. SMART CATEGORY: Handles underscores and partial matches
        const cleanPkgCategory = pkg.category ? pkg.category.toLowerCase() : "";
        const matchesCategory = categoryTerm === "" || 
                                cleanPkgCategory === categoryTerm.toLowerCase() ||
                                cleanPkgCategory.includes(categoryTerm.toLowerCase());
        
        // 3. PRICE MATCH
        const matchesPrice = (pkg.base_price || 0) <= maxPrice;

        return matchesSearch && matchesCategory && matchesPrice;
    });

    // 4. SORTING LOGIC
    if (sortBy === 'price-low') {
        filtered.sort((a, b) => a.base_price - b.base_price);
    } else if (sortBy === 'price-high') {
        filtered.sort((a, b) => b.base_price - a.base_price);
    } else if (sortBy === 'newest') {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // UPDATE UI
    const noResults = document.getElementById('noResults');
    const grid = document.getElementById('packagesGrid');

    if (filtered.length === 0) {
        noResults.style.display = 'block';
        grid.innerHTML = ''; 
    } else {
        noResults.style.display = 'none';
        renderProductionGrid(filtered);
    }
};

/**
 * RENDER ENGINE - Creates the HTML Cards
 */
function renderProductionGrid(services) {
    const grid = document.getElementById('packagesGrid');
    if (!grid) return;

    grid.innerHTML = services.map(pkg => {
        const title = pkg.service_name || "Unnamed Package";
        const price = new Intl.NumberFormat('en-NG', { 
            style: 'currency', 
            currency: 'NGN', 
            maximumFractionDigits: 0 
        }).format(pkg.base_price || 0);
        
        const desc = pkg.description || "";
        const imgUrl = pkg.image_url || 'images/default-package.jpg';

        return `
            <div class="package-card">
                <div class="package-image">
                    <img src="${imgUrl}" alt="${title}" onerror="this.src='https://placehold.co/600x400?text=No+Image'">
                    <span class="category-tag">${formatCategoryName(pkg.category)}</span>
                </div>
                <div class="package-content">
                    <div class="package-header">
                        <h3>${title}</h3>
                        <span class="price-tag">${price}</span>
                    </div>
                    <p class="package-desc">
                        ${desc.length > 85 ? desc.substring(0, 85) + '...' : desc}
                    </p>
                    
                    <div class="package-features">
                        <span><i class="bi bi-patch-check-fill" style="color: #0f172a"></i> WOW Verified</span>
                        <span><i class="bi bi-star-fill" style="color:#FFD700"></i> 5.0</span>
                    </div>

                    <div class="package-actions">
                        <a href="booking.html?packageId=${pkg.id}" class="btn-primary" style="width:100%; text-decoration:none; text-align:center; display:block;">
                            Book Now <i class="bi bi-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * UTILITY: Formats 'gift_packages' into 'Gift Packages' for the UI
 */
function formatCategoryName(cat) {
    if(!cat) return 'Service';
    return cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}