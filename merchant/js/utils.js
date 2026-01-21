// Utility Functions

// Format price to Nigerian Naira
function formatPrice(price) {
    return '₦' + price.toLocaleString('en-NG');
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Format date and time
function formatDateTime(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleString('en-US', options);
}

// Generate unique ID
function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate booking reference
function generateBookingReference() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let reference = 'WOW-';
    for (let i = 0; i < 8; i++) {
        reference += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return reference;
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate phone
function validatePhone(phone) {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Check if it has at least 10 digits
    return cleaned.length >= 10;
}

// Show toast notification
function showToast(message, type = 'info') {
    // Remove any existing toasts
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Set icon based on type
    let icon = '';
    if (type === 'success') {
        icon = '<i class="bi bi-check-circle-fill"></i>';
    } else if (type === 'error') {
        icon = '<i class="bi bi-x-circle-fill"></i>';
    } else {
        icon = '<i class="bi bi-info-circle-fill"></i>';
    }
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    // Set background color based on type
    let bgColor = '#0ea5e9'; // info - blue
    if (type === 'success') bgColor = '#22c55e'; // green
    if (type === 'error') bgColor = '#dc2626'; // red
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${bgColor};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 500;
        font-size: 15px;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animation for toast
const toastStyle = document.createElement('style');
toastStyle.textContent = `
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
    .toast i {
        font-size: 20px;
    }
`;
document.head.appendChild(toastStyle);

// Local Storage helpers
const Storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    },
    
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Storage error:', e);
            return null;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    }
};

// Session Storage helpers
const SessionStorage = {
    set(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Session storage error:', e);
            return false;
        }
    },
    
    get(key) {
        try {
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Session storage error:', e);
            return null;
        }
    },
    
    remove(key) {
        try {
            sessionStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Session storage error:', e);
            return false;
        }
    }
};

// Get query parameter
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Check if user is logged in
function isLoggedIn() {
    return Storage.get('currentUser') !== null || SessionStorage.get('currentUser') !== null;
}

// Get current user
function getCurrentUser() {
    return Storage.get('currentUser') || SessionStorage.get('currentUser');
}

// Logout user
function logoutUser() {
    Storage.remove('currentUser');
    SessionStorage.remove('currentUser');
    SessionStorage.remove('selectedPackageId');
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}