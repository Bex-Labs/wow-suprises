// Custom Package Builder JavaScript - COMPLETE WITH PROPER LOGIN INDICATOR
// ✅ Proper Login/Logout Toggle (NO DUPLICATES!)
// ✅ Built-in Login/Logout Display
// ✅ Async Authentication Check
// ✅ UUID Generation
// ✅ Real Image Paths

console.log('🎨 Loading Custom Package Builder (Proper Login Toggle)...');

// ========================================
// AVAILABLE ITEMS WITH CATEGORIES
// ========================================
const availableItems = [
    // Flowers
    { 
        id: 'roses', 
        name: 'Red Roses Bouquet', 
        category: 'flowers', 
        price: 15000, 
        image: 'assets/side-view-bouquet-red-color-roses-flowers.jpg'
    },
    { 
        id: 'orchids', 
        name: 'Exotic Orchids', 
        category: 'flowers', 
        price: 18000, 
        image: 'assets/side-view-white-orchid-phalaenopsis-flower.jpg'
    },
    { 
        id: 'tulips', 
        name: 'Tulip Arrangement', 
        category: 'flowers', 
        price: 16000, 
        image: 'assets/tulip-flowers-bouquet-pack-paper.jpg'
    },
    
    // Food & Drinks
    { 
        id: 'champagne', 
        name: 'Premium Champagne', 
        category: 'food', 
        price: 25000, 
        image: 'assets/two-festive-champagne-glasses-celebration.jpg'
    },
    { 
        id: 'cake', 
        name: 'Custom Celebration Cake', 
        category: 'food', 
        price: 30000, 
        image: 'assets/delicious-cake-indoors-still-life.jpg'
    },
    { 
        id: 'dinner', 
        name: 'Romantic 3-Course Dinner', 
        category: 'food', 
        price: 45000, 
        image: 'assets/dish-with-cutlery-with-bow-burning-candle.jpg'
    },
    { 
        id: 'chocolates', 
        name: 'Luxury Chocolate Box', 
        category: 'food', 
        price: 12000, 
        image: 'assets/chocolate-cake-surrounded-by-chocolate-truffles-bonbons.jpg'
    },
    
    // Entertainment
    { 
        id: 'live-band', 
        name: 'Live Band (3 hours)', 
        category: 'entertainment', 
        price: 150000, 
        image: 'assets/front-view-smiley-male-musicians-home-playing-electric-keyboard-guitar.jpg'
    },
    { 
        id: 'dj', 
        name: 'Professional DJ', 
        category: 'entertainment', 
        price: 80000, 
        image: 'assets/fun-party-with-dj.jpg'
    },
    { 
        id: 'saxophonist', 
        name: 'Saxophonist Performance', 
        category: 'entertainment', 
        price: 45000, 
        image: 'assets/medium-shot-man-with-hat-playing-saxophone.jpg'
    },
    { 
        id: 'magician', 
        name: 'Magic Show', 
        category: 'entertainment', 
        price: 35000, 
        image: 'assets/spot-light-top-hat-with-white-gloves-wand.jpg'
    },
    
    // Photography
    { 
        id: 'photographer', 
        name: 'Professional Photographer', 
        category: 'photography', 
        price: 50000, 
        image: 'assets/high-angle-photographer-holding-camera.jpg'
    },
    { 
        id: 'videographer', 
        name: 'Videography Package', 
        category: 'photography', 
        price: 75000, 
        image: 'assets/clapperboard-camera-lenses.jpg'
    },
    { 
        id: 'drone', 
        name: 'Drone Footage', 
        category: 'photography', 
        price: 65000, 
        image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600&h=400&fit=crop&q=80'
    },
    { 
        id: 'photo-booth', 
        name: 'Photo Booth (4 hours)', 
        category: 'photography', 
        price: 40000, 
        image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=400&fit=crop&q=80'
    },
    
    // Decorations
    { 
        id: 'balloons-basic', 
        name: 'Balloon Decoration (Basic)', 
        category: 'decorations', 
        price: 20000, 
        image: 'assets/many-beautiful-balls-decorating-space.jpg'
    },
    { 
        id: 'balloons-premium', 
        name: 'Balloon Decoration (Premium)', 
        category: 'decorations', 
        price: 45000, 
        image: 'assets/stylish-rich-table-with-sweets-fruits-guests.jpg'
    },
    { 
        id: 'led-lights', 
        name: 'LED Light Setup', 
        category: 'decorations', 
        price: 35000, 
        image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=400&fit=crop&q=80'
    },
    { 
        id: 'canopy', 
        name: 'Event Canopy', 
        category: 'decorations', 
        price: 55000, 
        image: 'https://images.unsplash.com/photo-1464047736614-af63643285bf?w=600&h=400&fit=crop&q=80'
    },
    { 
        id: 'backdrop', 
        name: 'Custom Backdrop', 
        category: 'decorations', 
        price: 28000, 
        image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop&q=80'
    },
    
    // Extras
    { 
        id: 'gift-basket', 
        name: 'Luxury Gift Basket', 
        category: 'extras', 
        price: 32000, 
        image: 'assets/gift basket.png'
    },
    { 
        id: 'jewelry', 
        name: 'Jewelry Gift', 
        category: 'extras', 
        price: 50000, 
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&h=400&fit=crop&q=80'
    },
    { 
        id: 'spa-voucher', 
        name: 'Spa Treatment Voucher', 
        category: 'extras', 
        price: 60000, 
        image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop&q=80'
    },
    { 
        id: 'perfume', 
        name: 'Designer Perfume', 
        category: 'extras', 
        price: 38000, 
        image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=400&fit=crop&q=80'
    },
    { 
        id: 'hotel-stay', 
        name: 'Hotel Stay Package', 
        category: 'extras', 
        price: 120000, 
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&q=80'
    },
    { 
        id: 'car-rental', 
        name: 'Luxury Car for Day', 
        category: 'extras', 
        price: 95000, 
        image: 'assets/luxury car for a day.png'
    }
];

