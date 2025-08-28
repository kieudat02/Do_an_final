const Tour = require('../models/tourModel');
const Category = require('../models/categoriesModel');
const Departure = require('../models/departureModel');
const Destination = require('../models/destinationModel');
const Transportation = require('../models/transportationModel');

// Dữ liệu mẫu cho 6 tour theo 6 danh mục
const tours = [
    {
        title: "Tour Hạ Long tiêu chuẩn - Khám phá vịnh di sản thế giới",
        code: "TC001",
        price: 2500000,
        startDate: new Date('2025-08-15'),
        endDate: new Date('2025-08-17'),
        attractions: "Vịnh Hạ Long, Đảo Titop, Hang Sửng Sốt, Làng chài Cửa Vạn",
        cuisine: "Hải sản tươi sống, đặc sản Quảng Ninh",
        suitableTime: "Quanh năm, đặc biệt đẹp vào mùa thu",
        suitableObject: "Mọi lứa tuổi, gia đình có trẻ em",
        vehicleInfo: "Xe bus 45 chỗ đời mới",
        promotion: "Giảm 10% cho đoàn từ 10 người trở lên",
        itinerary: [
            {
                day: 1,
                title: "Hà Nội - Vịnh Hạ Long",
                details: "Khởi hành từ Hà Nội, tham quan Vịnh Hạ Long, ăn trưa trên thuyền"
            },
            {
                day: 2,
                title: "Khám phá đảo Titop - Hang Sửng Sốt",
                details: "Leo núi Titop ngắm toàn cảnh vịnh, khám phá hang động kỳ vĩ"
            },
            {
                day: 3,
                title: "Làng chài Cửa Vạn - Về Hà Nội",
                details: "Thăm làng chài truyền thống, mua sắm đặc sản, về Hà Nội"
            }
        ],
        categoryName: "Tour tiêu chuẩn",
        departureName: "Hà Nội",
        destinationName: "Vịnh Hạ Long",
        transportationName: "Xe"
    },
    {
        title: "Tour Singapore - Malaysia cao cấp 5 sao",
        code: "CC001",
        price: 25000000,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-05'),
        attractions: "Marina Bay Sands, Gardens by the Bay, Sentosa Resort World, Kuala Lumpur Twin Towers",
        cuisine: "Fine dining Singapore, Malaysia cao cấp",
        suitableTime: "Quanh năm",
        suitableObject: "Người trưởng thành, có khả năng tài chính cao",
        vehicleInfo: "Máy bay Business Class, xe limousine",
        promotion: "Tặng SIM 4G premium và city pass VIP",
        itinerary: [
            {
                day: 1,
                title: "TP.HCM - Singapore",
                details: "Bay Business Class đến Singapore, check-in khách sạn 5 sao"
            },
            {
                day: 2,
                title: "Singapore VIP Tour",
                details: "Gardens by the Bay VIP, Sentosa Resort World"
            },
            {
                day: 3,
                title: "Singapore - Kuala Lumpur",
                details: "Bay sang Malaysia, tham quan Twin Towers"
            },
            {
                day: 4,
                title: "Kuala Lumpur Premium",
                details: "Batu Caves VIP tour, shopping Bukit Bintang"
            },
            {
                day: 5,
                title: "Kuala Lumpur - TP.HCM",
                details: "Mua sắm duty free, bay Business Class về TP.HCM"
            }
        ],
        categoryName: "Tour cao cấp",
        departureName: "TP. Hồ Chí Minh",
        destinationName: "Singapore",
        transportationName: "Máy bay"
    },
    {
        title: "Tour lễ 2/9 - Sapa mùa vàng đặc biệt",
        code: "L29001",
        price: 4200000,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-03'),
        attractions: "Fansipan, Ruộng bậc thang mùa vàng, Bản Cát Cát, Thác Bạc",
        cuisine: "Đặc sản vùng cao: thịt trâu gác bếp, cá suối nướng, rượu cần",
        suitableTime: "Lễ 2/9, mùa lúa chín vàng",
        suitableObject: "Mọi lứa tuổi, đặc biệt thích hợp dịp lễ",
        vehicleInfo: "Xe bus cao cấp, cáp treo Fansipan",
        promotion: "Giá đặc biệt dịp lễ 2/9 - tặng áo ấm và ảnh kỷ niệm",
        itinerary: [
            {
                day: 1,
                title: "Hà Nội - Sapa",
                details: "Khởi hành sáng, ngắm ruộng bậc thang mùa vàng"
            },
            {
                day: 2,
                title: "Fansipan - Bản Cát Cát",
                details: "Chinh phục đỉnh Fansipan, thăm bản Cát Cát"
            },
            {
                day: 3,
                title: "Thác Bạc - Hà Nội",
                details: "Tham quan Thác Bạc, về Hà Nội"
            }
        ],
        categoryName: "Tour lễ 2/9",
        departureName: "Hà Nội",
        destinationName: "Sapa",
        transportationName: "Xe"
    },
    {
        title: "Tour thu khởi sắc - Đà Lạt mùa hoa dã quỳ",
        code: "TKS001",
        price: 3500000,
        startDate: new Date('2025-10-15'),
        endDate: new Date('2025-10-17'),
        attractions: "Đồi Mộng Mơ mùa hoa dã quỳ, Hồ Xuân Hương, Thiền viện Trúc Lâm, Thác Elephant",
        cuisine: "Bánh tráng nướng, nem nướng, sữa đậu nành, dâu tây mùa thu",
        suitableTime: "Mùa thu (tháng 10-11), mùa hoa dã quỳ nở",
        suitableObject: "Couple, gia đình, người yêu thiên nhiên",
        vehicleInfo: "Xe bus cao cấp có toilet, điều hòa",
        promotion: "Mùa thu khởi sắc - tặng voucher spa và áo len Đà Lạt",
        itinerary: [
            {
                day: 1,
                title: "TP.HCM - Đà Lạt",
                details: "Khởi hành sáng, ngắm Đồi Mộng Mơ mùa hoa dã quỳ"
            },
            {
                day: 2,
                title: "Hồ Xuân Hương - Thiền viện",
                details: "Dạo quanh Hồ Xuân Hương, thiền định tại Thiền viện Trúc Lâm"
            },
            {
                day: 3,
                title: "Thác Elephant - TP.HCM",
                details: "Tham quan Thác Elephant, mua sắm đặc sản, về TP.HCM"
            }
        ],
        categoryName: "Tour thu khởi sắc",
        departureName: "TP. Hồ Chí Minh",
        destinationName: "Đà Lạt",
        transportationName: "Xe"
    },
    {
        title: "Tour Châu Âu Cổ Điển - Paris - Rome - London",
        code: "EU001",
        price: 65000000,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-10'),
        attractions: "Tháp Eiffel, Colosseum, Big Ben, Louvre Museum, Vatican",
        cuisine: "Ẩm thực châu Âu authentic",
        suitableTime: "Quanh năm",
        suitableObject: "Người có hộ chiếu, visa châu Âu",
        vehicleInfo: "Máy bay quốc tế Vietnam Airlines",
        promotion: "Tặng bảo hiểm du lịch quốc tế và city pass",
        itinerary: [
            {
                day: 1,
                title: "TP.HCM - Paris",
                details: "Bay từ TP.HCM đến Paris, check-in khách sạn"
            },
            {
                day: 2,
                title: "Khám phá Paris",
                details: "Tháp Eiffel, Louvre Museum, Seine River cruise"
            },
            {
                day: 3,
                title: "Paris - Rome",
                details: "Bay đến Rome, tham quan Vatican"
            },
            {
                day: 4,
                title: "Rome cổ đại",
                details: "Colosseum, Roman Forum, Trevi Fountain"
            },
            {
                day: 5,
                title: "Rome - London",
                details: "Bay đến London, Thames River tour"
            },
            {
                day: 6,
                title: "London hoàng gia",
                details: "Buckingham Palace, Big Ben, Tower Bridge"
            },
            {
                day: 7,
                title: "London - TP.HCM",
                details: "Mua sắm cuối, bay về Việt Nam"
            }
        ],
        categoryName: "Tour châu Âu",
        departureName: "TP. Hồ Chí Minh",
        destinationName: "Paris",
        transportationName: "Máy bay"
    },
    {
        title: "Tour Đà Nẵng - Hội An ưu đãi mùa hè",
        code: "UDH001",
        price: 1999000,
        startDate: new Date('2025-08-20'),
        endDate: new Date('2025-08-22'),
        attractions: "Bà Nà Hills, Phố cổ Hội An, Cầu Vàng, Mỹ Khê Beach",
        cuisine: "Mì Quảng, cao lầu, bánh mì Hội An",
        suitableTime: "Mùa hè (tháng 6-8)",
        suitableObject: "Gia đình, nhóm bạn trẻ",
        vehicleInfo: "Máy bay giá rẻ + xe bus điều hòa",
        promotion: "Giá ưu đãi mùa hè - giảm 50% so với giá thường",
        itinerary: [
            {
                day: 1,
                title: "Hà Nội - Đà Nẵng",
                details: "Bay sáng đến Đà Nẵng, tham quan Bà Nà Hills"
            },
            {
                day: 2,
                title: "Hội An - Mỹ Sơn",
                details: "Phố cổ Hội An, thánh địa Mỹ Sơn"
            },
            {
                day: 3,
                title: "Mỹ Khê Beach - Hà Nội",
                details: "Tắm biển Mỹ Khê, bay về Hà Nội"
            }
        ],
        categoryName: "Ưu đãi mùa hè",
        departureName: "Hà Nội",
        destinationName: "Đà Nẵng",
        transportationName: "Máy bay"
    }
];

