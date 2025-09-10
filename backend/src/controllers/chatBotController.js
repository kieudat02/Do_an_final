const {
    askGemini,
    createNewSession,
    invalidateCache,
    getCacheStatus
} = require('../services/geminiService');

const TourDataService = require('../services/tourDataService');
const Order = require('../models/orderModel');
const otpController = require('./otpController');
const emailOtpController = require('./emailOtpController');

/**
 * Gửi OTP cho tra cứu đơn hàng thông qua chatbot
 */
exports.sendOTPForOrderLookup = async (req, res) => {
    try {
        const { orderId, contact } = req.body; // contact có thể là email hoặc phone

        // Validate input
        if (!orderId || !contact) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng cung cấp mã đơn hàng và thông tin liên hệ'
            });
        }

        // Tìm đơn hàng để xác thực
        const order = await Order.findOne({ 
            orderId: orderId.trim(),
            $or: [
                { phone: contact.trim() },
                { email: contact.trim() }
            ]
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy đơn hàng với thông tin đã cung cấp'
            });
        }

        // Xác định loại contact và gửi OTP tương ứng
        const isEmail = contact.includes('@');
        
        if (isEmail) {
            // Gửi OTP qua email
            req.body.email = contact;
            await emailOtpController.sendOTP(req, res);
        } else {
            // Gửi OTP qua SMS
            req.body.phone = contact;
            await otpController.sendOTP(req, res);
        }

    } catch (error) {
        console.error('Send OTP for Order Lookup Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi gửi mã OTP'
        });
    }
};

/**
 * Tra cứu đơn hàng với xác thực OTP thông qua chatbot
 */
exports.lookupOrderWithOTP = async (req, res) => {
    try {
        const { orderId, contact, otpCode } = req.body;

        // Validate input
        if (!orderId || !contact || !otpCode) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng cung cấp đầy đủ thông tin: mã đơn hàng, thông tin liên hệ và mã OTP'
            });
        }

        // Xác định loại contact và verify OTP tương ứng
        const isEmail = contact.includes('@');
        
        // Verify OTP
        let otpVerified = false;
        let verifyError = null;
        
        if (isEmail) {
            // Verify email OTP
            const emailOtpModel = require('../models/emailOtpModel');
            
            try {
                const emailOtpRecord = await emailOtpModel.findOne({
                    email: contact,
                    code: otpCode,
                    isUsed: false
                });

                if (emailOtpRecord) {
                    // Check if OTP is not expired (5 minutes)
                    const now = new Date();
                    const otpAge = (now - emailOtpRecord.createdAt) / 1000; // seconds
                    
                    if (otpAge <= 300) { // 5 minutes
                        // Mark OTP as used
                        await emailOtpModel.findByIdAndUpdate(emailOtpRecord._id, { isUsed: true });
                        otpVerified = true;
                    } else {
                        verifyError = 'Mã OTP đã hết hạn';
                    }
                } else {
                    verifyError = 'Mã OTP không chính xác';
                }
            } catch (error) {
                console.error('Error verifying email OTP:', error);
                verifyError = 'Lỗi xác thực mã OTP';
            }
        } else {
            // Verify phone OTP
            const otpModel = require('../models/otpModel');
            
            try {
                const phoneOtpRecord = await otpModel.findOne({
                    phone: contact,
                    code: otpCode,
                    isUsed: false
                });

                if (phoneOtpRecord) {
                    // Check if OTP is not expired (5 minutes)
                    const now = new Date();
                    const otpAge = (now - phoneOtpRecord.createdAt) / 1000; // seconds
                    
                    if (otpAge <= 300) { // 5 minutes
                        // Mark OTP as used
                        await otpModel.findByIdAndUpdate(phoneOtpRecord._id, { isUsed: true });
                        otpVerified = true;
                    } else {
                        verifyError = 'Mã OTP đã hết hạn';
                    }
                } else {
                    verifyError = 'Mã OTP không chính xác';
                }
            } catch (error) {
                console.error('Error verifying phone OTP:', error);
                verifyError = 'Lỗi xác thực mã OTP';
            }
        }

        if (!otpVerified) {
            return res.status(400).json({
                success: false,
                error: verifyError || 'Mã OTP không chính xác hoặc đã hết hạn'
            });
        }

        // Tìm và trả về thông tin đơn hàng sau khi verify OTP thành công
        const order = await Order.findOne({ 
            orderId: orderId.trim(),
            $or: [
                { phone: contact.trim() },
                { email: contact.trim() }
            ]
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy đơn hàng với thông tin đã cung cấp'
            });
        }

        // Trả về thông tin đơn hàng (loại bỏ thông tin nhạy cảm)
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

        return res.status(200).json({
            success: true,
            data: orderInfo
        });

    } catch (error) {
        console.error('Lookup Order with OTP Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi tra cứu đơn hàng'
        });
    }
};

/**
 * Tra cứu đơn hàng thông qua chatbot (không có OTP - chỉ để kiểm tra tồn tại)
 */
