/**
 * Admin Settings JavaScript - COMPLETE WORKING VERSION
 * Profile management, password changes, and system configuration
 * With Supabase Storage for profile pictures
 */

let currentAdmin = null;
let profilePictureFile = null;
let originalAvatarUrl = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Settings page initializing...');
    
    // Protect admin route
    const isAuth = await protectAdminRoute();
    if (!isAuth) return;
    
    // Load admin profile
    await loadAdminProfile();
    
    // Load saved settings
    loadNotificationPreferences();
    loadBusinessInfo();
    loadSystemConfig();
    
    // Setup password validation
    setupPasswordValidation();
    
    console.log('✅ Settings page ready');
});

// ==========================================
// PROFILE MANAGEMENT
// ==========================================

// Load admin profile
async function loadAdminProfile() {
    try {
        const sb = getSupabaseAdmin();
        
        // Get current user
        const { data: { user }, error: authError } = await sb.auth.getUser();
        if (authError) throw authError;
        
        if (!user) {
            window.location.href = 'admin-login-supabase.html';
            return;
        }
        
        // Get profile from database
        const { data: profile, error: profileError } = await sb
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (profileError) throw profileError;
        
        currentAdmin = { ...profile, auth_email: user.email };
        originalAvatarUrl = profile.avatar_url;
        
        // Update header name
        const nameEl = document.getElementById('adminName');
        if (nameEl) nameEl.textContent = profile.full_name || profile.name || 'Admin';
        
        // Populate form fields
        document.getElementById('profileFullName').value = profile.full_name || profile.name || '';
        document.getElementById('profileEmail').value = profile.email || user.email || '';
        document.getElementById('profilePhone').value = profile.phone || '';
        document.getElementById('profileRole').value = profile.role === 'admin' ? 'Administrator' : 'User';
        
        // Load profile picture
        const pictureEl = document.getElementById('currentPicture');
        if (profile.avatar_url) {
            pictureEl.innerHTML = `<img src="${profile.avatar_url}" alt="Profile Picture">`;
        } else {
            pictureEl.innerHTML = '<i class="bi bi-person-circle"></i>';
        }
        
        console.log('✅ Admin profile loaded:', profile.full_name || profile.email);
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile: ' + error.message, 'error');
    }
}

// Switch tabs
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.settings-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tabContent = document.getElementById(`${tabName}Tab`);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    // Add active to clicked button
    event.target.closest('.tab-btn').classList.add('active');
}

// Preview profile picture
function previewProfilePicture(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showToast('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'error');
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('Image size must be less than 2MB', 'error');
        return;
    }
    
    profilePictureFile = file;
    
    // Preview image
    const reader = new FileReader();
    reader.onload = function(e) {
        const pictureEl = document.getElementById('currentPicture');
        pictureEl.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
    };
    reader.readAsDataURL(file);
    
    showToast('Image selected. Click "Save Changes" to upload.', 'info');
}

// Upload profile picture to Supabase Storage
async function uploadProfilePicture() {
    if (!profilePictureFile || !currentAdmin) return null;
    
    try {
        const sb = getSupabaseAdmin();
        
        // Generate unique filename
        const fileExt = profilePictureFile.name.split('.').pop();
        const fileName = `${currentAdmin.id}/avatar-${Date.now()}.${fileExt}`;
        
        // Delete old avatar if exists
        if (originalAvatarUrl) {
            try {
                const oldPath = originalAvatarUrl.split('/avatars/')[1];
                if (oldPath) {
                    await sb.storage.from('avatars').remove([oldPath]);
                }
            } catch (e) {
                console.log('Could not delete old avatar:', e);
            }
        }
        
        // Upload new avatar
        const { data, error } = await sb.storage
            .from('avatars')
            .upload(fileName, profilePictureFile, {
                cacheControl: '3600',
                upsert: true
            });
        
        if (error) throw error;
        
        // Get public URL
        const { data: urlData } = sb.storage
            .from('avatars')
            .getPublicUrl(fileName);
        
        return urlData.publicUrl;
        
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        throw error;
    }
}

