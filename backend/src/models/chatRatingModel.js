const mongoose = require('mongoose');

/**
 * Schema cho đánh giá chatbot theo phiên
 * Lưu trữ rating của user cho toàn bộ phiên hội thoại
 */
const chatRatingSchema = new mongoose.Schema({
    // ID phiên hội thoại
    sessionId: {
        type: String,
        required: true,
        unique: true, // Mỗi session chỉ có 1 rating
        index: true,
        trim: true
    },

    // Điểm đánh giá từ 1-5
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
            validator: function(v) {
                return Number.isInteger(v) && v >= 1 && v <= 5;
            },
            message: 'Rating phải là số nguyên từ 1 đến 5'
        }
    },

    // Feedback text (optional)
    feedback: {
        type: String,
        trim: true,
        maxlength: 1000, // Tăng lên 1000 ký tự cho feedback phiên
        default: ''
    },

    // IP address của user (để phân tích)
    userIP: {
        type: String,
        trim: true,
        default: ''
    },

    // Loại đánh giá
    ratingType: {
        type: String,
        enum: ['session_end', 'problem_solved', 'manual'],
        default: 'manual',
        index: true
    },
    
    // User Agent (để phân tích)
    userAgent: {
        type: String,
        trim: true,
        default: ''
    },
    
    // Thời gian tạo rating
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    // Thời gian cập nhật (nếu user thay đổi rating)
    updatedAt: {
        type: Date,
        default: Date.now
    },
    
    // Trạng thái rating
    status: {
        type: String,
        enum: ['active', 'hidden', 'deleted'],
        default: 'active',
        index: true
    },

    // Thống kê phiên hội thoại
    sessionStats: {
        // Tổng số tin nhắn trong phiên
        totalMessages: {
            type: Number,
            min: 0,
            default: 0
        },

        // Số tin nhắn của user
        userMessages: {
            type: Number,
            min: 0,
            default: 0
        },

        // Số tin nhắn của bot
        botMessages: {
            type: Number,
            min: 0,
            default: 0
        },

        // Thời gian phiên (phút)
        sessionDuration: {
            type: Number,
            min: 0,
            default: 0
        },

        // Thời gian phản hồi trung bình (ms)
        avgResponseTime: {
            type: Number,
            min: 0,
            default: 0
        },

        // Có giải quyết được vấn đề không
        problemSolved: {
            type: Boolean,
            default: false
        },

        // Chủ đề chính của cuộc hội thoại
        mainTopics: [{
            type: String,
            trim: true
        }],

        // Có thông tin tour được cung cấp không
        tourInfoProvided: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true, // Tự động thêm createdAt và updatedAt
    collection: 'chat_ratings'
});

// Indexes để tối ưu query
chatRatingSchema.index({ sessionId: 1, messageId: 1 }, { unique: true }); // Mỗi message chỉ được rate 1 lần
chatRatingSchema.index({ createdAt: -1 }); // Sắp xếp theo thời gian
chatRatingSchema.index({ rating: 1 }); // Lọc theo rating
chatRatingSchema.index({ status: 1, createdAt: -1 }); // Lọc theo status và thời gian

// Virtual để tính CSAT category
chatRatingSchema.virtual('csatCategory').get(function() {
    if (this.rating >= 4) return 'satisfied'; // 4-5 sao = hài lòng
    if (this.rating === 3) return 'neutral';  // 3 sao = trung tính
    return 'dissatisfied'; // 1-2 sao = không hài lòng
});

// Static methods để tính toán thống kê
chatRatingSchema.statics.getCSATStats = async function(dateFrom, dateTo, sessionId = null) {
    const matchConditions = {
        status: 'active',
        createdAt: {
            $gte: dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 ngày trước
            $lte: dateTo || new Date()
        }
    };
    
    if (sessionId) {
        matchConditions.sessionId = sessionId;
    }
    
    const stats = await this.aggregate([
        { $match: matchConditions },
        {
            $group: {
                _id: null,
                totalRatings: { $sum: 1 },
                averageRating: { $avg: '$rating' },
                rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
                rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                satisfied: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } },
                neutral: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                dissatisfied: { $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] } }
            }
        }
    ]);
    
    if (stats.length === 0) {
        return {
            totalRatings: 0,
            averageRating: 0,
            csatScore: 0,
            distribution: { rating1: 0, rating2: 0, rating3: 0, rating4: 0, rating5: 0 },
            satisfaction: { satisfied: 0, neutral: 0, dissatisfied: 0 },
            percentages: { satisfied: 0, neutral: 0, dissatisfied: 0 }
        };
    }
    
    const result = stats[0];
    const csatScore = result.totalRatings > 0 ? (result.satisfied / result.totalRatings) * 100 : 0;
    
    return {
        totalRatings: result.totalRatings,
        averageRating: Math.round(result.averageRating * 100) / 100,
        csatScore: Math.round(csatScore * 100) / 100,
        distribution: {
            rating1: result.rating1,
            rating2: result.rating2,
            rating3: result.rating3,
            rating4: result.rating4,
            rating5: result.rating5
        },
        satisfaction: {
            satisfied: result.satisfied,
            neutral: result.neutral,
            dissatisfied: result.dissatisfied
        },
        percentages: {
            satisfied: Math.round((result.satisfied / result.totalRatings) * 10000) / 100,
            neutral: Math.round((result.neutral / result.totalRatings) * 10000) / 100,
            dissatisfied: Math.round((result.dissatisfied / result.totalRatings) * 10000) / 100
        }
    };
};

// Static method để lấy trend theo thời gian
chatRatingSchema.statics.getRatingTrend = async function(days = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const trend = await this.aggregate([
        {
            $match: {
                status: 'active',
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                averageRating: { $avg: '$rating' },
                totalRatings: { $sum: 1 },
                satisfied: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } }
            }
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
    ]);
    
    return trend.map(item => ({
        date: new Date(item._id.year, item._id.month - 1, item._id.day),
        averageRating: Math.round(item.averageRating * 100) / 100,
        totalRatings: item.totalRatings,
        csatScore: item.totalRatings > 0 ? Math.round((item.satisfied / item.totalRatings) * 10000) / 100 : 0
    }));
};

// Middleware để cập nhật updatedAt khi có thay đổi
chatRatingSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = new Date();
    }
    next();
});

// Export model
const ChatRating = mongoose.model('ChatRating', chatRatingSchema);

module.exports = ChatRating;
