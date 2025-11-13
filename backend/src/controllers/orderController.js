const Order = require('../models/orderModel');
const Tour = require('../models/tourModel');
const TourDetail = require('../models/tourDetailModel');
const { calculateBookingTotal } = require('../utils/priceCalculator');
const { isPhoneVerified } = require('../controllers/otpController');
const { validatePhoneNumber } = require('../utils/otpUtil');
const bookingNotificationService = require('../services/bookingNotificationService');
const ReviewTokenService = require('../services/reviewTokenService');
const { deductStock, restoreStock, validateStock } = require('../utils/stockManager');
const { createOrderWithTransaction, updateOrderWithTransaction } = require('../services/transactionService');

// Helper function để chuyển đổi paymentMethod từ frontend sang model
const normalizePaymentMethod = (paymentMethod) => {
    switch (paymentMethod) {
        case 'Ví điện tử VNPay':
            return 'VNPay';
        case 'Ví điện tử MoMo':
            return 'MoMo';
        default:
            return paymentMethod;
    }
};

// Xem danh sách đơn hàng
exports.getOrdersPage = async (req, res) => {
    try {
        res.render('order', {
            title: 'Quản lý đơn hàng',
            csrfToken: res.locals.csrfToken,
            userPermissions: res.locals.userPermissions,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('Error in getOrdersPage:', error);
        req.flash('error', 'Có lỗi xảy ra khi tải trang đơn hàng');
        res.redirect('/dashboard');
    }
};

// Xem chi tiết đơn hàng
exports.getOrderDetailPage = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        // Tìm đơn hàng theo ID
        const order = await Order.findById(orderId);
        
        if (!order) {
            req.flash('error', 'Không tìm thấy đơn hàng');
            return res.redirect('/orders');
        }
        
        // Lấy thông tin tour và tour detail nếu có
        let tourInfo = null;
        let tourDetailInfo = null;
        if (order.items && order.items.length > 0 && order.items[0].tourId) {
            tourInfo = await Tour.findById(order.items[0].tourId);
            
            // Lấy thông tin tour detail nếu có tourDetailId
            if (order.items[0].tourDetailId) {
                tourDetailInfo = await TourDetail.findById(order.items[0].tourDetailId);
            }
        }
        
        res.render('order/orderDetail', {
            title: `Chi tiết đơn hàng #${order.orderId}`,
            order,
            tourInfo,
            tourDetailInfo,
            csrfToken: res.locals.csrfToken,
            userPermissions: res.locals.userPermissions,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('Error in getOrderDetailPage:', error);
        req.flash('error', 'Có lỗi xảy ra khi tải chi tiết đơn hàng');
        res.redirect('/orders');
    }
};

// Lấy danh sách đơn hàng với phân trang và lọc
exports.getAllOrders = async (req, res) => {
    try {
        // Lấy tham số từ query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status || 'all';
        const search = req.query.search || '';
        
        // Tính toán skip
        const skip = (page - 1) * limit;
        
        // Xây dựng filter
        let filter = {};
        
        // Lọc theo trạng thái nếu không phải 'all'
        if (status !== 'all') {
            filter.status = status;
        }
        
        // Tìm kiếm theo tên khách hàng, email, số điện thoại, địa chỉ hoặc ID đơn hàng
        if (search) {
            filter.$or = [
                { customer: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { address: { $regex: search, $options: 'i' } },
                { orderId: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Đếm tổng số document phù hợp với filter
        const total = await Order.countDocuments(filter);
        
        // Lấy đơn hàng với phân trang
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 }) // Mới nhất trước
            .skip(skip)
            .limit(limit);
        
        // Tính toán tổng số trang
        const totalPages = Math.ceil(total / limit);
        
        res.status(200).json({
            success: true,
            orders,
            currentPage: page,
            totalPages,
            totalOrders: total
        });
    } catch (error) {
        console.error('Error in getAllOrders:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy danh sách đơn hàng',
            error: error.message
        });
    }
};

// Lấy đơn hàng theo ID
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }
        
        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Error in getOrderById:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy thông tin đơn hàng',
            error: error.message
        });
    }
};

