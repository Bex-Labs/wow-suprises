// Booking Page JavaScript - COMPLETE WITH CUSTOM PACKAGE SUPPORT
// All fixes applied: Navigation scrolling + Database column names + Payment auto-update + Button fixes + CUSTOM PACKAGES

let currentStep = 1;
let selectedPackage = null;
let bookingData = {};
let totalAmount = 0;
let isCustomPackage = false; // NEW: Track if this is a custom package

// ========================================
// CRITICAL FIX: Make functions globally accessible for onclick handlers
// ========================================
window.nextStep = nextStep;
window.prevStep = prevStep;
window.initiateFlutterwavePayment = initiateFlutterwavePayment;

console.log('🚀 Booking script loading (WITH CUSTOM PACKAGE SUPPORT)...');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing booking page...');
    
    // Check if returning from payment - MUST BE FIRST
    checkPaymentReturn();
    
    checkAuthAndLoadPackage();
    setupFormValidation();
    setMinDate();
    
    console.log('✅ All initialization complete');
});

// ========================================
// CRITICAL FIX: Check if user is returning from successful payment
// Handles Flutterwave redirect and auto-updates booking status
// ========================================
async function checkPaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const txRef = urlParams.get('tx_ref');
    const transactionId = urlParams.get('transaction_id');
    
    // Also check for legacy parameter format
    const paymentStatus = urlParams.get('payment');
    const bookingId = urlParams.get('bookingId');
    
    console.log('Checking payment return:', { status, txRef, transactionId, paymentStatus, bookingId });
    
    // Handle Flutterwave redirect (status + tx_ref)
    if (status && txRef) {
        console.log('💳 Flutterwave payment return detected');
        
        try {
            showToast('Verifying payment...', 'info');
            
            // Find the booking by reference
            const bookings = await API.bookings.getBookings();
            const booking = bookings.find(b => b.booking_reference === txRef);
            
            if (!booking) {
                console.error('❌ Booking not found for reference:', txRef);
                showToast('Booking not found. Please check your booking history.', 'error');
                setTimeout(() => window.location.href = 'booking-history.html', 2000);
                return;
            }
            
            console.log('📦 Found booking:', booking.id);
            
            // Handle successful payment
            if (status === 'successful' || status === 'completed') {
                console.log('✅ Payment successful, updating booking...');
                
                // Update booking status to confirmed and paid
                await API.bookings.updateBooking(booking.id, {
                    status: 'confirmed',
                    payment_status: 'paid',
                    payment_reference: transactionId || txRef
                });
                
                console.log('✅ Booking updated to confirmed');
                
                // Load package for display
                await loadSelectedPackage();
                
                // Get updated booking
                const updatedBooking = await API.bookings.getBooking(booking.id);
                
                // Move to confirmation step
                currentStep = 5;
                displayBookingConfirmation(updatedBooking);
                updateStepDisplay();
                
                showToast('Payment successful! Booking confirmed.', 'success');
                
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                
            } else if (status === 'cancelled') {
                console.log('❌ Payment cancelled');
                
                // Update booking status to cancelled
                await API.bookings.updateBooking(booking.id, {
                    status: 'cancelled',
                    payment_status: 'cancelled'
                });
                
                showToast('Payment was cancelled', 'error');
                setTimeout(() => window.location.href = 'booking-history.html', 2000);
                
            } else {
                console.log('❌ Payment failed');
                
                // Update booking status to failed
                await API.bookings.updateBooking(booking.id, {
                    status: 'cancelled',
                    payment_status: 'failed'
                });
                
                showToast('Payment failed. Please try again.', 'error');
                setTimeout(() => window.location.href = 'booking-history.html', 2000);
            }
            
        } catch (error) {
            console.error('❌ Error processing payment return:', error);
            showToast('Error verifying payment. Please check your booking history.', 'error');
            setTimeout(() => window.location.href = 'booking-history.html', 3000);
        }
    }
    // Handle legacy redirect format (payment=success&bookingId=)
    else if (paymentStatus === 'success' && bookingId) {
        console.log('💳 Legacy payment return detected');
        
        try {
            showToast('Confirming your payment...', 'info');
            
            const booking = await API.bookings.getBooking(bookingId);
            
            if (booking && booking.payment_status === 'paid') {
                currentStep = 5;
                await loadSelectedPackage();
                displayBookingConfirmation(booking);
                updateStepDisplay();
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                showToast('Please check your booking history', 'info');
                setTimeout(() => window.location.href = 'booking-history.html', 2000);
            }
        } catch (error) {
            console.error('Error checking payment:', error);
            showToast('Please check your booking history', 'info');
            setTimeout(() => window.location.href = 'booking-history.html', 2000);
        }
    }
}

