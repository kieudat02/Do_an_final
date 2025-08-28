const Otp = require('../models/otpModel');
const VerifiedPhone = require('../models/verifiedPhoneModel');
const User = require('../models/userModel');
const { generateOTP, validatePhoneNumber, formatPhoneNumber, isRateLimited } = require('../utils/otpUtil');

// Store OTP attempts for rate limiting (in-memory, consider Redis for production)
const otpAttempts = new Map(); // phone -> [timestamp1, timestamp2, ...]

/**
 * Send OTP to phone number
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendOTP = async (req, res) => {
    try {
        const { phone } = req.body;
        
        // Validate phone number
        if (!phone || !validatePhoneNumber(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại không hợp lệ',
                validationErrors: {
                    phone: 'Số điện thoại không đúng định dạng'
                }
            });
        }
        
        // Format phone number for consistent storage
        const formattedPhone = formatPhoneNumber(phone);
        
        // Check rate limiting
        const attempts = otpAttempts.get(formattedPhone) || [];
        if (isRateLimited(attempts, 5, 10)) {
            return res.status(429).json({
                success: false,
                message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 10 phút',
                validationErrors: {
                    phone: 'Đã gửi quá nhiều mã OTP. Vui lòng thử lại sau 10 phút'
                }
            });
        }
        
        // Generate OTP
        const otpCode = generateOTP(6);
        
        // Store OTP in database
        await Otp.create({
            phone: formattedPhone,
            code: otpCode,
            isUsed: false
        });
        
        // Update rate limiting
        otpAttempts.set(formattedPhone, [...attempts, Date.now()]);
        
        // SMS functionality has been removed from the system
        // For development, just log the OTP
        if (process.env.NODE_ENV === 'development') {
            console.log(`OTP for ${formattedPhone}: ${otpCode}`);
        }
        
        // Return success
        res.status(200).json({
            success: true,
            message: 'Mã OTP đã được tạo (SMS đã bị vô hiệu hóa)',
            // Only include the OTP in development environment
            ...(process.env.NODE_ENV !== 'production' && { otp: otpCode })
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
        const { phone, code } = req.body;
        
        // Validate phone number
        if (!phone || !validatePhoneNumber(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại không hợp lệ',
                validationErrors: {
                    phone: 'Số điện thoại không đúng định dạng'
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
        
        // Format phone number for consistent storage
        const formattedPhone = formatPhoneNumber(phone);
        
        // Find the most recent unused OTP for this phone number
        const otp = await Otp.findOne({
            phone: formattedPhone,
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
        
        // Create or update verified phone record
        let userId = null;
        
        // If user is logged in, associate phone with user
        if (req.session && req.session.user && req.session.user._id) {
            userId = req.session.user._id;
            
            // Update user's phone if not already set
            const user = await User.findById(userId);
            if (user && (!user.phone || user.phone !== formattedPhone)) {
                user.phone = formattedPhone;
                await user.save();
            }
        }
        
        // Create or update the verified phone entry
        await VerifiedPhone.findOneAndUpdate(
            { phone: formattedPhone },
            {
                phone: formattedPhone,
                userId: userId,
                verifiedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            },
            { upsert: true, new: true }
        );
        
        // Return success
        res.status(200).json({
            success: true,
            message: 'Xác minh số điện thoại thành công',
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
 * Check if a phone number is verified
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.checkPhoneVerification = async (req, res) => {
    try {
        const { phone } = req.query;
        
        if (!phone || !validatePhoneNumber(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại không hợp lệ',
                isVerified: false
            });
        }
        
        const formattedPhone = formatPhoneNumber(phone);
        
        // Check if phone is verified and not expired
        const verifiedPhone = await VerifiedPhone.findOne({
            phone: formattedPhone,
            expiresAt: { $gt: new Date() }
        });
        
        res.status(200).json({
            success: true,
            isVerified: !!verifiedPhone,
            message: verifiedPhone 
                ? 'Số điện thoại đã được xác minh' 
                : 'Số điện thoại chưa được xác minh hoặc đã hết hạn'
        });
        
    } catch (error) {
        console.error('Error in checkPhoneVerification:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi kiểm tra trạng thái xác minh',
            isVerified: false
        });
    }
};

// For internal use by other controllers
exports.isPhoneVerified = async (phone) => {
    if (!phone || !validatePhoneNumber(phone)) {
        return false;
    }
    
    const formattedPhone = formatPhoneNumber(phone);
    
    // Check if phone is verified and not expired
    const verifiedPhone = await VerifiedPhone.findOne({
        phone: formattedPhone,
        expiresAt: { $gt: new Date() }
    });
    
    return !!verifiedPhone;
}; 