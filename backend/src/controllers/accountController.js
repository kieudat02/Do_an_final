const Account = require("../models/userModel");
const Role = require("../models/roleModel");
const bcrypt = require("bcrypt");
const { deleteImageFromCloudinary } = require("../utils/imageUtils");
const { canManageRole, hasPermission } = require("../constants/roles");

// Hiển thị danh sách tài khoản
exports.getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = {};
        if (search) {
            searchQuery = {
                $or: [
                    { fullName: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { role: { $regex: search, $options: "i" } },
                    { user_type: { $regex: search, $options: "i" } },
                ],
            };
        }

        // Get all users including customers - no filtering by user_type
        const [users, total] = await Promise.all([
            Account.find(searchQuery)
                .populate("role")
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: 1 }),
            Account.countDocuments(searchQuery),
        ]);

        const pagination = {
            current: page,
            limit,
            total: Math.ceil(total / limit),
            hasPrev: page > 1,
            hasNext: page < Math.ceil(total / limit),
        };

        res.render("account", {
            users,
            pagination,
            search,
            userPermissions: res.locals.userPermissions, // Truyền quyền vào view
        });
    } catch (error) {
        req.flash("error", "Có lỗi xảy ra khi tải danh sách tài khoản");
        res.redirect("/dashboard");
    }
};

// Hiển thị form thêm mới
exports.getAddUser = async (req, res) => {
    try {
        // Lấy danh sách vai trò từ database, sắp xếp theo thứ tự thêm vào (createdAt)
        const roles = await Role.find({}).sort({ createdAt: 1 });

        res.render("account/add", {
            user: {},
            roles: roles,
            validationErrors: {},
            message: req.flash("message"),
            error: req.flash("error"),
        });
    } catch (error) {
        console.error("Error fetching roles:", error);
        req.flash("error", "Có lỗi xảy ra khi tải danh sách vai trò");
        res.redirect("/account");
    }
};