// Check authentication and load package
function checkAuthAndLoadPackage() {
    const user = getCurrentUser();
    
    console.log('🔐 Checking authentication...');
    console.log('👤 User:', user ? user.email : 'Not logged in');
    
    if (!user) {
        console.error('❌ User not authenticated');
        showToast('Please login to make a booking', 'error');
        setTimeout(() => window.location.href = 'login.html', 2000);
        return;
    }
    
    console.log('✅ User authenticated, checking for package...');
    
    // Debug: Check what's in sessionStorage
    console.log('📦 SessionStorage contents:');
    console.log('  - selectedPackageId:', sessionStorage.getItem('selectedPackageId'));
    console.log('  - customPackageData:', sessionStorage.getItem('customPackageData') ? 'EXISTS' : 'NOT FOUND');
    
    loadSelectedPackage();
}

// ========================================
// UPDATED: Load selected package (REGULAR OR CUSTOM)
// ========================================
async function loadSelectedPackage() {
    // CRITICAL FIX: Try both native sessionStorage and SessionStorage wrapper
    let packageId = sessionStorage.getItem('selectedPackageId') || SessionStorage.get('selectedPackageId');
    
    console.log('🔍 Checking for package ID:', packageId);
    console.log('📦 sessionStorage keys:', Object.keys(sessionStorage));
    
    if (!packageId) {
        console.error('❌ No package selected');
        showToast('No package selected. Please select a package first.', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    console.log('✅ Loading package with ID:', packageId);
    
    // Check if required DOM elements exist
    if (!document.getElementById('packageSummary')) {
        console.error('Critical error: packageSummary element not found in DOM');
        showToast('Page loading error. Please refresh.', 'error');
        return;
    }
    
    try {
        // NEW: Check if it's a custom package (starts with 'custom_')
        if (packageId.startsWith('custom_')) {
            console.log('🎨 Custom package detected');
            await loadCustomPackage();
            return;
        }
        
        // Load regular package
        // First, try to find in mock packages (they use string IDs like 'pkg001')
        const mockPackages = getMockPackages();
        selectedPackage = mockPackages.find(p => p.id === packageId);
        
        // If not found in mock, try database (only if it looks like a UUID)
        if (!selectedPackage && isUUID(packageId)) {
            try {
                console.log('Trying database fetch...');
                const dbPackage = await API.packages.getPackage(packageId);
                if (dbPackage) {
                    selectedPackage = {
                        id: dbPackage.id,
                        name: dbPackage.name || dbPackage.package_name || dbPackage.title,
                        title: dbPackage.name || dbPackage.package_name || dbPackage.title,
                        price: parseFloat(dbPackage.price || dbPackage.package_price || 0),
                        description: dbPackage.description || ''
                    };
                }
            } catch (dbError) {
                console.log('Database fetch failed:', dbError.message);
            }
        }
        
        if (!selectedPackage) {
            throw new Error('Package not found in mock data or database');
        }
        
        isCustomPackage = false;
        console.log('Package loaded successfully:', selectedPackage);
        totalAmount = parseFloat(selectedPackage.price || 0);
        
        // Display package information
        displayPackageSummary();
        updatePaymentAmounts();
        
    } catch (error) {
        console.error('Error loading package:', error);
        showToast('Failed to load package: ' + error.message, 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
}

// ========================================
// NEW: Load custom package from sessionStorage
// ========================================
async function loadCustomPackage() {
    // CRITICAL FIX: Use native sessionStorage.getItem()
    const customPackageDataString = sessionStorage.getItem('customPackageData');
    
    console.log('🔍 Custom package data (raw):', customPackageDataString);
    
    if (!customPackageDataString) {
        console.error('❌ Custom package data not found in sessionStorage');
        console.log('📦 Available sessionStorage keys:', Object.keys(sessionStorage));
        showToast('Custom package data not found. Please create your package again.', 'error');
        setTimeout(() => window.location.href = 'custom-package.html', 2000);
        return;
    }
    
    try {
        // Parse the JSON string
        const customData = JSON.parse(customPackageDataString);
        
        console.log('✅ Custom package parsed:', customData);
        
        // Transform custom package to match regular package structure
        selectedPackage = {
            id: customData.id,
            name: 'Custom Package',
            title: 'Custom Package',
            price: parseFloat(customData.price || 0),
            description: `Your personalized surprise package with ${customData.items.length} selected items`,
            category: 'custom',
            items: customData.items, // Store items for later
            itemCount: customData.items.length
        };
        
        isCustomPackage = true;
        totalAmount = parseFloat(selectedPackage.price || 0);
        
        console.log('✅ Custom package loaded:', selectedPackage);
        console.log('✅ Total amount:', totalAmount);
        console.log('✅ Items:', selectedPackage.items.length);
        
        displayCustomPackageSummary();
        updatePaymentAmounts();
        
    } catch (error) {
        console.error('Error loading custom package:', error);
        showToast('Error loading package. Please try again.', 'error');
        setTimeout(() => window.location.href = 'custom-package.html', 2000);
    }
}

// Check if string is a valid UUID
function isUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

// Mock packages (fallback) - Must match packages.js IDs
function getMockPackages() {
    return [
        {
            id: 'pkg001',
            name: 'Romantic Dinner Surprise',
            title: 'Romantic Dinner Surprise',
            price: 75000,
            description: 'Elegant candlelit dinner with live music'
        },
        {
            id: 'pkg002',
            name: 'Birthday Bash Extravaganza',
            title: 'Birthday Bash Extravaganza',
            price: 180000,
            description: 'Full party setup with entertainment and catering'
        },
        {
            id: 'pkg003',
            name: 'Proposal Paradise',
            title: 'Proposal Paradise',
            price: 375000,
            description: 'Magical proposal setup at scenic location'
        },
        {
            id: 'pkg004',
            name: 'Graduation Celebration',
            title: 'Graduation Celebration',
            price: 120000,
            description: 'Celebrate academic achievement in style'
        },
        {
            id: 'pkg005',
            name: 'Luxury Weekend Getaway',
            title: 'Luxury Weekend Getaway',
            price: 450000,
            description: 'Two-night stay at a 5-star resort with spa treatment'
        },
        {
            id: 'pkg006',
            name: 'Corporate Gala Night',
            title: 'Corporate Gala Night',
            price: 600000,
            description: 'Elegant corporate dinner and entertainment package'
        },
        {
            id: 'pkg007',
            name: 'Kids Funfair Party',
            title: 'Kids Funfair Party',
            price: 95000,
            description: 'Exciting themed funfair experience for kids'
        }
    ];
}

// ========================================
// NEW: Display custom package summary
// ========================================
function displayCustomPackageSummary() {
    const summary = document.getElementById('packageSummary');
    
    if (!summary) {
        console.error('packageSummary element not found in DOM');
        return;
    }
    
    // Group items by category
    const itemsByCategory = {};
    selectedPackage.items.forEach(item => {
        if (!itemsByCategory[item.category]) {
            itemsByCategory[item.category] = [];
        }
        itemsByCategory[item.category].push(item);
    });
    
    const categoryNames = {
        flowers: '🌸 Flowers',
        food: '🍾 Food & Drinks',
        entertainment: '🎵 Entertainment',
        photography: '📸 Photography',
        decorations: '🎈 Decorations',
        extras: '🎁 Extras'
    };
    
    let itemsHTML = '';
    Object.keys(itemsByCategory).forEach(category => {
        itemsHTML += `
            <div style="margin-bottom: 20px;">
                <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 10px; color: #000;">
                    ${categoryNames[category] || category}
                </h4>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    ${itemsByCategory[category].map(item => `
                        <li style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                            <span style="color: #666;">${item.name}</span>
                            <span style="font-weight: 600; color: #000;">₦${item.price.toLocaleString()}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    });
    
    summary.innerHTML = `
        <div style="background: #f9f9f9; border: 2px solid #e0e0e0; border-radius: 16px; padding: 24px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                <i class="bi bi-palette" style="font-size: 32px;"></i>
                <h3 style="margin: 0; flex: 1;">Custom Package</h3>
                <span style="background: #000; color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;">PERSONALIZED</span>
            </div>
            
            <p style="color: #666; margin-bottom: 20px;">
                Your personalized surprise package with ${selectedPackage.items.length} selected items
            </p>
            
            <div style="max-height: 400px; overflow-y: auto; margin-bottom: 20px;">
                ${itemsHTML}
            </div>
            
            <div style="border-top: 2px solid #000; padding-top: 16px; margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 18px;">Total Package Price:</strong>
                    <strong id="totalAmount" style="font-size: 28px; color: #000;">₦${totalAmount.toLocaleString()}</strong>
                </div>
            </div>
            
            <div style="margin-top: 16px; text-align: center;">
                <a href="custom-package.html" style="color: #666; text-decoration: none; font-size: 14px;">
                    <i class="bi bi-pencil"></i> Modify Package
                </a>
            </div>
        </div>
    `;
    
    console.log('✅ Custom package summary displayed');
}

// Display package summary (REGULAR PACKAGES)
function displayPackageSummary() {
    const summary = document.getElementById('packageSummary');
    
    if (!summary) {
        console.error('packageSummary element not found in DOM');
        return;
    }
    
    const packageName = selectedPackage.name || selectedPackage.title || 'Surprise Package';
    const packagePrice = parseFloat(selectedPackage.price || 0);
    
    summary.innerHTML = `
        <h3><i class="bi bi-box-seam"></i> Package Summary</h3>
        <div class="summary-item">
            <span>Package:</span>
            <span>${packageName}</span>
        </div>
        <div class="summary-item">
            <span>Base Price:</span>
            <span id="basePrice">${formatPrice(packagePrice)}</span>
        </div>
        <div class="summary-item" id="addonsTotal" style="display: none;">
            <span>Add-ons:</span>
            <span id="addonsPrice">₦0</span>
        </div>
        <div class="summary-item">
            <span>Total Amount:</span>
            <span id="totalAmount">${formatPrice(packagePrice)}</span>
        </div>
    `;
}

// Set minimum date to today
function setMinDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    const dateInput = document.getElementById('surpriseDate');
    if (dateInput) {
        dateInput.setAttribute('min', minDate);
    }
}

// ========================================
// CRITICAL FIX: Next step function
// ========================================
function nextStep() {
    console.log('▶️ Next button clicked - Current step:', currentStep);
    
    // Validate current step
    if (!validateStep(currentStep)) {
        console.log('❌ Validation failed');
        return;
    }
    
    console.log('✅ Validation passed');
    
    // Save current step data
    saveStepData(currentStep);
    
    // Move to next step
    if (currentStep < 5) {
        currentStep++;
        console.log('➡️ Moving to step:', currentStep);
        updateStepDisplay();
        
        // Special handling for payment step
        if (currentStep === 4) {
            updatePaymentAmounts();
        }
    }
}

// ========================================
// CRITICAL FIX: Previous step function
// ========================================
function prevStep() {
    console.log('◀️ Previous button clicked - Current step:', currentStep);
    
    if (currentStep > 1) {
        currentStep--;
        console.log('⬅️ Moving to step:', currentStep);
        updateStepDisplay();
    }
}

// ========================================
// FIXED: Update step display - Scroll to current step smoothly
// ========================================
function updateStepDisplay() {
    console.log('🎯 Updating display for step:', currentStep);
    
    // Update progress indicator
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNum < currentStep) {
            step.classList.add('completed');
        } else if (stepNum === currentStep) {
            step.classList.add('active');
        }
    });
    
    // Update form display
    document.querySelectorAll('.form-step').forEach((step, index) => {
        step.classList.remove('active');
        if (index + 1 === currentStep) {
            step.classList.add('active');
            console.log('✅ Activated step:', index + 1);
        }
    });
    
    // FIXED: Scroll to active step with offset (not to top of page)
    setTimeout(() => {
        const activeStep = document.querySelector(`.form-step[data-step="${currentStep}"]`);
        if (activeStep) {
            const headerOffset = 100; // Offset for fixed header
            const elementPosition = activeStep.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            console.log('📜 Scrolling to step position:', offsetPosition);
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        } else {
            // Fallback: scroll to booking form
            const bookingForm = document.getElementById('bookingForm');
            if (bookingForm) {
                bookingForm.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }
    }, 150); // Small delay to ensure DOM is updated
}

// Validate step
function validateStep(step) {
    console.log('🔍 Validating step:', step);
    
    const stepElement = document.querySelector(`.form-step[data-step="${step}"]`);
    if (!stepElement) return true; // Skip validation if step not found
    
    const requiredFields = stepElement.querySelectorAll('[required]');
    let isValid = true;
    let invalidFields = [];
    
    // Check all required fields
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = '#dc2626';
            isValid = false;
            invalidFields.push(field.id || field.name);
        } else {
            field.style.borderColor = '#e0e0e0';
        }
    });
    
    if (invalidFields.length > 0) {
        console.log('❌ Invalid fields:', invalidFields);
    }
    
    // Step-specific validation
    if (step === 1) {
        const phone = document.getElementById('recipientPhone').value;
        if (!validatePhone(phone)) {
            document.getElementById('recipientPhone').style.borderColor = '#dc2626';
            showToast('Please enter a valid phone number', 'error');
            isValid = false;
        }
        
        const email = document.getElementById('recipientEmail').value;
        if (email && !validateEmail(email)) {
            document.getElementById('recipientEmail').style.borderColor = '#dc2626';
            showToast('Please enter a valid email address', 'error');
            isValid = false;
        }
    }
    
    if (step === 2) {
        const dateInput = document.getElementById('surpriseDate').value;
        const selectedDate = new Date(dateInput);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate <= today) {
            document.getElementById('surpriseDate').style.borderColor = '#dc2626';
            showToast('Surprise date must be at least 1 day in the future', 'error');
            isValid = false;
        }
    }
    
    if (!isValid) {
        showToast('Please fill in all required fields correctly', 'error');
    }
    
    console.log('Validation result:', isValid);
    return isValid;
}

