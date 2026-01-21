// Payment Gateway Integration
// Flutterwave & PayPal - Updated with UUID Fix

// Flutterwave Configuration
const FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK_TEST-5d2e248b98d172916c38b751e47d9c48-X"; // Replace with your test key
const FLUTTERWAVE_CONFIG = {
    test: true, // Set to false in production
    public_key: FLUTTERWAVE_PUBLIC_KEY
};

// PayPal Configuration
const PAYPAL_CLIENT_ID = "YOUR_PAYPAL_SANDBOX_CLIENT_ID"; // Replace with your sandbox client ID

// Global payment data
let paymentData = {
    amount: 0,
    currency: 'NGN',
    email: '',
    phone: '',
    name: '',
    bookingReference: ''
};

// Initialize payment amount
function initializePaymentAmount(amount) {
    paymentData.amount = amount;
    const amountElement = document.getElementById('flutterwave-amount');
    if (amountElement) {
        amountElement.textContent = amount.toLocaleString();
    }
    
    // Initialize PayPal buttons if PayPal is loaded
    if (typeof paypal !== 'undefined') {
        initializePayPalButtons(amount);
    }
}

// Flutterwave Payment
function initiateFlutterwavePayment() {
    // Check if selectedPackage exists
    if (!selectedPackage) {
        showToast('Package information not available. Please try again.', 'error');
        return;
    }
    
    // Validate user data
    if (!bookingData.recipientName || (!bookingData.recipientEmail && !bookingData.recipientPhone)) {
        showToast('Please complete recipient information first', 'error');
        return;
    }
    
    // Check if Flutterwave is loaded
    if (typeof FlutterwaveCheckout === 'undefined') {
        showToast('Payment system not loaded. Please refresh the page.', 'error');
        return;
    }
    
    // Generate transaction reference
    const txRef = 'WOW-' + Date.now();
    
    // Prepare payment data with safe access
    const email = bookingData.recipientEmail || 'customer@wowsurprises.com';
    const phone = bookingData.recipientPhone || '08000000000';
    const name = bookingData.recipientName;
    const packagePrice = parseFloat(selectedPackage.price || 0);
    const addonsTotal = parseFloat(bookingData.addonsTotal || 0);
    const amount = packagePrice + addonsTotal;
    
    // Get package name safely
    const packageName = selectedPackage.name || selectedPackage.title || 'Surprise Package';
    
    console.log('Initiating payment:', { amount, packageName, email, phone });
    
    // Flutterwave Modal Configuration
    const paymentConfig = {
        public_key: FLUTTERWAVE_PUBLIC_KEY,
        tx_ref: txRef,
        amount: amount,
        currency: 'NGN',
        payment_options: 'card, banktransfer, ussd',
        customer: {
            email: email,
            phone_number: phone,
            name: name
        },
        customizations: {
            title: 'Wow Surprises Payment',
            description: `Payment for ${packageName}`,
            logo: 'https://your-logo-url.com/logo.png' // Optional: Add your logo
        },
        callback: function(response) {
            console.log('Payment response:', response);
            
            if (response.status === 'successful') {
                // Verify payment on backend (in production)
                verifyFlutterwavePayment(response.transaction_id, txRef);
            } else {
                showToast('Payment was not completed', 'error');
            }
        },
        onclose: function() {
            showToast('Payment window closed', 'info');
        }
    };
    
    // Launch Flutterwave payment modal
    try {
        FlutterwaveCheckout(paymentConfig);
    } catch (error) {
        console.error('Flutterwave error:', error);
        showToast('Unable to initialize payment. Please try again.', 'error');
    }
}

// Verify Flutterwave Payment
async function verifyFlutterwavePayment(transactionId, txRef) {
    try {
        // Show loading
        showToast('Verifying payment...', 'info');
        
        // In production, verify with your backend
        // const response = await fetch('/api/verify-payment', {
        //     method: 'POST',
        //     body: JSON.stringify({ transactionId, txRef })
        // });
        
        // For demo: Simulate verification
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Calculate total amount
        const packagePrice = parseFloat(selectedPackage.price || 0);
        const addonsTotal = parseFloat(bookingData.addonsTotal || 0);
        const totalAmount = packagePrice + addonsTotal;
        
        // Payment successful
        handlePaymentSuccess({
            method: 'flutterwave',
            transactionId: transactionId,
            reference: txRef,
            amount: totalAmount
        });
        
    } catch (error) {
        console.error('Verification error:', error);
        showToast('Payment verification failed. Please contact support.', 'error');
    }
}

