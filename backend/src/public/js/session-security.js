// Session Security Manager - Quản lý bảo mật session toàn cục
(function() {
    'use strict';
    
    // Cấu hình
    const CONFIG = {
        SESSION_TIMEOUT: 30 * 60 * 1000, // 30 phút
        WARNING_TIME: 5 * 60 * 1000,    // Cảnh báo trước 5 phút
        CHECK_INTERVAL: 60 * 1000,      // Kiểm tra mỗi phút
        API_ENDPOINTS: {
            refresh: '/api/refresh-session',
            status: '/api/session-status'
        }
    };
    
    // State
    let sessionWarningShown = false;
    let sessionTimer = null;
    let warningTimer = null;
    let statusCheckInterval = null;
    
    // Utility functions
    function isLoginPage() {
        return window.location.pathname.includes('/login');
    }
    
    function isProtectedPage() {
        const protectedPaths = ['/dashboard', '/tour', '/category', '/departure', 
                                '/destination', '/transportation', '/roles', '/account'];
        const currentPath = window.location.pathname;
        
        // Check if the current path exactly matches any of the protected paths
        // or if it's a subpath of a protected path (e.g., /tour/edit/123)
        return protectedPaths.some(path => {
            // Exact match
            if (currentPath === path) return true;
            
            // Subpath match (must start with the protected path followed by / or end of string)
            if (currentPath.startsWith(path + '/')) return true;
            
            return false;
        });
    }
    
    function redirectToLogin(reason = '') {
        const params = new URLSearchParams();
        if (reason) params.set(reason, 'true');
        
        // Clear all timers
        clearAllTimers();
        
        window.location.href = '/login' + (params.toString() ? '?' + params.toString() : '');
    }
    
    function clearAllTimers() {
        clearTimeout(sessionTimer);
        clearTimeout(warningTimer);
        clearInterval(statusCheckInterval);
    }
    
    function makeApiRequest(url, options = {}) {
        return fetch(url, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
    }
    
    // Session warning dialog
    function showSessionWarning() {
        if (sessionWarningShown) return;
        
        sessionWarningShown = true;
        
        const confirmed = confirm(
            'Phiên đăng nhập sắp hết hạn trong 5 phút.\n' +
            'Bạn có muốn tiếp tục làm việc không?'
        );
        
        if (confirmed) {
            refreshSession();
        } else {
            logout();
        }
    }
    
    // Refresh session
    async function refreshSession() {
        try {
            const response = await makeApiRequest(CONFIG.API_ENDPOINTS.refresh, {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    sessionWarningShown = false;
                    resetSessionTimers();
                    console.log('Session refreshed successfully');
                    return true;
                }
            }
            
            throw new Error('Failed to refresh session');
            
        } catch (error) {
            console.error('Session refresh error:', error);
            redirectToLogin('timeout');
            return false;
        }
    }
    
    // Check session status
    async function checkSessionStatus() {
        try {
            const response = await makeApiRequest(CONFIG.API_ENDPOINTS.status);
            
            if (!response.ok) {
                // Thay vì chuyển hướng ngay, chỉ log lỗi
                console.error('Session status check failed: Response not OK');
                // Không chuyển hướng nếu đang ở trang tour
                if (!window.location.pathname.includes('/tour')) {
                    redirectToLogin('unauthorized');
                }
                return false;
            }
            
            const data = await response.json();
            
            if (!data.success || !data.isValid) {
                console.error('Session invalid or expired');
                // Không chuyển hướng nếu đang ở trang tour
                if (!window.location.pathname.includes('/tour')) {
                    redirectToLogin('timeout');
                }
                return false;
            }
            
            // If session is close to expiry, show warning
            if (data.timeLeft < CONFIG.WARNING_TIME && !sessionWarningShown) {
                showSessionWarning();
            }
            
            return true;
            
        } catch (error) {
            console.error('Session status check error:', error);
            // Không chuyển hướng nếu đang ở trang tour
            if (!window.location.pathname.includes('/tour')) {
                redirectToLogin('timeout');
            }
            return false;
        }
    }
    
    // Logout
    function logout() {
        clearAllTimers();
        window.location.href = '/logout';
    }
    
    // Reset session timers
    function resetSessionTimers() {
        clearAllTimers();
        
        // Set warning timer
        warningTimer = setTimeout(showSessionWarning, CONFIG.SESSION_TIMEOUT - CONFIG.WARNING_TIME);
        
        // Set session timeout timer
        sessionTimer = setTimeout(() => {
            // Không chuyển hướng nếu đang ở trang tour
            if (!window.location.pathname.includes('/tour')) {
                redirectToLogin('timeout');
            } else {
                console.log('Session timeout occurred but staying on tour page');
                // Refresh session thay vì chuyển hướng
                refreshSession();
            }
        }, CONFIG.SESSION_TIMEOUT);
        
        // Set periodic status check
        statusCheckInterval = setInterval(checkSessionStatus, CONFIG.CHECK_INTERVAL);
    }
    
    // Handle user activity
    function handleUserActivity() {
        if (!sessionWarningShown && isProtectedPage()) {
            resetSessionTimers();
        }
    }
    
    // Prevent back button after logout
    function preventBackButton() {
        if (isLoginPage()) {
            // Check if coming from protected page
            const referrer = document.referrer;
            if (referrer && isProtectedPage()) {
                window.history.forward();
            }
        }
    }
    
    // Handle page visibility change (tab switching)
    function handleVisibilityChange() {
        if (document.hidden) {
            // Tạm dừng timer khi chuyển tab
            clearAllTimers();
        } else {
            if (isProtectedPage()) {
                // Chỉ reset timer thay vì check session ngay lập tức
                // Điều này tránh việc redirect không cần thiết
                resetSessionTimers();
            }
        }
    }
    
    // Initialize session security
    function initSessionSecurity() {
        // Don't initialize on login page
        if (isLoginPage()) {
            preventBackButton();
            return;
        }
        
        // Only initialize on protected pages
        if (!isProtectedPage()) {
            return;
        }
        
        // Start timers
        resetSessionTimers();
        
        // Add activity listeners
        const activityEvents = ['click', 'keypress', 'mousemove', 'scroll', 'touchstart'];
        activityEvents.forEach(event => {
            document.addEventListener(event, handleUserActivity, { passive: true });
        });
        
        // Add visibility change listener
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Add beforeunload listener for cleanup
        window.addEventListener('beforeunload', clearAllTimers);
        
        // Prevent cache - chỉ reload nếu thực sự cần thiết
        if (window.performance && window.performance.navigation.type === 2) {
            // Chỉ reload nếu đây là back/forward navigation và đang ở trang login
            if (isLoginPage()) {
                window.location.reload();
            }
        }
        
        console.log('Session security initialized');
    }
    
    // Handle page cache prevention - chỉ áp dụng cho login page
    function preventPageCache() {
        // Chỉ áp dụng cho login page
        if (!isLoginPage()) {
            return;
        }
        
        // Set cache-control headers via meta tags
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Cache-Control';
        meta.content = 'no-cache, no-store, must-revalidate';
        document.head.appendChild(meta);
        
        const pragma = document.createElement('meta');
        pragma.httpEquiv = 'Pragma';
        pragma.content = 'no-cache';
        document.head.appendChild(pragma);
        
        const expires = document.createElement('meta');
        expires.httpEquiv = 'Expires';
        expires.content = '0';
        document.head.appendChild(expires);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSessionSecurity);
    } else {
        initSessionSecurity();
    }
    
    // Prevent page cache
    preventPageCache();
    
    // Expose global functions if needed
    window.SessionSecurity = {
        refreshSession,
        checkSessionStatus,
        logout,
        isProtectedPage,
        isLoginPage
    };
    
})();
