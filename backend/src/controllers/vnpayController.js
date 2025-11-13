const axios = require('axios');
const Order = require('../models/orderModel');
const { deductStock } = require('../utils/stockManager');
const qs = require('qs');
const paymentEmailService = require('../services/paymentEmailService');
const {
    createVNPaySignature,
    validateAmount,
    validateOrderId,
    formatPaymentDate,
    generateVNPayTxnRef,
    getClientIP,
    parseVNPayTxnRef,
    logPaymentActivity
} = require('../utils/paymentUtils');

// Validate required VNPay configuration
if (!process.env.VNPAY_TMN_CODE || !process.env.VNPAY_SECRET_KEY) {
    console.error('FATAL ERROR: VNPay credentials (VNPAY_TMN_CODE, VNPAY_SECRET_KEY) are not defined.');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

// Cấu hình VNPay
const VNPAY_CONFIG = {
    tmnCode: process.env.VNPAY_TMN_CODE,
    secretKey: process.env.VNPAY_SECRET_KEY,
    url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL || `${process.env.FRONTEND_URL}/payment/vnpay-return`,
    api: {
        querydr: process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'
    }
};

/**
 * Tạo link thanh toán VNPay
 */
exports.createVNPayPayment = async (req, res) => {
    try {
        const { orderId, amount, orderInfo, bankCode } = req.body;

        // Validate đầu vào
        const orderIdValidation = validateOrderId(orderId);
        if (!orderIdValidation.isValid) {
            logPaymentActivity('VNPay', 'create', orderId, { error: orderIdValidation.message });
            return res.status(400).json({
                success: false,
                message: orderIdValidation.message
            });
        }

        const amountValidation = validateAmount(amount);
        if (!amountValidation.isValid) {
            logPaymentActivity('VNPay', 'create', orderId, { error: amountValidation.message });
            return res.status(400).json({
                success: false,
                message: amountValidation.message
            });
        }

        // Kiểm tra order có tồn tại không
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            logPaymentActivity('VNPay', 'create', orderId, { error: 'Order not found' });
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Lấy IP địa chỉ của client
        const ipAddr = getClientIP(req);

        // Tạo transaction reference với timestamp để đảm bảo unique
        const createDate = formatPaymentDate();
        const txnRef = generateVNPayTxnRef(orderId, createDate);

        // Tạo các tham số cho VNPay
        let vnpParams = {
            'vnp_Version': '2.1.0',
            'vnp_Command': 'pay',
            'vnp_TmnCode': VNPAY_CONFIG.tmnCode,
            'vnp_Amount': amountValidation.amount * 100, // VNPay yêu cầu amount * 100
            'vnp_CreateDate': createDate,
            'vnp_CurrCode': 'VND',
            'vnp_IpAddr': ipAddr,
            'vnp_Locale': 'vn',
            'vnp_OrderInfo': orderInfo || 'Thanh toan tour du lich',
            'vnp_OrderType': 'other',
            'vnp_ReturnUrl': VNPAY_CONFIG.returnUrl,
            'vnp_TxnRef': txnRef,
        };

        // Thêm bank code nếu có
        if (bankCode && bankCode !== '') {
            vnpParams['vnp_BankCode'] = bankCode;
        }

        // Tạo signature
        const signature = createVNPaySignature(vnpParams, VNPAY_CONFIG.secretKey);
        vnpParams['vnp_SecureHash'] = signature;

        // Tạo URL thanh toán
        const paymentUrl = VNPAY_CONFIG.url + '?' + qs.stringify(vnpParams, { encode: false });

        // Cập nhật order với thông tin thanh toán VNPay
        await Order.findOneAndUpdate(
            { orderId: orderId },
            { 
                paymentMethod: 'VNPay',
                vnpayTxnRef: txnRef,
                paymentStatus: 'pending',
                vnpayCreateDate: createDate
            }
        );

        logPaymentActivity('VNPay', 'create', orderId, { 
            txnRef, 
            amount: amountValidation.amount,
            success: true 
        });

        return res.status(200).json({
            success: true,
            message: 'Tạo link thanh toán VNPay thành công',
            data: {
                paymentUrl: paymentUrl,
                orderId: orderId,
                txnRef: txnRef,
                amount: amountValidation.amount
            }
        });

    } catch (error) {
        logPaymentActivity('VNPay', 'create', req.body?.orderId, { 
            error: error.message,
            success: false 
        });
        console.error('❌ Lỗi khi tạo thanh toán VNPay:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo thanh toán VNPay',
            error: error.message
        });
    }
};