/**
 * Get orders for the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Find orders for this user
        // Adjust query according to your schema (e.g., userId or customer field)
        const orders = await Order.find({ 
            // You may need to adjust this query based on your schema
            $or: [
                { userId: userId },
                { 'customer.userId': userId },
                { 'customerInfo.userId': userId }
            ]
        }).sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy danh sách đơn hàng',
            error: error.message
        });
    }
};

// Tạo đơn hàng mới
exports.createOrder = async (req, res) => {
    try {
        const {
            customer,
            email,
            phone,
            address,
            items,
            paymentMethod,
            notes
        } = req.body;
        
        // Validate required fields
        const validationErrors = {};
        
        if (!customer || customer.trim() === '') {
            validationErrors.customer = "Tên khách hàng không được để trống";
        }
        
        if (!email || email.trim() === '') {
            validationErrors.email = "Email không được để trống";
        }
        
        if (!phone || phone.trim() === '') {
            validationErrors.phone = "Số điện thoại không được để trống";
        } else if (!validatePhoneNumber(phone)) {
            validationErrors.phone = "Số điện thoại không hợp lệ";
        }
        
        // Address is optional, will be filled from notes if needed
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            validationErrors.items = "Đơn hàng phải có ít nhất một sản phẩm";
        } else {
            // Validate each item
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (!item.tourId) {
                    validationErrors.items = `Tour ID không được để trống ở item ${i + 1}`;
                    break;
                }
                if (!item.name) {
                    validationErrors.items = `Tên tour không được để trống ở item ${i + 1}`;
                    break;
                }
                if (!item.adults || item.adults < 0) {
                    validationErrors.items = `Số người lớn phải lớn hơn 0 ở item ${i + 1}`;
                    break;
                }
                if (!item.startDate) {
                    validationErrors.items = `Ngày khởi hành không được để trống ở item ${i + 1}`;
                    break;
                }
            }
        }
        
        // Validate tour dates if no basic validation errors
        if (Object.keys(validationErrors).length === 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.tourId && item.startDate) {
                    try {
                        // Kiểm tra tour có tồn tại không
                        const tour = await Tour.findById(item.tourId);
                        if (!tour) {
                            validationErrors.items = `Tour không tồn tại ở item ${i + 1}`;
                            break;
                        }

                        // Lấy danh sách tour details
                        const tourDetails = await TourDetail.find({ tourId: item.tourId });
                        if (!tourDetails || tourDetails.length === 0) {
                            validationErrors.items = `Tour chưa có lịch khởi hành ở item ${i + 1}`;
                            break;
                        }

                        // Kiểm tra ngày đặt có trùng với ngày khởi hành nào không
                        const requestedDate = new Date(item.startDate);
                        requestedDate.setHours(0, 0, 0, 0);

                        const validDate = tourDetails.find(detail => {
                            const departureDate = new Date(detail.dayStart);
                            departureDate.setHours(0, 0, 0, 0);
                            return departureDate.getTime() === requestedDate.getTime() && detail.stock > 0;
                        });

                        if (!validDate) {
                            validationErrors.items = `Vui lòng chọn ngày khác, đã hết chỗ`;
                            break;
                        }
                    } catch (error) {
                        console.error('Error validating tour date:', error);
                        validationErrors.items = `Lỗi khi kiểm tra thông tin tour ở item ${i + 1}`;
                        break;
                    }
                }
            }
        }

        // Return validation errors if any
        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({
                success: false,
                message: "Thông tin đặt tour không hợp lệ",
                validationErrors
            });
        }
        
        // Check if phone is verified
        const phoneVerified = await isPhoneVerified(phone);
        
        if (!phoneVerified) {
            return res.status(403).json({
                success: false,
                message: "Số điện thoại chưa được xác minh",
                requirePhoneVerification: true,
                validationErrors: {
                    phone: "Số điện thoại phải được xác minh trước khi đặt tour"
                }
            });
        }
        
        // Tính tổng tiền server-side để đảm bảo chính xác
        let computedItems = [];
        let computedTotal = 0;

        if (Array.isArray(items)) {
            for (const rawItem of items) {
                try {
                    const tourId = rawItem.tourId;
                    const tourDetailId = rawItem.tourDetailId || rawItem.detailId; // hỗ trợ cả detailId
                    const adults = parseInt(rawItem.adults || 0) || 0;
                    const children = parseInt(rawItem.children || 0) || 0;
                    const child = parseInt(rawItem.child || 0) || 0;
                    const baby = parseInt(rawItem.baby || 0) || 0;
                    const singleRooms = parseInt(rawItem.singleRooms || 0) || 0;

                    let lineTotal = 0;
                    let resolvedTourId = tourId;
                    let lineName = rawItem.name;

                    if (tourDetailId) {
                        const detail = await TourDetail.findById(tourDetailId).lean();
                        if (detail) {
                            lineTotal = calculateBookingTotal(
                                detail,
                                { adults, children, child, baby },
                                { singleRooms }
                            );
                            resolvedTourId = detail.tourId || tourId;
                        } else {
                            // Fallback khi không tìm thấy detail
                            const tour = await Tour.findById(tourId).lean();
                            const unit = (tour && tour.price) ? tour.price : 0;
                            lineTotal = unit * (adults + children + child + baby);
                        }
                    } else {
                        // Không có tourDetailId: fallback dùng min price của tour
                        const tour = await Tour.findById(tourId).lean();
                        const unit = (tour && tour.price) ? tour.price : 0;
                        lineName = lineName || (tour ? tour.title : undefined);
                        lineTotal = unit * (adults + children + child + baby);
                    }

                    // Lưu item với price = tổng dòng, quantity = 1 để tương thích schema hiện tại
                    const computed = {
                        tourId: resolvedTourId,
                        name: lineName,
                        price: Math.max(0, Math.round(lineTotal)),
                        quantity: 1,
                        adults,
                        children,
                        babies: baby, // Lưu thông tin trẻ nhỏ
                        singleRooms, // Lưu số phòng đơn
                        startDate: rawItem.startDate, // Lưu ngày khởi hành khách hàng chọn
                        startTime: rawItem.startTime || (detail ? detail.startTime : null), // Lưu giờ khởi hành từ frontend hoặc tourDetail
                        tourDetailId: tourDetailId // Lưu ID của tour detail được sử dụng
                    };
                    computedItems.push(computed);
                    computedTotal += computed.price;
                } catch (e) {
                    console.error('Error computing order line:', e.message);
                }
            }
        }

        // Chuyển đổi paymentMethod từ frontend sang giá trị được chấp nhận bởi model
        const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

        // Tạo đơn hàng mới với tổng tiền đã tính
        const order = new Order({
            customer,
            email,
            phone,
            address: address || 'Chờ cập nhật', // Sử dụng address riêng biệt
            totalAmount: computedTotal,
            items: computedItems,
            paymentMethod: normalizedPaymentMethod,
            notes, // Ghi chú riêng biệt với address
            createdBy: req.user ? req.user.fullName || req.user.email : 'System'
        });

        // Kiểm tra stock một lần nữa trước khi lưu (để tránh race condition)
        const stockValidation = await validateStock(computedItems);
        if (!stockValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn ngày khác, đã hết chỗ',
                errors: stockValidation.errors
            });
        }
        
        // Lưu đơn hàng
        await order.save();

        // Gửi email thông báo "chờ xác nhận" sau khi lưu thành công (chỉ cho khách hàng)
        try {
            // Chỉ gửi email pending cho khách hàng, không gửi cho staff
            // Staff sẽ nhận email khi thanh toán hoàn tất (thành công hoặc thất bại)
            bookingNotificationService.sendPendingEmail(order)
                .then(result => {
                    if (result.success) {
                        console.log(`✅ Đã gửi email pending cho khách hàng ${order.orderId}`);
                    }
                })
                .catch(notificationError => {
                    console.error(`❌ Gửi email pending thất bại cho ${order.orderId}:`, notificationError.message);
                });

        } catch (notificationError) {
            // Log lỗi nhưng không làm fail request chính
            console.error('Lỗi khi khởi tạo gửi email pending:', notificationError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Đặt tour thành công',
            order: {
                orderId: order.orderId,
                customer: order.customer,
                email: order.email,
                phone: order.phone,
                totalAmount: order.totalAmount,
                status: order.status,
                paymentMethod: order.paymentMethod,
                items: order.items,
                createdAt: order.createdAt
            }
        });
    } catch (error) {
        console.error('Error in createOrder:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi đặt tour',
            error: error.message
        });
    }
};

// Tạo đơn hàng công khai
exports.createOrderPublic = async (req, res) => {
    try {


        const {
            customer,
            email,
            phone,
            address,
            items,
            paymentMethod,
            notes
        } = req.body;

        // Validate required fields
        const validationErrors = {};

        if (!customer || customer.trim() === '') {
            validationErrors.customer = "Tên khách hàng không được để trống";
        }

        if (!email || email.trim() === '') {
            validationErrors.email = "Email không được để trống";
        }

        if (!phone || phone.trim() === '') {
            validationErrors.phone = "Số điện thoại không được để trống";
        } else {
            // Simple phone validation for public orders - just check if it's 10-11 digits
            const cleanPhone = phone.replace(/[\s\-()]/g, '');
            if (!/^[0-9]{10,11}$/.test(cleanPhone)) {
                validationErrors.phone = "Số điện thoại phải có 10-11 chữ số";
            }
        }

        // Address is optional for public orders, will be filled from notes if needed

        if (!items || !Array.isArray(items) || items.length === 0) {
            validationErrors.items = "Đơn hàng phải có ít nhất một sản phẩm";
        } else {
            // Validate each item
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (!item.tourId) {
                    validationErrors.items = `Tour ID không được để trống ở item ${i + 1}`;
                    break;
                }
                if (!item.name) {
                    validationErrors.items = `Tên tour không được để trống ở item ${i + 1}`;
                    break;
                }
                if (!item.adults || item.adults < 0) {
                    validationErrors.items = `Số người lớn phải lớn hơn 0 ở item ${i + 1}`;
                    break;
                }
                if (!item.startDate) {
                    validationErrors.items = `Ngày khởi hành không được để trống ở item ${i + 1}`;
                    break;
                }
            }
        }

        // Return validation errors if any
        if (Object.keys(validationErrors).length > 0) {

            return res.status(400).json({
                success: false,
                message: "Thông tin đặt tour không hợp lệ",
                validationErrors
            });
        }

        // Tính tổng tiền server-side để đảm bảo chính xác
        let computedItems = [];
        let computedTotal = 0;

        for (const item of items) {
            if (item.tourId) {
                try {
                    const tour = await Tour.findById(item.tourId);
                    if (!tour) {
                        console.warn(`Tour not found: ${item.tourId}`);
                        continue;
                    }

                    const adults = parseInt(item.adults) || 0;
                    const children = parseInt(item.children) || 0;
                    const babies = parseInt(item.babies) || 0;
                    const lineName = item.name || tour.title;
                    const expectedPrice = parseFloat(item.expectedPrice) || 0;

                    // Tìm TourDetail phù hợp với ngày khách chọn
                    const tourDetails = await TourDetail.find({ tourId: tour._id }).lean();
                    let lineTotal = 0;
                    let selectedDetail = null;

                    if (tourDetails && tourDetails.length > 0) {
                        // Ưu tiên sử dụng tourDetailId từ frontend (đã được validate bởi API pricing)
                        if (item.tourDetailId) {
                            selectedDetail = tourDetails.find(detail => detail._id.toString() === item.tourDetailId.toString());
                        }

                        // Fallback: tìm TourDetail theo ngày khách chọn
                        if (!selectedDetail && item.startDate) {
                            const requestedDate = new Date(item.startDate);
                            requestedDate.setHours(0, 0, 0, 0);

                            selectedDetail = tourDetails.find(detail => {
                                const departureDate = new Date(detail.dayStart);
                                departureDate.setHours(0, 0, 0, 0);
                                return departureDate.getTime() === requestedDate.getTime() && detail.stock > 0;
                            });
                        }

                        // Fallback cuối: sử dụng TourDetail đầu tiên có giá
                        if (!selectedDetail) {
                            selectedDetail = tourDetails.find(detail => detail.adultPrice > 0) || tourDetails[0];
                        }

                        if (selectedDetail) {
                            const singleRooms = parseInt(item.singleRooms || 0) || 0;
                            lineTotal = calculateBookingTotal(
                                selectedDetail,
                                { adults, children, child: 0, baby: babies },
                                { singleRooms }
                            );

                            // Ưu tiên sử dụng giá từ frontend nếu hợp lý (trong khoảng ±10%)
                            if (expectedPrice > 0 && Math.abs(lineTotal - expectedPrice) / lineTotal <= 0.1) {
                                lineTotal = expectedPrice;
                            }
                        }
                    }

                    // Fallback nếu không có TourDetail
                    if (lineTotal === 0) {
                        const adultPrice = tour.price || 0;
                        // Chỉ tính trẻ em nếu có giá được thiết lập, nếu không thì miễn phí
                        const childPrice = adultPrice > 0 ? adultPrice * 0.7 : 0; // 70% giá người lớn hoặc miễn phí
                        lineTotal = (adults * adultPrice) + (children * childPrice);
                    }

                    // Lưu item với price = tổng dòng, quantity = 1 để tương thích schema hiện tại
                    const computed = {
                        tourId: tour._id,
                        name: lineName,
                        price: Math.max(0, Math.round(lineTotal)),
                        quantity: 1,
                        adults,
                        children,
                        babies: babies, // Lưu thông tin trẻ nhỏ
                        singleRooms: parseInt(item.singleRooms || 0) || 0, 
                        startDate: item.startDate, // Lưu ngày khởi hành khách hàng chọn
                        startTime: item.startTime || (selectedDetail ? selectedDetail.startTime : null), // Lưu giờ khởi hành
                        tourDetailId: selectedDetail ? selectedDetail._id : null // Lưu ID của tour detail được sử dụng
                    };
                    computedItems.push(computed);
                    computedTotal += computed.price;
                } catch (e) {
                    console.error('Error computing order line:', e.message);
                }
            }
        }

        // Chuyển đổi paymentMethod từ frontend sang giá trị được chấp nhận bởi model
        const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

        // Tạo đơn hàng mới với tổng tiền đã tính
        const order = new Order({
            customer,
            email,
            phone,
            address: address || 'Chờ cập nhật', // Sử dụng address riêng biệt
            totalAmount: computedTotal,
            items: computedItems,
            paymentMethod: normalizedPaymentMethod,
            notes, // Ghi chú riêng biệt với address
            createdBy: 'Public Order' 
        });

        // Kiểm tra stock một lần nữa trước khi lưu (để tránh race condition)
        const stockValidation = await validateStock(computedItems);
        if (!stockValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn ngày khác, đã hết chỗ',
                errors: stockValidation.errors
            });
        }

        // Lưu đơn hàng
        await order.save();

        // Gửi email thông báo "chờ xác nhận" sau khi lưu thành công (chỉ cho khách hàng)
        try {
            // Chỉ gửi email pending cho khách hàng, không gửi cho staff
            // Staff sẽ nhận email khi thanh toán hoàn tất (thành công hoặc thất bại)
            bookingNotificationService.sendPendingEmail(order)
                .then(result => {
                    if (result.success) {
                        console.log(`✅ Đã gửi email pending cho khách hàng công khai ${order.orderId}`);
                    }
                })
                .catch(notificationError => {
                    console.error(`❌ Gửi email pending công khai thất bại cho ${order.orderId}:`, notificationError.message);
                });

        } catch (notificationError) {
            // Log lỗi nhưng không làm fail request chính
            console.error('Lỗi khi khởi tạo gửi email pending công khai:', notificationError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Đặt tour thành công',
            order: {
                orderId: order.orderId,
                customer: order.customer,
                email: order.email,
                phone: order.phone,
                totalAmount: order.totalAmount,
                status: order.status,
                paymentMethod: order.paymentMethod,
                items: order.items,
                createdAt: order.createdAt
            }
        });
    } catch (error) {
        console.error('Error in createOrderPublic:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi đặt tour',
            error: error.message
        });
    }
};

// Cập nhật trạng thái đơn hàng
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, paymentStatus, cancellationReason } = req.body;

        // Tìm đơn hàng
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Lưu trạng thái cũ để so sánh
        const oldStatus = order.status;
        const oldPaymentStatus = order.paymentStatus;

        // Cập nhật trạng thái
        if (status) order.status = status;
        if (paymentStatus) order.paymentStatus = paymentStatus;
        order.updatedBy = req.user ? req.user.fullName || req.user.email : 'System';

        // Lưu đơn hàng đã cập nhật
        await order.save();

        // Trừ stock chỉ khi thanh toán thành công (chỉ trừ 1 lần)
        const shouldDeductStock = (
            paymentStatus === 'completed' && oldPaymentStatus !== 'completed'
        ) && !order.stockDeducted; // Chỉ trừ nếu chưa từng trừ

        // Cộng lại stock khi hủy đơn (nếu đã trừ stock trước đó)
        const shouldRestoreStock = (
            status === 'cancelled' && oldStatus !== 'cancelled' &&
            order.stockDeducted // Chỉ cộng lại nếu đã trừ trước đó
        );

        if (shouldDeductStock) {
            const stockResult = await deductStock(order.items, 'manual status update');
            if (stockResult) {
                // Đánh dấu đã trừ stock
                order.stockDeducted = true;
                await order.save();
            }
        } else if (shouldRestoreStock) {
            const stockResult = await restoreStock(order.items, 'status cancelled');
            if (stockResult) {
                // Đánh dấu chưa trừ stock
                order.stockDeducted = false;
                await order.save();
            }
        }

        // Kiểm tra xem có cập nhật cả status và payment cùng lúc không
        const statusChanged = status && status !== oldStatus;
        const paymentCompleted = paymentStatus === 'completed' && oldPaymentStatus !== 'completed';
        const bothConfirmedAndPaid = statusChanged && status === 'confirmed' && paymentCompleted;

        // Xử lý gửi email khi payment status thay đổi sang completed
        // NHƯNG chỉ gửi nếu KHÔNG phải trường hợp confirmed + paid cùng lúc
        if (paymentCompleted && !bothConfirmedAndPaid) {
            try {
                // Gửi email xác nhận thanh toán thành công
                const paymentEmailResult = await bookingNotificationService.sendPaymentConfirmedEmail(order);

                if (paymentEmailResult && !paymentEmailResult.success) {
                    console.warn(`⚠️ Gửi email xác nhận thanh toán thất bại cho đơn ${order.orderId}: ${paymentEmailResult.error || 'Lỗi không xác định'}`);
                } else if (paymentEmailResult && paymentEmailResult.success) {
                    console.log(`✅ Gửi email xác nhận thanh toán thành công cho đơn ${order.orderId}`);
                }
            } catch (emailError) {
                console.error(`❌ Lỗi gửi email xác nhận thanh toán cho đơn ${order.orderId}:`, emailError.message);
            }
        }

        // Xử lý logic đặc biệt khi status thay đổi
        if (statusChanged) {
            try {
                let emailResult;

                switch (status) {
                    case 'pending':
                        emailResult = await bookingNotificationService.sendPendingEmail(order);
                        break;
                    case 'confirmed':
                        // Nếu confirmed + paid cùng lúc, gửi email tổng hợp
                        if (bothConfirmedAndPaid) {
                            emailResult = await bookingNotificationService.sendConfirmedAndPaidEmail(order);
                        } else {
                            emailResult = await bookingNotificationService.sendConfirmedEmail(order);
                        }
                        break;
                    case 'completed':
                        // Tạo review token và gửi email review link
                        try {
                            const reviewToken = await ReviewTokenService.generateReviewToken(order);
                            const reviewUrl = ReviewTokenService.generateReviewUrl(order._id, reviewToken);

                            // Gửi email với review link
                            emailResult = await bookingNotificationService.sendReviewInvitationEmail(order, reviewUrl);

                        } catch (reviewError) {
                            console.error(`❌ Lỗi tạo review token cho order ${order.orderId}:`, reviewError.message);
                            // Đặt emailResult để tránh undefined
                            emailResult = { success: false, error: reviewError.message };
                        }
                        break;
                    case 'cancelled':
                        emailResult = await bookingNotificationService.sendCancelledEmail(order, cancellationReason);
                        break;
                    default:
                        // Không có email nào được gửi cho status này
                        emailResult = { success: true, message: `Không có email nào được gửi cho status: ${status}` };
                        break;
                }

                if (emailResult && !emailResult.success) {
                    console.warn(`⚠️ Gửi email thông báo trạng thái thất bại cho đơn ${order.orderId}: ${emailResult.error || 'Lỗi không xác định'}`);
                } else if (emailResult && emailResult.success) {
                    console.log(`✅ Gửi email thông báo trạng thái thành công cho đơn ${order.orderId}`);
                }
            } catch (emailError) {
                // Log lỗi nhưng không làm fail request chính
                console.error(`❌ Lỗi gửi email thông báo trạng thái cho đơn ${order.orderId}:`, emailError.message);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái đơn hàng thành công',
            order
        });
    } catch (error) {
        console.error('Error in updateOrderStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi cập nhật trạng thái đơn hàng',
            error: error.message
        });
    }
};

// Hủy đơn hàng với lý do
exports.cancelOrder = async (req, res) => {
    try {
        const { cancellationReason } = req.body;

        // Tìm đơn hàng
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra trạng thái hiện tại
        if (order.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã được hủy trước đó'
            });
        }

        // Kiểm tra xem đã trừ stock chưa (nếu đã confirmed hoặc paid)
        const wasStockDeducted = order.stockDeducted;

        // Cập nhật trạng thái thành cancelled
        order.status = 'cancelled';
        order.updatedBy = req.user ? req.user.fullName || req.user.email : 'System';

        // Lưu đơn hàng đã cập nhật
        await order.save();

        // Cộng lại stock nếu đã bị trừ trước đó
        if (wasStockDeducted && order.items && order.items.length > 0) {
            const stockResult = await restoreStock(order.items, 'order cancelled');
            if (stockResult) {
                // Đánh dấu chưa trừ stock
                order.stockDeducted = false;
                await order.save();
            }
        }

        // Gửi email thông báo hủy đơn
        try {
            const emailResult = await bookingNotificationService.sendCancelledEmail(order, cancellationReason);

            if (emailResult && !emailResult.success) {
                console.warn(`⚠️ Gửi email thông báo hủy đơn thất bại cho ${order.orderId}: ${emailResult.error || 'Lỗi không xác định'}`);
            } else if (emailResult && emailResult.success) {
                console.log(`✅ Gửi email thông báo hủy đơn thành công cho ${order.orderId}`);
            }
        } catch (emailError) {
            // Log lỗi nhưng không làm fail request chính
            console.error(`❌ Lỗi gửi email thông báo hủy đơn ${order.orderId}:`, emailError.message);
        }

        // Thông báo hoàn tiền qua email cho thanh toán online (VNPay, MoMo)
        let refundResult = null;
        if (['VNPay', 'MoMo'].includes(order.paymentMethod) && order.paymentStatus === 'completed') {
            try {
                // Chỉ thông báo qua email
                refundResult = {
                    success: true,
                    message: 'Thông báo hoàn tiền đã được gửi qua email. Nhân viên sẽ xử lý hoàn tiền trong 1-3 ngày làm việc.',
                    method: 'email_notification'
                };
                
            } catch (error) {
                console.error(`❌ Lỗi khi gửi thông báo hoàn tiền cho đơn ${order.orderId}:`, error.message);
                refundResult = {
                    success: false,
                    message: `Lỗi gửi thông báo hoàn tiền: ${error.message}`,
                    error: error.message
                };
            }
        }

        res.status(200).json({
            success: true,
            message: 'Hủy đơn hàng thành công',
            order,
            cancellationReason,
            refund: refundResult || { 
                success: false, 
                message: order.paymentMethod === 'Tiền mặt' ? 'Thanh toán tiền mặt không cần hoàn tiền online' : 'Đơn hàng chưa thanh toán hoặc không hỗ trợ hoàn tiền tự động'
            }
        });

    } catch (error) {
        console.error('Error in cancelOrder:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi hủy đơn hàng',
            error: error.message
        });
    }
};

// Xóa đơn hàng
exports.deleteOrder = async (req, res) => {
    try {
        // Vì lý do bảo mật, chúng tôi đã vô hiệu hóa việc xóa thực tế
        return res.status(403).json({
            success: false,
            message: 'Chức năng xóa đơn hàng đã bị vô hiệu hóa'
        });
        
        /* Original implementation kept for reference
        const order = await Order.findByIdAndDelete(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Xóa đơn hàng thành công'
        });
        */
    } catch (error) {
        console.error('Error in deleteOrder:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi xóa đơn hàng',
            error: error.message
        });
    }
};