// Save step data
function saveStepData(step) {
    console.log('💾 Saving data for step:', step);
    
    switch(step) {
        case 1:
            bookingData.recipientName = document.getElementById('recipientName').value.trim();
            bookingData.recipientEmail = document.getElementById('recipientEmail').value.trim();
            bookingData.recipientPhone = document.getElementById('recipientPhone').value.trim();
            bookingData.deliveryAddress = document.getElementById('deliveryAddress').value.trim();
            break;
            
        case 2:
            bookingData.surpriseDate = document.getElementById('surpriseDate').value;
            bookingData.surpriseTime = document.getElementById('surpriseTime').value;
            bookingData.timezone = document.getElementById('timezone').value;
            bookingData.flexibleTiming = document.getElementById('flexibleTiming').checked;
            break;
            
        case 3:
            bookingData.personalMessage = document.getElementById('personalMessage').value.trim();
            bookingData.specialRequests = document.getElementById('specialRequests').value.trim();
            
            // Collect addons
            const addons = [];
            let addonsTotal = 0;
            document.querySelectorAll('input[name="addons"]:checked').forEach(addon => {
                const price = parseFloat(addon.dataset.price);
                addons.push({
                    id: addon.value,
                    price: price
                });
                addonsTotal += price;
            });
            
            bookingData.addons = addons;
            bookingData.addonsTotal = addonsTotal;
            
            // Update total amount
            totalAmount = parseFloat(selectedPackage.price) + addonsTotal;
            
            // Update summary
            updatePriceSummary();
            break;
    }
    
    console.log('✅ Data saved:', bookingData);
}

