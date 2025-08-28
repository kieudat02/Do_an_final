const RolePermission = require("../models/rolePermissionModel");
const Permission = require("../models/permissonsModel");

/**
 * Middleware kiểm tra quyền dựa trên permission name
 * @param {string} permissionName - Tên permission cần kiểm tra
 * @returns {Function} Express middleware
 */
const checkPermission = (permissionName) => {
    return async (req, res, next) => {
        try {
            // Kiểm tra xem user đã đăng nhập chưa
            if (!req.session.user) {
                return res.status(401).json({
                    success: false,
                    message: "Vui lòng đăng nhập để truy cập",
                });
            }

            const user = req.session.user;

            // Kiểm tra user_type - chặn customer
            if (user.user_type === 'customer') {
                return res.status(403).json({
                    success: false,
                    message: "Bạn không có quyền truy cập chức năng này",
                });
            }

            // Super Admin luôn có tất cả quyền
            if (user.role && user.role.name === "Super Admin") {
                return next();
            }

            // Tìm permission theo tên
            const permission = await Permission.findOne({
                name: permissionName.toUpperCase(),
                isActive: true,
            });

            if (!permission) {
                return res.status(403).json({
                    success: false,
                    message: "Permission không tồn tại",
                });
            }

            // Kiểm tra role có permission này không
            const rolePermission = await RolePermission.findOne({
                roleId: user.role._id,
                permissionId: permission._id,
                isActive: true,
            });

            if (!rolePermission) {
                return res.status(403).json({
                    success: false,
                    message: "Bạn không có quyền truy cập chức năng này",
                });
            }

            // Gắn thông tin permission vào request để sử dụng ở controller
            req.permission = permission;
            next();
        } catch (error) {
            console.error("Lỗi kiểm tra permission:", error);
            return res.status(500).json({
                success: false,
                message: "Lỗi hệ thống khi kiểm tra quyền",
            });
        }
    };
};

/**
 * Middleware kiểm tra quyền dựa trên feature và action
 * @param {string} feature - Tên tính năng (orders, tours, etc.)
 * @param {string} action - Hành động (view, create, edit, delete)
 * @returns {Function} Express middleware
 */
const checkFeaturePermission = (feature, action) => {
    return async (req, res, next) => {
        try {
            // Kiểm tra xem user đã đăng nhập chưa
            if (!req.session.user) {
                const errorMessage = "Vui lòng đăng nhập để truy cập";
                
                if (req.xhr || req.path.startsWith('/api/')) {
                    return res.status(401).json({
                        success: false,
                        message: errorMessage,
                        redirectTo: '/login'
                    });
                }
                
                req.flash('error', errorMessage);
                return res.redirect('/login');
            }

            const user = req.session.user;

            // Kiểm tra user_type - chặn customer
            if (user.user_type === 'customer') {
                const errorMessage = 'Bạn không có quyền truy cập chức năng này';
                
                if (req.xhr || req.path.startsWith('/api/')) {
                    return res.status(403).json({
                        success: false,
                        message: errorMessage
                    });
                }
                
                req.flash('error', errorMessage);
                return res.redirect('/');
            }

            // Super Admin luôn có tất cả quyền
            if (user.role && user.role.name === "Super Admin") {
                return next();
            }

            // Tên permission theo format feature_action (như orders_view, orders_edit)
            const permissionName = `${feature.toUpperCase()}_${action.toUpperCase()}`;

            // Tìm permission trong database
            const permission = await Permission.findOne({
                name: permissionName,
                isActive: true,
            });

            if (!permission) {
                const errorMessage = `Permission "${permissionName}" không tồn tại`;
                
                if (req.xhr || req.path.startsWith('/api/')) {
                    return res.status(403).json({
                        success: false,
                        message: errorMessage
                    });
                }
                
                req.flash('error', errorMessage);
                return res.redirect('/dashboard');
            }

            // Kiểm tra role có permission này không
            const rolePermission = await RolePermission.findOne({
                roleId: user.role._id,
                permissionId: permission._id,
                isActive: true,
            });

            if (!rolePermission) {
                const errorMessage = 'Bạn không có quyền truy cập chức năng này';
                
                if (req.xhr || req.path.startsWith('/api/')) {
                    return res.status(403).json({
                        success: false,
                        message: errorMessage
                    });
                }
                
                req.flash('error', errorMessage);
                return res.redirect('/dashboard');
            }

            next();
        } catch (error) {
            console.error("Lỗi kiểm tra permission:", error);
            
            const errorMessage = 'Lỗi hệ thống khi kiểm tra quyền';
            
            if (req.xhr || req.path.startsWith('/api/')) {
                return res.status(500).json({
                    success: false,
                    message: errorMessage
                });
            }
            
            req.flash('error', errorMessage);
            return res.redirect('/dashboard');
        }
    };
};

/**
 * Middleware kiểm tra quyền dựa trên level (cao hơn hoặc bằng)
 * @param {number} requiredLevel - Level tối thiểu cần có (1-4)
 * @returns {Function} Express middleware
 */
