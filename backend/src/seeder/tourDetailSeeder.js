const TourDetail = require("../models/tourDetailModel");
const Tour = require("../models/tourModel");

// Dữ liệu mẫu cho tour details với discount
const tourDetailSamples = [
    {
        tourCode: "TC001", // Tour Mù Cang Chải
        details: [
            {
                adultPrice: 20000000, // Giá gốc cao hơn để có discount
                childrenPrice: 15000000,
                childPrice: 10000000,
                babyPrice: 0,
                singleRoomSupplementPrice: 500000,
                discount: 20, // Giảm 20%
                stock: 20,
                dayStart: new Date('2025-09-15'),
                dayReturn: new Date('2025-09-17')
            },
            {
                adultPrice: 20000000,
                childrenPrice: 15000000,
                childPrice: 10000000,
                babyPrice: 0,
                singleRoomSupplementPrice: 500000,
                discount: 15, // Giảm 15%
                stock: 15,
                dayStart: new Date('2025-10-01'),
                dayReturn: new Date('2025-10-03')
            }
        ]
    },
    {
        tourCode: "TTQ-525576", // Tour Trung Quốc
        details: [
            {
                adultPrice: 25000000, // Giá gốc cao hơn để có discount
                childrenPrice: 18750000,
                childPrice: 12500000,
                babyPrice: 5000000,
                singleRoomSupplementPrice: 1000000,
                discount: 30, // Giảm 30%
                stock: 25,
                dayStart: new Date('2025-09-20'),
                dayReturn: new Date('2025-09-25')
            },
            {
                adultPrice: 25000000,
                childrenPrice: 18750000,
                childPrice: 12500000,
                babyPrice: 5000000,
                singleRoomSupplementPrice: 1000000,
                discount: 25, // Giảm 25%
                stock: 20,
                dayStart: new Date('2025-10-05'),
                dayReturn: new Date('2025-10-10')
            }
        ]
    }
];

const seedTourDetails = async () => {
    try {
        console.log('🌱 Bắt đầu seed dữ liệu tour details...');

        // Xóa dữ liệu cũ
        await TourDetail.deleteMany({});
        console.log('✅ Đã xóa dữ liệu tour details cũ');

        // Lấy tất cả tours
        const tours = await Tour.find({}).lean();
        console.log(`📋 Tìm thấy ${tours.length} tour`);

        // Tạo map tour code -> tour ID
        const tourMap = {};
        tours.forEach(tour => {
            tourMap[tour.code] = tour._id;
        });

        let totalCreated = 0;

        // Tạo tour details cho từng tour
        for (const sample of tourDetailSamples) {
            const tourId = tourMap[sample.tourCode];
            if (!tourId) {
                console.log(`⚠️ Không tìm thấy tour với code: ${sample.tourCode}`);
                continue;
            }

            for (const detail of sample.details) {
                const tourDetail = await TourDetail.create({
                    tourId,
                    adultPrice: detail.adultPrice,
                    childrenPrice: detail.childrenPrice,
                    childPrice: detail.childPrice,
                    babyPrice: detail.babyPrice,
                    singleRoomSupplementPrice: detail.singleRoomSupplementPrice,
                    discount: detail.discount,
                    stock: detail.stock,
                    dayStart: detail.dayStart,
                    dayReturn: detail.dayReturn
                });

                totalCreated++;
                console.log(`✅ Đã tạo tour detail cho ${sample.tourCode} - Discount: ${detail.discount}%`);
            }
        }

        console.log(`🎉 Hoàn thành seed ${totalCreated} tour details!`);
        return totalCreated;

    } catch (error) {
        console.error('❌ Lỗi khi seed dữ liệu tour details:', error);
        throw error;
    }
};

// Chạy seeder nếu file được gọi trực tiếp
if (require.main === module) {
    const mongoose = require('mongoose');
    require('dotenv').config();
    
    const options = {
        user: process.env.DB_USER,
        pass: process.env.DB_PASSWORD,
        dbName: process.env.DB_NAME,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
    };

    mongoose.connect(process.env.DB_HOST, options)
        .then(() => {
            console.log('📦 Kết nối database thành công');
            return seedTourDetails();
        })
        .then(() => {
            console.log('✅ Seed tour details hoàn thành');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Lỗi:', error);
            process.exit(1);
        });
}

module.exports = { seedTourDetails };
