/**
 * Admin Packages Management JavaScript - FIXED VERSION
 * Full CRUD operations for managing surprise packages
 * Fetches from database properly
 */

let allPackages = [];
let filteredPackages = [];
let currentPackage = null;
let isEditMode = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Packages page initializing...');
    
    // Protect admin route
    const isAuth = await protectAdminRoute();
    if (!isAuth) {
        console.log('❌ Not authenticated');
        return;
    }
    
    console.log('✅ Admin authenticated');
    
    // Load admin name
    await loadAdminName();
    
    // Load all packages
    await loadAllPackages();
    
    console.log('✅ Packages page initialized');
});

// ========================================
// FUNCTION 1: Load Admin Name
// ========================================
async function loadAdminName() {
    try {
        const sb = getSupabaseAdmin();
        const { data: { user }, error } = await sb.auth.getUser();
        
        if (!error && user) {
            const { data: profile } = await sb
                .from('profiles')
                .select('full_name, name')
                .eq('id', user.id)
                .single();
            
            if (profile) {
                const nameEl = document.getElementById('adminName');
                if (nameEl) {
                    nameEl.textContent = profile.full_name || profile.name || 'Admin';
                }
                console.log('✅ Admin name loaded:', profile.full_name || profile.name);
            }
        }
    } catch (error) {
        console.log('⚠️ Could not load admin name:', error.message);
    }
}

// ========================================
// FUNCTION 2: Load All Packages
// ========================================
async function loadAllPackages() {
    try {
        console.log('📦 Loading packages from database...');
        const sb = getSupabaseAdmin();
        
        // Show loading in grid
        const grid = document.getElementById('packagesGrid');
        if (grid) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="bi bi-arrow-repeat spin" style="font-size: 32px; color: #667eea;"></i><p style="margin-top: 12px;">Loading packages...</p></div>';
        }
        
        // Fetch all packages
        const { data: packages, error } = await sb
            .from('packages')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
        
        allPackages = packages || [];
        filteredPackages = [...allPackages];
        
        console.log(`✅ Loaded ${allPackages.length} packages`, packages);
        
        // Load booking counts for packages
        await loadBookingCounts();
        
        // Update UI
        updateStats();
        displayPackages(filteredPackages);
        
    } catch (error) {
        console.error('❌ Error loading packages:', error);
        showToast('Failed to load packages: ' + error.message, 'error');
        
        // Show empty state
        const grid = document.getElementById('packagesGrid');
        const emptyState = document.getElementById('emptyState');
        if (grid) grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
    }
}

// ========================================
// FUNCTION 3: Load Booking Counts
// ========================================
async function loadBookingCounts() {
    try {
        console.log('📊 Loading booking counts...');
        const sb = getSupabaseAdmin();
        
        const { data: bookings, error } = await sb
            .from('bookings')
            .select('package_name');
        
        if (error) {
            console.error('❌ Error loading bookings:', error);
            return;
        }
        
        // Count bookings per package
        const counts = {};
        if (bookings) {
            bookings.forEach(booking => {
                const pkgName = booking.package_name;
                counts[pkgName] = (counts[pkgName] || 0) + 1;
            });
        }
        
        // Add booking count to each package
        allPackages.forEach(pkg => {
            pkg.bookingCount = counts[pkg.title] || 0;
        });
        
        console.log('✅ Booking counts loaded');
        
    } catch (error) {
        console.error('❌ Error loading booking counts:', error);
    }
}

// ========================================
// FUNCTION 4: Update Statistics
// ========================================
function updateStats() {
    console.log('📈 Updating statistics...');
    
    const stats = {
        total: allPackages.length,
        active: allPackages.filter(p => p.status === 'active').length,
        avgPrice: allPackages.length > 0 ? 
            allPackages.reduce((sum, p) => sum + parseFloat(p.price || 0), 0) / allPackages.length : 0
    };
    
    // Find most popular package
    const popularPackage = allPackages.reduce((max, pkg) => 
        (pkg.bookingCount || 0) > (max.bookingCount || 0) ? pkg : max, 
        allPackages[0] || {});
    
    // Update DOM
    const totalEl = document.getElementById('totalPackagesCount');
    const activeEl = document.getElementById('activePackagesCount');
    const popularEl = document.getElementById('popularPackageCount');
    const avgPriceEl = document.getElementById('avgPriceValue');
    const totalCountEl = document.getElementById('totalCount');
    
    if (totalEl) totalEl.textContent = stats.total;
    if (activeEl) activeEl.textContent = stats.active;
    if (popularEl) popularEl.textContent = popularPackage.bookingCount || 0;
    if (avgPriceEl) avgPriceEl.textContent = formatCurrency(stats.avgPrice);
    if (totalCountEl) totalCountEl.textContent = `${stats.total} packages`;
    
    console.log('✅ Statistics updated:', stats);
}

