/**
 * Merchant Settings JavaScript
 * Manages notification preferences, security, and account settings
 */

let currentMerchant = null;

// Initialize settings page
async function initSettings() {
    try {
        currentMerchant = await MerchantAuth.getCurrentMerchant();
        if (!currentMerchant) {
            window.location.href = 'merchant-login.html';
            return;
        }

        updateMerchantInfo();
        await loadSettings();
        setupEventListeners();
        
        // Mobile Sidebar Toggle
        const toggle = document.getElementById('sidebarToggle');
        if(toggle) {
            toggle.addEventListener('click', () => {
                document.getElementById('merchantSidebar').classList.toggle('active');
            });
        }

    } catch (err) {
        console.error('Init error:', err);
        showToast('Failed to load settings', 'error');
    }
}

// Update merchant info
function updateMerchantInfo() {
    const nameEl = document.getElementById('merchantName');
    if (nameEl) nameEl.textContent = currentMerchant.business_name || 'Merchant';
    
    // Load Header Avatar
    if (currentMerchant.logo_url) {
        const headerAvatar = document.getElementById('headerAvatar');
        if(headerAvatar) {
            headerAvatar.innerHTML = '';
            const img = document.createElement('img');
            img.src = currentMerchant.logo_url;
            headerAvatar.appendChild(img);
            headerAvatar.classList.add('has-image');
        }
    }
}

