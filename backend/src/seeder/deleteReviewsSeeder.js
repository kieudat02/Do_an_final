const mongoose = require('mongoose');
const Review = require('../models/reviewModel');
require('dotenv').config();
require('../config/database');

const deleteAllReviews = async () => {
  try {
    console.log('🗑️ Bắt đầu xóa tất cả đánh giá...');

    // Đếm số đánh giá hiện tại
    const reviewCount = await Review.countDocuments();
    console.log(`📊 Tìm thấy ${reviewCount} đánh giá trong database`);

    if (reviewCount === 0) {
      console.log('✅ Database đã sạch, không có đánh giá nào để xóa');
      return;
    }

    // Xóa tất cả đánh giá
    const result = await Review.deleteMany({});
    console.log(`✅ Đã xóa thành công ${result.deletedCount} đánh giá`);

    // Kiểm tra lại để đảm bảo đã xóa hết
    const remainingCount = await Review.countDocuments();
    if (remainingCount === 0) {
      console.log('🎉 Hoàn thành! Tất cả đánh giá đã được xóa khỏi database');
    } else {
      console.log(`⚠️ Cảnh báo: Vẫn còn ${remainingCount} đánh giá trong database`);
    }

    // Disconnect from database only if this file is run directly
    if (require.main === module) {
      mongoose.disconnect();
    }
  } catch (error) {
    console.error('❌ Lỗi khi xóa đánh giá:', error);
    if (require.main === module) {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

// Export function for use in other seeders
module.exports = deleteAllReviews;

// Run the seeder if this file is run directly
if (require.main === module) {
  // Make sure database connection is established
  const options = {
    user: process.env.DB_USER,
    pass: process.env.DB_PASSWORD,
  };

  mongoose.connect(process.env.DB_CONNECTION_STRING, options)
    .then(() => {
      console.log('🔌 Kết nối database thành công');
      return deleteAllReviews();
    })
    .catch((error) => {
      console.error('❌ Lỗi kết nối database:', error);
      process.exit(1);
    });
}

// cd backend
// node src/seeder/deleteReviewsSeeder.js