const {
    askGemini,
    createNewSession,
    invalidateCache,
    getCacheStatus
} = require('../services/geminiService');

const TourDataService = require('../services/tourDataService');
const Order = require('../models/orderModel');
const ChatHistory = require('../models/chatHistoryModel');
const otpController = require('./otpController');
const emailOtpController = require('./emailOtpController');

// Import AI Services
const SentimentAnalysisService = require('../services/sentimentAnalysisService');
const IntentClassificationService = require('../services/intentClassificationService');

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
            // Kiểm tra xem đơn hàng có tồn tại không
            const orderExists = await Order.findOne({ orderId: orderId.trim() });

            if (!orderExists) {
                return res.status(404).json({
                    success: false,
                    error: `❌ Không tìm thấy đơn hàng với mã "${orderId}".\n\nVui lòng kiểm tra lại mã đơn hàng và thử lại.`
                });
            } else {
                // Đơn hàng tồn tại nhưng email/số điện thoại không khớp
                const isEmail = contact.includes('@');
                const contactType = isEmail ? 'email' : 'số điện thoại';

                return res.status(404).json({
                    success: false,
                    error: `❌ ${contactType.charAt(0).toUpperCase() + contactType.slice(1)} "${contact}" không khớp với đơn hàng "${orderId}".\n\nVui lòng kiểm tra lại ${contactType} đã dùng khi đặt tour.`
                });
            }
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
        
        // Verify OTP with attempt limit
        let otpVerified = false;
        let verifyError = null;
        const MAX_ATTEMPTS = 5; // Giới hạn 5 lần thử

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
                        verifyError = '⏰ Mã OTP đã hết hạn (quá 5 phút).\n\nVui lòng yêu cầu gửi lại mã OTP mới.';
                    }
                } else {
                    // OTP không đúng - tăng số lần thử
                    const otpRecordForAttempt = await emailOtpModel.findOne({
                        email: contact,
                        isUsed: false
                    }).sort({ createdAt: -1 });

                    if (otpRecordForAttempt) {
                        const attempts = (otpRecordForAttempt.attempts || 0) + 1;

                        if (attempts >= MAX_ATTEMPTS) {
                            // Quá số lần thử - vô hiệu hóa OTP
                            await emailOtpModel.findByIdAndUpdate(otpRecordForAttempt._id, {
                                isUsed: true,
                                attempts: attempts
                            });
                            verifyError = `❌ Bạn đã nhập sai mã OTP quá ${MAX_ATTEMPTS} lần.\n\nMã OTP đã bị khóa. Vui lòng yêu cầu gửi lại mã OTP mới.`;
                        } else {
                            // Cập nhật số lần thử
                            await emailOtpModel.findByIdAndUpdate(otpRecordForAttempt._id, { attempts });
                            verifyError = `❌ Mã OTP không chính xác.\n\n⚠️ Bạn còn ${MAX_ATTEMPTS - attempts} lần thử nữa.`;
                        }
                    } else {
                        verifyError = '❌ Mã OTP không chính xác.\n\nVui lòng kiểm tra lại mã OTP trong email.';
                    }
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
                        verifyError = '⏰ Mã OTP đã hết hạn (quá 5 phút).\n\nVui lòng yêu cầu gửi lại mã OTP mới.';
                    }
                } else {
                    // OTP không đúng - tăng số lần thử
                    const otpRecordForAttempt = await otpModel.findOne({
                        phone: contact,
                        isUsed: false
                    }).sort({ createdAt: -1 });

                    if (otpRecordForAttempt) {
                        const attempts = (otpRecordForAttempt.attempts || 0) + 1;

                        if (attempts >= MAX_ATTEMPTS) {
                            // Quá số lần thử - vô hiệu hóa OTP
                            await otpModel.findByIdAndUpdate(otpRecordForAttempt._id, {
                                isUsed: true,
                                attempts: attempts
                            });
                            verifyError = `❌ Bạn đã nhập sai mã OTP quá ${MAX_ATTEMPTS} lần.\n\nMã OTP đã bị khóa. Vui lòng yêu cầu gửi lại mã OTP mới.`;
                        } else {
                            // Cập nhật số lần thử
                            await otpModel.findByIdAndUpdate(otpRecordForAttempt._id, { attempts });
                            verifyError = `❌ Mã OTP không chính xác.\n\n⚠️ Bạn còn ${MAX_ATTEMPTS - attempts} lần thử nữa.`;
                        }
                    } else {
                        verifyError = '❌ Mã OTP không chính xác.\n\nVui lòng kiểm tra lại mã OTP trong tin nhắn SMS.';
                    }
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
            // Kiểm tra xem đơn hàng có tồn tại không
            const orderExists = await Order.findOne({ orderId: orderId.trim() });

            if (!orderExists) {
                return res.status(404).json({
                    success: false,
                    error: `❌ Không tìm thấy đơn hàng với mã "${orderId}".\n\nVui lòng kiểm tra lại mã đơn hàng.`
                });
            } else {
                // Đơn hàng tồn tại nhưng email/số điện thoại không khớp
                const contactType = isEmail ? 'email' : 'số điện thoại';

                return res.status(404).json({
                    success: false,
                    error: `❌ ${contactType.charAt(0).toUpperCase() + contactType.slice(1)} "${contact}" không khớp với đơn hàng "${orderId}".\n\nVui lòng kiểm tra lại ${contactType} đã dùng khi đặt tour.`
                });
            }
        }

        // Lấy thông tin ngày về từ TourDetail
        let returnDate = null;
        if (order.items && order.items[0] && order.items[0].tourDetailId) {
            try {
                const TourDetail = require('../models/tourDetailModel');
                const tourDetail = await TourDetail.findById(order.items[0].tourDetailId);
                if (tourDetail) {
                    returnDate = tourDetail.dayReturn;
                }
            } catch (error) {
                console.error('Error fetching tour detail:', error);
            }
        }

        // Trả về thông tin đơn hàng (loại bỏ thông tin nhạy cảm)
        const orderInfo = {
            orderId: order.orderId,
            customerName: order.customer,
            customerEmail: order.email,
            customerPhone: order.phone,
            tourName: order.items && order.items[0] ? order.items[0].name : 'N/A',
            departureDate: order.items && order.items[0] ? order.items[0].startDate : null,
            returnDate: returnDate,
            totalPeople: order.items && order.items[0] ?
                (order.items[0].adults || 0) + (order.items[0].children || 0) + (order.items[0].babies || 0) : 0,
            adults: order.items && order.items[0] ? order.items[0].adults : 0,
            children: order.items && order.items[0] ? order.items[0].children : 0,
            babies: order.items && order.items[0] ? order.items[0].babies : 0,
            singleRooms: order.items && order.items[0] ? order.items[0].singleRooms || 0 : 0,
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

        // === AI ANALYSIS - Song song với việc gửi tin nhắn ===
        // Không block response, chạy background
        const trimmedMessage = message.trim();

        // Lấy conversation history để phân tích context
        let conversationHistory = [];
        if (sessionId) {
            try {
                const chatSession = await ChatHistory.findOne({
                    sessionId,
                    isActive: true
                });
                if (chatSession) {
                    conversationHistory = chatSession.getRecentMessages(10);
                }
            } catch (err) {
                console.error('[AI] Error fetching conversation history:', err);
            }
        }

        // Chạy AI analysis trong background (không await để không block)
        const aiAnalysisPromise = (async () => {
            try {
                const [sentimentAnalysis, intentClassification] = await Promise.all([
                    SentimentAnalysisService.analyzeSentiment(trimmedMessage, conversationHistory),
                    IntentClassificationService.classifyIntent(trimmedMessage, conversationHistory)
                ]);

                // Kiểm tra escalation
                const escalation = SentimentAnalysisService.shouldEscalate(sentimentAnalysis);

                // Log insights
                if (escalation.shouldEscalate) {
                    console.log('🚨 [AI ALERT] Escalation needed:', {
                        sessionId,
                        sentiment: sentimentAnalysis.sentimentLabel,
                        score: sentimentAnalysis.sentimentScore,
                        reasons: escalation.reasons
                    });
                }

                console.log('🧠 [AI] Analysis complete:', {
                    sessionId,
                    sentiment: sentimentAnalysis.sentimentLabel,
                    intent: intentClassification.primaryIntent,
                    confidence: {
                        sentiment: sentimentAnalysis.confidence,
                        intent: intentClassification.confidence
                    }
                });

                return {
                    sentiment: sentimentAnalysis,
                    intent: intentClassification,
                    escalation
                };

            } catch (error) {
                console.error('[AI] Error in background analysis:', error);
                return null;
            }
        })();

        // Gửi tin nhắn đến Gemini AI
        const result = await askGemini(trimmedMessage, sessionId);

        // Đợi AI analysis hoàn thành (nếu chưa xong)
        const aiAnalysis = await aiAnalysisPromise;

        // Lưu AI analysis vào message metadata nếu có
        if (result.success && sessionId && aiAnalysis) {
            try {
                const chatSession = await ChatHistory.findOne({
                    sessionId,
                    isActive: true
                });

                if (chatSession && chatSession.messages.length > 0) {
                    // Lấy message cuối cùng (vừa lưu)
                    const lastMessage = chatSession.messages[chatSession.messages.length - 1];

                    // Cập nhật metadata
                    lastMessage.metadata = {
                        ...lastMessage.metadata,
                        sentiment: aiAnalysis.sentiment,
                        intent: aiAnalysis.intent,
                        escalation: aiAnalysis.escalation,
                        aiAnalyzedAt: new Date()
                    };

                    await chatSession.save();
                    console.log('✅ [AI] Metadata saved to message');
                }
            } catch (error) {
                console.error('[AI] Error saving metadata:', error);
            }
        }

        if (result.success) {
            // Thêm AI analysis vào response (optional)
            const responseData = {
                reply: result.reply,
                sessionId: result.sessionId,
                timestamp: result.timestamp
            };

            // Nếu có escalation, thêm flag
            if (aiAnalysis && aiAnalysis.escalation.shouldEscalate) {
                responseData.needsHumanSupport = true;
                responseData.escalationReason = aiAnalysis.escalation.reasons[0];
            }

            return res.status(200).json({
                success: true,
                data: responseData
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
 * Lưu câu hỏi không trả lời được
 */
exports.saveUnansweredQuestion = async (req, res) => {
    try {
        const { question, sessionId, reason } = req.body;

        // Validate input
        if (!question || !sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Thiếu thông tin question hoặc sessionId'
            });
        }

        // Ở đây bạn có thể lưu vào database
        return res.status(200).json({
            success: true,
            message: 'Đã lưu câu hỏi để cải thiện'
        });

    } catch (error) {
        console.error('Save Unanswered Question Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi lưu câu hỏi'
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
 * Lấy lịch trình và ngày khởi hành của tour
 */
exports.getTourSchedule = async (req, res) => {
    try {
        const { tourId } = req.params;
        const { limit = 10, upcoming = true } = req.query;

        if (!tourId) {
            return res.status(400).json({
                success: false,
                error: 'ID tour không hợp lệ'
            });
        }

        const scheduleData = await TourDataService.getTourSchedule(tourId, {
            limit: parseInt(limit),
            upcoming: upcoming === 'true'
        });

        if (!scheduleData) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy tour hoặc lịch trình'
            });
        }

        return res.status(200).json({
            success: true,
            data: scheduleData
        });

    } catch (error) {
        console.error('Get Tour Schedule Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể lấy thông tin lịch trình tour'
        });
    }
};

/**
 * Lấy lịch trình tour theo slug
 */
exports.getTourScheduleBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const { limit = 10, upcoming = true } = req.query;

        if (!slug) {
            return res.status(400).json({
                success: false,
                error: 'Slug tour không hợp lệ'
            });
        }

        const scheduleData = await TourDataService.getTourScheduleBySlug(slug, {
            limit: parseInt(limit),
            upcoming: upcoming === 'true'
        });

        if (!scheduleData) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy tour hoặc lịch trình'
            });
        }

        return res.status(200).json({
            success: true,
            data: scheduleData
        });

    } catch (error) {
        console.error('Get Tour Schedule By Slug Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể lấy thông tin lịch trình tour'
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

/**
 * Đồng bộ lịch sử chat từ frontend lên backend
 */
exports.syncChatHistory = async (req, res) => {
    try {

        // Kiểm tra database connection
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                error: 'Database không khả dụng, vui lòng thử lại sau'
            });
        }

        const { sessionId, messages, userInfo } = req.body;

        // Validate input
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'SessionId là bắt buộc'
            });
        }

        if (!Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                error: 'Messages phải là một mảng'
            });
        }

        // Tạo thông tin user từ request
        const userData = {
            userId: userInfo?.userId || null,
            userIdentifier: userInfo?.userIdentifier || 'anonymous',
            userAgent: req.headers['user-agent'] || null,
            ipAddress: req.ip || req.connection.remoteAddress || null,
            referrer: req.headers.referer || null,
            deviceType: userInfo?.deviceType || 'desktop',
            browserInfo: userInfo?.browserInfo || 'Unknown'
        };

        // Tìm hoặc tạo session
        const chatSession = await ChatHistory.findOrCreateSession(sessionId, userData);

        // Thay thế toàn bộ messages thay vì append để tránh duplicate
        // Format messages để phù hợp với schema
        const formattedMessages = messages
            .filter(msg => msg.role && msg.content)
            .map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
                metadata: msg.metadata || {}
            }));

        // Replace toàn bộ messages array
        chatSession.messages = formattedMessages;
        chatSession.totalMessages = formattedMessages.length;
        chatSession.lastActivity = new Date();

        await chatSession.save();

        // Làm sạch messages cũ nếu quá nhiều
        try {
            await chatSession.clearOldMessages(100);
        } catch (cleanupError) {
            console.error('❌ Error cleaning up old messages:', cleanupError);
            // Don't fail the request for cleanup errors
        }

        return res.status(200).json({
            success: true,
            data: {
                sessionId: chatSession.sessionId,
                totalMessages: chatSession.totalMessages,
                lastActivity: chatSession.lastActivity,
                message: 'Đã đồng bộ lịch sử chat thành công'
            }
        });

    } catch (error) {
        console.error('❌ Sync Chat History Error:', error);
        console.error('❌ Error stack:', error.stack);
        
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi đồng bộ lịch sử chat',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Lấy lịch sử chat của session
 */
exports.getChatHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { limit = 50 } = req.query;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'SessionId là bắt buộc'
            });
        }

        const chatSession = await ChatHistory.findOne({ 
            sessionId, 
            isActive: true 
        });

        if (!chatSession) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy lịch sử chat'
            });
        }

        const recentMessages = chatSession.getRecentMessages(parseInt(limit));

        return res.status(200).json({
            success: true,
            data: {
                sessionId: chatSession.sessionId,
                messages: recentMessages,
                totalMessages: chatSession.totalMessages,
                lastActivity: chatSession.lastActivity,
                createdAt: chatSession.createdAt
            }
        });

    } catch (error) {
        console.error('Get Chat History Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi lấy lịch sử chat'
        });
    }
};

