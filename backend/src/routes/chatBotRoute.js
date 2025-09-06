const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatBotController');
const chatRatingController = require('../controllers/chatRatingController');
const { responseTimeMiddleware, getResponseTimeStats } = require('../middleware/responseTimeMiddleware');

// Middleware để log requests (optional)
const logRequest = (req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[ChatBot API] ${req.method} ${req.originalUrl}`, {
            body: req.body,
            params: req.params,
            timestamp: new Date().toISOString()
        });
    }
    next();
};

// Apply logging middleware
router.use(logRequest);

// Rate limiting middleware (simple implementation)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; 
const MAX_REQUESTS_PER_WINDOW = 30; 

const rateLimiter = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!requestCounts.has(clientIP)) {
        requestCounts.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return next();
    }

    const clientData = requestCounts.get(clientIP);

    if (now > clientData.resetTime) {
        // Reset counter
        clientData.count = 1;
        clientData.resetTime = now + RATE_LIMIT_WINDOW;
        return next();
    }

    if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({
            success: false,
            error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.',
            retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        });
    }

    clientData.count++;
    next();
};

// Apply rate limiting to all routes
router.use(rateLimiter);

// Apply response time middleware to all chatbot routes
router.use(responseTimeMiddleware({
    enableLogging: true,
    enableDatabase: true,
    logSlowRequests: true,
    slowRequestThreshold: 3000, // 3 seconds for chatbot
    includeMetadata: true
}));

router.get('/search', chatbotController.searchTours);

router.get('/tours/price-range', chatbotController.getToursByPriceRange);

router.get('/context', chatbotController.getChatbotContext);

router.get('/tours/:tourId', chatbotController.getTourDetails);

router.post('/message', chatbotController.sendMessage);

router.get('/history/:sessionId', chatbotController.getHistory);

router.delete('/history/:sessionId', chatbotController.clearHistory);

router.post('/session', chatbotController.createSession);

router.get('/status', chatbotController.getStatus);

// Cache management routes
router.delete('/cache', chatbotController.invalidateCache);
router.get('/cache/status', chatbotController.getCacheStatus);

// Health check route
router.get('/health', chatbotController.healthCheck);

// ========== CHAT RATING ROUTES (LEGACY - PER MESSAGE) ==========
// Tạo hoặc cập nhật rating cho tin nhắn chatbot
router.post('/rating', chatRatingController.createOrUpdateRating);

// Lấy thống kê CSAT tổng quan
router.get('/rating/stats', chatRatingController.getCSATStats);

// Lấy trend đánh giá theo thời gian
router.get('/rating/trend', chatRatingController.getRatingTrend);

// Lấy danh sách ratings với phân trang
router.get('/rating/list', chatRatingController.getRatings);

// Xóa rating
router.delete('/rating/:ratingId', chatRatingController.deleteRating);

// ========== SESSION RATING ROUTES (NEW - PER SESSION) ==========
const sessionRatingController = require('../controllers/sessionRatingController');

// Tạo hoặc cập nhật rating cho phiên hội thoại
router.post('/session-rating', sessionRatingController.createOrUpdateSessionRating);

// Kiểm tra xem session đã được đánh giá chưa
router.get('/session-rating/:sessionId', sessionRatingController.checkSessionRated);

// Lấy thống kê CSAT cho session ratings
router.get('/session-rating/stats', sessionRatingController.getCSATStats);

// Lấy trend đánh giá session theo thời gian
router.get('/session-rating/trend', sessionRatingController.getRatingTrend);

// Lấy danh sách session ratings với phân trang
router.get('/session-rating/list', sessionRatingController.getSessionRatings);

// ========== RESPONSE TIME ROUTES ==========
// Lấy thống kê response time
router.get('/response-time/stats', getResponseTimeStats);

// Backward compatibility - giữ lại route cũ
router.post('/ask', chatbotController.askBot);

// Error handling middleware cho chatbot routes
router.use((error, req, res, next) => {
    console.error('ChatBot Route Error:', error);

    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            error: 'Dữ liệu JSON không hợp lệ'
        });
    }

    if (error.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            error: 'Dữ liệu quá lớn'
        });
    }

    return res.status(500).json({
        success: false,
        error: 'Có lỗi xảy ra trong hệ thống chatbot'
    });
});

module.exports = router;