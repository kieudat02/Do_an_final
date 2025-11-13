/**
 * Hàm tiện ích Regex cho bảo mật
 */

/**
 * Escape ký tự đặc biệt regex để chống ReDoS attacks
 * @param {string} string - Chuỗi cần escape
 * @returns {string} - Chuỗi đã escape an toàn cho regex
 */
function escapeRegex(string) {
    if (typeof string !== 'string') return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tạo regex pattern an toàn cho tìm kiếm với giới hạn độ dài
 * @param {string} query - Query tìm kiếm từ user input
 * @param {number} maxLength - Độ dài tối đa cho phép (mặc định: 100)
 * @returns {object} - MongoDB regex object hoặc null
 */
function createSafeSearchRegex(query, maxLength = 100) {
    if (!query || typeof query !== 'string') {
        return null;
    }

    // Giới hạn độ dài để chống ReDoS
    const limitedQuery = query.substring(0, maxLength);

    // Escape các ký tự đặc biệt regex
    const escapedQuery = escapeRegex(limitedQuery);

    // Trả về MongoDB regex pattern
    return {
        $regex: escapedQuery,
        $options: 'i'
    };
}

module.exports = {
    escapeRegex,
    createSafeSearchRegex
};
