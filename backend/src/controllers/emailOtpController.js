const EmailOtp = require('../models/emailOtpModel');
const VerifiedEmail = require('../models/verifiedEmailModel');
const { sendOTPEmail, generateOTP, validateEmail, isRateLimited } = require('../utils/emailUtils');

// Store OTP attempts for rate limiting (in-memory, consider Redis for production)
const otpAttempts = new Map(); // email -> [timestamp1, timestamp2, ...]

/**
 * Send OTP to email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Validate email
        if (!email || !validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Địa chỉ email không hợp lệ',
                validationErrors: {
                    email: 'Địa chỉ email không đúng định dạng'
                }
            });
        }
        
        // Normalize email (lowercase)
        const normalizedEmail = email.toLowerCase();
        
        // Check rate limiting
        const attempts = otpAttempts.get(normalizedEmail) || [];
        if (isRateLimited(attempts, 3, 1)) { // 3 attempts per hour
            return res.status(429).json({
                success: false,
                message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 giờ',
                validationErrors: {
                    email: 'Đã gửi quá nhiều mã OTP. Vui lòng thử lại sau 1 giờ'
                }
            });
        }
        
        // Generate OTP
        const otpCode = generateOTP(6);
        
        // Store OTP in database
        await EmailOtp.create({
            email: normalizedEmail,
            code: otpCode,
            isUsed: false
        });
        
        // Update rate limiting
        otpAttempts.set(normalizedEmail, [...attempts, Date.now()]);
        
        // Send email with OTP (skip in development if email not configured)
        try {
            if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
                await sendOTPEmail(normalizedEmail, otpCode);
            } else if (process.env.NODE_ENV === 'development') {
                console.log(`Development mode: OTP for ${normalizedEmail}: ${otpCode}`);
            }
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // In development, continue without email
            if (process.env.NODE_ENV !== 'development') {
                throw emailError;
            }
        }

        // Return success
        res.status(200).json({
            success: true,
            message: process.env.NODE_ENV === 'development' && (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD)
                ? `Mã OTP (Development): ${otpCode}`
                : 'Mã OTP đã được gửi đến địa chỉ email của bạn',
            // Only include the OTP in development environment
            ...(process.env.NODE_ENV === 'development' && { otp: otpCode })
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi gửi mã OTP'
        });
    }
};

/**
 * Verify OTP code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyOTP = async (req, res) => {
    try {
        const { email, code } = req.body;
        
        // Validate email
        if (!email || !validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Địa chỉ email không hợp lệ',
                validationErrors: {
                    email: 'Địa chỉ email không đúng định dạng'
                }
            });
        }
        
        // Validate OTP code
        if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
            return res.status(400).json({
                success: false,
                message: 'Mã OTP không hợp lệ',
                validationErrors: {
                    code: 'Mã OTP phải có 6 chữ số'
                }
            });
        }
        
        // Normalize email
        const normalizedEmail = email.toLowerCase();
        
        // Find the most recent unused OTP for this email
        const otp = await EmailOtp.findOne({
            email: normalizedEmail,
            code: code,
            isUsed: false
        }).sort({ createdAt: -1 });
        
        if (!otp) {
            return res.status(400).json({
                success: false,
                message: 'Mã OTP không chính xác hoặc đã hết hạn',
                validationErrors: {
                    code: 'Mã OTP không chính xác hoặc đã hết hạn'
                }
            });
        }
        
        // Mark OTP as used
        otp.isUsed = true;
        await otp.save();
        
        // Create or update verified email record
        await VerifiedEmail.findOneAndUpdate(
            { email: normalizedEmail },
            {
                email: normalizedEmail,
                verifiedAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            },
            { upsert: true, new: true }
        );
        
        // Return success
        res.status(200).json({
            success: true,
            message: 'Xác minh địa chỉ email thành công',
            isVerified: true
        });
        
    } catch (error) {
        console.error('Error in verifyOTP:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi xác minh mã OTP'
        });
    }
};

/**
 * Check if an email is verified
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.checkEmailVerification = async (req, res) => {
    try {
        const { email } = req.query;
        
        if (!email || !validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Địa chỉ email không hợp lệ',
                isVerified: false
            });
        }
        
        const normalizedEmail = email.toLowerCase();
        
        // Check if email is verified and not expired
        const verifiedEmail = await VerifiedEmail.findOne({
            email: normalizedEmail,
            expiresAt: { $gt: new Date() }
        });
        
        res.status(200).json({
            success: true,
            isVerified: !!verifiedEmail,
            message: verifiedEmail 
                ? 'Địa chỉ email đã được xác minh' 
                : 'Địa chỉ email chưa được xác minh hoặc đã hết hạn'
        });
        
    } catch (error) {
        console.error('Error in checkEmailVerification:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi kiểm tra trạng thái xác minh',
            isVerified: false
        });
    }
};

// For internal use by other controllers
exports.isEmailVerified = async (email) => {
    if (!email || !validateEmail(email)) {
        return false;
    }
    
    const normalizedEmail = email.toLowerCase();
    
    // Check if email is verified and not expired
    const verifiedEmail = await VerifiedEmail.findOne({
        email: normalizedEmail,
        expiresAt: { $gt: new Date() }
    });
    
    return !!verifiedEmail;
}; 