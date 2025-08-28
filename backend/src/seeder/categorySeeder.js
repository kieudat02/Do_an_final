const Category = require('../models/categoriesModel');

const categories = [
    {
        name: "Tour tiêu chuẩn",
        description: "Các tour du lịch với chất lượng dịch vụ tiêu chuẩn",
        status: "Hoạt động",
        createdBy: "Super Admin",
        updatedBy: "Super Admin"
    },
    {
        name: "Tour cao cấp",
        description: "Các tour du lịch với dịch vụ cao cấp, sang trọng",
        status: "Hoạt động",
        createdBy: "Super Admin",
        updatedBy: "Super Admin"
    },
    {
        name: "Tour lễ 2/9",
        description: "Các tour du lịch đặc biệt dịp lễ Quốc khánh 2/9",
        pageTitle: "Tour Du Lịch Lễ 2/9 Ưu Đãi Sốc 2025",
        pageSubtitle: "Kỳ nghỉ 2/9 bùng nổ với hàng loạt ưu đãi - lịch khởi hành dày đặc, dịch vụ chuẩn ND Travel.",
        status: "Hoạt động",
        createdBy: "Super Admin",
        updatedBy: "Super Admin"
    },
    {
        name: "Tour Du Lịch Trung Quốc",
        description: "Các tour du lịch khám phá Trung Quốc với văn hóa lâu đời",
        pageTitle: "Tour Du Lịch Trung Quốc 2025 - Khám Phá Đất Nước Tỷ Dân",
        pageSubtitle: "Trải nghiệm văn hóa 5000 năm lịch sử, thưởng thức ẩm thực đặc sắc và ngắm cảnh đẹp hùng vĩ tại Trung Quốc.",
        status: "Hoạt động",
        createdBy: "Super Admin",
        updatedBy: "Super Admin"
    },
    {
        name: "Tour Du Lịch Nhật Bản",
        description: "Các tour du lịch khám phá xứ sở hoa anh đào Nhật Bản",
        pageTitle: "Tour Du Lịch Nhật Bản 2025 - Xứ Sở Hoa Anh Đào",
        pageSubtitle: "Khám phá văn hóa độc đáo, công nghệ hiện đại và cảnh đẹp tuyệt vời của đất nước mặt trời mọc.",
        status: "Hoạt động",
        createdBy: "Super Admin",
        updatedBy: "Super Admin"
    },
    {
        name: "Tour Du Lịch Hàn Quốc",
        description: "Các tour du lịch khám phá xứ sở kim chi Hàn Quốc",
        pageTitle: "Tour Du Lịch Hàn Quốc 2025 - Xứ Sở Kim Chi",
        pageSubtitle: "Trải nghiệm văn hóa K-pop, thưởng thức ẩm thực đặc sắc và khám phá cảnh đẹp Hàn Quốc.",
        status: "Hoạt động",
        createdBy: "Super Admin",
        updatedBy: "Super Admin"
    },
    {
        name: "Tour Du Lịch Nga",
        description: "Các tour du lịch khám phá đất nước Nga rộng lớn",
        pageTitle: "Tour Du Lịch Nga 2025 - Đất Nước Rộng Lớn",
        pageSubtitle: "Khám phá kiến trúc cổ kính, văn hóa đặc sắc và cảnh đẹp hùng vĩ của nước Nga.",
        status: "Hoạt động",
        createdBy: "Super Admin",
        updatedBy: "Super Admin"
    },
    {
        name: "Tour Du Lịch Trong Nước",
        description: "Các tour du lịch khám phá vẻ đẹp Việt Nam",
        pageTitle: "Tour Du Lịch Trong Nước 2025 - Khám Phá Việt Nam",
        pageSubtitle: "Trải nghiệm vẻ đẹp thiên nhiên, văn hóa và ẩm thực đặc sắc của đất nước Việt Nam.",
        status: "Hoạt động",
        createdBy: "Super Admin",
        updatedBy: "Super Admin"
    },
    {
        name: "Tour thu khởi sắc",
        description: "Các tour du lịch mùa thu với cảnh sắc tuyệt đẹp",
        pageTitle: "Tour Du Lịch Mùa Thu Vàng 2025",
        pageSubtitle: "Đừng bỏ lỡ các tour du lịch mùa thu 2025 với hành trình ngắm lá vàng, khí hậu dễ chịu và giá tốt.",

        status: "Hoạt động",
        createdBy: "Super Admin",
        updatedBy: "Super Admin"
    },
    {
        name: "Tour châu Âu",
        description: "Các tour du lịch khám phá châu Âu",
        status: "Hoạt động",
        createdBy: "Super Admin",
        updatedBy: "Super Admin"
    },
    {
        name: "Ưu đãi mùa hè",
        description: "Các tour du lịch với ưu đãi đặc biệt mùa hè",
        status: "Hoạt động",
        createdBy: "Super Admin",
        updatedBy: "Super Admin"
    }
];

// Hàm tạo slug từ tên (thân thiện cho URL)
function generateSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
        .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
        .replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
        .replace(/[ùúụủũưừứựửữ]/g, 'u')
        .replace(/[ỳýỵỷỹ]/g, 'y')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// Mapping tên category thành slug thân thiện
const categorySlugMapping = {
    "Tour tiêu chuẩn": "tour-tieu-chuan",
    "Tour cao cấp": "tour-cao-cap",
    "Tour lễ 2/9": "tour-le-2-9",
    "Tour mùa thu": "tour-mua-thu",
    "Tour Du Lịch Trung Quốc": "trung-quoc",
    "Tour Du Lịch Nhật Bản": "nhat-ban",
    "Tour Du Lịch Hàn Quốc": "han-quoc",
    "Tour Du Lịch Nga": "nga",
    "Tour Du Lịch Trong Nước": "trong-nuoc"
};

// Thêm slug và fullSlug cho các danh mục
const categoriesWithSlug = categories.map(category => ({
    ...category,
    slug: categorySlugMapping[category.name] || generateSlug(category.name),
    fullSlug: categorySlugMapping[category.name] || generateSlug(category.name)
}));

const seedCategories = async () => {
    try {
        // Xóa tất cả danh mục cũ
        await Category.deleteMany({});
        console.log('🗑️ Đã xóa tất cả danh mục cũ');

        // Thêm danh mục mới
        const createdCategories = await Category.insertMany(categoriesWithSlug);
        console.log(`✅ Đã tạo ${createdCategories.length} danh mục thành công!`);
        
        // In ra danh sách danh mục đã tạo
        createdCategories.forEach(category => {
            console.log(`   - ${category.name} (ID: ${category._id})`);
        });

        return createdCategories;
    } catch (error) {
        console.error('❌ Lỗi khi seed danh mục:', error);
        throw error;
    }
};

module.exports = { 
    seedCategories,
    categories: categoriesWithSlug
};
