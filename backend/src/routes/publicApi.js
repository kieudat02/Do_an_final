const express = require('express');
const router = express.Router();

// Import controllers
const tourController = require('../controllers/tourController');
const categoryController = require('../controllers/categoryController');
const departureController = require('../controllers/departureController');
const destinationController = require('../controllers/destinationController');
const transportationController = require('../controllers/transportationController');
const reviewController = require('../controllers/reviewController');
const homeSectionController = require('../controllers/homeSectionController');
const authMiddleware = require('../middleware/authMiddleware');
const { verifyRecaptcha } = require('../middleware/recaptchaMiddleware');

// Auth status endpoint
router.get('/auth/status', (req, res) => {
    if (req.session && req.session.user && req.session.user.status === 'Hoạt động') {
        res.json({
            success: true,
            user: {
                id: req.session.user.id,
                fullName: req.session.user.fullName,
                email: req.session.user.email,
                avatar: req.session.user.avatar,
                user_type: req.session.user.user_type
            }
        });
    } else {
        res.json({
            success: false,
            message: 'Not authenticated'
        });
    }
});

// Public Tours API
router.get('/tours', async (req, res) => {
    try {
        // Gọi hàm getAllTours từ tourController với req và res
        await tourController.getAllTours(req, res);
    } catch (error) {
        console.error('Error in public tours API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách tours',
            error: error.message
        });
    }
});

// API lấy tours theo Home Section với filter merge
router.get('/tours/home-section/:homeSectionId', async (req, res) => {
    try {
        await tourController.getToursByHomeSection(req, res);
    } catch (error) {
        console.error('Error in tours by home section API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách tours theo Home Section',
            error: error.message
        });
    }
});

// Public Tour Detail API
router.get('/tours/:id', async (req, res) => {
    try {
        await tourController.getTourById(req, res);
    } catch (error) {
        console.error('Error in public tour detail API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy chi tiết tour',
            error: error.message
        });
    }
});

// API lấy giá tour theo ngày cụ thể
router.get('/tours/:id/pricing/:date', async (req, res) => {
    try {
        await tourController.getTourPricingByDate(req, res);
    } catch (error) {
        console.error('Error in tour pricing by date API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy giá tour theo ngày',
            error: error.message
        });
    }
});



// Public Categories API
router.get('/categories', async (req, res) => {
    try {
        await categoryController.getAll(req, res);
    } catch (error) {
        console.error('Error in public categories API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách categories',
            error: error.message
        });
    }
});

// Public Departures API
router.get('/departures', async (req, res) => {
    try {
        await departureController.getAll(req, res);
    } catch (error) {
        console.error('Error in public departures API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách departures',
            error: error.message
        });
    }
});

// Public Destinations API - sử dụng API tối ưu cho frontend
router.get('/destinations', async (req, res) => {
    try {
        await destinationController.getPublicDestinations(req, res);
    } catch (error) {
        console.error('Error in public destinations API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách điểm đến',
            error: error.message
        });
    }
});
// Public API để lấy danh sách quốc gia theo châu lục
router.get('/destinations/countries-by-continent', async (req, res) => {
    try {
        await destinationController.getCountriesByContinent(req, res);
    } catch (error) {
        console.error('Error in countries-by-continent API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách quốc gia',
            error: error.message
        });
    }
});

// Public Transportations API
router.get('/transportations', async (req, res) => {
    try {
        await transportationController.getAll(req, res);
    } catch (error) {
        console.error('Error in public transportations API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách transportations',
            error: error.message
        });
    }
});

// API để lấy tất cả destinations với URL structure động
router.get('/destinations/with-urls', async (req, res) => {
    try {
        await destinationController.getAllDestinationsWithUrls(req, res);
    } catch (error) {
        console.error('Error in destinations with URLs API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách destinations với URLs',
            error: error.message
        });
    }
});

// API để lấy tours theo URL path động
router.get('/tours/url/:urlPath', async (req, res) => {
    try {
        await tourController.getToursByUrlPath(req, res);
    } catch (error) {
        console.error('Error in tours by URL path API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách tours theo URL path',
            error: error.message
        });
    }
});

// API để lấy tours theo slug
router.get('/tours/slug/:slug', async (req, res) => {
    try {
        await tourController.getToursBySlug(req, res);
    } catch (error) {
        console.error('Error in tours by slug API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy tours theo slug',
            error: error.message
        });
    }
});



// Public Reviews API - Lấy reviews của một tour (không cần auth)
router.get('/tours/:tourId/reviews', async (req, res) => {
    try {
        await reviewController.getReviewsByTour(req, res);
    } catch (error) {
        console.error('Error in public reviews API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách đánh giá',
            error: error.message
        });
    }
});

// User Reviews API - Tạo review mới (cần auth)
router.post('/tours/:tourId/reviews', authMiddleware.ensureAuthenticated, async (req, res) => {
    try {
        await reviewController.createReview(req, res);
    } catch (error) {
        console.error('Error in create review API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo đánh giá',
            error: error.message
        });
    }
});

// User Reviews API - Cập nhật review (cần auth)
router.put('/reviews/:reviewId', authMiddleware.ensureAuthenticated, async (req, res) => {
    try {
        await reviewController.updateReview(req, res);
    } catch (error) {
        console.error('Error in update review API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật đánh giá',
            error: error.message
        });
    }
});

// User Reviews API - Xóa review (cần auth)
router.delete('/reviews/:reviewId', authMiddleware.ensureAuthenticated, async (req, res) => {
    try {
        await reviewController.deleteReview(req, res);
    } catch (error) {
        console.error('Error in delete review API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa đánh giá',
            error: error.message
        });
    }
});

// Public Home Sections API
router.get('/home-sections', async (req, res) => {
    try {
        await homeSectionController.getPublicHomeSections(req, res);
    } catch (error) {
        console.error('Error in public home sections API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách home sections',
            error: error.message
        });
    }
});

// Public Order API - Tạo đơn hàng không cần đăng nhập (có bảo vệ reCAPTCHA)
router.post('/order/create', verifyRecaptcha, async (req, res) => {
    try {
        const orderController = require('../controllers/orderController');
        await orderController.createOrderPublic(req, res);
    } catch (error) {
        console.error('Error in public order create API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo đơn hàng',
            error: error.message
        });
    }
});

// Tra cứu đơn hàng với reCAPTCHA protection
router.post('/order/lookup', verifyRecaptcha, async (req, res) => {
    try {
        const orderController = require('../controllers/orderController');
        await orderController.lookupOrderPublic(req, res);
    } catch (error) {
        console.error('Error in public order lookup API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tra cứu đơn hàng',
            error: error.message
        });
    }
});

// Gửi OTP cho tra cứu đơn hàng với reCAPTCHA
router.post('/order/send-otp', verifyRecaptcha, async (req, res) => {
    try {
        const orderController = require('../controllers/orderController');
        await orderController.sendOTPForOrderLookup(req, res);
    } catch (error) {
        console.error('Error in send OTP for order lookup API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi gửi mã OTP',
            error: error.message
        });
    }
});

// Tra cứu đơn hàng với xác thực OTP
router.post('/order/lookup-with-otp', async (req, res) => {
    try {
        const orderController = require('../controllers/orderController');
        await orderController.lookupOrderWithOTP(req, res);
    } catch (error) {
        console.error('Error in order lookup with OTP API:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tra cứu đơn hàng với OTP',
            error: error.message
        });
    }
});

module.exports = router;
