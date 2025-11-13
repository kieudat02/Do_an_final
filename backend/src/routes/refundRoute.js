const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');
const paymentEmailService = require('../services/paymentEmailService');

/**
 * Route xử lý form hoàn tiền cho thanh toán trực tuyến
 */

// Lấy thông tin đơn hàng để hiển thị form hoàn tiền
router.get('/form/:orderId', async (req, res) => {
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

        // Kiểm tra điều kiện hoàn tiền
        if (!['MoMo', 'VNPay'].includes(order.paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng này không phải thanh toán trực tuyến'
            });
        }

        if (order.paymentStatus !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng chưa được thanh toán thành công'
            });
        }

        if (order.status !== 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng chưa bị hủy'
            });
        }

        // Trả về thông tin đơn hàng cho form
        res.json({
            success: true,
            data: {
                orderId: order.orderId,
                customerName: order.customer,
                customerEmail: order.email,
                tourName: order.items[0]?.name || 'Tour du lịch',
                totalAmount: order.totalAmount,
                paymentMethod: order.paymentMethod,
                paidAt: order.paidAt,
                cancelReason: order.cancelReason
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

// Xử lý submit form hoàn tiền
router.post('/submit/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { 
            bankName, 
            accountNumber, 
            accountHolderName, 
            customerPhone,
            notes 
        } = req.body;

        // Validate dữ liệu
        if (!bankName || !accountNumber || !accountHolderName) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin ngân hàng'
            });
        }

        // Tìm đơn hàng
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Cập nhật thông tin hoàn tiền vào đơn hàng
        await Order.findOneAndUpdate(
            { orderId: orderId },
            {
                refundBankInfo: {
                    bankName: bankName,
                    accountNumber: accountNumber,
                    accountHolderName: accountHolderName,
                    customerPhone: customerPhone,
                    notes: notes,
                    submittedAt: new Date()
                },
                paymentStatus: 'refund',
                updatedBy: 'Customer Refund Form'
            }
        );

        // Gửi email xác nhận đã nhận thông tin hoàn tiền
        try {
            // Có thể tạo thêm template email xác nhận nhận thông tin hoàn tiền
            // Log removed for production
        } catch (emailError) {
            // Error handling for email sending
        }

        res.json({
            success: true,
            message: 'Đã nhận thông tin hoàn tiền. Chúng tôi sẽ xử lý trong vòng 3-7 ngày làm việc.',
            data: {
                orderId: orderId,
                submittedAt: new Date()
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

// Route để admin xem danh sách yêu cầu hoàn tiền
router.get('/admin/list', async (req, res) => {
    try {
        const { page = 1, limit = 10, status = 'refund' } = req.query;

        const orders = await Order.find({
            paymentStatus: status,
            refundBankInfo: { $exists: true }
        })
        .select('orderId customer email totalAmount paymentMethod refundBankInfo createdAt')
        .sort({ 'refundBankInfo.submittedAt': -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

        const total = await Order.countDocuments({
            paymentStatus: status,
            refundBankInfo: { $exists: true }
        });

        res.json({
            success: true,
            data: {
                orders: orders,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    pages: Math.ceil(total / limit)
                }
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
