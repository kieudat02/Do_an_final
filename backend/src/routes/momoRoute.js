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

// ========== VNPAY ROUTES ==========
// Tạo link thanh toán VNPay
router.post('/vnpay/create-payment', momoController.createVNPayPayment);

// Xử lý return từ VNPay sau khi thanh toán
router.get('/vnpay/return', momoController.handleVNPayReturn);

// Kiểm tra trạng thái thanh toán VNPay
router.get('/vnpay/status/:orderId', momoController.checkVNPayPaymentStatus);

module.exports = router;
