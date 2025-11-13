const express = require('express');
const router = express.Router();
const momoController = require('../controllers/momoController');

// ========== MOMO ROUTES ==========
// Tạo link thanh toán MoMo
router.post('/create-payment', momoController.createMoMoPayment);

// Xử lý callback từ MoMo
router.post('/callback', momoController.handleMoMoCallback);

// Xử lý callback thất bại từ frontend khi MoMo không gọi IPN
router.post('/handle-failure', momoController.handleMoMoFailureFromFrontend);

// Kiểm tra trạng thái thanh toán MoMo
router.get('/status/:orderId', momoController.checkMoMoPaymentStatus);

// Force update trạng thái thanh toán (backup khi callback không hoạt động)
router.put('/force-update/:orderId', momoController.forceUpdatePaymentStatus);



// Test callback endpoint (để test mà không cần signature)
router.post('/test-callback/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { resultCode = 1, message = 'Test failed payment' } = req.body;
        

        
        // Tạo mock callback data
        const mockCallbackData = {
            partnerCode: 'MOMO',
            orderId: orderId,
            requestId: `test_${Date.now()}`,
            amount: '100000',
            orderInfo: 'Test payment',
            orderType: 'momo_wallet',
            transId: `test_trans_${Date.now()}`,
            resultCode: parseInt(resultCode),
            message: message,
            payType: 'qr',
            responseTime: Date.now().toString(),
            extraData: '',
            signature: 'test_signature'
        };
        
        // Gọi trực tiếp logic xử lý callback (bỏ qua signature validation)
        const Order = require('../models/orderModel');
        const paymentEmailService = require('../services/paymentEmailService');
        
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }
        
        if (mockCallbackData.resultCode === 0) {
            // Test thành công - để status='pending' chờ admin duyệt thủ công
            const updatedOrder = await Order.findOneAndUpdate(
                { orderId: orderId },
                {
                    paymentStatus: 'completed',
                    // Giữ status='pending' để admin có thể duyệt thủ công
                    momoTransId: mockCallbackData.transId,
                    momoResponseTime: mockCallbackData.responseTime,
                    paidAt: new Date(),
                    updatedBy: 'Test MoMo System'
                },
                { new: true }
            );
            
            // Test email
            await paymentEmailService.sendOnlinePaymentSuccess(updatedOrder);
            const bookingNotificationService = require('../services/bookingNotificationService');
            const bookingData = await bookingNotificationService.prepareBookingData(updatedOrder);
            await bookingNotificationService.sendStaffEmailNotification(bookingData);
            
            return res.status(200).json({
                success: true,
                message: 'Test callback thành công - Thanh toán thành công',
                data: { orderId, resultCode: mockCallbackData.resultCode, paymentStatus: 'completed', status: updatedOrder.status }
            });
        } else {
            // Test thất bại - giữ status='pending' để cho phép thanh toán lại
            const failedOrder = await Order.findOneAndUpdate(
                { orderId: orderId },
                {
                    paymentStatus: 'failed',
                    // Không thay đổi status, để 'pending' cho khách hàng có thể thanh toán lại
                    momoTransId: mockCallbackData.transId,
                    momoResponseTime: mockCallbackData.responseTime,
                    momoFailureReason: mockCallbackData.message,
                    updatedBy: 'Test MoMo System'
                },
                { new: true }
            );
            
            // Test email thất bại
            const retryPaymentUrl = `${process.env.FRONTEND_URL}/payment/retry/${orderId}`;
            await paymentEmailService.sendOnlinePaymentFailed(failedOrder, mockCallbackData.message, retryPaymentUrl);
            
            const bookingNotificationService = require('../services/bookingNotificationService');
            const bookingData = await bookingNotificationService.prepareBookingData(failedOrder);
            await bookingNotificationService.sendStaffEmailNotification(bookingData);
            
            return res.status(200).json({
                success: true,
                message: 'Test callback thành công - Thanh toán thất bại',
                data: { orderId, resultCode: mockCallbackData.resultCode, paymentStatus: 'failed', status: failedOrder.status }
            });
        }
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi test callback',
            error: error.message
        });
    }
});

module.exports = router;
