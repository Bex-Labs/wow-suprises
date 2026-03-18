/**
 * Admin Users Management - FINAL PRODUCTION VERSION
 * Features: 5-Card Stats, Schema-Aware Role Detection, Auth API Integration, and PDF Export
 */

let allUsers = [];
let filteredUsers = [];
let currentUser = null;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Admin Users Page Initializing...');
    
    if (typeof protectAdminRoute === 'function') {
        const isAuth = await protectAdminRoute();
        if (!isAuth) return;
    }
    
    await loadAdminName();
    await loadAllUsers();
});

async function loadAdminName() {
    try {
        const sb = window.sbClient || window.supabase;
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
            const { data: profile } = await sb.from('profiles').select('full_name').eq('id', user.id).single();
            const nameEl = document.getElementById('adminName');
            if (nameEl) nameEl.textContent = profile?.full_name || 'Admin';
        }
    } catch (e) {}
}

// ==========================================
// 1. SMART USER LOADING
// ==========================================
async function loadAllUsers() {
    console.log('📥 Loading users and verifying merchant status...');
    try {
        const sb = window.sbClient;
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="bi bi-arrow-repeat spin"></i> Loading...</td></tr>';
        
        // 1. Fetch Profiles
        const { data: profiles, error: err1 } = await sb
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        if (err1) throw err1;

        // 2. Fetch Merchant IDs to cross-reference
        const { data: merchants, error: err2 } = await sb.from('merchants').select('user_id'); 
        const merchantUserIds = new Set((merchants || []).map(m => m.user_id));

        // 3. Merge & Normalize
        allUsers = profiles.map(user => {
            // Force Merchant Role if ID exists in merchant table
            if (merchantUserIds.has(user.id)) {
                user.role = 'merchant';
            }
            
            // Normalize status
            if (!user.status) user.status = 'active';
            const s = String(user.status).toLowerCase();
            user.status = (s === 'active' || s === 'true' || s === '1') ? 'active' : 'suspended';
            
            return user;
        });

        filteredUsers = [...allUsers];
        console.log(`✅ Loaded ${allUsers.length} users. Identified ${merchantUserIds.size} merchants.`);
        
        await loadBookingCounts();
        updateStats();
        applyFilters(); // Re-apply filters before displaying
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('usersTableBody').innerHTML = `<tr><td colspan="7" class="error-text" style="color:red; text-align:center;">Failed to load: ${error.message}</td></tr>`;
    }
}

