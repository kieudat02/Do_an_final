const express = require('express');
const router = express.Router();
const momoController = require('../controllers/momoController');

// ========== MOMO ROUTES ==========
// Tạo link thanh toán MoMo
router.post('/create-payment', momoController.createMoMoPayment);

// Xử lý callback từ MoMo
router.post('/callback', momoController.handleMoMoCallback);

// Kiểm tra trạng thái thanh toán MoMo
router.get('/status/:orderId', momoController.checkMoMoPaymentStatus);

module.exports = router;