// Selected items tracking
let selectedItems = [];

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ Custom Package Builder Initialized');
    
    // Update login status indicator
    await updateLoginStatus();
    
    // Initialize package builder
    displayItems('all');
    updateSummary();
    setupCategoryFilters();
    setupProceedButton();
    restoreSelectedItems();
    
    console.log('✅ Custom Package Builder Ready');
});

// ========================================
// LOGIN STATUS INDICATOR (PROPER TOGGLE - NO DUPLICATES!)
// ========================================
async function updateLoginStatus() {
    // Find the nav-links container
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) {
        console.warn('⚠️ Nav links container not found');
        return;
    }
    
    // Find the existing login link (from HTML)
    const existingLoginLink = navLinks.querySelector('a[href="login.html"]');
    
    // Remove any existing loginStatus div (in case we're updating)
    const existingStatus = document.getElementById('loginStatus');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    // Check if user is logged in
    const user = await getCurrentUser();
    
    if (user) {
        // ========================================
        // USER IS LOGGED IN
        // ========================================
        console.log('✅ Login status: Logged in as', user.email);
        
        // HIDE the existing Login link
        if (existingLoginLink) {
            existingLoginLink.style.display = 'none';
            console.log('✅ Hidden existing Login link');
        }
        
        // CREATE and SHOW the Logout section
        const statusDiv = document.createElement('div');
        statusDiv.id = 'loginStatus';
        statusDiv.style.cssText = 'display: inline-flex; align-items: center; gap: 8px;';
        
        statusDiv.innerHTML = `
            <span style="color: #666; font-size: 14px; font-weight: 500;">
                <i class="bi bi-person-circle"></i> ${user.name || user.email.split('@')[0]}
            </span>
            <button onclick="handleLogout()" style="
                background: #dc2626;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: background 0.2s;
            " onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'">
                <i class="bi bi-box-arrow-right"></i> Logout
            </button>
        `;
        
        navLinks.appendChild(statusDiv);
        console.log('✅ Showing: Profile name + Logout button');
        
    } else {
        // ========================================
        // USER IS NOT LOGGED IN
        // ========================================
        console.log('❌ Login status: Not logged in');
        
        // SHOW the existing Login link
        if (existingLoginLink) {
            existingLoginLink.style.display = 'inline-block';
            console.log('✅ Showing existing Login link');
        } else {
            // If for some reason the login link doesn't exist, create one
            console.log('⚠️ Login link not found in HTML, creating one');
            const loginLink = document.createElement('a');
            loginLink.href = 'login.html';
            loginLink.style.cssText = `
                background: #3b82f6;
                color: white;
                text-decoration: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: 500;
                font-size: 14px;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                transition: background 0.2s;
            `;
            loginLink.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Login';
            navLinks.appendChild(loginLink);
        }
        
        console.log('✅ Showing: Login button only');
    }
}

// Handle logout
async function handleLogout() {
    try {
        console.log('🔓 Logging out...');
        
        // Get Supabase client and sign out
        const getClient = window.getSupabaseClient;
        if (getClient) {
            const sb = getClient();
            if (sb) {
                await sb.auth.signOut();
                console.log('✅ Supabase sign out successful');
            }
        }
        
        // Clear all storage
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('customPackageData');
        sessionStorage.removeItem('selectedPackageId');
        
        // Show success message
        showToast('Logged out successfully', 'success');
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        showToast('Logout failed. Please try again.', 'error');
    }
}

