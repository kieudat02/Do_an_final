// Global Toast Notification System - Modern Web Implementation
// Provides consistent toast functionality with improved UX and single toast management

(function() {
    'use strict';

    let currentToast = null;

    // Hide notification with smooth animation
    function hideToastNotification(notification) {
        if (notification && notification.classList.contains('modal-notify')) {
            notification.classList.remove('modal-notify--active');
            notification.classList.add('modal-notify--hiding');
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                if (currentToast === notification) {
                    currentToast = null;
                }
            }, 300); // Wait for transition to complete
        }
    }

    // Show notification programmatically with single toast management
    function showToastNotification(message, type = 'success') {
        // Remove existing toast immediately for smooth transition
        if (currentToast) {
            hideToastNotification(currentToast);
        }

        // Wait a brief moment for the previous toast to start hiding
        setTimeout(() => {
            // Create new notification
            const notification = document.createElement('div');
            notification.className = `modal-notify modal-notify--${type}`;
            
            notification.innerHTML = `
                <div class="modal-notify__content">
                    <span class="modal-notify__message">${message}</span>
                    <button class="modal-notify__close" type="button" aria-label="Đóng thông báo">
                        ×
                    </button>
                </div>
            `;

            // Set up close button event listener
            const closeBtn = notification.querySelector('.modal-notify__close');
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                hideToastNotification(notification);
            });

            // Add to body
            document.body.appendChild(notification);
            currentToast = notification;

            // Show with animation
            setTimeout(() => {
                notification.classList.add('modal-notify--active');
            }, 10);

            // Auto-hide after 4 seconds (slightly longer for better UX)
            setTimeout(() => {
                if (currentToast === notification) {
                    hideToastNotification(notification);
                }
            }, 4000);

            return notification;
        }, currentToast ? 150 : 0); // Brief delay if replacing existing toast
    }

    // Setup auto-hide and close button for existing notifications
    function setupExistingNotification(notification) {
        // Set up auto-hide timer (4 seconds)
        if (notification.classList.contains('modal-notify--active')) {
            setTimeout(() => {
                hideToastNotification(notification);
            }, 4000);
        }
        
        // Setup close button if not already set up
        const closeBtn = notification.querySelector(".modal-notify__close");
        if (closeBtn && !closeBtn.hasAttribute("data-close-setup")) {
            closeBtn.setAttribute("data-close-setup", "true");
            closeBtn.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                hideToastNotification(notification);
            });
        }

        // Track this as current toast if it's active
        if (notification.classList.contains('modal-notify--active')) {
            currentToast = notification;
        }
    }

    // Setup all existing notifications on page load
    function initializeToastNotifications() {
        const notifications = document.querySelectorAll(".modal-notify");
        notifications.forEach(setupExistingNotification);
    }

    // Clear all toasts function (useful for page transitions)
    function clearAllToasts() {
        const notifications = document.querySelectorAll('.modal-notify');
        notifications.forEach(notification => {
            hideToastNotification(notification);
        });
        currentToast = null;
    }

    // Make functions globally available
    window.hideToastNotification = hideToastNotification;
    window.showToastNotification = showToastNotification;
    window.clearAllToasts = clearAllToasts;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeToastNotifications);
    } else {
        initializeToastNotifications();
    }

    // Clean up on page unload
    window.addEventListener('beforeunload', clearAllToasts);
})();
