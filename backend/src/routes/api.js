const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const jwtAuthMiddleware = require('../middleware/jwtAuthMiddleware');
const { loadUserPermissions, checkPermission } = require("../middleware/permissionMiddleware");
const { checkLevel } = require('../middleware/permissionMiddleware');
const { uploadToCloudinaryGeneral, uploadToCloudinary } = require("../middleware/uploadMiddleware");
const { verifyRecaptcha } = require('../middleware/recaptchaMiddleware');
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary");

// Import controllers   
const orderController = require('../controllers/orderController');
const tourController = require('../controllers/tourController');
const tourDetailController = require('../controllers/tourDetailController');
const roleController = require('../controllers/roleController');
const permissionController = require('../controllers/permissionController');
const categoryController = require('../controllers/categoryController');
const homeSectionController = require('../controllers/homeSectionController');
const destinationController = require('../controllers/destinationController');
const departureController = require('../controllers/departureController');
const transportationController = require('../controllers/transportationController');
const accountController = require('../controllers/accountController');
const otpController = require('../controllers/otpController');
const emailOtpController = require('../controllers/emailOtpController');
const authController = require('../controllers/authController');
const socialAuthController = require('../controllers/socialAuthController');
const reviewController = require('../controllers/reviewController');

// Social authentication routes (no auth required)
router.post('/auth/google', socialAuthController.googleAuth);
router.post('/auth/facebook', socialAuthController.facebookAuth);

// Auth routes (no auth required)
router.post('/login', (req, res, next) => {
    // Map frontend field names to backend field names
    if (req.body.username && !req.body.email) {
        req.body.email = req.body.username;
    }
    if (req.body.recaptcha && !req.body.recaptchaToken) {
        req.body.recaptchaToken = req.body.recaptcha;
    }
    next();
}, verifyRecaptcha, authController.login);

// Email OTP routes (no auth required)
router.post('/email/otp/send', emailOtpController.sendOTP);
router.post('/email/otp/verify', emailOtpController.verifyOTP);
router.get('/email/otp/check', emailOtpController.checkEmailVerification);

// Registration route with reCAPTCHA (no auth required)
router.post('/register', verifyRecaptcha, authController.register);

// Phone OTP routes (no auth required)
router.post('/otp/send', otpController.sendOTP);
router.post('/otp/verify', otpController.verifyOTP);
router.get('/otp/check', otpController.checkPhoneVerification);

// Protected routes using JWT authentication (for customers)
router.use('/user', jwtAuthMiddleware.authenticateJwt);
router.get('/user/profile', (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});
router.put('/user/profile', (req, res) => {
    // Update user profile logic would go here
    res.json({
        success: true,
        message: 'Profile updated successfully'
    });
});

// Order routes - JWT auth required (for customers)
router.post('/order/create', jwtAuthMiddleware.authenticateJwt, orderController.createOrder);
router.get('/user/orders', jwtAuthMiddleware.authenticateJwt, orderController.getUserOrders);

// Cấu hình Cloudinary Storage cho avatar
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "avatars",
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
        transformation: [
            { width: 200, height: 200, crop: "fill", gravity: "face" },
            { quality: "auto" },
        ],
    },
});

const avatarUpload = multer({
    storage: avatarStorage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Chỉ cho phép upload file ảnh!"), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
    },
});

router.post('/refresh-session', (req, res) => {
    // Kiểm tra xem người dùng đã đăng nhập chưa
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Phiên làm việc không hợp lệ'
        });
    }
    
    // Cập nhật thời gian truy cập cuối
    req.session.lastAccess = Date.now();
    
    return res.json({
        success: true,
        message: 'Phiên làm việc đã được làm mới'
    });
});

