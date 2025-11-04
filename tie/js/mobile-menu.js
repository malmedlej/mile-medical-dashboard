/**
 * Mobile Menu Handler
 * Handles mobile sidebar toggle functionality
 * Version: 1.0
 */

(function() {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileOverlay = document.getElementById('mobileOverlay');
        const sidebar = document.querySelector('.sidebar');

        if (!mobileMenuToggle || !mobileOverlay || !sidebar) {
            console.warn('Mobile menu elements not found');
            return;
        }

        // Toggle menu function
        function toggleMenu() {
            const isOpen = sidebar.classList.contains('mobile-open');
            
            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        }

        // Open menu
        function openMenu() {
            sidebar.classList.add('mobile-open');
            mobileOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        // Close menu
        function closeMenu() {
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
        }

        // Event listeners
        mobileMenuToggle.addEventListener('click', toggleMenu);
        mobileOverlay.addEventListener('click', closeMenu);

        // Close menu when clicking on nav items (for better UX)
        const navItems = sidebar.querySelectorAll('.nav-item');
        navItems.forEach(function(item) {
            item.addEventListener('click', function() {
                // Only close if it's a real link (not disabled)
                if (!item.classList.contains('cursor-not-allowed')) {
                    closeMenu();
                }
            });
        });

        // Close menu on window resize if switching to desktop view
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                if (window.innerWidth > 768) {
                    closeMenu();
                }
            }, 250);
        });

        // Prevent menu from staying open if user navigates back/forward
        window.addEventListener('pageshow', function(event) {
            if (event.persisted) {
                closeMenu();
            }
        });
    });
})();