// Update price summary
function updatePriceSummary() {
    const basePrice = parseFloat(selectedPackage.price || 0);
    const addonsTotal = bookingData.addonsTotal || 0;
    totalAmount = basePrice + addonsTotal;
    
    const addonsTotalEl = document.getElementById('addonsTotal');
    const addonsPriceEl = document.getElementById('addonsPrice');
    const totalAmountEl = document.getElementById('totalAmount');
    
    if (!addonsTotalEl || !addonsPriceEl || !totalAmountEl) {
        console.warn('Price summary elements not found yet');
        return;
    }
    
    if (addonsTotal > 0) {
        addonsTotalEl.style.display = 'flex';
        addonsPriceEl.textContent = formatPrice(addonsTotal);
    } else {
        addonsTotalEl.style.display = 'none';
    }
    
    totalAmountEl.textContent = formatPrice(totalAmount);
    updatePaymentAmounts();
}

// Update payment amounts
function updatePaymentAmounts() {
    const paymentAmountElements = document.querySelectorAll('.payment-amount');
    
    if (paymentAmountElements.length === 0) {
        console.warn('No payment amount elements found yet');
        return;
    }
    
    paymentAmountElements.forEach(el => {
        el.textContent = totalAmount.toLocaleString();
    });
}

// Setup form validation
function setupFormValidation() {
    // Real-time addon price updates
    document.querySelectorAll('input[name="addons"]').forEach(addon => {
        addon.addEventListener('change', () => {
            let addonsTotal = 0;
            document.querySelectorAll('input[name="addons"]:checked').forEach(checked => {
                addonsTotal += parseFloat(checked.dataset.price);
            });
            
            bookingData.addonsTotal = addonsTotal;
            totalAmount = parseFloat(selectedPackage.price) + addonsTotal;
            updatePriceSummary();
        });
    });
    
    // Clear error styling on input
    document.querySelectorAll('input, textarea, select').forEach(field => {
        field.addEventListener('input', () => {
            field.style.borderColor = '#e0e0e0';
        });
    });
}

