const User = require('../models/userModel');
const Role = require('../models/roleModel');
const { body, validationResult } = require('express-validator');
const { isEmailVerified } = require('./emailOtpController');
const { validateEmail } = require('../utils/emailUtils');
const { generateToken } = require('../utils/jwtUtils');

// Hiển thị form đăng nhập
exports.getLogin = (req, res) => {
    // Nếu đã đăng nhập rồi thì redirect về dashboard
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    
    let error = req.flash('error')[0] || null;
    let message = req.flash('message')[0] || null;
    let isLogout = false;
    
    // Xử lý thông báo từ query params
    if (req.query.timeout === 'true') {
        error = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!';
    }
    
    if (req.query.logout === 'success') {
        message = 'Đăng xuất thành công!';
        isLogout = true;
    }
    
    res.render('login', { 
        error: error, 
        message: message,
        isLogout: isLogout
    });
};

// Xử lý đăng nhập (session-based for admin panel)
exports.postLogin = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.render('login', { 
                    error: 'Dữ liệu không hợp lệ', 
                    message: null,
                    isLogout: false
                });
            }

            const { email, password } = req.body;

            // Tìm user với status Hoạt động
            const user = await User.findOne({
                email: email.toLowerCase(),
                status: 'Hoạt động'
            }).populate('role');
            
            // Nếu không tìm thấy user hoặc mật khẩu không đúng
            if (!user || !(await user.comparePassword(password))) {
                return res.render('login', { 
                    error: 'Email hoặc mật khẩu không đúng!', 
                    message: null,
                    isLogout: false
                });
            }
            
            // Kiểm tra role
            if (!user.role) {
                return res.render('login', {
                    error: 'Tài khoản chưa được phân quyền. Vui lòng liên hệ quản trị viên!',
                    message: null,
                    isLogout: false
                });
            }

            // Chỉ cho phép 4 role được phép truy cập admin panel
            const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Viewer'];

            if (!user.role || !allowedRoles.includes(user.role.name)) {
                return res.render('login', {
                    error: 'Tài khoản không có quyền truy cập trang quản trị!',
                    message: null,
                    isLogout: false
                });
            }

            // Lưu thông tin user vào session với role đầy đủ
            req.session.user = {
                id: user._id,
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                avatar: user.avatar || '',
                user_type: user.user_type,
                role: {
                    _id: user.role._id,
                    name: user.role.name,
                    level: user.role.level || 1,
                    description: user.role.description || ''
                },
                status: user.status
            };
            
            // Set thời gian truy cập cuối và session token
            req.session.lastAccess = Date.now();
            req.session.token = require('crypto').randomBytes(32).toString('hex');
            
            // Cập nhật global sessions tracking
            if (!global.userSessions) {
                global.userSessions = new Map();
            }
            global.userSessions.set(user._id.toString(), req.sessionID);

            // Thêm thông báo đăng nhập thành công
            const welcomeMessage = `Chào mừng ${user.fullName}! Đăng nhập thành công.`;
            
            // Lưu thông báo vào session để hiển thị sau khi redirect
            req.session.loginMessage = welcomeMessage;
            
            // Đảm bảo session được lưu trước khi redirect
            req.session.save((err) => {
                if (err) {
                    console.error('Error saving session:', err);
                }
                res.redirect('/dashboard');
            });

        } catch (error) {
            console.error('Login error:', error);
            return res.render('login', { 
                error: 'Có lỗi xảy ra. Vui lòng thử lại!', 
                message: null,
                isLogout: false
            });
        }
    }
];

// Đăng xuất an toàn với session security
exports.logout = (req, res) => {
    // Sử dụng middleware security để xử lý logout
    const sessionSecurity = require('../middleware/sessionSecurityMiddleware');
    
    sessionSecurity.secureLogout(req, res, () => {
        // Set thêm headers bảo mật
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        // Redirect về login với thông báo logout thành công
        res.redirect('/login?logout=success');
    });
};