// Xử lý thêm mới
exports.postAddUser = async (req, res) => {
    try {
        const { fullName, email, role, password, username } = req.body;
        let validationErrors = {};
        let hasError = false;

        // Validate required fields
        if (!fullName || fullName.trim() === '') {
            validationErrors.fullName = "Họ tên không được để trống";
            hasError = true;
        }
        
        if (!email || email.trim() === '') {
            validationErrors.email = "Email không được để trống";
            hasError = true;
        }

        if (!role || role.trim() === '') {
            validationErrors.role = "Vui lòng chọn vai trò";
            hasError = true;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email.trim())) {
            validationErrors.email = "Email không hợp lệ";
            hasError = true;
        }

        // Kiểm tra quyền tạo user với vai trò này
        if (!hasError && !canManageRole(req.session?.user?.role?.name, role)) {
            validationErrors.role = "Bạn không có quyền tạo tài khoản với vai trò này!";
            hasError = true;
        }

        // Tìm role theo name để lấy ObjectId
        const roleObj = await Role.findOne({ name: role });
        if (!hasError && !roleObj) {
            validationErrors.role = "Vai trò không tồn tại";
            hasError = true;
        }

        let avatar = "";
        if (req.file) {
            avatar = req.file.path; // Cloudinary trả về URL trong path
        }

        // Kiểm tra email đã tồn tại chưa
        const existingUserByEmail = await Account.findOne({ email: email.toLowerCase() });
        if (!hasError && existingUserByEmail) {
            validationErrors.email = "Email đã được sử dụng trong hệ thống";
            hasError = true;
        }

        // Kiểm tra username đã tồn tại chưa (nếu có)
        if (!hasError && username && username.trim() !== '') {
            const existingUserByUsername = await Account.findOne({ 
                username: username.toLowerCase() 
            });
            if (existingUserByUsername) {
                validationErrors.username = "Tên đăng nhập đã được sử dụng trong hệ thống";
                hasError = true;
            }
        }

        // Nếu có lỗi, render lại form với thông báo lỗi
        if (hasError) {
            // Lấy danh sách vai trò để hiển thị lại form
            const roles = await Role.find({}).sort({ createdAt: 1 });
            
            return res.render("account/add", {
                user: {
                    fullName: fullName || '',
                    email: email || '',
                    username: username || ''
                },
                roles: roles,
                validationErrors: validationErrors,
                message: req.flash("message"),
                error: req.flash("error")
            });
        }

        // Sử dụng password từ form hoặc mặc định
        const userPassword =
            password && password.trim() !== "" ? password : "123456";

        // Xác định user_type dựa trên vai trò
        let user_type = 'staff';
        if (role === 'Super Admin' || role === 'Admin') {
            user_type = 'admin';
        }

        // Tạo user mới với ObjectId của role
        await Account.create({
            fullName,
            email: email.toLowerCase(),
            username: username ? username.toLowerCase() : undefined,
            password: userPassword,
            status: "Hoạt động",
            role: roleObj._id, // Sử dụng ObjectId thay vì string
            avatar,
            user_type
        });

        req.flash("message", "Thêm tài khoản thành công!");
        res.redirect("/account");
    } catch (error) {
        console.error("Error adding user:", error);
        let validationErrors = {};
        
        // Chi tiết lỗi theo mã lỗi MongoDB
        if (error.code === 11000) {
            // Xác định trường bị trùng
            const field = Object.keys(error.keyPattern)[0];
            if (field === 'email') {
                validationErrors.email = "Email đã được sử dụng trong hệ thống";
            } else if (field === 'username') {
                validationErrors.username = "Tên đăng nhập đã được sử dụng trong hệ thống";
            } else {
                validationErrors[field] = `Trường '${field}' đã tồn tại trong hệ thống`;
            }
        } else if (error.name === "ValidationError") {
            // Chuyển đổi lỗi validation từ Mongoose thành định dạng mong muốn
            Object.keys(error.errors).forEach(field => {
                validationErrors[field] = error.errors[field].message;
            });
        } else {
            req.flash("error", "Có lỗi xảy ra khi thêm tài khoản");
            return res.redirect("/account/add");
        }
        
        // Lấy danh sách vai trò để hiển thị lại form
        const roles = await Role.find({}).sort({ createdAt: 1 });
        
        // Render lại form với thông báo lỗi
        return res.render("account/add", {
            user: req.body,
            roles: roles,
            validationErrors: validationErrors,
            message: req.flash("message"),
            error: req.flash("error")
        });
    }
};

// Hiển thị form sửa
exports.getEditUser = async (req, res) => {
    try {
        // Lấy thông tin user và danh sách vai trò song song, sắp xếp vai trò theo thứ tự thêm vào
        const [user, roles] = await Promise.all([
            Account.findById(req.params.id).populate("role"),
            Role.find({}).sort({ createdAt: 1 }),
        ]);

        if (!user) {
            req.flash("error", "Không tìm thấy tài khoản");
            return res.redirect("/account");
        }

        res.render("account/edit", {
            user,
            roles: roles,
            message: req.flash("message"),
            error: req.flash("error"),
        });
    } catch (error) {
        console.error("Error fetching user or roles:", error);
        req.flash("error", "Có lỗi xảy ra khi tải thông tin tài khoản");
        res.redirect("/account");
    }
};