// Tra cứu đơn hàng với xác thực OTP
exports.lookupOrderWithOTP = async (req, res) => {
    try {
        const { orderId, email, phone, otpCode } = req.body;

        // Kiểm tra tham số đầu vào
        if (!orderId || !email || !otpCode) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ mã đơn hàng, email và mã OTP',
                validationErrors: {
                    orderId: !orderId ? 'Mã đơn hàng không được để trống' : null,
                    email: !email ? 'Email không được để trống' : null,
                    otpCode: !otpCode ? 'Mã OTP không được để trống' : null
                }
            });
        }

        // Import VerifiedEmail model để kiểm tra OTP
        const VerifiedEmail = require('../models/verifiedEmailModel');
        const EmailOtp = require('../models/emailOtpModel');

        const normalizedEmail = email.toLowerCase();
        const MAX_ATTEMPTS = 5; // Giới hạn 5 lần thử

        // Kiểm tra OTP trước khi tra cứu đơn hàng
        const otp = await EmailOtp.findOne({
            email: normalizedEmail,
            code: otpCode,
            isUsed: false,
            createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // OTP có hiệu lực 15 phút
        }).sort({ createdAt: -1 });

        if (!otp) {
            // OTP không đúng - tăng số lần thử
            const otpRecordForAttempt = await EmailOtp.findOne({
                email: normalizedEmail,
                isUsed: false
            }).sort({ createdAt: -1 });

            if (otpRecordForAttempt) {
                const attempts = (otpRecordForAttempt.attempts || 0) + 1;

                if (attempts >= MAX_ATTEMPTS) {
                    // Quá số lần thử - vô hiệu hóa OTP
                    await EmailOtp.findByIdAndUpdate(otpRecordForAttempt._id, {
                        isUsed: true,
                        attempts: attempts
                    });
                    return res.status(400).json({
                        success: false,
                        message: `Bạn đã nhập sai mã OTP quá ${MAX_ATTEMPTS} lần. Vui lòng yêu cầu mã mới.`,
                        validationErrors: {
                            otpCode: `Bạn đã nhập sai mã OTP quá ${MAX_ATTEMPTS} lần. Vui lòng yêu cầu mã mới.`
                        }
                    });
                } else {
                    // Cập nhật số lần thử
                    await EmailOtp.findByIdAndUpdate(otpRecordForAttempt._id, { attempts });
                    return res.status(400).json({
                        success: false,
                        message: `Mã OTP không chính xác. Bạn còn ${MAX_ATTEMPTS - attempts} lần thử.`,
                        validationErrors: {
                            otpCode: `Mã OTP không chính xác. Bạn còn ${MAX_ATTEMPTS - attempts} lần thử.`
                        }
                    });
                }
            }

            return res.status(400).json({
                success: false,
                message: 'Mã OTP không chính xác hoặc đã hết hạn',
                validationErrors: {
                    otpCode: 'Mã OTP không chính xác hoặc đã hết hạn'
                }
            });
        }

        // Đánh dấu OTP đã được sử dụng
        otp.isUsed = true;
        await otp.save();

        // Tạo hoặc cập nhật trạng thái email đã xác minh
        await VerifiedEmail.findOneAndUpdate(
            { email: normalizedEmail },
            {
                email: normalizedEmail,
                verifiedAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 ngày
            },
            { upsert: true, new: true }
        );

        // Xây dựng query tìm kiếm đơn hàng
        let searchQuery = { orderId: orderId, email: normalizedEmail };

        // Tìm đơn hàng
        const order = await Order.findOne(searchQuery);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng với thông tin đã cung cấp'
            });
        }

        // Lấy thông tin tour và tour detail nếu có
        let tourInfo = null;
        let tourDetailInfo = null;
        if (order.items && order.items.length > 0 && order.items[0].tourId) {
            tourInfo = await Tour.findById(order.items[0].tourId).select('title code images');
            
            // Lấy thông tin tour detail để có ngày về
            if (order.items[0].startDate) {
                const tourDetails = await TourDetail.find({ 
                    tourId: order.items[0].tourId,
                    dayStart: new Date(order.items[0].startDate)
                });
                if (tourDetails && tourDetails.length > 0) {
                    tourDetailInfo = {
                        dayReturn: tourDetails[0].dayReturn,
                        startTime: tourDetails[0].startTime
                    };
                }
            }
        }

        // Trả về thông tin đơn hàng
        const orderResponse = {
            orderId: order.orderId,
            customer: order.customer,
            email: order.email,
            phone: order.phone,
            status: order.status,
            totalAmount: order.totalAmount,
            items: order.items,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            notes: order.notes,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            tourInfo: tourInfo,
            tourDetailInfo: tourDetailInfo
        };

        res.status(200).json({
            success: true,
            order: orderResponse
        });

    } catch (error) {
        console.error('Error in lookupOrderWithOTP:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi tra cứu đơn hàng',
            error: error.message
        });
    }
};