router.get('/session-status', (req, res) => {
    // Kiểm tra xem người dùng đã đăng nhập chưa
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            isValid: false,
            message: 'Phiên làm việc không hợp lệ'
        });
    }
    
    const now = Date.now();
    const lastAccess = req.session.lastAccess || now;
    const sessionTimeout = 30 * 60 * 1000; // 30 phút
    const timeLeft = sessionTimeout - (now - lastAccess);
    
    // Cập nhật thời gian truy cập cuối
    req.session.lastAccess = now;
    
    return res.json({
        success: true,
        isValid: timeLeft > 0,
        timeLeft: Math.max(0, timeLeft),
        message: 'Phiên làm việc hợp lệ'
    });
});

// Middleware để đảm bảo API requests đã xác thực và load quyền hạn (ADMIN ONLY)
router.use(authMiddleware.ensureAdminAccess, loadUserPermissions);


//------- Quản lý đơn hàng (orders) --------

// Lấy danh sách đơn hàng có phân trang và lọc
router.get('/orders', checkPermission("READ_ORDER"), orderController.getAllOrders);

// Lấy thông tin chi tiết một đơn hàng theo ID
router.get('/orders/:id', checkPermission("READ_ORDER"), orderController.getOrderById);

// Tạo đơn hàng mới
router.post('/orders', checkPermission("CREATE_ORDER"), orderController.createOrder);

// Cập nhật trạng thái đơn hàng
router.put('/orders/:id/status', checkPermission("UPDATE_ORDER"), orderController.updateOrderStatus);

// Hủy đơn hàng với lý do
router.put('/orders/:id/cancel', checkPermission("UPDATE_ORDER"), orderController.cancelOrder);

// Xóa đơn hàng
router.delete('/orders/:id', checkPermission("DELETE_ORDER"), orderController.deleteOrder);


//------- Quản lý tour --------

// Lấy danh sách tour có phân trang và lọc
router.get('/tours', checkPermission("READ_TOUR"), tourController.getAllTours);

// Lấy thông tin chi tiết tour theo ID
router.get('/tours/:id', checkPermission("READ_TOUR"), tourController.getTourById);

// Tạo tour mới
router.post('/tours', checkPermission("CREATE_TOUR"), uploadToCloudinaryGeneral.array("images", 10), tourController.apiCreate);

// Cập nhật tour
router.put('/tours/:id', checkPermission("UPDATE_TOUR"), uploadToCloudinaryGeneral.array("images", 10), tourController.apiUpdate);

// Xóa tour
router.delete('/tours/:id', checkPermission("DELETE_TOUR"), tourController.apiDelete);

// Xóa nhiều tour
router.post('/tours/delete-multiple', checkPermission("DELETE_TOUR"), tourController.deleteMultiple);

// Thay đổi trạng thái tour
router.put('/tours/:id/status', checkPermission("UPDATE_TOUR"), tourController.toggleStatus);

// Thay đổi nổi bật tour
router.put('/tours/:id/highlight', checkPermission("UPDATE_TOUR"), tourController.toggleHighlight);

// Tạo mã tour tự động
router.post('/tours/generate-code', checkPermission("CREATE_TOUR"), tourController.generateCode);

// Kiểm tra mã tour có tồn tại không
router.post('/tours/check-code', checkPermission("READ_TOUR"), tourController.checkCode);


//------- Quản lý chi tiết tour --------

// Lấy thông tin chi tiết tour theo ID tour
router.get('/tour/:tourId/details', checkPermission("READ_TOUR_DETAIL"), tourDetailController.getByTourId);

// Lấy thông tin một chi tiết tour cụ thể
router.get('/tour/details/:id', checkPermission("READ_TOUR_DETAIL"), tourDetailController.getById);

// Tạo chi tiết tour mới
router.post('/tour/:tourId/details', checkPermission("CREATE_TOUR_DETAIL"), tourDetailController.create);

// Cập nhật chi tiết tour
router.put('/tour/details/:id', checkPermission("UPDATE_TOUR_DETAIL"), tourDetailController.update);

// Xóa chi tiết tour
router.delete('/tour/details/:id', checkPermission("DELETE_TOUR_DETAIL"), tourDetailController.delete);


