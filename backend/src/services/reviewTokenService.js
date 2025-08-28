const crypto = require('crypto');
const Order = require('../models/orderModel');
const Review = require('../models/reviewModel');


// Service để quản lý review tokens bảo mật
class ReviewTokenService {
    
    
    // Tạo review token cho order khi status chuyển thành 'completed'
    static async generateReviewToken(order) {
        try {
            // Kiểm tra điều kiện để tạo token
            if (order.status !== 'completed') {
                throw new Error('Chỉ có thể tạo review token cho order đã hoàn thành');
            }

            if (order.reviewToken) {
                throw new Error('Order này đã có review token rồi');
            }

            if (order.reviewed) {
                throw new Error('Order này đã được đánh giá rồi');
            }

            // Tạo token bảo mật
            const token = crypto.randomBytes(32).toString('hex');
            
            // Cập nhật order với token và thời hạn
            order.reviewToken = token;
            order.reviewTokenExpiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày
            
            await order.save();
            
            console.log(`✅ Đã tạo review token cho order ${order.orderId}`);
            return token;
            
        } catch (error) {
            console.error(`❌ Lỗi tạo review token cho order ${order.orderId}:`, error.message);
            throw error;
        }
    }

    // Xác thực review token và trả về thông tin order
    static async validateReviewToken(bookingId, token) {
        try {
            // Tìm order theo ID
            const order = await Order.findById(bookingId).populate('items.tourId', 'title code');
            
            if (!order) {
                return {
                    isValid: false,
                    error: 'Không tìm thấy đơn đặt tour',
                    errorCode: 'ORDER_NOT_FOUND'
                };
            }

            // Kiểm tra đã được review chưa
            if (order.reviewed) {
                return {
                    isValid: false,
                    error: 'Đơn đặt tour này đã được đánh giá rồi',
                    errorCode: 'ALREADY_REVIEWED'
                };
            }

            // Kiểm tra token có tồn tại không
            if (!order.reviewToken) {
                return {
                    isValid: false,
                    error: 'Link đánh giá không hợp lệ hoặc đã hết hạn',
                    errorCode: 'TOKEN_NOT_FOUND'
                };
            }

            // Kiểm tra token có khớp không
            if (order.reviewToken !== token) {
                return {
                    isValid: false,
                    error: 'Link đánh giá không hợp lệ',
                    errorCode: 'INVALID_TOKEN'
                };
            }

            // Kiểm tra token có hết hạn không
            if (order.reviewTokenExpiredAt && new Date() > order.reviewTokenExpiredAt) {
                return {
                    isValid: false,
                    error: 'Link đánh giá đã hết hạn',
                    errorCode: 'TOKEN_EXPIRED'
                };
            }

            // Token hợp lệ
            return {
                isValid: true,
                order: order,
                tourInfo: order.items[0] // Giả sử mỗi order chỉ có 1 tour
            };

        } catch (error) {
            console.error('❌ Lỗi xác thực review token:', error.message);
            return {
                isValid: false,
                error: 'Có lỗi xảy ra khi xác thực link đánh giá',
                errorCode: 'VALIDATION_ERROR'
            };
        }
    }

    
    // Tạo review từ token (anonymous review)
    static async createReviewFromToken(bookingId, token, rating, comment) {
        try {
            // Xác thực token trước
            const validation = await this.validateReviewToken(bookingId, token);
            
            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.error,
                    errorCode: validation.errorCode
                };
            }

            const order = validation.order;
            const tourInfo = validation.tourInfo;

            // Kiểm tra xem booking đã được review chưa
            const canReview = await Review.canBookingReview(bookingId);
            if (!canReview.canReview) {
                return {
                    success: false,
                    error: canReview.reason,
                    errorCode: 'ALREADY_REVIEWED'
                };
            }

            // Tạo review mới
            const review = new Review({
                booking: order._id,
                tour: tourInfo.tourId._id,
                rating: parseInt(rating),
                comment: comment.trim(),
                status: 'pending', 
                isVerifiedPurchase: true, 
                customerName: order.customer,
                customerEmail: order.email,
                createdBy: 'Anonymous Customer'
            });

            await review.save();

            // Đánh dấu order đã được review
            order.markAsReviewed();
            await order.save();

            return {
                success: true,
                review: review,
                message: 'Đánh giá đã được gửi thành công và đang chờ phê duyệt'
            };

        } catch (error) {
            return {
                success: false,
                error: 'Có lỗi xảy ra khi gửi đánh giá',
                errorCode: 'CREATE_ERROR'
            };
        }
    }

    // Lấy thông tin order để hiển thị trong form review
    static async getOrderInfoForReview(bookingId, token) {
        try {
            const validation = await this.validateReviewToken(bookingId, token);
            
            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.error,
                    errorCode: validation.errorCode
                };
            }

            const order = validation.order;
            const tourInfo = validation.tourInfo;

            return {
                success: true,
                orderInfo: {
                    orderId: order.orderId,
                    customerName: order.customer,
                    tourName: tourInfo.tourId.title,
                    tourCode: tourInfo.tourId.code,
                    totalAmount: order.totalAmount,
                    createdAt: order.createdAt
                }
            };

        } catch (error) {
            console.error('❌ Lỗi lấy thông tin order:', error.message);
            return {
                success: false,
                error: 'Có lỗi xảy ra khi lấy thông tin đơn hàng',
                errorCode: 'GET_INFO_ERROR'
            };
        }
    }

    // Tạo review URL cho email
    static generateReviewUrl(bookingId, token) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return `${baseUrl}/review?bookingId=${bookingId}&token=${token}`;
    }
}

module.exports = ReviewTokenService;