const checkLevel = (requiredLevel) => {
    return (req, res, next) => {
        try {
            if (!req.session.user) {
                const errorMessage = "Vui lòng đăng nhập để truy cập";

                // Kiểm tra nếu là AJAX request với nhiều cách
                const isAjax =
                    req.xhr ||
                    req.headers["x-requested-with"] === "XMLHttpRequest" ||
                    (req.headers.accept &&
                        req.headers.accept.includes("application/json")) ||
                    req.path.startsWith("/api/");

                if (isAjax) {
                    return res.status(401).json({
                        success: false,
                        message: errorMessage,
                        redirectTo: "/login",
                    });
                }

                req.flash("error", errorMessage);
                return res.redirect("/login");
            }

            const user = req.session.user;

            // Kiểm tra user_type - chặn customer
            if (user.user_type === 'customer') {
                const errorMessage = "Bạn không có quyền truy cập chức năng này";

                // Kiểm tra nếu là AJAX request với nhiều cách
                const isAjax =
                    req.xhr ||
                    req.headers["x-requested-with"] === "XMLHttpRequest" ||
                    (req.headers.accept &&
                        req.headers.accept.includes("application/json")) ||
                    req.path.startsWith("/api/");

                if (isAjax) {
                    return res.status(403).json({
                        success: false,
                        message: errorMessage,
                        redirectTo: "/",
                    });
                }

                req.flash("error", errorMessage);
                return res.redirect("/");
            }

            // Super Admin luôn có level cao nhất (level = 1)
            if (req.session.user.role && req.session.user.role.name === "Super Admin") {
                return next();
            }

            const userLevel = req.session.user.role.level || 1;

            // Level càng thấp thì quyền càng cao (1 = Super Admin, 4 = Viewer)
            if (userLevel <= requiredLevel) {
                return next();
            }

            const errorMessage =
                "Bạn không có đủ quyền hạn để truy cập chức năng này";

            // Kiểm tra nếu là AJAX request với nhiều cách
            const isAjax =
                req.xhr ||
                req.headers["x-requested-with"] === "XMLHttpRequest" ||
                (req.headers.accept &&
                    req.headers.accept.includes("application/json")) ||
                req.path.startsWith("/api/");

            if (isAjax) {
                return res.status(403).json({
                    success: false,
                    message: errorMessage,
                    redirectTo: "/dashboard",
                });
            }

            req.flash("error", errorMessage);
            return res.redirect("/dashboard");
        } catch (error) {
            console.error("Lỗi kiểm tra level:", error);
            const errorMessage = "Có lỗi xảy ra khi kiểm tra quyền";

            // Kiểm tra nếu là AJAX request với nhiều cách
            const isAjax =
                req.xhr ||
                req.headers["x-requested-with"] === "XMLHttpRequest" ||
                (req.headers.accept &&
                    req.headers.accept.includes("application/json")) ||
                req.path.startsWith("/api/");

            if (isAjax) {
                return res.status(500).json({
                    success: false,
                    message: errorMessage,
                    redirectTo: "/dashboard",
                });
            }

            req.flash("error", errorMessage);
            return res.redirect("/dashboard");
        }
    };
};

/**
 * Middleware kiểm tra quyền cho các view (EJS)
 * Gắn thông tin permissions của user vào res.locals để sử dụng trong template
 */
const loadUserPermissions = async (req, res, next) => {
    try {
        if (req.session.user) {
            const user = req.session.user;
            
            // Kiểm tra user_type - customer không có quyền admin
            if (user.user_type === 'customer') {
                res.locals.userPermissions = [];
                return next();
            }
            
            if (user.role.name === "Super Admin") {
                
                // Lấy tất cả quyền có trong hệ thống
                const allPermissions = await Permission.find({ isActive: true });
                res.locals.userPermissions = allPermissions.map(p => p.name);
            } else {
                // Các role khác: lấy theo RolePermission
                const rolePermissions = await RolePermission.find({
                    roleId: user.role._id,
                    isActive: true,
                }).populate("permissionId");
                
                res.locals.userPermissions = rolePermissions
                    .filter((rp) => rp.permissionId && rp.permissionId.isActive)
                    .map((rp) => rp.permissionId.name);
            }
        } else {
            res.locals.userPermissions = [];
        }
        next();
    } catch (error) {
        console.error("Lỗi load user permissions:", error);
        res.locals.userPermissions = [];
        next();
    }
};

/**
 * Helper function để kiểm tra permission trong template
 * @param {string} permissionName - Tên permission
 * @param {Array} userPermissions - Danh sách permissions của user
 * @returns {boolean}
 */
const hasPermission = (permissionName, userPermissions = []) => {
    return userPermissions.includes(permissionName.toUpperCase());
};

module.exports = {
    checkPermission,
    checkLevel,
    loadUserPermissions,
    hasPermission,
    checkFeaturePermission,
};
