/**
 * Merchant Order Details JavaScript
 * Handles order details display and status updates with visual Pizza Tracker
 */

let currentMerchant = null;
let currentOrder = null;
let orderId = null;
let uploadedPhoto = null;

// Initialize order details page
async function initOrderDetails() {
    try {
        // Get order ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        orderId = urlParams.get('id');
        
        if (!orderId) {
            showToast('Invalid order ID', 'error');
            setTimeout(() => window.location.href = 'merchant-orders.html', 2000);
            return;
        }
        
        // Get current merchant
        currentMerchant = await MerchantAuth.getCurrentMerchant();
        
        if (!currentMerchant) {
            showToast('Session expired. Please login again.', 'error');
            setTimeout(() => window.location.href = 'merchant-login.html', 2000);
            return;
        }
        
        // Update merchant name
        const nameEl = document.getElementById('merchantDisplayName');
        if (nameEl) nameEl.textContent = currentMerchant.business_name;
        
        // Load order details
        await loadOrderDetails();
        
    } catch (error) {
        console.error('Order details initialization error:', error);
        showToast('Failed to load order details', 'error');
    }
}

// Load order details
async function loadOrderDetails() {
    try {
        showLoading();
        
        const { data: order, error } = await MerchantAuth.getSupabase()
            .from('bookings')
            .select('*')
            .eq('id', orderId)
            .eq('merchant_id', currentMerchant.id)
            .single();
        
        if (error) throw error;
        
        if (!order) {
            showToast('Order not found', 'error');
            setTimeout(() => window.location.href = 'merchant-orders.html', 2000);
            return;
        }
        
        currentOrder = order;
        
        // Update page title
        const orderIdDisplay = document.getElementById('orderIdDisplay');
        if (orderIdDisplay) {
            orderIdDisplay.textContent = `Order #${order.id.substring(0, 8).toUpperCase()}`;
        }
        
        // Display components
        displayOrderInfo();
        displayCustomerInfo();
        displayOrderSummary();
        displayStatusActions();
        displaySpecialInstructions();
        
        // Load visual delivery tracking
        renderDeliveryTracker();
        
        hideLoading();
        
    } catch (error) {
        console.error('Load order details error:', error);
        showToast('Failed to load order details', 'error');
        hideLoading();
    }
}

// Display order information
function displayOrderInfo() {
    const orderInfo = document.getElementById('orderInfo');
    if (!orderInfo || !currentOrder) return;
    
    const orderDate = new Date(currentOrder.surprise_date);
    const createdDate = new Date(currentOrder.created_at);
    
    orderInfo.innerHTML = `
        <div>
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Order Date</div>
            <div style="font-weight: 600; color: #0f172a;">${formatDate(orderDate, 'long')}</div>
        </div>
        
        <div>
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Time</div>
            <div style="font-weight: 600; color: #0f172a;">${currentOrder.surprise_time || 'Not specified'}</div>
        </div>
        
        <div>
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Location</div>
            <div style="font-weight: 600; color: #0f172a;">${currentOrder.location || 'Not specified'}</div>
        </div>
        
        <div>
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Surprise Type</div>
            <div style="font-weight: 600; color: #0f172a;">${currentOrder.surprise_type || 'General'}</div>
        </div>
        
        <div>
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Created</div>
            <div style="font-weight: 600; color: #0f172a;">${formatDate(createdDate, 'short')}</div>
        </div>
        
        <div>
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Status</div>
            <div>
                <span style="padding: 4px 10px; background: ${getStatusColor(currentOrder.status)}15; color: ${getStatusColor(currentOrder.status)}; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                    ${currentOrder.status}
                </span>
            </div>
        </div>
    `;
}