// Xử lý sửa
exports.postEditUser = async (req, res) => {
    try {
        const { fullName, email, role, username } = req.body;
        const userId = req.params.id;

        // Check if it's an AJAX request
        const isAjax = req.xhr || req.headers.accept?.indexOf("json") > -1;

        // Create validation errors object
        const validationErrors = {};
        let hasError = false;

        // Lấy thông tin user cần sửa và kiểm tra quyền
        const userToEdit = await Account.findById(userId).populate("role");
        
        if (!userToEdit) {
            const errorMessage = "Không tìm thấy tài khoản";
            if (isAjax) {
                return res.status(404).json({ 
                    success: false, 
                    message: errorMessage
                });
            }
            req.flash("error", errorMessage);
            return res.redirect('/account');
        }
        
        // Kiểm tra xem có phải đang cố sửa Super Admin không
        if (userToEdit.role && userToEdit.role.name === "Super Admin" && 
            req.session.user.role.name !== "Super Admin") {
            const errorMessage = "Bạn không có quyền chỉnh sửa tài khoản Super Admin";
            if (isAjax) {
                return res.status(403).json({ 
                    success: false, 
                    message: errorMessage
                });
            }
            req.flash("error", errorMessage);
            return res.redirect('/account');
        }

        // Validate required fields
        if (!fullName || !fullName.trim()) {
            validationErrors.fullName = "Họ tên không được để trống";
            hasError = true;
        }

        if (!email || !email.trim()) {
            validationErrors.email = "Email không được để trống";
            hasError = true;
        } else {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                validationErrors.email = "Email không hợp lệ";
                hasError = true;
            }
        }

        if (!role || role.trim() === '') {
            validationErrors.role = "Vui lòng chọn vai trò";
            hasError = true;
        }

        // Check if email already exists (excluding current user)
        if (!hasError && email && email.trim() !== '') {
            const existingUserByEmail = await Account.findOne({
                email: email.trim().toLowerCase(),
                _id: { $ne: userId },
            });

            if (existingUserByEmail) {
                validationErrors.email = "Email đã được sử dụng trong hệ thống";
                hasError = true;
            }
        }
        
        // Check if username already exists (excluding current user)
        if (!hasError && username && username.trim() !== '') {
            const existingUserByUsername = await Account.findOne({
                username: username.trim().toLowerCase(),
                _id: { $ne: userId },
            });
            
            if (existingUserByUsername) {
                validationErrors.username = "Tên đăng nhập đã được sử dụng trong hệ thống";
                hasError = true;
            }
        }

        // Return validation errors if any
        if (hasError) {
            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: "Dữ liệu không hợp lệ",
                    validationErrors
                });
            }
            
            // If not AJAX, render the page with errors
            const roles = await Role.find({}).sort({ createdAt: 1 });
            return res.render("account/edit", {
                user: {
                    ...userToEdit.toObject(),
                    ...req.body
                },
                roles: roles,
                validationErrors,
                message: req.flash("message"),
                error: req.flash("error")
            });
        }

        // Tìm role theo name để lấy ObjectId
        const roleObj = await Role.findOne({ name: role });
        if (!roleObj) {
            const errorMessage = "Vai trò không tồn tại";
            if (isAjax) {
                return res.status(400).json({ 
                    success: false, 
                    message: errorMessage,
                    validationErrors: {
                        role: errorMessage
                    }
                });
            }
            req.flash("error", errorMessage);
            return res.redirect(`/account/edit/${userId}`);
        }

        // Xác định user_type dựa trên vai trò
        let user_type = 'staff';
        if (role === 'Super Admin' || role === 'Admin') {
            user_type = 'admin';
        } else if (userToEdit.user_type === 'customer') {
            // Giữ nguyên user_type là customer nếu đang chỉnh sửa tài khoản khách hàng
            user_type = 'customer';
        }

        let update = {
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            role: roleObj._id, // Sử dụng ObjectId thay vì string
            user_type
        };
        
        // Chỉ cập nhật username nếu được cung cấp
        if (username && username.trim() !== '') {
            update.username = username.trim().toLowerCase();
        }

        // Nếu có upload ảnh mới
        if (req.file) {
            // Lấy thông tin user hiện tại để xóa ảnh cũ
            const currentUser = await Account.findById(userId);
            if (currentUser && currentUser.avatar) {
                // Xóa ảnh cũ từ Cloudinary
                await deleteImageFromCloudinary(currentUser.avatar, "avatars");
            }

            update.avatar = req.file.path; // URL mới từ Cloudinary
            
            // Cập nhật avatar trong session nếu người dùng đang cập nhật chính tài khoản của họ
            if (req.session && req.session.user && req.session.user._id && 
                (req.session.user._id.toString() === userId.toString() || req.session.user.id.toString() === userId.toString())) {
                req.session.user.avatar = req.file.path;
            }
        }

        await Account.findByIdAndUpdate(userId, update);

        // Cập nhật session nếu người dùng đang cập nhật chính tài khoản của họ
        if (req.session && req.session.user && req.session.user._id && 
            (req.session.user._id.toString() === userId.toString() || req.session.user.id.toString() === userId.toString())) {
            
            req.session.user.fullName = update.fullName;
            req.session.user.email = update.email;
            req.session.user.user_type = update.user_type;
            if (update.username) {
                req.session.user.username = update.username;
            }
            
            // Cập nhật thông tin role nếu cần
            if (roleObj && roleObj._id) {
                req.session.user.role = {
                    _id: roleObj._id,
                    name: roleObj.name,
                    level: roleObj.level,
                    description: roleObj.description
                };
            }
            
            // Lưu lại session để đảm bảo cập nhật ngay lập tức
            req.session.save();
        }

        const successMessage = "Cập nhật tài khoản thành công!";

        // Check if this is an AJAX request
        if (isAjax) {
            return res.json({ success: true, message: successMessage });
        }

        req.flash("message", successMessage);
        res.redirect("/account");
    } catch (error) {
        console.error("Error in account update:", error);

        const isAjax = req.xhr || req.headers.accept?.indexOf("json") > -1;
        let validationErrors = {};

        // Handle specific errors
        let errorMessage = "Có lỗi xảy ra khi cập nhật tài khoản";

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            errorMessage = field === 'email' 
                ? "Email đã được sử dụng trong hệ thống"
                : field === 'username'
                    ? "Tên đăng nhập đã được sử dụng trong hệ thống"
                    : `Trường '${field}' đã tồn tại trong hệ thống`;
            
            validationErrors[field] = errorMessage;
        } else if (error.name === "ValidationError") {
            errorMessage = "Dữ liệu không hợp lệ";
            
            // Process Mongoose validation errors
            Object.keys(error.errors).forEach(field => {
                validationErrors[field] = error.errors[field].message;
            });
        }

        // Check if this is an AJAX request
        if (isAjax) {
            return res.status(400).json({ 
                success: false, 
                message: errorMessage,
                validationErrors
            });
        }

        req.flash("error", errorMessage);
        res.redirect(`/account/edit/${req.params.id}`);
    }
};

