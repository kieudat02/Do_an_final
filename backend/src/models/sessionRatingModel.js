const mongoose = require('mongoose');

/**
 * Schema cho đánh giá phiên hội thoại chatbot
 * Thay thế việc đánh giá từng tin nhắn bằng đánh giá toàn phiên
 */
const sessionRatingSchema = new mongoose.Schema({
    // ID phiên hội thoại (unique)
    sessionId: {
        type: String,
        required: true,
        unique: true,
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
        maxlength: 1000,
        default: ''
    },
    
    // Loại đánh giá
    ratingType: {
        type: String,
        enum: ['session_end', 'problem_solved', 'manual', 'auto_prompt'],
        default: 'manual',
        index: true
    },
    
    // Trigger - khi nào đánh giá được kích hoạt
    ratingTrigger: {
        type: String,
        enum: ['user_initiated', 'session_timeout', 'problem_completion', 'conversation_end'],
        default: 'user_initiated'
    },
    
    // IP address của user
    userIP: {
        type: String,
        trim: true,
        default: ''
    },
    
    // User Agent
    userAgent: {
        type: String,
        trim: true,
        default: ''
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
        },
        
        // Thời gian bắt đầu phiên
        sessionStartTime: {
            type: Date,
            default: Date.now
        },
        
        // Thời gian kết thúc phiên
        sessionEndTime: {
            type: Date
        }
    },
    
    // Trạng thái đánh giá
    status: {
        type: String,
        enum: ['pending', 'completed', 'skipped'],
        default: 'completed',
        index: true
    },
    
    // Có hiển thị prompt đánh giá không
    promptShown: {
        type: Boolean,
        default: false
    },
    
    // Số lần prompt được hiển thị
    promptCount: {
        type: Number,
        min: 0,
        default: 1
    }
}, {
    timestamps: true,
    collection: 'session_ratings'
});

// Indexes để tối ưu query
sessionRatingSchema.index({ sessionId: 1 });
sessionRatingSchema.index({ rating: 1 });
sessionRatingSchema.index({ ratingType: 1 });
sessionRatingSchema.index({ createdAt: -1 });
sessionRatingSchema.index({ 'sessionStats.problemSolved': 1 });

// Virtual để tính CSAT score
sessionRatingSchema.virtual('isPositive').get(function() {
    return this.rating >= 4; // 4-5 sao được coi là positive
});

// Static methods
sessionRatingSchema.statics.getCSATScore = async function(dateRange = {}) {
    const pipeline = [
        {
            $match: {
                ...dateRange,
                status: 'completed'
            }
        },
        {
            $group: {
                _id: null,
                totalRatings: { $sum: 1 },
                positiveRatings: {
                    $sum: {
                        $cond: [{ $gte: ['$rating', 4] }, 1, 0]
                    }
                },
                avgRating: { $avg: '$rating' }
            }
        },
        {
            $project: {
                _id: 0,
                totalRatings: 1,
                positiveRatings: 1,
                avgRating: { $round: ['$avgRating', 2] },
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
        }
    ];
    
    const result = await this.aggregate(pipeline);
    return result[0] || {
        totalRatings: 0,
        positiveRatings: 0,
        avgRating: 0,
        csatScore: 0
    };
};

// Instance methods
sessionRatingSchema.methods.markAsCompleted = function() {
    this.status = 'completed';
    this.sessionStats.sessionEndTime = new Date();
    return this.save();
};

module.exports = mongoose.model('SessionRating', sessionRatingSchema);