// ========================================
// AUTHENTICATION - ASYNC
// ========================================
async function getCurrentUser() {
    try {
        console.log('🔍 Checking user authentication...');
        
        // Method 1: Supabase session (ASYNC - properly awaited)
        const getClient = window.getSupabaseClient;
        if (getClient) {
            const sb = getClient();
            if (sb) {
                try {
                    const { data, error } = await sb.auth.getSession();
                    
                    if (error) {
                        console.log('Supabase session error:', error.message);
                    }
                    
                    if (data?.session?.user) {
                        console.log('✅ User found via Supabase session:', data.session.user.email);
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
                    console.log('✅ User found via localStorage:', user.email);
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.user_metadata?.full_name || user.email.split('@')[0],
                        ...user.user_metadata
                    };
                }
            } catch (e) {
                console.log('Could not parse localStorage token');
            }
        }
        
        // Method 3: sessionStorage (fallback)
        const userData = sessionStorage.getItem('currentUser');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                console.log('✅ User found via sessionStorage:', user.email);
                return user;
            } catch (e) {
                console.log('Could not parse sessionStorage user');
            }
        }
        
        console.log('❌ No user found in any storage');
        return null;
        
    } catch (error) {
        console.error('❌ Error getting current user:', error);
        return null;
    }
}

// ========================================
// UUID GENERATION
// ========================================
function generateUUID() {
    // Use crypto.randomUUID if available (modern browsers)
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    
    // Fallback to manual UUID v4 generation
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
    if (!itemsGrid) {
        console.error('❌ Items grid element not found');
        return;
    }
    
    // Filter items based on category
    const filteredItems = category === 'all' 
        ? availableItems 
        : availableItems.filter(item => item.category === category);
    
    // Clear existing items
    itemsGrid.innerHTML = '';
    
    // Create item cards
    filteredItems.forEach(item => {
        const isSelected = selectedItems.some(i => i.id === item.id);
        
        const itemCard = document.createElement('div');
        itemCard.className = `item-card ${isSelected ? 'selected' : ''}`;
        itemCard.innerHTML = `
            <img src="${item.image}" alt="${item.name}" loading="lazy">
            <div class="item-info">
                <h3>${item.name}</h3>
                <p class="item-price">₦${item.price.toLocaleString()}</p>
                <button class="btn-select ${isSelected ? 'selected' : ''}" onclick="toggleItem('${item.id}')">
                    <i class="bi ${isSelected ? 'bi-check-circle-fill' : 'bi-plus-circle'}"></i>
                    ${isSelected ? 'Selected' : 'Add to Package'}
                </button>
            </div>
        `;
        
        itemsGrid.appendChild(itemCard);
    });
    
    console.log(`📦 Displayed ${filteredItems.length} items for category: ${category}`);
}

// ========================================
// TOGGLE ITEM SELECTION
// ========================================
function toggleItem(itemId) {
    const item = availableItems.find(i => i.id === itemId);
    if (!item) {
        console.error('❌ Item not found:', itemId);
        return;
    }
    
    const existingIndex = selectedItems.findIndex(i => i.id === itemId);
    
    if (existingIndex >= 0) {
        // Item is already selected - remove it
        selectedItems.splice(existingIndex, 1);
        console.log(`➖ Removed: ${item.name}`);
    } else {
        // Item not selected - add it
        selectedItems.push(item);
        console.log(`➕ Added: ${item.name}`);
    }
    
    // Update the summary display
    updateSummary();
    
    // Refresh the items display for current category
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
    
    // Update item count
    if (itemCountElement) {
        itemCountElement.textContent = itemCount;
    }
    
    // Update total price
    if (totalPriceElement) {
        totalPriceElement.textContent = `₦${totalPrice.toLocaleString()}`;
    }
    
    // Update selected items list
    if (selectedItemsList) {
        if (itemCount === 0) {
            selectedItemsList.innerHTML = '<p class="no-items">No items selected yet</p>';
        } else {
            selectedItemsList.innerHTML = selectedItems.map(item => `
                <div class="selected-item">
                    <span>${item.name}</span>
                    <span class="item-price">₦${item.price.toLocaleString()}</span>
                    <button class="btn-remove" onclick="toggleItem('${item.id}')" aria-label="Remove ${item.name}">
                        <i class="bi bi-x-circle"></i>
                    </button>
                </div>
            `).join('');
        }
    }
    
    console.log(`📊 Summary updated: ${itemCount} items, Total: ₦${totalPrice.toLocaleString()}`);
}

// ========================================
// SETUP CATEGORY FILTERS
// ========================================
function setupCategoryFilters() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get category and display items
            const category = this.dataset.category;
            displayItems(category);
            
            console.log(`🔍 Category filter applied: ${category}`);
        });
    });
    
    console.log('✅ Category filters setup complete');
}

