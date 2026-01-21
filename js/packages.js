// Global variables
let allPackages = [];
let filteredPackages = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadPackages();
    setupEventListeners();
});

// Scroll to packages section
function scrollToPackages() {
    const packagesSection = document.getElementById('packagesSection');
    if (packagesSection) {
        packagesSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Load packages from API or mock data
async function loadPackages() {
    showLoading(true);
    try {
        // Try to fetch from Supabase database first
        try {
            const dbPackages = await API.packages.getPackages();
            if (dbPackages && dbPackages.length > 0) {
                // Transform database packages to match expected format
                allPackages = dbPackages.map(pkg => ({
                    id: pkg.id,
                    title: pkg.name || pkg.package_name,
                    description: pkg.description || '',
                    fullDescription: pkg.description || '',
                    category: pkg.category || 'general',
                    price: parseFloat(pkg.price || pkg.package_price || 0),
                    rating: pkg.rating || 5,
                    totalBookings: pkg.total_bookings || 0,
                    image: pkg.image_url || 'images/placeholder.jpg',
                    images: pkg.images || [pkg.image_url || 'images/placeholder.jpg'],
                    includes: pkg.features || [],
                    available: pkg.available !== false,
                    createdAt: pkg.created_at || new Date().toISOString()
                }));
                console.log('Loaded packages from database:', allPackages.length);
            } else {
                throw new Error('No packages in database');
            }
        } catch (dbError) {
            console.log('Database fetch failed, using mock data:', dbError);
            allPackages = getMockPackages();
        }
        
        filteredPackages = [...allPackages];
        displayPackages(filteredPackages);
    } catch (error) {
        console.error('Error loading packages:', error);
        showToast('Failed to load packages. Using default packages.', 'error');
        allPackages = getMockPackages();
        filteredPackages = [...allPackages];
        displayPackages(filteredPackages);
    } finally {
        showLoading(false);
    }
}

// Display packages in grid
function displayPackages(packages) {
    const grid = document.getElementById('packagesGrid');
    const noResults = document.getElementById('noResults');
    
    if (!grid) {
        console.error('packagesGrid element not found');
        return;
    }
    
    if (packages.length === 0) {
        grid.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        return;
    }
    
    if (noResults) noResults.style.display = 'none';
    
    grid.innerHTML = packages.map(pkg => `
        <div class="package-card" onclick="showPackageDetails('${pkg.id}')">
            <img src="${pkg.image}" alt="${pkg.title}" class="package-image" onerror="this.src='images/placeholder.jpg'">
            <div class="package-content">
                <span class="package-category">${pkg.category}</span>
                <h3 class="package-title">${pkg.title}</h3>
                <p class="package-description">${pkg.description}</p>
                <div class="package-footer">
                    <div class="package-price">₦${pkg.price.toLocaleString()}</div>
                    <div class="package-rating">
                        <span class="stars">${'★'.repeat(pkg.rating)}${'☆'.repeat(5-pkg.rating)}</span>
                        <span>(${pkg.totalBookings})</span>
                    </div>
                </div>
                <button class="view-details-btn" onclick="event.stopPropagation(); showPackageDetails('${pkg.id}')">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

// Show package details modal
function showPackageDetails(packageId) {
    const pkg = allPackages.find(p => p.id === packageId);
    if (!pkg) {
        showToast('Package not found', 'error');
        return;
    }
    
    const modal = document.getElementById('packageModal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) {
        console.error('Modal elements not found');
        return;
    }
    
    modalBody.innerHTML = `
        <div class="package-details">
            <div class="details-images">
                <img src="${pkg.image}" alt="${pkg.title}" class="main-image" id="mainImage" onerror="this.src='images/placeholder.jpg'">
                <div class="thumbnail-images">
                    ${pkg.images.map((img, i) => `
                        <img src="${img}" class="thumbnail ${i === 0 ? 'active' : ''}" 
                             onclick="changeMainImage('${img}', this)" onerror="this.src='images/placeholder.jpg'">
                    `).join('')}
                </div>
            </div>
            <div class="details-info">
                <span class="package-category">${pkg.category}</span>
                <h2>${pkg.title}</h2>
                <p style="color: #666; margin-bottom: 20px;">${pkg.fullDescription}</p>
                
                <h3 style="margin-top: 24px; font-size: 18px;"><i class="bi bi-check-circle"></i> What's Included:</h3>
                <ul class="includes-list">
                    ${pkg.includes.map(item => `<li>${item}</li>`).join('')}
                </ul>
                
                <div style="margin-top: 24px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
                    <div class="package-price" style="font-size: 32px;">₦${pkg.price.toLocaleString()}</div>
                    <p style="color: #666; margin-top: 8px; display: flex; align-items: center; gap: 8px; font-size: 14px;">
                        ${pkg.available ? '<i class="bi bi-check-circle-fill" style="color: #22c55e;"></i> Available for booking' : '<i class="bi bi-x-circle-fill" style="color: #dc2626;"></i> Currently unavailable'}
                    </p>
                </div>
                
                <button class="book-now-btn" onclick="initiateBooking('${pkg.id}')" 
                        ${!pkg.available ? 'disabled' : ''}>
                    <i class="bi bi-calendar-check"></i> Book Now
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Change main image in modal
function changeMainImage(imageSrc, thumbnail) {
    const mainImage = document.getElementById('mainImage');
    if (mainImage) {
        mainImage.src = imageSrc;
    }
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    if (thumbnail) {
        thumbnail.classList.add('active');
    }
}

// Initiate booking
function initiateBooking(packageId) {
    // Check if user is logged in
    const user = getCurrentUser();
    
    if (!user) {
        showToast('Please login to make a booking', 'error');
        const modal = document.getElementById('packageModal');
        if (modal) modal.style.display = 'none';
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }
    
    // Store selected package ID
    SessionStorage.set('selectedPackageId', packageId);
    
    // Close modal
    const modal = document.getElementById('packageModal');
    if (modal) modal.style.display = 'none';
    
    showToast('Package selected! Redirecting to booking...', 'success');
    
    // Navigate to booking page
    setTimeout(() => {
        window.location.href = 'booking.html';
    }, 1000);
}

// Setup event listeners
function setupEventListeners() {
    // Search
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', applyFilters);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') applyFilters();
        });
    }
    
    // Filters
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    const priceRange = document.getElementById('priceRange');
    const clearFiltersBtn = document.getElementById('clearFilters');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', applyFilters);
    }
    
    if (priceRange) {
        priceRange.addEventListener('input', updatePriceLabel);
        priceRange.addEventListener('change', applyFilters);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // Modal close
    const closeBtn = document.querySelector('.modal .close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = document.getElementById('packageModal');
            if (modal) modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('packageModal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Apply filters
function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const priceRange = document.getElementById('priceRange');
    const sortFilter = document.getElementById('sortFilter');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const category = categoryFilter ? categoryFilter.value : '';
    const maxPrice = priceRange ? parseInt(priceRange.value) : 1000000;
    const sortBy = sortFilter ? sortFilter.value : 'popular';
    
    // Filter
    filteredPackages = allPackages.filter(pkg => {
        const matchesSearch = pkg.title.toLowerCase().includes(searchTerm) || 
                            pkg.description.toLowerCase().includes(searchTerm);
        const matchesCategory = !category || pkg.category.toLowerCase() === category.toLowerCase();
        const matchesPrice = pkg.price <= maxPrice;
        
        return matchesSearch && matchesCategory && matchesPrice;
    });
    
    // Sort
    filteredPackages.sort((a, b) => {
        switch(sortBy) {
            case 'price-low':
                return a.price - b.price;
            case 'price-high':
                return b.price - a.price;
            case 'newest':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'popular':
            default:
                return b.totalBookings - a.totalBookings;
        }
    });
    
    displayPackages(filteredPackages);
}

// Update price label
function updatePriceLabel() {
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    
    if (priceRange && priceValue) {
        const value = parseInt(priceRange.value);
        priceValue.textContent = `₦0 - ${formatPrice(value)}`;
    }
}

// Clear filters
function clearFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    const sortFilter = document.getElementById('sortFilter');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (sortFilter) sortFilter.value = 'popular';
    
    if (priceRange) {
        priceRange.value = 500000;
        if (priceValue) priceValue.textContent = '₦0 - ₦500,000';
    }
    
    filteredPackages = [...allPackages];
    displayPackages(filteredPackages);
    
    showToast('Filters cleared', 'info');
}

// Show/hide loading
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const grid = document.getElementById('packagesGrid');
    
    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
    
    if (grid && show) {
        grid.style.display = 'none';
    } else if (grid) {
        grid.style.display = 'grid';
    }
}

