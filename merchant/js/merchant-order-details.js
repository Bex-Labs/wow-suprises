/**
 * Merchant Order Details JavaScript
 * Handles order details display and status updates with delivery tracking
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
        if (nameEl) nameEl.textContent = currentMerchant.businessName;
        
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
        
        const { data: order, error } = await merchantSupabase
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
        
        // Display order information
        displayOrderInfo();
        displayCustomerInfo();
        displayOrderSummary();
        displayStatusActions();
        displaySpecialInstructions();
        
        // Load delivery tracking
        await loadDeliveryTracking();
        
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
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Order Date</div>
            <div style="font-weight: 600; color: #000;">${formatDate(orderDate, 'long')}</div>
        </div>
        
        <div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Time</div>
            <div style="font-weight: 600; color: #000;">${currentOrder.surprise_time || 'Not specified'}</div>
        </div>
        
        <div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Location</div>
            <div style="font-weight: 600; color: #000;">${currentOrder.location || 'Not specified'}</div>
        </div>
        
        <div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Surprise Type</div>
            <div style="font-weight: 600; color: #000;">${currentOrder.surprise_type || 'General'}</div>
        </div>
        
        <div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Created</div>
            <div style="font-weight: 600; color: #000;">${formatDate(createdDate, 'short')}</div>
        </div>
        
        <div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Status</div>
            <div>
                <span style="padding: 6px 12px; background: ${getStatusColor(currentOrder.status)}15; color: ${getStatusColor(currentOrder.status)}; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
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
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Recipient Name</div>
            <div style="font-weight: 600; color: #000; font-size: 16px;">${currentOrder.recipient_name}</div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Phone Number</div>
            <div style="font-weight: 600; color: #000;">
                <a href="tel:${currentOrder.recipient_phone}" style="color: #000; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="bi bi-telephone"></i> ${currentOrder.recipient_phone}
                </a>
            </div>
        </div>
        
        ${currentOrder.recipient_email ? `
            <div style="margin-bottom: 20px;">
                <div style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Email</div>
                <div style="font-weight: 600; color: #000; word-break: break-all;">
                    <a href="mailto:${currentOrder.recipient_email}" style="color: #000; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="bi bi-envelope"></i> ${currentOrder.recipient_email}
                    </a>
                </div>
            </div>
        ` : ''}
        
        <button onclick="window.location.href='merchant-messages.html?order=${currentOrder.id}'" style="width: 100%; padding: 12px; background: #f0f0f0; color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px;">
            <i class="bi bi-chat-dots"></i> Message Customer
        </button>
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
        <div style="padding: 16px; background: #f9f9f9; border-radius: 8px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #666;">Order Amount</span>
                <span style="font-weight: 600;">${formatCurrency(budget, 'NGN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e0e0e0;">
                <span style="color: #666;">Platform Fee (10%)</span>
                <span style="font-weight: 600; color: #ef4444;">-${formatCurrency(platformFee, 'NGN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; font-size: 16px;">Your Earnings</span>
                <span style="font-weight: 700; font-size: 20px; color: #22c55e;">${formatCurrency(netAmount, 'NGN')}</span>
            </div>
        </div>
        
        <div style="font-size: 12px; color: #666; text-align: center;">
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
    
    // Define available status transitions
    const statusWorkflow = {
        'pending': [
            { next: 'confirmed', label: 'Accept Order', icon: 'check-circle', color: '#3b82f6' },
            { next: 'cancelled', label: 'Decline Order', icon: 'x-circle', color: '#ef4444' }
        ],
        'confirmed': [
            { next: 'in-progress', label: 'Start Delivery', icon: 'truck', color: '#8b5cf6' }
        ],
        'in-progress': [
            { next: 'completed', label: 'Mark as Delivered', icon: 'check-circle-fill', color: '#22c55e' }
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
                style="flex: 1; padding: 16px 24px; background: ${action.color}; color: white; border: none; border-radius: 10px; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; min-width: 180px;"
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
            >
                <i class="bi bi-${action.icon}" style="font-size: 20px;"></i>
                ${action.label}
            </button>
        `).join('');
    }
    
    // Show upload photo card for in-progress or completed orders
    if (uploadPhotoCard) {
        uploadPhotoCard.style.display = (status === 'in-progress' || status === 'completed') ? 'block' : 'none';
    }
}

// Display special instructions
function displaySpecialInstructions() {
    const card = document.getElementById('specialInstructionsCard');
    const instructions = document.getElementById('specialInstructions');
    
    if (currentOrder.special_instructions) {
        if (card) card.style.display = 'block';
        if (instructions) instructions.textContent = currentOrder.special_instructions;
    } else {
        if (card) card.style.display = 'none';
    }
}

// Update order status
async function updateOrderStatus(newStatus) {
    if (!confirm(`Are you sure you want to update the status to "${newStatus}"?`)) {
        return;
    }
    
    try {
        showToast('Updating status...', 'info');
        
        // Update order status in database
        const { error: updateError } = await merchantSupabase
            .from('bookings')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
                [`${newStatus}_at`]: new Date().toISOString()
            })
            .eq('id', orderId);
        
        if (updateError) throw updateError;
        
        // Create delivery tracking entry
        const trackingStatus = {
            'confirmed': 'preparing',
            'in-progress': 'out-for-delivery',
            'completed': 'delivered'
        };
        
        if (trackingStatus[newStatus]) {
            const { error: trackingError } = await merchantSupabase
                .from('delivery_tracking')
                .insert([
                    {
                        booking_id: orderId,
                        merchant_id: currentMerchant.id,
                        status: trackingStatus[newStatus],
                        notes: `Status updated to ${newStatus}`,
                        photo_url: uploadedPhoto,
                        created_at: new Date().toISOString()
                    }
                ]);
            
            if (trackingError) {
                console.error('Tracking entry error:', trackingError);
            }
        }
        
        showToast('Status updated successfully!', 'success');
        
        // Reload order details
        await loadOrderDetails();
        
        // TODO: Send email notification to customer
        
    } catch (error) {
        console.error('Update status error:', error);
        showToast('Failed to update status', 'error');
    }
}

// Load delivery tracking timeline
async function loadDeliveryTracking() {
    try {
        const { data: tracking, error } = await merchantSupabase
            .from('delivery_tracking')
            .select('*')
            .eq('booking_id', orderId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const timeline = document.getElementById('deliveryTimeline');
        if (!timeline) return;
        
        if (!tracking || tracking.length === 0) {
            timeline.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #666;">
                    <i class="bi bi-clock-history" style="font-size: 48px; color: #e0e0e0; margin-bottom: 16px; display: block;"></i>
                    <p style="margin: 0;">No tracking updates yet</p>
                </div>
            `;
            return;
        }
        
        const statusIcons = {
            'preparing': 'hourglass-split',
            'out-for-delivery': 'truck',
            'delivered': 'check-circle-fill',
            'failed': 'x-circle'
        };
        
        const statusColors = {
            'preparing': '#f59e0b',
            'out-for-delivery': '#8b5cf6',
            'delivered': '#22c55e',
            'failed': '#ef4444'
        };
        
        timeline.innerHTML = tracking.map((entry, index) => `
            <div style="display: flex; gap: 16px; position: relative; ${index < tracking.length - 1 ? 'padding-bottom: 24px;' : ''}">
                ${index < tracking.length - 1 ? `
                    <div style="position: absolute; left: 19px; top: 48px; bottom: 0; width: 2px; background: #e0e0e0;"></div>
                ` : ''}
                
                <div style="width: 40px; height: 40px; background: ${statusColors[entry.status] || '#6b7280'}15; border: 2px solid ${statusColors[entry.status] || '#6b7280'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; z-index: 1;">
                    <i class="bi bi-${statusIcons[entry.status] || 'circle'}" style="font-size: 18px; color: ${statusColors[entry.status] || '#6b7280'};"></i>
                </div>
                
                <div style="flex: 1; padding-top: 6px;">
                    <div style="font-weight: 700; color: #000; margin-bottom: 4px; text-transform: capitalize;">
                        ${entry.status.replace('-', ' ')}
                    </div>
                    ${entry.notes ? `
                        <div style="color: #666; font-size: 14px; margin-bottom: 8px;">${entry.notes}</div>
                    ` : ''}
                    <div style="color: #999; font-size: 12px;">
                        ${formatDate(new Date(entry.created_at), 'long')} at ${new Date(entry.created_at).toLocaleTimeString()}
                    </div>
                    ${entry.photo_url ? `
                        <img src="${entry.photo_url}" style="width: 100%; max-width: 300px; border-radius: 8px; margin-top: 12px; cursor: pointer;" onclick="window.open('${entry.photo_url}', '_blank')" />
                    ` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Load tracking error:', error);
    }
}

// Handle photo upload
async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('Image size should be less than 5MB', 'error');
        return;
    }
    
    try {
        showToast('Uploading photo...', 'info');
        
        // Upload to Supabase Storage
        const fileName = `delivery_${orderId}_${Date.now()}.${file.name.split('.').pop()}`;
        const { data, error } = await merchantSupabase.storage
            .from('delivery-photos')
            .upload(fileName, file);
        
        if (error) throw error;
        
        // Get public URL
        const { data: urlData } = merchantSupabase.storage
            .from('delivery-photos')
            .getPublicUrl(fileName);
        
        uploadedPhoto = urlData.publicUrl;
        
        // Show preview
        const preview = document.getElementById('photoPreview');
        const previewContainer = document.getElementById('deliveryPhotoPreview');
        if (preview && previewContainer) {
            preview.src = uploadedPhoto;
            previewContainer.style.display = 'block';
        }
        
        showToast('Photo uploaded successfully!', 'success');
        
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
        'completed': '#22c55e',
        'cancelled': '#ef4444'
    };
    return colors[status] || '#6b7280';
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

async function merchantLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await MerchantAuth.logout();
            showToast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = 'merchant-login.html';
            }, 1000);
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Logout failed', 'error');
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initOrderDetails();
});