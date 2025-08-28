const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middleware/authMiddleware');
const { loginRateLimit } = require('../middleware/securityMiddleware');

// Rate limiting chỉ cho POST login (chỉ khi production)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: process.env.NODE_ENV === 'production' ? 5 : 1000, // Dev: 1000 lần, Prod: 5 lần
    message: 'Quá nhiều lần đăng nhập sai, vui lòng thử lại sau 15 phút.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Route hiển thị form đăng nhập
router.get('/login', redirectIfAuthenticated, authController.getLogin);

// Route xử lý đăng nhập (có rate limiting và security middleware)
router.post('/login', loginRateLimit, loginLimiter, redirectIfAuthenticated, authController.postLogin);

// Route đăng xuất
router.get('/logout', authController.logout);

module.exports = router;