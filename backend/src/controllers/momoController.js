const crypto = require('crypto');
const axios = require('axios');
const Order = require('../models/orderModel');
const { deductStock } = require('../utils/stockManager');
const moment = require('moment');
const qs = require('qs');
const paymentEmailService = require('../services/paymentEmailService');

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

// Cấu hình VNPay
const VNPAY_CONFIG = {
    tmnCode: process.env.VNPAY_TMN_CODE || '3U8GB91N',
    secretKey: process.env.VNPAY_SECRET_KEY || 'MS4MYBZDMPKPX3VSVW0KZYSR72H2N8VQ',
    url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:5173/payment/vnpay-return',
    api: {
        querydr: process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'
    }
};

// Tạo signature cho request MoMo
const createSignature = (rawSignature, secretKey) => {
    return crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
};

// Sắp xếp object theo key và tạo query string cho VNPay
const sortObject = (obj) => {
    const sorted = {};
    const str = [];
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (let key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
};

// Tạo secure hash cho VNPay
const createVNPaySignature = (params, secretKey) => {
    const sortedParams = sortObject(params);
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    return signed;
};

/**
 * Tạo link thanh toán MoMo
 */
exports.createMoMoPayment = async (req, res) => {
    try {
        const { orderId, amount, orderInfo } = req.body;

        // Kiểm tra đầu vào
        if (!orderId || !amount) {
            console.error('❌ Thiếu thông tin orderId hoặc amount');
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin orderId hoặc amount'
            });
        }

        // Kiểm tra order có tồn tại không
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            console.error('❌ Không tìm thấy order:', orderId);
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Tạo requestId unique
        const requestId = orderId + '-' + Date.now();
        
        // Tạo redirectUrl với orderId
        const redirectUrlWithOrderId = `${MOMO_CONFIG.redirectUrl}?orderId=${orderId}`;
        
        // Tạo raw signature string theo yêu cầu của MoMo
        const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=${MOMO_CONFIG.extraData}&ipnUrl=${MOMO_CONFIG.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo || MOMO_CONFIG.orderInfo}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${redirectUrlWithOrderId}&requestId=${requestId}&requestType=${MOMO_CONFIG.requestType}`;
        
        // Tạo signature
        const signature = createSignature(rawSignature, MOMO_CONFIG.secretKey);

        // Dữ liệu gửi tới MoMo
        const requestBody = {
            partnerCode: MOMO_CONFIG.partnerCode,
            partnerName: "Tour Du Lịch",
            storeId: "MomoTestStore",
            requestId: requestId,
            amount: amount,
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
            console.error('❌ Lỗi từ MoMo:', momoResponse.data);
            
            // Xử lý trường hợp orderId trùng (resultCode 41)
            if (momoResponse.data.resultCode === 41) {
                
                try {
                    // Tạo orderId mới với timestamp để đảm bảo unique
                    const now = new Date();
                    const year = now.getFullYear().toString().substr(-2);
                    const month = (now.getMonth() + 1).toString().padStart(2, '0');
                    const day = now.getDate().toString().padStart(2, '0');
                    const timestamp = now.getTime().toString().slice(-6);
                    const newOrderId = `ORD${year}${month}${day}${timestamp}`;
                    
                    // Cập nhật order với orderId mới
                    await Order.findOneAndUpdate(
                        { orderId: orderId },
                        { orderId: newOrderId }
                    );
                    
                    // Tạo redirectUrl với orderId mới
                    const newRedirectUrlWithOrderId = `${MOMO_CONFIG.redirectUrl}?orderId=${newOrderId}`;
                    
                    // Tạo lại signature với orderId mới
                    const newRawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=${MOMO_CONFIG.extraData}&ipnUrl=${MOMO_CONFIG.ipnUrl}&orderId=${newOrderId}&orderInfo=${orderInfo || MOMO_CONFIG.orderInfo}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${newRedirectUrlWithOrderId}&requestId=${requestId}&requestType=${MOMO_CONFIG.requestType}`;
                    const newSignature = crypto.createHmac('sha256', MOMO_CONFIG.secretKey).update(newRawSignature).digest('hex');
                    
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
        
        const expectedSignature = createSignature(rawSignature, MOMO_CONFIG.secretKey);
        
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
            const signature = createSignature(rawSignature, MOMO_CONFIG.secretKey);

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

/**
 * Tạo link thanh toán VNPay
 */
exports.createVNPayPayment = async (req, res) => {
    try {
        const { orderId, amount, orderInfo, bankCode } = req.body;

        // Kiểm tra đầu vào
        if (!orderId || !amount) {
            console.error('❌ Thiếu thông tin orderId hoặc amount');
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin orderId hoặc amount'
            });
        }

        // Kiểm tra order có tồn tại không
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            console.error('❌ Không tìm thấy order:', orderId);
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Lấy IP địa chỉ của client
        const ipAddr = req.headers['x-forwarded-for'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress ||
                      (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                      '127.0.0.1';

        // Tạo transaction reference với timestamp để đảm bảo unique
        const createDate = moment().format('YYYYMMDDHHmmss');
        const txnRef = orderId + '_' + createDate;

        // Tạo các tham số cho VNPay
        let vnpParams = {
            'vnp_Version': '2.1.0',
            'vnp_Command': 'pay',
            'vnp_TmnCode': VNPAY_CONFIG.tmnCode,
            'vnp_Amount': amount * 100, // VNPay yêu cầu amount * 100
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

        return res.status(200).json({
            success: true,
            message: 'Tạo link thanh toán VNPay thành công',
            data: {
                paymentUrl: paymentUrl,
                orderId: orderId,
                txnRef: txnRef,
                amount: amount
            }
        });

    } catch (error) {
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
            const orderId = vnpParams['vnp_TxnRef'].split('_')[0]; // Lấy orderId từ txnRef
            const responseCode = vnpParams['vnp_ResponseCode'];

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
            if (responseCode === '00') {
                // Thanh toán thành công
                const updatedOrder = await Order.findOneAndUpdate(
                    { orderId: orderId },
                    { 
                        paymentStatus: 'completed',
                        status: 'confirmed',
                        vnpayTransactionNo: vnpParams['vnp_TransactionNo'],
                        vnpayBankCode: vnpParams['vnp_BankCode'],
                        vnpayPayDate: vnpParams['vnp_PayDate'],
                        paidAt: new Date(),
                        updatedBy: 'VNPay Return System'
                    },
                    { new: true } 
                );

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

                // Gửi email thanh toán thành công
                try {
                    await paymentEmailService.sendOnlinePaymentSuccess(updatedOrder);
                    console.log(`✅ Đã gửi email thanh toán VNPay thành công cho đơn ${orderId}`);
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
                // Thanh toán thất bại
                const failedOrder = await Order.findOneAndUpdate(
                    { orderId: orderId },
                    {
                        paymentStatus: 'failed',
                        vnpayTransactionNo: vnpParams['vnp_TransactionNo'],
                        vnpayBankCode: vnpParams['vnp_BankCode'],
                        vnpayFailureReason: `Mã lỗi VNPay: ${responseCode}`,
                        updatedBy: 'VNPay Return System'
                    },
                    { new: true }
                );

                // Gửi email thanh toán thất bại với link thanh toán lại
                try {
                    const retryPaymentUrl = `${process.env.FRONTEND_URL}/payment/retry/${orderId}`;
                    const failureReason = `Mã lỗi VNPay: ${responseCode}`;
                    await paymentEmailService.sendOnlinePaymentFailed(failedOrder, failureReason, retryPaymentUrl);
                    console.log(`✅ Đã gửi email thanh toán VNPay thất bại cho đơn ${orderId}`);
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
        console.error('❌ Lỗi khi kiểm tra trạng thái thanh toán VNPay:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi kiểm tra trạng thái thanh toán VNPay',
            error: error.message
        });
    }
};
