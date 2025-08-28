const Role = require('../models/roleModel');

// Hiển thị danh sách vai trò
exports.getRoles = async (req, res) => {
    try {
        const roles = await Role.find({});
        res.render('role', { 
            roles,
            search: '',
            pagination: {
                current: 1,
                total: 1,
                limit: 5,
                hasPrev: false,
                hasNext: false
            },
            userPermissions: res.locals.userPermissions // Thêm dòng này để truyền quyền vào view
        });
    } catch (error) {
        req.flash('error', 'Có lỗi xảy ra khi tải danh sách vai trò');
        res.redirect('/dashboard');
    }
};

// Hiển thị form thêm mới
exports.getAddRole = (req, res) => {
    res.render('role/add', { 
        role: {}
    });
};

// Xử lý thêm mới
exports.postAddRole = async (req, res) => {
    try {
        const { name, description, level } = req.body;
        
        // Validation
        if (!name || !name.trim()) {
            req.flash('error', 'Tên vai trò không được để trống');
            return res.redirect('/roles/add');
        }
        
        if (!level || isNaN(level) || level < 1 || level > 4) {
            req.flash('error', 'Cấp độ quyền phải từ 1 đến 4');
            return res.redirect('/roles/add');
        }
        
        await Role.create({
            name: name.trim(),
            description: description?.trim() || '',
            level: parseInt(level),
            createdBy: req.session?.user?.fullName || 'System',
            updatedBy: req.session?.user?.fullName || 'System'
        });
        req.flash('message', 'Thêm vai trò thành công!');
        res.redirect('/roles');
    } catch (error) {
        console.error('Error creating role:', error);
        if (error.code === 11000) {
            req.flash('error', 'Tên vai trò đã tồn tại');
        } else {
            req.flash('error', 'Có lỗi xảy ra khi thêm vai trò: ' + error.message);
        }
        res.redirect('/roles/add');
    }
};

// Hiển thị form sửa
exports.getEditRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) {
            req.flash('error', 'Không tìm thấy vai trò');
            return res.redirect('/roles');
        }
        res.render('role/edit', { 
            role
        });
    } catch (error) {
        req.flash('error', 'Có lỗi xảy ra khi tải thông tin vai trò');
        res.redirect('/roles');
    }
};

// Xử lý sửa
exports.postEditRole = async (req, res) => {
    try {
        const { name, description, level } = req.body;
        
        // Validation
        if (!name || !name.trim()) {
            req.flash('error', 'Tên vai trò không được để trống');
            return res.redirect(`/roles/edit/${req.params.id}`);
        }
        
        if (!level || isNaN(level) || level < 1 || level > 4) {
            req.flash('error', 'Cấp độ quyền phải từ 1 đến 4');
            return res.redirect(`/roles/edit/${req.params.id}`);
        }
        
        await Role.findByIdAndUpdate(req.params.id, {
            name: name.trim(),
            description: description?.trim() || '',
            level: parseInt(level),
            updatedBy: req.session?.user?.fullName || 'System'
        });
        req.flash('message', 'Cập nhật vai trò thành công!');
        res.redirect('/roles');
    } catch (error) {
        console.error('Error updating role:', error);
        if (error.code === 11000) {
            req.flash('error', 'Tên vai trò đã tồn tại');
        } else {
            req.flash('error', 'Có lỗi xảy ra khi cập nhật vai trò: ' + error.message);
        }
        res.redirect(`/roles/edit/${req.params.id}`);
    }
};

