/**
 * Admin Users Management JavaScript
 * Full CRUD operations for managing Clients, Merchants, and Administrators
 */

let allUsers = [];
let filteredUsers = [];
let currentUser = null;
let isEditMode = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Admin Users Page Initializing...');
    
    // Protect admin route
    const isAuth = await protectAdminRoute();
    if (!isAuth) {
        console.log('❌ Not authenticated');
        return;
    }
    
    console.log('✅ Admin authenticated');
    
    // Load admin name
    await loadAdminName();
    
    // Load all users
    await loadAllUsers();
});

// Load admin name
async function loadAdminName() {
    try {
        const sb = getSupabaseAdmin();
        const { data: { user }, error } = await sb.auth.getUser();
        
        if (!error && user) {
            const { data: profile } = await sb
                .from('profiles')
                .select('full_name, name')
                .eq('id', user.id)
                .single();
            
            if (profile) {
                const nameEl = document.getElementById('adminName');
                if (nameEl) {
                    nameEl.textContent = profile.full_name || profile.name || 'Admin';
                }
            }
        }
    } catch (error) {
        console.log('Could not load admin name:', error.message);
    }
}

// Load all users from database
async function loadAllUsers() {
    console.log('📥 Loading users from database...');
    
    try {
        const sb = getSupabaseAdmin();
        
        // Show loading state
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="admin-loading">
                            <i class="bi bi-arrow-repeat spin"></i> Loading users...
                        </div>
                    </td>
                </tr>
            `;
        }
        
        // Fetch all profiles
        const { data: users, error } = await sb
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Error fetching users:', error);
            throw error;
        }
        
        allUsers = users || [];
        filteredUsers = [...allUsers];
        
        console.log(`✅ Loaded ${allUsers.length} users`, users);
        
        // Load booking counts for each user
        await loadBookingCounts();
        
        // Update UI
        updateStats();
        displayUsers(filteredUsers);
        
        if (typeof showToast === 'function') {
            showToast(`Loaded ${allUsers.length} users`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to load users: ' + error.message, 'error');
        }
        
        // Show error state with retry button
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center" style="padding: 40px; color: #dc2626;">
                        <i class="bi bi-exclamation-circle" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                        <strong>Failed to load users</strong><br>
                        <small>${error.message}</small><br><br>
                        <button onclick="loadAllUsers()" class="admin-btn admin-btn-primary" style="margin-top: 12px;">
                            <i class="bi bi-arrow-clockwise"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// Load booking counts for users
async function loadBookingCounts() {
    try {
        const sb = getSupabaseAdmin();
        
        const { data: bookings, error } = await sb
            .from('bookings')
            .select('user_id');
        
        if (error) {
            console.error('❌ Error loading bookings:', error);
            // Don't throw, just continue without booking counts
            return;
        }
        
        // Count bookings per user
        const counts = {};
        if (bookings) {
            bookings.forEach(booking => {
                counts[booking.user_id] = (counts[booking.user_id] || 0) + 1;
            });
        }
        
        // Add booking count to each user
        allUsers.forEach(user => {
            user.bookingCount = counts[user.id] || 0;
        });
        
        console.log('✅ Booking counts loaded');
        
    } catch (error) {
        console.error('❌ Error loading booking counts:', error);
    }
}

// Update statistics
function updateStats() {
    const stats = {
        total: allUsers.length,
        clients: allUsers.filter(u => u.role === 'client' || !u.role).length,
        admins: allUsers.filter(u => u.role === 'admin').length,
        merchants: allUsers.filter(u => u.role === 'merchant').length, // Added Merchant Count
        active: allUsers.filter(u => !u.status || u.status === 'active').length
    };
    
    // Update elements safely
    const setContent = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setContent('totalUsersCount', stats.total);
    setContent('clientsCount', stats.clients);
    setContent('adminsCount', stats.admins);
    
    // Note: If you add a "Merchants" card to the HTML later, you can update it here.
    // For now, "Active Users" usually implies ALL active accounts regardless of role.
    setContent('activeUsersCount', stats.active);
    
    setContent('totalCount', `${stats.total} users`);
    
    console.log('📊 Stats updated:', stats);
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    tbody.innerHTML = users.map(user => {
        // Determine Badge Color and Icon based on Role
        let roleBadgeClass = 'badge-secondary';
        let roleIcon = 'bi-person';
        let roleLabel = 'Client';

        if (user.role === 'admin') {
            roleBadgeClass = 'badge-primary'; // Blue/Primary for Admin
            roleIcon = 'bi-shield-check';
            roleLabel = 'Admin';
        } else if (user.role === 'merchant') {
            roleBadgeClass = 'badge-info'; // Purple/Info for Merchant
            roleIcon = 'bi-shop';
            roleLabel = 'Merchant';
        }

        return `
        <tr>
            <td>
                <div class="user-info">
                    <div class="user-avatar-small">
                        ${user.avatar_url ? 
                            `<img src="${user.avatar_url}" alt="${user.full_name || user.name}">` : 
                            `<i class="bi bi-person-circle"></i>`
                        }
                    </div>
                    <div>
                        <div class="user-name-table">${user.full_name || user.name || 'No Name'}</div>
                        <small style="color: #64748b;">${user.email}</small>
                    </div>
                </div>
            </td>
            <td>${user.phone || '<span style="color: #94a3b8;">N/A</span>'}</td>
            <td>
                <span class="badge ${roleBadgeClass}">
                    <i class="bi ${roleIcon}"></i> ${roleLabel}
                </span>
            </td>
            <td>${getStatusBadge(user.status || 'active', 'user')}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <span class="badge ${user.bookingCount > 0 ? 'badge-info' : 'badge-secondary'}">
                    <i class="bi bi-calendar-check"></i> ${user.bookingCount || 0}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="viewUser('${user.id}')" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="editUser('${user.id}')" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-icon ${(!user.status || user.status === 'active') ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleUserStatus('${user.id}')" 
                            title="${(!user.status || user.status === 'active') ? 'Suspend' : 'Activate'}">
                        <i class="bi bi-${(!user.status || user.status === 'active') ? 'pause-circle' : 'play-circle'}"></i>
                    </button>
                    ${user.role !== 'admin' || allUsers.filter(u => u.role === 'admin').length > 1 ? `
                        <button class="btn-icon btn-danger" onclick="confirmDeleteUser('${user.id}')" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `}).join('');
    
    console.log(`✅ Displayed ${users.length} users`);
}

// Open create user modal
function openCreateUserModal() {
    isEditMode = false;
    currentUser = null;
    
    document.getElementById('userModalTitle').innerHTML = '<i class="bi bi-person-plus"></i> Add New User';
    document.getElementById('userForm').reset();
    document.querySelector('[name="password"]').required = true;
    const pwdHelp = document.querySelector('#passwordGroup small');
    if(pwdHelp) pwdHelp.style.display = 'none';
    
    document.getElementById('userModal').style.display = 'block';
}

// Edit user
function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }
    
    isEditMode = true;
    currentUser = user;
    
    document.getElementById('userModalTitle').innerHTML = '<i class="bi bi-pencil"></i> Edit User';
    
    const form = document.getElementById('userForm');
    form.querySelector('[name="full_name"]').value = user.full_name || user.name || '';
    form.querySelector('[name="email"]').value = user.email;
    form.querySelector('[name="phone"]').value = user.phone || '';
    
    // Set role select
    const roleSelect = form.querySelector('[name="role"]');
    if (roleSelect) {
        // If the role exists in dropdown, select it. If not (e.g. merchant might be missing), default to client.
        // You should add 'merchant' to the <select> in HTML for full support.
        roleSelect.value = user.role || 'client'; 
    }

    form.querySelector('[name="status"]').value = user.status || 'active';
    form.querySelector('[name="password"]').value = '';
    form.querySelector('[name="password"]').required = false;
    
    const pwdHelp = document.querySelector('#passwordGroup small');
    if(pwdHelp) pwdHelp.style.display = 'block';
    
    document.getElementById('userModal').style.display = 'block';
}