/**
 * Xử lý return từ VNPay sau khi thanh toán
 */
exports.handleVNPayReturn = async (req, res) => {
    try {
        let vnpParams = req.query;
        const secureHash = vnpParams['vnp_SecureHash'];

        // Xóa các tham số không cần thiết để verify signature
        delete vnpParams['vnp_SecureHash'];
        delete vnpParams['vnp_SecureHashType'];

        // Verify signature
        const signed = createVNPaySignature(vnpParams, VNPAY_CONFIG.secretKey);

        if (secureHash === signed) {
            const orderId = parseVNPayTxnRef(vnpParams['vnp_TxnRef']); // Lấy orderId từ txnRef
            const responseCode = vnpParams['vnp_ResponseCode'];

            logPaymentActivity('VNPay', 'return', orderId, { 
                responseCode,
                transactionNo: vnpParams['vnp_TransactionNo']
            });

            // Tìm order trong database
            const order = await Order.findOne({ orderId: orderId });
            if (!order) {
                console.error('❌ Không tìm thấy order:', orderId);
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng'
                });
            }

            // Thêm logging chi tiết để debug
            console.log(`🔍 VNPay return received for order ${orderId}:`, {
                responseCode,
                responseCodeType: typeof responseCode,
                transactionNo: vnpParams['vnp_TransactionNo'],
                bankCode: vnpParams['vnp_BankCode']
            });

            // Cập nhật trạng thái thanh toán
            if (responseCode === '00') {
                // Thanh toán thành công - để status='pending' chờ admin duyệt thủ công
                const updatedOrder = await Order.findOneAndUpdate(
                    { orderId: orderId },
                    { 
                        paymentStatus: 'completed',
                        // Giữ status='pending' để admin có thể duyệt thủ công
                        vnpayTransactionNo: vnpParams['vnp_TransactionNo'],
                        vnpayBankCode: vnpParams['vnp_BankCode'],
                        vnpayPayDate: vnpParams['vnp_PayDate'],
                        paidAt: new Date(),
                        updatedBy: 'VNPay Return System'
                    },
                    { new: true } 
                );

                if (updatedOrder) {
                    console.log(`✅ VNPay order ${orderId} payment completed successfully:`, {
                        paymentStatus: updatedOrder.paymentStatus,
                        status: updatedOrder.status, // Should remain 'pending' for admin approval
                        paidAt: updatedOrder.paidAt
                    });
                } else {
                    console.error(`❌ Failed to update VNPay order ${orderId}`);
                }

                // Trừ stock cho các tour detail khi thanh toán thành công (chỉ nếu chưa trừ)
                if (updatedOrder && updatedOrder.items && updatedOrder.items.length > 0 && !updatedOrder.stockDeducted) {
                    const stockResult = await deductStock(updatedOrder.items, 'vnpay return');
                    if (stockResult) {
                        // Đánh dấu đã trừ stock
                        await Order.findOneAndUpdate(
                            { orderId: orderId },
                            { stockDeducted: true }
                        );
                    }
                }

                // Gửi email thanh toán thành công cho khách hàng và thông báo booking cho staff
                try {
                    // Gửi email cho khách hàng
                    await paymentEmailService.sendOnlinePaymentSuccess(updatedOrder);
                    console.log(`✅ Đã gửi email thanh toán VNPay thành công cho đơn ${orderId}`);
                    
                    // Gửi email thông báo booking cho staff
                    const bookingNotificationService = require('../services/bookingNotificationService');
                    const bookingData = await bookingNotificationService.prepareBookingData(updatedOrder);
                    await bookingNotificationService.sendStaffEmailNotification(bookingData);
                    console.log(`✅ Đã gửi email thông báo booking VNPay thành công cho staff ${orderId}`);
                } catch (emailError) {
                    console.error(`❌ Lỗi gửi email thanh toán VNPay thành công cho đơn ${orderId}:`, emailError.message);
                }

                return res.status(200).json({
                    success: true,
                    message: 'Xử lý VNPay return thành công - Thanh toán thành công',
                    data: {
                        orderId: orderId,
                        responseCode: responseCode,
                        paymentStatus: 'completed',
                        transactionNo: vnpParams['vnp_TransactionNo'],
                        bankCode: vnpParams['vnp_BankCode'],
                        payDate: vnpParams['vnp_PayDate']
                    }
                });
                
            } else {
                // Thanh toán thất bại - chỉ cập nhật paymentStatus, giữ status là 'pending'
                console.log(`🔄 Updating VNPay order ${orderId} to failed payment status...`);
                const failedOrder = await Order.findOneAndUpdate(
                    { orderId: orderId },
                    {
                        paymentStatus: 'failed',
                        // Không thay đổi status, để 'pending' cho khách hàng có thể thanh toán lại
                        vnpayTransactionNo: vnpParams['vnp_TransactionNo'],
                        vnpayBankCode: vnpParams['vnp_BankCode'],
                        vnpayFailureReason: `Mã lỗi VNPay: ${responseCode}`,
                        $inc: { paymentFailCount: 1 }, // Tăng số lần thất bại
                        updatedBy: 'VNPay Return System'
                    },
                    { new: true }
                );

                if (failedOrder) {
                    console.log(`✅ VNPay order ${orderId} updated successfully:`, {
                        paymentStatus: failedOrder.paymentStatus,
                        status: failedOrder.status, // Should remain 'pending'
                        paymentFailCount: failedOrder.paymentFailCount,
                        vnpayFailureReason: failedOrder.vnpayFailureReason
                    });

                    // Auto-cancel nếu thất bại quá 3 lần
                    if (failedOrder.paymentFailCount >= 3) {
                        console.log(`⚠️ VNPay order ${orderId} failed ${failedOrder.paymentFailCount} times, auto-cancelling...`);
                        await Order.findOneAndUpdate(
                            { orderId: orderId },
                            {
                                status: 'cancelled',
                                updatedBy: 'Auto-Cancel System (3+ failures)'
                            }
                        );
                        console.log(`🚫 VNPay order ${orderId} has been auto-cancelled due to multiple payment failures`);
                    }
                } else {
                    console.error(`❌ Failed to update VNPay order ${orderId}`);
                }

                // Gửi email thanh toán thất bại cho khách hàng và thông báo booking cho staff
                try {
                    // Gửi email cho khách hàng
                    const retryPaymentUrl = `${process.env.FRONTEND_URL}/payment/retry/${orderId}`;
                    const failureReason = `Mã lỗi VNPay: ${responseCode}`;
                    await paymentEmailService.sendOnlinePaymentFailed(failedOrder, failureReason, retryPaymentUrl);
                    console.log(`✅ Đã gửi email thanh toán VNPay thất bại cho đơn ${orderId}`);
                    
                    // Gửi email thông báo booking cho staff (cả khi thất bại)
                    const bookingNotificationService = require('../services/bookingNotificationService');
                    const bookingData = await bookingNotificationService.prepareBookingData(failedOrder);
                    await bookingNotificationService.sendStaffEmailNotification(bookingData);
                    console.log(`✅ Đã gửi email thông báo booking VNPay thất bại cho staff ${orderId}`);
                } catch (emailError) {
                    console.error(`❌ Lỗi gửi email thanh toán VNPay thất bại cho đơn ${orderId}:`, emailError.message);
                }

                return res.status(200).json({
                    success: true,
                    message: 'Xử lý VNPay return thành công - Thanh toán thất bại',
                    data: {
                        orderId: orderId,
                        responseCode: responseCode,
                        paymentStatus: 'failed',
                        transactionNo: vnpParams['vnp_TransactionNo'],
                        failureReason: `Mã lỗi VNPay: ${responseCode}`
                    }
                });
            }

        } else {
            console.error('❌ Signature không hợp lệ từ VNPay return', {
                signData: vnpParams,
                signed: signed,
                secureHash: secureHash
            });
            return res.status(400).json({
                success: false,
                message: 'Signature không hợp lệ từ VNPay'
            });
        }

    } catch (error) {
        console.error('❌ Lỗi khi xử lý VNPay return:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xử lý VNPay return',
            error: error.message
        });
    }
};

