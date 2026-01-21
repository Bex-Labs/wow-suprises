/**
 * Merchant Services JavaScript
 * Fixed: Variable names and Database Column mapping
 */

let currentMerchant = null;
let allServices = [];
let editingServiceId = null;

// Initialize services page
async function initServices() {
    try {
        currentMerchant = await MerchantAuth.getCurrentMerchant();
        if (!currentMerchant) {
            window.location.href = 'merchant-login.html';
            return;
        }

        updateMerchantInfo();
        await loadServices();
        setupEventListeners();
    } catch (err) {
        console.error('Init error:', err);
        showToast('Failed to load services', 'error');
    }
}

// Update merchant info in header
function updateMerchantInfo() {
    // FIX: Match IDs in merchant-services.html
    const nameEl = document.getElementById('merchantDisplayName'); // Changed from merchantName
    
    // FIX: Use snake_case business_name
    if (nameEl) nameEl.textContent = currentMerchant.business_name || 'Merchant';
}

// Load all services
async function loadServices() {
    try {
        showLoadingState();
        
        // FIX: Use merchantSupabase
        const { data, error } = await merchantSupabase
            .from('merchant_services')
            .select('*')
            .eq('merchant_id', currentMerchant.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        allServices = data || [];
        renderServices();
        updateStats();
        hideLoadingState();
    } catch (err) {
        console.error('Load services error:', err);
        showToast('Failed to load services', 'error');
        hideLoadingState();
    }
}

// Render services grid
function renderServices() {
    const container = document.getElementById('servicesGrid');
    const emptyState = document.getElementById('emptyState');

    if (!container) return;

    if (!allServices.length) {
        container.innerHTML = '';
        if(emptyState) emptyState.style.display = 'block'; // Changed to block/flex handling
        return;
    }

    if(emptyState) emptyState.style.display = 'none';
    
    container.innerHTML = allServices.map(service => `
        <div class="service-card ${!service.is_active ? 'inactive' : ''}" style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 20px; position: relative;">
            <div class="service-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <span class="service-status" style="padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: ${service.is_active ? '#dcfce7' : '#f3f4f6'}; color: ${service.is_active ? '#166534' : '#6b7280'};">
                    ${service.is_active ? 'Active' : 'Inactive'}
                </span>
                <div class="service-actions" style="display: flex; gap: 8px;">
                    <button onclick="editService('${service.id}')" title="Edit" style="background: none; border: none; cursor: pointer; color: #666; font-size: 16px;">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button onclick="toggleServiceStatus('${service.id}')" title="Toggle Status" style="background: none; border: none; cursor: pointer; color: #666; font-size: 16px;">
                        <i class="bi bi-${service.is_active ? 'pause' : 'play'}-circle"></i>
                    </button>
                    <button onclick="deleteService('${service.id}')" title="Delete" style="background: none; border: none; cursor: pointer; color: #ef4444; font-size: 16px;">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            
            <h3 class="service-title" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">${escapeHtml(service.service_name)}</h3>
            <p class="service-description" style="color: #666; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${escapeHtml(service.description || '')}
            </p>
            
            <div class="service-details" style="display: flex; gap: 16px; font-size: 13px; color: #444; margin-bottom: 16px;">
                <div class="detail-item" style="display: flex; align-items: center; gap: 6px;">
                    <i class="bi bi-tag" style="color: #999;"></i>
                    <span style="font-weight: 600;">₦${formatCurrency(service.base_price)}</span>
                </div>
                <div class="detail-item" style="display: flex; align-items: center; gap: 6px;">
                    <i class="bi bi-clock" style="color: #999;"></i>
                    <span>${service.delivery_time || 'N/A'}</span>
                </div>
            </div>

            ${renderFeatures(service.features)}
        </div>
    `).join('');
}

// Helper to safely render features
function renderFeatures(featuresData) {
    if (!featuresData) return '';
    
    let features = [];
    try {
        features = typeof featuresData === 'string' ? JSON.parse(featuresData) : featuresData;
    } catch (e) {
        return '';
    }

    if (!Array.isArray(features) || features.length === 0) return '';

    return `
        <div class="service-features" style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${features.slice(0, 3).map(f => `
                <span class="feature-tag" style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 4px 8px; border-radius: 6px; font-size: 11px; color: #374151;">
                    ${escapeHtml(f)}
                </span>
            `).join('')}
            ${features.length > 3 ? `<span style="font-size: 11px; color: #999;">+${features.length - 3} more</span>` : ''}
        </div>
    `;
}

// Update statistics
function updateStats() {
    const totalEl = document.getElementById('totalServices');
    const activeEl = document.getElementById('activeServices');
    const avgEl = document.getElementById('avgPrice');

    if (totalEl) totalEl.textContent = allServices.length;
    if (activeEl) activeEl.textContent = allServices.filter(s => s.is_active).length;
    
    if (avgEl && allServices.length > 0) {
        const total = allServices.reduce((sum, s) => sum + (parseFloat(s.base_price) || 0), 0);
        avgEl.textContent = '₦' + formatCurrency(total / allServices.length);
    }
}

// Setup event listeners
function setupEventListeners() {
    const form = document.getElementById('serviceForm');
    const modal = document.getElementById('serviceModal');
    
    // Add feature tag
    document.getElementById('featureInput')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addFeatureTag();
        }
    });
    
    // Explicit close button in header (if exists) or generic close triggers
    document.querySelectorAll('.close-modal, .btn-close').forEach(btn => {
        btn.addEventListener('click', closeServiceModal);
    });

    form?.addEventListener('submit', handleSubmit);
}

