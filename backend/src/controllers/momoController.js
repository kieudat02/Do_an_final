const axios = require('axios');
const Order = require('../models/orderModel');
const { deductStock } = require('../utils/stockManager');
const paymentEmailService = require('../services/paymentEmailService');
const {
    createMoMoSignature,
    validateAmount,
    validateOrderId,
    generateUniqueOrderId,
    generateMoMoRequestId,
    logPaymentActivity
} = require('../utils/paymentUtils');

// Validate required MoMo configuration
if (!process.env.MOMO_ACCESS_KEY || !process.env.MOMO_SECRET_KEY) {
    console.error('FATAL ERROR: MoMo credentials (MOMO_ACCESS_KEY, MOMO_SECRET_KEY) are not defined.');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

// Cấu hình MoMo
const MOMO_CONFIG = {
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    orderInfo: 'Thanh toán tour du lịch',
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
    endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
    queryEndpoint: process.env.MOMO_QUERY_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/query',
    redirectUrl: process.env.MOMO_REDIRECT_URL || `${process.env.FRONTEND_URL}/payment/success`,
    ipnUrl: process.env.MOMO_IPN_URL || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/momo/callback`,
    requestType: 'payWithMethod',
    extraData: '',
    autoCapture: true,
    lang: 'vi'
};

/**
 * Tạo link thanh toán MoMo
 */
exports.createMoMoPayment = async (req, res) => {
    try {
        const { orderId, amount, orderInfo } = req.body;

        // Validate đầu vào
        const orderIdValidation = validateOrderId(orderId);
        if (!orderIdValidation.isValid) {
            logPaymentActivity('MoMo', 'create', orderId, { error: orderIdValidation.message });
            return res.status(400).json({
                success: false,
                message: orderIdValidation.message
            });
        }

        const amountValidation = validateAmount(amount);
        if (!amountValidation.isValid) {
            logPaymentActivity('MoMo', 'create', orderId, { error: amountValidation.message });
            return res.status(400).json({
                success: false,
                message: amountValidation.message
            });
        }

        // Kiểm tra order có tồn tại không
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            logPaymentActivity('MoMo', 'create', orderId, { error: 'Order not found' });
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Tạo requestId unique
        const requestId = generateMoMoRequestId(orderId);

        // Tạo redirectUrl với orderId
        const redirectUrlWithOrderId = `${MOMO_CONFIG.redirectUrl}?orderId=${orderId}`;

        // Tạo raw signature string theo yêu cầu của MoMo
        const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amountValidation.amount}&extraData=${MOMO_CONFIG.extraData}&ipnUrl=${MOMO_CONFIG.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo || MOMO_CONFIG.orderInfo}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${redirectUrlWithOrderId}&requestId=${requestId}&requestType=${MOMO_CONFIG.requestType}`;

        // Tạo signature
        const signature = createMoMoSignature(rawSignature, MOMO_CONFIG.secretKey);

        // Dữ liệu gửi tới MoMo
        const requestBody = {
            partnerCode: MOMO_CONFIG.partnerCode,
            partnerName: "Tour Du Lịch",
            storeId: "MomoTestStore",
            requestId: requestId,
            amount: amountValidation.amount,
            orderId: orderId,
            orderInfo: orderInfo || MOMO_CONFIG.orderInfo,
            redirectUrl: redirectUrlWithOrderId,
            ipnUrl: MOMO_CONFIG.ipnUrl,
            lang: MOMO_CONFIG.lang,
            requestType: MOMO_CONFIG.requestType,
            autoCapture: MOMO_CONFIG.autoCapture,
            extraData: MOMO_CONFIG.extraData,
            signature: signature
        };

        // Gửi request tới MoMo
        const momoResponse = await axios.post(MOMO_CONFIG.endpoint, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (momoResponse.data.resultCode === 0) {
            // Cập nhật order với thông tin thanh toán MoMo
            await Order.findOneAndUpdate(
                { orderId: orderId },
                {
                    paymentMethod: 'MoMo',
                    momoRequestId: requestId,
                    momoTransId: momoResponse.data.transId || '',
                    paymentStatus: 'pending'
                }
            );

            logPaymentActivity('MoMo', 'create', orderId, {
                requestId,
                transId: momoResponse.data.transId,
                amount: amountValidation.amount,
                success: true
            });

            return res.status(200).json({
                success: true,
                message: 'Tạo link thanh toán MoMo thành công',
                data: {
                    payUrl: momoResponse.data.payUrl,
                    qrCodeUrl: momoResponse.data.qrCodeUrl,
                    orderId: orderId,
                    requestId: requestId,
                    transId: momoResponse.data.transId
                }
            });
        } else {
            logPaymentActivity('MoMo', 'create', orderId, {
                error: momoResponse.data.message,
                resultCode: momoResponse.data.resultCode,
                success: false
            });


            // Xử lý trường hợp orderId trùng (resultCode 41)
            if (momoResponse.data.resultCode === 41) {
                
                try {
                    // Tạo orderId mới với timestamp để đảm bảo unique
                    const newOrderId = generateUniqueOrderId();

                    // Cập nhật order với orderId mới
                    await Order.findOneAndUpdate(
                        { orderId: orderId },
                        { orderId: newOrderId }
                    );

                    // Tạo redirectUrl với orderId mới
                    const newRedirectUrlWithOrderId = `${MOMO_CONFIG.redirectUrl}?orderId=${newOrderId}`;

                    // Tạo lại signature với orderId mới
                    const newRawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amountValidation.amount}&extraData=${MOMO_CONFIG.extraData}&ipnUrl=${MOMO_CONFIG.ipnUrl}&orderId=${newOrderId}&orderInfo=${orderInfo || MOMO_CONFIG.orderInfo}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${newRedirectUrlWithOrderId}&requestId=${requestId}&requestType=${MOMO_CONFIG.requestType}`;
                    const newSignature = createMoMoSignature(newRawSignature, MOMO_CONFIG.secretKey);
                    
                    const newRequestBody = {
                        partnerCode: MOMO_CONFIG.partnerCode,
                        partnerName: "Tour Du Lịch",
                        storeId: "MomoTestStore",
                        requestId: requestId,
                        amount: amount,
                        orderId: newOrderId,
                        orderInfo: orderInfo || MOMO_CONFIG.orderInfo,
                        redirectUrl: newRedirectUrlWithOrderId,
                        ipnUrl: MOMO_CONFIG.ipnUrl,
                        lang: MOMO_CONFIG.lang,
                        extraData: MOMO_CONFIG.extraData,
                        requestType: MOMO_CONFIG.requestType,
                        signature: newSignature
                    };
                    
                    // Gửi request với orderId mới
                    const retryResponse = await axios.post(MOMO_CONFIG.endpoint, newRequestBody, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (retryResponse.data.resultCode === 0) {
                        // Cập nhật order với thông tin thanh toán MoMo
                        await Order.findOneAndUpdate(
                            { orderId: newOrderId },
                            { 
                                paymentMethod: 'MoMo',
                                momoRequestId: requestId,
                                momoTransId: retryResponse.data.transId || '',
                                paymentStatus: 'pending'
                            }
                        );

                        return res.status(200).json({
                            success: true,
                            message: 'Tạo link thanh toán MoMo thành công (retry)',
                            data: {
                                payUrl: retryResponse.data.payUrl,
                                qrCodeUrl: retryResponse.data.qrCodeUrl,
                                orderId: newOrderId,
                                requestId: requestId,
                                transId: retryResponse.data.transId
                            }
                        });
                    } else {

                        return res.status(400).json({
                            success: false,
                            message: 'Không thể tạo link thanh toán MoMo sau khi retry',
                            error: retryResponse.data.message || 'Lỗi không xác định'
                        });
                    }
                } catch (retryError) {

                    return res.status(400).json({
                        success: false,
                        message: 'Không thể tạo link thanh toán MoMo (retry failed)',
                        error: 'Vui lòng thử lại sau'
                    });
                }
            }
            
            return res.status(400).json({
                success: false,
                message: 'Không thể tạo link thanh toán MoMo',
                error: momoResponse.data.message || 'Lỗi không xác định',
                resultCode: momoResponse.data.resultCode
            });
        }

    } catch (error) {
        logPaymentActivity('MoMo', 'create', req.body?.orderId, {
            error: error.message,
            success: false
        });

        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo thanh toán MoMo',
            error: error.message
        });
    }
};

/**
 * Xử lý callback từ MoMo (IPN)
 */
exports.handleMoMoCallback = async (req, res) => {
    try {


        const {
            partnerCode,
            orderId,
            requestId,
            amount,
            orderInfo,
            orderType,
            transId,
            resultCode,
            message,
            payType,
            responseTime,
            extraData,
            signature
        } = req.body;

        // Xác thực signature từ MoMo
        const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

        const expectedSignature = createMoMoSignature(rawSignature, MOMO_CONFIG.secretKey);
        
        if (signature !== expectedSignature) {
            console.error('❌ Signature không hợp lệ từ MoMo callback:', {
                orderId,
                received: signature,
                expected: expectedSignature,
                rawSignature
            });
            return res.status(400).json({
                success: false,
                message: 'Signature không hợp lệ'
            });
        }



        // Tìm order trong database
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            console.error('❌ Không tìm thấy order:', orderId);
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }



        // Cập nhật trạng thái thanh toán - kiểm tra cả số và chuỗi
        if (resultCode === 0 || resultCode === '0') {
            // Thanh toán thành công - để status='pending' chờ admin duyệt thủ công
            const updatedOrder = await Order.findOneAndUpdate(
                { orderId: orderId },
                {
                    paymentStatus: 'completed',
                    // Giữ status='pending' để admin có thể duyệt thủ công
                    momoTransId: transId,
                    momoResponseTime: responseTime,
                    paidAt: new Date(),
                    updatedBy: 'MoMo System'
                },
                { new: true }
            );

            if (!updatedOrder) {
                console.error(`❌ Failed to update MoMo order ${orderId}`);
            }

            // Trừ stock cho các tour detail khi thanh toán thành công (chỉ nếu chưa trừ)
            if (updatedOrder && updatedOrder.items && updatedOrder.items.length > 0 && !updatedOrder.stockDeducted) {
                const stockResult = await deductStock(updatedOrder.items, 'momo callback');
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

                // Gửi email thông báo booking cho staff
                const bookingNotificationService = require('../services/bookingNotificationService');
                const bookingData = await bookingNotificationService.prepareBookingData(updatedOrder);
                await bookingNotificationService.sendStaffEmailNotification(bookingData);
            } catch (emailError) {
                console.error(`❌ Lỗi gửi email thanh toán MoMo thành công cho đơn ${orderId}:`, emailError.message);
            }
            
        } else {
            // Thanh toán thất bại - chỉ cập nhật paymentStatus, giữ status='pending' để cho phép thanh toán lại
            const failedOrder = await Order.findOneAndUpdate(
                { orderId: orderId },
                {
                    paymentStatus: 'failed',
                    // Không thay đổi status, để 'pending' cho khách hàng có thể thanh toán lại
                    momoTransId: transId,
                    momoResponseTime: responseTime,
                    momoFailureReason: message,
                    $inc: { paymentFailCount: 1 }, // Tăng số lần thất bại
                    updatedBy: 'MoMo System'
                },
                { new: true }
            );

            if (failedOrder) {
                // Auto-cancel nếu thất bại quá 3 lần
                if (failedOrder.paymentFailCount >= 3) {
                    await Order.findOneAndUpdate(
                        { orderId: orderId },
                        {
                            status: 'cancelled',
                            updatedBy: 'Auto-Cancel System (3+ failures)'
                        }
                    );
                }
            } else {
                console.error(`❌ Failed to update MoMo order ${orderId}`);
            }

            // Gửi email thanh toán thất bại cho khách hàng và thông báo booking cho staff
            try {
                // Gửi email cho khách hàng
                const retryPaymentUrl = `${process.env.FRONTEND_URL}/payment/retry/${orderId}`;
                await paymentEmailService.sendOnlinePaymentFailed(failedOrder, message, retryPaymentUrl);

                // Gửi email thông báo booking cho staff (cả khi thất bại)
                const bookingNotificationService = require('../services/bookingNotificationService');
                const bookingData = await bookingNotificationService.prepareBookingData(failedOrder);
                await bookingNotificationService.sendStaffEmailNotification(bookingData);
            } catch (emailError) {
                console.error(`❌ Lỗi gửi email thanh toán MoMo thất bại cho đơn ${orderId}:`, emailError.message);
            }
        }

        // Trả về response cho MoMo
        return res.status(200).json({
            success: true,
            message: 'Xử lý callback thành công'
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xử lý callback',
            error: error.message
        });
    }
};

/**
 * Xử lý callback thất bại từ frontend khi MoMo không gọi IPN
 */
exports.handleMoMoFailureFromFrontend = async (req, res) => {
    try {
        const { orderId, resultCode, message } = req.body;

        if (!orderId || !resultCode) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin orderId hoặc resultCode'
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

        // Chỉ xử lý nếu order vẫn đang pending payment
        if (order.paymentStatus !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Đơn hàng đã có trạng thái: ${order.paymentStatus}`
            });
        }

        // Cập nhật trạng thái thất bại
        const failedOrder = await Order.findOneAndUpdate(
            { orderId: orderId },
            {
                paymentStatus: 'failed',
                momoFailureReason: message || `Mã lỗi MoMo: ${resultCode}`,
                $inc: { paymentFailCount: 1 },
                updatedBy: 'MoMo Frontend Callback'
            },
            { new: true }
        );

        if (failedOrder) {
            // Auto-cancel nếu thất bại quá 3 lần
            if (failedOrder.paymentFailCount >= 3) {
                await Order.findOneAndUpdate(
                    { orderId: orderId },
                    {
                        status: 'cancelled',
                        updatedBy: 'Auto-Cancel System (3+ failures)'
                    }
                );
            }

            // Gửi email thanh toán thất bại cho khách hàng và thông báo booking cho staff
            try {
                const paymentEmailService = require('../services/paymentEmailService');

                // Gửi email cho khách hàng
                const retryPaymentUrl = `${process.env.FRONTEND_URL}/payment/retry/${orderId}`;
                const failureReason = message || `Mã lỗi MoMo: ${resultCode}`;
                await paymentEmailService.sendOnlinePaymentFailed(failedOrder, failureReason, retryPaymentUrl);

                // Gửi email thông báo booking cho staff
                const bookingNotificationService = require('../services/bookingNotificationService');
                const bookingData = await bookingNotificationService.prepareBookingData(failedOrder);
                await bookingNotificationService.sendStaffEmailNotification(bookingData);
            } catch (emailError) {
                // Log error but don't fail the request
            }

            return res.status(200).json({
                success: true,
                message: 'Đã xử lý thanh toán thất bại và gửi email thông báo',
                data: {
                    orderId: failedOrder.orderId,
                    paymentStatus: failedOrder.paymentStatus,
                    paymentFailCount: failedOrder.paymentFailCount
                }
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Không thể cập nhật trạng thái đơn hàng'
            });
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xử lý thanh toán thất bại',
            error: error.message
        });
    }
};