// Save user (create or update)
async function saveUser(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const userData = {
        full_name: formData.get('full_name'),
        name: formData.get('full_name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        role: formData.get('role'),
        status: formData.get('status'),
        updated_at: new Date().toISOString()
    };
    
    const password = formData.get('password');
    
    try {
        const sb = getSupabaseAdmin();
        
        if (isEditMode && currentUser) {
            // Update existing user
            const { data, error } = await sb
                .from('profiles')
                .update(userData)
                .eq('id', currentUser.id)
                .select()
                .single();
            
            if (error) throw error;
            
            showToast('User updated successfully', 'success');
            
        } else {
            // Create new user
            if (!password || password.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }
            
            // Create auth user
            const { data: authData, error: authError } = await sb.auth.signUp({
                email: userData.email,
                password: password,
                options: {
                    data: {
                        full_name: userData.full_name,
                        phone: userData.phone,
                        role: userData.role // Ensure role is passed here
                    }
                }
            });
            
            if (authError) throw authError;
            
            if (authData.user) {
                // Wait for trigger to create profile or manually update
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Update profile with correct role/status
                const { error: updateError } = await sb
                    .from('profiles')
                    .update({
                        ...userData,
                        created_at: new Date().toISOString()
                    })
                    .eq('id', authData.user.id);
                
                if (updateError) console.error('Profile update error:', updateError);
                
                showToast('User created successfully', 'success');
            }
        }
        
        closeUserModal();
        await loadAllUsers();
        
    } catch (error) {
        console.error('Error saving user:', error);
        showToast('Failed to save user: ' + error.message, 'error');
    }
}

// View user details
async function viewUser(userId) {
    try {
        const user = allUsers.find(u => u.id === userId);
        if (!user) {
            showToast('User not found', 'error');
            return;
        }
        
        // Get user's bookings
        const sb = getSupabaseAdmin();
        const { data: bookings, error } = await sb
            .from('bookings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) console.error('Error loading bookings:', error);
        
        const modal = document.getElementById('viewModal');
        const modalBody = document.getElementById('viewModalBody');
        
        // Visual role label
        let roleLabel = 'Client';
        let roleClass = 'badge-secondary';
        if (user.role === 'admin') { roleLabel = 'Administrator'; roleClass = 'badge-primary'; }
        if (user.role === 'merchant') { roleLabel = 'Merchant'; roleClass = 'badge-info'; }

        modalBody.innerHTML = `
            <div class="user-details-view">
                <div class="user-profile-section">
                    <div class="user-avatar-large">
                        ${user.avatar_url ? 
                            `<img src="${user.avatar_url}" alt="${user.full_name || user.name}">` : 
                            `<i class="bi bi-person-circle"></i>`
                        }
                    </div>
                    <div class="user-profile-info">
                        <h3>${user.full_name || user.name || 'No Name'}</h3>
                        <p>${user.email}</p>
                        <div class="user-badges">
                            <span class="badge ${roleClass}">
                                ${roleLabel}
                            </span>
                            ${getStatusBadge(user.status || 'active', 'user')}
                        </div>
                    </div>
                </div>
                
                <div class="details-grid">
                    <div class="detail-section">
                        <h3><i class="bi bi-info-circle"></i> User Information</h3>
                        <div class="detail-row">
                            <span class="label">Email:</span>
                            <span class="value">${user.email}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Phone:</span>
                            <span class="value">${user.phone || 'Not provided'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Role:</span>
                            <span class="value" style="text-transform: capitalize;">${user.role || 'Client'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Status:</span>
                            <span class="value">${user.status || 'active'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Joined:</span>
                            <span class="value">${formatDate(user.created_at, true)}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3><i class="bi bi-calendar-check"></i> Booking Statistics</h3>
                        <div class="detail-row">
                            <span class="label">Total Bookings:</span>
                            <span class="value"><strong>${user.bookingCount || 0}</strong></span>
                        </div>
                        ${bookings && bookings.length > 0 ? `
                            <div class="recent-bookings">
                                <h4>Recent Bookings</h4>
                                <ul>
                                    ${bookings.map(b => `
                                        <li>
                                            <strong>${b.booking_reference || b.id.slice(0,8)}</strong>
                                            <br>
                                            <small>${formatDate(b.created_at)} - ${getStatusBadge(b.status, 'booking')}</small>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : '<p><em>No bookings yet</em></p>'}
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-primary" onclick="editUser('${user.id}'); closeViewModal();">
                        <i class="bi bi-pencil"></i> Edit User
                    </button>
                    <button class="btn-secondary" onclick="closeViewModal()">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('Error viewing user:', error);
        showToast('Failed to load user details', 'error');
    }
}

// Toggle user status
async function toggleUserStatus(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const newStatus = (!user.status || user.status === 'active') ? 'suspended' : 'active';
    const action = newStatus === 'suspended' ? 'suspend' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} ${user.full_name || user.name || user.email}?`)) {
        return;
    }
    
    try {
        const sb = getSupabaseAdmin();
        
        const { data, error } = await sb
            .from('profiles')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        showToast(`User ${action}d successfully`, 'success');
        
        // Reload users
        await loadAllUsers();
        
    } catch (error) {
        console.error('Error updating user status:', error);
        showToast('Failed to update user status: ' + error.message, 'error');
    }
}

// Confirm delete user
function confirmDeleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    if (confirm(`Are you sure you want to delete ${user.full_name || user.name || user.email}? This action cannot be undone and will also delete all their bookings.`)) {
        deleteUser(userId);
    }
}

// Delete user
async function deleteUser(userId) {
    try {
        const sb = getSupabaseAdmin();
        
        // Delete user profile (bookings will be cascade deleted if foreign key is set)
        const { error } = await sb
            .from('profiles')
            .delete()
            .eq('id', userId);
        
        if (error) throw error;
        
        showToast('User deleted successfully', 'success');
        
        // Reload users
        await loadAllUsers();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Failed to delete user: ' + error.message, 'error');
    }
}

// Search users
function searchUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(user => {
            return (
                (user.full_name || '').toLowerCase().includes(searchTerm) ||
                (user.name || '').toLowerCase().includes(searchTerm) ||
                (user.email || '').toLowerCase().includes(searchTerm) ||
                (user.phone || '').includes(searchTerm)
            );
        });
    }
    
    displayUsers(filteredUsers);
}

