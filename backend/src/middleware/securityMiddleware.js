// Middleware log các attempt truy cập admin panel (chỉ trong development)
exports.logAdminAccess = (req, res, next) => {
    // Chỉ log trong development mode để tránh spam logs trong production
    if (process.env.NODE_ENV === 'development') {
        const timestamp = new Date().toISOString();
        const ip = req.ip || req.connection.remoteAddress;

        console.log(`[${timestamp}] Admin access: ${req.method} ${req.originalUrl} - IP: ${ip}`);

        if (req.session && req.session.user) {
            console.log(`   User: ${req.session.user.email} (${req.session.user.role ? req.session.user.role.name : 'No Role'})`);
        }
    }

    next();
};

// Middleware chặn customer truy cập các route admin cụ thể
exports.blockCustomerRoutes = (req, res, next) => {
    // Danh sách các route admin cần bảo vệ đặc biệt
    const adminOnlyRoutes = [
        '/dashboard',
        '/users',
        '/roles',
        '/permissions',
        '/account',
        '/orders',
        '/tour',
        '/category',
        '/departure',
        '/destination',
        '/transportation'
    ];
    
    // Kiểm tra nếu đang truy cập route admin
    const isAdminRoute = adminOnlyRoutes.some(route => 
        req.path.startsWith(route) || req.originalUrl.startsWith(route)
    );
    
    if (isAdminRoute && req.session && req.session.user) {
        const user = req.session.user;
        
        // Chỉ cho phép 4 role được phép truy cập admin routes
        const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Viewer'];

        if (!user.role || !allowedRoles.includes(user.role.name)) {
            // Log security alert chỉ trong development
            if (process.env.NODE_ENV === 'development') {
                const roleName = user.role ? user.role.name : 'No Role';
                console.log(`SECURITY ALERT: Unauthorized role attempted to access admin route`);
                console.log(`   User: ${user.email} | Role: ${roleName} | Route: ${req.originalUrl}`);
            }

            // Xóa session để buộc đăng nhập lại
            req.session.destroy((err) => {
                if (err && process.env.NODE_ENV === 'development') {
                    console.error('Error destroying session:', err);
                }
                res.redirect('/login?error=unauthorized');
            });
            return;
        }
    }
    
    next();
};

// Middleware kiểm tra session security
exports.validateSession = (req, res, next) => {
    if (req.session && req.session.user) {
        const user = req.session.user;
        
        // Kiểm tra tính hợp lệ của session (chỉ kiểm tra các field quan trọng)
        if (!user.id || !user.email) {
            if (process.env.NODE_ENV === 'development') {
                console.log(`Invalid session detected for user: ${user.email || 'unknown'}`);
                console.log(`   Missing: ${!user.id ? 'id ' : ''}${!user.email ? 'email ' : ''}`);
            }
            req.session.destroy((err) => {
                if (err && process.env.NODE_ENV === 'development') {
                    console.error('Error destroying invalid session:', err);
                }
                res.redirect('/login?error=invalid_session');
            });
            return;
        }
        
        // Kiểm tra user_type hợp lệ
        if (!['admin', 'staff', 'customer'].includes(user.user_type)) {
            if (process.env.NODE_ENV === 'development') {
                console.log(`Invalid user_type detected: ${user.user_type} for user: ${user.email}`);
            }
            req.session.destroy((err) => {
                if (err && process.env.NODE_ENV === 'development') {
                    console.error('Error destroying session with invalid user_type:', err);
                }
                res.redirect('/login?error=invalid_user_type');
            });
            return;
        }
    }
    
    next();
};

// Middleware rate limiting cho login attempts
exports.loginRateLimit = (req, res, next) => {
    // Khởi tạo store cho rate limiting nếu chưa có
    if (!global.loginAttempts) {
        global.loginAttempts = new Map();
    }
    
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 phút
    const maxAttempts = process.env.NODE_ENV === 'production' ? 5 : 100; // Dev: 100, Prod: 5
    
    // Lấy thông tin attempts của IP
    const attempts = global.loginAttempts.get(ip) || { count: 0, resetTime: now + windowMs };
    
    // Reset nếu đã hết thời gian window
    if (now > attempts.resetTime) {
        attempts.count = 0;
        attempts.resetTime = now + windowMs;
    }
    
    // Kiểm tra số lần thử
    if (attempts.count >= maxAttempts) {
        const remainingTime = Math.ceil((attempts.resetTime - now) / 1000 / 60);

        if (process.env.NODE_ENV === 'development') {
            console.log(`Rate limit exceeded for IP: ${ip}`);
        }

        return res.render('login', {
            error: `Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau ${remainingTime} phút.`,
            message: null,
            isLogout: false
        });
    }
    
    // Tăng số lần thử nếu là POST request
    if (req.method === 'POST') {
        attempts.count++;
        global.loginAttempts.set(ip, attempts);
    }
    
    next();
};

module.exports = exports;
