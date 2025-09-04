const Order = require('../models/orderModel');
const Tour = require('../models/tourModel');
const TourDetail = require('../models/tourDetailModel');
const { calculateBookingTotal } = require('../utils/priceCalculator');
const { isPhoneVerified } = require('../controllers/otpController');
const { validatePhoneNumber } = require('../utils/otpUtil');
const bookingNotificationService = require('../services/bookingNotificationService');
const ReviewTokenService = require('../services/reviewTokenService');
const { deductStock, restoreStock, validateStock } = require('../utils/stockManager');

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
        
        // Lấy thông tin tour nếu có
        let tourInfo = null;
        if (order.items && order.items.length > 0 && order.items[0].tourId) {
            tourInfo = await Tour.findById(order.items[0].tourId);
        }
        
        res.render('order/orderDetail', {
            title: `Chi tiết đơn hàng #${order.orderId}`,
            order,
            tourInfo,
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
                            validationErrors.items = `Ngày khởi hành ${new Date(item.startDate).toLocaleDateString('vi-VN')} không hợp lệ hoặc đã hết chỗ ở item ${i + 1}`;
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
                        startDate: rawItem.startDate, // Lưu ngày khởi hành khách hàng chọn
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
            address: notes || 'Địa chỉ sẽ được cập nhật sau', // Use notes as address or default
            totalAmount: computedTotal,
            items: computedItems,
            paymentMethod: normalizedPaymentMethod,
            notes,
            createdBy: req.user ? req.user.fullName || req.user.email : 'System'
        });

        // Kiểm tra stock một lần nữa trước khi lưu (để tránh race condition)
        const stockValidation = await validateStock(computedItems);
        if (!stockValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Stock không đủ để tạo đơn hàng',
                errors: stockValidation.errors
            });
        }
        
        // Lưu đơn hàng
        await order.save();

        // Gửi email thông báo "chờ xác nhận" sau khi lưu thành công
        try {
            // Gửi email pending và thông báo cho staff (không chờ để không làm chậm response)
            Promise.all([
                bookingNotificationService.sendPendingEmail(order),
                bookingNotificationService.sendStaffEmailNotification(await bookingNotificationService.prepareBookingData(order))
            ])
                .then(results => {
                    // Email sent successfully
                })
                .catch(notificationError => {
                    console.error(`❌ Gửi thông báo booking thất bại cho ${order.orderId}:`, notificationError.message);
                });

        } catch (notificationError) {
            // Log lỗi nhưng không làm fail request chính
            console.error('Lỗi khi khởi tạo gửi thông báo booking:', notificationError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Đặt tour thành công',
            order
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
                            lineTotal = calculateBookingTotal(
                                selectedDetail,
                                { adults, children, child: 0, baby: babies },
                                { singleRooms: 0 }
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
                        startDate: item.startDate, // Lưu ngày khởi hành khách hàng chọn
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
            address: notes || 'Địa chỉ sẽ được cập nhật sau', 
            totalAmount: computedTotal,
            items: computedItems,
            paymentMethod: normalizedPaymentMethod,
            notes,
            createdBy: 'Public Order' 
        });

        // Kiểm tra stock một lần nữa trước khi lưu (để tránh race condition)
        const stockValidation = await validateStock(computedItems);
        if (!stockValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Stock không đủ để tạo đơn hàng',
                errors: stockValidation.errors
            });
        }

        // Lưu đơn hàng
        await order.save();

        // Gửi email thông báo "chờ xác nhận" sau khi lưu thành công
        try {
            // Gửi email pending và thông báo cho staff (không chờ để không làm chậm response)
            Promise.all([
                bookingNotificationService.sendPendingEmail(order),
                bookingNotificationService.sendStaffEmailNotification(await bookingNotificationService.prepareBookingData(order))
            ])
                .then(results => {
                    // Email sent successfully
                })
                .catch(notificationError => {
                    console.error(`❌ Gửi thông báo booking công khai thất bại cho ${order.orderId}:`, notificationError.message);
                });

        } catch (notificationError) {
            // Log lỗi nhưng không làm fail request chính
            console.error('Lỗi khi khởi tạo gửi thông báo booking công khai:', notificationError.message);
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

        // Xử lý logic đặc biệt khi status thay đổi
        if (status && status !== oldStatus) {
            try {
                let emailResult;

                switch (status) {
                    case 'pending':
                        emailResult = await bookingNotificationService.sendPendingEmail(order);
                        break;
                    case 'confirmed':
                        emailResult = await bookingNotificationService.sendConfirmedEmail(order);
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
                            // Không throw error để không làm fail toàn bộ request
                        }
                        break;
                    case 'cancelled':
                        emailResult = await bookingNotificationService.sendCancelledEmail(order, cancellationReason);
                        break;
                    default:
                        // No email template for this status
                }

                if (emailResult && !emailResult.success) {
                    console.warn(`⚠️ Gửi email thông báo trạng thái thất bại cho đơn ${order.orderId}: ${emailResult.error}`);
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

            if (!emailResult.success) {
                console.warn(`⚠️ Gửi email thông báo hủy đơn thất bại cho ${order.orderId}: ${emailResult.error}`);
            }
        } catch (emailError) {
            // Log lỗi nhưng không làm fail request chính
            console.error(`❌ Lỗi gửi email thông báo hủy đơn ${order.orderId}:`, emailError.message);
        }

        res.status(200).json({
            success: true,
            message: 'Hủy đơn hàng thành công',
            order,
            cancellationReason
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

        // Kiểm tra OTP trước khi tra cứu đơn hàng
        const otp = await EmailOtp.findOne({
            email: normalizedEmail,
            code: otpCode,
            isUsed: false,
            createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // OTP có hiệu lực 15 phút
        }).sort({ createdAt: -1 });

        if (!otp) {
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

        // Lấy thông tin tour nếu có
        let tourInfo = null;
        if (order.items && order.items.length > 0 && order.items[0].tourId) {
            tourInfo = await Tour.findById(order.items[0].tourId).select('title code images');
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
            tourInfo: tourInfo
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

// Tra cứu đơn hàng (phương thức cũ - không có OTP)
exports.lookupOrderPublic = async (req, res) => {
    try {
        const { orderId, email, phone } = req.query;

        // Kiểm tra tham số đầu vào
        if (!orderId || (!email && !phone)) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp mã đơn hàng và email hoặc số điện thoại'
            });
        }

        // Xây dựng query tìm kiếm
        let searchQuery = { orderId: orderId };

        // Thêm điều kiện email hoặc phone
        if (email && phone) {
            searchQuery.$or = [
                { email: email },
                { phone: phone }
            ];
        } else if (email) {
            searchQuery.email = email;
        } else if (phone) {
            searchQuery.phone = phone;
        }

        // Tìm đơn hàng
        const order = await Order.findOne(searchQuery);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng với thông tin đã cung cấp'
            });
        }

        // Lấy thông tin tour nếu có
        let tourInfo = null;
        if (order.items && order.items.length > 0 && order.items[0].tourId) {
            tourInfo = await Tour.findById(order.items[0].tourId).select('title code images');
        }

        // Trả về thông tin đơn hàng (ẩn một số thông tin nhạy cảm)
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
            tourInfo: tourInfo
        };

        res.status(200).json({
            success: true,
            order: orderResponse
        });

    } catch (error) {
        console.error('Error in lookupOrderPublic:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tra cứu đơn hàng',
            error: error.message
        });
    }
};
