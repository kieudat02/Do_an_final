/**
 * DEPRECATED: Model này không được sử dụng
 * Phone verification đã bị loại bỏ khỏi hệ thống
 * Nếu cần, có thể thêm field isPhoneVerified vào User model
 *
 * Collection 'verifiedphones' sẽ không tự động được tạo
 */

// const mongoose = require('mongoose');
//
// const verifiedPhoneSchema = new mongoose.Schema({
//     phone: {
//         type: String,
//         required: true,
//         unique: true,
//         trim: true
//     },
//     userId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User',
//         default: null
//     },
//     verifiedAt: {
//         type: Date,
//         default: Date.now
//     },
//     expiresAt: {
//         type: Date,
//         default: function() {
//             // Verification valid for 30 days by default
//             const date = new Date();
//             date.setDate(date.getDate() + 30);
//             return date;
//         }
//     }
// });
//
// // Create index for faster lookups
// verifiedPhoneSchema.index({ phone: 1 }, { unique: true });
// verifiedPhoneSchema.index({ userId: 1 });
// verifiedPhoneSchema.index({ expiresAt: 1 });
//
// // Method to check if verification is expired
// verifiedPhoneSchema.methods.isExpired = function() {
//     return this.expiresAt < new Date();
// };
//
// module.exports = mongoose.model('VerifiedPhone', verifiedPhoneSchema);

module.exports = null; // Trả về null để tránh lỗi khi require
