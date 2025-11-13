const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');
const emailOtpController = require('../controllers/emailOtpController');
const { verifyRecaptcha } = require('../middleware/recaptchaMiddleware');

/**
    Gửi OTP qua email để tra cứu đơn hàng (bảo mật)
 */
router.post('/send-otp', verifyRecaptcha, async (req, res) => {
    try {
        const { orderId, email } = req.body;

        // Validate input
        if (!orderId || !email) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng cung cấp mã đơn hàng và email'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Email không hợp lệ'
            });
        }

        // Tìm đơn hàng để xác thực - PHẢI khớp cả orderId và email
        const order = await Order.findOne({
            orderId: orderId.trim(),
            email: email.trim()
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy đơn hàng với thông tin đã cung cấp. Vui lòng kiểm tra lại mã đơn hàng và email.'
            });
        }

        // Gửi OTP qua email
        req.body.email = email;
        await emailOtpController.sendOTP(req, res);

    } catch (error) {
        console.error('Send OTP for Order Lookup Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi gửi mã OTP'
        });
    }
});

/**
 * Tra cứu đơn hàng với xác thực OTP qua email (bảo mật)
 */
router.post('/lookup', async (req, res) => {
    try {
        const { orderId, email, otpCode } = req.body;

        // Validate input
        if (!orderId || !email || !otpCode) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng cung cấp đầy đủ thông tin: mã đơn hàng, email và mã OTP'
            });
        }

        // Verify email OTP with attempt limit
        const emailOtpModel = require('../models/emailOtpModel');
        let otpVerified = false;
        let verifyError = null;
        const MAX_ATTEMPTS = 5; // Giới hạn 5 lần thử

        try {
            const emailOtpRecord = await emailOtpModel.findOne({
                email: email.trim(),
                code: otpCode.trim(),
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
                    verifyError = 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.';
                }
            } else {
                // OTP không đúng - tăng số lần thử
                const otpRecordForAttempt = await emailOtpModel.findOne({
                    email: email.trim(),
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
                        verifyError = `Bạn đã nhập sai mã OTP quá ${MAX_ATTEMPTS} lần. Vui lòng yêu cầu mã mới.`;
                    } else {
                        // Cập nhật số lần thử
                        await emailOtpModel.findByIdAndUpdate(otpRecordForAttempt._id, { attempts });
                        verifyError = `Mã OTP không chính xác. Bạn còn ${MAX_ATTEMPTS - attempts} lần thử.`;
                    }
                } else {
                    verifyError = 'Mã OTP không chính xác';
                }
            }
        } catch (error) {
            console.error('Error verifying email OTP:', error);
            verifyError = 'Lỗi xác thực mã OTP';
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
            email: email.trim()
        }).populate('items.tourId');

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy đơn hàng với thông tin đã cung cấp'
            });
        }

        // Lấy thông tin ngày về từ TourDetail
        let returnDate = null;
        if (order.items && order.items[0] && order.items[0].tourDetailId) {
            const TourDetail = require('../models/tourDetailModel');
            const tourDetail = await TourDetail.findById(order.items[0].tourDetailId);
            if (tourDetail) {
                returnDate = tourDetail.endDate;
            }
        }

        // Trả về thông tin đơn hàng (đã được xác thực)
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
            error: 'Lỗi server khi tra cứu đơn hàng'
        });
    }
});

module.exports = router;