exports.lookupOrder = async (req, res) => {
    try {
        const { orderId, phone, email } = req.body;

        // Validate input
        if (!orderId || (!phone && !email)) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng cung cấp mã đơn hàng và số điện thoại hoặc email'
            });
        }

        // Tạo query tìm kiếm theo orderId và phone hoặc email
        let searchQuery = { orderId: orderId.trim() };
        
        if (phone && email) {
            // Nếu có cả phone và email, tìm theo cả hai
            searchQuery.$or = [
                { phone: phone.trim() },
                { email: email.trim() }
            ];
        } else if (phone) {
            // Chỉ có phone
            searchQuery.phone = phone.trim();
        } else if (email) {
            // Chỉ có email
            searchQuery.email = email.trim();
        }

        // Tìm đơn hàng theo query
        const order = await Order.findOne(searchQuery);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy đơn hàng với thông tin đã cung cấp'
            });
        }

        // Trả về thông tin đơn hàng (loại bỏ thông tin nhạy cảm)
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

        return res.status(200).json({
            success: true,
            data: orderInfo
        });

    } catch (error) {
        console.error('Lookup Order Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi tra cứu đơn hàng'
        });
    }
};

/**
 * Lấy link thanh toán lại cho đơn hàng thất bại
 */
exports.getRetryPaymentLink = async (req, res) => {
    try {
        const { orderId, phone, email } = req.body;

        // Validate input
        if (!orderId || (!phone && !email)) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng cung cấp mã đơn hàng và số điện thoại hoặc email'
            });
        }

        // Tạo query tìm kiếm theo orderId và phone hoặc email
        let searchQuery = { orderId: orderId.trim() };
        
        if (phone && email) {
            // Nếu có cả phone và email, tìm theo cả hai
            searchQuery.$or = [
                { phone: phone.trim() },
                { email: email.trim() }
            ];
        } else if (phone) {
            // Chỉ có phone
            searchQuery.phone = phone.trim();
        } else if (email) {
            // Chỉ có email
            searchQuery.email = email.trim();
        }

        // Tìm đơn hàng
        const order = await Order.findOne(searchQuery);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy đơn hàng với thông tin đã cung cấp'
            });
        }

        // Kiểm tra điều kiện thanh toán lại
        if (!['MoMo', 'VNPay'].includes(order.paymentMethod)) {
            return res.status(400).json({
                success: false,
                error: 'Đơn hàng này không hỗ trợ thanh toán trực tuyến'
            });
        }

        if (order.paymentStatus === 'completed') {
            return res.status(400).json({
                success: false,
                error: 'Đơn hàng đã được thanh toán thành công'
            });
        }

        if (order.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                error: 'Đơn hàng đã bị hủy, không thể thanh toán'
            });
        }

        // Tạo link thanh toán lại
        const retryPaymentLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/retry-payment/${order.orderId}`;

        return res.status(200).json({
            success: true,
            data: {
                orderId: order.orderId,
                paymentMethod: order.paymentMethod,
                totalAmount: order.totalAmount,
                retryPaymentLink: retryPaymentLink,
                message: 'Link thanh toán lại đã được tạo thành công'
            }
        });

    } catch (error) {
        console.error('Get Retry Payment Link Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi tạo link thanh toán'
        });
    }
};

/**
 * Kiểm tra trạng thái thanh toán đơn hàng
 */
exports.checkPaymentStatus = async (req, res) => {
    try {
        const { orderId, phone, email } = req.body;

        // Validate input
        if (!orderId || (!phone && !email)) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng cung cấp mã đơn hàng và số điện thoại hoặc email'
            });
        }

        // Tạo query tìm kiếm theo orderId và phone hoặc email
        let searchQuery = { orderId: orderId.trim() };
        
        if (phone && email) {
            // Nếu có cả phone và email, tìm theo cả hai
            searchQuery.$or = [
                { phone: phone.trim() },
                { email: email.trim() }
            ];
        } else if (phone) {
            // Chỉ có phone
            searchQuery.phone = phone.trim();
        } else if (email) {
            // Chỉ có email
            searchQuery.email = email.trim();
        }

        // Tìm đơn hàng
        const order = await Order.findOne(searchQuery);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy đơn hàng với thông tin đã cung cấp'
            });
        }

        const paymentInfo = {
            orderId: order.orderId,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            totalAmount: order.totalAmount,
            paidAt: order.paidAt,
            status: order.status,
            canRetryPayment: ['MoMo', 'VNPay'].includes(order.paymentMethod) && 
                            order.paymentStatus !== 'completed' && 
                            order.status !== 'cancelled'
        };

        return res.status(200).json({
            success: true,
            data: paymentInfo
        });

    } catch (error) {
        console.error('Check Payment Status Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi kiểm tra trạng thái thanh toán'
        });
    }
};

/**
 * Gửi tin nhắn đến chatbot
 */
exports.sendMessage = async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        // Validate input
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Tin nhắn không được để trống'
            });
        }

        // Kiểm tra độ dài tin nhắn
        if (message.trim().length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Tin nhắn quá dài. Vui lòng nhập tối đa 1000 ký tự.'
            });
        }

        // Gửi tin nhắn đến Gemini AI
        const result = await askGemini(message.trim(), sessionId);

        if (result.success) {
            return res.status(200).json({
                success: true,
                data: {
                    reply: result.reply,
                    sessionId: result.sessionId,
                    timestamp: result.timestamp
                }
            });
        } else {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('ChatBot Controller Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi xử lý tin nhắn. Vui lòng thử lại sau.'
        });
    }
};





/**
 * Tạo session hội thoại mới
 */
exports.createSession = async (req, res) => {
    try {
        const result = await createNewSession();

        return res.status(201).json({
            success: true,
            data: {
                sessionId: result.sessionId,
                message: result.message
            }
        });

    } catch (error) {
        console.error('Create Session Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể tạo phiên hội thoại mới'
        });
    }
};

/**
 * Tìm kiếm tour theo từ khóa
 */
exports.searchTours = async (req, res) => {
    try {
        const { keyword } = req.query;

        if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Từ khóa tìm kiếm không được để trống'
            });
        }

        if (keyword.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự'
            });
        }

        const tours = await TourDataService.searchTours(keyword.trim());

        return res.status(200).json({
            success: true,
            data: {
                keyword: keyword.trim(),
                totalResults: tours.length,
                tours: tours
            }
        });

    } catch (error) {
        console.error('Search Tours Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi tìm kiếm tour'
        });
    }
};

/**
 * Lấy tours theo khoảng giá
 */
exports.getToursByPriceRange = async (req, res) => {
    try {
        const { minPrice, maxPrice } = req.query;

        const min = parseInt(minPrice) || 0;
        const max = parseInt(maxPrice) || 999999999;

        if (min < 0 || max < 0) {
            return res.status(400).json({
                success: false,
                error: 'Giá không được âm'
            });
        }

        if (min > max) {
            return res.status(400).json({
                success: false,
                error: 'Giá tối thiểu không được lớn hơn giá tối đa'
            });
        }

        const tours = await TourDataService.getToursByPriceRange(min, max);

        return res.status(200).json({
            success: true,
            data: {
                priceRange: { minPrice: min, maxPrice: max },
                totalResults: tours.length,
                tours: tours
            }
        });

    } catch (error) {
        console.error('Get Tours By Price Range Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi lấy tour theo giá'
        });
    }
};

/**
 * Lấy thông tin context cho chatbot
 */
exports.getChatbotContext = async (req, res) => {
    try {
        const context = await TourDataService.getChatbotContext();

        return res.status(200).json({
            success: true,
            data: context
        });

    } catch (error) {
        console.error('Get Chatbot Context Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể lấy thông tin context'
        });
    }
};

/**
 * Lấy chi tiết tour
 */
exports.getTourDetails = async (req, res) => {
    try {
        const { tourId } = req.params;

        if (!tourId) {
            return res.status(400).json({
                success: false,
                error: 'ID tour không hợp lệ'
            });
        }

        const tour = await TourDataService.getTourDetails(tourId);

        if (!tour) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy tour'
            });
        }

        return res.status(200).json({
            success: true,
            data: tour
        });

    } catch (error) {
        console.error('Get Tour Details Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể lấy thông tin chi tiết tour'
        });
    }
};

/**
 * Kiểm tra trạng thái chatbot
 */
exports.getStatus = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            data: {
                status: 'online',
                message: 'Chatbot đang hoạt động bình thường',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Get Status Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể kiểm tra trạng thái chatbot'
        });
    }
};

/**
 * Invalidate cache - force refresh data
 */
exports.invalidateCache = async (req, res) => {
    try {
        invalidateCache();
        return res.status(200).json({
            success: true,
            message: 'Cache đã được xóa thành công'
        });
    } catch (error) {
        console.error('Invalidate Cache Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể xóa cache'
        });
    }
};

/**
 * Get cache status
 */
exports.getCacheStatus = async (req, res) => {
    try {
        const status = getCacheStatus();
        return res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Get Cache Status Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể lấy trạng thái cache'
        });
    }
};

/**
 * Health check endpoint - kiểm tra toàn bộ hệ thống
 */
exports.healthCheck = async (req, res) => {
    try {
        const [cacheStatus, contextData] = await Promise.all([
            Promise.resolve(getCacheStatus()),
            TourDataService.getChatbotContext()
        ]);

        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            cache: cacheStatus,
            database: {
                connected: true,
                totalTours: contextData.statistics.totalTours,
                totalCategories: contextData.statistics.totalCategories,
                totalDestinations: contextData.statistics.totalDestinations,
                dataIntegrity: contextData.dataIntegrity
            },
            services: {
                geminiAI: !!process.env.GEMINI_API_KEY,
                tourDataService: true
            }
        };

        return res.status(200).json({
            success: true,
            data: healthStatus
        });
    } catch (error) {
        console.error('Health Check Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Hệ thống gặp sự cố',
            details: error.message
        });
    }
};

// Backward compatibility - giữ lại method cũ
exports.askBot = exports.sendMessage;