//------- Quản lý vai trò (roles) --------

// Lấy danh sách vai trò
router.get('/roles', checkPermission("roles.view"), roleController.getRoles);

// Lấy thông tin vai trò theo ID
router.get('/roles/:id', checkPermission("roles.view"), roleController.getRoleById);

// Tạo vai trò mới
router.post('/roles', checkPermission("roles.create"), roleController.createRole);

// Cập nhật vai trò
router.put('/roles/:id', checkPermission("roles.edit"), roleController.updateRole);

// Xóa vai trò
router.delete('/roles/:id', checkPermission("roles.delete"), roleController.deleteRoleAPI);

// Lấy quyền của vai trò
router.get('/roles/:id/permissions', checkPermission("roles.view"), roleController.getRolePermissions);

// Gán quyền cho vai trò
router.put('/roles/:id/permissions', checkPermission("roles.edit"), roleController.assignPermissions);


//------- Quản lý quyền (permissions) --------

// Cập nhật quyền
router.post('/permissions/update', checkPermission("UPDATE_PERMISSIONS"), checkLevel(2), permissionController.updatePermissionsAPI);


//------- Quản lý danh mục (categories) --------

// Lấy danh sách danh mục
router.get('/categories', checkPermission("READ_CATEGORY"), categoryController.getAll);

// Lấy thông tin danh mục theo ID
router.get('/categories/:id', checkPermission("READ_CATEGORY"), categoryController.getById);

// Tạo danh mục mới
router.post('/categories', checkPermission("CREATE_CATEGORY"), categoryController.apiCreate);

// Cập nhật danh mục
router.put('/categories/:id', checkPermission("UPDATE_CATEGORY"), categoryController.apiUpdate);

// Xóa danh mục
router.delete('/categories/:id', checkPermission("DELETE_CATEGORY"), categoryController.apiDelete);

// Thay đổi trạng thái danh mục
router.put('/categories/:id/status', checkPermission("UPDATE_CATEGORY"), categoryController.apiToggleStatus);


//------- Quản lý home sections --------

// Lấy danh sách home sections
router.get('/home-sections', checkPermission("READ_HOME_SECTION"), homeSectionController.getAll);

// Tạo home section mới
router.post('/home-sections', checkPermission("CREATE_HOME_SECTION"), homeSectionController.apiCreate);

// Cập nhật home section
router.put('/home-sections/:id', checkPermission("UPDATE_HOME_SECTION"), homeSectionController.update);

// Xóa home section
router.delete('/home-sections/:id', checkPermission("DELETE_HOME_SECTION"), homeSectionController.delete);

// Thay đổi trạng thái home section
router.put('/home-sections/:id/status', checkPermission("UPDATE_HOME_SECTION"), homeSectionController.toggleStatus);


//------- Quản lý điểm đến (destinations) --------

// Lấy danh sách điểm đến  
router.get('/destinations', checkPermission("READ_DESTINATION"), destinationController.getAll);

// Lấy thông tin điểm đến theo ID
router.get('/destinations/:id', checkPermission("READ_DESTINATION"), destinationController.getById);

// Tạo điểm đến mới
router.post('/destinations', checkPermission("CREATE_DESTINATION"), uploadToCloudinary.single("image"), destinationController.apiCreate);

// Cập nhật điểm đến
router.put('/destinations/:id', checkPermission("UPDATE_DESTINATION"), uploadToCloudinary.single("image"), destinationController.apiUpdate);

// Xóa điểm đến
router.delete('/destinations/:id', checkPermission("DELETE_DESTINATION"), destinationController.apiDelete);

// Thay đổi trạng thái điểm đến
router.put('/destinations/:id/status', checkPermission("UPDATE_DESTINATION"), destinationController.apiToggleStatus);


//------- Quản lý điểm khởi hành (departures) --------

// Lấy danh sách điểm khởi hành
router.get('/departures', checkPermission("READ_DEPARTURE"), departureController.getAll);