const seedTours = async () => {
    try {
        console.log('🌱 Bắt đầu seed dữ liệu tour...');

        // KHÔNG xóa dữ liệu cũ - chỉ thêm mới
        console.log('✅ Giữ lại tour cũ, chỉ thêm tour mới');

        // Lấy danh sách categories, departures, destinations, transportations
        const categories = await Category.find({});
        const departures = await Departure.find({});
        const destinations = await Destination.find({});
        const transportations = await Transportation.find({});

        console.log(`📋 Tìm thấy ${categories.length} danh mục`);
        console.log(`📋 Tìm thấy ${departures.length} điểm khởi hành`);
        console.log(`📋 Tìm thấy ${destinations.length} điểm đến`);
        console.log(`📋 Tìm thấy ${transportations.length} phương tiện`);

        // Tạo map để tìm ObjectId theo tên
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.name] = cat._id;
        });

        const departureMap = {};
        departures.forEach(dep => {
            departureMap[dep.name] = dep._id;
        });

        const destinationMap = {};
        destinations.forEach(dest => {
            destinationMap[dest.name] = dest._id;
        });

        const transportationMap = {};
        transportations.forEach(trans => {
            transportationMap[trans.title] = trans._id;
        });

        // Seed từng tour
        const savedTours = [];
        for (const tourData of tours) {
            const tour = new Tour({
                title: tourData.title,
                code: tourData.code,
                price: tourData.price,
                startDate: tourData.startDate,
                endDate: tourData.endDate,
                attractions: tourData.attractions,
                cuisine: tourData.cuisine,
                suitableTime: tourData.suitableTime,
                suitableObject: tourData.suitableObject,
                vehicleInfo: tourData.vehicleInfo,
                promotion: tourData.promotion,
                itinerary: tourData.itinerary,
                category: categoryMap[tourData.categoryName],
                departure: departureMap[tourData.departureName],
                destination: destinationMap[tourData.destinationName],
                transportation: transportationMap[tourData.transportationName],
                status: true,
                highlight: Math.random() > 0.5, // Ngẫu nhiên có highlight hay không
                views: Math.floor(Math.random() * 1000) + 100, // Ngẫu nhiên views từ 100-1100
                createdBy: 'Super Admin',
                updatedBy: 'Super Admin'
            });

            const savedTour = await tour.save();
            savedTours.push(savedTour);
            console.log(`✅ Đã tạo tour: ${tour.title}`);
        }

        console.log(`🎉 Hoàn thành seed ${savedTours.length} tour!`);
        return savedTours;

    } catch (error) {
        console.error('❌ Lỗi khi seed dữ liệu tour:', error);
        throw error;
    }
};

// Chạy seeder nếu file được gọi trực tiếp
if (require.main === module) {
    const mongoose = require('mongoose');
    require('dotenv').config();
    
    mongoose.connect(process.env.DB_CONNECTION_STRING)
        .then(() => {
            console.log('📦 Kết nối database thành công');
            return seedTours();
        })
        .then(() => {
            console.log('✅ Seed tour hoàn thành');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Lỗi:', error);
            process.exit(1);
        });
}

module.exports = { seedTours };
