const Transportation = require('../models/transportationModel');

const transportations = [
    {
        title: "Xe",
        information: "Xe bus đời mới, điều hòa, wifi miễn phí, ghế ngồi thoải mái",
        status: true,
        createdBy: "Super Admin",
        updatedBy: "Super Admin"
    },
    {
        title: "Máy bay",
        information: "Máy bay thương mại các hãng uy tín, an toàn và nhanh chóng",
        status: true,
        createdBy: "Super Admin",
        updatedBy: "Super Admin"
    }
];

const seedTransportations = async () => {
    try {
        console.log('🌱 Bắt đầu seed dữ liệu phương tiện...');

        // Xóa dữ liệu cũ
        await Transportation.deleteMany({});
        console.log('✅ Đã xóa dữ liệu phương tiện cũ');

        // Thêm dữ liệu mới
        const savedTransportations = await Transportation.insertMany(transportations);
        console.log(`✅ Đã thêm ${savedTransportations.length} phương tiện`);

        return savedTransportations;
    } catch (error) {
        console.error('❌ Lỗi khi seed dữ liệu phương tiện:', error);
        throw error;
    }
};

// Chạy seeder nếu file được gọi trực tiếp
if (require.main === module) {
    const mongoose = require('mongoose');
    require('dotenv').config();
    
    mongoose.connect(process.env.DATABASE_URL)
        .then(() => {
            console.log('📦 Kết nối database thành công');
            return seedTransportations();
        })
        .then(() => {
            console.log('✅ Seed phương tiện hoàn thành');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Lỗi:', error);
            process.exit(1);
        });
}

module.exports = { seedTransportations };