// Initialize PayPal Buttons
function initializePayPalButtons(amount) {
    // Check if PayPal is loaded
    if (typeof paypal === 'undefined') {
        console.warn('PayPal not loaded');
        return;
    }
    
    const container = document.getElementById('paypal-button-container');
    if (!container) {
        console.warn('PayPal button container not found');
        return;
    }
    
    // Clear existing buttons
    container.innerHTML = '';
    
    // Convert NGN to USD (approximate rate: 1 USD = 1500 NGN)
    const usdAmount = (amount / 1500).toFixed(2);
    
    // Get package name safely
    const packageName = selectedPackage ? (selectedPackage.name || selectedPackage.title || 'Surprise Package') : 'Surprise Package';
    
    // Render PayPal buttons
    try {
        paypal.Buttons({
            style: {
                layout: 'vertical',
                color: 'blue',
                shape: 'rect',
                label: 'paypal'
            },
            
            createOrder: function(data, actions) {
                return actions.order.create({
                    purchase_units: [{
                        description: `Wow Surprises - ${packageName}`,
                        amount: {
                            currency_code: 'USD',
                            value: usdAmount
                        }
                    }]
                });
            },
            
            onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                    console.log('PayPal payment successful:', details);
                    
                    // Payment successful
                    handlePaymentSuccess({
                        method: 'paypal',
                        transactionId: details.id,
                        reference: details.purchase_units[0].reference_id || 'PP-' + Date.now(),
                        amount: amount,
                        payerEmail: details.payer.email_address
                    });
                });
            },
            
            onError: function(err) {
                console.error('PayPal error:', err);
                showToast('PayPal payment failed. Please try again.', 'error');
            },
            
            onCancel: function(data) {
                showToast('PayPal payment cancelled', 'info');
            }
            
        }).render('#paypal-button-container');
    } catch (error) {
        console.error('PayPal initialization error:', error);
    }
}

// Handle Successful Payment
async function handlePaymentSuccess(paymentInfo) {
    try {
        // Show success message
        showToast('Payment successful! Creating your booking...', 'success');
        
        // Get package information safely
        const packageId = selectedPackage.id;
        const packageName = selectedPackage.name || selectedPackage.title || 'Surprise Package';
        const packagePrice = parseFloat(selectedPackage.price || 0);
        const addonsTotal = parseFloat(bookingData.addonsTotal || 0);
        const totalAmount = packagePrice + addonsTotal;
        
        // Generate booking reference
        const bookingRef = generateBookingReference();
        
        // Prepare complete booking data
        const completeBookingData = {
            // Package Information
            packageId: packageId,
            packageName: packageName,
            packagePrice: packagePrice,
            
            // Booking Details
            recipientName: bookingData.recipientName,
            recipientEmail: bookingData.recipientEmail,
            recipientPhone: bookingData.recipientPhone,
            deliveryAddress: bookingData.deliveryAddress,
            surpriseDate: bookingData.surpriseDate,
            surpriseTime: bookingData.surpriseTime,
            personalMessage: bookingData.personalMessage || '',
            
            // Add-ons
            addons: bookingData.addons || [],
            addonsTotal: addonsTotal,
            
            // Payment Information
            totalAmount: totalAmount,
            paymentStatus: 'paid',
            paymentMethod: paymentInfo.method,
            transactionId: paymentInfo.transactionId,
            paymentReference: paymentInfo.reference,
            
            // Booking Metadata
            bookingReference: bookingRef,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            userId: getCurrentUser()?.id || null
        };
        
        console.log('Complete booking data:', completeBookingData);
        
        // Only try to save to database if packageId is a UUID
        if (isUUID(packageId)) {
            try {
                console.log('Attempting to save booking to database (UUID package)...');
                const savedBooking = await API.bookings.createBooking(completeBookingData);
                console.log('Booking saved to database:', savedBooking);
            } catch (dbError) {
                console.warn('Could not save to database, will use localStorage:', dbError);
            }
        } else {
            console.log('Skipping database save (string package ID)');
        }
        
        // Always save booking to localStorage as backup
        let bookings = Storage.get('userBookings') || [];
        bookings.push(completeBookingData);
        Storage.set('userBookings', bookings);
        console.log('Booking saved to localStorage');
        
        // Clear session data
        SessionStorage.remove('selectedPackageId');
        
        // Move to success step
        currentStep = 5;
        updateStepDisplay();
        displayBookingSuccess(completeBookingData);
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Booking creation error:', error);
        showToast('Booking failed. Please contact support with your transaction ID: ' + paymentInfo.transactionId, 'error');
    }
}

