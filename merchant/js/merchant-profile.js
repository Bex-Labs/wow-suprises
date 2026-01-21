/**
 * Merchant Profile JavaScript
 * Manages merchant profile, KYC, and document uploads
 * Connected to Supabase
 */

let currentMerchant = null;
let uploadedDocuments = {
    id_document: null,
    business_certificate: null,
    address_proof: null
};

// Initialize profile page
async function initProfile() {
    try {
        currentMerchant = await MerchantAuth.getCurrentMerchant();
        if (!currentMerchant) {
            window.location.href = 'merchant-login.html';
            return;
        }

        updateMerchantInfo();
        await loadProfileData();
        setupEventListeners();
        calculateVerificationProgress();
        
        // Mobile Sidebar Toggle
        const toggle = document.getElementById('sidebarToggle');
        if(toggle) {
            toggle.addEventListener('click', () => {
                document.getElementById('merchantSidebar').classList.toggle('active');
            });
        }

    } catch (err) {
        console.error('Init error:', err);
        showToast('Failed to load profile data', 'error');
    }
}

// Update merchant info (Header)
function updateMerchantInfo() {
    const nameEl = document.getElementById('merchantName');
    if (nameEl) nameEl.textContent = currentMerchant.business_name || 'Merchant';
}

// Load profile data
async function loadProfileData() {
    try {
        // Business info
        setVal('businessName', currentMerchant.business_name);
        setVal('businessType', currentMerchant.business_type);
        setVal('businessRegistration', currentMerchant.business_registration);
        setVal('taxId', currentMerchant.tax_id);
        setVal('businessAddress', currentMerchant.address); // Note: using 'address' column
        setVal('businessCity', currentMerchant.city);
        setVal('businessState', currentMerchant.state);
        setVal('businessDescription', currentMerchant.description);

        // Bank details
        setVal('bankName', currentMerchant.bank_name);
        setVal('accountNumber', currentMerchant.account_number);
        setVal('accountName', currentMerchant.account_name);

        // Contact info
        setVal('contactPhone', currentMerchant.phone);
        setVal('alternatePhone', currentMerchant.alternate_phone);
        setVal('contactEmail', currentMerchant.email);
        setVal('websiteUrl', currentMerchant.website_url);
        
        // Social Media (stored in jsonb column 'social_media')
        if (currentMerchant.social_media) {
            setVal('whatsappNumber', currentMerchant.social_media.whatsapp);
            setVal('instagramHandle', currentMerchant.social_media.instagram);
            setVal('facebookPage', currentMerchant.social_media.facebook);
            setVal('twitterHandle', currentMerchant.social_media.twitter);
        }

        // Documents (stored in jsonb column 'documents')
        if (currentMerchant.documents) {
            uploadedDocuments = currentMerchant.documents;
            if (uploadedDocuments.id_document) updateDocumentPreview('id', uploadedDocuments.id_document.name || 'Uploaded');
            if (uploadedDocuments.business_certificate) updateDocumentPreview('cert', uploadedDocuments.business_certificate.name || 'Uploaded');
            if (uploadedDocuments.address_proof) updateDocumentPreview('address', uploadedDocuments.address_proof.name || 'Uploaded');
        }

        // Profile Picture
        if (currentMerchant.logo_url) {
            updateGlobalAvatar(currentMerchant.logo_url);
        }

        // Update verification status
        updateVerificationStatus();
        
    } catch (err) {
        console.error('Load profile error:', err);
    }
}

// Helper to set values safely
function setVal(id, val) {
    const el = document.getElementById(id);
    if(el) el.value = val || '';
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('businessInfoForm')?.addEventListener('submit', saveBusinessInfo);
    document.getElementById('bankDetailsForm')?.addEventListener('submit', saveBankDetails);
    document.getElementById('contactInfoForm')?.addEventListener('submit', saveContactInfo);

    // Account number verification with debounce
    document.getElementById('accountNumber')?.addEventListener('input', debounce(verifyAccountNumber, 1000));

    // Document upload listeners
    document.getElementById('idUpload')?.addEventListener('change', (e) => handleDocumentUpload(e, 'id'));
    document.getElementById('certUpload')?.addEventListener('change', (e) => handleDocumentUpload(e, 'cert'));
    document.getElementById('addressUpload')?.addEventListener('change', (e) => handleDocumentUpload(e, 'address'));

    // Avatar upload listener
    document.getElementById('avatarInput')?.addEventListener('change', handleAvatarUpload);
}

// Switch profile tabs
window.switchProfileTab = function(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.profile-tab-content').forEach(content => {
        content.style.display = 'none'; // Use style display for standard JS switching
        content.classList.remove('active');
    });

    // Add active class to selected tab
    const btn = document.querySelector(`button[data-tab="${tabName}"]`);
    if(btn) btn.classList.add('active');
    
    const content = document.getElementById(`${tabName}Tab`);
    if(content) {
        content.style.display = 'block';
        content.classList.add('active');
    }
}

