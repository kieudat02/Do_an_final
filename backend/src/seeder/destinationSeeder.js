const Destination = require('../models/destinationModel');

const destinations = [
    {
        name: "Vịnh Hạ Long",
        info: "Di sản thiên nhiên thế giới với hàng ngàn đảo đá vôi",
        country: "Việt Nam",
        continent: "Châu Á",
        type: "Trong nước",
        status: "Hoạt động"
    },
    {
        name: "Singapore",
        info: "Quốc gia đảo hiện đại với kiến trúc độc đáo",
        country: "Singapore",
        continent: "Châu Á",
        type: "Nước ngoài",
        status: "Hoạt động"
    },
    {
        name: "Phú Quốc",
        info: "Đảo ngọc của Việt Nam với bãi biển tuyệt đẹp",
        country: "Việt Nam",
        continent: "Châu Á",
        type: "Trong nước",
        status: "Hoạt động"
    },
    {
        name: "Sapa",
        info: "Vùng núi phía Bắc với ruộng bậc thang tuyệt đẹp",
        country: "Việt Nam",
        continent: "Châu Á",
        type: "Trong nước",
        status: "Hoạt động"
    },
    {
        name: "Huế",
        info: "Cố đô Việt Nam với nhiều di tích lịch sử",
        country: "Việt Nam",
        continent: "Châu Á",
        type: "Trong nước",
        status: "Hoạt động"
    },
    {
        name: "Đà Lạt",
        info: "Thành phố ngàn hoa với khí hậu mát mẻ",
        country: "Việt Nam",
        continent: "Châu Á",
        type: "Trong nước",
        status: "Hoạt động"
    },
    {
        name: "TP. Hồ Chí Minh",
        info: "Thành phố năng động nhất Việt Nam",
        country: "Việt Nam",
        continent: "Châu Á",
        type: "Trong nước",
        status: "Hoạt động"
    },
    {
        name: "Cần Thơ",
        info: "Thủ phủ miền Tây với văn hóa sông nước",
        country: "Việt Nam",
        continent: "Châu Á",
        type: "Trong nước",
        status: "Hoạt động"
    },
    {
        name: "Kuala Lumpur",
        info: "Thủ đô Malaysia với tòa nhà đôi Petronas",
        country: "Malaysia",
        continent: "Châu Á",
        type: "Nước ngoài",
        status: "Hoạt động"
    },
    {
        name: "Bangkok",
        info: "Thủ đô Thái Lan với đền chùa cổ kính",
        country: "Thái Lan",
        continent: "Châu Á",
        type: "Nước ngoài",
        status: "Hoạt động"
    }
];

const seedDestinations = async () => {
    try {
        // Xóa dữ liệu cũ
        await Destination.deleteMany({});

        // Thêm dữ liệu mới
        const savedDestinations = await Destination.insertMany(destinations);

        return savedDestinations;
    } catch (error) {
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
            return seedDestinations();
        })
        .then(() => {
            console.log('✅ Seed điểm đến hoàn thành');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Lỗi:', error);
            process.exit(1);
        });
}

module.exports = { seedDestinations };
