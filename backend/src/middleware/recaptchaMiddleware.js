const axios = require('axios');

/**
 * Middleware to verify Google reCAPTCHA token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.verifyRecaptcha = async (req, res, next) => {
    try {
        // Skip verification in development mode
        if (process.env.NODE_ENV !== 'production') {
            return next();
        }
        
        // Get recaptcha token from request body (support both field names)
        const recaptchaToken = req.body.recaptchaToken || req.body.recaptcha;
        
        // Check if token exists
        if (!recaptchaToken) {
            return res.status(400).json({
                success: false,
                message: 'reCAPTCHA token is required',
                validationErrors: {
                    recaptcha: 'Vui lòng xác nhận bạn không phải là robot'
                }
            });
        }

        // Verify with Google reCAPTCHA API
        const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
        if (!recaptchaSecretKey) {
            console.error('RECAPTCHA_SECRET_KEY not configured');
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }

        const verificationURL = 'https://www.google.com/recaptcha/api/siteverify';
        const response = await axios.post(
            verificationURL,
            null,
            {
                params: {
                    secret: recaptchaSecretKey,
                    response: recaptchaToken
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        // Check verification result
        const { success, score } = response.data;

        // For reCAPTCHA v3, check score (0.0 to 1.0, 1.0 being very likely a human)
        if (success && (score === undefined || score >= 0.5)) {
            return next();
        }

        // If verification fails
        return res.status(403).json({
            success: false,
            message: 'reCAPTCHA verification failed',
            validationErrors: {
                recaptcha: 'Xác minh reCAPTCHA không thành công'
            }
        });
    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error verifying reCAPTCHA'
        });
    }
}; 