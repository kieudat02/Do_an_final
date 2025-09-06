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

// Cấu hình MoMo
const MOMO_CONFIG = {
    accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
    secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    orderInfo: 'Thanh toán tour du lịch',
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
    redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:5173/payment/success',
    ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:3000/api/momo/callback',
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
        const momoResponse = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', requestBody, {
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
            console.error('❌ Lỗi từ MoMo:', momoResponse.data);

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
                    const retryResponse = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', newRequestBody, {
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
                        console.error('❌ Lỗi retry MoMo:', retryResponse.data);
                        return res.status(400).json({
                            success: false,
                            message: 'Không thể tạo link thanh toán MoMo sau khi retry',
                            error: retryResponse.data.message || 'Lỗi không xác định'
                        });
                    }
                } catch (retryError) {
                    console.error('❌ Lỗi khi retry MoMo:', retryError);
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
        console.error('❌ Lỗi khi tạo thanh toán MoMo:', error);
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
            console.error('❌ Signature không hợp lệ từ MoMo callback');
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

        // Cập nhật trạng thái thanh toán
        if (resultCode === 0) {
            // Thanh toán thành công
            const updatedOrder = await Order.findOneAndUpdate(
                { orderId: orderId },
                { 
                    paymentStatus: 'completed',
                    status: 'confirmed',
                    momoTransId: transId,
                    momoResponseTime: responseTime,
                    paidAt: new Date(),
                    updatedBy: 'MoMo System'
                },
                { new: true } 
            );

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

            // Gửi email thanh toán thành công
            try {
                await paymentEmailService.sendOnlinePaymentSuccess(updatedOrder);
                console.log(`✅ Đã gửi email thanh toán thành công cho đơn ${orderId}`);
            } catch (emailError) {
                console.error(`❌ Lỗi gửi email thanh toán thành công cho đơn ${orderId}:`, emailError.message);
            }
            
        } else {
            // Thanh toán thất bại
            const failedOrder = await Order.findOneAndUpdate(
                { orderId: orderId },
                {
                    paymentStatus: 'failed',
                    momoTransId: transId,
                    momoResponseTime: responseTime,
                    momoFailureReason: message,
                    updatedBy: 'MoMo System'
                },
                { new: true }
            );

            // Gửi email thanh toán thất bại với link thanh toán lại
            try {
                const retryPaymentUrl = `${process.env.FRONTEND_URL}/payment/retry/${orderId}`;
                await paymentEmailService.sendOnlinePaymentFailed(failedOrder, message, retryPaymentUrl);
                console.log(`✅ Đã gửi email thanh toán thất bại cho đơn ${orderId}`);
            } catch (emailError) {
                console.error(`❌ Lỗi gửi email thanh toán thất bại cho đơn ${orderId}:`, emailError.message);
            }
        }

        // Trả về response cho MoMo
        return res.status(200).json({
            success: true,
            message: 'Xử lý callback thành công'
        });

    } catch (error) {
        console.error('❌ Lỗi khi xử lý MoMo callback:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xử lý callback',
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
            const momoResponse = await axios.post('https://test-payment.momo.vn/v2/gateway/api/query', requestBody, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Cập nhật trạng thái nếu cần
            if (momoResponse.data.resultCode === 0 && order.paymentStatus !== 'completed') {
                const updatedOrder = await Order.findOneAndUpdate(
                    { orderId: orderId },
                    { 
                        paymentStatus: 'completed',
                        status: 'confirmed',
                        momoTransId: momoResponse.data.transId,
                        paidAt: new Date(),
                        updatedBy: 'MoMo Query System'
                    },
                    { new: true } // Trả về document sau khi update
                );

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
            }

            return res.status(200).json({
                success: true,
                data: {
                    orderId: orderId,
                    paymentStatus: order.paymentStatus,
                    momoStatus: momoResponse.data.resultCode === 0 ? 'completed' : 'pending',
                    momoResultCode: momoResponse.data.resultCode,
                    momoMessage: momoResponse.data.message,
                    momoTransId: momoResponse.data.transId || order.momoTransId,
                    // Thông tin đơn hàng chi tiết
                    customer: order.customer,
                    email: order.email,
                    phone: order.phone,
                    totalAmount: order.totalAmount,
                    status: order.status,
                    createdAt: order.createdAt,
                    paidAt: order.paidAt,
                    paymentMethod: order.paymentMethod,
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
        console.error('❌ Lỗi khi kiểm tra trạng thái thanh toán:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi kiểm tra trạng thái thanh toán',
            error: error.message
        });
    }
};