// Filter users
function filterUsers() {
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredUsers = allUsers.filter(user => {
        const userRole = user.role || 'client';
        const userStatus = user.status || 'active';
        
        const matchesRole = !roleFilter || userRole === roleFilter;
        const matchesStatus = !statusFilter || userStatus === statusFilter;
        
        return matchesRole && matchesStatus;
    });
    
    displayUsers(filteredUsers);
}

// Sort users
function sortUsers() {
    const sortOrder = document.getElementById('sortOrder').value;
    
    filteredUsers.sort((a, b) => {
        switch(sortOrder) {
            case 'newest':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'oldest':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'name':
                return (a.full_name || a.name || '').localeCompare(b.full_name || b.name || '');
            case 'email':
                return a.email.localeCompare(b.email);
            default:
                return 0;
        }
    });
    
    displayUsers(filteredUsers);
}

// Clear filters
function clearFilters() {
    const searchInput = document.getElementById('searchInput');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    const sortOrder = document.getElementById('sortOrder');

    if(searchInput) searchInput.value = '';
    if(roleFilter) roleFilter.value = '';
    if(statusFilter) statusFilter.value = '';
    if(sortOrder) sortOrder.value = 'newest';
    
    filteredUsers = [...allUsers];
    displayUsers(filteredUsers);
    
    if(typeof showToast === 'function') showToast('Filters cleared', 'info');
}