// Xử lý xóa
exports.deleteUser = async (req, res) => {
    try {
        // Lấy thông tin user để xóa ảnh từ Cloudinary
        const user = await Account.findById(req.params.id).populate("role");
        
        if (!user) {
            req.flash("error", "Không tìm thấy tài khoản");
            return res.redirect("/account");
        }
        
        // Kiểm tra xem có phải đang cố xóa Super Admin không
        if (user.role && user.role.name === "Super Admin" && 
            req.session.user.role.name !== "Super Admin") {
            req.flash("error", "Bạn không có quyền xóa tài khoản Super Admin");
            return res.redirect("/account");
        }

        if (user && user.avatar) {
            // Xóa ảnh từ Cloudinary
            await deleteImageFromCloudinary(user.avatar, "avatars");
        }

        await Account.findByIdAndDelete(req.params.id);
        req.flash("message", "Xóa tài khoản thành công!");
        res.redirect("/account");
    } catch (error) {
        req.flash("error", "Có lỗi xảy ra khi xóa tài khoản");
        res.redirect("/account");
    }
};

// Toggle trạng thái tài khoản
exports.toggleUserStatus = async (req, res) => {
    try {
        const user = await Account.findById(req.params.id).populate("role");
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "Không tìm thấy tài khoản" });
        }

        // Kiểm tra xem có phải đang cố thay đổi trạng thái của Super Admin không
        if (user.role && user.role.name === "Super Admin" && 
            req.session.user.role.name !== "Super Admin") {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền thay đổi trạng thái tài khoản Super Admin"
            });
        }

        // Đổi trạng thái
        const newStatus =
            user.status === "Hoạt động" ? "Tạm dừng" : "Hoạt động";
        await Account.findByIdAndUpdate(req.params.id, { status: newStatus });

        res.json({
            success: true,
            newStatus: newStatus,
            message: `Đã ${
                newStatus === "Hoạt động" ? "kích hoạt" : "vô hiệu hóa"
            } tài khoản thành công!`,
        });
    } catch (error) {
        console.error("Error toggling user status:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thay đổi trạng thái",
        });
    }
};

