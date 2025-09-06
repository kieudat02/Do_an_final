const crypto = require('crypto');
const moment = require('moment');
const qs = require('qs');

/**
 * Tạo signature cho request MoMo
 * @param {string} rawSignature - Chuỗi raw signature
 * @param {string} secretKey - Secret key của MoMo
 * @returns {string} Signature đã được mã hóa
 */
const createMoMoSignature = (rawSignature, secretKey) => {
    return crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
};

/**
 * Sắp xếp object theo key và tạo query string cho VNPay
 * @param {Object} obj - Object cần sắp xếp
 * @returns {Object} Object đã được sắp xếp
 */
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

/**
 * Tạo secure hash cho VNPay
 * @param {Object} params - Tham số cần tạo signature
 * @param {string} secretKey - Secret key của VNPay
 * @returns {string} Signature đã được mã hóa
 */
const createVNPaySignature = (params, secretKey) => {
    const sortedParams = sortObject(params);
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    return signed;
};

/**
 * Validate amount - kiểm tra số tiền hợp lệ
 * @param {number} amount - Số tiền cần kiểm tra
 * @returns {Object} Kết quả validation
 */
const validateAmount = (amount) => {
    if (!amount || isNaN(amount)) {
        return {
            isValid: false,
            message: 'Số tiền không hợp lệ'
        };
    }

    const numAmount = Number(amount);
    if (numAmount <= 0) {
        return {
            isValid: false,
            message: 'Số tiền phải lớn hơn 0'
        };
    }

    if (numAmount > 999999999) {
        return {
            isValid: false,
            message: 'Số tiền quá lớn'
        };
    }

    return {
        isValid: true,
        amount: numAmount
    };
};

/**
 * Format date cho các cổng thanh toán
 * @param {Date} date - Ngày cần format (optional, mặc định là hiện tại)
 * @param {string} format - Format pattern (optional, mặc định là 'YYYYMMDDHHmmss')
 * @returns {string} Ngày đã được format
 */
const formatPaymentDate = (date = new Date(), format = 'YYYYMMDDHHmmss') => {
    return moment(date).format(format);
};

/**
 * Tạo orderId unique với timestamp
 * @param {string} prefix - Prefix cho orderId (optional, mặc định là 'ORD')
 * @returns {string} OrderId unique
 */
const generateUniqueOrderId = (prefix = 'ORD') => {
    const now = new Date();
    const year = now.getFullYear().toString().substr(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `${prefix}${year}${month}${day}${timestamp}`;
};

/**
 * Lấy IP address từ request
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '127.0.0.1';
};

/**
 * Validate orderId format
 * @param {string} orderId - OrderId cần kiểm tra
 * @returns {Object} Kết quả validation
 */
const validateOrderId = (orderId) => {
    if (!orderId || typeof orderId !== 'string') {
        return {
            isValid: false,
            message: 'OrderId không hợp lệ'
        };
    }

    if (orderId.trim().length === 0) {
        return {
            isValid: false,
            message: 'OrderId không được để trống'
        };
    }

    // Kiểm tra format cơ bản (có thể tùy chỉnh theo yêu cầu)
    const orderIdPattern = /^[A-Z0-9_-]+$/i;
    if (!orderIdPattern.test(orderId)) {
        return {
            isValid: false,
            message: 'OrderId chỉ được chứa chữ cái, số, dấu gạch dưới và dấu gạch ngang'
        };
    }

    return {
        isValid: true,
        orderId: orderId.trim()
    };
};

/**
 * Tạo transaction reference cho VNPay
 * @param {string} orderId - OrderId gốc
 * @param {string} createDate - Ngày tạo (optional)
 * @returns {string} Transaction reference
 */
const generateVNPayTxnRef = (orderId, createDate = null) => {
    const date = createDate || formatPaymentDate();
    return `${orderId}_${date}`;
};

/**
 * Parse VNPay transaction reference để lấy orderId
 * @param {string} txnRef - Transaction reference từ VNPay
 * @returns {string|null} OrderId hoặc null nếu không parse được
 */
const parseVNPayTxnRef = (txnRef) => {
    if (!txnRef || typeof txnRef !== 'string') {
        return null;
    }
    
    const parts = txnRef.split('_');
    return parts.length > 0 ? parts[0] : null;
};

/**
 * Tạo request ID cho MoMo
 * @param {string} orderId - OrderId
 * @returns {string} Request ID unique
 */
const generateMoMoRequestId = (orderId) => {
    return `${orderId}-${Date.now()}`;
};

/**
 * Log payment activity
 * @param {string} gateway - Tên cổng thanh toán (MoMo/VNPay)
 * @param {string} action - Hành động (create/callback/query)
 * @param {string} orderId - OrderId
 * @param {Object} data - Dữ liệu bổ sung
 */
const logPaymentActivity = (gateway, action, orderId, data = {}) => {
    const logData = {
        timestamp: new Date().toISOString(),
        gateway,
        action,
        orderId,
        ...data
    };
    
    console.log(`[${gateway.toUpperCase()} ${action.toUpperCase()}]`, logData);
};

module.exports = {
    // Signature functions
    createMoMoSignature,
    createVNPaySignature,
    sortObject,
    
    // Validation functions
    validateAmount,
    validateOrderId,
    
    // Date/Time functions
    formatPaymentDate,
    
    // ID generation functions
    generateUniqueOrderId,
    generateVNPayTxnRef,
    generateMoMoRequestId,
    
    // Utility functions
    getClientIP,
    parseVNPayTxnRef,
    logPaymentActivity
};
