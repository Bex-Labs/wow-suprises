// Custom Package Builder JavaScript - FIXED (No name/red button, clean auth)
console.log('Loading Custom Package Builder...');

// ========================================
// AVAILABLE ITEMS WITH CATEGORIES
// ========================================
const availableItems = [
    // Flowers
    { id: 'roses', name: 'Red Roses Bouquet', category: 'flowers', price: 15000, image: 'https://images.unsplash.com/photo-1608027790251-5e0c80d043d9?q=80&w=435&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: 'orchids', name: 'Exotic Orchids', category: 'flowers', price: 18000, image: 'https://plus.unsplash.com/premium_photo-1676253709098-8f336062797b?q=80&w=388&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: 'tulips', name: 'Tulip Arrangement', category: 'flowers', price: 16000, image: 'https://plus.unsplash.com/premium_photo-1674502312330-3276dfe981eb?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    
    // Food & Drinks
    { id: 'champagne', name: 'Premium Champagne', category: 'food', price: 25000, image: 'https://images.unsplash.com/photo-1669067166035-7e37abaecec8?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: 'cake', name: 'Custom Celebration Cake', category: 'food', price: 30000, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80' },
    { id: 'dinner', name: 'Romantic 3-Course Dinner', category: 'food', price: 45000, image: 'https://plus.unsplash.com/premium_photo-1661434796182-a411d8782d68?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: 'chocolates', name: 'Luxury Chocolate Box', category: 'food', price: 12000, image: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=600&q=80' },
    
    // Entertainment
    { id: 'live-band', name: 'Live Band (3 hours)', category: 'entertainment', price: 150000, image: 'https://images.unsplash.com/photo-1605340406960-f5b496c38b3d?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: 'dj', name: 'Professional DJ', category: 'entertainment', price: 80000, image: 'https://images.unsplash.com/photo-1461784180009-21121b2f204c?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: 'saxophonist', name: 'Saxophonist Performance', category: 'entertainment', price: 45000, image: 'https://plus.unsplash.com/premium_photo-1682614304344-444658041f76?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: 'magician', name: 'Magic Show', category: 'entertainment', price: 35000, image: 'https://plus.unsplash.com/premium_photo-1721640873455-4dd01645b918?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    
    // Photography
    { id: 'photographer', name: 'Professional Photographer', category: 'photography', price: 50000, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80' },
    { id: 'videographer', name: 'Videography Package', category: 'photography', price: 75000, image: 'https://plus.unsplash.com/premium_photo-1682146717223-874ac7dcc607?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: 'drone', name: 'Drone Footage', category: 'photography', price: 65000, image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=600&q=80' },
    { id: 'photo-booth', name: 'Photo Booth (4 hours)', category: 'photography', price: 40000, image: 'https://images.unsplash.com/photo-1578376706507-35e6dd7af19c?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    
    // Decorations
    { id: 'balloons-basic', name: 'Balloon Decoration (Basic)', category: 'decorations', price: 20000, image: 'https://images.unsplash.com/photo-1479750178258-aec5879046ce?w=500&auto=format&fit=crop&q=60' },
    { id: 'balloons-premium', name: 'Balloon Decoration (Premium)', category: 'decorations', price: 45000, image: 'https://images.unsplash.com/photo-1611142288262-3bb8f5fc45d7?q=80&w=798&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: 'led-lights', name: 'LED Light Setup', category: 'decorations', price: 35000, image: 'https://images.unsplash.com/photo-1550564566-7daf5919353c?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: 'canopy', name: 'Event Canopy', category: 'decorations', price: 55000, image: 'https://images.unsplash.com/photo-1464047736614-af63643285bf?auto=format&fit=crop&w=600&q=80' },
    { id: 'backdrop', name: 'Custom Backdrop', category: 'decorations', price: 28000, image: 'https://plus.unsplash.com/premium_photo-1675074446323-7d464b551c48?q=80&w=435&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    
    // Extras
    { id: 'gift-basket', name: 'Luxury Gift Basket', category: 'extras', price: 32000, image: 'https://images.unsplash.com/photo-1588821323157-9fc67e64659c?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: 'jewelry', name: 'Jewelry Gift', category: 'extras', price: 50000, image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80' },
    { id: 'spa-voucher', name: 'Spa Treatment Voucher', category: 'extras', price: 60000, image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80' },
    { id: 'perfume', name: 'Designer Perfume', category: 'extras', price: 38000, image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80' },
    { id: 'hotel-stay', name: 'Hotel Stay Package', category: 'extras', price: 120000, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
    { id: 'car-rental', name: 'Luxury Car for Day', category: 'extras', price: 95000, image: 'https://images.unsplash.com/photo-1608341089966-92c09e62214f?q=80&w=869&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }
];

// Selected items tracking
let selectedItems = [];

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Custom Package Builder Initialized');
    
    // Auth display is handled by initializeAuth() in the HTML — no duplicate UI here
    
    // Initialize package builder
    displayItems('all');
    updateSummary();
    setupCategoryFilters();
    setupProceedButton();
    restoreSelectedItems();
    
    console.log('Custom Package Builder Ready');
});

// ========================================
// AUTHENTICATION - ASYNC
// ========================================
async function getCurrentUser() {
    try {
        // Method 1: Supabase session
        const getClient = window.getSupabaseClient;
        if (getClient) {
            const sb = getClient();
            if (sb) {
                try {
                    const { data, error } = await sb.auth.getSession();
                    if (data?.session?.user) {
                        return {
                            id: data.session.user.id,
                            email: data.session.user.email,
                            name: data.session.user.user_metadata?.full_name || data.session.user.email.split('@')[0],
                            ...data.session.user.user_metadata
                        };
                    }
                } catch (e) {
                    console.log('Supabase session check failed:', e.message);
                }
            }
        }
        
        // Method 2: localStorage token (fallback)
        const tokenData = localStorage.getItem('supabase.auth.token');
        if (tokenData) {
            try {
                const parsed = JSON.parse(tokenData);
                if (parsed?.user || parsed?.session?.user) {
                    const user = parsed.user || parsed.session.user;
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.user_metadata?.full_name || user.email.split('@')[0],
                        ...user.user_metadata
                    };
                }
            } catch (e) {}
        }
        
        // Method 3: sessionStorage (fallback)
        const userData = sessionStorage.getItem('currentUser');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (e) {}
        }
        
        return null;
        
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// Handle logout — used by the HTML authLink onclick
async function handleLogout() {
    try {
        const getClient = window.getSupabaseClient;
        if (getClient) {
            const sb = getClient();
            if (sb) await sb.auth.signOut();
        }
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('customPackageData');
        sessionStorage.removeItem('selectedPackageId');
        showToast('Logged out successfully', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed. Please try again.', 'error');
    }
}

// ========================================
// UUID GENERATION
// ========================================
function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ========================================
// DISPLAY ITEMS BASED ON CATEGORY FILTER
// ========================================
function displayItems(category) {
    const itemsGrid = document.getElementById('itemsGrid');
    if (!itemsGrid) return;
    
    const filteredItems = category === 'all' 
        ? availableItems 
        : availableItems.filter(item => item.category === category);
    
    itemsGrid.innerHTML = '';
    
    filteredItems.forEach(item => {
        const isSelected = selectedItems.some(i => i.id === item.id);
        const itemCard = document.createElement('div');
        itemCard.className = `item-card ${isSelected ? 'selected' : ''}`;
        itemCard.innerHTML = `
            <img src="${item.image}" alt="${item.name}" loading="lazy">
            <div class="item-info">
                <h3>${item.name}</h3>
                <p class="item-price">&#x20A6;${item.price.toLocaleString()}</p>
                <button class="btn-select ${isSelected ? 'selected' : ''}" onclick="toggleItem('${item.id}')">
                    <i class="bi ${isSelected ? 'bi-check-circle-fill' : 'bi-plus-circle'}"></i>
                    ${isSelected ? 'Selected' : 'Add to Package'}
                </button>
            </div>
        `;
        itemsGrid.appendChild(itemCard);
    });
}

// ========================================
// TOGGLE ITEM SELECTION
// ========================================
function toggleItem(itemId) {
    const item = availableItems.find(i => i.id === itemId);
    if (!item) return;
    
    const existingIndex = selectedItems.findIndex(i => i.id === itemId);
    if (existingIndex >= 0) {
        selectedItems.splice(existingIndex, 1);
    } else {
        selectedItems.push(item);
    }
    
    updateSummary();
    
    const activeCategory = document.querySelector('.category-btn.active');
    const currentCategory = activeCategory ? activeCategory.dataset.category : 'all';
    displayItems(currentCategory);
}

// ========================================
// UPDATE SUMMARY DISPLAY
// ========================================
function updateSummary() {
    const itemCountElement = document.getElementById('itemCount');
    const totalPriceElement = document.getElementById('totalPrice');
    const selectedItemsList = document.getElementById('selectedItemsList');
    
    const itemCount = selectedItems.length;
    const totalPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);
    
    if (itemCountElement) itemCountElement.textContent = itemCount;
    if (totalPriceElement) totalPriceElement.textContent = `\u20A6${totalPrice.toLocaleString()}`;
    
    if (selectedItemsList) {
        if (itemCount === 0) {
            selectedItemsList.innerHTML = '<p class="no-items">No items selected yet</p>';
        } else {
            selectedItemsList.innerHTML = selectedItems.map(item => `
                <div class="selected-item">
                    <span>${item.name}</span>
                    <span class="item-price">\u20A6${item.price.toLocaleString()}</span>
                    <button class="btn-remove" onclick="toggleItem('${item.id}')" aria-label="Remove ${item.name}">
                        <i class="bi bi-x-circle"></i>
                    </button>
                </div>
            `).join('');
        }
    }
}

// ========================================
// SETUP CATEGORY FILTERS
// ========================================
function setupCategoryFilters() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            displayItems(this.dataset.category);
        });
    });
}

// ========================================
// SETUP PROCEED TO BOOKING BUTTON
// ========================================
function setupProceedButton() {
    const proceedButton = document.getElementById('proceedToBooking');
    if (proceedButton) {
        proceedButton.addEventListener('click', proceedToBooking);
    }
}

// ========================================
// PROCEED TO BOOKING - ASYNC
// ========================================
async function proceedToBooking() {
    if (selectedItems.length === 0) {
        showToast('Please select at least one item for your custom package!', 'error');
        return;
    }
    
    const user = await getCurrentUser();
    
    if (!user) {
        try {
            sessionStorage.setItem('tempSelectedItems', JSON.stringify(selectedItems));
        } catch (e) {}
        showToast('Please login to continue with booking', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;
    }
    
    const totalPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);
    const packageUUID = generateUUID();
    
    const customPackage = {
        id: `custom_${packageUUID}`,
        name: 'Custom Package',
        title: 'Custom Package',
        description: 'Your personalized surprise package',
        category: 'custom',
        price: totalPrice,
        packageType: 'custom',
        isCustomPackage: true,
        items: selectedItems.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.price
        })),
        itemCount: selectedItems.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    try {
        sessionStorage.setItem('customPackageData', JSON.stringify(customPackage));
        sessionStorage.setItem('selectedPackageId', customPackage.id);
        sessionStorage.removeItem('tempSelectedItems');
        showToast('Custom package created! Redirecting to booking...', 'success');
        setTimeout(() => { window.location.href = 'booking.html'; }, 1000);
    } catch (error) {
        console.error('Error storing custom package:', error);
        showToast('Error creating package. Please try again.', 'error');
    }
}

// ========================================
// RESTORE SELECTED ITEMS
// ========================================
function restoreSelectedItems() {
    const tempItems = sessionStorage.getItem('tempSelectedItems');
    if (tempItems) {
        try {
            selectedItems = JSON.parse(tempItems);
            sessionStorage.removeItem('tempSelectedItems');
            updateSummary();
            displayItems('all');
        } catch (e) {}
    }
}

// ========================================
// SHOW TOAST NOTIFICATION
// ========================================
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#dc2626' : '#3b82f6'};
        color: white;
        padding: 18px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 320px;
        animation: slideInUp 0.3s ease-out;
    `;
    
    const icon = type === 'success' ? '&#10003;' : type === 'error' ? '&#10007;' : '&#9432;';
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 22px; font-weight: bold;">${icon}</span>
            <span style="font-size: 15px; font-weight: 500;">${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutDown 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Toast animations
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes slideInUp {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideOutDown {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(100px); opacity: 0; }
    }
`;
document.head.appendChild(animationStyles);

// ========================================
// EXPORT FUNCTIONS FOR GLOBAL ACCESS
// ========================================
window.toggleItem = toggleItem;
window.filterCategory = displayItems;
window.proceedToBooking = proceedToBooking;
window.generateUUID = generateUUID;
window.getCurrentUser = getCurrentUser;
window.handleLogout = handleLogout;

console.log('Custom Package Builder Ready');