// Gửi OTP cho tra cứu đơn hàng
exports.sendOTPForOrderLookup = async (req, res) => {
    try {
        const { orderId, email } = req.body;

        // Kiểm tra tham số đầu vào
        if (!orderId || !email) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp mã đơn hàng và email',
                validationErrors: {
                    orderId: !orderId ? 'Mã đơn hàng không được để trống' : null,
                    email: !email ? 'Email không được để trống' : null
                }

            });
        }

        // Validate email format
        const { validateEmail } = require('../utils/emailUtils');
        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Địa chỉ email không hợp lệ',
                validationErrors: {
                    email: 'Địa chỉ email không đúng định dạng'
                }
            });
        }

        const normalizedEmail = email.toLowerCase();

        // Kiểm tra xem đơn hàng có tồn tại với email này không
        const order = await Order.findOne({ 
            orderId: orderId, 
            email: normalizedEmail 
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng với thông tin đã cung cấp',
                validationErrors: {
                    orderId: 'Mã đơn hàng không tồn tại hoặc không khớp với email'
                }
            });
        }

        // Gửi OTP qua email
        const emailOtpController = require('./emailOtpController');
        const mockReq = {
            body: { email: normalizedEmail }
        };
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    if (data.success) {
                        return res.status(200).json({
                            success: true,
                            message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
                            orderId: orderId
                        });
                    } else {
                        return res.status(code).json(data);
                    }
                }
            })
        };

        await emailOtpController.sendOTP(mockReq, mockRes);

    } catch (error) {
        console.error('Error in sendOTPForOrderLookup:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi gửi mã OTP'
        });
    }
};