// Lấy thông tin điểm khởi hành theo ID
router.get('/departures/:id', checkPermission("READ_DEPARTURE"), departureController.getById);

// Tạo điểm khởi hành mới
router.post('/departures', checkPermission("CREATE_DEPARTURE"), departureController.apiCreate);

// Cập nhật điểm khởi hành
router.put('/departures/:id', checkPermission("UPDATE_DEPARTURE"), departureController.apiUpdate);

// Xóa điểm khởi hành
router.delete('/departures/:id', checkPermission("DELETE_DEPARTURE"), departureController.apiDelete);

// Thay đổi trạng thái điểm khởi hành
router.put('/departures/:id/status', checkPermission("UPDATE_DEPARTURE"), departureController.apiToggleStatus);


//------- Quản lý phương tiện (transportation) --------

// Lấy danh sách phương tiện
router.get('/transportations', checkPermission("READ_TRANSPORTATION"), transportationController.getAll);

// Lấy thông tin phương tiện theo ID
router.get('/transportations/:id', checkPermission("READ_TRANSPORTATION"), transportationController.getById);

// Tạo phương tiện mới
router.post('/transportations', checkPermission("CREATE_TRANSPORTATION"), transportationController.apiCreate);

// Cập nhật phương tiện
router.put('/transportations/:id', checkPermission("UPDATE_TRANSPORTATION"), transportationController.apiUpdate);

// Xóa phương tiện
router.delete('/transportations/:id', checkPermission("DELETE_TRANSPORTATION"), transportationController.apiDelete);

// Thay đổi trạng thái phương tiện
router.put('/transportations/:id/status', checkPermission("UPDATE_TRANSPORTATION"), transportationController.apiToggleStatus);


//------- Quản lý người dùng (accounts) --------

// Lấy danh sách người dùng
router.get('/users', checkPermission("READ_USER"), accountController.getAllUsers);

// Lấy thông tin người dùng theo ID
router.get('/users/:id', checkPermission("READ_USER"), accountController.getUserById);

// Tạo người dùng mới
router.post('/users', checkPermission("CREATE_USER"), avatarUpload.single("avatar"), accountController.createUser);

// Cập nhật người dùng
router.put('/users/:id', checkPermission("UPDATE_USER"), avatarUpload.single("avatar"), accountController.updateUser);

// Xóa người dùng
router.delete('/users/:id', checkPermission("DELETE_USER"), accountController.apiDeleteUser);

// Thay đổi trạng thái người dùng
router.put('/users/:id/status', checkPermission("UPDATE_USER"), accountController.apiToggleUserStatus);


//------- Quản lý đánh giá (reviews) --------

// Lấy reviews của một tour (admin)
router.get('/tours/:tourId/reviews', checkPermission("READ_REVIEW"), reviewController.getReviewsByTour);

// Lấy tất cả reviews (admin)
router.get('/reviews', checkPermission("READ_REVIEW"), reviewController.getAllReviews);

// Lấy review theo ID (admin)
router.get('/reviews/:reviewId', checkPermission("READ_REVIEW"), reviewController.getReviewById);

// Cập nhật trạng thái review (admin)
router.put('/reviews/:reviewId/status', checkPermission("UPDATE_REVIEW"), reviewController.updateReviewStatus);

// Xóa review (admin)
router.delete('/reviews/:reviewId', checkPermission("DELETE_REVIEW"), reviewController.deleteReview);

// Admin actions cho reviews
router.patch('/admin/reviews/:id/approve', checkPermission("UPDATE_REVIEW"), reviewController.approveReview);
router.patch('/admin/reviews/:id/hide', checkPermission("UPDATE_REVIEW"), reviewController.hideReview);
router.delete('/admin/reviews/:id', checkPermission("DELETE_REVIEW"), reviewController.softDeleteReview);
router.patch('/admin/reviews/:id/restore', checkPermission("UPDATE_REVIEW"), reviewController.restoreReview);

module.exports = router;