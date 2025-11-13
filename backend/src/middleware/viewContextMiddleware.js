const { hasPermission } = require('../constants/roles');

// Middleware để thêm thông tin cần thiết cho tất cả các view
const viewContextMiddleware = (req, res, next) => {
    // Thêm các biến local để sử dụng trong tất cả views
    res.locals.currentUser = req.session && req.session.user ? req.session.user : null;
    res.locals.isAuthenticated = !!(req.session && req.session.user);
    res.locals.currentPath = req.originalUrl || req.path;
    res.locals.hasPermission = hasPermission;
    
    // Chuyển flash messages vào locals
    res.locals.message = req.flash('message');
    res.locals.error = req.flash('error');
    
    next();
};

module.exports = viewContextMiddleware;