// Save business info
async function saveBusinessInfo(e) {
    e.preventDefault();

    try {
        const formData = {
            business_name: document.getElementById('businessName').value.trim(),
            business_type: document.getElementById('businessType').value,
            business_registration: document.getElementById('businessRegistration').value.trim(),
            tax_id: document.getElementById('taxId').value.trim(),
            address: document.getElementById('businessAddress').value.trim(),
            city: document.getElementById('businessCity').value.trim(),
            state: document.getElementById('businessState').value.trim(),
            description: document.getElementById('businessDescription').value.trim()
        };

        const { error } = await merchantSupabase
            .from('merchants')
            .update(formData)
            .eq('id', currentMerchant.id);

        if (error) throw error;

        // Update local object
        Object.assign(currentMerchant, formData);
        showToast('Business information updated successfully!', 'success');
        calculateVerificationProgress();
    } catch (err) {
        console.error('Save business info error:', err);
        showToast('Failed to update business information', 'error');
    }
}

// Save bank details
async function saveBankDetails(e) {
    e.preventDefault();

    try {
        const formData = {
            bank_name: document.getElementById('bankName').value,
            account_number: document.getElementById('accountNumber').value.trim(),
            account_name: document.getElementById('accountName').value.trim()
        };

        if (formData.account_number.length !== 10) {
            showToast('Account number must be 10 digits', 'error');
            return;
        }

        const { error } = await merchantSupabase
            .from('merchants')
            .update(formData)
            .eq('id', currentMerchant.id);

        if (error) throw error;

        Object.assign(currentMerchant, formData);
        showToast('Bank details updated successfully!', 'success');
        calculateVerificationProgress();
    } catch (err) {
        console.error('Save bank details error:', err);
        showToast('Failed to update bank details', 'error');
    }
}

// Save contact info
async function saveContactInfo(e) {
    e.preventDefault();

    try {
        const socialData = {
            whatsapp: document.getElementById('whatsappNumber').value.trim(),
            instagram: document.getElementById('instagramHandle').value.trim(),
            facebook: document.getElementById('facebookPage').value.trim(),
            twitter: document.getElementById('twitterHandle').value.trim()
        };

        const formData = {
            phone: document.getElementById('contactPhone').value.trim(),
            alternate_phone: document.getElementById('alternatePhone').value.trim(),
            website_url: document.getElementById('websiteUrl').value.trim(),
            social_media: socialData // Saving to JSONB column
        };

        const { error } = await merchantSupabase
            .from('merchants')
            .update(formData)
            .eq('id', currentMerchant.id);

        if (error) throw error;

        Object.assign(currentMerchant, formData);
        // Also update nested social media in local object
        currentMerchant.social_media = socialData;

        showToast('Contact information updated successfully!', 'success');
        calculateVerificationProgress();
    } catch (err) {
        console.error('Save contact info error:', err);
        showToast('Failed to update contact information', 'error');
    }
}

// Verify account number (Simulated)
async function verifyAccountNumber() {
    const bankName = document.getElementById('bankName').value;
    const accountNumber = document.getElementById('accountNumber').value.trim();
    const accountNameField = document.getElementById('accountName');

    if (!bankName || accountNumber.length !== 10) {
        accountNameField.value = '';
        return;
    }

    try {
        accountNameField.value = 'VERIFYING...';
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock verification result
        accountNameField.value = currentMerchant.business_name.toUpperCase();
        showToast('Account verified successfully!', 'success');
    } catch (err) {
        console.error('Account verification error:', err);
        accountNameField.value = '';
        showToast('Failed to verify account.', 'error');
    }
}

// Handle document upload
async function handleDocumentUpload(event, docType) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showToast('File size must be less than 5MB', 'error');
        event.target.value = '';
        return;
    }

    try {
        // Upload to Supabase Storage
        const fileName = `${currentMerchant.id}/${docType}_${Date.now()}`;
        
        const { data, error } = await merchantSupabase.storage
            .from('merchant-documents') // Ensure this bucket exists
            .upload(fileName, file);

        if (error) throw error;

        // Store document reference in local object
        const docName = docType === 'id' ? 'id_document' : 
                        docType === 'cert' ? 'business_certificate' : 'address_proof';
        
        uploadedDocuments[docName] = {
            name: file.name,
            path: data.path,
            uploaded_at: new Date().toISOString()
        };

        // Update UI
        updateDocumentPreview(docType, file.name);
        showToast('Document uploaded successfully!', 'success');
        calculateVerificationProgress();
    } catch (err) {
        console.error('Upload error:', err);
        showToast('Failed to upload document. Ensure bucket exists.', 'error');
    }
}

