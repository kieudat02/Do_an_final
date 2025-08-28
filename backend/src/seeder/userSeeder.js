const User = require('../models/userModel');
const Role = require('../models/roleModel');

const seedUsers = async () => {
    try {
        console.log('🚀 Bắt đầu seed dữ liệu users...');
        
        // Lấy roles để gán cho users
        const roles = await Role.find({});
        const roleMap = {};
        roles.forEach(role => {
            roleMap[role.name] = role._id;
        });
        
        // Xóa tất cả user cũ
        await User.deleteMany({});
        console.log('Đã xóa tất cả user cũ');
        
        // Tạo users mẫu
        const users = [
            {
                fullName: 'Super Administrator',
                email: 'superadmin@gmail.com',
                password: '123456',
                role: roleMap['Super Admin'],
                status: 'Hoạt động',
                user_type: 'admin'
            },
            {
                fullName: 'Administrator',
                email: 'admin@gmail.com',
                password: '123456',
                role: roleMap['Admin'],
                status: 'Hoạt động',
                user_type: 'admin'
            },
            {
                fullName: 'Manager User',
                email: 'manager@gmail.com',
                password: '123456',
                role: roleMap['Manager'],
                status: 'Hoạt động',
                user_type: 'staff'
            },
            {
                fullName: 'Viewer User',
                email: 'viewer@gmail.com',
                password: '123456',
                role: roleMap['Viewer'],
                status: 'Hoạt động',
                user_type: 'staff'
            },
            {
                fullName: 'Customer Example',
                email: 'customer@gmail.com',
                password: '123456',
                role: roleMap['Customer'],
                status: 'Hoạt động',
                user_type: 'customer'
            }
        ];
        
        for (const userData of users) {
            const user = new User(userData);
            await user.save();
            
            // Lấy role name cho log
            const roleName = userData.role ? 
                (roles.find(r => r._id.toString() === userData.role.toString())?.name || 'Unknown Role') :
                'No Role (Customer)';
                
            console.log(`Đã tạo user: ${userData.email} - ${roleName} (${userData.user_type})`);
        }
        
        console.log('✅ Seed users thành công!');
        console.log('📧 Thông tin đăng nhập:');
        console.log('🔥 Super Admin: superadmin@gmail.com / 123456');
        console.log('👑 Admin: admin@gmail.com / 123456');
        console.log('👤 Manager: manager@gmail.com / 123456');
        console.log('👁️ Viewer: viewer@gmail.com / 123456');
        console.log('🛒 Customer: customer@gmail.com / 123456');
        
    } catch (error) {
        console.error('❌ Lỗi khi seed users:', error);
        throw error;
    }
};

module.exports = seedUsers;