// Xử lý xóa
exports.deleteRole = async (req, res) => {
    try {
        const role = await Role.findByIdAndDelete(req.params.id);
        if (!role) {
            // Handle AJAX request
            if (req.xhr || req.headers.accept?.includes("application/json")) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy vai trò'
                });
            }
            req.flash('error', 'Không tìm thấy vai trò');
            return res.redirect('/roles');
        }

        // Handle AJAX request
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            // Calculate pagination after deletion for AJAX requests
            const currentPage = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 5;

            // Count remaining roles (no search functionality for roles currently)
            const totalRemainingRoles = await Role.countDocuments({});
            const totalPages = Math.ceil(totalRemainingRoles / limit);

            // Calculate proper page to redirect to
            let redirectPage = currentPage;
            if (currentPage > totalPages && totalPages > 0) {
                redirectPage = totalPages;
            } else if (totalPages === 0) {
                redirectPage = 1;
            }

            return res.json({
                success: true,
                message: 'Xóa vai trò thành công',
                pagination: {
                    currentPage: currentPage,
                    redirectPage: redirectPage,
                    totalPages: totalPages,
                    totalRemainingRoles: totalRemainingRoles,
                    needsRedirect: redirectPage !== currentPage
                }
            });
        }

        req.flash('message', 'Xóa vai trò thành công!');
        res.redirect('/roles');
    } catch (error) {
        // Handle AJAX request error
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa vai trò'
            });
        }

        req.flash('error', 'Có lỗi xảy ra khi xóa vai trò');
        res.redirect('/roles');
    }
};

// ===== API METHODS =====

// API: Lấy vai trò theo ID
exports.getRoleById = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy vai trò'
            });
        }
        res.json({
            success: true,
            message: 'Lấy thông tin vai trò thành công',
            data: role
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy thông tin vai trò'
        });
    }
};

// API: Tạo vai trò mới
exports.createRole = async (req, res) => {
    try {
        const { name, description } = req.body;
        const role = await Role.create({
            name,
            description,
            createdBy: req.session?.user?.fullName || 'System',
            updatedBy: req.session?.user?.fullName || 'System'
        });
        res.status(201).json({
            success: true,
            message: 'Tạo vai trò thành công',
            data: role
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Có lỗi xảy ra khi tạo vai trò'
        });
    }
};

// API: Cập nhật vai trò
exports.updateRole = async (req, res) => {
    try {
        const { name, description } = req.body;
        const role = await Role.findByIdAndUpdate(
            req.params.id, 
            {
                name,
                description,
                updatedBy: req.session?.user?.fullName || 'System'
            },
            { new: true }
        );
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy vai trò'
            });
        }
        res.json({
            success: true,
            message: 'Cập nhật vai trò thành công',
            data: role
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Có lỗi xảy ra khi cập nhật vai trò'
        });
    }
};

// API: Lấy quyền của vai trò
exports.getRolePermissions = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy vai trò'
            });
        }
        res.json({
            success: true,
            message: 'Lấy quyền vai trò thành công',
            data: {
                roleId: role._id,
                roleName: role.name,
                permissions: role.permissions || []
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy quyền vai trò'
        });
    }
};

// API: Gán quyền cho vai trò
exports.assignPermissions = async (req, res) => {
    try {
        const { permissions } = req.body;
        const role = await Role.findByIdAndUpdate(
            req.params.id,
            {
                permissions: permissions || [],
                updatedBy: req.session?.user?.fullName || 'System'
            },
            { new: true }
        );
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy vai trò'
            });
        }
        res.json({
            success: true,
            message: 'Gán quyền thành công',
            data: role
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Có lỗi xảy ra khi gán quyền'
        });
    }
};

// API: Xóa vai trò
exports.deleteRoleAPI = async (req, res) => {
    try {
        const role = await Role.findByIdAndDelete(req.params.id);
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy vai trò'
            });
        }

        // Calculate pagination after deletion for AJAX requests
        const currentPage = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;

        // Count remaining roles (no search functionality for roles currently)
        const totalRemainingRoles = await Role.countDocuments({});
        const totalPages = Math.ceil(totalRemainingRoles / limit);

        // Calculate proper page to redirect to
        let redirectPage = currentPage;
        if (currentPage > totalPages && totalPages > 0) {
            redirectPage = totalPages;
        } else if (totalPages === 0) {
            redirectPage = 1;
        }

        res.json({
            success: true,
            message: 'Xóa vai trò thành công',
            data: role,
            pagination: {
                currentPage: currentPage,
                redirectPage: redirectPage,
                totalPages: totalPages,
                totalRemainingRoles: totalRemainingRoles,
                needsRedirect: redirectPage !== currentPage
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi xóa vai trò'
        });
    }
};