// ========================================
// FUNCTION 5: Display Packages
// ========================================
function displayPackages(packages) {
    console.log(`🖼️ Displaying ${packages.length} packages...`);
    
    const grid = document.getElementById('packagesGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!grid) {
        console.error('❌ Packages grid element not found');
        return;
    }
    
    if (packages.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        console.log('ℹ️ No packages to display');
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    grid.innerHTML = packages.map(pkg => `
        <div class="package-card-admin">
            <div class="package-image-admin" style="background-image: url('${pkg.image_url || 'images/placeholder.jpg'}')">
                <div class="package-status-badge ${pkg.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${pkg.status === 'active' ? 'Active' : 'Inactive'}
                </div>
            </div>
            <div class="package-content-admin">
                <div class="package-header-admin">
                    <h3>${pkg.title}</h3>
                    <span class="package-category-badge">${pkg.category || 'General'}</span>
                </div>
                <p class="package-description-admin">${truncateText(pkg.description || '', 80)}</p>
                <div class="package-meta-admin">
                    <div class="package-price-admin">
                        <strong>${formatCurrency(parseFloat(pkg.price || 0))}</strong>
                    </div>
                    <div class="package-bookings-admin">
                        <i class="bi bi-calendar-check"></i>
                        <span>${pkg.bookingCount || 0} bookings</span>
                    </div>
                </div>
                <div class="package-actions-admin">
                    <button class="btn-icon" onclick="viewPackage('${pkg.id}')" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="editPackage('${pkg.id}')" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-icon ${pkg.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                            onclick="togglePackageStatus('${pkg.id}')" 
                            title="${pkg.status === 'active' ? 'Deactivate' : 'Activate'}">
                        <i class="bi bi-${pkg.status === 'active' ? 'pause-circle' : 'play-circle'}"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="confirmDeletePackage('${pkg.id}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    console.log('✅ Packages displayed');
}

// ========================================
// FUNCTION 6: Open Create Package Modal
// ========================================
function openCreatePackageModal() {
    console.log('➕ Opening create package modal...');
    
    isEditMode = false;
    currentPackage = null;
    
    const titleEl = document.getElementById('packageModalTitle');
    const formEl = document.getElementById('packageForm');
    const modalEl = document.getElementById('packageModal');
    
    if (titleEl) titleEl.innerHTML = '<i class="bi bi-plus-circle"></i> Create Package';
    if (formEl) formEl.reset();
    if (modalEl) modalEl.style.display = 'block';
    
    console.log('✅ Create modal opened');
}

// ========================================
// FUNCTION 7: Edit Package
// ========================================
function editPackage(packageId) {
    console.log('✏️ Editing package:', packageId);
    
    const pkg = allPackages.find(p => p.id === packageId);
    if (!pkg) {
        console.error('❌ Package not found:', packageId);
        showToast('Package not found', 'error');
        return;
    }
    
    isEditMode = true;
    currentPackage = pkg;
    
    const titleEl = document.getElementById('packageModalTitle');
    if (titleEl) titleEl.innerHTML = '<i class="bi bi-pencil"></i> Edit Package';
    
    const form = document.getElementById('packageForm');
    if (form) {
        const titleInput = form.querySelector('[name="title"]');
        const categoryInput = form.querySelector('[name="category"]');
        const priceInput = form.querySelector('[name="price"]');
        const statusInput = form.querySelector('[name="status"]');
        const imageInput = form.querySelector('[name="image_url"]');
        const descInput = form.querySelector('[name="description"]');
        const fullDescInput = form.querySelector('[name="full_description"]');
        const featuresInput = form.querySelector('[name="features"]');
        
        if (titleInput) titleInput.value = pkg.title || '';
        if (categoryInput) categoryInput.value = pkg.category || '';
        if (priceInput) priceInput.value = pkg.price || '';
        if (statusInput) statusInput.value = pkg.status || 'active';
        if (imageInput) imageInput.value = pkg.image_url || '';
        if (descInput) descInput.value = pkg.description || '';
        if (fullDescInput) fullDescInput.value = pkg.full_description || '';
        
        // Handle features - convert array to lines
        if (featuresInput) {
            const features = pkg.features || [];
            const featuresText = Array.isArray(features) ? features.join('\n') : 
                                (typeof features === 'string' ? features : '');
            featuresInput.value = featuresText;
        }
    }
    
    const modalEl = document.getElementById('packageModal');
    if (modalEl) modalEl.style.display = 'block';
    
    console.log('✅ Edit modal opened for:', pkg.title);
}

// ========================================
// FUNCTION 8: Save Package (Create/Update)
// ========================================
async function savePackage(event) {
    event.preventDefault();
    console.log('💾 Saving package...');
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Parse features from textarea
    const featuresText = formData.get('features');
    const features = featuresText ? 
        featuresText.split('\n').filter(f => f.trim()).map(f => f.trim()) : [];
    
    const packageData = {
        title: formData.get('title'),
        category: formData.get('category'),
        price: parseFloat(formData.get('price')),
        status: formData.get('status'),
        image_url: formData.get('image_url') || null,
        description: formData.get('description'),
        full_description: formData.get('full_description') || null,
        features: features,
        updated_at: new Date().toISOString()
    };
    
    console.log('📦 Package data:', packageData);
    
    try {
        const sb = getSupabaseAdmin();
        
        if (isEditMode && currentPackage) {
            // Update existing package
            console.log('📝 Updating package:', currentPackage.id);
            
            const { data, error } = await sb
                .from('packages')
                .update(packageData)
                .eq('id', currentPackage.id)
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ Package updated:', data);
            showToast('Package updated successfully', 'success');
            
        } else {
            // Create new package
            console.log('➕ Creating new package');
            packageData.created_at = new Date().toISOString();
            
            const { data, error } = await sb
                .from('packages')
                .insert([packageData])
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ Package created:', data);
            showToast('Package created successfully', 'success');
        }
        
        closePackageModal();
        await loadAllPackages();
        
    } catch (error) {
        console.error('❌ Error saving package:', error);
        showToast('Failed to save package: ' + error.message, 'error');
    }
}

// ========================================
// FUNCTION 9: View Package Details
// ========================================
async function viewPackage(packageId) {
    console.log('👁️ Viewing package:', packageId);
    
    try {
        const pkg = allPackages.find(p => p.id === packageId);
        if (!pkg) {
            console.error('❌ Package not found:', packageId);
            showToast('Package not found', 'error');
            return;
        }
        
        const modal = document.getElementById('viewModal');
        const modalBody = document.getElementById('viewModalBody');
        
        if (!modalBody) {
            console.error('❌ Modal body element not found');
            return;
        }
        
        const features = pkg.features || [];
        const featuresList = Array.isArray(features) ? features : 
                            (typeof features === 'string' ? features.split('\n') : []);
        
        modalBody.innerHTML = `
            <div class="package-details-view">
                <div class="package-image-large" style="background-image: url('${pkg.image_url || 'images/placeholder.jpg'}')">
                    <div class="package-status-overlay ${pkg.status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${pkg.status === 'active' ? 'Active' : 'Inactive'}
                    </div>
                </div>
                
                <div class="details-grid">
                    <div class="detail-section">
                        <h3><i class="bi bi-info-circle"></i> Package Information</h3>
                        <div class="detail-row">
                            <span class="label">Name:</span>
                            <span class="value"><strong>${pkg.title}</strong></span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Category:</span>
                            <span class="value">${pkg.category || 'General'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Price:</span>
                            <span class="value"><strong>${formatCurrency(parseFloat(pkg.price || 0))}</strong></span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Status:</span>
                            <span class="value">${pkg.status === 'active' ? '✅ Active' : '⏸ Inactive'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3><i class="bi bi-graph-up"></i> Statistics</h3>
                        <div class="detail-row">
                            <span class="label">Total Bookings:</span>
                            <span class="value"><strong>${pkg.bookingCount || 0}</strong></span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Created:</span>
                            <span class="value">${formatDate(pkg.created_at, true)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Last Updated:</span>
                            <span class="value">${formatDate(pkg.updated_at, true)}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section full-width">
                        <h3><i class="bi bi-file-text"></i> Description</h3>
                        <p>${pkg.description || 'No description'}</p>
                        ${pkg.full_description ? `
                            <h4>Full Description:</h4>
                            <p>${pkg.full_description}</p>
                        ` : ''}
                    </div>
                    
                    ${featuresList.length > 0 ? `
                        <div class="detail-section full-width">
                            <h3><i class="bi bi-check-circle"></i> What's Included</h3>
                            <ul class="features-list">
                                ${featuresList.map(f => `<li>${f}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                
                <div class="modal-actions">
                    <button class="btn-primary" onclick="editPackage('${pkg.id}'); closeViewModal();">
                        <i class="bi bi-pencil"></i> Edit Package
                    </button>
                    <button class="btn-secondary" onclick="closeViewModal()">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        if (modal) modal.style.display = 'block';
        
        console.log('✅ View modal opened for:', pkg.title);
        
    } catch (error) {
        console.error('❌ Error viewing package:', error);
        showToast('Failed to load package details', 'error');
    }
}

// ========================================
// FUNCTION 10: Confirm Delete Package
// ========================================
function confirmDeletePackage(packageId) {
    console.log('🗑️ Confirming delete for package:', packageId);
    
    const pkg = allPackages.find(p => p.id === packageId);
    if (!pkg) {
        console.error('❌ Package not found:', packageId);
        return;
    }
    
    if (confirm(`Are you sure you want to delete "${pkg.title}"?\n\nThis action cannot be undone.`)) {
        console.log('✅ Delete confirmed');
        deletePackage(packageId);
    } else {
        console.log('❌ Delete cancelled');
    }
}

// ========================================
// FUNCTION 11: Delete Package
// ========================================
async function deletePackage(packageId) {
    console.log('🗑️ Deleting package:', packageId);
    
    try {
        const sb = getSupabaseAdmin();
        
        const { error } = await sb
            .from('packages')
            .delete()
            .eq('id', packageId);
        
        if (error) throw error;
        
        console.log('✅ Package deleted successfully');
        showToast('Package deleted successfully', 'success');
        
        // Reload packages
        await loadAllPackages();
        
    } catch (error) {
        console.error('❌ Error deleting package:', error);
        showToast('Failed to delete package: ' + error.message, 'error');
    }
}

// ========================================
// FUNCTION 12: Toggle Package Status
// ========================================
async function togglePackageStatus(packageId) {
    console.log('🔄 Toggling status for package:', packageId);
    
    const pkg = allPackages.find(p => p.id === packageId);
    if (!pkg) {
        console.error('❌ Package not found:', packageId);
        return;
    }
    
    const newStatus = pkg.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'inactive' ? 'deactivate' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} "${pkg.title}"?`)) {
        console.log('❌ Status toggle cancelled');
        return;
    }
    
    try {
        const sb = getSupabaseAdmin();
        
        const { data, error } = await sb
            .from('packages')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', packageId)
            .select()
            .single();
        
        if (error) throw error;
        
        console.log(`✅ Package ${action}d:`, data);
        showToast(`Package ${action}d successfully`, 'success');
        
        // Reload packages
        await loadAllPackages();
        
    } catch (error) {
        console.error('❌ Error updating package status:', error);
        showToast('Failed to update package status: ' + error.message, 'error');
    }
}

// ========================================
// FUNCTION 13: Search Packages
// ========================================
function searchPackages() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        console.error('❌ Search input not found');
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase();
    console.log('🔍 Searching packages:', searchTerm);
    
    if (!searchTerm) {
        filteredPackages = [...allPackages];
        console.log('ℹ️ Search cleared, showing all packages');
    } else {
        filteredPackages = allPackages.filter(pkg => {
            return (
                (pkg.title || '').toLowerCase().includes(searchTerm) ||
                (pkg.description || '').toLowerCase().includes(searchTerm) ||
                (pkg.category || '').toLowerCase().includes(searchTerm)
            );
        });
        console.log(`✅ Found ${filteredPackages.length} matching packages`);
    }
    
    displayPackages(filteredPackages);
}

// ========================================
// FUNCTION 14: Filter Packages
// ========================================
function filterPackages() {
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    if (!categoryFilter || !statusFilter) {
        console.error('❌ Filter elements not found');
        return;
    }
    
    const category = categoryFilter.value;
    const status = statusFilter.value;
    
    console.log('🔍 Filtering packages - Category:', category, 'Status:', status);
    
    filteredPackages = allPackages.filter(pkg => {
        const matchesCategory = !category || pkg.category === category;
        const matchesStatus = !status || pkg.status === status;
        
        return matchesCategory && matchesStatus;
    });
    
    console.log(`✅ Filtered to ${filteredPackages.length} packages`);
    displayPackages(filteredPackages);
}

// ========================================
// FUNCTION 15: Sort Packages
// ========================================
function sortPackages() {
    const sortOrderEl = document.getElementById('sortOrder');
    if (!sortOrderEl) {
        console.error('❌ Sort order element not found');
        return;
    }
    
    const sortOrder = sortOrderEl.value;
    console.log('🔄 Sorting packages by:', sortOrder);
    
    filteredPackages.sort((a, b) => {
        switch(sortOrder) {
            case 'newest':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'oldest':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'name':
                return (a.title || '').localeCompare(b.title || '');
            case 'price-high':
                return parseFloat(b.price || 0) - parseFloat(a.price || 0);
            case 'price-low':
                return parseFloat(a.price || 0) - parseFloat(b.price || 0);
            case 'popular':
                return (b.bookingCount || 0) - (a.bookingCount || 0);
            default:
                return 0;
        }
    });
    
    console.log('✅ Packages sorted');
    displayPackages(filteredPackages);
}

// ========================================
// FUNCTION 16: Clear Filters
// ========================================
function clearFilters() {
    console.log('🧹 Clearing all filters...');
    
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const sortOrder = document.getElementById('sortOrder');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (sortOrder) sortOrder.value = 'newest';
    
    filteredPackages = [...allPackages];
    displayPackages(filteredPackages);
    
    console.log('✅ Filters cleared');
    showToast('Filters cleared', 'info');
}

// ========================================
// FUNCTION 17: Refresh Packages
// ========================================
async function refreshPackages() {
    console.log('🔄 Refreshing packages...');
    
    const btn = event.target.closest('button');
    if (btn) {
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Refreshing...';
        
        await loadAllPackages();
        
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    } else {
        await loadAllPackages();
    }
    
    console.log('✅ Packages refreshed');
    showToast('Packages refreshed', 'success');
}

// ========================================
// FUNCTION 18: Export Packages to PDF
// ========================================
function exportPackages() {
    console.log('📄 Exporting packages to PDF...');
    
    try {
        if (filteredPackages.length === 0) {
            console.log('❌ No packages to export');
            showToast('No packages to export', 'warning');
            return;
        }
        
        showToast('Generating PDF...', 'info');
        
        // Check if jsPDF is available
        if (!window.jspdf) {
            console.error('❌ jsPDF library not loaded');
            showToast('PDF library not loaded', 'error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('WOW Surprises - Packages Report', 14, 20);
        
        // Add date
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Total Packages: ${filteredPackages.length}`, 14, 34);
        
        // Prepare table data
        const tableData = filteredPackages.map(pkg => [
            pkg.title || 'N/A',
            pkg.category || 'General',
            formatCurrency(parseFloat(pkg.price || 0)),
            pkg.status || 'active',
            pkg.bookingCount || 0,
            formatDate(pkg.created_at)
        ]);
        
        // Add table
        doc.autoTable({
            startY: 40,
            head: [['Name', 'Category', 'Price', 'Status', 'Bookings', 'Created']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [102, 126, 234] },
            styles: { fontSize: 9 },
            columnStyles: {
                2: { halign: 'right' }
            }
        });
        
        // Save PDF
        const filename = `WOW-Packages-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        
        console.log('✅ PDF exported:', filename);
        showToast('PDF exported successfully', 'success');
        
    } catch (error) {
        console.error('❌ Export error:', error);
        showToast('Failed to export packages: ' + error.message, 'error');
    }
}

// ========================================
// MODAL FUNCTIONS
// ========================================
function closePackageModal() {
    console.log('❌ Closing package modal');
    const modal = document.getElementById('packageModal');
    if (modal) modal.style.display = 'none';
    currentPackage = null;
    isEditMode = false;
}

function closeViewModal() {
    console.log('❌ Closing view modal');
    const modal = document.getElementById('viewModal');
    if (modal) modal.style.display = 'none';
}

// Close modal on outside click
window.onclick = function(event) {
    const packageModal = document.getElementById('packageModal');
    const viewModal = document.getElementById('viewModal');
    
    if (event.target === packageModal) {
        closePackageModal();
    }
    if (event.target === viewModal) {
        closeViewModal();
    }
}

// ========================================
// ADMIN LOGOUT
// ========================================
async function adminLogout() {
    if (!confirm('Are you sure you want to logout?')) {
        console.log('❌ Logout cancelled');
        return;
    }
    
    console.log('👋 Logging out...');
    
    try {
        const sb = getSupabaseAdmin();
        await sb.auth.signOut();
        
        sessionStorage.clear();
        localStorage.removeItem('currentUser');
        
        console.log('✅ Logged out successfully');
        showToast('Logged out successfully', 'success');
        
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 1000);
    } catch (error) {
        console.error('❌ Logout error:', error);
        window.location.href = 'admin-login.html';
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Truncate text to specified length
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

console.log('✅ Admin Packages JS loaded - All 18 functions ready');