// Show error message
function showError(message) {
    showToast(message, 'error');
}

// Mock data for development
function getMockPackages() {
    return [
        {
            id: 'pkg001',
            title: 'Romantic Dinner Surprise',
            description: 'Elegant candlelit dinner with live music',
            fullDescription: 'Create an unforgettable romantic evening with our elegant candlelit dinner package. Includes live music, premium wine selection, and personalized decorations.',
            category: 'anniversary',
            price: 75000,
            rating: 5,
            totalBookings: 245,
            image: 'images/amateur-couple-dancing-salsa-together.jpg',  
            images: [
                'images/amateur-couple-dancing-salsa-together.jpg',
                'images/amateur-couple-dancing-salsa-together.jpg',
                'images/amateur-couple-dancing-salsa-together.jpg',
            ],
            includes: [
                '3-course gourmet meal',
                'Live acoustic music',
                'Premium wine pairing',
                'Rose bouquet',
                'Personalized decorations',
                'Professional photographer (1 hour)'
            ],
            available: true,
            createdAt: '2025-01-15'
        },
        {
            id: 'pkg002',
            title: 'Birthday Bash Extravaganza',
            description: 'Full party setup with entertainment and catering',
            fullDescription: 'Make birthdays unforgettable with our complete party package including venue decoration, entertainment, catering, and more.',
            category: 'birthday',
            price: 180000,
            rating: 4,
            totalBookings: 189,
            image: 'images/top-view-decoration-with-chocolate-white-plate.jpg',
            images: [
                'images/top-view-decoration-with-chocolate-white-plate.jpg',
                'images/top-view-decoration-with-chocolate-white-plate.jpg',
                'images/top-view-decoration-with-chocolate-white-plate.jpg',
            ],
            includes: [
                'Venue decoration',
                'DJ or live band',
                'Catering for 50 guests',
                'Custom birthday cake',
                'Party favors',
                'Photo booth with props',
                'Event coordinator'
            ],
            available: true,
            createdAt: '2025-02-10'
        },
        {
            id: 'pkg003',
            title: 'Proposal Paradise',
            description: 'Magical proposal setup at scenic location',
            fullDescription: 'Pop the question in style with our premium proposal package. We handle everything from location setup to capturing the perfect moment.',
            category: 'proposal',
            price: 375000,
            rating: 5,
            totalBookings: 98,
            image: 'images/valentine-s-day-table-set-with-roses-engagement-ring-plate.jpg',
            images: [
                'images/valentine-s-day-table-set-with-roses-engagement-ring-plate.jpg',
                'images/valentine-s-day-table-set-with-roses-engagement-ring-plate.jpg',
                'images/valentine-s-day-table-set-with-roses-engagement-ring-plate.jpg'
            ],
            includes: [
                'Scenic location booking',
                'Romantic setup with flowers',
                'Professional photographer & videographer',
                'Champagne and roses',
                'Personalized signage',
                'Musician (optional)',
                'Planning consultation'
            ],
            available: true,
            createdAt: '2025-03-01'
        },
        {
            id: 'pkg004',
            title: 'Graduation Celebration',
            description: 'Celebrate academic achievement in style',
            fullDescription: 'Honor the graduate with our special celebration package featuring personalized touches and memorable experiences.',
            category: 'graduation',
            price: 120000,
            rating: 4,
            totalBookings: 156,
            image: 'images/diversity-students-graduation-success-celebration-concept.jpg',
            images: [
                'images/group-young-afro-american-female-student-dressed-black-graduation-gown-campus-as-background.jpg',
                'images/diversity-students-graduation-success-celebration-concept.jpg'
            ],
            includes: [
                'Venue decoration (school colors)',
                'Catering for 30 guests',
                'Graduation cake',
                'Photo slideshow setup',
                'Memory book station',
                'Customized banners'
            ],
            available: true,
            createdAt: '2025-01-20'
        },
        {
            id: 'pkg005',
            title: 'Luxury Weekend Getaway',
            description: 'Two-night stay at a 5-star resort with spa treatment',
            fullDescription: 'Escape the hustle and bustle with our luxury weekend getaway package. Includes a deluxe suite, spa treatments, fine dining, and exclusive resort activities for two.',
            category: 'getaway',
            price: 450000,
            rating: 5,
            totalBookings: 134,
            image: 'images/Link in bio to learn how to style your home like….jfif',
            images: [
                'images/Link in bio to learn how to style your home like….jfif',
                'images/Link in bio to learn how to style your home like….jfif',
                'images/Link in bio to learn how to style your home like….jfif'
            ],
            includes: [
                '2-night deluxe suite accommodation',
                'Couples spa treatment',
                'Daily breakfast & dinner',
                'Private pool access',
                'Complimentary wine & fruit basket',
                'Late checkout'
            ],
            available: true,
            createdAt: '2025-02-25'
        },
        {
            id: 'pkg006',
            title: 'Corporate Gala Night',
            description: 'Elegant corporate dinner and entertainment package',
            fullDescription: 'Host a flawless gala event for your company. Includes full venue setup, catering, audiovisuals, and entertainment for a night of class and prestige.',
            category: 'corporate',
            price: 600000,
            rating: 4,
            totalBookings: 72,
            image: 'images/f8f4ad63-ace9-40b7-a5b6-5558aaa70be3.jfif',
            images: [
                'images/f8f4ad63-ace9-40b7-a5b6-5558aaa70be3.jfif',
                'images/f8f4ad63-ace9-40b7-a5b6-5558aaa70be3.jfif',
                'images/f8f4ad63-ace9-40b7-a5b6-5558aaa70be3.jfif'
            ],
            includes: [
                'Venue decoration',
                'Professional catering',
                'Live band/DJ',
                'MC & host services',
                'Audio/Visual setup',
                'Photography & videography',
                'Event coordination team'
            ],
            available: true,
            createdAt: '2025-03-12'
        },
        {
            id: 'pkg007',
            title: 'Kids Funfair Party',
            description: 'Exciting themed funfair experience for kids',
            fullDescription: 'Make kids smile with our full funfair setup including games, rides, snacks, and professional entertainers. Perfect for birthdays and school events.',
            category: 'kids',
            price: 95000,
            rating: 4,
            totalBookings: 203,
            image: 'images/1c1f2b88-1a1c-495a-95bb-60fe8271ec42.jfif',
            images: [
                'images/1c1f2b88-1a1c-495a-95bb-60fe8271ec42.jfif',
                'images/1c1f2b88-1a1c-495a-95bb-60fe8271ec42.jfif',
                'images/1c1f2b88-1a1c-495a-95bb-60fe8271ec42.jfif'
            ],
            includes: [
                'Themed decorations',
                'Clown/magician performance',
                'Mini rides & games',
                'Cotton candy & popcorn stand',
                'Birthday cake',
                'Party favors for kids'
            ],
            available: true,
            createdAt: '2025-03-20'
        }
    ];
}