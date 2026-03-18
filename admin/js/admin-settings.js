/**
 * Admin Settings JavaScript - ERROR FREE VERSION
 * Profile management, password changes, and system configuration
 */

let currentAdmin = null;
let profilePictureFile = null;
let originalAvatarUrl = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Settings page initializing...');
    
    // Protect admin route
    if (typeof protectAdminRoute === 'function') {
        const isAuth = await protectAdminRoute();
        if (!isAuth) return;
    }
    
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
// PROFILE MANAGEMENT (FIXED ERROR)
// ==========================================

// Load admin profile
async function loadAdminProfile() {
    try {
        // FIX: Ensure robust client getter
        const sb = window.sbClient || window.supabaseAdmin || (typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : null);
        if (!sb) throw new Error("Supabase client is not available.");
        
        // Get current user
        const { data: { user }, error: authError } = await sb.auth.getUser();
        if (authError) throw authError;
        
        if (!user) {
            window.location.href = 'admin-login-supabase.html';
            return;
        }
        
        // FIX: Changed .single() to .maybeSingle() to prevent crash if profile row is missing
        const { data: profile, error: profileError } = await sb
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        
        if (profileError) throw profileError;
        
        // FIX: Safe fallback if no profile exists yet
        const safeProfile = profile || { full_name: 'Admin User', role: 'admin' };
        
        currentAdmin = { ...safeProfile, auth_email: user.email, id: user.id };
        originalAvatarUrl = safeProfile.avatar_url;
        
        // Update header name
        const nameEl = document.getElementById('adminName');
        if (nameEl) nameEl.textContent = safeProfile.full_name || safeProfile.name || 'Admin';
        
        // Populate form fields safely
        const fName = document.getElementById('profileFullName');
        const fEmail = document.getElementById('profileEmail');
        const fPhone = document.getElementById('profilePhone');
        const fRole = document.getElementById('profileRole');

        if(fName) fName.value = safeProfile.full_name || safeProfile.name || '';
        if(fEmail) fEmail.value = safeProfile.email || user.email || '';
        if(fPhone) fPhone.value = safeProfile.phone || '';
        if(fRole) fRole.value = safeProfile.role === 'admin' ? 'Administrator' : 'User';
        
        // Load profile picture
        const pictureEl = document.getElementById('currentPicture');
        if (pictureEl) {
            if (safeProfile.avatar_url) {
                pictureEl.innerHTML = `<img src="${safeProfile.avatar_url}" alt="Profile Picture" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                pictureEl.innerHTML = '<i class="bi bi-person-circle"></i>';
            }
        }
        
        console.log('✅ Admin profile loaded safely');
        
    } catch (error) {
        console.error('Error loading profile:', error);
        if(typeof showToast === 'function') showToast('Failed to load profile: ' + error.message, 'error');
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
    if(event && event.target) {
        const btn = event.target.closest('.tab-btn');
        if(btn) btn.classList.add('active');
    }
}

// Preview profile picture
function previewProfilePicture(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        if(typeof showToast === 'function') showToast('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'error');
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        if(typeof showToast === 'function') showToast('Image size must be less than 2MB', 'error');
        return;
    }
    
    profilePictureFile = file;
    
    // Preview image
    const reader = new FileReader();
    reader.onload = function(e) {
        const pictureEl = document.getElementById('currentPicture');
        pictureEl.innerHTML = `<img src="${e.target.result}" alt="Profile Preview" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    };
    reader.readAsDataURL(file);
    
    if(typeof showToast === 'function') showToast('Image selected. Click "Save Changes" to upload.', 'info');
}

// Upload profile picture to Supabase Storage
async function uploadProfilePicture() {
    if (!profilePictureFile || !currentAdmin) return null;
    
    try {
        const sb = window.sbClient || window.supabaseAdmin || (typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : null);
        
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
        const sb = window.sbClient || window.supabaseAdmin || (typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : null);
        
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
        
        if(typeof showToast === 'function') showToast('Profile picture removed', 'success');
        
    } catch (error) {
        console.error('Error removing profile picture:', error);
        if(typeof showToast === 'function') showToast('Failed to remove profile picture: ' + error.message, 'error');
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
        const sb = window.sbClient || window.supabaseAdmin || (typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : null);
        const formData = new FormData(form);
        
        // Upload profile picture if selected
        let avatarUrl = originalAvatarUrl;
        if (profilePictureFile) {
            avatarUrl = await uploadProfilePicture();
            if (avatarUrl && typeof showToast === 'function') {
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
            .maybeSingle();
        
        if (error) throw error;
        
        // Check if email changed
        const newEmail = formData.get('email');
        if (newEmail && newEmail !== currentAdmin.auth_email) {
            const { error: emailError } = await sb.auth.updateUser({ email: newEmail });
            
            if (emailError) {
                if(typeof showToast === 'function') showToast('Profile saved. Email change failed: ' + emailError.message, 'warning');
            } else {
                if(typeof showToast === 'function') showToast('Profile saved. Check your new email for verification link.', 'success');
            }
        } else {
            if(typeof showToast === 'function') showToast('Profile updated successfully!', 'success');
        }
        
        // Reset file input
        profilePictureFile = null;
        originalAvatarUrl = avatarUrl;
        
        // Update header name
        const nameEl = document.getElementById('adminName');
        if (nameEl) nameEl.textContent = updates.full_name || 'Admin';
        
        // Update session storage
        const admin = typeof getCurrentAdmin === 'function' ? await getCurrentAdmin() : null;
        if (admin) {
            admin.name = updates.full_name;
            admin.avatar = avatarUrl;
            
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
        if(typeof showToast === 'function') showToast('Failed to update profile: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

function cancelProfileEdit() {
    loadAdminProfile();
    profilePictureFile = null;
    if(typeof showToast === 'function') showToast('Changes cancelled', 'info');
}

// ==========================================
// PASSWORD MANAGEMENT
// ==========================================

function setupPasswordValidation() {
    const newPasswordInput = document.getElementById('newPassword');
    if (!newPasswordInput) return;
    
    newPasswordInput.addEventListener('input', function() {
        const password = this.value;
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
        el.style.color = '#22c55e';
    } else {
        el.innerHTML = `<i class="bi bi-circle"></i> ${text}`;
        el.style.color = '#666';
    }
}

async function changePassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    const currentPassword = formData.get('current_password');
    const newPassword = formData.get('new_password');
    const confirmPassword = formData.get('confirm_password');
    
    if (newPassword !== confirmPassword) {
        if(typeof showToast === 'function') showToast('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        if(typeof showToast === 'function') showToast('Password does not meet requirements', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Updating...';
    
    try {
        const sb = window.sbClient || window.supabaseAdmin || (typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : null);
        
        const { data, error } = await sb.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        if(typeof showToast === 'function') showToast('Password updated successfully!', 'success');
        form.reset();
        
        updateRequirement('reqLength', false, 'At least 6 characters');
        updateRequirement('reqLetter', false, 'Contains letters');
        updateRequirement('reqNumber', false, 'Contains numbers');
        
    } catch (error) {
        console.error('Error changing password:', error);
        if(typeof showToast === 'function') showToast('Failed to change password: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// ==========================================
// PREFERENCES AND CONFIG
// ==========================================

function loadNotificationPreferences() {
    const prefs = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
    const fields = ['email_new_bookings', 'email_payments', 'email_new_users', 'email_weekly_reports', 'email_system_updates'];
    
    fields.forEach(field => {
        const checkbox = document.querySelector(`[name="${field}"]`);
        if (checkbox) {
            const defaultOn = ['email_new_bookings', 'email_payments', 'email_weekly_reports'];
            checkbox.checked = prefs[field] !== undefined ? prefs[field] : defaultOn.includes(field);
        }
    });
}

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
    if(typeof showToast === 'function') showToast('Notification preferences saved!', 'success');
}

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
        if (input) input.value = info[field] || defaults[field];
    });
}

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
        localStorage.setItem('businessInfo', JSON.stringify(businessInfo));
        if(typeof showToast === 'function') showToast('Business information saved!', 'success');
    } catch (error) {
        console.error('Error saving business info:', error);
        if(typeof showToast === 'function') showToast('Failed to save: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

function loadSystemConfig() {
    const config = JSON.parse(localStorage.getItem('systemConfig') || '{}');
    
    const autoConfirm = document.getElementById('autoConfirm');
    const clientEmails = document.getElementById('clientEmails');
    const maintenanceMode = document.getElementById('maintenanceMode');
    
    if (autoConfirm) autoConfirm.checked = config.auto_confirm_bookings !== false;
    if (clientEmails) clientEmails.checked = config.send_client_emails !== false;
    if (maintenanceMode) maintenanceMode.checked = config.maintenance_mode === true;
    
    [autoConfirm, clientEmails, maintenanceMode].forEach(el => {
        if (el) el.addEventListener('change', saveSystemConfig);
    });
}

async function saveSystemConfig() {
    const config = {
        auto_confirm_bookings: document.getElementById('autoConfirm')?.checked || false,
        send_client_emails: document.getElementById('clientEmails')?.checked || false,
        maintenance_mode: document.getElementById('maintenanceMode')?.checked || false
    };
    
    localStorage.setItem('systemConfig', JSON.stringify(config));
    if(typeof showToast === 'function') showToast('System settings updated!', 'success');
}

// ==========================================
// DANGER ZONE ACTIONS
// ==========================================

function confirmClearLogs() {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL activity logs.\n\nThis action cannot be undone. Are you sure?')) return;
    clearActivityLogs();
}

async function clearActivityLogs() {
    try {
        const sb = window.sbClient || window.supabaseAdmin || (typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : null);
        const { error } = await sb.from('admin_activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
        if (error) throw error;
        if(typeof showToast === 'function') showToast('All activity logs have been cleared', 'success');
    } catch (error) {
        console.error('Error clearing logs:', error);
        if(typeof showToast === 'function') showToast('Failed to clear logs: ' + error.message, 'error');
    }
}

async function exportAllData() {
    const btn = event.target.closest('button');
    const originalBtnText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Exporting...';
    
    try {
        if(typeof showToast === 'function') showToast('Preparing data export...', 'info');
        
        const sb = window.sbClient || window.supabaseAdmin || (typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : null);
        
        // FIX: Changed 'packages' to 'merchant_services'
        const [bookingsResult, usersResult, packagesResult] = await Promise.all([
            sb.from('bookings').select('*'),
            sb.from('profiles').select('id, full_name, name, email, phone, role, status, created_at'),
            sb.from('merchant_services').select('*')
        ]);
        
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
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wow-surprises-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        if(typeof showToast === 'function') showToast('Data exported successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        if(typeof showToast === 'function') showToast('Failed to export data: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
    }
}

// Update all page headers with new name/avatar
function updateAllPageHeaders(name, avatarUrl) {
    const nameElements = [
        document.getElementById('adminName'),
        document.getElementById('adminUserName'),
        document.getElementById('adminDisplayName'),
        document.querySelector('.user-name')
    ];
    
    nameElements.forEach(el => {
        if (el) el.textContent = name || 'Admin';
    });
    
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
        const sb = window.sbClient || window.supabaseAdmin || (typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : null);
        await sb.auth.signOut();
        
        sessionStorage.clear();
        localStorage.removeItem('currentUser');
        
        if(typeof showToast === 'function') showToast('Logged out successfully', 'success');
        
        setTimeout(() => {
            window.location.href = 'admin-login-supabase.html';
        }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = 'admin-login-supabase.html';
    }
}