//-- API Methods --

// Lấy danh sách người dùng API
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = {};
        if (search) {
            searchQuery = {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { phone: { $regex: search, $options: "i" } },
                ],
            };
        }

        const [users, total] = await Promise.all([
            Account.find(searchQuery)
                .populate("role")
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: 1 }),
            Account.countDocuments(searchQuery),
        ]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                current: page,
                total: totalPages,
                limit,
                totalItems: total,
            },
        });
    } catch (error) {
        console.error("Error in getAllUsers API:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải danh sách người dùng",
        });
    }
};

// Lấy thông tin người dùng theo ID API
exports.getUserById = async (req, res) => {
    try {
        const user = await Account.findById(req.params.id).populate("role");
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng",
            });
        }

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error("Error in getUserById API:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải thông tin người dùng",
        });
    }
};

// Tạo người dùng mới qua API
exports.createUser = async (req, res) => {
    try {
        const { name, email, phone, password, role, username } = req.body;

        // Validate input
        const validationErrors = {};
        let hasValidationError = false;

        // Validate required fields
        if (!name || !name.trim()) {
            validationErrors.name = "Họ tên không được để trống";
            hasValidationError = true;
        }

        if (!email || !email.trim()) {
            validationErrors.email = "Email không được để trống";
            hasValidationError = true;
        } else {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                validationErrors.email = "Email không hợp lệ";
                hasValidationError = true;
            }
        }

        if (!password || !password.trim()) {
            validationErrors.password = "Mật khẩu không được để trống";
            hasValidationError = true;
        } else if (password.trim().length < 6) {
            validationErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
            hasValidationError = true;
        }

        // Return validation errors if any
        if (hasValidationError) {
            return res.status(400).json({
                success: false,
                message: "Dữ liệu không hợp lệ",
                validationErrors
            });
        }

        // Check if email already exists
        const existingUserByEmail = await Account.findOne({ email: email.toLowerCase() });
        if (existingUserByEmail) {
            return res.status(400).json({
                success: false,
                message: "Email đã được sử dụng trong hệ thống",
                validationErrors: {
                    email: "Email đã được sử dụng trong hệ thống"
                }
            });
        }

        // Check if username exists (if provided)
        if (username && username.trim()) {
            const existingUserByUsername = await Account.findOne({ username: username.toLowerCase() });
            if (existingUserByUsername) {
                return res.status(400).json({
                    success: false,
                    message: "Tên đăng nhập đã được sử dụng trong hệ thống",
                    validationErrors: {
                        username: "Tên đăng nhập đã được sử dụng trong hệ thống"
                    }
                });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Handle avatar upload
        let avatarUrl = "";
        
        if (req.file && req.file.path) {
            avatarUrl = req.file.path;
        }

        // Set user type based on role
        let user_type = 'customer';
        if (role) {
            const roleObj = await Role.findById(role);
            if (roleObj) {
                if (roleObj.name === 'Super Admin' || roleObj.name === 'Admin') {
                    user_type = 'admin';
                } else {
                    user_type = 'staff';
                }
            }
        }

        // Create new user
        const newUser = new Account({
            fullName: name,
            email: email.toLowerCase(),
            username: username ? username.toLowerCase() : undefined,
            phone: phone || "",
            password: hashedPassword,
            avatar: avatarUrl,
            role: role || null,
            status: "Hoạt động",
            user_type
        });

        await newUser.save();

        // Remove password from response
        const userResponse = newUser.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: "Tạo người dùng thành công",
            data: userResponse,
        });
    } catch (error) {
        
        // Delete uploaded avatar if there was an error
        if (req.file && req.file.filename) {
            await deleteImageFromCloudinary(req.file.filename);
        }
        
        // Handle specific validation errors
        if (error.name === "ValidationError") {
            const validationErrors = {};
            for (let field in error.errors) {
                validationErrors[field] = error.errors[field].message;
            }
            
            return res.status(400).json({
                success: false,
                message: "Dữ liệu không hợp lệ",
                validationErrors
            });
        }
        
        // Handle duplicate key errors (MongoDB code 11000)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const fieldName = field === 'email' ? 'Email' : (field === 'username' ? 'Tên đăng nhập' : field);
            const message = `${fieldName} đã được sử dụng trong hệ thống`;
            
            return res.status(400).json({
                success: false,
                message: message,
                validationErrors: {
                    [field]: message
                }
            });
        }
        
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi tạo người dùng",
        });
    }
};