// API endpoint để lấy thống kê đơn hàng theo tháng
exports.getMonthlyOrderStats = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31, 23, 59, 59);

        // Lấy số lượng đơn hàng theo tháng - chỉ tính đơn đã xác nhận, đã thanh toán và đã hoàn thành
        const monthlyOrders = Array(12).fill(0);
        
        // Lấy đơn hàng đã xác nhận và đã hoàn thành (không cần kiểm tra paymentStatus)
        const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'completed'] } // Chỉ lấy đơn đã xác nhận và đã hoàn thành
        });

        orders.forEach(order => {
            const month = new Date(order.createdAt).getMonth();
            monthlyOrders[month]++;
        });

        res.status(200).json({
            success: true,
            data: {
                monthlyOrders
            }
        });

    } catch (error) {
        console.error('Error in getMonthlyOrderStats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê đơn hàng',
            error: error.message
        });
    }
};

// API endpoint để lấy tỉ lệ hủy đơn theo tháng
exports.getCancellationRateStats = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31, 23, 59, 59);

        // Lấy tỉ lệ hủy đơn theo tháng
        const monthlyCancellationRates = Array(12).fill(0);
        
        for (let month = 0; month < 12; month++) {
            const monthStart = new Date(currentYear, month, 1);
            const monthEnd = new Date(currentYear, month + 1, 0, 23, 59, 59);

            const totalOrders = await Order.countDocuments({
                createdAt: { $gte: monthStart, $lte: monthEnd }
            });

            const cancelledOrders = await Order.countDocuments({
                status: 'cancelled',
                createdAt: { $gte: monthStart, $lte: monthEnd }
            });

            if (totalOrders > 0) {
                monthlyCancellationRates[month] = Math.round((cancelledOrders / totalOrders) * 100 * 10) / 10; // Làm tròn 1 chữ số thập phân
            }
        }

        res.status(200).json({
            success: true,
            data: {
                monthlyCancellationRates
            }
        });

    } catch (error) {
        console.error('Error in getCancellationRateStats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy tỉ lệ hủy đơn',
            error: error.message
        });
    }
};