/**
 * Lấy danh sách session của user
 */
exports.getUserChatSessions = async (req, res) => {
    try {
        const { userId, userIdentifier } = req.query;
        const { limit = 10 } = req.query;

        if (!userId && !userIdentifier) {
            return res.status(400).json({
                success: false,
                error: 'UserId hoặc userIdentifier là bắt buộc'
            });
        }

        let query = { isActive: true };
        if (userId) {
            query.userId = userId;
        } else if (userIdentifier) {
            query.userIdentifier = userIdentifier;
        }

        const sessions = await ChatHistory.find(query)
            .sort({ lastActivity: -1 })
            .limit(parseInt(limit))
            .select('sessionId lastActivity totalMessages createdAt')
            .lean();

        return res.status(200).json({
            success: true,
            data: {
                sessions,
                total: sessions.length
            }
        });

    } catch (error) {
        console.error('Get User Chat Sessions Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi lấy danh sách session'
        });
    }
};

/**
 * Xóa session chat
 */
exports.deleteChatSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'SessionId là bắt buộc'
            });
        }

        const result = await ChatHistory.updateOne(
            { sessionId, isActive: true },
            { isActive: false }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy session để xóa'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Đã xóa session chat thành công'
        });

    } catch (error) {
        console.error('Delete Chat Session Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi xóa session chat'
        });
    }
};

// Backward compatibility - giữ lại method cũ
exports.askBot = exports.sendMessage;