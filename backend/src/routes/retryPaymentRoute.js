const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');
const momoController = require('../controllers/momoController');

/**
 * Route xử lý thanh toán lại cho đơn hàng thất bại
 */

// Lấy thông tin đơn hàng để hiển thị trang retry payment
router.get('/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        // Tìm đơn hàng
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra điều kiện retry payment
        if (!['MoMo', 'VNPay'].includes(order.paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng này không phải thanh toán trực tuyến'
            });
        }

        if (order.paymentStatus === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã được thanh toán thành công'
            });
        }

        if (order.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã bị hủy'
            });
        }

        // Trả về thông tin đơn hàng
        res.json({
            success: true,
            data: {
                orderId: order.orderId,
                customerName: order.customer,
                customerEmail: order.email,
                tourName: order.items[0]?.name || 'Tour du lịch',
                totalAmount: order.totalAmount,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                failureReason: order.momoFailureReason || order.vnpayFailureReason,
                createdAt: order.createdAt
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Tạo link thanh toán lại cho MoMo
router.post('/momo/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        // Tìm đơn hàng
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra điều kiện
        if (order.paymentMethod !== 'MoMo') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng này không phải thanh toán MoMo'
            });
        }

        if (order.paymentStatus === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã được thanh toán thành công'
            });
        }

        // Chuẩn bị dữ liệu thanh toán
        const paymentData = {
            orderId: order.orderId,
            amount: order.totalAmount,
            orderInfo: `Thanh toan lai tour ${order.items[0]?.name || 'du lich'}`
        };

        // Tạo request giống như tạo payment mới
        req.body = paymentData;
        
        // Gọi controller MoMo
        return await momoController.createMoMoPayment(req, res);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Tạo link thanh toán lại cho VNPay
router.post('/vnpay/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { bankCode } = req.body;

        // Tìm đơn hàng
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra điều kiện
        if (order.paymentMethod !== 'VNPay') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng này không phải thanh toán VNPay'
            });
        }

        if (order.paymentStatus === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã được thanh toán thành công'
            });
        }

        // Chuẩn bị dữ liệu thanh toán
        const paymentData = {
            orderId: order.orderId,
            amount: order.totalAmount,
            orderInfo: `Thanh toan lai tour ${order.items[0]?.name || 'du lich'}`,
            bankCode: bankCode
        };

        // Tạo request giống như tạo payment mới
        req.body = paymentData;
        
        // Gọi controller VNPay
        return await momoController.createVNPayPayment(req, res);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Kiểm tra trạng thái thanh toán sau khi retry
router.get('/status/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        // Tìm đơn hàng
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        res.json({
            success: true,
            data: {
                orderId: order.orderId,
                paymentStatus: order.paymentStatus,
                status: order.status,
                paymentMethod: order.paymentMethod,
                totalAmount: order.totalAmount,
                paidAt: order.paidAt,
                failureReason: order.momoFailureReason || order.vnpayFailureReason,
                transactionId: order.momoTransId || order.vnpayTransactionNo
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

module.exports = router;
