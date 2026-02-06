/**
 * Admin Packages Management - REAL MERCHANT DATA VERSION
 * Fixes: Status Count (0 issue), Image 404s, and Case Sensitivity
 */

let allPackages = [];
let filteredPackages = [];
let currentPackage = null;
let isEditMode = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Packages page initializing...');
    
    // Protect admin route
    if (typeof protectAdminRoute === 'function') {
        const isAuth = await protectAdminRoute();
        if (!isAuth) return;
    }
    
    await loadAdminName();
    await loadAllPackages();
    
    console.log('✅ Packages page initialized');
});

// ========================================
// HELPER: Normalize Status (The Fix)
// ========================================
function normalizeStatus(status) {
    if (!status) return 'inactive'; // Handle null/undefined
    
    const s = String(status).toLowerCase().trim();
    
    // Accept ANY of these as "Active"
    const activeKeywords = ['active', 'published', 'true', '1', 'enabled', 'available', 'yes'];
    
    if (activeKeywords.includes(s)) {
        return 'active';
    }
    
    return 'inactive';
}

// ========================================
// FUNCTION 1: Load Admin Name
// ========================================
async function loadAdminName() {
    try {
        const sb = window.sbClient || window.supabase;
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
            const { data: profile } = await sb.from('profiles').select('full_name').eq('id', user.id).single();
            if (profile) {
                const nameEl = document.getElementById('adminName');
                if (nameEl) nameEl.textContent = profile.full_name || 'Admin';
            }
        }
    } catch (e) { console.log('⚠️ Could not load admin name'); }
}

