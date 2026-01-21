// Hero Carousel JavaScript - WOW Surprises (FIXED VERSION)
// Full-width background image carousel with auto-play

console.log('🎠 Loading Hero Carousel (FIXED)...');

class HeroCarousel {
    constructor() {
        this.currentSlide = 0;
        this.slides = document.querySelectorAll('.hero-slide');
        this.dots = document.querySelectorAll('.carousel-dot');
        this.prevBtn = document.querySelector('.carousel-prev');
        this.nextBtn = document.querySelector('.carousel-next');
        this.carousel = document.querySelector('.hero-carousel');
        this.autoPlayInterval = null;
        this.autoPlayDelay = 5000; // 5 seconds
        this.isTransitioning = false;
        
        this.init();
    }
    
    init() {
        if (!this.slides || this.slides.length === 0) {
            console.error('❌ No carousel slides found! Check your HTML.');
            return;
        }
        
        console.log(`✅ Carousel initialized with ${this.slides.length} slides`);
        
        // Show first slide immediately
        this.showSlide(0, false);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // IMPORTANT: Start auto-play after a short delay
        setTimeout(() => {
            this.startAutoPlay();
            console.log('🎬 Auto-play started!');
        }, 100);
        
        // Pause on hover
        if (this.carousel) {
            this.carousel.addEventListener('mouseenter', () => {
                console.log('⏸️ Paused (hover)');
                this.pauseAutoPlay();
            });
            this.carousel.addEventListener('mouseleave', () => {
                console.log('▶️ Resumed (hover out)');
                this.startAutoPlay();
            });
        }
    }
    
    setupEventListeners() {
        // Dots navigation
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                console.log(`Dot ${index + 1} clicked`);
                this.goToSlide(index);
            });
        });
        
        // Previous button
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => {
                console.log('Previous button clicked');
                this.previousSlide();
            });
        }
        
        // Next button
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => {
                console.log('Next button clicked');
                this.nextSlide();
            });
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.previousSlide();
            } else if (e.key === 'ArrowRight') {
                this.nextSlide();
            }
        });
        
        // Touch swipe support
        this.setupTouchEvents();
    }
    
    setupTouchEvents() {
        let touchStartX = 0;
        let touchEndX = 0;
        
        if (this.carousel) {
            this.carousel.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });
            
            this.carousel.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                this.handleSwipe(touchStartX, touchEndX);
            }, { passive: true });
        }
    }
    
    handleSwipe(startX, endX) {
        const swipeThreshold = 50;
        const diff = startX - endX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                this.nextSlide();
            } else {
                this.previousSlide();
            }
        }
    }
    
    showSlide(index, animate = true) {
        // Don't block if we're auto-advancing
        if (this.isTransitioning && animate) {
            return;
        }
        
        if (animate) {
            this.isTransitioning = true;
        }
        
        console.log(`📸 Showing slide ${index + 1} of ${this.slides.length}`);
        
        // Hide all slides
        this.slides.forEach(slide => {
            slide.classList.remove('active');
        });
        
        // Remove active from all dots
        this.dots.forEach(dot => {
            dot.classList.remove('active');
        });
        
        // Show current slide
        if (this.slides[index]) {
            this.slides[index].classList.add('active');
        }
        
        // Activate current dot
        if (this.dots[index]) {
            this.dots[index].classList.add('active');
        }
        
        this.currentSlide = index;
        
        // Reset transition flag
        if (animate) {
            setTimeout(() => {
                this.isTransitioning = false;
            }, 600);
        }
    }
    
    goToSlide(index) {
        this.pauseAutoPlay();
        this.showSlide(index);
        this.startAutoPlay();
    }
    
    nextSlide() {
        this.pauseAutoPlay();
        const next = (this.currentSlide + 1) % this.slides.length;
        this.showSlide(next);
        this.startAutoPlay();
    }
    
    previousSlide() {
        this.pauseAutoPlay();
        const prev = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
        this.showSlide(prev);
        this.startAutoPlay();
    }
    
    startAutoPlay() {
        // Clear any existing interval first
        this.pauseAutoPlay();
        
        console.log(`▶️ Starting auto-play (${this.autoPlayDelay / 1000}s interval)`);
        
        this.autoPlayInterval = setInterval(() => {
            const next = (this.currentSlide + 1) % this.slides.length;
            console.log(`⏩ Auto-advancing to slide ${next + 1}`);
            this.showSlide(next, false); // Don't block on auto-advance
        }, this.autoPlayDelay);
    }
    
    pauseAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }
    
    destroy() {
        this.pauseAutoPlay();
    }
}

// Initialize carousel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Ready - Initializing carousel...');
    
    // Small delay to ensure all elements are loaded
    setTimeout(() => {
        const heroCarousel = new HeroCarousel();
        window.heroCarousel = heroCarousel;
        console.log('✅ ✅ ✅ Hero Carousel Ready & Auto-Playing! ✅ ✅ ✅');
    }, 200);
});

// Handle page visibility change (pause when tab is not visible)
document.addEventListener('visibilitychange', () => {
    if (window.heroCarousel) {
        if (document.hidden) {
            console.log('⏸️ Tab hidden - pausing carousel');
            window.heroCarousel.pauseAutoPlay();
        } else {
            console.log('▶️ Tab visible - resuming carousel');
            window.heroCarousel.startAutoPlay();
        }
    }
});

console.log('✅ Hero Carousel Script Loaded (FIXED VERSION)');