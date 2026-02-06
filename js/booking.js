// Booking Page JavaScript - COMPLETE PRODUCTION VERSION
// Fixes: FORCE SAVES data before submission to ensure Date/Time are never empty.

let currentStep = 1;
let selectedPackage = null;
let bookingData = {};
let totalAmount = 0;
let isCustomPackage = false; 

// ========================================
// GLOBAL EXPORTS
// ========================================
window.nextStep = nextStep;
window.prevStep = prevStep;
window.initiateFlutterwavePayment = initiateFlutterwavePayment;

console.log('🚀 Booking script loading...');

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing booking page...');
    
    // 1. CATCH PACKAGE ID FROM URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlPackageId = urlParams.get('packageId') || urlParams.get('service_id');
    
    if (urlPackageId) {
        const cleanId = urlPackageId.replace(/['"]/g, '').trim();
        console.log("🔗 Caught Package ID:", cleanId);
        sessionStorage.setItem('selectedPackageId', cleanId);
        if(typeof SessionStorage !== 'undefined') SessionStorage.set('selectedPackageId', cleanId);
    }

    // 2. Check Payment Return
    await checkPaymentReturn();
    
    // 3. Load Data
    checkAuthAndLoadPackage();
    
    // 4. Setup UI
    setupFormValidation();
    setMinDate();
    
    console.log('✅ All initialization complete');
});

// ========================================
// PAYMENT RETURN HANDLER
// ========================================
async function checkPaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const txRef = urlParams.get('tx_ref');
    const transactionId = urlParams.get('transaction_id');
    
    if (status && txRef) {
        try {
            showToast('Verifying payment...', 'info');
            
            let attempts = 0;
            while (typeof window.sbClient === 'undefined' && attempts < 10) {
                await new Promise(r => setTimeout(r, 200));
                attempts++;
            }

            const { data: booking } = await window.sbClient
                .from('bookings')
                .select('*')
                .eq('booking_reference', txRef)
                .single();
            
            if (!booking) {
                console.error('❌ Booking not found:', txRef);
                return;
            }
            
            if (status === 'successful' || status === 'completed') {
                await window.sbClient.from('bookings').update({
                    status: 'confirmed',
                    payment_status: 'paid',
                    payment_reference: transactionId || txRef,
                    flutterwave_reference: transactionId
                }).eq('id', booking.id);
                
                currentStep = 5;
                displayBookingConfirmation(booking);
                updateStepDisplay();
                showToast('Payment successful!', 'success');
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                showToast('Payment failed.', 'error');
                await window.sbClient.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
            }
        } catch (error) {
            console.error('Payment verify error:', error);
        }
    }
}