// ========================================
// FUNCTION 2: Load All Packages
// ========================================
async function loadAllPackages() {
    try {
        console.log('📦 Loading REAL packages...');
        const sb = window.sbClient;
        
        const grid = document.getElementById('packagesGrid');
        if (grid) grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="bi bi-arrow-repeat spin"></i> Loading...</div>';
        
        // Fetch from 'merchant_services'
        const { data: services, error } = await sb
            .from('merchant_services')
            .select('*, merchants(business_name)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // MAP DATA & NORMALIZE STATUS
        allPackages = services.map(svc => {
            // ★ DEBUG: This will show exactly what string is in your DB
            console.log(`🔍 Package "${svc.service_name}" - Raw Status in DB: [${svc.status}]`);
            
            return {
                id: svc.id,
                title: svc.service_name,
                category: svc.category,
                price: svc.base_price,
                status: normalizeStatus(svc.status), // Use smart normalizer
                // ★ FIX: Use online placeholder if image is missing/broken
                image_url: svc.image_url || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image',
                description: svc.description,
                merchantName: svc.merchants?.business_name || 'System Admin',
                created_at: svc.created_at,
                features: svc.features || [],
                originalData: svc
            };
        });

        filteredPackages = [...allPackages];
        
        // Count active packages
        const activeCount = allPackages.filter(p => p.status === 'active').length;
        console.log(`✅ Loaded ${allPackages.length} packages. Active: ${activeCount}`);
        
        await loadBookingCounts();
        
        updateStats(); 
        displayPackages(filteredPackages);
        
    } catch (error) {
        console.error('❌ Error loading packages:', error);
        if(document.getElementById('packagesGrid')) {
            document.getElementById('packagesGrid').innerHTML = '<div class="error-state">Failed to load data.</div>';
        }
    }
}

// ========================================
// FUNCTION 3: Load Booking Counts
// ========================================
async function loadBookingCounts() {
    try {
        const sb = window.sbClient;
        const { data: bookings } = await sb.from('bookings').select('package_name');
        
        const counts = {};
        if (bookings) {
            bookings.forEach(b => {
                if(b.package_name) counts[b.package_name] = (counts[b.package_name] || 0) + 1;
            });
        }
        
        allPackages.forEach(pkg => {
            pkg.bookingCount = counts[pkg.title] || 0;
        });
    } catch (e) { console.error('Error counting bookings:', e); }
}

// ========================================
// FUNCTION 4: Update Statistics
// ========================================
function updateStats() {
    const activeCount = allPackages.filter(p => p.status === 'active').length;
    
    const stats = {
        total: allPackages.length,
        active: activeCount,
        avgPrice: allPackages.length > 0 ? 
            allPackages.reduce((sum, p) => sum + parseFloat(p.price || 0), 0) / allPackages.length : 0
    };
    
    const popularPackage = allPackages.reduce((max, pkg) => 
        (pkg.bookingCount || 0) > (max.bookingCount || 0) ? pkg : max, 
        allPackages[0] || {});
    
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setText('totalPackagesCount', stats.total);
    setText('activePackagesCount', stats.active);
    setText('popularPackageCount', popularPackage.bookingCount || 0);
    setText('avgPriceValue', formatCurrency(stats.avgPrice));
    setText('totalCount', `${stats.total} packages`);
}

// ========================================
// FUNCTION 5: Display Packages
// ========================================
function displayPackages(packages) {
    const grid = document.getElementById('packagesGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!grid) return;
    
    if (packages.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';
    
    grid.innerHTML = packages.map(pkg => `
        <div class="package-card-admin">
            <div class="package-image-admin" style="background-image: url('${pkg.image_url}')">
                <div class="package-status-badge ${pkg.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${pkg.status === 'active' ? 'Active' : 'Inactive'}
                </div>
            </div>
            <div class="package-content-admin">
                <div class="package-header-admin">
                    <h3>${pkg.title}</h3>
                    <span class="package-category-badge">${pkg.category || 'General'}</span>
                </div>
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">
                    <i class="bi bi-shop"></i> <strong>${pkg.merchantName}</strong>
                </div>
                <p class="package-description-admin">${truncateText(pkg.description || '', 80)}</p>
                <div class="package-meta-admin">
                    <div class="package-price-admin"><strong>${formatCurrency(pkg.price)}</strong></div>
                    <div class="package-bookings-admin"><i class="bi bi-calendar-check"></i> ${pkg.bookingCount} bookings</div>
                </div>
                <div class="package-actions-admin">
                    <button class="btn-icon" onclick="viewPackage('${pkg.id}')"><i class="bi bi-eye"></i></button>
                    <button class="btn-icon" onclick="editPackage('${pkg.id}')"><i class="bi bi-pencil"></i></button>
                    <button class="btn-icon ${pkg.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                            onclick="togglePackageStatus('${pkg.id}')">
                        <i class="bi bi-${pkg.status === 'active' ? 'pause-circle' : 'play-circle'}"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="confirmDeletePackage('${pkg.id}')"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

// ========================================
// CRUD OPERATIONS
// ========================================

function openCreatePackageModal() {
    isEditMode = false;
    currentPackage = null;
    document.getElementById('packageModalTitle').innerHTML = '<i class="bi bi-plus-circle"></i> Create Merchant Service';
    document.getElementById('packageForm').reset();
    document.getElementById('packageModal').style.display = 'block';
}

function editPackage(id) {
    const pkg = allPackages.find(p => p.id === id);
    if (!pkg) return;
    
    isEditMode = true;
    currentPackage = pkg;
    
    const form = document.getElementById('packageForm');
    document.getElementById('packageModalTitle').innerHTML = '<i class="bi bi-pencil"></i> Edit Service';
    
    form.querySelector('[name="title"]').value = pkg.title;
    form.querySelector('[name="category"]').value = pkg.category;
    form.querySelector('[name="price"]').value = pkg.price;
    form.querySelector('[name="status"]').value = pkg.status;
    form.querySelector('[name="image_url"]').value = pkg.image_url;
    form.querySelector('[name="description"]').value = pkg.description;
    form.querySelector('[name="features"]').value = Array.isArray(pkg.features) ? pkg.features.join('\n') : '';
    
    document.getElementById('packageModal').style.display = 'block';
}

async function savePackage(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const features = fd.get('features').split('\n').filter(f => f.trim());
    
    const data = {
        service_name: fd.get('title'),
        category: fd.get('category'),
        base_price: parseFloat(fd.get('price')),
        status: normalizeStatus(fd.get('status')), // Normalize on save too
        image_url: fd.get('image_url') || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image',
        description: fd.get('description'),
        features: features,
        updated_at: new Date().toISOString()
    };
    
    try {
        if (isEditMode && currentPackage) {
            await window.sbClient.from('merchant_services').update(data).eq('id', currentPackage.id);
            showToast('Updated successfully', 'success');
        } else {
            data.created_at = new Date().toISOString();
            await window.sbClient.from('merchant_services').insert([data]);
            showToast('Created successfully', 'success');
        }
        closePackageModal();
        loadAllPackages();
    } catch (err) { console.error(err); showToast('Save failed', 'error'); }
}

async function togglePackageStatus(id) {
    const pkg = allPackages.find(p => p.id === id);
    const newStatus = pkg.status === 'active' ? 'inactive' : 'active';
    try {
        await window.sbClient.from('merchant_services').update({ status: newStatus }).eq('id', id);
        showToast('Status updated', 'success');
        loadAllPackages();
    } catch (e) { showToast(e.message, 'error'); }
}

async function deletePackage(id) {
    try {
        await window.sbClient.from('merchant_services').delete().eq('id', id);
        showToast('Deleted', 'success');
        loadAllPackages();
    } catch (e) { showToast('Delete failed', 'error'); }
}

function confirmDeletePackage(id) {
    if(confirm('Delete this service?')) deletePackage(id);
}

// ========================================
// UTILS & UI HELPERS
// ========================================
function closePackageModal() { document.getElementById('packageModal').style.display = 'none'; }
function closeViewModal() { document.getElementById('viewModal').style.display = 'none'; }
window.onclick = function(e) {
    if(e.target.id === 'packageModal') closePackageModal();
    if(e.target.id === 'viewModal') closeViewModal();
};

function formatCurrency(val) { return '₦' + parseFloat(val).toLocaleString('en-NG'); }
function truncateText(t, l) { return t.length > l ? t.substring(0, l) + '...' : t; }

// Filters
function searchPackages() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    filteredPackages = allPackages.filter(p => p.title.toLowerCase().includes(term));
    displayPackages(filteredPackages);
}
function filterPackages() {
    const cat = document.getElementById('categoryFilter').value;
    const stat = document.getElementById('statusFilter').value;
    filteredPackages = allPackages.filter(p => (!cat || p.category === cat) && (!stat || p.status === stat));
    displayPackages(filteredPackages);
}
function sortPackages() {
    const order = document.getElementById('sortOrder').value;
    filteredPackages.sort((a,b) => {
        if(order === 'price-low') return a.price - b.price;
        if(order === 'price-high') return b.price - a.price;
        return new Date(b.created_at) - new Date(a.created_at);
    });
    displayPackages(filteredPackages);
}
function clearFilters() {
    document.getElementById('searchInput').value = '';
    filteredPackages = [...allPackages];
    displayPackages(filteredPackages);
}
function refreshPackages() { loadAllPackages(); }
function exportPackages() { alert("Exporting..."); }