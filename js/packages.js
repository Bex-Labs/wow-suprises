/**
 * HOMEPAGE PACKAGES LOADER - PRODUCTION MODE
 * STRICT DATABASE CONNECTION ONLY
 */

document.addEventListener('DOMContentLoaded', () => {
    // Only run if the grid exists
    if (document.getElementById('packagesGrid')) {
        loadPackagesStrict();
    }
});

async function loadPackagesStrict() {
    const grid = document.getElementById('packagesGrid');
    const loader = document.getElementById('loadingSpinner');

    if(loader) loader.style.display = 'block';
    
    // 1. Wait for Supabase to be ready (Critical for avoiding race conditions)
    let attempts = 0;
    while (typeof window.sbClient === 'undefined' && attempts < 20) {
        await new Promise(r => setTimeout(r, 100)); // Wait 100ms
        attempts++;
    }

    if (typeof window.sbClient === 'undefined') {
        if(loader) loader.style.display = 'none';
        if(grid) {
            grid.style.display = 'block';
            grid.innerHTML = `<div class="alert alert-error">Error: Database connection timed out. Check config.js.</div>`;
        }
        return;
    }

    try {
        console.log("📡 Connecting to Supabase 'merchant_services' table...");

        // 2. Fetch Data (Strict Mode)
        const { data, error } = await window.sbClient
            .from('merchant_services')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        // 3. Handle Database Errors Explicitly
        if (error) {
            console.error("❌ SUPABASE ERROR:", error);
            throw new Error(error.message || "Database permission denied");
        }

        // 4. Handle Empty Data
        if (!data || data.length === 0) {
            console.warn("⚠️ Database connected, but returned 0 active services.");
            if(loader) loader.style.display = 'none';
            if(grid) {
                grid.style.display = 'block';
                grid.innerHTML = `<div class="alert alert-info text-center">No active packages found in database. Please add services in the Merchant Dashboard.</div>`;
            }
            return;
        }

        // 5. Render Real Data
        console.log(`✅ Successfully loaded ${data.length} packages.`);
        renderProductionGrid(data);

        if(loader) loader.style.display = 'none';
        if(grid) grid.style.display = 'grid';

    } catch (err) {
        console.error("❌ CRITICAL ERROR:", err);
        if(loader) loader.style.display = 'none';
        if(grid) {
            grid.style.display = 'block';
            // Display the ACTUAL error on screen so you know what to fix
            grid.innerHTML = `
                <div class="alert alert-error" style="text-align:center; color:red; padding:20px;">
                    <h3>Unable to Load Packages</h3>
                    <p><strong>Reason:</strong> ${err.message}</p>
                    <p style="font-size:0.8em; margin-top:10px;">If this says "Policy" or "Permission", you need to run the SQL Policy.</p>
                </div>
            `;
        }
    }
}

function renderProductionGrid(services) {
    const grid = document.getElementById('packagesGrid');
    if (!grid) return;

    grid.innerHTML = services.map(pkg => {
        // Safe Data Extraction
        const title = pkg.service_name || "Unnamed Package";
        const rawPrice = pkg.base_price || 0;
        const price = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(rawPrice);
        const desc = pkg.description || "";
        const imgUrl = pkg.image_url || 'images/default-package.jpg'; // Fallback only if DB image is null

        return `
            <div class="package-card">
                <div class="package-image">
                    <img src="${imgUrl}" alt="${title}" onerror="this.src='https://placehold.co/600x400?text=No+Image'">
                    <span class="category-tag">${pkg.category || 'Service'}</span>
                </div>
                <div class="package-content">
                    <div class="package-header">
                        <h3>${title}</h3>
                        <span class="price-tag">${price}</span>
                    </div>
                    <p class="package-desc">
                        ${desc.length > 80 ? desc.substring(0, 80) + '...' : desc}
                    </p>
                    
                    <div class="package-features">
                        <span><i class="bi bi-clock"></i> 24h Delivery</span>
                        <span><i class="bi bi-star-fill" style="color:#FFD700"></i> 5.0</span>
                    </div>

                    <div class="package-actions">
                        <a href="booking.html?packageId=${pkg.id}" class="btn-primary" style="width:100%; text-decoration:none;">
                            Book Now <i class="bi bi-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}