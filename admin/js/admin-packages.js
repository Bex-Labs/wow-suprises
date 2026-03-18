/**
 * Admin Packages Management - REAL MERCHANT DATA VERSION
 * Fixes: Status Count (0 issue), Image 404s, Case Sensitivity, PDF Export, and CATEGORY COLUMN SYNC
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
// HELPER: Normalize Status
// ========================================
function normalizeStatus(status) {
    if (!status) return 'inactive'; // Handle null/undefined
    
    const s = String(status).toLowerCase().trim();
    
    // Accept ANY of these as "Active"
    const activeKeywords = ['active', 'published', 'true', '1', 'enabled', 'available', 'yes', 't'];
    
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
// FUNCTION 2: Load All Packages (FIXED CATEGORY MAPPING)
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
            return {
                id: svc.id,
                title: svc.service_name,
                // FIX: explicitly check for 'service_category' (Merchant format) AND 'category'
                category: svc.service_category || svc.category || '',
                price: svc.base_price,
                status: normalizeStatus(svc.is_active || svc.status),
                image_url: svc.image_url || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image',
                description: svc.description,
                merchantName: svc.merchants?.business_name || 'System Admin',
                created_at: svc.created_at,
                features: svc.features || [],
                originalData: svc
            };
        });

        filteredPackages = [...allPackages];
        
        // Load accurate booking counts via IDs
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
        
        // Fetch the actual package_id, not just the string name
        const { data: bookings, error } = await sb
            .from('bookings')
            .select('package_id, package_name');
            
        if (error) throw error;
        
        const counts = {};
        if (bookings) {
            bookings.forEach(b => {
                // Group by ID first for accuracy, fallback to name string
                const key = b.package_id || b.package_name;
                if(key) counts[key] = (counts[key] || 0) + 1;
            });
        }
        
        // Map the counts back to the packages
        allPackages.forEach(pkg => {
            pkg.bookingCount = counts[pkg.id] || counts[pkg.title] || 0;
        });
        
    } catch (e) { 
        console.error('Error counting bookings:', e); 
    }
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
                    <button class="btn-icon" onclick="viewPackage('${pkg.id}')" title="View details"><i class="bi bi-eye"></i></button>
                    <button class="btn-icon" onclick="editPackage('${pkg.id}')" title="Edit package"><i class="bi bi-pencil"></i></button>
                    <button class="btn-icon ${pkg.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                            onclick="togglePackageStatus('${pkg.id}')" title="${pkg.status === 'active' ? 'Deactivate' : 'Activate'} package">
                        <i class="bi bi-${pkg.status === 'active' ? 'eye-slash' : 'eye'}"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="confirmDeletePackage('${pkg.id}')" title="Delete package"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

// ========================================
// CRUD OPERATIONS (FIXED DB COLUMNS)
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

// View Package Function
function viewPackage(id) {
    const pkg = allPackages.find(p => p.id === id);
    if (!pkg) return;
    
    const viewModalBody = document.getElementById('viewModalBody');
    const featuresList = Array.isArray(pkg.features) && pkg.features.length > 0 
        ? pkg.features.map(f => `<li><i class="bi bi-check2"></i> ${f}</li>`).join('') 
        : '<li>No specific features listed.</li>';

    viewModalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
            <img src="${pkg.image_url}" alt="${pkg.title}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px;">
            <div>
                <h3 style="margin-bottom: 5px;">${pkg.title}</h3>
                <div style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #f0fdf4; color: #166534; margin-bottom: 15px;">
                    ${formatCurrency(pkg.price)}
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 8px;">
                <div><strong>Category:</strong> <span style="text-transform: capitalize;">${pkg.category || 'N/A'}</span></div>
                <div><strong>Status:</strong> <span style="text-transform: capitalize; color: ${pkg.status === 'active' ? 'green' : 'red'}">${pkg.status}</span></div>
                <div><strong>Merchant:</strong> ${pkg.merchantName}</div>
                <div><strong>Bookings:</strong> ${pkg.bookingCount}</div>
            </div>
            
            <div>
                <h4>Description</h4>
                <p style="color: #4b5563; line-height: 1.6;">${pkg.description || 'No description provided.'}</p>
            </div>
            
            <div>
                <h4>Included Features</h4>
                <ul style="list-style: none; padding: 0; display: grid; gap: 8px;">
                    ${featuresList}
                </ul>
            </div>
        </div>
    `;
    
    document.getElementById('viewModal').style.display = 'block';
}

// Create/Update functionality and DB constraints
async function savePackage(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const features = fd.get('features').split('\n').filter(f => f.trim());
    
    // Check for admin merchant account
    let adminMerchantId = null;
    try {
        const { data: adminMerchant } = await window.sbClient
            .from('merchants')
            .select('id')
            .eq('business_name', 'WOW Admin') 
            .maybeSingle();
            
        adminMerchantId = adminMerchant ? adminMerchant.id : null;
    } catch (e) {
        console.warn('Could not find admin merchant ID');
    }
    
    const data = {
        service_name: fd.get('title'),
        // FIX: Save category to the correct 'service_category' column in Supabase
        service_category: fd.get('category').toLowerCase(),
        base_price: parseFloat(fd.get('price')),
        is_active: fd.get('status') === 'active', 
        status: fd.get('status'), 
        image_url: fd.get('image_url') || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image',
        description: fd.get('description'),
        features: features,
        updated_at: new Date().toISOString()
    };
    
    try {
        if (isEditMode && currentPackage) {
            await window.sbClient.from('merchant_services').update(data).eq('id', currentPackage.id);
            if(typeof showToast === 'function') showToast('Updated successfully', 'success');
        } else {
            data.created_at = new Date().toISOString();
            
            if (adminMerchantId) data.merchant_id = adminMerchantId;
            
            await window.sbClient.from('merchant_services').insert([data]);
            if(typeof showToast === 'function') showToast('Created successfully', 'success');
        }
        
        closePackageModal();
        await loadAllPackages();
        
    } catch (err) { 
        console.error(err); 
        if(typeof showToast === 'function') {
            showToast('Save failed: ' + (err.message || 'Unknown error'), 'error'); 
        } else {
            alert('Save failed: ' + (err.message || 'Unknown error'));
        }
    }
}

// Fixed toggle logic
async function togglePackageStatus(id) {
    const pkg = allPackages.find(p => p.id === id);
    const newStatus = pkg.status === 'active' ? 'inactive' : 'active';
    const newIsActive = newStatus === 'active';
    
    try {
        await window.sbClient.from('merchant_services').update({ 
            status: newStatus,
            is_active: newIsActive 
        }).eq('id', id);
        
        if(typeof showToast === 'function') showToast(`Package is now ${newStatus}`, 'success');
        await loadAllPackages(); // Reload immediately
    } catch (e) { 
        if(typeof showToast === 'function') showToast(e.message, 'error'); 
    }
}

async function deletePackage(id) {
    try {
        await window.sbClient.from('merchant_services').delete().eq('id', id);
        if(typeof showToast === 'function') showToast('Deleted successfully', 'success');
        await loadAllPackages();
    } catch (e) { 
        if(typeof showToast === 'function') showToast('Delete failed', 'error'); 
    }
}

function confirmDeletePackage(id) {
    if(confirm('Are you sure you want to permanently delete this service?')) {
        deletePackage(id);
    }
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

// ========================================
// FILTERS & SORTING
// ========================================

function searchPackages() {
    filterAndSortPackages();
}

function filterPackages() {
    filterAndSortPackages();
}

function sortPackages() {
    filterAndSortPackages();
}

// Unified Filter and Sort pipeline
function filterAndSortPackages() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const cat = document.getElementById('categoryFilter').value.toLowerCase();
    const stat = document.getElementById('statusFilter').value.toLowerCase();
    const order = document.getElementById('sortOrder').value;
    
    // 1. Filter
    filteredPackages = allPackages.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(term) || (p.merchantName && p.merchantName.toLowerCase().includes(term));
        const matchesCategory = !cat || (p.category && p.category.toLowerCase() === cat);
        const matchesStatus = !stat || p.status === stat;
        
        return matchesSearch && matchesCategory && matchesStatus;
    });
    
    // 2. Sort 
    filteredPackages.sort((a, b) => {
        if (order === 'name') {
            return a.title.localeCompare(b.title);
        }
        if (order === 'price-low') {
            return parseFloat(a.price || 0) - parseFloat(b.price || 0);
        }
        if (order === 'price-high') {
            return parseFloat(b.price || 0) - parseFloat(a.price || 0);
        }
        if (order === 'popular') {
            return (b.bookingCount || 0) - (a.bookingCount || 0);
        }
        if (order === 'oldest') {
            return new Date(a.created_at) - new Date(b.created_at);
        }
        // default: newest
        return new Date(b.created_at) - new Date(a.created_at);
    });
    
    displayPackages(filteredPackages);
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('sortOrder').value = 'newest';
    
    filteredPackages = [...allPackages];
    filterAndSortPackages();
}

async function refreshPackages() { 
    await loadAllPackages(); 
    if(typeof showToast === 'function') showToast('Packages refreshed', 'success');
}

// ========================================
// EXPORT TO PDF (jsPDF + AutoTable)
// ========================================
function exportPackages() {
    try {
        if (!filteredPackages || filteredPackages.length === 0) {
            if (typeof showToast === 'function') showToast('No packages found to export.', 'warning');
            return;
        }

        if (typeof showToast === 'function') showToast('Generating PDF Document...', 'info');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setProperties({
            title: 'WOW Surprises - Packages Report',
            subject: 'Packages List',
            author: 'WOW Admin'
        });

        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        doc.text('WOW Surprises - Packages Report', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.text(`Generated on: ${date}`, 14, 30);
        doc.text(`Total Packages: ${filteredPackages.length}`, 14, 36);

        const tableColumns = ["Package Name", "Category", "Merchant", "Price (NGN)", "Status", "Bookings"];
        const tableRows = [];

        filteredPackages.forEach(pkg => {
            const packageData = [
                pkg.title || 'N/A',
                (pkg.category || 'General').toUpperCase(),
                pkg.merchantName || 'System Admin',
                pkg.price ? pkg.price.toLocaleString('en-NG') : '0',
                (pkg.status || 'inactive').toUpperCase(),
                pkg.bookingCount || 0
            ];
            tableRows.push(packageData);
        });

        doc.autoTable({
            head: [tableColumns],
            body: tableRows,
            startY: 45, 
            theme: 'grid',
            styles: { 
                fontSize: 9, 
                cellPadding: 3,
                font: 'helvetica'
            },
            headStyles: { 
                fillColor: [0, 0, 0], 
                textColor: [255, 255, 255], 
                fontStyle: 'bold' 
            },
            alternateRowStyles: { 
                fillColor: [248, 250, 252] 
            },
            columnStyles: {
                3: { halign: 'right' }, 
                4: { halign: 'center' }, 
                5: { halign: 'center' }  
            }
        });

        doc.save(`WOW_Packages_Report_${new Date().getTime()}.pdf`);

        if (typeof showToast === 'function') showToast('PDF Exported Successfully!', 'success');

    } catch (error) {
        console.error('❌ Export Error:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to generate PDF. Check console for details.', 'error');
        } else {
            alert('Failed to generate PDF. Error: ' + error.message);
        }
    }
}