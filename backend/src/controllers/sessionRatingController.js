const SessionRating = require('../models/sessionRatingModel');

/**
 * Tạo hoặc cập nhật rating cho phiên hội thoại
 */
exports.createOrUpdateSessionRating = async (req, res) => {
    try {
        const { 
            sessionId, 
            rating, 
            feedback, 
            ratingType = 'manual',
            ratingTrigger = 'user_initiated',
            sessionStats = {}
        } = req.body;

        // Validate đầu vào
        if (!sessionId || !rating) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin sessionId hoặc rating'
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
        if (feedback && feedback.length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Feedback không được vượt quá 1000 ký tự'
            });
        }

        // Lấy thông tin IP và User Agent
        const userIP = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.get('User-Agent') || '';

        // Kiểm tra xem đã có rating cho session này chưa
        let existingRating = await SessionRating.findOne({ sessionId });

        if (existingRating) {
            // Cập nhật rating hiện có
            existingRating.rating = rating;
            existingRating.feedback = feedback || '';
            existingRating.ratingType = ratingType;
            existingRating.ratingTrigger = ratingTrigger;
            existingRating.userIP = userIP;
            existingRating.userAgent = userAgent;
            existingRating.sessionStats = { ...existingRating.sessionStats, ...sessionStats };
            existingRating.status = 'completed';
            existingRating.promptCount = (existingRating.promptCount || 0) + 1;

            await existingRating.save();

            return res.status(200).json({
                success: true,
                message: 'Đã cập nhật đánh giá thành công',
                data: {
                    ratingId: existingRating._id,
                    sessionId: existingRating.sessionId,
                    rating: existingRating.rating,
                    feedback: existingRating.feedback,
                    isUpdate: true
                }
            });
        } else {
            // Tạo rating mới
            const newRating = new SessionRating({
                sessionId,
                rating,
                feedback: feedback || '',
                ratingType,
                ratingTrigger,
                userIP,
                userAgent,
                sessionStats: {
                    sessionStartTime: new Date(),
                    ...sessionStats
                },
                status: 'completed',
                promptShown: true,
                promptCount: 1
            });

            await newRating.save();

            return res.status(201).json({
                success: true,
                message: 'Đã lưu đánh giá thành công',
                data: {
                    ratingId: newRating._id,
                    sessionId: newRating.sessionId,
                    rating: newRating.rating,
                    feedback: newRating.feedback,
                    isUpdate: false
                }
            });
        }

    } catch (error) {
        console.error('Error creating/updating session rating:', error);
        
        // Xử lý lỗi duplicate key (nếu có race condition)
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Phiên này đã được đánh giá. Vui lòng thử lại.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lưu đánh giá'
        });
    }
};

/**
 * Kiểm tra xem session đã được đánh giá chưa
 */
exports.checkSessionRated = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu sessionId'
            });
        }

        const existingRating = await SessionRating.findOne({ sessionId });

        return res.status(200).json({
            success: true,
            data: {
                hasRating: !!existingRating,
                rating: existingRating ? {
                    rating: existingRating.rating,
                    feedback: existingRating.feedback,
                    ratingType: existingRating.ratingType,
                    createdAt: existingRating.createdAt
                } : null
            }
        });

    } catch (error) {
        console.error('Error checking session rating:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi kiểm tra đánh giá'
        });
    }
};

/**
 * Lấy thống kê CSAT tổng quan
 */
exports.getCSATStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Xây dựng date range filter
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) {
                dateFilter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                dateFilter.createdAt.$lte = new Date(endDate);
            }
        }

        const stats = await SessionRating.getCSATScore(dateFilter);

        return res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error getting CSAT stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê CSAT'
        });
    }
};

/**
 * Lấy trend đánh giá theo thời gian
 */
exports.getRatingTrend = async (req, res) => {
    try {
        const { period = 'daily', limit = 30 } = req.query;
        
        let groupBy;
        switch (period) {
            case 'hourly':
                groupBy = {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' },
                    hour: { $hour: '$createdAt' }
                };
                break;
            case 'weekly':
                groupBy = {
                    year: { $year: '$createdAt' },
                    week: { $week: '$createdAt' }
                };
                break;
            case 'monthly':
                groupBy = {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                };
                break;
            default: // daily
                groupBy = {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                };
        }

        const pipeline = [
            {
                $match: {
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: groupBy,
                    totalRatings: { $sum: 1 },
                    avgRating: { $avg: '$rating' },
                    positiveRatings: {
                        $sum: {
                            $cond: [{ $gte: ['$rating', 4] }, 1, 0]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    totalRatings: 1,
                    avgRating: { $round: ['$avgRating', 2] },
                    positiveRatings: 1,
                    csatScore: {
                        $round: [
                            {
                                $multiply: [
                                    { $divide: ['$positiveRatings', '$totalRatings'] },
                                    100
                                ]
                            },
                            2
                        ]
                    }
                }
            },
            {
                $sort: { '_id': -1 }
            },
            {
                $limit: parseInt(limit)
            }
        ];

        const trend = await SessionRating.aggregate(pipeline);

        return res.status(200).json({
            success: true,
            data: trend
        });

    } catch (error) {
        console.error('Error getting rating trend:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy trend đánh giá'
        });
    }
};

/**
 * Lấy danh sách ratings với phân trang
 */
exports.getSessionRatings = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            rating, 
            ratingType,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Xây dựng filter
        let filter = { status: 'completed' };
        
        if (rating) {
            filter.rating = parseInt(rating);
        }
        
        if (ratingType) {
            filter.ratingType = ratingType;
        }
        
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // Xây dựng sort
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [ratings, total] = await Promise.all([
            SessionRating.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .select('-userIP -userAgent'),
            SessionRating.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            data: {
                ratings,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error getting session ratings:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách đánh giá'
        });
    }
};