// ========================================
// SETUP PROCEED TO BOOKING BUTTON
// ========================================
function setupProceedButton() {
    const proceedButton = document.getElementById('proceedToBooking');
    
    if (proceedButton) {
        proceedButton.addEventListener('click', proceedToBooking);
        console.log('✅ Proceed to booking button setup complete');
    } else {
        console.warn('⚠️ Proceed to booking button not found');
    }
}

// ========================================
// PROCEED TO BOOKING - ASYNC
// ========================================
async function proceedToBooking() {
    // STEP 1: Validate that items are selected
    if (selectedItems.length === 0) {
        showToast('Please select at least one item for your custom package!', 'error');
        return;
    }
    
    console.log('🚀 Proceeding to booking...');
    console.log('📦 Selected items:', selectedItems.length);
    
    // STEP 2: Check if user is logged in (ASYNC!)
    const user = await getCurrentUser();
    
    console.log('🔐 Authentication check complete');
    console.log('👤 User:', user ? user.email : 'Not logged in');
    
    if (!user) {
        console.log('❌ User not logged in - redirecting to login page');
        
        // Save selected items temporarily so they're not lost
        try {
            sessionStorage.setItem('tempSelectedItems', JSON.stringify(selectedItems));
            console.log('✅ Temporarily saved', selectedItems.length, 'selected items');
        } catch (e) {
            console.warn('⚠️ Could not save selected items:', e);
        }
        
        // Show message to user
        showToast('Please login to continue with booking', 'error');
        
        // Redirect to login page after short delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        
        return;
    }
    
    // STEP 3: User is authenticated - create custom package
    console.log('✅ User authenticated, creating custom package...');
    
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
        // Store package data in sessionStorage
        sessionStorage.setItem('customPackageData', JSON.stringify(customPackage));
        sessionStorage.setItem('selectedPackageId', customPackage.id);
        
        // Clear temporary saved items
        sessionStorage.removeItem('tempSelectedItems');
        
        console.log('✅ Custom package stored successfully');
        console.log('📦 Package UUID:', packageUUID);
        console.log('💰 Total Price:', `₦${totalPrice.toLocaleString()}`);
        console.log('📝 Items Count:', selectedItems.length);
        console.log('🆔 Package ID:', customPackage.id);
        
        // Show success message
        showToast('Custom package created! Redirecting to booking...', 'success');
        
        // Redirect to booking page
        setTimeout(() => {
            window.location.href = 'booking.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error storing custom package:', error);
        showToast('Error creating package. Please try again.', 'error');
    }
}

// ========================================
// RESTORE SELECTED ITEMS
// Restore items if user is returning from login
// ========================================
function restoreSelectedItems() {
    const tempItems = sessionStorage.getItem('tempSelectedItems');
    
    if (tempItems) {
        try {
            selectedItems = JSON.parse(tempItems);
            console.log('✅ Restored', selectedItems.length, 'previously selected items');
            
            // Remove temporary storage
            sessionStorage.removeItem('tempSelectedItems');
            
            // Update display
            updateSummary();
            displayItems('all');
        } catch (e) {
            console.warn('⚠️ Could not restore selected items:', e);
        }
    }
}

// ========================================
// SHOW TOAST NOTIFICATION
// ========================================
function showToast(message, type = 'info') {
    // Remove any existing toasts
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
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
    
    // Set icon based on type
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 22px; font-weight: bold;">${icon}</span>
            <span style="font-size: 15px; font-weight: 500;">${message}</span>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutDown 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add toast animations CSS
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes slideInUp {
        from {
            transform: translateY(100px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    @keyframes slideOutDown {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(100px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(animationStyles);

// ========================================
// FILTER ITEMS BY CATEGORY (EXPOSED FUNCTION)
// ========================================
function filterCategory(category) {
    displayItems(category);
}

// ========================================
// EXPORT FUNCTIONS FOR GLOBAL ACCESS
// ========================================
window.toggleItem = toggleItem;
window.filterCategory = filterCategory;
window.proceedToBooking = proceedToBooking;
window.generateUUID = generateUUID;
window.getCurrentUser = getCurrentUser;
window.handleLogout = handleLogout;

console.log('✅ ✅ ✅ Custom Package Builder Ready ✅ ✅ ✅');
console.log('✅ Login Toggle: PROPER (NO DUPLICATES!)');
console.log('✅ Login Indicator: BUILT-IN');
console.log('✅ Authentication: ASYNC');
console.log('✅ UUID Generation: ENABLED');
console.log('✅ Image Paths: LOADED');
console.log('✅ Cross-Platform: ENABLED');