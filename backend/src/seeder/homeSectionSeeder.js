const HomeSection = require('../models/homeSectionModel');
const Category = require('../models/categoriesModel');

const homeSections = [
    {
        title: "Tour Nổi Bật",
        order: 1,
        isActive: true,
        moreButtonTitle: "Xem tất cả tour nổi bật",
        moreButtonSubtitle: "Khám phá những tour được yêu thích nhất",
        filterQuery: { highlight: true, status: true }
    },
    {
        title: "Tour Trong Nước",
        order: 2,
        isActive: true,
        moreButtonTitle: "Xem thêm tour trong nước",
        moreButtonSubtitle: "Khám phá vẻ đẹp Việt Nam",
        filterQuery: { domestic: true, status: true }
    },
    {
        title: "Tour Châu Á",
        order: 3,
        isActive: true,
        moreButtonTitle: "Khám phá châu Á",
        moreButtonSubtitle: "Trải nghiệm văn hóa đa dạng",
        filterQuery: { region: "Asia", status: true }
    },
    {
        title: "Tour Mùa Thu",
        order: 4,
        isActive: true,
        moreButtonTitle: "Tour mùa thu",
        moreButtonSubtitle: "Ngắm lá vàng rơi thơ mộng",
        filterQuery: { season: "autumn", status: true }
    },
    {
        title: "Tour Cao Cấp",
        order: 5,
        isActive: true,
        moreButtonTitle: "Tour luxury",
        moreButtonSubtitle: "Trải nghiệm sang trọng đẳng cấp",
        filterQuery: { priceRange: "luxury", status: true }
    },
    {
        title: "Ưu Đãi Đặc Biệt",
        order: 6,
        isActive: true,
        moreButtonTitle: "Xem tất cả ưu đãi",
        moreButtonSubtitle: "Tiết kiệm tới 50% cho chuyến đi",
        filterQuery: { hasDiscount: true, status: true }
    }
];

const seedHomeSections = async () => {
    try {
        // Xóa tất cả home sections cũ
        await HomeSection.deleteMany({});
        console.log('🗑️ Đã xóa tất cả home sections cũ');

        // Lấy một số categories để gán cho home sections
        const categories = await Category.find({ status: "Hoạt động" }).limit(6);
        
        // Gán categories cho home sections (mỗi section có thể có 1-2 categories)
        const homeSectionsWithCategories = homeSections.map((section, index) => {
            const categoriesForSection = [];
            
            // Gán category đầu tiên nếu có
            if (categories[index]) {
                categoriesForSection.push(categories[index]._id);
            }
            
            // Một số section có thể có thêm category thứ 2
            if (index % 2 === 0 && categories[index + 1]) {
                categoriesForSection.push(categories[index + 1]._id);
            }

            return {
                ...section,
                categories: categoriesForSection,
                createdBy: null, // Sẽ được set thành null vì chưa có User system
                updatedBy: null
            };
        });

        // Thêm home sections mới
        const createdHomeSections = await HomeSection.insertMany(homeSectionsWithCategories);
        console.log(`✅ Đã tạo ${createdHomeSections.length} home sections thành công!`);
        
        // In ra danh sách home sections đã tạo
        createdHomeSections.forEach(homeSection => {
            console.log(`   - ${homeSection.title} (Order: ${homeSection.order}, Active: ${homeSection.isActive}, Slug: ${homeSection.moreButtonSlug})`);
        });

        return createdHomeSections;
    } catch (error) {
        console.error('❌ Lỗi khi seed home sections:', error);
        throw error;
    }
};

module.exports = { 
    seedHomeSections,
    homeSections
};
