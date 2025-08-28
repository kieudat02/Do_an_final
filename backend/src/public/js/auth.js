// Kiểm tra trạng thái đăng nhập và session timeout
class AuthManager {
    constructor() {
        this.checkInterval = 5 * 60 * 1000; // Kiểm tra mỗi 5 phút
        this.warningTime = 10 * 60 * 1000; // Cảnh báo trước 10 phút
        this.init();
    }

    init() {
        // Kiểm tra session định kỳ
        setInterval(() => {
            this.checkSessionStatus();
        }, this.checkInterval);

        // Kiểm tra khi user hoạt động
        this.bindActivityEvents();
    }

    async checkSessionStatus() {
        try {
            const response = await fetch('/auth/status', {
                method: 'GET',
                credentials: 'include'
            });

            const result = await response.json();

            if (!result.success) {
                this.handleSessionExpired();
            }
        } catch (error) {
            console.error('Error checking session status:', error);
        }
    }

    handleSessionExpired() {
        // Hiển thị thông báo và redirect về login
        this.showSessionExpiredToast();
        
        // Delay redirect để user đọc được thông báo
        setTimeout(() => {
            window.location.href = '/login';
        }, 3000);
    }

    showSessionExpiredToast() {
        const toastHtml = `
            <div class="toast align-items-center text-white bg-warning border-0 position-fixed top-0 end-0 m-3" 
                 role="alert" aria-live="assertive" aria-atomic="true" style="z-index: 9999;">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Phiên đăng nhập đã hết hạn. Đang chuyển về trang đăng nhập...
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                            data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.querySelector('.toast:last-child');
        const toast = new bootstrap.Toast(toastElement, {
            autohide: false
        });
        toast.show();
    }

    bindActivityEvents() {
        // Các sự kiện user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity();
            }, true);
        });
    }

    updateActivity() {
        // Có thể gửi request để gia hạn session nếu cần
        // Hiện tại session đã được gia hạn tự động trong middleware
    }
}

// Khởi tạo AuthManager khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', function() {
    // Chỉ khởi tạo nếu user đã đăng nhập
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        new AuthManager();
    }
});

// Utility functions cho auth
window.AuthUtils = {
    // Logout function
    logout: function() {
        if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
            fetch('/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                }
            }).then(() => {
                window.location.href = '/login';
            }).catch(error => {
                console.error('Logout error:', error);
                window.location.href = '/login';
            });
        }
    },

    // Check if user has specific role
    hasRole: function(role) {
        // Có thể lấy từ local storage hoặc data attribute
        const currentUserRole = document.body.getAttribute('data-user-role');
        return currentUserRole === role;
    },

    // Check if user has any of the roles
    hasAnyRole: function(roles) {
        const currentUserRole = document.body.getAttribute('data-user-role');
        return roles.includes(currentUserRole);
    }
};
