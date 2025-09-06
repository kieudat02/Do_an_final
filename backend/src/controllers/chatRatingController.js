const ChatRating = require('../models/chatRatingModel');

/**
 * Tạo hoặc cập nhật rating cho tin nhắn chatbot
 */
exports.createOrUpdateRating = async (req, res) => {
    try {
        const { sessionId, messageId, rating, feedback } = req.body;

        // Validate đầu vào
        if (!sessionId || !messageId || !rating) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin sessionId, messageId hoặc rating'
            });
        }

        // Validate rating
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating phải là số nguyên từ 1 đến 5'
            });
        }

        // Validate feedback length
        if (feedback && feedback.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Feedback không được vượt quá 500 ký tự'
            });
        }

        // Lấy thông tin client
        const userIP = req.headers['x-forwarded-for'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress ||
                      (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                      '127.0.0.1';
        
        const userAgent = req.headers['user-agent'] || '';

        // Tìm và cập nhật hoặc tạo mới rating
        const existingRating = await ChatRating.findOne({ sessionId, messageId });

        if (existingRating) {
            // Cập nhật rating hiện có
            existingRating.rating = rating;
            existingRating.feedback = feedback || '';
            existingRating.userIP = userIP;
            existingRating.userAgent = userAgent;
            existingRating.updatedAt = new Date();

            await existingRating.save();

            return res.status(200).json({
                success: true,
                message: 'Cập nhật đánh giá thành công',
                data: {
                    ratingId: existingRating._id,
                    sessionId: existingRating.sessionId,
                    messageId: existingRating.messageId,
                    rating: existingRating.rating,
                    feedback: existingRating.feedback,
                    createdAt: existingRating.createdAt,
                    updatedAt: existingRating.updatedAt
                }
            });
        } else {
            // Tạo rating mới
            const newRating = new ChatRating({
                sessionId,
                messageId,
                rating,
                feedback: feedback || '',
                userIP,
                userAgent
            });

            await newRating.save();

            return res.status(201).json({
                success: true,
                message: 'Tạo đánh giá thành công',
                data: {
                    ratingId: newRating._id,
                    sessionId: newRating.sessionId,
                    messageId: newRating.messageId,
                    rating: newRating.rating,
                    feedback: newRating.feedback,
                    createdAt: newRating.createdAt,
                    updatedAt: newRating.updatedAt
                }
            });
        }

    } catch (error) {
        console.error('❌ Lỗi khi tạo/cập nhật rating:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xử lý đánh giá',
            error: error.message
        });
    }
};

/**
 * Lấy thống kê CSAT tổng quan
 */
exports.getCSATStats = async (req, res) => {
    try {
        const { dateFrom, dateTo, sessionId } = req.query;

        // Parse dates
        let fromDate = null;
        let toDate = null;

        if (dateFrom) {
            fromDate = new Date(dateFrom);
            if (isNaN(fromDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Định dạng dateFrom không hợp lệ'
                });
            }
        }

        if (dateTo) {
            toDate = new Date(dateTo);
            if (isNaN(toDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Định dạng dateTo không hợp lệ'
                });
            }
        }

        // Lấy thống kê CSAT
        const stats = await ChatRating.getCSATStats(fromDate, toDate, sessionId);

        return res.status(200).json({
            success: true,
            message: 'Lấy thống kê CSAT thành công',
            data: {
                period: {
                    from: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    to: toDate || new Date()
                },
                sessionId: sessionId || null,
                stats
            }
        });

    } catch (error) {
        console.error('❌ Lỗi khi lấy thống kê CSAT:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê CSAT',
            error: error.message
        });
    }
};

/**
 * Lấy trend đánh giá theo thời gian
 */
exports.getRatingTrend = async (req, res) => {
    try {
        const { days } = req.query;
        const numDays = parseInt(days) || 7;

        if (numDays < 1 || numDays > 365) {
            return res.status(400).json({
                success: false,
                message: 'Số ngày phải từ 1 đến 365'
            });
        }

        const trend = await ChatRating.getRatingTrend(numDays);

        return res.status(200).json({
            success: true,
            message: 'Lấy trend đánh giá thành công',
            data: {
                days: numDays,
                trend
            }
        });

    } catch (error) {
        console.error('❌ Lỗi khi lấy trend đánh giá:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy trend đánh giá',
            error: error.message
        });
    }
};

/**
 * Lấy danh sách ratings với phân trang
 */
exports.getRatings = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            sessionId, 
            rating, 
            dateFrom, 
            dateTo,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Validate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                success: false,
                message: 'Tham số phân trang không hợp lệ'
            });
        }

        // Build filter conditions
        const filter = { status: 'active' };

        if (sessionId) {
            filter.sessionId = sessionId;
        }

        if (rating) {
            const ratingNum = parseInt(rating);
            if (ratingNum >= 1 && ratingNum <= 5) {
                filter.rating = ratingNum;
            }
        }

        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                if (!isNaN(fromDate.getTime())) {
                    filter.createdAt.$gte = fromDate;
                }
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                if (!isNaN(toDate.getTime())) {
                    filter.createdAt.$lte = toDate;
                }
            }
        }

        // Build sort
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query
        const [ratings, total] = await Promise.all([
            ChatRating.find(filter)
                .sort(sort)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            ChatRating.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách ratings thành công',
            data: {
                ratings,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            }
        });

    } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách ratings:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách ratings',
            error: error.message
        });
    }
};

/**
 * Xóa rating (soft delete)
 */
exports.deleteRating = async (req, res) => {
    try {
        const { ratingId } = req.params;

        if (!ratingId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ratingId'
            });
        }

        const rating = await ChatRating.findById(ratingId);
        if (!rating) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy rating'
            });
        }

        rating.status = 'deleted';
        rating.updatedAt = new Date();
        await rating.save();

        return res.status(200).json({
            success: true,
            message: 'Xóa rating thành công'
        });

    } catch (error) {
        console.error('❌ Lỗi khi xóa rating:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa rating',
            error: error.message
        });
    }
};
