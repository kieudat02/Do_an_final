const mongoose = require('mongoose');
const Order = require('../models/orderModel');
require('dotenv').config();
require('../config/database');

const deleteAllOrders = async () => {
  try {
    console.log('🗑️ Bắt đầu xóa tất cả đơn hàng...');

    // Đếm số đơn hàng hiện tại
    const orderCount = await Order.countDocuments();
    console.log(`📊 Tìm thấy ${orderCount} đơn hàng trong database`);

    if (orderCount === 0) {
      console.log('✅ Database đã sạch, không có đơn hàng nào để xóa');
      return;
    }

    // Xóa tất cả đơn hàng
    const result = await Order.deleteMany({});
    console.log(`✅ Đã xóa thành công ${result.deletedCount} đơn hàng`);

    // Kiểm tra lại để đảm bảo đã xóa hết
    const remainingCount = await Order.countDocuments();
    if (remainingCount === 0) {
      console.log('🎉 Hoàn thành! Tất cả đơn hàng đã được xóa khỏi database');
    } else {
      console.log(`⚠️ Cảnh báo: Vẫn còn ${remainingCount} đơn hàng trong database`);
    }

    // Disconnect from database only if this file is run directly
    if (require.main === module) {
      mongoose.disconnect();
    }
  } catch (error) {
    console.error('❌ Lỗi khi xóa đơn hàng:', error);
    if (require.main === module) {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

// Run the seeder if this file is run directly
if (require.main === module) {
  // Make sure database connection is established
  const options = {
    user: process.env.DB_USER,
    pass: process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  };

  mongoose
    .connect(process.env.DB_HOST, options)
    .then(() => {
      console.log("✅ Đã kết nối database");
      return deleteAllOrders();
    })
    .then(() => {
      mongoose.disconnect();
      console.log("🔌 Đã ngắt kết nối database");
    })
    .catch((error) => {
      console.error("❌ Lỗi:", error);
      mongoose.disconnect();
    });
}

module.exports = deleteAllOrders;

// cd backend
// node src/seeder/deleteOrdersSeeder.js