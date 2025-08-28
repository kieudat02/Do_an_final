/**
 * Utility functions for OTP generation and validation
 */

/**
 * Generate a random OTP code of specified length
 * @param {number} length - Length of OTP code (default: 6)
 * @returns {string} OTP code
 */
const generateOTP = (length = 6) => {
    // Generate a random number with specified length
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
};

/**
 * Validate phone number format (basic validation)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether the phone number is valid
 */
const validatePhoneNumber = (phone) => {
    // Basic validation for Vietnam phone numbers
    // Remove spaces, dashes, and parentheses
    const cleanedPhone = phone.replace(/[\s\-()]/g, '');
    
    // Check if it starts with +84 or 0 and has 9-11 digits after that
    const vietnamPhoneRegex = /^(\+84|0)([35789][0-9]{8}|1[2689][0-9]{8})$/;
    
    return vietnamPhoneRegex.test(cleanedPhone);
};

/**
 * Format phone number to E.164 format for consistent storage
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
const formatPhoneNumber = (phone) => {
    // Remove spaces, dashes, and parentheses
    let cleaned = phone.replace(/[\s\-()]/g, '');
    
    // If it starts with 0, replace with +84
    if (cleaned.startsWith('0')) {
        cleaned = '+84' + cleaned.substring(1);
    }
    
    // If it doesn't have a + prefix, add it
    if (!cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    
    return cleaned;
};

/**
 * Check if an OTP request should be rate limited
 * @param {Array} attempts - Array of previous attempts with timestamps
 * @param {number} maxAttempts - Maximum number of attempts allowed
 * @param {number} timeWindow - Time window in minutes
 * @returns {boolean} Whether the request should be rate limited
 */
const isRateLimited = (attempts = [], maxAttempts = 5, timeWindow = 10) => {
    if (!attempts.length) return false;
    
    // Filter attempts within the time window
    const now = Date.now();
    const windowStart = now - (timeWindow * 60 * 1000);
    const recentAttempts = attempts.filter(timestamp => timestamp > windowStart);
    
    return recentAttempts.length >= maxAttempts;
};

module.exports = {
    generateOTP,
    validatePhoneNumber,
    formatPhoneNumber,
    isRateLimited
}; 