// Cập nhật người dùng qua API
exports.updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { name, email, phone, role, password } = req.body;

        // Validate input
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Tên và email không được để trống",
            });
        }

        // Check if user exists
        const user = await Account.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng",
            });
        }

        // Check if email already exists (excluding current user)
        const existingUser = await Account.findOne({
            email,
            _id: { $ne: userId },
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email đã tồn tại",
            });
        }

        // Prepare update data
        const updateData = {
            name,
            email,
            phone: phone || "",
            role: role || user.role,
            updatedAt: new Date(),
        };

        // If password is provided, hash it
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        // Handle avatar upload
        if (req.file && req.file.path) {
            // Delete old avatar if it exists
            if (user.avatar) {
                const publicId = user.avatar.split("/").pop().split(".")[0];
                await deleteImageFromCloudinary(publicId);
            }
            
            updateData.avatar = req.file.path;
        }

        // Update user
        const updatedUser = await Account.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).populate("role");

        // Remove password from response
        const userResponse = updatedUser.toObject();
        delete userResponse.password;

        res.status(200).json({
            success: true,
            message: "Cập nhật người dùng thành công",
            data: userResponse,
        });
    } catch (error) {
        console.error("Error in updateUser API:", error);
        
        // Delete uploaded avatar if there was an error
        if (req.file && req.file.filename) {
            await deleteImageFromCloudinary(req.file.filename);
        }
        
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi cập nhật người dùng",
        });
    }
};

// Xóa người dùng qua API
exports.apiDeleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if user exists
        const user = await Account.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng",
            });
        }

        // Delete avatar if it exists
        if (user.avatar) {
            const publicId = user.avatar.split("/").pop().split(".")[0];
            await deleteImageFromCloudinary(publicId);
        }

        // Delete user
        await Account.findByIdAndDelete(userId);

        res.status(200).json({
            success: true,
            message: "Xóa người dùng thành công",
        });
    } catch (error) {
        console.error("Error in apiDeleteUser:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa người dùng",
        });
    }
};

// Thay đổi trạng thái người dùng qua API
exports.apiToggleUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if user exists
        const user = await Account.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng",
            });
        }

        // Toggle status
        const newStatus = user.status === "Hoạt động" ? "Không hoạt động" : "Hoạt động";

        // Update user
        const updatedUser = await Account.findByIdAndUpdate(
            userId,
            {
                status: newStatus,
                updatedAt: new Date(),
            },
            { new: true }
        ).populate("role");

        res.status(200).json({
            success: true,
            message: `Đã ${newStatus === "Hoạt động" ? "kích hoạt" : "vô hiệu hóa"} người dùng thành công`,
            data: updatedUser,
        });
    } catch (error) {
        console.error("Error in apiToggleUserStatus:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thay đổi trạng thái người dùng",
        });
    }
};
