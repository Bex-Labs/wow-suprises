// API Service - Handles all backend communication

const API_BASE_URL = 'http://localhost:3000/api'; // Change this to your backend URL

// API Helper function
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    // Add auth token if user is logged in
    const user = getCurrentUser();
    if (user && user.token) {
        defaultOptions.headers['Authorization'] = `Bearer ${user.token}`;
    }
    
    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Package APIs
const PackageAPI = {
    // Get all packages
    async getAll(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return await apiCall(`/packages${queryString ? '?' + queryString : ''}`);
    },
    
    // Get package by ID
    async getById(id) {
        return await apiCall(`/packages/${id}`);
    },
    
    // Search packages
    async search(query) {
        return await apiCall(`/packages/search?query=${encodeURIComponent(query)}`);
    },
    
    // Get categories
    async getCategories() {
        return await apiCall('/categories');
    },
    
    // Get featured packages
    async getFeatured() {
        return await apiCall('/packages/featured');
    }
};

// Booking APIs
const BookingAPI = {
    // Create booking
    async create(bookingData) {
        return await apiCall('/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    },
    
    // Get user's bookings
    async getAll() {
        return await apiCall('/bookings');
    },
    
    // Get booking by ID
    async getById(id) {
        return await apiCall(`/bookings/${id}`);
    },
    
    // Update booking
    async update(id, updateData) {
        return await apiCall(`/bookings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    },
    
    // Cancel booking
    async cancel(id, reason) {
        return await apiCall(`/bookings/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason })
        });
    },
    
    // Get booking status
    async getStatus(id) {
        return await apiCall(`/bookings/${id}/status`);
    }
};

// Payment APIs
const PaymentAPI = {
    // Process payment
    async process(bookingId, paymentData) {
        return await apiCall(`/bookings/${bookingId}/payment`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    },
    
    // Get payment methods
    async getMethods() {
        return await apiCall('/payment/methods');
    }
};

// User/Auth APIs
const AuthAPI = {
    // Login
    async login(email, password) {
        return await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },
    
    // Register
    async register(userData) {
        return await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },
    
    // Logout
    async logout() {
        return await apiCall('/auth/logout', {
            method: 'POST'
        });
    },
    
    // Get user profile
    async getProfile() {
        return await apiCall('/auth/profile');
    }
};

// Mock Data Service (for development without backend)
const MockAPI = {
    // Simulated delay
    delay(ms = 500) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Mock packages data
    packages: [
        // Same mock data from packages.js getMockPackages()
    ],
    
    // Mock bookings data
    bookings: [],
    
    // Get packages
    async getPackages() {
        await this.delay();
        return this.packages;
    },
    
    // Get package by ID
    async getPackageById(id) {
        await this.delay();
        return this.packages.find(p => p.id === id);
    },
    
    // Create booking
    async createBooking(bookingData) {
        await this.delay();
        const booking = {
            id: generateId('booking'),
            ...bookingData,
            status: 'pending',
            bookingReference: generateBookingReference(),
            createdAt: new Date().toISOString()
        };
        this.bookings.push(booking);
        return booking;
    },
    
    // Get bookings
    async getBookings() {
        await this.delay();
        return this.bookings;
    },
    
    // Update booking
    async updateBooking(id, updates) {
        await this.delay();
        const index = this.bookings.findIndex(b => b.id === id);
        if (index !== -1) {
            this.bookings[index] = { ...this.bookings[index], ...updates };
            return this.bookings[index];
        }
        throw new Error('Booking not found');
    },
    
    // Cancel booking
    async cancelBooking(id) {
        await this.delay();
        const index = this.bookings.findIndex(b => b.id === id);
        if (index !== -1) {
            this.bookings[index].status = 'cancelled';
            this.bookings[index].cancelledAt = new Date().toISOString();
            return this.bookings[index];
        }
        throw new Error('Booking not found');
    }
};

// Export for use - defaults to Mock for development
const API = {
    packages: MockAPI,
    bookings: MockAPI,
    payment: PaymentAPI,
    auth: AuthAPI
};