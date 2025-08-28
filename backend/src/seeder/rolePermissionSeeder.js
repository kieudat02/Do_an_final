const Role = require('../models/roleModel');
const Permission = require('../models/permissonsModel');
const RolePermission = require('../models/rolePermissionModel');

const rolePermissionMapping = {
    'Super Admin': [
        // Có tất cả quyền
        'CREATE_TOUR', 'READ_TOUR', 'UPDATE_TOUR', 'DELETE_TOUR',
        'CREATE_CATEGORY', 'READ_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY',
        'CREATE_DEPARTURE', 'READ_DEPARTURE', 'UPDATE_DEPARTURE', 'DELETE_DEPARTURE',
        'CREATE_DESTINATION', 'READ_DESTINATION', 'UPDATE_DESTINATION', 'DELETE_DESTINATION',
        'CREATE_TRANSPORTATION', 'READ_TRANSPORTATION', 'UPDATE_TRANSPORTATION', 'DELETE_TRANSPORTATION',
        'READ_ORDER', 'UPDATE_ORDER', 'DELETE_ORDER',
        'CREATE_ROLES', 'READ_ROLES',
        'READ_USERS',
        'CREATE_REVIEW', 'READ_REVIEW', 'UPDATE_REVIEW', 'DELETE_REVIEW'
    ],
    'Admin': [
        // Có hầu hết quyền, trừ một số quyền cao cấp
        'CREATE_TOUR', 'READ_TOUR', 'UPDATE_TOUR', 'DELETE_TOUR',
        'CREATE_CATEGORY', 'READ_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY',
        'CREATE_DEPARTURE', 'READ_DEPARTURE', 'UPDATE_DEPARTURE', 'DELETE_DEPARTURE',
        'CREATE_DESTINATION', 'READ_DESTINATION', 'UPDATE_DESTINATION', 'DELETE_DESTINATION',
        'CREATE_TRANSPORTATION', 'READ_TRANSPORTATION', 'UPDATE_TRANSPORTATION', 'DELETE_TRANSPORTATION',
        'READ_ORDER', 'UPDATE_ORDER', 'DELETE_ORDER',
        'READ_REVIEW', 'UPDATE_REVIEW', 'DELETE_REVIEW'
    ],
    'Manager': [
        // Có quyền đọc và cập nhật, ít quyền tạo/xóa
        'CREATE_TOUR', 'READ_TOUR', 'UPDATE_TOUR',
        'READ_CATEGORY', 'UPDATE_CATEGORY',
        'READ_DEPARTURE', 'UPDATE_DEPARTURE',
        'READ_DESTINATION', 'UPDATE_DESTINATION',
        'READ_TRANSPORTATION', 'UPDATE_TRANSPORTATION',
        'READ_ORDER',
        'READ_REVIEW'
    ],
    'Viewer': [
        // Chỉ có quyền đọc
        'READ_TOUR',
        'READ_CATEGORY',
        'READ_DEPARTURE',
        'READ_DESTINATION',
        'READ_TRANSPORTATION',
        'READ_ORDER',
        'READ_REVIEW'
    ]
};

const seedRolePermissions = async () => {
    try {
        console.log('🚀 Bắt đầu seed dữ liệu role-permissions...');
        
        // Xóa dữ liệu cũ
        await RolePermission.deleteMany({});
        console.log('✅ Đã xóa dữ liệu role-permissions cũ');
        
        // Lấy tất cả roles và permissions
        const roles = await Role.find({});
        const permissions = await Permission.find({});
        
        // Tạo mapping object để tìm kiếm nhanh
        const roleMap = {};
        const permissionMap = {};
        
        roles.forEach(role => {
            roleMap[role.name] = role._id;
        });
        
        permissions.forEach(permission => {
            permissionMap[permission.name] = permission._id;
        });
        
        // Tạo role-permission mappings
        const rolePermissions = [];
        
        for (const [roleName, permissionNames] of Object.entries(rolePermissionMapping)) {
            const roleId = roleMap[roleName];
            
            if (!roleId) {
                continue;
            }

            for (const permissionName of permissionNames) {
                const permissionId = permissionMap[permissionName];

                if (!permissionId) {
                    continue;
                }
                
                rolePermissions.push({
                    roleId: roleId,
                    permissionId: permissionId,
                    isActive: true
                });
            }
        }
        
        // Insert vào database
        const createdRolePermissions = await RolePermission.insertMany(rolePermissions);
        console.log(`✅ Đã tạo ${createdRolePermissions.length} role-permissions thành công`);
        
        // Thống kê phân quyền
        console.log('📊 Thống kê phân quyền:');
        for (const role of roles) {
            const count = rolePermissions.filter(rp => 
                rp.roleId.toString() === role._id.toString()
            ).length;
            console.log(`   - ${role.name}: ${count} quyền`);
        }
        
        return createdRolePermissions;
    } catch (error) {
        console.error('❌ Lỗi khi seed role-permissions:', error);
        throw error;
    }
};

module.exports = seedRolePermissions;
