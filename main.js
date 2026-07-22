// ==========================================
// LIENZO WEB - MAIN JAVASCRIPT LOGIC
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const navbar = document.getElementById('navbar');
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const statNumbers = document.querySelectorAll('.stat-number');

    // 1. Sticky Navbar & Scroll Effects
    const handleScroll = () => {
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll);

    // 2. Mobile Menu Toggle
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileToggle.classList.toggle('open');
        });
    }

    // Close mobile menu on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
            }
        });
    });

    // 3. Counter Animation for Hero Stats
    const animateCounters = () => {
        statNumbers.forEach(stat => {
            const targetText = stat.getAttribute('data-target');
            if (!targetText) return;

            const isPercentage = targetText.includes('%');
            const isMultiplier = targetText.includes('x');
            const isPlus = targetText.includes('+');

            const numericValue = parseFloat(targetText.replace(/[^0-9.]/g, ''));
            if (isNaN(numericValue)) return;

            let current = 0;
            const duration = 1500; // ms
            const stepTime = 20;
            const steps = duration / stepTime;
            const increment = numericValue / steps;

            const timer = setInterval(() => {
                current += increment;
                if (current >= numericValue) {
                    current = numericValue;
                    clearInterval(timer);
                }

                let formatted = current % 1 === 0 ? current.toFixed(0) : current.toFixed(1);
                if (isMultiplier) formatted += 'x';
                if (isPercentage) formatted += '%';
                if (isPlus) formatted += 'k+';

                stat.textContent = formatted;
            }, stepTime);
        });
    };

    // IntersectionObserver for Triggering Counters
    const heroStatsSection = document.querySelector('.hero-stats');
    if (heroStatsSection) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounters();
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(heroStatsSection);
    }
});