// Display customer information
function displayCustomerInfo() {
    const customerInfo = document.getElementById('customerInfo');
    if (!customerInfo || !currentOrder) return;
    
    customerInfo.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Recipient Name</div>
            <div style="font-weight: 600; color: #0f172a; font-size: 16px;">${currentOrder.recipient_name}</div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Phone Number</div>
            <div style="font-weight: 600; color: #0f172a;">
                <a href="tel:${currentOrder.recipient_phone}" style="color: #0f172a; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="bi bi-telephone"></i> ${currentOrder.recipient_phone}
                </a>
            </div>
        </div>
        
        ${currentOrder.recipient_email ? `
            <div style="margin-bottom: 8px;">
                <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Email</div>
                <div style="font-weight: 600; color: #0f172a; word-break: break-all;">
                    <a href="mailto:${currentOrder.recipient_email}" style="color: #0f172a; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="bi bi-envelope"></i> ${currentOrder.recipient_email}
                    </a>
                </div>
            </div>
        ` : ''}
    `;
}

// Display order summary
function displayOrderSummary() {
    const orderSummary = document.getElementById('orderSummary');
    if (!orderSummary || !currentOrder) return;
    
    const budget = parseFloat(currentOrder.budget || 0);
    const platformFee = budget * 0.10; // 10% platform fee
    const netAmount = budget - platformFee;
    
    orderSummary.innerHTML = `
        <div style="padding: 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">Order Amount</span>
                <span style="font-weight: 600; color: #0f172a;">${formatCurrency(budget, 'NGN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b;">Platform Fee (10%)</span>
                <span style="font-weight: 600; color: #ef4444;">-${formatCurrency(platformFee, 'NGN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; font-size: 14px; color: #0f172a;">Your Earnings</span>
                <span style="font-weight: 700; font-size: 18px; color: #16a34a;">${formatCurrency(netAmount, 'NGN')}</span>
            </div>
        </div>
        
        <div style="font-size: 11px; color: #94a3b8; text-align: center;">
            <i class="bi bi-info-circle"></i> Payment will be released after successful delivery
        </div>
    `;
}

// Display status action buttons
function displayStatusActions() {
    const statusActions = document.getElementById('statusActions');
    const statusButtonsContainer = document.getElementById('statusButtonsContainer');
    if (!statusButtonsContainer || !currentOrder) return;
    
    const status = currentOrder.status;
    const uploadPhotoCard = document.getElementById('uploadPhotoCard');
    
    const statusWorkflow = {
        'pending': [
            { next: 'confirmed', label: 'Accept Order', icon: 'check-circle', color: '#16a34a' },
            { next: 'cancelled', label: 'Decline Order', icon: 'x-circle', color: '#ef4444' }
        ],
        'confirmed': [
            { next: 'in-progress', label: 'Start Delivery', icon: 'truck', color: '#0f172a' }
        ],
        'in-progress': [
            { next: 'completed', label: 'Mark as Delivered', icon: 'check-circle-fill', color: '#16a34a' }
        ]
    };
    
    const availableActions = statusWorkflow[status] || [];
    
    if (availableActions.length === 0) {
        statusActions.style.display = 'none';
    } else {
        statusActions.style.display = 'block';
        statusButtonsContainer.innerHTML = availableActions.map(action => `
            <button 
                onclick="updateOrderStatus('${action.next}')" 
                style="flex: 1; padding: 14px 20px; background: ${action.color}; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity 0.2s;"
                onmouseover="this.style.opacity='0.9'"
                onmouseout="this.style.opacity='1'"
            >
                <i class="bi bi-${action.icon}"></i>
                ${action.label}
            </button>
        `).join('');
    }
    
    // Show upload photo card only for in-progress orders so they can attach proof before marking completed
    if (uploadPhotoCard) {
        uploadPhotoCard.style.display = (status === 'in-progress' || status === 'completed') ? 'block' : 'none';
    }
}

function displaySpecialInstructions() {
    const card = document.getElementById('specialInstructionsCard');
    const instructions = document.getElementById('specialInstructions');
    
    if (currentOrder.special_instructions || currentOrder.special_message) {
        if (card) card.style.display = 'block';
        if (instructions) instructions.textContent = currentOrder.special_instructions || currentOrder.special_message;
    } else {
        if (card) card.style.display = 'none';
    }
}

// Update order status (No tracking table needed!)
async function updateOrderStatus(newStatus) {
    if (!confirm(`Are you sure you want to update the status to "${newStatus}"?`)) {
        return;
    }
    
    try {
        showToast('Updating status...', 'info');
        
        // If marking as completed, check if they uploaded a photo
        const updateData = {
            status: newStatus,
            updated_at: new Date().toISOString()
        };

        // Attach photo to order if uploaded
        if (uploadedPhoto && newStatus === 'completed') {
            updateData.delivery_photo_url = uploadedPhoto; 
        }

        // Update order status in database directly
        const { error: updateError } = await MerchantAuth.getSupabase()
            .from('bookings')
            .update(updateData)
            .eq('id', orderId);
        
        if (updateError) throw updateError;
        
        showToast('Status updated successfully!', 'success');
        
        // Reload order details (this automatically advances the tracker!)
        await loadOrderDetails();
        
    } catch (error) {
        console.error('Update status error:', error);
        showToast('Failed to update status', 'error');
    }
}

// VISUAL PIZZA TRACKER
function renderDeliveryTracker() {
    const timeline = document.getElementById('deliveryTimeline');
    if (!timeline || !currentOrder) return;
    
    const status = currentOrder.status;

    // Handle Cancelled/Declined State
    if (status === 'cancelled' || status === 'rejected') {
        timeline.innerHTML = `
            <div style="text-align: center; padding: 30px 20px; background: #fee2e2; border-radius: 8px;">
                <i class="bi bi-x-circle-fill" style="font-size: 40px; color: #dc2626; margin-bottom: 12px; display: block;"></i>
                <h4 style="margin: 0 0 8px 0; color: #991b1b;">Order Cancelled</h4>
                <p style="margin: 0; font-size: 13px; color: #b91c1c;">This order will not be fulfilled.</p>
            </div>
        `;
        return;
    }

    // Normal Delivery Steps
    const steps = [
        { id: 'pending', label: 'Order Received', icon: 'receipt', color: '#3b82f6' },
        { id: 'confirmed', label: 'Preparing Order', icon: 'box-seam', color: '#f59e0b' },
        { id: 'in-progress', label: 'Out for Delivery', icon: 'truck', color: '#8b5cf6' },
        { id: 'completed', label: 'Delivered', icon: 'check-circle-fill', color: '#16a34a' }
    ];

    // Find current progress
    let currentStepIndex = steps.findIndex(s => s.id === status);
    if (currentStepIndex === -1) currentStepIndex = 0; // Fallback

    let html = `<div style="display: flex; flex-direction: column; gap: 0;">`;

    steps.forEach((step, index) => {
        const isPast = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isFuture = index > currentStepIndex;

        let iconColor = isFuture ? '#cbd5e1' : step.color;
        let bgColor = isFuture ? '#f8fafc' : `${step.color}15`;
        let textColor = isFuture ? '#94a3b8' : '#0f172a';
        let lineBg = isPast ? step.color : '#e2e8f0';

        html += `
            <div style="display: flex; gap: 16px; position: relative; min-height: 70px;">
                ${index < steps.length - 1 ? `
                    <div style="position: absolute; left: 19px; top: 40px; bottom: -10px; width: 2px; background: ${lineBg}; z-index: 0; transition: background 0.3s;"></div>
                ` : ''}

                <div style="width: 40px; height: 40px; background: ${bgColor}; border: 2px solid ${isFuture ? '#e2e8f0' : step.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; z-index: 1; transition: all 0.3s;">
                    <i class="bi bi-${step.icon}" style="font-size: 16px; color: ${iconColor};"></i>
                </div>

                <div style="flex: 1; padding-top: 10px;">
                    <div style="font-weight: ${isCurrent ? '700' : '600'}; color: ${textColor}; font-size: 14px; transition: color 0.3s;">
                        ${step.label}
                    </div>
                    ${isCurrent ? `<div style="color: ${step.color}; font-size: 12px; margin-top: 4px; font-weight: 500;">Current Status</div>` : ''}
                    ${isPast ? `<div style="color: #64748b; font-size: 12px; margin-top: 4px;"><i class="bi bi-check2"></i> Completed</div>` : ''}
                    
                    ${(step.id === 'completed' && currentOrder.delivery_photo_url && isCurrent) ? `
                        <img src="${currentOrder.delivery_photo_url}" style="width: 100%; max-width: 200px; border-radius: 8px; margin-top: 12px; cursor: pointer; border: 1px solid #e2e8f0;" onclick="window.open('${currentOrder.delivery_photo_url}', '_blank')" />
                    ` : ''}
                </div>
            </div>
        `;
    });

    html += `</div>`;
    timeline.innerHTML = html;
}

// Handle photo upload
async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { 
        showToast('Image size should be less than 5MB', 'error');
        return;
    }
    
    try {
        showToast('Uploading photo...', 'info');
        
        const fileName = `delivery_${orderId}_${Date.now()}.${file.name.split('.').pop()}`;
        const { data, error } = await MerchantAuth.getSupabase().storage
            .from('delivery-photos')
            .upload(fileName, file);
        
        if (error) throw error;
        
        const { data: urlData } = MerchantAuth.getSupabase().storage
            .from('delivery-photos')
            .getPublicUrl(fileName);
        
        uploadedPhoto = urlData.publicUrl;
        
        const preview = document.getElementById('photoPreview');
        const previewContainer = document.getElementById('deliveryPhotoPreview');
        if (preview && previewContainer) {
            preview.src = uploadedPhoto;
            previewContainer.style.display = 'block';
        }
        
        showToast('Photo uploaded! Click "Mark as Delivered" to save.', 'success');
        
    } catch (error) {
        console.error('Photo upload error:', error);
        showToast('Failed to upload photo', 'error');
    }
}

// Helper functions
function showLoading() {
    const loading = document.getElementById('orderLoading');
    const content = document.getElementById('orderContent');
    if (loading) loading.style.display = 'block';
    if (content) content.style.display = 'none';
}

function hideLoading() {
    const loading = document.getElementById('orderLoading');
    const content = document.getElementById('orderContent');
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
}

function getStatusColor(status) {
    const colors = {
        'pending': '#f59e0b',
        'confirmed': '#3b82f6',
        'in-progress': '#8b5cf6',
        'completed': '#16a34a',
        'cancelled': '#ef4444'
    };
    return colors[status] || '#64748b';
}

function formatCurrency(amount, currency = 'NGN') {
    if (isNaN(amount)) amount = 0;
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(date, format = 'default') {
    if (!date || !(date instanceof Date) || isNaN(date)) return 'N/A';
    
    if (format === 'short') {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
    
    if (format === 'long') {
        return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
    
    return date.toLocaleDateString();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initOrderDetails();
});