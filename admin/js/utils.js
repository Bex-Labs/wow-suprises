/**
 * WOW Surprises - Utility Functions
 * Common utility functions used across the admin system
 */

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, info, warning)
 * @param {number} duration - Duration in milliseconds (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="bi bi-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Get icon for toast type
 */
function getToastIcon(type) {
    const icons = {
        success: 'check-circle-fill',
        error: 'x-circle-fill',
        warning: 'exclamation-triangle-fill',
        info: 'info-circle-fill'
    };
    return icons[type] || icons.info;
}

/**
 * Create toast container if it doesn't exist
 */
function createToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency symbol (default ₦)
 */
function formatCurrency(amount, currency = '₦') {
    if (!amount || isNaN(amount)) return `${currency}0`;
    return `${currency}${parseFloat(amount).toLocaleString('en-NG')}`;
}

/**
 * Format date
 * @param {string|Date} date - Date to format
 * @param {boolean} includeTime - Include time in format
 */
function formatDate(date, includeTime = false) {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return d.toLocaleDateString('en-NG', options);
}

/**
 * Format time
 * @param {string} time - Time to format (HH:MM:SS)
 */
function formatTime(time) {
    if (!time) return 'N/A';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    
    let hour = parseInt(parts[0]);
    const minute = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
}

/**
 * Get status badge HTML
 * @param {string} status - Status value
 * @param {string} type - Type of status (booking, payment, user)
 */
function getStatusBadge(status, type = 'booking') {
    if (!status) return '<span class="badge badge-secondary">Unknown</span>';
    
    const statusClasses = {
        booking: {
            pending: 'warning',
            confirmed: 'info',
            completed: 'success',
            cancelled: 'danger'
        },
        payment: {
            pending: 'warning',
            paid: 'success',
            refunded: 'info',
            failed: 'danger'
        },
        user: {
            active: 'success',
            suspended: 'danger',
            pending: 'warning'
        }
    };
    
    const typeMap = statusClasses[type] || {};
    const badgeClass = typeMap[status.toLowerCase()] || 'secondary';
    
    return `<span class="badge badge-${badgeClass}">${status}</span>`;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Truncate text
 * @param {string} text - Text to truncate
 * @param {number} length - Max length
 */
function truncateText(text, length = 50) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

/**
 * Get initials from name
 * @param {string} name - Full name
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Validate email
 * @param {string} email - Email to validate
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Validate phone number (Nigerian format)
 * @param {string} phone - Phone number to validate
 */
function isValidPhone(phone) {
    const re = /^(\+234|0)[789][01]\d{8}$/;
    return re.test(phone.replace(/\s/g, ''));
}

/**
 * Calculate percentage change
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 */
function calculatePercentageChange(current, previous) {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

/**
 * Generate random color
 */
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

/**
 * Confirm action dialog
 * @param {string} message - Confirmation message
 * @returns {boolean} User's choice
 */
function confirmAction(message) {
    return confirm(message);
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.showToast = showToast;
    window.formatCurrency = formatCurrency;
    window.formatDate = formatDate;
    window.formatTime = formatTime;
    window.getStatusBadge = getStatusBadge;
    window.debounce = debounce;
    window.truncateText = truncateText;
    window.getInitials = getInitials;
    window.isValidEmail = isValidEmail;
    window.isValidPhone = isValidPhone;
    window.calculatePercentageChange = calculatePercentageChange;
    window.getRandomColor = getRandomColor;
    window.confirmAction = confirmAction;
}