const express = require('express');
const router = express.Router();
const ReviewTokenService = require('../services/reviewTokenService');

router.get('/check-link', async (req, res) => {
    try {
        const { bookingId, token } = req.query;

        // Validate required parameters
        if (!bookingId || !token) {
            return res.status(400).json({
                success: false,
                error: 'Thiếu thông tin bookingId hoặc token',
                errorCode: 'MISSING_PARAMS'
            });
        }

        // Validate review token
        const validation = await ReviewTokenService.validateReviewToken(bookingId, token);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: validation.error,
                errorCode: validation.errorCode
            });
        }

        // Get order info for display
        const orderInfo = await ReviewTokenService.getOrderInfoForReview(bookingId, token);

        if (!orderInfo.success) {
            return res.status(400).json({
                success: false,
                error: orderInfo.error,
                errorCode: orderInfo.errorCode
            });
        }

        // Return success with order info
        res.json({
            success: true,
            message: 'Link đánh giá hợp lệ',
            data: {
                isValid: true,
                orderInfo: orderInfo.orderInfo
            }
        });

    } catch (error) {
        console.error('Error in check-link API:', error);
        res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi xác thực link đánh giá',
            errorCode: 'SERVER_ERROR'
        });
    }
});

router.post('/submit', async (req, res) => {
    try {
        const { bookingId, token, rating, comment } = req.body;

        // Validate required fields
        const validationErrors = {};

        if (!bookingId) {
            validationErrors.bookingId = 'Booking ID là bắt buộc';
        }

        if (!token) {
            validationErrors.token = 'Token là bắt buộc';
        }

        if (!rating) {
            validationErrors.rating = 'Đánh giá sao là bắt buộc';
        } else {
            const ratingNum = parseInt(rating);
            if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
                validationErrors.rating = 'Đánh giá sao phải từ 1 đến 5';
            }
        }

        if (!comment || comment.trim() === '') {
            validationErrors.comment = 'Bình luận là bắt buộc';
        } else if (comment.trim().length < 10) {
            validationErrors.comment = 'Bình luận phải có ít nhất 10 ký tự';
        } else if (comment.trim().length > 1000) {
            validationErrors.comment = 'Bình luận không được vượt quá 1000 ký tự';
        }

        // Return validation errors if any
        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Dữ liệu không hợp lệ',
                errorCode: 'VALIDATION_ERROR',
                validationErrors
            });
        }

        // Create review from token
        const result = await ReviewTokenService.createReviewFromToken(
            bookingId, 
            token, 
            parseInt(rating), 
            comment.trim()
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error,
                errorCode: result.errorCode
            });
        }

        // Return success
        res.status(201).json({
            success: true,
            message: result.message,
            data: {
                reviewId: result.review._id,
                status: result.review.status,
                rating: result.review.rating,
                comment: result.review.comment,
                createdAt: result.review.createdAt
            }
        });

    } catch (error) {
        console.error('Error in submit review API:', error);
        res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi gửi đánh giá',
            errorCode: 'SERVER_ERROR'
        });
    }
});

router.get('/order-info', async (req, res) => {
    try {
        const { bookingId, token } = req.query;

        if (!bookingId || !token) {
            return res.status(400).json({
                success: false,
                error: 'Thiếu thông tin bookingId hoặc token',
                errorCode: 'MISSING_PARAMS'
            });
        }

        const orderInfo = await ReviewTokenService.getOrderInfoForReview(bookingId, token);

        if (!orderInfo.success) {
            return res.status(400).json({
                success: false,
                error: orderInfo.error,
                errorCode: orderInfo.errorCode
            });
        }

        res.json({
            success: true,
            data: orderInfo.orderInfo
        });

    } catch (error) {
        console.error('Error in order-info API:', error);
        res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi lấy thông tin đơn hàng',
            errorCode: 'SERVER_ERROR'
        });
    }
});

module.exports = router;
