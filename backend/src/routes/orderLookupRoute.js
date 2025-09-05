const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');

/**
 * GET /api/orders/lookup/:orderId
 * Tra cứu thông tin đơn hàng bằng orderId
 */
router.get('/lookup/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Tìm đơn hàng theo orderId
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }
        
        // Trả về thông tin đơn hàng (loại bỏ các thông tin nhạy cảm)
        const orderInfo = {
            orderId: order.orderId,
            customerName: order.customer,
            customerEmail: order.email,
            customerPhone: order.phone,
            tourName: order.items && order.items[0] ? order.items[0].name : 'N/A',
            departureDate: order.departureDate,
            returnDate: order.returnDate,
            totalPeople: order.items && order.items[0] ?
                (order.items[0].adults || 0) + (order.items[0].children || 0) + (order.items[0].babies || 0) : 0,
            adults: order.items && order.items[0] ? order.items[0].adults : 0,
            children: order.items && order.items[0] ? order.items[0].children : 0,
            babies: order.items && order.items[0] ? order.items[0].babies : 0,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            status: order.status,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        };
        
        res.json({
            success: true,
            data: orderInfo
        });
        
    } catch (error) {
        console.error('Error looking up order:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tra cứu đơn hàng'
        });
    }
});

module.exports = router;