// ========================================
// AUTH & LOAD LOGIC
// ========================================
function checkAuthAndLoadPackage() {
    const user = getCurrentUser();
    if (!user) {
        const pkgId = sessionStorage.getItem('selectedPackageId');
        if(pkgId) sessionStorage.setItem('redirect_after_login', 'booking.html');
        showToast('Please login to continue', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }
    loadSelectedPackage();
}

async function loadSelectedPackage() {
    let rawId = sessionStorage.getItem('selectedPackageId');
    if (!rawId) {
        showToast('No package selected.', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    const packageId = rawId.replace(/['"]/g, '').trim();
    
    try {
        if (packageId.startsWith('custom_')) {
            await loadCustomPackage();
            return;
        }
        
        let attempts = 0;
        while (typeof window.sbClient === 'undefined' && attempts < 15) {
            await new Promise(r => setTimeout(r, 200));
            attempts++;
        }

        if (window.sbClient) {
            const { data, error } = await window.sbClient
                .from('merchant_services')
                .select('*')
                .eq('id', packageId)
                .maybeSingle();
                
            if (data) {
                selectedPackage = {
                    id: data.id,
                    name: data.service_name || data.name,
                    title: data.service_name || data.name,
                    price: parseFloat(data.base_price || data.price || 0),
                    description: data.description || '',
                    category: data.category
                };
            }
        }
        
        if (!selectedPackage) {
            const mockPackages = getMockPackages();
            selectedPackage = mockPackages.find(p => p.id === packageId);
        }
        
        if (!selectedPackage) {
            selectedPackage = {
                id: packageId,
                name: "Selected Service",
                price: 0, 
                description: "Service details loaded from reference."
            };
        }
        
        isCustomPackage = false;
        totalAmount = parseFloat(selectedPackage.price || 0);
        
        if(document.getElementById('packageSummary')) {
            displayPackageSummary();
            updatePaymentAmounts();
        }
        
    } catch (error) {
        console.error('Load Error:', error);
        showToast('Error loading package', 'error');
    }
}

async function loadCustomPackage() {
    const dataStr = sessionStorage.getItem('customPackageData');
    if (!dataStr) {
        window.location.href = 'custom-package.html';
        return;
    }
    const customData = JSON.parse(dataStr);
    selectedPackage = {
        id: customData.id,
        name: 'Custom Package',
        title: 'Custom Package',
        price: parseFloat(customData.price || 0),
        items: customData.items,
        category: 'custom'
    };
    isCustomPackage = true;
    totalAmount = parseFloat(selectedPackage.price);
    displayCustomPackageSummary();
    updatePaymentAmounts();
}

// ========================================
// DISPLAY FUNCTIONS
// ========================================
function displayCustomPackageSummary() {
    const summary = document.getElementById('packageSummary');
    if (!summary) return;
    const itemsCount = selectedPackage.items ? selectedPackage.items.length : 0;
    summary.innerHTML = `
        <div class="card">
            <h3>Custom Package</h3>
            <p>${itemsCount} items selected</p>
            <strong>Total: ${formatPrice(totalAmount)}</strong>
        </div>`;
}

function displayPackageSummary() {
    const summary = document.getElementById('packageSummary');
    if (!summary) return;
    const name = selectedPackage.name || selectedPackage.title;
    summary.innerHTML = `
        <div class="card" style="margin-bottom:20px; border:1px solid #e0e0e0; padding:20px;">
            <h3>Booking Summary</h3>
            <div style="display:flex; justify-content:space-between; margin:10px 0;">
                <span>Package:</span> <strong>${name}</strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <span>Total:</span> <strong id="totalAmount">${formatPrice(totalAmount)}</strong>
            </div>
            <div id="addonsTotal" style="display:none; color:#666; font-size:0.9em; margin-top:5px;">
                + Add-ons: <span id="addonsPrice">₦0</span>
            </div>
        </div>`;
}

function updatePaymentAmounts() {
    document.querySelectorAll('.payment-amount').forEach(el => {
        el.textContent = totalAmount.toLocaleString();
    });
}

// ========================================
// NAVIGATION & VALIDATION
// ========================================
function nextStep() {
    if (!validateStep(currentStep)) return;
    saveStepData(currentStep);
    if (currentStep < 5) {
        currentStep++;
        updateStepDisplay();
        if (currentStep === 4) updatePaymentAmounts();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
}

function updateStepDisplay() {
    document.querySelectorAll('.step').forEach((el, idx) => {
        el.classList.remove('active', 'completed');
        if (idx + 1 < currentStep) el.classList.add('completed');
        else if (idx + 1 === currentStep) el.classList.add('active');
    });
    
    document.querySelectorAll('.form-step').forEach((el, idx) => {
        el.classList.remove('active');
        if (idx + 1 === currentStep) el.classList.add('active');
    });
    
    const container = document.querySelector('.booking-container');
    if(container) container.scrollIntoView({ behavior: 'smooth' });
}

function validateStep(step) {
    const section = document.querySelector(`.form-step[data-step="${step}"]`);
    if (!section) return true;
    
    let isValid = true;
    section.querySelectorAll('[required]').forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = '#dc2626';
            isValid = false;
        } else {
            field.style.borderColor = '#e0e0e0';
        }
    });
    
    if (!isValid) showToast('Please fill all required fields', 'error');
    return isValid;
}

function saveStepData(step) {
    // We access elements safely to prevent crashes if IDs are missing
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };

    if (step === 1 || step === 'all') {
        bookingData.recipientName = getVal('recipientName');
        bookingData.recipientPhone = getVal('recipientPhone');
        bookingData.deliveryAddress = getVal('deliveryAddress');
        bookingData.recipientEmail = getVal('recipientEmail');
    } 
    
    if (step === 2 || step === 'all') {
        bookingData.surpriseDate = getVal('surpriseDate');
        bookingData.surpriseTime = getVal('surpriseTime');
        bookingData.timezone = getVal('timezone');
    } 
    
    if (step === 3 || step === 'all') {
        bookingData.personalMessage = getVal('personalMessage');
        bookingData.specialRequests = getVal('specialRequests');
        
        let addonsSum = 0;
        const addonsList = [];
        document.querySelectorAll('input[name="addons"]:checked').forEach(cb => {
            const p = parseFloat(cb.dataset.price);
            addonsSum += p;
            addonsList.push({ id: cb.value, price: p });
        });
        
        bookingData.addons = addonsList;
        bookingData.addonsTotal = addonsSum;
        totalAmount = parseFloat(selectedPackage.price) + addonsSum;
        
        const totalEl = document.getElementById('totalAmount');
        const addonsRow = document.getElementById('addonsTotal');
        const addonsPrice = document.getElementById('addonsPrice');
        
        if(totalEl) totalEl.innerText = formatPrice(totalAmount);
        if(addonsSum > 0 && addonsRow) {
            addonsRow.style.display = 'block';
            addonsPrice.innerText = formatPrice(addonsSum);
        }
    }
}

function setMinDate() {
    const el = document.getElementById('surpriseDate');
    if (el) {
        const d = new Date(); d.setDate(d.getDate() + 1);
        el.min = d.toISOString().split('T')[0];
    }
}

function setupFormValidation() {
    document.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', () => el.style.borderColor = '#e0e0e0');
    });
}

