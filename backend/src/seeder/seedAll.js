const mongoose = require("mongoose");
require("dotenv").config();

// Import seeder cần thiết
const seedPermissions = require("./permissionSeeder");

const seedAll = async () => {
    try {
        // Chỉ seed permissions để tránh ảnh hưởng đến các module khác
        await seedPermissions();

    } catch (error) {
        throw error;
    }
};

// Chạy nếu file được gọi trực tiếp
if (require.main === module) {
    // Load environment variables
    require("dotenv").config();

    // Kết nối database với cùng config như main app
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
            return seedAll();
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

module.exports = seedAll;