/**
 * Kiểm tra trạng thái thanh toán VNPay
 */
exports.checkVNPayPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        const orderIdValidation = validateOrderId(orderId);
        if (!orderIdValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: orderIdValidation.message
            });
        }

        // Tìm order trong database
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            logPaymentActivity('VNPay', 'status', orderId, { error: 'Order not found' });
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        logPaymentActivity('VNPay', 'status', orderId, {
            paymentStatus: order.paymentStatus,
            vnpayTxnRef: order.vnpayTxnRef
        });

        // Nếu đã có txnRef từ VNPay, có thể kiểm tra trạng thái thông qua API
        if (order.vnpayTxnRef) {
            // Trả về thông tin chi tiết order với trạng thái VNPay
            return res.status(200).json({
                success: true,
                data: {
                    orderId: orderId,
                    paymentStatus: order.paymentStatus,
                    paymentMethod: order.paymentMethod,
                    vnpayTxnRef: order.vnpayTxnRef,
                    vnpayTransactionNo: order.vnpayTransactionNo,
                    vnpayBankCode: order.vnpayBankCode,
                    vnpayPayDate: order.vnpayPayDate,
                    // Thông tin đơn hàng chi tiết
                    customer: order.customer,
                    email: order.email,
                    phone: order.phone,
                    totalAmount: order.totalAmount,
                    status: order.status,
                    createdAt: order.createdAt,
                    paidAt: order.paidAt,
                    tourName: order.tourName,
                    departure: order.departure,
                    destination: order.destination,
                    startDate: order.startDate,
                    endDate: order.endDate,
                    adults: order.adults,
                    children: order.children,
                    infants: order.infants,
                    items: order.items
                }
            });
        }

        // Nếu chưa có thông tin VNPay, trả về trạng thái hiện tại
        return res.status(200).json({
            success: true,
            data: {
                orderId: orderId,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                // Thông tin đơn hàng chi tiết
                customer: order.customer,
                email: order.email,
                phone: order.phone,
                totalAmount: order.totalAmount,
                status: order.status,
                createdAt: order.createdAt,
                paidAt: order.paidAt,
                tourName: order.tourName,
                departure: order.departure,
                destination: order.destination,
                startDate: order.startDate,
                endDate: order.endDate,
                adults: order.adults,
                children: order.children,
                infants: order.infants,
                items: order.items
            }
        });

    } catch (error) {
        logPaymentActivity('VNPay', 'status', req.params?.orderId, {
            error: error.message,
            success: false
        });
        console.error('❌ Lỗi khi kiểm tra trạng thái thanh toán VNPay:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi kiểm tra trạng thái thanh toán VNPay',
            error: error.message
        });
    }
};