// ========================================
// PAYMENT LOGIC
// ========================================
async function initiateFlutterwavePayment(method) {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // ★ FORCE SAVE ALL STEPS NOW ★ 
    // This ensures no data is left behind in the DOM inputs
    saveStepData('all'); 
    
    // Validate
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
        showToast('Please complete all steps', 'error');
        return;
    }
    
    try {
        const booking = await createPendingBooking();
        
        if (!booking) throw new Error('Booking creation failed');
        
        // Flutterwave Config
        const FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK_TEST-5d2e248b98d172916c38b751e47d9c48-X';
        const redirectUrl = `${window.location.origin}${window.location.pathname}?status=successful&tx_ref=${booking.booking_reference}`;
        
        FlutterwaveCheckout({
            public_key: FLUTTERWAVE_PUBLIC_KEY,
            tx_ref: booking.booking_reference,
            amount: totalAmount,
            currency: 'NGN',
            payment_options: 'card,banktransfer,ussd',
            redirect_url: redirectUrl,
            customer: {
                email: user.email,
                phone_number: user.phone || bookingData.recipientPhone,
                name: user.name || bookingData.recipientName
            },
            customizations: {
                title: 'WOW Surprises',
                description: `Payment for ${selectedPackage.name}`,
                logo: ''
            }
        });
        
    } catch (error) {
        console.error('Payment Init Error:', error);
        showToast('Could not initiate payment.', 'error');
    }
}

// =========================================================
// ★ DATABASE MAPPING - RECORDS BOTH DATES ★
// =========================================================
async function createPendingBooking() {
    const user = getCurrentUser();
    const now = new Date(); // Current timestamp for booking_date/time
    
    console.log("📝 Generating Booking Payload...");
    console.log("📅 Delivery Date Captured:", bookingData.surpriseDate); // Debug check

    const bookingPayload = {
        user_id: user.id,
        package_name: selectedPackage.name || selectedPackage.title,
        recipient_name: bookingData.recipientName,
        recipient_phone: bookingData.recipientPhone,
        recipient_address: bookingData.deliveryAddress,
        recipient_email: bookingData.recipientEmail,
        
        // 1. DELIVERY SCHEDULE (Future)
        // We populate ALL known columns to be safe (Shotgun approach)
        delivery_date: bookingData.surpriseDate || null,        
        delivery_time: bookingData.surpriseTime || null,        
        surprise_date: bookingData.surpriseDate || null,        
        surprise_time: bookingData.surpriseTime || null,        
        
        // 2. BOOKING TIMESTAMP (Now)
        booking_date: now.toISOString().split('T')[0],  // Explicitly sets today's date
        booking_time: now.toTimeString().split(' ')[0], // Explicitly sets current time
        
        timezone: bookingData.timezone,
        flexible_timing: bookingData.flexibleTiming,
        
        personal_message: bookingData.personalMessage,
        special_requests: bookingData.specialRequests,
        
        package_price: totalAmount,
        total_amount: totalAmount,
        status: 'pending',
        payment_status: 'pending',
        booking_reference: 'BK-' + Date.now().toString().slice(-8),
        addons: bookingData.addons || []
    };
    
    if (isCustomPackage) {
        bookingPayload.is_custom_package = true; 
        bookingPayload.package_id = null;
    } else if (isUUID(selectedPackage.id)) {
        bookingPayload.package_id = selectedPackage.id;
    }
    
    console.log("📤 Payload sending to DB:", bookingPayload);

    const { data, error } = await window.sbClient
        .from('bookings')
        .insert([bookingPayload])
        .select()
        .single();
        
    if (error) {
        console.error('❌ DB Insert Error:', error);
        throw error;
    }
    
    console.log('✅ Booking successfully created in DB:', data);
    return data;
}

