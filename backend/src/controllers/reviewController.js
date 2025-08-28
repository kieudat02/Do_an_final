const Review = require('../models/reviewModel');
const Tour = require('../models/tourModel');
const User = require('../models/userModel');

// Lấy danh sách reviews của một tour
exports.getReviewsByTour = async (req, res) => {
    try {
        const { tourId } = req.params;
        const { page = 1, limit = 10, status = 'approved' } = req.query;

        // Kiểm tra tour có tồn tại không
        const tour = await Tour.findById(tourId);
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: 'Tour không tồn tại'
            });
        }

        const skip = (page - 1) * limit;
        
        const reviews = await Review.find({
            tour: tourId,
            status: status
        })
        .populate('user', 'fullName avatar')
        .select('user tour rating comment status customerName customerEmail createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        const total = await Review.countDocuments({ 
            tour: tourId, 
            status: status 
        });

        // Tính toán thống kê rating
        const ratingStats = await Review.aggregate([
            { $match: { tour: tour._id, status: 'approved' } },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                reviews,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    limit: parseInt(limit),
                    totalReviews: total
                },
                ratingStats,
                averageRating: tour.averageRating,
                totalReviews: tour.totalReviews
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy danh sách đánh giá'
        });
    }
};

// Tạo review mới
exports.createReview = async (req, res) => {
    try {
        const { tourId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!rating || !comment) {
            return res.status(400).json({
                success: false,
                message: 'Rating và comment là bắt buộc'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating phải từ 1 đến 5'
            });
        }

        // Kiểm tra tour có tồn tại không
        const tour = await Tour.findById(tourId);
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: 'Tour không tồn tại'
            });
        }

        // Kiểm tra user có thể review không
        const canReview = await Review.canUserReview(userId, tourId);
        if (!canReview.canReview) {
            return res.status(400).json({
                success: false,
                message: canReview.reason
            });
        }

        // Kiểm tra comment có nội dung thực sự không (không chỉ là khoảng trắng)
        const trimmedComment = comment.trim();
        if (trimmedComment.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Nội dung đánh giá phải có ít nhất 10 ký tự'
            });
        }

        // Kiểm tra comment có chứa nội dung spam không
        const spamKeywords = ['spam', 'fake', 'test', 'aaaa', 'bbbb', 'cccc'];
        const isSpam = spamKeywords.some(keyword =>
            trimmedComment.toLowerCase().includes(keyword.toLowerCase())
        );

        // Tạo review mới
        const review = new Review({
            user: userId,
            tour: tourId,
            rating: parseInt(rating),
            comment: trimmedComment,
            status: isSpam ? 'pending' : 'approved', // Spam reviews cần được duyệt thủ công
            isVerifiedPurchase: false // Có thể cập nhật logic này sau
        });

        await review.save();

        // Populate user info for response
        await review.populate('user', 'fullName avatar');

        res.status(201).json({
            success: true,
            message: 'Đánh giá đã được tạo thành công',
            data: review
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã đánh giá tour này rồi'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi tạo đánh giá'
        });
    }
};

// Cập nhật review
exports.updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user.id;

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Đánh giá không tồn tại'
            });
        }

        // Kiểm tra quyền sở hữu
        if (review.user.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền chỉnh sửa đánh giá này'
            });
        }

        // Validate input
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({
                success: false,
                message: 'Rating phải từ 1 đến 5'
            });
        }

        // Cập nhật review
        if (rating) review.rating = parseInt(rating);
        if (comment) review.comment = comment.trim();
        review.updatedBy = 'User';

        await review.save();
        await review.populate('user', 'fullName avatar');

        res.json({
            success: true,
            message: 'Đánh giá đã được cập nhật thành công',
            data: review
        });

    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi cập nhật đánh giá'
        });
    }
};

// Xóa review
exports.deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Đánh giá không tồn tại'
            });
        }

        // Kiểm tra quyền sở hữu hoặc admin
        if (review.user.toString() !== userId && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xóa đánh giá này'
            });
        }

        await review.remove();

        res.json({
            success: true,
            message: 'Đánh giá đã được xóa thành công'
        });

    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi xóa đánh giá'
        });
    }
};

// Lấy review theo ID
exports.getReviewById = async (req, res) => {
    try {
        const { reviewId } = req.params;

        const review = await Review.findById(reviewId)
            .populate('user', 'fullName avatar')
            .populate('tour', 'title code')
            .select('user tour rating comment status customerName customerEmail createdAt updatedAt');

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Đánh giá không tồn tại'
            });
        }

        res.json({
            success: true,
            data: review
        });

    } catch (error) {
        console.error('Error getting review:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy thông tin đánh giá'
        });
    }
};

// Admin: Lấy tất cả reviews với phân trang và lọc
exports.getAllReviews = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status, 
            rating, 
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const filter = {};
        
        if (status) filter.status = status;
        if (rating) filter.rating = parseInt(rating);
        if (search) {
            filter.$or = [
                { comment: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const reviews = await Review.find(filter)
            .populate('user', 'fullName email avatar')
            .populate('tour', 'title code')
            .select('user tour rating comment status customerName customerEmail createdAt updatedAt')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Review.countDocuments(filter);

        res.json({
            success: true,
            data: {
                reviews,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    limit: parseInt(limit),
                    totalReviews: total
                }
            }
        });

    } catch (error) {
        console.error('Error getting all reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy danh sách đánh giá'
        });
    }
};