/**
 * Endpoint backup để cập nhật trạng thái thanh toán khi return URL không hoạt động
 */
exports.forceUpdatePaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, failureReason } = req.body;

        console.log(`🔄 Force update VNPay payment status for order ${orderId}:`, { status, failureReason });

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu orderId'
            });
        }

        // Tìm order trong database
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Chỉ cập nhật nếu order vẫn đang pending
        if (order.paymentStatus !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Đơn hàng đã có trạng thái: ${order.paymentStatus}`
            });
        }

        let updatedOrder;

        if (status === 'failed') {
            // Cập nhật trạng thái thất bại - chỉ cập nhật paymentStatus, giữ status là 'pending'
            updatedOrder = await Order.findOneAndUpdate(
                { orderId: orderId },
                {
                    paymentStatus: 'failed',
                    // Không thay đổi status, để 'pending' cho khách hàng có thể thanh toán lại
                    vnpayFailureReason: failureReason || 'Thanh toán thất bại (force update)',
                    updatedBy: 'Force Update System'
                },
                { new: true }
            );

            // Gửi email thông báo thất bại
            try {
                const retryPaymentUrl = `${process.env.FRONTEND_URL}/payment/retry/${orderId}`;
                await paymentEmailService.sendOnlinePaymentFailed(updatedOrder, failureReason || 'Thanh toán thất bại', retryPaymentUrl);
                
                // Gửi email thông báo booking cho staff
                const bookingNotificationService = require('../services/bookingNotificationService');
                const bookingData = await bookingNotificationService.prepareBookingData(updatedOrder);
                await bookingNotificationService.sendStaffEmailNotification(bookingData);
                
                console.log(`✅ Đã gửi email VNPay force update thất bại cho đơn ${orderId}`);
            } catch (emailError) {
                console.error(`❌ Lỗi gửi email VNPay force update thất bại cho đơn ${orderId}:`, emailError.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái thanh toán VNPay thành công',
            data: {
                orderId: orderId,
                oldStatus: order.paymentStatus,
                newStatus: updatedOrder?.paymentStatus || 'unchanged',
                orderStatus: updatedOrder?.status || order.status
            }
        });

    } catch (error) {
        console.error('❌ Lỗi khi force update trạng thái thanh toán VNPay:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái thanh toán VNPay',
            error: error.message
        });
    }
};
