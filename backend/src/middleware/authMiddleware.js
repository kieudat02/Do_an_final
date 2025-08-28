// Middleware kiểm tra đăng nhập cơ bản
exports.ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.status === 'Hoạt động') {
        // Set req.user từ session để sử dụng trong controller
        req.user = req.session.user;
        return next();
    }
    
    req.flash('error', 'Vui lòng đăng nhập để tiếp tục!');
    res.redirect('/login');
};

// Middleware kiểm tra vai trò đơn giản
exports.checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (req.session && req.session.user && allowedRoles.includes(req.session.user.role)) {
            // Set req.user từ session để sử dụng trong controller
            req.user = req.session.user;
            return next();
        }
        
        req.flash('error', 'Bạn không có quyền truy cập chức năng này!');
        res.redirect('/dashboard');
    };
};

// Middleware kiểm tra quyền cụ thể - hiện tại chỉ kiểm tra đăng nhập
// TODO: Implement permission system trong tương lai
exports.checkPermission = (permission) => {
    return (req, res, next) => {
        // Kiểm tra đăng nhập trước
        if (!req.session || !req.session.user || req.session.user.status !== 'Hoạt động') {
            req.flash('error', 'Vui lòng đăng nhập để tiếp tục!');
            return res.redirect('/login');
        }

        // Set req.user từ session
        req.user = req.session.user;
        
        // Trong tương lai có thể kiểm tra quyền cụ thể từ database
        if (permission === '') {
            // Route không yêu cầu quyền cụ thể, chỉ cần đăng nhập
            return next();
        }
        // Hiện tại cho phép tất cả user đã đăng nhập
        return next();
    };
};

// Middleware kiểm tra quyền truy cập admin (chặn customer)
exports.ensureAdminAccess = (req, res, next) => {
    if (!req.session || !req.session.user || req.session.user.status !== 'Hoạt động') {
        req.flash('error', 'Vui lòng đăng nhập để tiếp tục!');
        return res.redirect('/login');
    }

    const user = req.session.user;

    // Chỉ cho phép 4 role được phép truy cập admin panel
    const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Viewer'];

    if (!user.role || !allowedRoles.includes(user.role.name)) {
        req.flash('error', 'Tài khoản không có quyền truy cập trang quản trị!');
        return res.redirect('/');
    }

    // Set req.user từ session để sử dụng trong controller
    req.user = user;
    return next();
};

// Middleware chặn truy cập login khi đã đăng nhập
exports.redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    next();
};