/**
 * Kiểm tra trạng thái thanh toán từ MoMo
 */
exports.checkMoMoPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

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

        // Nếu đã có requestId từ MoMo, kiểm tra trạng thái
        if (order.momoRequestId) {
            const requestId = order.momoRequestId;
            
            // Tạo signature cho query status
            const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&orderId=${orderId}&partnerCode=${MOMO_CONFIG.partnerCode}&requestId=${requestId}`;
            const signature = createMoMoSignature(rawSignature, MOMO_CONFIG.secretKey);

            const requestBody = {
                partnerCode: MOMO_CONFIG.partnerCode,
                requestId: requestId,
                orderId: orderId,
                signature: signature,
                lang: MOMO_CONFIG.lang
            };

            // Gọi API query status của MoMo
            const momoResponse = await axios.post(MOMO_CONFIG.queryEndpoint, requestBody, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Cập nhật trạng thái nếu cần
            let finalOrder = order;
            if (momoResponse.data.resultCode === 0 && order.paymentStatus !== 'completed') {
                const updatedOrder = await Order.findOneAndUpdate(
                    { orderId: orderId },
                    {
                        paymentStatus: 'completed',
                        // Giữ status='pending' để admin có thể duyệt thủ công
                        momoTransId: momoResponse.data.transId,
                        paidAt: new Date(),
                        updatedBy: 'MoMo Query System'
                    },
                    { new: true } // Trả về document sau khi update
                );

                finalOrder = updatedOrder;

                // Trừ stock cho các tour detail khi thanh toán thành công (nếu chưa trừ)
                if (updatedOrder && updatedOrder.items && updatedOrder.items.length > 0 && !updatedOrder.stockDeducted) {
                    const stockResult = await deductStock(updatedOrder.items, 'momo query status');
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

                    // Gửi email thông báo booking cho staff
                    const bookingNotificationService = require('../services/bookingNotificationService');
                    const bookingData = await bookingNotificationService.prepareBookingData(updatedOrder);
                    await bookingNotificationService.sendStaffEmailNotification(bookingData);
                } catch (emailError) {
                    console.error(`❌ Lỗi gửi email thanh toán MoMo thành công qua query cho đơn ${orderId}:`, emailError.message);
                }
            }

            return res.status(200).json({
                success: true,
                data: {
                    orderId: orderId,
                    paymentStatus: finalOrder.paymentStatus,
                    momoStatus: momoResponse.data.resultCode === 0 ? 'completed' : 'pending',
                    momoResultCode: momoResponse.data.resultCode,
                    momoMessage: momoResponse.data.message,
                    momoTransId: momoResponse.data.transId || finalOrder.momoTransId,
                    // Thông tin đơn hàng chi tiết
                    customer: finalOrder.customer,
                    email: finalOrder.email,
                    phone: finalOrder.phone,
                    totalAmount: finalOrder.totalAmount,
                    status: finalOrder.status,
                    createdAt: finalOrder.createdAt,
                    paidAt: finalOrder.paidAt,
                    paymentMethod: finalOrder.paymentMethod,
                    tourName: finalOrder.tourName,
                    departure: finalOrder.departure,
                    destination: finalOrder.destination,
                    startDate: finalOrder.startDate,
                    endDate: finalOrder.endDate,
                    adults: finalOrder.adults,
                    children: finalOrder.children,
                    infants: finalOrder.infants,
                    items: finalOrder.items // Thêm thông tin items chứa tourId
                }
            });
        }

        // Nếu chưa có thông tin MoMo, trả về trạng thái hiện tại
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
                items: order.items // Thêm thông tin items chứa tourId
            }
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi kiểm tra trạng thái thanh toán',
            error: error.message
        });
    }
};

/**
 * Endpoint backup để cập nhật trạng thái thanh toán khi callback không hoạt động
 */
exports.forceUpdatePaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, failureReason } = req.body;



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
            // Cập nhật trạng thái thất bại - giữ status='pending' để cho phép thanh toán lại
            updatedOrder = await Order.findOneAndUpdate(
                { orderId: orderId },
                {
                    paymentStatus: 'failed',
                    // Không thay đổi status, để 'pending' cho khách hàng có thể thanh toán lại
                    momoFailureReason: failureReason || 'Thanh toán thất bại (force update)',
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

            } catch (emailError) {
                console.error(`❌ Lỗi gửi email force update thất bại cho đơn ${orderId}:`, emailError.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái thanh toán thành công',
            data: {
                orderId: orderId,
                oldStatus: order.paymentStatus,
                newStatus: updatedOrder?.paymentStatus || 'unchanged',
                orderStatus: updatedOrder?.status || order.status
            }
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái thanh toán',
            error: error.message
        });
    }
};






