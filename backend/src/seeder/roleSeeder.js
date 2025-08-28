const Role = require('../models/roleModel');

const rolesData = [
    {
        name: 'Super Admin',
        description: 'Người quản trị cao nhất có tất cả quyền',
        level: 1
    },
    {
        name: 'Admin',
        description: 'Quản trị viên có hầu hết quyền',
        level: 2
    },
    {
        name: 'Manager',
        description: 'Quản lý có quyền hạn trung bình',
        level: 3
    },
    {
        name: 'Viewer',
        description: 'Người xem chỉ có quyền đọc',
        level: 4
    },
    {
        name: 'Customer',
        description: 'Khách hàng - không có quyền quản trị',
        level: 4
    }
];

const seedRoles = async () => {
    try {
        console.log('🚀 Bắt đầu seed dữ liệu roles...');
        
        // Xóa dữ liệu cũ
        await Role.deleteMany({});
        console.log('✅ Đã xóa dữ liệu roles cũ');
        
        // Thêm dữ liệu mới
        const roles = await Role.insertMany(rolesData);
        console.log(`✅ Đã tạo ${roles.length} roles thành công`);
        
        // In ra danh sách roles
        console.log('📋 Danh sách roles:');
        roles.forEach(role => {
            console.log(`   - ${role.name} (Level ${role.level}): ${role.description}`);
        });
        
        return roles;
    } catch (error) {
        console.error('❌ Lỗi khi seed roles:', error);
        throw error;
    }
};

module.exports = seedRoles;