// Refresh users
async function refreshUsers() {
    const btn = event.target.closest('button');
    let originalHTML = '';
    if(btn) {
        originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Refreshing...';
    }
    
    await loadAllUsers();
    
    if(btn) {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
    
    if(typeof showToast === 'function') showToast('Users refreshed', 'success');
}

// Export users (PDF)
function exportUsers() {
    try {
        if (filteredUsers.length === 0) {
            showToast('No users to export', 'warning');
            return;
        }
        
        showToast('Generating PDF...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('WOW Surprises - Users Report', 14, 20);
        
        // Add date
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Total Users: ${filteredUsers.length}`, 14, 34);
        
        // Prepare table data
        const tableData = filteredUsers.map(user => [
            user.full_name || user.name || 'N/A',
            user.email,
            user.phone || 'N/A',
            (user.role || 'client').toUpperCase(),
            (user.status || 'active').toUpperCase(),
            formatDate(user.created_at),
            user.bookingCount || 0
        ]);
        
        // Add table
        doc.autoTable({
            startY: 40,
            head: [['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined', 'Bookings']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [102, 126, 234] },
            styles: { fontSize: 9 }
        });
        
        // Save PDF
        doc.save(`WOW-Users-${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('PDF exported successfully', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export users', 'error');
    }
}

// Close modals
function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    currentUser = null;
    isEditMode = false;
}

function closeViewModal() {
    document.getElementById('viewModal').style.display = 'none';
}

// Close modal on outside click
window.onclick = function(event) {
    const userModal = document.getElementById('userModal');
    const viewModal = document.getElementById('viewModal');
    
    if (event.target === userModal) {
        closeUserModal();
    }
    if (event.target === viewModal) {
        closeViewModal();
    }
}

console.log('✅ Admin Users JS Loaded');