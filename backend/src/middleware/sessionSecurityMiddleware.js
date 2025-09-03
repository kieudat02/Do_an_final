const sessionSecurityMiddleware = {
    // Middleware kiểm tra session cho mọi request
    checkSession: (req, res, next) => {
        // Bỏ qua kiểm tra cho các route public
        const publicRoutes = [
            '/login',
            '/logout',
            '/css',
            '/js',
            '/images',
            '/favicon.ico',
            '/api/refresh-session',
            '/api/session-status',
            '/api/login',
            '/api/register',
            '/api/email/otp',
            '/api/otp',
            '/api/public',
            '/api/chat',
            '/api/review'
        ];
        const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));
        
        if (isPublicRoute) {
            return next();
        }

        // Kiểm tra session tồn tại
        if (!req.session || !req.session.user) {
            // Nếu là AJAX request hoặc API request, trả về JSON
            const isAjax = req.xhr || 
                        req.headers['x-requested-with'] === 'XMLHttpRequest' || 
                        req.headers.accept && req.headers.accept.includes('application/json') ||
                        req.path.startsWith('/api/');
            
            if (isAjax) {
                return res.status(401).json({
                    success: false,
                    message: 'Session không hợp lệ',
                    redirectTo: '/login'
                });
            }
            return res.redirect('/login');
        }

        // Kiểm tra session timeout - chỉ áp dụng cho những request không phải là ajax/api
        const now = Date.now();
        const sessionTimeout = 30 * 60 * 1000; // 30 phút
        
        // Kiểm tra xem có phải là request thường (không phải AJAX/API) không
        const isAjax = req.xhr || 
                    req.headers['x-requested-with'] === 'XMLHttpRequest' || 
                    req.headers.accept && req.headers.accept.includes('application/json') ||
                    req.path.startsWith('/api/');
        
        if (req.session.lastAccess && (now - req.session.lastAccess > sessionTimeout)) {
            // Đặc biệt cho trang tour - không xóa session
            if (req.path.startsWith('/tour')) {
                // Chỉ cập nhật thời gian truy cập mà không redirect
                req.session.lastAccess = now;
                return next();
            }
            
            req.session.destroy((err) => {
                if (err) {
                    console.error('Lỗi khi xóa session timeout:', err);
                }
            });
            
            if (isAjax) {
                return res.status(401).json({
                    success: false,
                    message: 'Phiên đăng nhập đã hết hạn',
                    redirectTo: '/login?timeout=true'
                });
            }
            return res.redirect('/login?timeout=true');
        }

        // Cập nhật thời gian truy cập cuối - chỉ cho request thường
        if (!isAjax) {
            req.session.lastAccess = now;
        }
        
        // Tạo session token mới cho mỗi request (chống session fixation)
        if (!req.session.token) {
            req.session.token = require('crypto').randomBytes(32).toString('hex');
        }

        next();
    },

    // Middleware set header chống cache cho các route được bảo vệ
    preventCache: (req, res, next) => {
        // Bỏ qua cho các static files
        const staticRoutes = ['/css', '/js', '/images', '/favicon.ico'];
        const isStaticRoute = staticRoutes.some(route => req.path.startsWith(route));
        
        // Chỉ áp dụng cho các trang nhạy cảm
        const sensitiveRoutes = ['/login', '/logout', '/permissions'];
        const isSensitiveRoute = sensitiveRoutes.some(route => req.path.startsWith(route));
        
        if (!isStaticRoute && isSensitiveRoute) {
            // Set headers chống cache
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Frame-Options': 'DENY',
                'X-Content-Type-Options': 'nosniff',
                'X-XSS-Protection': '1; mode=block'
            });
        }
        
        next();
    },

    // Middleware kiểm tra multiple tabs/sessions
    checkMultipleSessions: (req, res, next) => {
        if (req.session && req.session.user) {
            const currentSessionId = req.sessionID;
            const userId = req.session.user.id;
            
            // Lưu session ID hiện tại cho user
            if (!global.userSessions) {
                global.userSessions = new Map();
            }
            
            const existingSessionId = global.userSessions.get(userId);
            
            // Nếu có session ID khác đã tồn tại cho user này
            if (existingSessionId && existingSessionId !== currentSessionId) {
                // Cho phép multiple tabs nhưng cảnh báo
                req.session.multipleTabsWarning = true;
            }
            
            // Cập nhật session ID mới nhất
            global.userSessions.set(userId, currentSessionId);
        }
        
        next();
    },

    // Middleware xử lý logout an toàn
    secureLogout: (req, res, next) => {
        if (req.session && req.session.user) {
            const userId = req.session.user.id;
            
            // Xóa user khỏi global sessions
            if (global.userSessions) {
                global.userSessions.delete(userId);
            }
            
            // Destroy session hoàn toàn
            req.session.destroy((err) => {
                if (err) {
                    console.error('Lỗi khi xóa session:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Lỗi khi đăng xuất'
                    });
                }
                
                // Xóa session cookie
                res.clearCookie('connect.sid', {
                    path: '/',
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production'
                });
                
                // Set headers chống cache
                res.set({
                    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                
                next();
            });
        } else {
            next();
        }
    }
};

module.exports = sessionSecurityMiddleware;
