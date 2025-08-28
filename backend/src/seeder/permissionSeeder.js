const Permission = require("../models/permissonsModel");

const permissionsData = [
    // TOUR Module
    {
        name: "CREATE_TOUR",
        description: "Cho phép tạo tour mới",
        module: "TOUR",
    },
    {
        name: "READ_TOUR",
        description: "Cho phép xem thông tin tour",
        module: "TOUR",
    },
    {
        name: "UPDATE_TOUR",
        description: "Cho phép cập nhật thông tin tour",
        module: "TOUR",
    },
    { name: "DELETE_TOUR", description: "Cho phép xóa tour", module: "TOUR" },

    // CATEGORY Module
    {
        name: "CREATE_CATEGORY",
        description: "Cho phép tạo danh mục mới",
        module: "CATEGORY",
    },
    {
        name: "READ_CATEGORY",
        description: "Cho phép xem thông tin danh mục",
        module: "CATEGORY",
    },
    {
        name: "UPDATE_CATEGORY",
        description: "Cho phép cập nhật thông tin danh mục",
        module: "CATEGORY",
    },
    {
        name: "DELETE_CATEGORY",
        description: "Cho phép xóa danh mục",
        module: "CATEGORY",
    },

    // HOME_SECTION Module
    {
        name: "CREATE_HOME_SECTION",
        description: "Cho phép tạo home section mới",
        module: "HOME_SECTION",
    },
    {
        name: "READ_HOME_SECTION",
        description: "Cho phép xem thông tin home section",
        module: "HOME_SECTION",
    },
    {
        name: "UPDATE_HOME_SECTION",
        description: "Cho phép cập nhật thông tin home section",
        module: "HOME_SECTION",
    },
    {
        name: "DELETE_HOME_SECTION",
        description: "Cho phép xóa home section",
        module: "HOME_SECTION",
    },

    // DEPARTURE Module
    {
        name: "CREATE_DEPARTURE",
        description: "Cho phép tạo điểm khởi hành mới",
        module: "DEPARTURE",
    },
    {
        name: "READ_DEPARTURE",
        description: "Cho phép xem thông tin điểm khởi hành",
        module: "DEPARTURE",
    },
    {
        name: "UPDATE_DEPARTURE",
        description: "Cho phép cập nhật thông tin điểm khởi hành",
        module: "DEPARTURE",
    },
    {
        name: "DELETE_DEPARTURE",
        description: "Cho phép xóa điểm khởi hành",
        module: "DEPARTURE",
    },

    // DESTINATION Module
    {
        name: "CREATE_DESTINATION",
        description: "Cho phép tạo điểm đến mới",
        module: "DESTINATION",
    },
    {
        name: "READ_DESTINATION",
        description: "Cho phép xem thông tin điểm đến",
        module: "DESTINATION",
    },
    {
        name: "UPDATE_DESTINATION",
        description: "Cho phép cập nhật thông tin điểm đến",
        module: "DESTINATION",
    },
    {
        name: "DELETE_DESTINATION",
        description: "Cho phép xóa điểm đến",
        module: "DESTINATION",
    },

    // TRANSPORTATION Module
    {
        name: "CREATE_TRANSPORTATION",
        description: "Cho phép tạo phương tiện vận chuyển mới",
        module: "TRANSPORTATION",
    },
    {
        name: "READ_TRANSPORTATION",
        description: "Cho phép xem thông tin phương tiện vận chuyển",
        module: "TRANSPORTATION",
    },
    {
        name: "UPDATE_TRANSPORTATION",
        description: "Cho phép cập nhật thông tin phương tiện vận chuyển",
        module: "TRANSPORTATION",
    },
    {
        name: "DELETE_TRANSPORTATION",
        description: "Cho phép xóa phương tiện vận chuyển",
        module: "TRANSPORTATION",
    },

    // ORDER Module
    {
        name: "READ_ORDER",
        description: "Cho phép xem thông tin đơn hàng",
        module: "ORDER",
    },
    {
        name: "UPDATE_ORDER",
        description: "Cho phép cập nhật thông tin đơn hàng",
        module: "ORDER",
    },
    {
        name: "DELETE_ORDER",
        description: "Cho phép xóa đơn hàng",
        module: "ORDER",
    },

    // ROLES Module
    {
        name: "CREATE_ROLES",
        description: "Cho phép tạo vai trò",
        module: "ROLES",
    },
    {
        name: "READ_ROLES",
        description: "Cho phép xem vai trò",
        module: "ROLES",
    },
    {
        name: "UPDATE_ROLES",
        description: "Cho phép cập nhật vai trò",
        module: "ROLES",
    },
    {
        name: "DELETE_ROLES",
        description: "Cho phép xóa vai trò",
        module: "ROLES",
    },

    // PERMISSIONS Module
    {
        name: "READ_PERMISSIONS",
        description: "Cho phép xem quyền hạn",
        module: "PERMISSIONS",
    },
    {
        name: "UPDATE_PERMISSIONS",
        description: "Cho phép cập nhật quyền hạn",
        module: "PERMISSIONS",
    },

    // USERS/ACCOUNT Module
    {
        name: "CREATE_USERS",
        description: "Cho phép tạo tài khoản người dùng",
        module: "USERS",
    },
    {
        name: "READ_USERS",
        description: "Cho phép xem tài khoản người dùng",
        module: "USERS",
    },
    {
        name: "UPDATE_USERS",
        description: "Cho phép cập nhật tài khoản người dùng",
        module: "USERS",
    },
    {
        name: "DELETE_USERS",
        description: "Cho phép xóa tài khoản người dùng",
        module: "USERS",
    },



    // REVIEW Module
    {
        name: "CREATE_REVIEW",
        description: "Cho phép tạo đánh giá tour",
        module: "REVIEW",
    },
    {
        name: "READ_REVIEW",
        description: "Cho phép xem đánh giá tour",
        module: "REVIEW",
    },
    {
        name: "UPDATE_REVIEW",
        description: "Cho phép cập nhật đánh giá tour",
        module: "REVIEW",
    },
    {
        name: "DELETE_REVIEW",
        description: "Cho phép xóa đánh giá tour",
        module: "REVIEW",
    },
];

const seedPermissions = async () => {
    try {
        console.log("🚀 Bắt đầu seed dữ liệu permissions...");

        const newPermissions = [];
        
        // Kiểm tra và thêm từng permission nếu chưa tồn tại
        for (const permissionData of permissionsData) {
            const existingPermission = await Permission.findOne({ 
                name: permissionData.name 
            });
            
            if (!existingPermission) {
                const newPermission = new Permission(permissionData);
                await newPermission.save();
                newPermissions.push(newPermission);
                console.log(`✅ Đã thêm permission mới: ${permissionData.name}`);
            } else {
                console.log(`ℹ️ Permission đã tồn tại: ${permissionData.name}`);
            }
        }

        if (newPermissions.length > 0) {
            console.log(`✅ Đã tạo ${newPermissions.length} permissions mới thành công`);
            
            // In ra danh sách permissions mới được thêm
            console.log("📋 Danh sách permissions mới được thêm:");
            newPermissions.forEach((permission) => {
                console.log(`   - ${permission.name}: ${permission.description}`);
            });
        } else {
            console.log("ℹ️ Không có permissions mới nào được thêm");
        }

        // Lấy tất cả permissions hiện tại
        const allPermissions = await Permission.find({});
        console.log(`📊 Tổng số permissions hiện tại: ${allPermissions.length}`);

        return newPermissions;
    } catch (error) {
        console.error("❌ Lỗi khi seed permissions:", error);
        throw error;
    }
};

module.exports = seedPermissions;