// API endpoint để lấy thống kê đơn hàng bị hủy theo tháng
exports.getCancelledOrderStats = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31, 23, 59, 59);

        // Lấy số đơn hàng bị hủy theo tháng
        const monthlyCancelled = Array(12).fill(0);
        
        for (let month = 0; month < 12; month++) {
            const monthStart = new Date(currentYear, month, 1);
            const monthEnd = new Date(currentYear, month + 1, 0, 23, 59, 59);

            const cancelledCount = await Order.countDocuments({
                status: 'cancelled',
                createdAt: { $gte: monthStart, $lte: monthEnd }
            });

            monthlyCancelled[month] = cancelledCount;
        }

        res.status(200).json({
            success: true,
            data: {
                monthlyCancelled
            }
        });

    } catch (error) {
        console.error('Error in getCancelledOrderStats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê đơn hàng bị hủy',
            error: error.message
        });
    }
};

// Cập nhật thông tin khách hàng
const updateCustomerInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const { address, notes } = req.body;

        // Tìm đơn hàng
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Cập nhật thông tin
        const updateData = {};
        if (address !== undefined) updateData.address = address;
        if (notes !== undefined) updateData.notes = notes;

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Cập nhật thông tin khách hàng thành công',
            data: updatedOrder
        });

    } catch (error) {
        console.error('Error updating customer info:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật thông tin khách hàng',
            error: error.message
        });
    }
};

