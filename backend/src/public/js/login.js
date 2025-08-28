// Toggle hiển thị mật khẩu
document.getElementById('togglePassword').addEventListener('click', function() {
    const password = document.getElementById('password');
    const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
    password.setAttribute('type', type);
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// Xử lý hiển thị thông báo toast
document.addEventListener('DOMContentLoaded', function() {
    const loginPage = document.querySelector('.login-page');
    
    // Xử lý thông báo đăng xuất thành công
    if (loginPage.hasAttribute('data-logout-success') && loginPage.hasAttribute('data-success-message')) {
        const message = loginPage.getAttribute('data-success-message');
        
        // Hiển thị thông báo ngay lập tức, không kiểm tra sessionStorage
        showToastNotification(message, "success");
        
        // Xóa query parameter logout=success khỏi URL
        if (window.history && window.history.replaceState) {
            const url = new URL(window.location.href);
            url.searchParams.delete('logout');
            window.history.replaceState({}, document.title, url.toString());
        }
    }
    // Xử lý các thông báo thành công khác
    else if (loginPage.hasAttribute('data-success-message')) {
        const message = loginPage.getAttribute('data-success-message');
        showToastNotification(message, "success");
    }
    
    // Xử lý thông báo lỗi
    if (loginPage.hasAttribute('data-error-message')) {
        const errorMessage = loginPage.getAttribute('data-error-message');
        showToastNotification(errorMessage, "error");
    }
});

// Xử lý form submit
document.getElementById('loginForm').addEventListener('submit', function(e) {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        e.preventDefault();
        showToastNotification('Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }

    if (password.length < 6) {
        e.preventDefault();
        showToastNotification('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
        return;
    }

    // Hiển thị loading
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đăng nhập...';
    submitBtn.disabled = true;
});

// Xử lý session security
(function() {
    // Ngăn cache trang login
    if (window.performance && window.performance.navigation.type === 2) {
        // Trang được load từ cache (back button)
        window.location.reload();
    }
    
    // Disable back button sau khi login thành công
    if (document.referrer.includes('/dashboard') || document.referrer.includes('/tour') || 
        document.referrer.includes('/category') || document.referrer.includes('/account')) {
        window.history.forward();
    }
    
    // Xử lý session timeout trên client
    let sessionWarningShown = false;
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 phút
    const WARNING_TIME = 5 * 60 * 1000; // Cảnh báo trước 5 phút
    
    function showSessionWarning() {
        if (!sessionWarningShown) {
            sessionWarningShown = true;
            if (confirm('Phiên đăng nhập sắp hết hạn. Bạn có muốn tiếp tục?')) {
                // Gửi request để refresh session
                fetch('/api/refresh-session', { 
                    method: 'POST',
                    credentials: 'include'
                }).then(() => {
                    sessionWarningShown = false;
                    resetSessionTimer();
                }).catch(() => {
                    window.location.href = '/login?timeout=true';
                });
            } else {
                window.location.href = '/logout';
            }
        }
    }
    
    function resetSessionTimer() {
        clearTimeout(window.sessionTimer);
        clearTimeout(window.warningTimer);
        
        window.warningTimer = setTimeout(showSessionWarning, SESSION_TIMEOUT - WARNING_TIME);
        window.sessionTimer = setTimeout(() => {
            window.location.href = '/login?timeout=true';
        }, SESSION_TIMEOUT);
    }
    
    // Khởi tạo timer nếu không phải trang login
    if (!window.location.pathname.includes('/login')) {
        resetSessionTimer();
        
        // Reset timer khi có activity
        ['click', 'keypress', 'mousemove'].forEach(event => {
            document.addEventListener(event, () => {
                if (!sessionWarningShown) {
                    resetSessionTimer();
                }
            }, { passive: true });
        });
    }
    
    // Xử lý multiple tabs warning
    if (window.location.search.includes('multipleTab=true')) {
        showToastNotification('Cảnh báo: Bạn đang đăng nhập trên nhiều tab/cửa sổ. Điều này có thể gây xung đột phiên làm việc.', 'warning');
    }
})();