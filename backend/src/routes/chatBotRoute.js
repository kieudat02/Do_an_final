const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatBotController');

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