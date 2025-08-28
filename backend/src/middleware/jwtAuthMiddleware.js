const User = require('../models/userModel');
const { verifyToken, extractToken } = require('../utils/jwtUtils');

/**
 * JWT authentication middleware
 * Validates JWT token and attaches user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.authenticateJwt = async (req, res, next) => {
    try {
        // Extract token from request
        const token = extractToken(req);
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication failed: No token provided'
            });
        }
        
        // Verify token
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Authentication failed: Invalid token'
            });
        }
        
        // Find user by id
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication failed: User not found'
            });
        }
        
        if (user.status !== 'Hoạt động') {
            return res.status(403).json({
                success: false,
                message: 'Authentication failed: User account is disabled'
            });
        }
        
        // Attach user to request
        req.user = user;
        
        // Continue
        next();
    } catch (error) {
        console.error('JWT authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Optional JWT authentication middleware
 * Validates JWT token if provided and attaches user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.optionalAuthenticateJwt = async (req, res, next) => {
    try {
        // Extract token from request
        const token = extractToken(req);
        
        // If no token, continue without authentication
        if (!token) {
            return next();
        }
        
        // Verify token
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return next();
        }
        
        // Find user by id
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user || user.status !== 'Hoạt động') {
            return next();
        }
        
        // Attach user to request
        req.user = user;
        
        // Continue
        next();
    } catch (error) {
        // Just continue without authentication in case of error
        console.error('Optional JWT authentication error:', error);
        next();
    }
}; 