async function displayBookingConfirmation(booking) {
    const refEl = document.getElementById('confirmationReference');
    if(refEl) refEl.textContent = booking.booking_reference;
    
    const reviewDiv = document.getElementById('bookingReview');
    if (reviewDiv) {
        // Use DB column names for display (prefer delivery_date now)
        const sDate = booking.delivery_date || booking.surprise_date;
        const sTime = booking.delivery_time || booking.surprise_time;
        const sAddr = booking.recipient_address;
        
        reviewDiv.innerHTML = `
            <div style="text-align:center; padding:20px;">
                <div style="font-size:3rem; margin-bottom:10px;">🎉</div>
                <h3 style="margin-bottom:20px;">Booking Confirmed!</h3>
                <p>Reference: <strong>${booking.booking_reference}</strong></p>
                <div style="margin-top:20px; text-align:left; background:#f9f9f9; padding:20px; border-radius:10px;">
                    <p><strong>Package:</strong> ${booking.package_name}</p>
                    <p><strong>Scheduled Delivery:</strong> ${formatDate(sDate)} at ${sTime}</p>
                    <p><strong>Address:</strong> ${sAddr}</p>
                    <p><strong>Total Paid:</strong> ${formatPrice(booking.package_price)}</p>
                </div>
            </div>
        `;
    }
}

// ========================================
// HELPERS
// ========================================
function getCurrentUser() {
    const u = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    return u ? JSON.parse(u) : null;
}

function formatPrice(val) {
    return '₦' + parseFloat(val).toLocaleString('en-NG', {
        minimumFractionDigits: 0, maximumFractionDigits: 2
    });
}

function showToast(msg, type='info') {
    const div = document.createElement('div');
    const color = type === 'error' ? '#dc2626' : '#22c55e';
    div.style.cssText = `
        position:fixed; top:20px; right:20px; 
        background:${color}; color:white; 
        padding:15px 25px; border-radius:8px; 
        box-shadow:0 4px 12px rgba(0,0,0,0.15); 
        z-index:9999; font-weight:500;
        animation: slideIn 0.3s ease-out;
    `;
    div.innerHTML = `<i class="bi bi-info-circle"></i> ${msg}`;
    document.body.appendChild(div);
    setTimeout(() => {
        if(div.parentNode) div.parentNode.removeChild(div);
    }, 3500);
}

if(!document.getElementById('toast-anim')) {
    const s = document.createElement('style');
    s.id = 'toast-anim';
    s.innerHTML = `@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`;
    document.head.appendChild(s);
}

function validatePhone(p) {
    if(!p) return false;
    const clean = p.replace(/\D/g,'');
    return clean.length >= 10 && clean.length <= 14;
}

function getMockPackages() {
    return [
        { id: 'pkg001', name: 'Romantic Dinner', price: 75000 },
        { id: 'pkg002', name: 'Birthday Bash', price: 150000 },
        { id: 'pkg003', name: 'Proposal', price: 350000 }
    ];
}

if (typeof SessionStorage === 'undefined') {
    window.SessionStorage = {
        get: (k) => sessionStorage.getItem(k),
        set: (k, v) => sessionStorage.setItem(k, v),
        remove: (k) => sessionStorage.removeItem(k)
    };
}