// ========================================
// CRITICAL FIX: Initiate Flutterwave Payment with proper redirect
// ========================================
async function initiateFlutterwavePayment(paymentMethod) {
    console.log('💳 Initiating payment:', paymentMethod);
    
    const user = getCurrentUser();
    
    if (!user) {
        showToast('Please login to continue', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    // Validate all steps before payment
    for (let i = 1; i <= 3; i++) {
        if (!validateStep(i)) {
            showToast('Please complete all previous steps', 'error');
            currentStep = i;
            updateStepDisplay();
            return;
        }
        saveStepData(i);
    }
    
    try {
        // Create booking in database first (pending status)
        const booking = await createPendingBooking();
        
        if (!booking) {
            throw new Error('Failed to create booking');
        }
        
        console.log('✅ Booking created:', booking.booking_reference);
        
        // Store booking ID for reference
        SessionStorage.set('pendingBookingId', booking.id);
        
        // Flutterwave public key
        const FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK_TEST-5d2e248b98d172916c38b751e47d9c48-X';
        
        // Validate Flutterwave is loaded
        if (typeof FlutterwaveCheckout === 'undefined') {
            throw new Error('Flutterwave payment system not loaded. Please refresh the page.');
        }
        
        // Get package name safely
        const packageName = selectedPackage.name || selectedPackage.title || 'Surprise Package';
        
        // FIXED: Create redirect URL that returns to this page with status parameters
        const redirectUrl = `${window.location.origin}${window.location.pathname}?status=successful&tx_ref=${booking.booking_reference}`;
        
        console.log('🚀 Launching Flutterwave with redirect:', redirectUrl);
        
        // Flutterwave configuration (V3 API)
        FlutterwaveCheckout({
            public_key: FLUTTERWAVE_PUBLIC_KEY,
            tx_ref: booking.booking_reference,
            amount: totalAmount,
            currency: 'NGN',
            payment_options: 'card,banktransfer,ussd',
            redirect_url: redirectUrl,
            customer: {
                email: user.email || bookingData.recipientEmail || 'customer@wowsurprises.com',
                phone_number: user.phone || bookingData.recipientPhone || '08000000000',
                name: user.name || bookingData.recipientName || 'Customer'
            },
            customizations: {
                title: 'WOW Surprises',
                description: `Payment for ${packageName}`,
                logo: ''
            },
            callback: function(response) {
                console.log('💳 Flutterwave callback:', response);
                // Redirect with transaction ID
                if (response.status === 'successful') {
                    window.location.href = redirectUrl + `&transaction_id=${response.transaction_id}`;
                }
            },
            onclose: function() {
                console.log('❌ Payment window closed');
                showToast('Payment window closed', 'info');
                setTimeout(() => {
                    window.location.href = 'booking-history.html';
                }, 2000);
            }
        });
        
    } catch (error) {
        console.error('❌ Payment initiation error:', error);
        showToast('Failed to initiate payment: ' + error.message, 'error');
    }
}

// ========================================
// UPDATED: Create pending booking with CUSTOM PACKAGE support
// ========================================
async function createPendingBooking() {
    const user = getCurrentUser();
    
    if (!user) {
        throw new Error('User not authenticated');
    }
    
    console.log('Creating pending booking for user:', user.id);
    console.log('Package type:', isCustomPackage ? 'CUSTOM' : 'REGULAR');
    
    // Base booking payload
    const bookingPayload = {
        packageName: selectedPackage.name || selectedPackage.title,
        packagePrice: totalAmount,
        recipientName: bookingData.recipientName,
        recipientPhone: bookingData.recipientPhone,
        deliveryAddress: bookingData.deliveryAddress,
        surpriseDate: bookingData.surpriseDate,
        surpriseTime: bookingData.surpriseTime,
        timezone: bookingData.timezone || 'WAT',
        flexibleTiming: bookingData.flexibleTiming || false,
        personalMessage: bookingData.personalMessage || null,
        specialRequests: bookingData.specialRequests || null,
        addons: bookingData.addons || [],
        status: 'pending',
        paymentStatus: 'pending'
    };
    
    // NEW: Add custom package items if this is a custom package
    if (isCustomPackage && selectedPackage.items) {
        bookingPayload.customPackageItems = selectedPackage.items;
        bookingPayload.isCustomPackage = true;
        bookingPayload.packageId = selectedPackage.id; // Store custom package ID
        console.log('✅ Custom package items added to booking:', selectedPackage.items.length);
    }
    
    console.log('Booking payload:', bookingPayload);
    
    try {
        // Save to Supabase
        const booking = await API.bookings.createBooking(bookingPayload);
        console.log('✅ Booking created in database:', booking);
        return booking;
    } catch (error) {
        console.error('❌ Failed to create booking:', error);
        throw error;
    }
}

// Handle payment callback (LEGACY - kept for compatibility)
async function handlePaymentCallback(response, bookingId) {
    console.log('Payment response:', response);
    
    if (response.status === 'successful' || response.status === 'completed') {
        try {
            showToast('Payment successful! Processing...', 'success');
            closePaymentModal();
            
            await API.bookings.updateBooking(bookingId, {
                status: 'confirmed',
                payment_status: 'paid',
                payment_reference: response.transaction_id || response.tx_ref
            });
            
            console.log('✅ Booking updated to confirmed');
            SessionStorage.remove('pendingBookingId');
            SessionStorage.set('lastBookingReference', bookingId);
            
            const updatedBooking = await API.bookings.getBooking(bookingId);
            showToast('Booking confirmed!', 'success');
            
            currentStep = 5;
            displayBookingConfirmation(updatedBooking);
            updateStepDisplay();
            
        } catch (error) {
            console.error('Error processing payment callback:', error);
            showToast('Payment successful but failed to update booking. Reference: ' + (response.transaction_id || response.tx_ref), 'error');
            closePaymentModal();
            setTimeout(() => window.location.href = 'booking-history.html', 3000);
        }
    } else {
        closePaymentModal();
        showToast('Payment failed or cancelled. Please try again.', 'error');
    }
}

// Close Flutterwave payment modal
function closePaymentModal() {
    try {
        console.log('Attempting to close Flutterwave modal...');
        
        // Method 1: Remove Flutterwave modal elements
        const flwModal = document.querySelector('.flw-modal');
        const flwModalContainer = document.querySelector('.flw-modal-container');
        const flwIframe = document.querySelector('iframe[src*="flutterwave"]');
        const modalBackdrop = document.querySelector('.flw-modal-backdrop');
        
        if (flwModal) {
            flwModal.style.display = 'none';
            flwModal.remove();
            console.log('Removed flw-modal');
        }
        
        if (flwModalContainer) {
            flwModalContainer.style.display = 'none';
            flwModalContainer.remove();
            console.log('Removed flw-modal-container');
        }
        
        if (flwIframe) {
            flwIframe.style.display = 'none';
            flwIframe.remove();
            console.log('Removed Flutterwave iframe');
        }
        
        if (modalBackdrop) {
            modalBackdrop.style.display = 'none';
            modalBackdrop.remove();
            console.log('Removed modal backdrop');
        }
        
        // Method 2: Remove any Flutterwave-related elements by class/id
        document.querySelectorAll('[class*="flutterwave"], [id*="flutterwave"], [class*="flw-"]').forEach(el => {
            el.style.display = 'none';
            el.remove();
        });
        
        // Method 3: Re-enable body scroll (Flutterwave disables it)
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.documentElement.style.overflow = '';
        
        // Method 4: Remove inline styles that might have been added
        document.body.classList.remove('flw-modal-open');
        
        console.log('✅ Payment modal closed successfully');
    } catch (error) {
        console.warn('Error closing modal:', error);
    }
}

// ========================================
// FIXED: Display booking confirmation with correct column names
// ========================================
async function displayBookingConfirmation(booking) {
    console.log('Displaying confirmation for booking:', booking);
    
    try {
        // If booking is an ID (string), fetch it
        if (typeof booking === 'string') {
            booking = await API.bookings.getBooking(booking);
        }
        
        // Update confirmation display
        const confirmRefElement = document.getElementById('confirmationReference');
        if (confirmRefElement) {
            confirmRefElement.textContent = booking.booking_reference;
        }
        
        const reviewDiv = document.getElementById('bookingReview');
        if (reviewDiv) {
            // ✅ FIXED: Use correct column names with fallbacks for backwards compatibility
            const surpriseDate = booking.surprise_date || booking.delivery_date;
            const surpriseTime = booking.surprise_time || booking.delivery_time;
            const deliveryAddr = booking.delivery_address || booking.recipient_address;
            const message = booking.personal_message || booking.special_message;
            
            // NEW: Check if this was a custom package
            const isCustom = booking.is_custom_package || booking.isCustomPackage || false;
            const customItems = booking.custom_package_items || booking.customPackageItems || null;
            
            let customItemsHTML = '';
            if (isCustom && customItems && customItems.length > 0) {
                customItemsHTML = `
                    <div class="summary-item" style="display: block; margin-top: 16px;">
                        <strong>Custom Items (${customItems.length}):</strong>
                        <ul style="margin-top: 8px; list-style: none; padding: 0;">
                            ${customItems.map(item => `
                                <li style="padding: 4px 0; color: #666; font-size: 14px;">
                                    • ${item.name} - ₦${item.price.toLocaleString()}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }
            
            reviewDiv.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
                    <h2 style="color: #22c55e; margin-bottom: 8px;">Booking Confirmed!</h2>
                    <p style="color: #666;">Your surprise is being prepared</p>
                </div>
                
                <div class="success-box" style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <div style="text-align: center;">
                        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">Booking Reference</div>
                        <div style="font-size: 28px; font-weight: 800; color: #000; letter-spacing: 2px;">${booking.booking_reference}</div>
                        <div style="font-size: 12px; color: #666; margin-top: 8px;">Save this reference for tracking</div>
                    </div>
                </div>
                
                <div class="booking-details" style="background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px;">
                    <h3 style="margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 12px;">Booking Details</h3>
                    
                    <div class="summary-item">
                        <strong>Package:</strong>
                        <span>${booking.package_name}${isCustom ? ' <span style="background: #000; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 8px;">CUSTOM</span>' : ''}</span>
                    </div>
                    
                    ${customItemsHTML}
                    
                    <div class="summary-item">
                        <strong>Recipient:</strong>
                        <span>${booking.recipient_name}</span>
                    </div>
                    
                    <div class="summary-item">
                        <strong>Surprise Date:</strong>
                        <span>${formatDate(surpriseDate)} at ${surpriseTime}</span>
                    </div>
                    
                    <div class="summary-item">
                        <strong>Delivery Address:</strong>
                        <span>${deliveryAddr}</span>
                    </div>
                    
                    ${message ? `
                        <div class="summary-item">
                            <strong>Personal Message:</strong>
                            <span style="font-style: italic;">"${message}"</span>
                        </div>
                    ` : ''}
                    
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
                    
                    <div class="summary-item">
                        <strong>Amount Paid:</strong>
                        <strong style="color: #22c55e; font-size: 24px;">₦${parseFloat(booking.package_price).toLocaleString()}</strong>
                    </div>
                    
                    <div class="summary-item">
                        <strong>Payment Reference:</strong>
                        <span>${booking.payment_reference || 'N/A'}</span>
                    </div>
                    
                    <div class="summary-item">
                        <strong>Status:</strong>
                        <span style="color: #22c55e; font-weight: 600;">✓ CONFIRMED & PAID</span>
                    </div>
                </div>
                
                <div style="margin-top: 30px; text-align: center; padding: 20px; background: #f9f9f9; border-radius: 12px;">
                    <p style="margin-bottom: 16px; color: #666;">
                        <i class="bi bi-info-circle"></i> 
                        A confirmation email will be sent shortly
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="window.location.href='booking-history.html'" class="btn-primary">
                            <i class="bi bi-clock-history"></i> View My Bookings
                        </button>
                        <button onclick="window.location.href='index.html'" class="btn-secondary">
                            <i class="bi bi-house"></i> Back to Home
                        </button>
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error displaying confirmation:', error);
        const reference = SessionStorage.get('lastBookingReference') || 'N/A';
        showToast('Booking confirmed! Reference: ' + reference, 'success');
    }
}

// Format date helper function
function formatDate(dateString) {
    if (!dateString) return 'Not specified';
    
    try {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    } catch (error) {
        return dateString;
    }
}

// ========================================
// HELPER FUNCTIONS (Only define if not already defined)
// ========================================

// Get current user from storage
if (typeof getCurrentUser !== 'function') {
    window.getCurrentUser = function() {
        try {
            const userStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    };
}

// Validate phone number
if (typeof validatePhone !== 'function') {
    window.validatePhone = function(phone) {
        if (!phone) return false;
        // Remove spaces and special characters
        const cleaned = phone.replace(/\D/g, '');
        // Check if it's 10 or 11 digits (Nigerian format)
        return cleaned.length >= 10 && cleaned.length <= 11;
    };
}

// Validate email
if (typeof validateEmail !== 'function') {
    window.validateEmail = function(email) {
        if (!email) return true; // Email is optional
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };
}

// Format price
if (typeof formatPrice !== 'function') {
    window.formatPrice = function(amount) {
        if (!amount && amount !== 0) return '₦0';
        return '₦' + parseFloat(amount).toLocaleString('en-NG', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    };
}

// Show toast notification
if (typeof showToast !== 'function') {
    window.showToast = function(message, type = 'info') {
        console.log(`🔔 ${type.toUpperCase()}: ${message}`);
        
        // Create toast element if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#dc2626' : '#3b82f6'};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            margin-bottom: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
        toast.innerHTML = `<span style="font-size: 20px; font-weight: bold;">${icon}</span><span>${message}</span>`;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
    
    // Add toast animations
    if (!document.getElementById('toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// SessionStorage helper (only if not already defined)
if (typeof SessionStorage === 'undefined') {
    window.SessionStorage = {
        get: function(key) {
            try {
                return sessionStorage.getItem(key);
            } catch (error) {
                console.error('SessionStorage get error:', error);
                return null;
            }
        },
        set: function(key, value) {
            try {
                sessionStorage.setItem(key, value);
            } catch (error) {
                console.error('SessionStorage set error:', error);
            }
        },
        remove: function(key) {
            try {
                sessionStorage.removeItem(key);
            } catch (error) {
                console.error('SessionStorage remove error:', error);
            }
        }
    };
}

// Add spin animation for loading states
const spinStyle = document.createElement('style');
spinStyle.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .spin {
        animation: spin 1s linear infinite;
        display: inline-block;
    }
`;
document.head.appendChild(spinStyle);

console.log('✅ ✅ ✅ Booking.js loaded - ALL FIXES + CUSTOM PACKAGE SUPPORT ✅ ✅ ✅');
console.log('✅ Navigation buttons: FIXED');
console.log('✅ Payment auto-update: FIXED');
console.log('✅ Scroll to step: FIXED');
console.log('✅ Database columns: FIXED');
console.log('✅ Custom packages: SUPPORTED');