// Open add service modal
// Make sure this is globally available for the HTML button
window.openAddServiceModal = function() {
    editingServiceId = null;
    document.getElementById('modalTitle').textContent = 'Add New Service';
    document.getElementById('serviceForm').reset();
    document.getElementById('featuresList').innerHTML = `
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <input type="text" id="featureInput" placeholder="Add feature (e.g. Free Delivery)" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
            <button type="button" onclick="addFeatureTag()" style="padding: 8px 16px; background: #eee; border: none; border-radius: 6px; cursor: pointer;">Add</button>
        </div>
        <div id="activeFeatures" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
    `;
    document.getElementById('serviceModal').style.display = 'flex';
}

// Edit service
window.editService = async function(serviceId) {
    try {
        const service = allServices.find(s => s.id === serviceId);
        if (!service) return;

        editingServiceId = serviceId;
        document.getElementById('modalTitle').textContent = 'Edit Service';
        
        // FIX: Mapping DB columns to Form IDs
        document.getElementById('serviceName').value = service.service_name; // DB: service_name
        document.getElementById('serviceDescription').value = service.description || '';
        document.getElementById('servicePrice').value = service.base_price; // DB: base_price
        document.getElementById('serviceDeliveryTime').value = service.delivery_time || '';
        document.getElementById('serviceCategory').value = service.service_category || ''; // DB: service_category
        document.getElementById('serviceActive').checked = service.is_active;

        // Setup Features Interface
        const featuresContainer = document.getElementById('featuresList');
        featuresContainer.innerHTML = `
             <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="text" id="featureInput" placeholder="Add feature (e.g. Free Delivery)" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
                <button type="button" onclick="addFeatureTag()" style="padding: 8px 16px; background: #eee; border: none; border-radius: 6px; cursor: pointer;">Add</button>
            </div>
            <div id="activeFeatures" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
        `;

        if (service.features) {
            let features = typeof service.features === 'string' ? JSON.parse(service.features) : service.features;
            features.forEach(feature => addFeatureTag(feature));
        }

        document.getElementById('serviceModal').style.display = 'flex';
    } catch (err) {
        console.error('Edit service error:', err);
        showToast('Failed to load service details', 'error');
    }
}

