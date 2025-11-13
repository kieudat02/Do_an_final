const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false 
    },
    tour: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tour',
        required: [true, 'Tour ID là bắt buộc']
    },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false 
    },
    rating: {
        type: Number,
        required: [true, 'Rating là bắt buộc'],
        min: [1, 'Rating tối thiểu là 1'],
        max: [5, 'Rating tối đa là 5']
    },
    comment: {
        type: String,
        required: [true, 'Comment là bắt buộc'],
        trim: true,
        maxlength: [1000, 'Comment không được vượt quá 1000 ký tự']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'hidden', 'deleted'],
        default: 'pending'
    },
    isVerifiedPurchase: {
        type: Boolean,
        default: false
    },
    helpfulCount: {
        type: Number,
        default: 0
    },
    // Thông tin khách hàng cho anonymous reviews
    customerName: {
        type: String,
        required: false 
    },
    customerEmail: {
        type: String,
        required: false
    },
    createdBy: {
        type: String,
        default: 'User'
    },
    updatedBy: {
        type: String,
        default: 'User'
    }
}, {
    timestamps: true
});

// Indexes for better performance
reviewSchema.index({ tour: 1, createdAt: -1 });
reviewSchema.index({ booking: 1 }, { unique: true, sparse: true }); 
reviewSchema.index({ rating: 1 });
reviewSchema.index({ status: 1 });

// Virtual for formatted date
reviewSchema.virtual('formattedDate').get(function() {
    return this.createdAt.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// Static method to calculate average rating for a tour
reviewSchema.statics.calculateAverageRating = async function(tourId) {
    const stats = await this.aggregate([
        {
            $match: {
                tour: new mongoose.Types.ObjectId(tourId),
                status: 'approved'
            }
        },
        {
            $group: {
                _id: '$tour',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    if (stats.length > 0) {
        return {
            averageRating: Math.round(stats[0].averageRating * 10) / 10, // Round to 1 decimal
            totalReviews: stats[0].totalReviews
        };
    } else {
        return {
            averageRating: 0,
            totalReviews: 0
        };
    }
};

// Method to check if user can review this tour
reviewSchema.statics.canUserReview = async function(userId, tourId) {
    // Check if user has already reviewed this tour
    const existingReview = await this.findOne({ user: userId, tour: tourId });
    if (existingReview) {
        return { canReview: false, reason: 'Bạn đã đánh giá tour này rồi' };
    }

    // For now, allow all authenticated users to review
    return { canReview: true };
};

// Method to check if booking can be reviewed
reviewSchema.statics.canBookingReview = async function(bookingId) {
    // Check if booking has already been reviewed
    const existingReview = await this.findOne({ booking: bookingId });
    if (existingReview) {
        return { canReview: false, reason: 'Đơn đặt tour này đã được đánh giá rồi' };
    }

    return { canReview: true };
};

// Pre-save middleware to update tour statistics
reviewSchema.post('save', async function() {
    const Tour = mongoose.model('Tour');
    const stats = await this.constructor.calculateAverageRating(this.tour);
    
    await Tour.findByIdAndUpdate(this.tour, {
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews
    });
});

// Pre-remove middleware to update tour statistics
reviewSchema.post('remove', async function() {
    const Tour = mongoose.model('Tour');
    const stats = await this.constructor.calculateAverageRating(this.tour);
    
    await Tour.findByIdAndUpdate(this.tour, {
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews
    });
});

module.exports = mongoose.model('Review', reviewSchema);
