const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for user
 * @param {Object} user - User object from database
 * @returns {String} JWT token
 */
exports.generateToken = (user) => {
    // Get JWT secret from environment variables
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is not defined');
    }
    
    // Create payload with user information
    const payload = {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        user_type: user.user_type,
        role: user.role
    };
    
    // Generate token with expiration (default: 7 days)
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    
    // Sign and return token
    return jwt.sign(payload, jwtSecret, { expiresIn });
};

/**
 * Verify JWT token
 * @param {String} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
exports.verifyToken = (token) => {
    try {
        const jwtSecret = process.env.JWT_SECRET;
        
        if (!jwtSecret) {
            throw new Error('JWT_SECRET environment variable is not defined');
        }
        
        return jwt.verify(token, jwtSecret);
    } catch (error) {
        console.error('Error verifying JWT token:', error.message);
        return null;
    }
};

/**
 * Extract token from request
 * @param {Object} req - Express request object
 * @returns {String|null} JWT token or null
 */
exports.extractToken = (req) => {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7); // Remove "Bearer " prefix
    }
    
    // Check query parameter
    if (req.query && req.query.token) {
        return req.query.token;
    }
    
    // Check cookies
    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }
    
    return null;
}; 