// Add feature tag logic
window.addFeatureTag = function(predefinedValue = null) {
    const input = document.getElementById('featureInput');
    const value = predefinedValue || input.value.trim();
    
    if (!value) return;

    const container = document.getElementById('activeFeatures');
    const tag = document.createElement('div');
    tag.className = 'feature-tag-item';
    tag.style.cssText = 'background: #f0f0f0; padding: 4px 10px; border-radius: 20px; font-size: 13px; display: flex; align-items: center; gap: 6px;';
    tag.innerHTML = `
        ${escapeHtml(value)}
        <i class="bi bi-x" style="cursor: pointer;" onclick="this.parentElement.remove()"></i>
    `;
    container.appendChild(tag);
    
    if (!predefinedValue && input) input.value = '';
}

// Handle form submit
async function handleSubmit(e) {
    e.preventDefault();

    try {
        // Collect Features
        const featureTags = document.querySelectorAll('#activeFeatures .feature-tag-item');
        const features = Array.from(featureTags).map(tag => tag.textContent.trim());

        // FIX: Construct object using DB Column Names
        const formData = {
            merchant_id: currentMerchant.id,
            service_name: document.getElementById('serviceName').value.trim(), // DB: service_name
            description: document.getElementById('serviceDescription').value.trim(),
            base_price: parseFloat(document.getElementById('servicePrice').value), // DB: base_price
            delivery_time: document.getElementById('serviceDeliveryTime').value.trim(),
            service_category: document.getElementById('serviceCategory').value.trim(), // DB: service_category
            is_active: document.getElementById('serviceActive').checked,
            features: JSON.stringify(features)
        };

        let result;
        if (editingServiceId) {
            result = await merchantSupabase
                .from('merchant_services')
                .update(formData)
                .eq('id', editingServiceId)
                .select();
        } else {
            result = await merchantSupabase
                .from('merchant_services')
                .insert([formData])
                .select();
        }

        if (result.error) throw result.error;

        showToast(
            editingServiceId ? 'Service updated successfully!' : 'Service created successfully!',
            'success'
        );
        
        closeServiceModal();
        await loadServices();
    } catch (err) {
        console.error('Save service error:', err);
        showToast('Failed to save service: ' + err.message, 'error');
    }
}

// Toggle service status
window.toggleServiceStatus = async function(serviceId) {
    try {
        const service = allServices.find(s => s.id === serviceId);
        if (!service) return;

        const { error } = await merchantSupabase
            .from('merchant_services')
            .update({ is_active: !service.is_active })
            .eq('id', serviceId);

        if (error) throw error;

        showToast(
            `Service ${!service.is_active ? 'activated' : 'deactivated'} successfully!`,
            'success'
        );
        
        await loadServices();
    } catch (err) {
        console.error('Toggle status error:', err);
        showToast('Failed to update service status', 'error');
    }
}

// Delete service
window.deleteService = async function(serviceId) {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
        return;
    }

    try {
        const { error } = await merchantSupabase
            .from('merchant_services')
            .delete()
            .eq('id', serviceId);

        if (error) throw error;

        showToast('Service deleted successfully!', 'success');
        await loadServices();
    } catch (err) {
        console.error('Delete service error:', err);
        showToast('Failed to delete service', 'error');
    }
}

// Close modal
window.closeServiceModal = function() {
    document.getElementById('serviceModal').style.display = 'none';
    editingServiceId = null;
}

// Loading States
function showLoadingState() {
    const grid = document.getElementById('servicesGrid');
    if(grid) grid.style.opacity = '0.5';
}

function hideLoadingState() {
    const grid = document.getElementById('servicesGrid');
    if(grid) grid.style.opacity = '1';
}

// Utility functions
function formatCurrency(amount) {
    if(isNaN(amount)) return '0';
    return new Intl.NumberFormat('en-NG').format(amount);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    // Basic alert fall back if toastContainer is missing, 
    // or you can implement a custom toast append here
    alert(message);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initServices);