// Admin: Cập nhật trạng thái review
exports.updateReviewStatus = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { status } = req.body;

        if (!['pending', 'approved', 'rejected', 'hidden', 'deleted'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ'
            });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Đánh giá không tồn tại'
            });
        }

        review.status = status;
        review.updatedBy = req.user.fullName || 'Admin';
        await review.save();

        res.json({
            success: true,
            message: 'Trạng thái đánh giá đã được cập nhật',
            data: review
        });

    } catch (error) {
        console.error('Error updating review status:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi cập nhật trạng thái đánh giá'
        });
    }
};

// Hiển thị trang quản lý reviews
exports.getReviewsPage = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = '',
            rating = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = {};

        if (status) filter.status = status;
        if (rating) filter.rating = parseInt(rating);
        if (search) {
            filter.$or = [
                { comment: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .populate('user', 'fullName email avatar')
                .populate('tour', 'title code')
                .select('user tour rating comment status customerName customerEmail createdAt updatedAt')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Review.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);

        res.render('review', {
            reviews,
            pagination: {
                current: parseInt(page),
                total: totalPages,
                limit: parseInt(limit),
                hasNext: page < totalPages,
                hasPrev: page > 1,
                totalReviews: total
            },
            query: req.query,
            userPermissions: res.locals.userPermissions
        });

    } catch (error) {
        console.error('Error getting reviews page:', error);
        req.flash('error', 'Có lỗi xảy ra khi tải danh sách đánh giá');
        res.redirect('/dashboard');
    }
};

// API toggle status cho web
exports.toggleReviewStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await Review.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Đánh giá không tồn tại'
            });
        }

        //Chu kỳ thông qua trạng thái: đang chờ xử lý -> Được chấp thuận -> bị từ chối -> đang chờ xử lý
        let newStatus;
        switch (review.status) {
            case 'pending':
                newStatus = 'approved';
                break;
            case 'approved':
                newStatus = 'rejected';
                break;
            case 'rejected':
                newStatus = 'pending';
                break;
            default:
                newStatus = 'pending';
        }

        review.status = newStatus;
        review.updatedBy = req.user.fullName || 'Admin';
        await review.save();

        res.json({
            success: true,
            message: `Trạng thái đánh giá đã được cập nhật thành ${newStatus}`,
            data: {
                status: newStatus,
                statusText: newStatus === 'approved' ? 'Đã duyệt' :
                           newStatus === 'rejected' ? 'Từ chối' : 'Chờ duyệt'
            }
        });

    } catch (error) {
        console.error('Error toggling review status:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi cập nhật trạng thái'
        });
    }
};

// Xóa review (web)
exports.deleteReviewWeb = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await Review.findById(id);

        if (!review) {
            req.flash('error', 'Đánh giá không tồn tại');
            return res.redirect('/review');
        }

        await review.remove();
        req.flash('message', 'Đánh giá đã được xóa thành công');
        res.redirect('/review');

    } catch (error) {
        console.error('Error deleting review:', error);
        req.flash('error', 'Có lỗi xảy ra khi xóa đánh giá');
        res.redirect('/review');
    }
};

// Admin API: Phê duyệt đánh giá
exports.approveReview = async (req, res) => {
    try {
        const { id } = req.params;

        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Đánh giá không tồn tại'
            });
        }

        review.status = 'approved';
        review.updatedBy = req.user ? req.user.fullName || req.user.email : 'Admin';
        await review.save();

        res.json({
            success: true,
            message: 'Đánh giá đã được phê duyệt',
            data: {
                id: review._id,
                status: review.status,
                updatedAt: review.updatedAt
            }
        });

    } catch (error) {
        console.error('Error approving review:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi phê duyệt đánh giá'
        });
    }
};

// Admin API: Ẩn đánh giá
exports.hideReview = async (req, res) => {
    try {
        const { id } = req.params;

        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Đánh giá không tồn tại'
            });
        }

        review.status = 'hidden';
        review.updatedBy = req.user ? req.user.fullName || req.user.email : 'Admin';
        await review.save();

        res.json({
            success: true,
            message: 'Đánh giá đã được ẩn',
            data: {
                id: review._id,
                status: review.status,
                updatedAt: review.updatedAt
            }
        });

    } catch (error) {
        console.error('Error hiding review:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi ẩn đánh giá'
        });
    }
};

// Admin API: Xóa mềm đánh giá
exports.softDeleteReview = async (req, res) => {
    try {
        const { id } = req.params;

        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Đánh giá không tồn tại'
            });
        }

        review.status = 'deleted';
        review.updatedBy = req.user ? req.user.fullName || req.user.email : 'Admin';
        await review.save();

        res.json({
            success: true,
            message: 'Đánh giá đã được xóa',
            data: {
                id: review._id,
                status: review.status,
                updatedAt: review.updatedAt
            }
        });

    } catch (error) {
        console.error('Error soft deleting review:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi xóa đánh giá'
        });
    }
};

// Admin API: Khôi phục đánh giá từ trạng thái deleted/hidden
exports.restoreReview = async (req, res) => {
    try {
        const { id } = req.params;

        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Đánh giá không tồn tại'
            });
        }

        // Khôi phục về pending để admin có thể review lại
        review.status = 'pending';
        review.updatedBy = req.user ? req.user.fullName || req.user.email : 'Admin';
        await review.save();

        res.json({
            success: true,
            message: 'Đánh giá đã được khôi phục',
            data: {
                id: review._id,
                status: review.status,
                updatedAt: review.updatedAt
            }
        });

    } catch (error) {
        console.error('Error restoring review:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi khôi phục đánh giá'
        });
    }
};
