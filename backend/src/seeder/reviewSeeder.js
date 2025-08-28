const Review = require('../models/reviewModel');
const Tour = require('../models/tourModel');
const User = require('../models/userModel');

// Dữ liệu mẫu cho reviews
const sampleReviews = [
    {
        rating: 5,
        comment: "Tour rất tuyệt vời! Hướng dẫn viên nhiệt tình, lịch trình hợp lý. Cảnh đẹp như mơ, đặc biệt là vịnh Hạ Long thật sự ngoạn mục. Sẽ quay lại lần nữa!",
        status: 'approved',
        isVerifiedPurchase: true,
        helpfulCount: 12
    },
    {
        rating: 4,
        comment: "Tour khá ổn, dịch vụ tốt. Chỉ có điều thời gian hơi gấp gáp một chút. Nhưng nhìn chung rất hài lòng với chuyến đi này. Giá cả hợp lý.",
        status: 'approved',
        isVerifiedPurchase: true,
        helpfulCount: 8
    },
    {
        rating: 5,
        comment: "Chuyến đi tuyệt vời nhất từ trước đến nay! Khách sạn 5 sao, ăn uống ngon miệng, HDV chuyên nghiệp. Cảm ơn công ty đã mang đến trải nghiệm tuyệt vời!",
        status: 'approved',
        isVerifiedPurchase: true,
        helpfulCount: 15
    },
    {
        rating: 4,
        comment: "Tour Singapore - Malaysia rất đáng tiền. Các điểm tham quan đều nổi tiếng và đẹp. Chỉ có điều thời tiết hơi nóng nhưng không ảnh hưởng đến chuyến đi.",
        status: 'approved',
        isVerifiedPurchase: false,
        helpfulCount: 6
    },
    {
        rating: 3,
        comment: "Tour bình thường, không có gì đặc biệt. Dịch vụ ổn nhưng chưa thật sự ấn tượng. Có thể cải thiện thêm về chất lượng bữa ăn.",
        status: 'approved',
        isVerifiedPurchase: true,
        helpfulCount: 3
    },
    {
        rating: 5,
        comment: "Tôi đã đi nhiều tour nhưng tour này thật sự xuất sắc! Từ khách sạn, ăn uống đến hướng dẫn viên đều rất chuyên nghiệp. Sẽ giới thiệu cho bạn bè!",
        status: 'approved',
        isVerifiedPurchase: true,
        helpfulCount: 20
    },
    {
        rating: 4,
        comment: "Chuyến đi Đà Lạt rất lãng mạn và thư giãn. Thời tiết mát mẻ, cảnh đẹp. Khách sạn tốt, dịch vụ chu đáo. Phù hợp cho các cặp đôi và gia đình.",
        status: 'approved',
        isVerifiedPurchase: true,
        helpfulCount: 9
    },
    {
        rating: 5,
        comment: "Tour Phú Quốc tuyệt vời! Biển xanh, cát trắng, hải sản tươi ngon. Resort 5 sao với dịch vụ đẳng cấp. Đây là kỳ nghỉ hoàn hảo cho gia đình tôi!",
        status: 'approved',
        isVerifiedPurchase: true,
        helpfulCount: 18
    }
];

// Tên người dùng mẫu
const sampleUserNames = [
    "Nguyễn Văn An",
    "Trần Thị Bình", 
    "Lê Hoàng Cường",
    "Phạm Thị Dung",
    "Hoàng Văn Em",
    "Vũ Thị Phương",
    "Đặng Minh Giang",
    "Bùi Thị Hoa"
];

const seedReviews = async () => {
    try {
        // Xóa tất cả reviews cũ
        await Review.deleteMany({});

        // Lấy danh sách tours và users
        const tours = await Tour.find({}).limit(4); // Lấy 4 tour đầu tiên
        const users = await User.find({}).limit(8); // Lấy 8 user đầu tiên

        if (tours.length === 0) {
            return;
        }

        if (users.length === 0) {
            return;
        }

        const reviewsToCreate = [];

        // Tạo reviews cho mỗi tour
        tours.forEach((tour, tourIndex) => {
            // Mỗi tour sẽ có 2 reviews
            const reviewsPerTour = 2;
            
            for (let i = 0; i < reviewsPerTour; i++) {
                const reviewIndex = (tourIndex * reviewsPerTour) + i;
                const userIndex = reviewIndex % users.length;
                const sampleIndex = reviewIndex % sampleReviews.length;

                reviewsToCreate.push({
                    user: users[userIndex]._id,
                    tour: tour._id,
                    rating: sampleReviews[sampleIndex].rating,
                    comment: sampleReviews[sampleIndex].comment,
                    status: sampleReviews[sampleIndex].status,
                    isVerifiedPurchase: sampleReviews[sampleIndex].isVerifiedPurchase,
                    helpfulCount: sampleReviews[sampleIndex].helpfulCount,
                    createdBy: 'Seeder',
                    updatedBy: 'Seeder'
                });
            }
        });

        // Tạo reviews
        const createdReviews = await Review.insertMany(reviewsToCreate);


        // Cập nhật thống kê cho các tours
        for (const tour of tours) {
            const stats = await Review.calculateAverageRating(tour._id);
            await Tour.findByIdAndUpdate(tour._id, {
                averageRating: stats.averageRating,
                totalReviews: stats.totalReviews
            });
        }



        return createdReviews;

    } catch (error) {
        console.error('❌ Lỗi khi seed Reviews:', error);
        throw error;
    }
};

module.exports = { seedReviews };