// Update document preview
function updateDocumentPreview(docType, fileName) {
    const preview = document.getElementById(`${docType}Preview`);
    const fileNameSpan = document.getElementById(`${docType}FileName`);
    const status = document.getElementById(`${docType}Status`);

    if (preview && fileNameSpan && status) {
        preview.style.display = 'block';
        fileNameSpan.textContent = fileName;
        status.textContent = 'Uploaded';
        status.className = 'doc-status uploaded';
        status.style.background = '#d1ecf1';
        status.style.color = '#0c5460';
    }
}

// Submit documents for verification
async function submitDocuments() {
    try {
        // Check if required documents are uploaded
        if (!uploadedDocuments.id_document || !uploadedDocuments.address_proof) {
            showToast('Please upload ID and Address Proof', 'error');
            return;
        }

        // Update merchant with document JSON
        const { error } = await merchantSupabase
            .from('merchants')
            .update({
                documents: uploadedDocuments,
                status: 'pending' // trigger status change
            })
            .eq('id', currentMerchant.id);

        if (error) throw error;

        showToast('Documents submitted for verification!', 'success');
        updateVerificationStatus('pending'); // Manually update UI
        calculateVerificationProgress();
    } catch (err) {
        console.error('Submit documents error:', err);
        showToast('Failed to submit documents', 'error');
    }
}

// === NEW: Profile Picture (Avatar) Logic ===

async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validation
    if (file.size > 2 * 1024 * 1024) {
        showToast('Image too large (Max 2MB)', 'error');
        return;
    }
    
    // Preview
    const reader = new FileReader();
    reader.onload = (e) => document.getElementById('profileImagePreview').src = e.target.result;
    reader.readAsDataURL(file);

    try {
        showToast('Uploading profile picture...', 'info');
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentMerchant.id}/avatar_${Date.now()}.${fileExt}`;

        // Ensure you have a bucket named 'avatars' in Supabase Storage
        const { error: uploadError } = await merchantSupabase.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = merchantSupabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
        
        await updateLogoUrlInDB(publicUrl);
        
    } catch (err) {
        console.error('Avatar error:', err);
        showToast('Failed to upload profile picture', 'error');
    }
}

window.deleteProfilePicture = async function() {
    if(!confirm('Remove profile picture?')) return;
    try {
        await updateLogoUrlInDB(null);
        document.getElementById('profileImagePreview').src = 'https://via.placeholder.com/150?text=Logo';
        // Reset header icons
        document.querySelectorAll('.user-avatar').forEach(div => {
            div.innerHTML = '<i class="bi bi-shop"></i>';
        });
    } catch (err) {
        showToast('Failed to remove picture', 'error');
    }
}

async function updateLogoUrlInDB(url) {
    const { error } = await merchantSupabase
        .from('merchants')
        .update({ logo_url: url })
        .eq('id', currentMerchant.id);

    if (error) throw error;

    currentMerchant.logo_url = url;
    if(url) updateGlobalAvatar(url);
    showToast(url ? 'Profile picture updated!' : 'Profile picture removed.', 'success');
}

function updateGlobalAvatar(url) {
    // Form preview
    const preview = document.getElementById('profileImagePreview');
    if (preview) preview.src = url;

    // Header avatar
    const avatars = document.querySelectorAll('.user-avatar');
    avatars.forEach(div => {
        div.innerHTML = ''; 
        const img = document.createElement('img');
        img.src = url;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        div.appendChild(img);
    });
}

// Update verification status UI
function updateVerificationStatus(statusOverride) {
    const badge = document.getElementById('verificationBadge');
    const status = statusOverride || currentMerchant.status || 'pending';

    const config = {
        'pending': { text: 'Under Review', bg: '#fff3cd', color: '#856404' },
        'verified': { text: 'Verified', bg: '#d4edda', color: '#155724' },
        'active': { text: 'Verified', bg: '#d4edda', color: '#155724' },
        'rejected': { text: 'Failed', bg: '#f8d7da', color: '#721c24' }
    };

    const c = config[status] || config['pending'];
    if(badge) {
        badge.textContent = c.text;
        badge.style.background = c.bg;
        badge.style.color = c.color;
    }
}

// Calculate verification progress
function calculateVerificationProgress() {
    // 4 Main Sections: Info, Bank, Contact, Docs
    let score = 0;
    let total = 4;

    if (currentMerchant.business_name && currentMerchant.address) score++;
    if (currentMerchant.account_number && currentMerchant.bank_name) score++;
    if (currentMerchant.phone) score++;
    if (uploadedDocuments.id_document) score++;

    const progress = Math.round((score / total) * 100);
    document.getElementById('verificationProgress').textContent = `${progress}%`;
}

// Utility functions
function debounce(func, wait) {
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

function showToast(message, type = 'info') {
    console.log(`[${type}] ${message}`);
    // alert(message); // Uncomment for alerts
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initProfile);