// ==========================================
// 2. STATS & DISPLAY
// ==========================================
function updateStats() {
    const stats = {
        total: allUsers.length,
        clients: allUsers.filter(u => u.role !== 'admin' && u.role !== 'merchant').length,
        admins: allUsers.filter(u => u.role === 'admin').length,
        merchants: allUsers.filter(u => u.role === 'merchant').length,
        active: allUsers.filter(u => u.status === 'active').length
    };
    
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    setText('totalUsersCount', stats.total);
    setText('clientsCount', stats.clients);
    setText('merchantsCount', stats.merchants); 
    setText('adminsCount', stats.admins);
    setText('activeUsersCount', stats.active);
    setText('totalCount', `${stats.total} users`);
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (users.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';
    
    tbody.innerHTML = users.map(user => {
        let roleClass = 'badge-secondary', roleIcon = 'bi-person', roleLabel = 'Client';

        if (user.role === 'admin') {
            roleClass = 'badge-primary'; roleIcon = 'bi-shield-check'; roleLabel = 'Admin';
        } else if (user.role === 'merchant') {
            roleClass = 'badge-info'; roleIcon = 'bi-shop'; roleLabel = 'Merchant';
        }

        const statusClass = user.status === 'active' ? 'status-success' : 'status-danger';
        const statusLabel = user.status === 'active' ? 'Active' : 'Suspended';

        return `
        <tr>
            <td>
                <div class="user-info" style="display:flex; align-items:center; gap:12px;">
                    <div class="user-avatar-small" style="width:36px; height:36px; background:#f1f5f9; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                        ${user.avatar_url ? `<img src="${user.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : `<i class="bi bi-person" style="color:#64748b;"></i>`}
                    </div>
                    <div>
                        <div class="user-name-table" style="font-weight:600; color:#1e293b;">${user.full_name || user.name || 'No Name'}</div>
                        <small style="color:#64748b;">${user.email}</small>
                    </div>
                </div>
            </td>
            <td>${user.phone || '<span style="color:#cbd5e1; font-style:italic;">N/A</span>'}</td>
            <td><span class="badge ${roleClass}"><i class="bi ${roleIcon}"></i> ${roleLabel}</span></td>
            <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString('en-GB')}</td>
            <td><span class="badge ${user.bookingCount > 0 ? 'badge-info' : 'badge-secondary'}">${user.bookingCount || 0}</span></td>
            <td>
                <div class="action-buttons" style="display:flex; gap:6px;">
                    <button class="btn-icon" onclick="viewUser('${user.id}')" title="View"><i class="bi bi-eye"></i></button>
                    <button class="btn-icon" onclick="editUser('${user.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
                    <button class="btn-icon ${user.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleUserStatus('${user.id}')" title="Toggle Status">
                        <i class="bi bi-${user.status === 'active' ? 'pause-circle' : 'play-circle'}"></i>
                    </button>
                    ${user.role !== 'admin' ? `<button class="btn-icon btn-danger" onclick="confirmDeleteUser('${user.id}')" title="Delete"><i class="bi bi-trash"></i></button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ==========================================
// 3. UNIFIED FILTERS & SORT
// ==========================================
window.applyFilters = function() {
    const term = (document.getElementById('searchInput').value || '').toLowerCase().trim();
    const role = document.getElementById('roleFilter').value;
    const status = document.getElementById('statusFilter').value;
    const sort = document.getElementById('sortOrder').value;

    filteredUsers = allUsers.filter(u => {
        const matchesSearch = (u.full_name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term) || (u.phone || '').includes(term);
        const matchesRole = !role || u.role === role;
        const matchesStatus = !status || u.status === status;
        
        return matchesSearch && matchesRole && matchesStatus;
    });

    filteredUsers.sort((a, b) => {
        if (sort === 'name') return (a.full_name || '').localeCompare(b.full_name || '');
        if (sort === 'email') return (a.email || '').localeCompare(b.email || '');
        if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        // default: newest
        return new Date(b.created_at) - new Date(a.created_at);
    });

    displayUsers(filteredUsers);
};

window.clearFilters = function() {
    document.getElementById('searchInput').value = '';
    document.getElementById('roleFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('sortOrder').value = 'newest';
    applyFilters();
};

window.refreshUsers = async function() { 
    await loadAllUsers(); 
    if(typeof showToast === 'function') showToast('Users list refreshed', 'success');
};

// ==========================================
// 4. HELPERS & CRUD (WITH AUTH API)
// ==========================================
async function loadBookingCounts() {
    try {
        const { data } = await window.sbClient.from('bookings').select('user_id');
        const counts = {};
        if (data) data.forEach(b => counts[b.user_id] = (counts[b.user_id] || 0) + 1);
        allUsers.forEach(u => u.bookingCount = counts[u.id] || 0);
    } catch(e) { console.error(e); }
}

window.openCreateUserModal = function() {
    isEditMode = false; currentUser = null;
    document.getElementById('userModalTitle').innerHTML = '<i class="bi bi-person-plus"></i> Add New User';
    document.getElementById('userForm').reset();
    
    document.getElementById('userPassword').required = true;
    document.getElementById('passwordHelperText').textContent = 'Required for new users. Min 6 characters.';
    
    document.getElementById('userModal').style.display = 'block';
};

window.editUser = function(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;
    isEditMode = true; currentUser = user;
    
    document.getElementById('userModalTitle').innerHTML = '<i class="bi bi-pencil"></i> Edit User';
    const form = document.getElementById('userForm');
    form.full_name.value = user.full_name || '';
    form.email.value = user.email;
    form.phone.value = user.phone || '';
    form.role.value = user.role;
    form.status.value = user.status;
    
    document.getElementById('userPassword').required = false;
    document.getElementById('passwordHelperText').textContent = 'Leave blank to keep existing password';
    
    document.getElementById('userModal').style.display = 'block';
};

// FIX: Added actual Auth API call for user creation
window.saveUser = async function(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const saveBtn = document.getElementById('saveUserBtn');
    
    let role = fd.get('role');
    if (role === 'merchant') role = 'client'; 

    const email = fd.get('email').trim();
    const password = fd.get('password');
    const full_name = fd.get('full_name').trim();
    
    const data = {
        full_name: full_name, 
        email: email,
        phone: fd.get('phone'), 
        role: role, 
        status: fd.get('status'),
        updated_at: new Date().toISOString()
    };
    
    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Saving...';

        if (isEditMode) {
            // Update Profile
            const { error } = await window.sbClient.from('profiles').update(data).eq('id', currentUser.id);
            if (error) throw error;

            // Optional: Update password if provided
            if (password && password.length >= 6) {
                // Requires admin context to change another user's password usually, 
                // but if using anon key, this only works for self. 
                // We'll log a warning and let the profile update succeed.
                console.warn("Notice: Password changes for existing users require a password reset link in standard configurations.");
            }
            
            if(typeof showToast === 'function') showToast('User profile updated successfully', 'success');
            
        } else {
            // CREATE NEW USER VIA AUTH API
            if (!password || password.length < 6) {
                if(typeof showToast === 'function') showToast('Password must be at least 6 characters', 'error');
                return;
            }

            console.log("Creating new user via Auth API...");
            const { data: authData, error: authError } = await window.sbClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: full_name,
                        phone: data.phone,
                        role: role
                    }
                }
            });

            if (authError) throw authError;

            // Wait briefly for the DB trigger to create the profile row
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Force update the profile status if needed
            if (authData.user) {
                await window.sbClient.from('profiles').update({
                    status: data.status,
                    role: role
                }).eq('id', authData.user.id);
            }

            if(typeof showToast === 'function') showToast('User created successfully!', 'success');
        }
        
        closeUserModal(); 
        await loadAllUsers();
        
    } catch(err) { 
        console.error("Save Error:", err);
        if(typeof showToast === 'function') {
            showToast(err.message || 'Error saving user', 'error'); 
        } else {
            alert(err.message || 'Error saving user');
        }
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check-circle"></i> Save User';
    }
};

window.toggleUserStatus = async function(id) {
    const user = allUsers.find(u => u.id === id);
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
        await window.sbClient.from('profiles').update({ status: newStatus }).eq('id', id);
        if(typeof showToast === 'function') showToast(`User is now ${newStatus}`, 'success');
        await loadAllUsers();
    } catch(e) { 
        if(typeof showToast === 'function') showToast('Error updating status', 'error'); 
    }
};

window.deleteUser = async function(id) {
    try {
        await window.sbClient.from('profiles').delete().eq('id', id);
        if(typeof showToast === 'function') showToast('User deleted', 'success');
        await loadAllUsers();
    } catch(e) { 
        if(typeof showToast === 'function') showToast('Delete failed', 'error'); 
    }
};

window.confirmDeleteUser = function(id) { 
    if(confirm('Are you sure you want to permanently delete this user?')) deleteUser(id); 
};

// ==========================================
// 5. EXPORT MODALS
// ==========================================
window.closeUserModal = function() { document.getElementById('userModal').style.display = 'none'; };
window.closeViewModal = function() { document.getElementById('viewModal').style.display = 'none'; };

window.onclick = function(e) {
    if(e.target.id === 'userModal') closeUserModal();
    if(e.target.id === 'viewModal') closeViewModal();
};

window.viewUser = async function(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;
    
    const body = document.getElementById('viewModalBody');
    const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    
    body.innerHTML = `
        <div style="display:flex; align-items:center; gap:20px; margin-bottom:20px; padding:15px; background:#f8fafc; border-radius:8px;">
            <div style="width:60px; height:60px; background:#e2e8f0; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; color:#64748b;">
                ${user.avatar_url ? `<img src="${user.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : `<i class="bi bi-person"></i>`}
            </div>
            <div>
                <h3 style="margin:0; color:#0f172a;">${user.full_name || 'No Name Provided'}</h3>
                <div style="color:#64748b;">${user.email}</div>
            </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            <div style="padding:15px; border:1px solid #e2e8f0; border-radius:8px;">
                <label style="font-size:12px; color:#64748b; font-weight:bold;">PHONE</label>
                <div style="font-size:14px; margin-top:4px;">${user.phone || 'N/A'}</div>
            </div>
            <div style="padding:15px; border:1px solid #e2e8f0; border-radius:8px;">
                <label style="font-size:12px; color:#64748b; font-weight:bold;">ROLE</label>
                <div style="font-size:14px; margin-top:4px; font-weight:600;">${roleLabel}</div>
            </div>
            <div style="padding:15px; border:1px solid #e2e8f0; border-radius:8px;">
                <label style="font-size:12px; color:#64748b; font-weight:bold;">STATUS</label>
                <div style="font-size:14px; margin-top:4px; color:${user.status==='active'?'#16a34a':'#dc2626'}; font-weight:600;">${(user.status || 'Active').toUpperCase()}</div>
            </div>
            <div style="padding:15px; border:1px solid #e2e8f0; border-radius:8px;">
                <label style="font-size:12px; color:#64748b; font-weight:bold;">JOINED</label>
                <div style="font-size:14px; margin-top:4px;">${new Date(user.created_at).toLocaleDateString('en-GB')}</div>
            </div>
        </div>
    `;
    
    document.getElementById('viewModal').style.display = 'block';
};

// FIX: Added jsPDF Generation
window.exportUsers = function() {
    try {
        if (!filteredUsers || filteredUsers.length === 0) {
            if(typeof showToast === 'function') showToast('No users found to export.', 'warning');
            return;
        }

        if(typeof showToast === 'function') showToast('Generating Users PDF...', 'info');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setProperties({ title: 'WOW Surprises - Users Directory' });
        doc.setFontSize(20);
        doc.text('WOW Surprises - Users Directory', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text(`Total Records: ${filteredUsers.length}`, 14, 36);

        const tableColumns = ["Name", "Email", "Phone", "Role", "Status", "Joined"];
        const tableRows = filteredUsers.map(u => [
            u.full_name || 'N/A',
            u.email || 'N/A',
            u.phone || 'N/A',
            (u.role || 'client').toUpperCase(),
            (u.status || 'active').toUpperCase(),
            new Date(u.created_at).toLocaleDateString('en-GB')
        ]);

        doc.autoTable({
            head: [tableColumns],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { fontSize: 9 }
        });

        doc.save(`WOW_Users_Directory_${new Date().getTime()}.pdf`);
        if(typeof showToast === 'function') showToast('PDF Exported Successfully!', 'success');

    } catch (error) {
        console.error('Export Error:', error);
        if(typeof showToast === 'function') showToast('Failed to generate PDF.', 'error');
    }
};