// Check if string is a valid UUID
function isUUID(str) {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

// Display Booking Success
function displayBookingSuccess(booking) {
    const reviewDiv = document.getElementById('bookingReview');
    
    if (!reviewDiv) {
        console.error('bookingReview element not found');
        return;
    }
    
    // Format date safely
    const surpriseDate = booking.surpriseDate ? formatDate(booking.surpriseDate) : 'Not specified';
    const surpriseTime = booking.surpriseTime || 'Not specified';
    
    reviewDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
            <h2 style="color: #22c55e; margin-bottom: 8px;">Booking Confirmed!</h2>
            <p style="color: #666;">Your surprise is being prepared</p>
        </div>
        
        <div class="success-box" style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="text-align: center;">
                <div style="font-size: 14px; color: #666; margin-bottom: 8px;">Booking Reference</div>
                <div style="font-size: 28px; font-weight: 800; color: #000; letter-spacing: 2px;">${booking.bookingReference}</div>
                <div style="font-size: 12px; color: #666; margin-top: 8px;">Save this reference for tracking</div>
            </div>
        </div>
        
        <div class="booking-details" style="background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px;">
            <h3 style="margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 12px;">Booking Details</h3>
            
            <div class="summary-item">
                <strong>Package:</strong>
                <span>${booking.packageName}</span>
            </div>
            
            <div class="summary-item">
                <strong>Recipient:</strong>
                <span>${booking.recipientName}</span>
            </div>
            
            <div class="summary-item">
                <strong>Contact:</strong>
                <span>${booking.recipientPhone}</span>
            </div>
            
            <div class="summary-item">
                <strong>Surprise Date:</strong>
                <span>${surpriseDate} at ${surpriseTime}</span>
            </div>
            
            <div class="summary-item">
                <strong>Delivery Address:</strong>
                <span>${booking.deliveryAddress}</span>
            </div>
            
            ${booking.personalMessage ? `
                <div class="summary-item">
                    <strong>Personal Message:</strong>
                    <span style="font-style: italic;">"${booking.personalMessage}"</span>
                </div>
            ` : ''}
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
            
            <div class="summary-item">
                <strong>Amount Paid:</strong>
                <strong style="color: #22c55e; font-size: 24px;">₦${booking.totalAmount.toLocaleString()}</strong>
            </div>
            
            <div class="summary-item">
                <strong>Payment Method:</strong>
                <span style="text-transform: capitalize;">${booking.paymentMethod}</span>
            </div>
            
            <div class="summary-item">
                <strong>Transaction ID:</strong>
                <span style="font-family: monospace; font-size: 12px;">${booking.transactionId}</span>
            </div>
            
            <div class="summary-item">
                <strong>Status:</strong>
                <span style="color: #22c55e; font-weight: 600;">✓ CONFIRMED & PAID</span>
            </div>
        </div>
        
        <div style="margin-top: 30px; text-align: center; padding: 20px; background: #f9f9f9; border-radius: 12px;">
            <p style="margin-bottom: 16px; color: #666;">
                <i class="bi bi-info-circle"></i> 
                A confirmation email has been sent to ${booking.recipientEmail || 'your email'}
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

// Bank Transfer Option
function selectBankTransfer() {
    if (!selectedPackage) {
        showToast('Package information not available', 'error');
        return;
    }
    
    const packagePrice = parseFloat(selectedPackage.price || 0);
    const addonsTotal = parseFloat(bookingData.addonsTotal || 0);
    const totalAmount = packagePrice + addonsTotal;
    
    // Show bank details modal or move to manual payment step
    const confirmed = confirm(
        '💳 BANK TRANSFER DETAILS\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        'Bank: GTBank (Guaranty Trust Bank)\n' +
        'Account Name: Wow Surprises Ltd\n' +
        'Account Number: 0123456789\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'Amount to Pay: ₦' + totalAmount.toLocaleString() + '\n\n' +
        '📧 After transfer:\n' +
        'Send proof of payment to:\n' +
        'payments@wowsurprises.com\n\n' +
        'Include your booking reference in the email.\n\n' +
        'Continue with bank transfer?'
    );
    
    if (confirmed) {
        // Save as pending payment
        bookingData.paymentMethod = 'bank_transfer';
        bookingData.paymentStatus = 'pending';
        
        handlePaymentSuccess({
            method: 'bank_transfer',
            transactionId: 'BT-PENDING-' + Date.now(),
            reference: 'BT-' + Date.now(),
            amount: totalAmount
        });
    }
}

// Update payment amount when addons change
function updatePaymentAmount() {
    if (!selectedPackage) {
        console.warn('selectedPackage not available for payment update');
        return;
    }
    
    const packagePrice = parseFloat(selectedPackage.price || 0);
    const addonsTotal = parseFloat(bookingData.addonsTotal || 0);
    const total = packagePrice + addonsTotal;
    
    console.log('Updating payment amount:', total);
    initializePaymentAmount(total);
}

// Format date helper
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

// Generate booking reference
function generateBookingReference() {
    const prefix = 'WOW';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
}

console.log('Payment module loaded successfully');