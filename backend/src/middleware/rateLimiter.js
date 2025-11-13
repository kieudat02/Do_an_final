const rateLimit = require('express-rate-limit');

// Rate limiter cho chatbot API
const chatbotRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 phút
    max: 20, // Tối đa 20 requests per minute per IP
    message: {
        success: false,
        error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Bỏ qua rate limit cho localhost trong development
    skip: (req) => {
        if (process.env.NODE_ENV === 'development') {
            return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
        }
        return false;
    }
});

// Rate limiter cho sync history API
const syncHistoryRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 phút
    max: 10, // Tối đa 10 requests per 5 minutes per IP
    message: {
        success: false,
        error: 'Quá nhiều yêu cầu đồng bộ lịch sử. Vui lòng thử lại sau 5 phút.',
        retryAfter: 300
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Bỏ qua rate limit cho localhost trong development
    skip: (req) => {
        if (process.env.NODE_ENV === 'development') {
            return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
        }
        return false;
    }
});

// Rate limiter cho tạo đơn hàng (public booking)
const bookingRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 phút
    max: 20, // Tối đa 20 booking attempts / 5 phút / IP
    message: {
        success: false,
        error: 'Bạn thao tác quá nhanh khi tạo đơn. Vui lòng thử lại sau vài phút.',
        retryAfter: 300
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        if (process.env.NODE_ENV === 'development') {
            return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
        }
        return false;
    }
});

// Rate limiter cho tra cứu đơn và gửi OTP (public)
const orderLookupRateLimit = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 phút
    max: 10, // Tối đa 10 request / 2 phút / IP
    message: {
        success: false,
        error: 'Bạn thao tác quá nhanh khi tra cứu. Vui lòng thử lại sau ít phút.',
        retryAfter: 120
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        if (process.env.NODE_ENV === 'development') {
            return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
        }
        return false;
    }
});

module.exports = {
    chatbotRateLimit,
    syncHistoryRateLimit,
    bookingRateLimit,
    orderLookupRateLimit
};