// Gửi lại email xác nhận đơn hàng
const resendOrderEmail = async (req, res) => {
    try {
        const { id } = req.params;

        // Tìm đơn hàng
        const order = await Order.findById(id).populate('items.tourId');
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra xem có email service không
        const paymentEmailService = require('../services/paymentEmailService');
        
        // Chuẩn bị dữ liệu cho email
        const orderData = {
            orderId: order.orderId,
            customer: order.customer,
            email: order.email,
            phone: order.phone,
            totalAmount: order.totalAmount,
            items: order.items,
            status: order.status,
            paymentMethod: order.paymentMethod,
            createdAt: order.createdAt
        };
        
        // Gửi email xác nhận dựa trên trạng thái
        if (order.status === 'confirmed') {
            await paymentEmailService.sendCashPaymentConfirmed(orderData);
        } else if (order.status === 'pending') {
            await paymentEmailService.sendCashPaymentPending(orderData);
        } else {
            // Gửi email theo trạng thái thanh toán
            await paymentEmailService.sendPaymentStatusEmail(orderData, order.status);
        }

        res.json({
            success: true,
            message: 'Email đã được gửi lại thành công'
        });

    } catch (error) {
        console.error('Error resending order email:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi gửi lại email',
            error: error.message
        });
    }
};

// Export functions
exports.updateCustomerInfo = updateCustomerInfo;
exports.resendOrderEmail = resendOrderEmail;