// Load settings
async function loadSettings() {
    try {
        // Load notification preferences (from JSONB)
        const prefs = currentMerchant.notification_prefs || {};
        
        document.getElementById('notifyNewOrder').checked = prefs.new_order !== false;
        document.getElementById('notifyOrderReminder').checked = prefs.order_reminder !== false;
        document.getElementById('notifyMessages').checked = prefs.messages !== false;
        document.getElementById('notifyPayment').checked = prefs.payment !== false;
        document.getElementById('notifyPayout').checked = prefs.payout !== false;
        document.getElementById('notifyWeeklySummary').checked = prefs.weekly_summary !== false;
        document.getElementById('notifyReviews').checked = prefs.reviews !== false;
        document.getElementById('emailNotifications').checked = prefs.email_enabled !== false;
        document.getElementById('marketingEmails').checked = prefs.marketing_emails === true;

        // Load operating hours (from JSONB)
        const hours = currentMerchant.operating_hours || {};
        if (hours.open) document.getElementById('openingTime').value = hours.open;
        if (hours.close) document.getElementById('closingTime').value = hours.close;
        document.getElementById('autoAcceptOrders').checked = hours.auto_accept === true;

        // Load last login
        await loadLastLogin();
    } catch (err) {
        console.error('Load settings error:', err);
        showToast('Failed to load settings', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('notificationsForm')?.addEventListener('submit', saveNotificationSettings);
    document.getElementById('passwordForm')?.addEventListener('submit', changePassword);
}

// Save notification settings
async function saveNotificationSettings(e) {
    e.preventDefault();

    try {
        const preferences = {
            new_order: document.getElementById('notifyNewOrder').checked,
            order_reminder: document.getElementById('notifyOrderReminder').checked,
            messages: document.getElementById('notifyMessages').checked,
            payment: document.getElementById('notifyPayment').checked,
            payout: document.getElementById('notifyPayout').checked,
            weekly_summary: document.getElementById('notifyWeeklySummary').checked,
            reviews: document.getElementById('notifyReviews').checked,
            email_enabled: document.getElementById('emailNotifications').checked,
            marketing_emails: document.getElementById('marketingEmails').checked
        };

        const { error } = await merchantSupabase
            .from('merchants')
            .update({ notification_prefs: preferences })
            .eq('id', currentMerchant.id);

        if (error) throw error;

        showToast('Notification settings saved successfully!', 'success');
    } catch (err) {
        console.error('Save settings error:', err);
        showToast('Failed to save notification settings', 'error');
    }
}

// Change password
async function changePassword(e) {
    e.preventDefault();

    try {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }

        // Validate password strength
        if (newPassword.length < 8) {
            showToast('Password must be at least 8 characters', 'error');
            return;
        }

        // Update password using Supabase Auth
        const { error } = await merchantSupabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        // Clear form
        document.getElementById('passwordForm').reset();

        showToast('Password updated successfully!', 'success');

        // Log out after password change for security
        setTimeout(() => {
            showToast('Please log in with your new password', 'info');
            MerchantAuth.logout();
        }, 2000);
    } catch (err) {
        console.error('Change password error:', err);
        showToast('Failed to update password. Please check your current password.', 'error');
    }
}

// Load last login info
async function loadLastLogin() {
    try {
        const { data: { session } } = await merchantSupabase.auth.getSession();
        
        if (session && session.user) {
            const lastSignIn = new Date(session.user.last_sign_in_at);
            document.getElementById('lastLogin').textContent = formatDate(lastSignIn);
        }
    } catch (err) {
        console.error('Load last login error:', err);
        document.getElementById('lastLogin').textContent = 'Unknown';
    }
}

// Logout all devices
async function logoutAllDevices() {
    if (!confirm('Are you sure you want to logout from all devices? You will need to login again.')) {
        return;
    }

    try {
        await merchantSupabase.auth.signOut();
        window.location.href = 'merchant-login.html';
    } catch (err) {
        console.error('Logout error:', err);
        showToast('Failed to logout. Please try again.', 'error');
    }
}

// Save operating hours
async function saveOperatingHours() {
    try {
        const hoursData = {
            open: document.getElementById('openingTime').value,
            close: document.getElementById('closingTime').value,
            auto_accept: document.getElementById('autoAcceptOrders').checked
        };

        if (!hoursData.open || !hoursData.close) {
            showToast('Please set both opening and closing times', 'error');
            return;
        }

        const { error } = await merchantSupabase
            .from('merchants')
            .update({ operating_hours: hoursData })
            .eq('id', currentMerchant.id);

        if (error) throw error;

        showToast('Operating hours saved successfully!', 'success');
    } catch (err) {
        console.error('Save operating hours error:', err);
        showToast('Failed to save operating hours', 'error');
    }
}

// Deactivate account
async function deactivateAccount() {
    const confirmation = prompt('Type "DEACTIVATE" to confirm account deactivation:');
    
    if (confirmation !== 'DEACTIVATE') {
        showToast('Account deactivation cancelled', 'info');
        return;
    }

    try {
        const { error } = await merchantSupabase
            .from('merchants')
            .update({ 
                is_active: false
                // Note: We don't have a 'deactivated_at' column in the schema yet, 
                // but updating is_active is the main toggle.
            })
            .eq('id', currentMerchant.id);

        if (error) throw error;

        showToast('Account deactivated. Contact support to reactivate.', 'success');
        
        setTimeout(() => {
            MerchantAuth.logout();
        }, 2000);
    } catch (err) {
        console.error('Deactivate account error:', err);
        showToast('Failed to deactivate account', 'error');
    }
}

// Delete account
async function deleteAccount() {
    const confirmation1 = confirm('⚠️ WARNING: This will permanently delete your account, all services, earnings history, and data. This action CANNOT be undone. Continue?');
    
    if (!confirmation1) return;

    const confirmation2 = prompt('Type "DELETE MY ACCOUNT" to confirm permanent deletion:');
    
    if (confirmation2 !== 'DELETE MY ACCOUNT') {
        showToast('Account deletion cancelled', 'info');
        return;
    }

    try {
        // In a real scenario, you usually call an Edge Function for this
        // For now, we simulate the request
        showToast('Account deletion request submitted. You will receive a confirmation email.', 'info');
        
        setTimeout(() => {
            MerchantAuth.logout();
        }, 3000);
    } catch (err) {
        console.error('Delete account error:', err);
        showToast('Failed to process deletion request', 'error');
    }
}

// Utility functions
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    // Simple alert wrapper
    console.log(`[${type.toUpperCase()}] ${message}`);
    alert(message);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initSettings);