// Remove profile picture
async function removeProfilePicture() {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    
    try {
        const sb = getSupabaseAdmin();
        
        // Delete from storage if exists
        if (originalAvatarUrl) {
            try {
                const oldPath = originalAvatarUrl.split('/avatars/')[1];
                if (oldPath) {
                    await sb.storage.from('avatars').remove([oldPath]);
                }
            } catch (e) {
                console.log('Could not delete avatar from storage:', e);
            }
        }
        
        // Update profile in database
        const { error } = await sb
            .from('profiles')
            .update({ 
                avatar_url: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentAdmin.id);
        
        if (error) throw error;
        
        // Update UI
        const pictureEl = document.getElementById('currentPicture');
        pictureEl.innerHTML = '<i class="bi bi-person-circle"></i>';
        originalAvatarUrl = null;
        profilePictureFile = null;
        
        showToast('Profile picture removed', 'success');
        
    } catch (error) {
        console.error('Error removing profile picture:', error);
        showToast('Failed to remove profile picture: ' + error.message, 'error');
    }
}

// Update profile
async function updateProfile(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Saving...';
    
    try {
        const sb = getSupabaseAdmin();
        const formData = new FormData(form);
        
        // Upload profile picture if selected
        let avatarUrl = originalAvatarUrl;
        if (profilePictureFile) {
            avatarUrl = await uploadProfilePicture();
            if (avatarUrl) {
                showToast('Profile picture uploaded!', 'success');
            }
        }
        
        // Prepare update data
        const updates = {
            full_name: formData.get('full_name'),
            name: formData.get('full_name'),
            phone: formData.get('phone'),
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
        };
        
        // Update profile in database
        const { data, error } = await sb
            .from('profiles')
            .update(updates)
            .eq('id', currentAdmin.id)
            .select()
            .single();
        
        if (error) throw error;
        
        // Check if email changed
        const newEmail = formData.get('email');
        if (newEmail && newEmail !== currentAdmin.auth_email) {
            // Update email in auth (requires re-verification)
            const { error: emailError } = await sb.auth.updateUser({
                email: newEmail
            });
            
            if (emailError) {
                showToast('Profile saved. Email change failed: ' + emailError.message, 'warning');
            } else {
                showToast('Profile saved. Check your new email for verification link.', 'success');
            }
        } else {
            showToast('Profile updated successfully!', 'success');
        }
        
        // Reset file input
        profilePictureFile = null;
        originalAvatarUrl = avatarUrl;
        
        // Update header name
        const nameEl = document.getElementById('adminName');
        if (nameEl) nameEl.textContent = updates.full_name || 'Admin';
        
        // Update session storage
        const admin = await getCurrentAdmin();
        if (admin) {
            admin.name = updates.full_name;
            admin.avatar = avatarUrl;
            
            // Update both storage locations
            const stored = sessionStorage.getItem('adminSession') || localStorage.getItem('adminSession');
            if (stored) {
                const session = JSON.parse(stored);
                session.name = updates.full_name;
                session.avatar = avatarUrl;
                
                if (sessionStorage.getItem('adminSession')) {
                    sessionStorage.setItem('adminSession', JSON.stringify(session));
                } else {
                    localStorage.setItem('adminSession', JSON.stringify(session));
                }
            }
        }
        
        // Update all page headers
        updateAllPageHeaders(updates.full_name, avatarUrl);
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Failed to update profile: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// Cancel profile edit
function cancelProfileEdit() {
    loadAdminProfile();
    profilePictureFile = null;
    showToast('Changes cancelled', 'info');
}

// ==========================================
// PASSWORD MANAGEMENT
// ==========================================

// Setup password validation
function setupPasswordValidation() {
    const newPasswordInput = document.getElementById('newPassword');
    if (!newPasswordInput) return;
    
    newPasswordInput.addEventListener('input', function() {
        const password = this.value;
        
        // Check requirements
        updateRequirement('reqLength', password.length >= 6, 'At least 6 characters');
        updateRequirement('reqLetter', /[a-zA-Z]/.test(password), 'Contains letters');
        updateRequirement('reqNumber', /[0-9]/.test(password), 'Contains numbers');
    });
}

function updateRequirement(elementId, isMet, text) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (isMet) {
        el.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${text}`;
        el.classList.add('met');
    } else {
        el.innerHTML = `<i class="bi bi-circle"></i> ${text}`;
        el.classList.remove('met');
    }
}

// Change password
async function changePassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    const currentPassword = formData.get('current_password');
    const newPassword = formData.get('new_password');
    const confirmPassword = formData.get('confirm_password');
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }
    
    // Validate password strength
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        showToast('Password must contain both letters and numbers', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Updating...';
    
    try {
        const sb = getSupabaseAdmin();
        
        // Update password
        const { data, error } = await sb.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        showToast('Password updated successfully!', 'success');
        form.reset();
        
        // Reset requirement indicators
        updateRequirement('reqLength', false, 'At least 6 characters');
        updateRequirement('reqLetter', false, 'Contains letters');
        updateRequirement('reqNumber', false, 'Contains numbers');
        
    } catch (error) {
        console.error('Error changing password:', error);
        showToast('Failed to change password: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// ==========================================
// NOTIFICATION PREFERENCES
// ==========================================

// Load notification preferences
function loadNotificationPreferences() {
    const prefs = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
    
    const fields = [
        'email_new_bookings',
        'email_payments',
        'email_new_users',
        'email_weekly_reports',
        'email_system_updates'
    ];
    
    fields.forEach(field => {
        const checkbox = document.querySelector(`[name="${field}"]`);
        if (checkbox) {
            // Default some to true
            const defaultOn = ['email_new_bookings', 'email_payments', 'email_weekly_reports'];
            checkbox.checked = prefs[field] !== undefined ? prefs[field] : defaultOn.includes(field);
        }
    });
}

// Save notifications
function saveNotifications(event) {
    event.preventDefault();
    
    const form = event.target;
    
    const prefs = {
        email_new_bookings: form.querySelector('[name="email_new_bookings"]')?.checked || false,
        email_payments: form.querySelector('[name="email_payments"]')?.checked || false,
        email_new_users: form.querySelector('[name="email_new_users"]')?.checked || false,
        email_weekly_reports: form.querySelector('[name="email_weekly_reports"]')?.checked || false,
        email_system_updates: form.querySelector('[name="email_system_updates"]')?.checked || false
    };
    
    localStorage.setItem('notificationPreferences', JSON.stringify(prefs));
    
    showToast('Notification preferences saved!', 'success');
}

// ==========================================
// BUSINESS INFORMATION
// ==========================================

// Load business info
function loadBusinessInfo() {
    const info = JSON.parse(localStorage.getItem('businessInfo') || '{}');
    
    const defaults = {
        business_name: 'WOW Surprises',
        contact_email: 'info@wowsurprises.com',
        contact_phone: '08012345678',
        support_email: 'support@wowsurprises.com',
        business_address: '123 Surprise Street, Abuja, Nigeria'
    };
    
    Object.keys(defaults).forEach(field => {
        const input = document.querySelector(`[name="${field}"]`);
        if (input) {
            input.value = info[field] || defaults[field];
        }
    });
}

// Save business info
async function saveBusinessInfo(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Saving...';
    
    const businessInfo = {
        business_name: formData.get('business_name'),
        contact_email: formData.get('contact_email'),
        contact_phone: formData.get('contact_phone'),
        support_email: formData.get('support_email'),
        business_address: formData.get('business_address')
    };
    
    try {
        // Save to localStorage
        localStorage.setItem('businessInfo', JSON.stringify(businessInfo));
        
        // Try to save to database if table exists
        try {
            const sb = getSupabaseAdmin();
            await sb
                .from('system_settings')
                .upsert({
                    key: 'business_info',
                    value: businessInfo,
                    updated_by: currentAdmin?.id,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
        } catch (dbError) {
            console.log('Database save skipped (table may not exist):', dbError);
        }
        
        showToast('Business information saved!', 'success');
        
    } catch (error) {
        console.error('Error saving business info:', error);
        showToast('Failed to save: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// ==========================================
// SYSTEM CONFIGURATION
// ==========================================

// Load system config
function loadSystemConfig() {
    const config = JSON.parse(localStorage.getItem('systemConfig') || '{}');
    
    const autoConfirm = document.getElementById('autoConfirm');
    const clientEmails = document.getElementById('clientEmails');
    const maintenanceMode = document.getElementById('maintenanceMode');
    
    if (autoConfirm) autoConfirm.checked = config.auto_confirm_bookings !== false;
    if (clientEmails) clientEmails.checked = config.send_client_emails !== false;
    if (maintenanceMode) maintenanceMode.checked = config.maintenance_mode === true;
    
    // Add change listeners
    [autoConfirm, clientEmails, maintenanceMode].forEach(el => {
        if (el) {
            el.addEventListener('change', saveSystemConfig);
        }
    });
}

// Save system config
async function saveSystemConfig() {
    const config = {
        auto_confirm_bookings: document.getElementById('autoConfirm')?.checked || false,
        send_client_emails: document.getElementById('clientEmails')?.checked || false,
        maintenance_mode: document.getElementById('maintenanceMode')?.checked || false
    };
    
    localStorage.setItem('systemConfig', JSON.stringify(config));
    
    // Try to save to database
    try {
        const sb = getSupabaseAdmin();
        await sb
            .from('system_settings')
            .upsert({
                key: 'system_config',
                value: config,
                updated_by: currentAdmin?.id,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
    } catch (dbError) {
        console.log('Database save skipped:', dbError);
    }
    
    showToast('System settings updated!', 'success');
}

// ==========================================
// DANGER ZONE ACTIONS
// ==========================================

// Confirm clear logs
function confirmClearLogs() {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL activity logs.\n\nThis action cannot be undone. Are you sure?')) {
        return;
    }
    
    clearActivityLogs();
}

// Clear activity logs
async function clearActivityLogs() {
    try {
        const sb = getSupabaseAdmin();
        
        // Delete all admin activity logs
        const { error } = await sb
            .from('admin_activity_logs')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        if (error) throw error;
        
        showToast('All activity logs have been cleared', 'success');
        
    } catch (error) {
        console.error('Error clearing logs:', error);
        showToast('Failed to clear logs: ' + error.message, 'error');
    }
}

// Export all data
async function exportAllData() {
    const btn = event.target.closest('button');
    const originalBtnText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Exporting...';
    
    try {
        showToast('Preparing data export...', 'info');
        
        const sb = getSupabaseAdmin();
        
        // Fetch all data
        const [bookingsResult, usersResult, packagesResult] = await Promise.all([
            sb.from('bookings').select('*'),
            sb.from('profiles').select('id, full_name, name, email, phone, role, status, created_at'),
            sb.from('packages').select('*')
        ]);
        
        // Create export object
        const exportData = {
            export_info: {
                exported_at: new Date().toISOString(),
                exported_by: currentAdmin?.full_name || 'Admin',
                version: '1.0'
            },
            statistics: {
                total_bookings: bookingsResult.data?.length || 0,
                total_users: usersResult.data?.length || 0,
                total_packages: packagesResult.data?.length || 0
            },
            bookings: bookingsResult.data || [],
            users: usersResult.data || [],
            packages: packagesResult.data || []
        };
        
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wow-surprises-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('Data exported successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('Failed to export data: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
    }
}

// ==========================================
// LOGOUT
// ==========================================

// Update all page headers with new name/avatar
function updateAllPageHeaders(name, avatarUrl) {
    // Update all name displays
    const nameElements = [
        document.getElementById('adminName'),
        document.getElementById('adminUserName'),
        document.getElementById('adminDisplayName'),
        document.querySelector('.user-name')
    ];
    
    nameElements.forEach(el => {
        if (el) el.textContent = name || 'Admin';
    });
    
    // Update all avatar displays
    const avatarContainers = document.querySelectorAll('.user-avatar');
    avatarContainers.forEach(container => {
        if (avatarUrl) {
            container.innerHTML = `<img src="${avatarUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            container.innerHTML = '<i class="bi bi-person-circle"></i>';
        }
    });
}

async function adminLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        const sb = getSupabaseAdmin();
        await sb.auth.signOut();
        
        sessionStorage.clear();
        localStorage.removeItem('currentUser');
        
        showToast('Logged out successfully', 'success');
        
        setTimeout(() => {
            window.location.href = 'admin-login-supabase.html';
        }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = 'admin-login-supabase.html';
    }
}