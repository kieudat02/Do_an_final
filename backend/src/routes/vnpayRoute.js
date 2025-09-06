const express = require('express');
const router = express.Router();
const vnpayController = require('../controllers/vnpayController');

// ========== VNPAY ROUTES ==========
// Tạo link thanh toán VNPay
router.post('/create-payment', vnpayController.createVNPayPayment);

// Xử lý return từ VNPay sau khi thanh toán
router.get('/return', vnpayController.handleVNPayReturn);

// Kiểm tra trạng thái thanh toán VNPay
router.get('/status/:orderId', vnpayController.checkVNPayPaymentStatus);

module.exports = router;
