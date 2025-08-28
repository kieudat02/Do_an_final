const Permission = require("../models/permissonsModel");
const Role = require("../models/roleModel");
const RolePermission = require("../models/rolePermissionModel");

const permissionController = {
    // Hiển thị trang quản lý permissions
    index: async (req, res) => {
        try {
            // Lấy tất cả roles và permissions
            const roles = await Role.find({ isActive: true }).sort({
                level: 1,
            });

            // Định nghĩa thứ tự module theo sidebar
            const moduleOrder = [
                "TOUR",
                "CATEGORY",
                "HOME_SECTION",
                "DEPARTURE",
                "DESTINATION",
                "TRANSPORTATION",
                "ORDER",
                "REVIEW",
                "ROLES",
                "PERMISSIONS",
                "USERS",
            ];

            // Lấy tất cả permissions và sắp xếp theo module
            const allPermissions = await Permission.find({ isActive: true });

            // Nhóm permissions theo module
            const permissionsByModule = {};
            allPermissions.forEach((permission) => {
                const module = permission.module;
                if (!permissionsByModule[module]) {
                    permissionsByModule[module] = [];
                }
                permissionsByModule[module].push(permission);
            });

            // Sắp xếp permissions trong mỗi module theo tên (CREATE, READ, UPDATE, DELETE)
            Object.keys(permissionsByModule).forEach((module) => {
                permissionsByModule[module].sort((a, b) => {
                    const actionOrder = ["CREATE", "READ", "UPDATE", "DELETE"];
                    const getActionPriority = (name) => {
                        for (let i = 0; i < actionOrder.length; i++) {
                            if (name.startsWith(actionOrder[i])) return i;
                        }
                        return 999;
                    };
                    return (
                        getActionPriority(a.name) - getActionPriority(b.name)
                    );
                });
            });

            // Tạo mảng permissions đã sắp xếp theo thứ tự module
            const permissions = [];
            moduleOrder.forEach((module) => {
                if (permissionsByModule[module]) {
                    permissions.push(...permissionsByModule[module]);
                }
            });

            // Lấy mapping hiện tại (không populate để tránh lỗi)
            const rolePermissions = await RolePermission.find({
                isActive: true,
            });

            // Tạo matrix permissions
            const permissionMatrix = {};

            // Khởi tạo matrix
            roles.forEach((role) => {
                permissionMatrix[role._id] = {};
                permissions.forEach((permission) => {
                    permissionMatrix[role._id][permission._id] = false;
                });
            });

            // Đánh dấu permissions đã có
            rolePermissions.forEach((rp) => {
                // Kiểm tra đầy đủ để tránh lỗi undefined
                if (rp && rp.roleId && rp.permissionId && 
                    permissionMatrix[rp.roleId] && 
                    permissionMatrix[rp.roleId][rp.permissionId] !== undefined) {
                    permissionMatrix[rp.roleId][rp.permissionId] = true;
                }
            });

            // Tạo mapping đơn giản cho form
            const mapping = {};
            roles.forEach((role) => {
                mapping[role._id] = [];
                permissions.forEach((permission) => {
                    // Kiểm tra đầy đủ để tránh lỗi undefined
                    if (permissionMatrix[role._id] && 
                        permissionMatrix[role._id][permission._id]) {
                        mapping[role._id].push(permission._id.toString());
                    }
                });
            });

            res.render("permissions", {
                title: "Quản lý phân quyền",
                roles,
                permissions,
                permissionsByModule,
                moduleOrder,
                mapping,
                csrfToken: "disabled-for-file-upload-compatibility",
                message: req.flash("message"),
                error: req.flash("error"),
                userPermissions: res.locals.userPermissions, 
            });
        } catch (error) {
            console.error("Lỗi hiển thị trang permission:", error);
            req.flash("error", "Có lỗi xảy ra khi tải dữ liệu");
            res.redirect("/dashboard");
        }
    },

    // Cập nhật permissions từ form (method POST)
    update: async (req, res) => {
        try {
            const permissionsData = req.body.permissions;
            const currentUser = req.session.user;

            // Kiểm tra quyền: chỉ Super Admin hoặc Admin mới được phân quyền
            if (!["Super Admin", "Admin"].includes(currentUser.role.name)) {
                const errorMessage =
                    "Bạn không có quyền thực hiện hành động này";

                const isAjax =
                    req.xhr ||
                    req.headers["x-requested-with"] === "XMLHttpRequest" ||
                    (req.headers.accept &&
                        req.headers.accept.includes("application/json")) ||
                    req.path.startsWith("/api/");

                if (isAjax) {
                    return res.status(403).json({
                        success: false,
                        message: errorMessage,
                    });
                }
                req.flash("error", errorMessage);
                return res.redirect("/permissions");
            }

            // Lấy tất cả roles (bao gồm cả Super Admin)
            const roles = await Role.find({});
            let updatedRolesCount = 0;

            // Xử lý từng role
            for (const role of roles) {
                const roleId = role._id.toString();
                const selectedPermissions =
                    permissionsData && permissionsData[roleId]
                        ? permissionsData[roleId]
                        : [];

                // Bảo vệ quyền quan trọng của Super Admin - comment lại đoạn code này để cho phép bỏ check
                /*
                if (role.name === "Super Admin") {
                    // Lấy quyền READ_PERMISSIONS và UPDATE_PERMISSIONS
                    const criticalPermissions = await Permission.find({
                        name: { $in: ['READ_PERMISSIONS', 'UPDATE_PERMISSIONS'] },
                        isActive: true
                    });
                    
                    // Đảm bảo Super Admin luôn có các quyền quan trọng
                    criticalPermissions.forEach(permission => {
                        if (!selectedPermissions.includes(permission._id.toString())) {
                            selectedPermissions.push(permission._id.toString());
                        }
                    });
                }
                */
                
                //XÓA TẤT CẢ quyền cũ của role này
                await RolePermission.deleteMany({ roleId: role._id });

                // Chỉ thêm lại những quyền được tích chọn
                if (selectedPermissions.length > 0) {
                    // Kiểm tra permissions hợp lệ
                    const validPermissions = await Permission.find({
                        _id: { $in: selectedPermissions },
                        isActive: true,
                    });

                    if (validPermissions.length > 0) {
                        const rolePermissionsData = validPermissions.map(
                            (permission) => ({
                                roleId: role._id,
                                permissionId: permission._id,
                                isActive: true,
                                grantedBy: currentUser._id,
                                grantedAt: new Date(),
                            })
                        );

                        await RolePermission.insertMany(rolePermissionsData);
                        updatedRolesCount++;
                    }
                }
            }

            const successMessage = `Cập nhật phân quyền thành công cho ${updatedRolesCount} vai trò!`;

            // Kiểm tra nếu là AJAX request thì trả về JSON
            const isAjax =
                req.xhr ||
                req.headers["x-requested-with"] === "XMLHttpRequest" ||
                (req.headers.accept &&
                    req.headers.accept.includes("application/json")) ||
                req.path.startsWith("/api/");

            if (isAjax) {
                return res.json({
                    success: true,
                    message: successMessage,
                });
            }

            req.flash("message", successMessage);
            res.redirect("/permissions");
        } catch (error) {
            const errorMessage = `Có lỗi xảy ra khi cập nhật phân quyền: ${error.message}`;

            // Kiểm tra nếu là AJAX request thì trả về JSON
            const isAjax =
                req.xhr ||
                req.headers["x-requested-with"] === "XMLHttpRequest" ||
                (req.headers.accept &&
                    req.headers.accept.includes("application/json")) ||
                req.path.startsWith("/api/");

            if (isAjax) {
                return res.status(500).json({
                    success: false,
                    message: errorMessage,
                });
            }

            req.flash("error", errorMessage);
            res.redirect("/permissions");
        }
    },

    // Cập nhật quyền của role
    updateRolePermissions: async (req, res) => {
        try {
            const { roleId, permissions } = req.body;

            // Validate dữ liệu
            if (!roleId) {
                return res.status(400).json({
                    success: false,
                    message: "Role ID là bắt buộc",
                });
            }

            // Kiểm tra role tồn tại
            const role = await Role.findById(roleId);
            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: "Role không tồn tại",
                });
            }

            // Kiểm tra quyền: chỉ Super Admin hoặc Admin mới được phân quyền
            const currentUser = req.session.user;
            if (!["Super Admin", "Admin"].includes(currentUser.role.name)) {
                return res.status(403).json({
                    success: false,
                    message: "Bạn không có quyền thực hiện hành động này",
                });
            }

            // Không cho phép thay đổi quyền của Super Admin
            if (role.name === "Super Admin") {
                return res.status(403).json({
                    success: false,
                    message: "Không thể thay đổi quyền của Super Admin",
                });
            }

            // Xóa tất cả permissions cũ của role
            await RolePermission.deleteMany({ role: roleId });

            // Thêm permissions mới
            if (permissions && permissions.length > 0) {
                const validPermissions = await Permission.find({
                    _id: { $in: permissions },
                    isActive: true,
                });

                const rolePermissionsData = validPermissions.map(
                    (permission) => ({
                        role: roleId,
                        permission: permission._id,
                        isActive: true,
                        grantedBy: currentUser._id,
                        grantedAt: new Date(),
                    })
                );

                await RolePermission.insertMany(rolePermissionsData);
            }

            res.json({
                success: true,
                message: `Đã cập nhật quyền cho role ${role.name} thành công`,
            });
        } catch (error) {
            console.error("Lỗi cập nhật role permissions:", error);
            res.status(500).json({
                success: false,
                message: "Có lỗi xảy ra khi cập nhật quyền",
            });
        }
    },

    // Lấy quyền của role
    getRolePermissions: async (req, res) => {
        try {
            const { roleId } = req.params;

            const rolePermissions = await RolePermission.find({
                role: roleId,
                isActive: true,
            }).populate("permissionId");

            const permissions = rolePermissions
                .filter((rp) => rp.permission && rp.permission.isActive)
                .map((rp) => ({
                    id: rp.permission._id,
                    name: rp.permission.name,
                    description: rp.permission.description,
                    module: rp.permission.module,
                }));

            res.json({
                success: true,
                data: permissions,
            });
        } catch (error) {
            console.error("Lỗi lấy role permissions:", error);
            res.status(500).json({
                success: false,
                message: "Có lỗi xảy ra khi lấy dữ liệu",
            });
        }
    },

    // Sao chép quyền từ role này sang role khác
    copyPermissions: async (req, res) => {
        try {
            const { fromRoleId, toRoleId } = req.body;

            // Validate
            if (!fromRoleId || !toRoleId) {
                return res.status(400).json({
                    success: false,
                    message: "Vui lòng chọn cả role nguồn và role đích",
                });
            }

            if (fromRoleId === toRoleId) {
                return res.status(400).json({
                    success: false,
                    message: "Role nguồn và role đích phải khác nhau",
                });
            }

            // Kiểm tra roles tồn tại
            const [fromRole, toRole] = await Promise.all([
                Role.findById(fromRoleId),
                Role.findById(toRoleId),
            ]);

            if (!fromRole || !toRole) {
                return res.status(404).json({
                    success: false,
                    message: "Một hoặc cả hai role không tồn tại",
                });
            }

            // Không cho phép sao chép từ/đến Super Admin
            if ([fromRole.name, toRole.name].includes("Super Admin")) {
                return res.status(403).json({
                    success: false,
                    message: "Không thể sao chép quyền từ/đến Super Admin",
                });
            }

            // Lấy permissions của role nguồn
            const sourcePermissions = await RolePermission.find({
                role: fromRoleId,
                isActive: true,
            });

            // Xóa permissions cũ của role đích
            await RolePermission.deleteMany({ role: toRoleId });

            // Sao chép permissions
            if (sourcePermissions.length > 0) {
                const newPermissions = sourcePermissions.map((sp) => ({
                    role: toRoleId,
                    permission: sp.permission,
                    isActive: true,
                    grantedBy: req.session.user._id,
                    grantedAt: new Date(),
                }));

                await RolePermission.insertMany(newPermissions);
            }

            res.json({
                success: true,
                message: `Đã sao chép quyền từ ${fromRole.name} sang ${toRole.name} thành công`,
            });
        } catch (error) {
            console.error("Lỗi sao chép permissions:", error);
            res.status(500).json({
                success: false,
                message: "Có lỗi xảy ra khi sao chép quyền",
            });
        }
    },

    // Cập nhật quyền từ form
    update: async (req, res) => {
        try {
            const { permissions } = req.body;

            // Kiểm tra quyền: chỉ Super Admin hoặc Admin mới được phân quyền
            const currentUser = req.session.user;
            if (!["Super Admin", "Admin"].includes(currentUser.role.name)) {
                req.flash(
                    "error",
                    "Bạn không có quyền thực hiện hành động này"
                );
                return res.redirect("/permissions");
            }

            // Lấy tất cả roles (trừ Super Admin)
            const roles = await Role.find({
                isActive: true,
                name: { $ne: "Super Admin" },
            });

            // Xử lý từng role
            for (const role of roles) {
                const roleId = role._id.toString();
                const selectedPermissions = permissions[roleId] || [];

                // Xóa tất cả permissions cũ của role
                await RolePermission.deleteMany({ roleId: roleId });

                // Thêm permissions mới
                if (selectedPermissions.length > 0) {
                    const rolePermissionData = selectedPermissions.map(
                        (permissionId) => ({
                            roleId: roleId,
                            permissionId: permissionId,
                            isActive: true,
                            grantedBy: currentUser._id,
                            grantedAt: new Date(),
                        })
                    );

                    await RolePermission.insertMany(rolePermissionData);
                }
            }

            req.flash("message", "Cập nhật phân quyền thành công!");
            res.redirect("/permissions");
        } catch (error) {
            console.error("Lỗi cập nhật permissions:", error);
            req.flash("error", "Có lỗi xảy ra khi cập nhật phân quyền");
            res.redirect("/permissions");
        }
    },

    // Cập nhật quyền từ API
    updatePermissionsAPI: async (req, res) => {
        try {
            const permissionsData = req.body.permissions;
            const currentUser = req.session.user;

            // Kiểm tra quyền
            if (!["Super Admin", "Admin"].includes(currentUser.role.name)) {
                return res.status(403).json({
                    success: false,
                    message: "Bạn không có quyền thực hiện hành động này",
                });
            }

            // Lấy tất cả roles và permissions hiện tại để so sánh
            const roles = await Role.find({});
            const currentRolePermissions = await RolePermission.find({
                isActive: true,
            })
                .populate("roleId", "name level")
                .populate("permissionId", "name description");

            // Tạo mapping hiện tại để so sánh
            const currentMapping = {};
            roles.forEach((role) => {
                currentMapping[role._id.toString()] = [];
            });
            currentRolePermissions.forEach((rp) => {
                if (rp.roleId && rp.permissionId) {
                    currentMapping[rp.roleId._id.toString()].push(
                        rp.permissionId._id.toString()
                    );
                }
            });

            let updatedRolesCount = 0;
            const changedRoles = {}; // Chỉ lưu thông tin các role có thay đổi
            let hasErrors = false;

            // Xử lý từng role
            for (const role of roles) {
                try {
                    const roleId = role._id.toString();
                    const selectedPermissions =
                        permissionsData && permissionsData[roleId]
                            ? permissionsData[roleId]
                            : [];
                    const currentPermissions = currentMapping[roleId] || [];

                    // So sánh để xem có thay đổi không
                    const newPermissionSet = new Set(selectedPermissions);
                    const oldPermissionSet = new Set(currentPermissions);

                    const isChanged =
                        newPermissionSet.size !== oldPermissionSet.size ||
                        [...newPermissionSet].some(
                            (p) => !oldPermissionSet.has(p)
                        ) ||
                        [...oldPermissionSet].some(
                            (p) => !newPermissionSet.has(p)
                        );

                    // Chỉ xử lý và ghi log cho các role có thay đổi
                    if (isChanged) {
                        // Xóa tất cả quyền cũ
                        await RolePermission.deleteMany({ roleId: role._id });

                        // Thêm lại quyền được chọn
                        if (selectedPermissions.length > 0) {
                            const validPermissions = await Permission.find({
                                _id: { $in: selectedPermissions },
                                isActive: true,
                            });

                            if (validPermissions.length > 0) {
                                const rolePermissionsData =
                                    validPermissions.map((permission) => ({
                                        roleId: role._id,
                                        permissionId: permission._id,
                                        isActive: true,
                                        grantedBy: currentUser._id,
                                        grantedAt: new Date(),
                                    }));

                                await RolePermission.insertMany(
                                    rolePermissionsData
                                );

                                changedRoles[role.name] = {
                                    success: true,
                                    message: `Cập nhật thành công ${validPermissions.length} quyền`,
                                    permissionCount: validPermissions.length,
                                    oldCount: currentPermissions.length,
                                };
                            } else {
                                changedRoles[role.name] = {
                                    success: true,
                                    message:
                                        "Không có quyền hợp lệ nào được chọn",
                                    permissionCount: 0,
                                    oldCount: currentPermissions.length,
                                };
                            }
                        } else {
                            changedRoles[role.name] = {
                                success: true,
                                message: "Đã xóa tất cả quyền",
                                permissionCount: 0,
                                oldCount: currentPermissions.length,
                            };
                        }

                        updatedRolesCount++;
                    }
                } catch (roleError) {
                    console.error(
                        `Lỗi khi cập nhật quyền cho role ${role.name}:`,
                        roleError
                    );
                    hasErrors = true;
                    changedRoles[role.name] = {
                        success: false,
                        message: "Cập nhật thất bại",
                        error: roleError.message,
                    };
                }
            }

            // Lấy dữ liệu mới để trả về
            const updatedRoles = await Role.find({ isActive: true }).sort({
                level: 1,
            });
            const updatedPermissions = await Permission.find({
                isActive: true,
            }).sort({ name: 1 });
            const updatedRolePermissions = await RolePermission.find({
                isActive: true,
            })
                .populate("roleId", "name level")
                .populate("permissionId", "name description");

            // Tạo permission matrix mới
            const updatedMapping = {};
            updatedRoles.forEach((role) => {
                updatedMapping[role._id] = [];
            });

            updatedRolePermissions.forEach((rp) => {
                if (rp.roleId && rp.permissionId) {
                    updatedMapping[rp.roleId._id].push(
                        rp.permissionId._id.toString()
                    );
                }
            });

            // Tạo thông báo tổng hợp
            const successRoles = Object.keys(changedRoles).filter(
                (roleName) => changedRoles[roleName].success
            );
            const failedRoles = Object.keys(changedRoles).filter(
                (roleName) => !changedRoles[roleName].success
            );

            let summaryMessage = "";
            if (Object.keys(changedRoles).length === 0) {
                summaryMessage = "Không có thay đổi nào được thực hiện";
            } else {
                if (successRoles.length > 0) {
                    summaryMessage += `Cập nhật thành công: ${successRoles.join(
                        ", "
                    )}`;
                }
                if (failedRoles.length > 0) {
                    if (summaryMessage) summaryMessage += "; ";
                    summaryMessage += `Cập nhật thất bại: ${failedRoles.join(
                        ", "
                    )}`;
                }
            }

            return res.json({
                success: !hasErrors && Object.keys(changedRoles).length > 0,
                message:
                    Object.keys(changedRoles).length === 0
                        ? "Không có thay đổi nào được thực hiện"
                        : hasErrors
                        ? "Cập nhật phân quyền hoàn tất với một số lỗi"
                        : `Cập nhật phân quyền thành công cho ${updatedRolesCount} vai trò!`,
                summary: summaryMessage,
                changedRoles: changedRoles, // Chỉ chứa các role có thay đổi
                totalChanged: Object.keys(changedRoles).length,
                data: {
                    roles: updatedRoles,
                    permissions: updatedPermissions,
                    mapping: updatedMapping,
                },
            });
        } catch (error) {
            console.error("Lỗi API cập nhật permissions:", error);
            return res.status(500).json({
                success: false,
                message: `Có lỗi xảy ra: ${error.message}`,
            });
        }
    },
};

module.exports = permissionController;