/**
 * Login via API with JWT (for frontend)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.login = async (req, res) => {
    try {        
        // Support both email and username fields
        const email = req.body.email || req.body.username;
        const { password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email/username và mật khẩu không được để trống',
                validationErrors: {
                    ...(email ? {} : { email: 'Email/username không được để trống' }),
                    ...(password ? {} : { password: 'Mật khẩu không được để trống' })
                }
            });
        }
        
        // Find user by email
        const user = await User.findOne({ 
            email: email.toLowerCase()
        }).populate('role');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Thông tin đăng nhập không chính xác',
                validationErrors: {
                    email: 'Email không tồn tại trong hệ thống'
                }
            });
        }
        
        // Check password
        const isPasswordValid = await user.comparePassword(password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Thông tin đăng nhập không chính xác',
                validationErrors: {
                    password: 'Mật khẩu không chính xác'
                }
            });
        }
        
        // Check if user is active
        if (user.status !== 'Hoạt động') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản đã bị khóa',
                validationErrors: {
                    account: 'Tài khoản của bạn đã bị khóa'
                }
            });
        }
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Return user info and token
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công',
            user: userResponse,
            token
        });
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi đăng nhập'
        });
    }
};

/**
 * Register a new user account (only for customers)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.register = async (req, res) => {
    try {
        const { 
            fullName, 
            email, 
            username, 
            password, 
            confirmPassword,
            phone
        } = req.body;
        
        // Validate required fields
        const validationErrors = {};
        
        if (!fullName || fullName.trim() === '') {
            validationErrors.fullName = "Họ tên không được để trống";
        }
        
        if (!email || !validateEmail(email)) {
            validationErrors.email = "Email không hợp lệ";
        }
        
        if (!password || password.length < 6) {
            validationErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
        }
        
        if (password !== confirmPassword) {
            validationErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
        }
        
        // Check if username is provided and not empty
        if (username && username.trim() === '') {
            validationErrors.username = "Tên đăng nhập không được để trống nếu được cung cấp";
        }
        
        // Return validation errors if any
        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({
                success: false,
                message: "Thông tin đăng ký không hợp lệ",
                validationErrors
            });
        }
        
        //Kiểm tra xem email có được xác minh không
        const normalizedEmail = email.toLowerCase();
        const emailVerified = await isEmailVerified(normalizedEmail);
        
        if (!emailVerified) {
            return res.status(403).json({
                success: false,
                message: "Email chưa được xác minh",
                requireEmailVerification: true,
                validationErrors: {
                    email: "Email phải được xác minh trước khi đăng ký"
                }
            });
        }
        
        // Check if email already exists
        const existingUserByEmail = await User.findOne({ email: normalizedEmail });
        if (existingUserByEmail) {
            return res.status(400).json({
                success: false,
                message: "Email đã được sử dụng",
                validationErrors: {
                    email: "Email đã được sử dụng bởi tài khoản khác"
                }
            });
        }
        
        // Check if username exists (if provided)
        if (username) {
            const normalizedUsername = username.toLowerCase();
            const existingUserByUsername = await User.findOne({ username: normalizedUsername });
            if (existingUserByUsername) {
                return res.status(400).json({
                    success: false,
                    message: "Tên đăng nhập đã được sử dụng",
                    validationErrors: {
                        username: "Tên đăng nhập đã được sử dụng bởi tài khoản khác"
                    }
                });
            }
        }
        
        //Tìm vai trò của khách hàng hoặc tạo nếu không tồn tại
        let customerRole = await Role.findOne({ name: 'Customer' });
        if (!customerRole) {
            customerRole = await Role.create({
                name: 'Customer',
                description: 'Customer role',
                level: 4  // Level cao nhất - không có quyền admin
            });
        } else if (customerRole.level <= 3) {
            // Update nếu role cũ có level thấp (có quyền admin)
            customerRole.level = 4;
            await customerRole.save();
        }
        //Tạo người dùng với vai trò khách hàng
        const newUser = new User({
            fullName,
            email: normalizedEmail,
            password,
            username: username ? username.toLowerCase() : undefined,
            phone: phone || '',
            status: 'Hoạt động',
            role: customerRole._id,
            user_type: 'customer',
            isEmailVerified: true
        });
        
        await newUser.save();
        
        // Generate JWT token
        const token = generateToken(newUser);
        
        // Return success with user data (excluding password)
        const userResponse = newUser.toObject();
        delete userResponse.password;
        
        res.status(201).json({
            success: true,
            message: "Đăng ký tài khoản thành công",
            user: userResponse,
            token
        });
        
    } catch (error) {
        
        // Handle specific validation errors from MongoDB
        if (error.code === 11000) {
            // Duplicate key error
            const field = Object.keys(error.keyPattern)[0];
            const errorMessage = field === 'email' 
                ? 'Email đã được sử dụng' 
                : field === 'username' 
                    ? 'Tên đăng nhập đã được sử dụng'
                    : `${field} đã tồn tại`;
                    
            return res.status(400).json({
                success: false,
                message: errorMessage,
                validationErrors: {
                    [field]: errorMessage
                }
            });
        }
        
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi đăng ký tài khoản",
            error: error.message
        });
    }
};