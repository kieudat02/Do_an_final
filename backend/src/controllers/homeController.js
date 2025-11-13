const User = require("../models/userModel");
const Tour = require("../models/tourModel");
const Order = require("../models/orderModel");
const Category = require("../models/categoriesModel");
const Departure = require("../models/departureModel");
const Destination = require("../models/destinationModel");
const Transportation = require("../models/transportationModel");

const getHomepage = async (req, res) => {
    try {
        // Lấy dữ liệu thống kê từ tất cả các model
        const [
            // Thống kê người dùng
            totalUsers, 
            activeUsers, 
            inactiveUsers,
            
            // Thống kê tour
            activeTours,
            inactiveTours,
            
            // Thống kê danh mục
            activeCategories,
            inactiveCategories,
            
            // Thống kê điểm khởi hành
            activeDepartures,
            inactiveDepartures,
            
            // Thống kê điểm đến
            activeDestinations,
            inactiveDestinations,
            
            // Thống kê phương tiện
            activeTransportations,
            inactiveTransportations,
            
            // Thống kê đơn hàng
            pendingOrders,
            confirmedOrders,
            completedOrders,
            cancelledOrders,
            
            // Top 5 tour được đặt nhiều nhất
            topBookedTours,

            // Top 5 tour doanh thu nhiều nhất
            topRevenueTours,

            // Top 5 tour bị hủy nhiều nhất
            topCancelledTours,

            // Doanh thu theo tháng trong năm hiện tại
            monthlyRevenue,

            // Doanh thu theo phương thức thanh toán
            revenueByPaymentMethod

        ] = await Promise.all([
            // Thống kê người dùng
            User.countDocuments(),
            User.countDocuments({ status: "Hoạt động" }),
            User.countDocuments({ status: "Tạm dừng" }),
            
            // Thống kê tour
            Tour.countDocuments({ status: true, deleted: false }),
            Tour.countDocuments({ status: false, deleted: false }),
            
            // Thống kê danh mục
            Category.countDocuments({ status: "Hoạt động" }),
            Category.countDocuments({ status: "Không hoạt động" }),
            
            // Thống kê điểm khởi hành
            Departure.countDocuments({ status: "Hoạt động" }),
            Departure.countDocuments({ status: "Không hoạt động" }),
            
            // Thống kê điểm đến
            Destination.countDocuments({ status: "Hoạt động" }),
            Destination.countDocuments({ status: "Không hoạt động" }),
            
            // Thống kê phương tiện
            Transportation.countDocuments({ status: true, deleted: false }),
            Transportation.countDocuments({ status: false, deleted: false }),
            
            // Thống kê đơn hàng
            Order.countDocuments({ status: "pending" }),
            Order.countDocuments({ status: "confirmed" }),
            Order.countDocuments({ status: "completed" }),
            Order.countDocuments({ status: "cancelled" }),
            
            // Top 5 tour được đặt nhiều nhất
            getTopBookedTours(),

            // Top 5 tour doanh thu nhiều nhất
            getTopRevenueTours(),

            // Top 5 tour bị hủy nhiều nhất
            getTopCancelledTours(),

            // Doanh thu theo tháng trong năm hiện tại
            getMonthlyRevenue(),

            // Doanh thu theo phương thức thanh toán
            getRevenueByPaymentMethod()
        ]);

        // Thông tin người dùng hiện tại
        const currentUser = req.session.user;
        
        // Lấy thông báo từ flash hoặc session
        let message = req.flash("message")[0] || null;
        const errorMessage = req.flash("error")[0] || null;
        
        // Kiểm tra thông báo đăng nhập từ session
        if (!message && req.session.loginMessage) {
            message = req.session.loginMessage;
            // Xóa thông báo sau khi đã lấy để không hiển thị lại
            delete req.session.loginMessage;
            // Lưu session sau khi xóa thông báo
            req.session.save();
        }

        // Lấy quyền hạn của user hiện tại
        const userPermissions = Array.isArray(res.locals.userPermissions)
            ? res.locals.userPermissions
            : [];

        // Lấy dữ liệu mới cho dashboard
        const csatData = await getCSATData().catch(err => {
            console.error('Error getting CSAT data:', err);
            return { averageScore: 0, totalRatings: 0, trend: [] };
        });

        const paymentSuccessRates = await getPaymentSuccessRates().catch(err => {
            console.error('Error getting payment success rates:', err);
            return { momo: 0, vnpay: 0 };
        });

        const performanceData = await getPerformanceData().catch(err => {
            console.error('Error getting performance data:', err);
            return { avgResponseTime: 0, p95: 0, p99: 0, expiredOrders: 0 };
        });



        // Đảm bảo dữ liệu luôn có giá trị mặc định
        return res.render("dashboard", {
            userPermissions: userPermissions,

            // Thống kê người dùng
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            inactiveUsers: inactiveUsers || 0,

            // Thống kê tour
            activeTours: activeTours || 0,
            inactiveTours: inactiveTours || 0,

            // Thống kê danh mục
            activeCategories: activeCategories || 0,
            inactiveCategories: inactiveCategories || 0,

            // Thống kê điểm khởi hành
            activeDepartures: activeDepartures || 0,
            inactiveDepartures: inactiveDepartures || 0,

            // Thống kê điểm đến
            activeDestinations: activeDestinations || 0,
            inactiveDestinations: inactiveDestinations || 0,

            // Thống kê phương tiện
            activeTransportations: activeTransportations || 0,
            inactiveTransportations: inactiveTransportations || 0,

            // Thống kê đơn hàng
            pendingOrders: pendingOrders || 0,
            confirmedOrders: confirmedOrders || 0,
            completedOrders: completedOrders || 0,
            cancelledOrders: cancelledOrders || 0,

            // Top 5 tour được đặt nhiều nhất
            topBookedTours: topBookedTours || [],
            topRevenueTours: topRevenueTours || [],
            topCancelledTours: topCancelledTours || [],

            // Doanh thu theo tháng
            monthlyRevenue: monthlyRevenue || Array(12).fill(0),

            // Doanh thu theo phương thức thanh toán (chỉ các key dùng trên frontend)
            revenueByPaymentMethod: revenueByPaymentMethod || { cash: 0, momo: 0, vnpay: 0 },

            // Dữ liệu mới cho dashboard
            csatData,
            paymentSuccessRates,
            performanceData,

            currentUser,
            message,
            error: errorMessage,
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        req.flash("error", "Có lỗi xảy ra khi tải dashboard");
        return res.redirect("/login");
    }
};

// Hàm lấy top 5 tour được đặt nhiều nhất
async function getTopBookedTours() {
    try {
        // Tìm tất cả các đơn hàng có trạng thái đã xác nhận và hoàn thành
        const orders = await Order.find({ 
            status: { $in: ["confirmed", "completed"] } 
        });
        
        // Tạo map để đếm số lần tour được đặt
        const tourCounts = {};
        const tourDetails = {};
        
        // Đếm số lần mỗi tour được đặt
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.tourId) {
                    const tourId = item.tourId.toString();
                    if (!tourCounts[tourId]) {
                        tourCounts[tourId] = 0;
                        tourDetails[tourId] = {
                            name: item.name,
                            price: item.price,
                            quantity: 0,
                            tourId: tourId
                        };
                    }
                    tourCounts[tourId] += item.quantity || 1;
                    tourDetails[tourId].quantity = tourCounts[tourId];
                }
            });
        });
        
        // Chuyển đổi map thành mảng để sắp xếp
        const sortedTours = Object.keys(tourCounts)
            .map(tourId => ({
                tourId,
                count: tourCounts[tourId],
                ...tourDetails[tourId]
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        // Lấy thông tin chi tiết của các tour
        const tourIds = sortedTours.map(tour => tour.tourId);
        const tours = await Tour.find({ 
            _id: { $in: tourIds },
            deleted: false
        });
        
        // Map thông tin chi tiết vào kết quả
        const result = sortedTours.map(tour => {
            const tourInfo = tours.find(t => t._id.toString() === tour.tourId);
            return {
                tourId: tour.tourId,
                name: tour.name,
                code: tourInfo?.code || 'N/A',
                price: tour.price,
                quantity: tour.quantity,
                image: tourInfo?.image || '/images/default-tour.jpg'
            };
        });
        
        return result;
    } catch (error) {
        console.error("Error getting top booked tours:", error);
        // Trả về mảng rỗng với cấu trúc đúng để tránh lỗi frontend
        return [];
    }
}

// Hàm lấy top 5 tour doanh thu nhiều nhất
async function getTopRevenueTours() {
    try {
        // Tìm tất cả các đơn hàng đã hoàn thành và đã thanh toán
        const orders = await Order.find({ 
            status: "completed",
            paymentStatus: "completed"
        });
        
        // Tạo map để tính doanh thu theo tour
        const tourRevenue = {};
        const tourDetails = {};
        
        // Tính doanh thu cho mỗi tour
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.tourId) {
                    const tourId = item.tourId.toString();
                    const revenue = (item.price || 0) * (item.quantity || 1);
                    
                    if (!tourRevenue[tourId]) {
                        tourRevenue[tourId] = 0;
                        tourDetails[tourId] = {
                            name: item.name,
                            price: item.price,
                            quantity: 0,
                            tourId: tourId
                        };
                    }
                    tourRevenue[tourId] += revenue;
                    tourDetails[tourId].quantity += item.quantity || 1;
                }
            });
        });
        
        // Chuyển đổi map thành mảng để sắp xếp theo doanh thu
        const sortedTours = Object.keys(tourRevenue)
            .map(tourId => ({
                tourId,
                revenue: tourRevenue[tourId],
                ...tourDetails[tourId]
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        
        // Lấy thông tin chi tiết của các tour
        const tourIds = sortedTours.map(tour => tour.tourId);
        const tours = await Tour.find({ 
            _id: { $in: tourIds },
            deleted: false
        });
        
        // Map thông tin chi tiết vào kết quả
        const result = sortedTours.map(tour => {
            const tourInfo = tours.find(t => t._id.toString() === tour.tourId);
            return {
                tourId: tour.tourId,
                name: tour.name,
                code: tourInfo?.code || 'N/A',
                price: tour.price,
                quantity: tour.quantity,
                revenue: tour.revenue,
                image: tourInfo?.image || '/images/default-tour.jpg'
            };
        });
        
        return result;
    } catch (error) {
        console.error("Error getting top revenue tours:", error);
        return [];
    }
}

// Hàm lấy top 5 tour bị hủy nhiều nhất
async function getTopCancelledTours() {
    try {
        // Tìm tất cả các đơn hàng bị hủy
        const orders = await Order.find({ 
            status: "cancelled"
        });
        
        // Tạo map để đếm số lần tour bị hủy
        const tourCounts = {};
        const tourDetails = {};
        
        // Đếm số lần mỗi tour bị hủy
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.tourId) {
                    const tourId = item.tourId.toString();
                    if (!tourCounts[tourId]) {
                        tourCounts[tourId] = 0;
                        tourDetails[tourId] = {
                            name: item.name,
                            price: item.price,
                            quantity: 0,
                            tourId: tourId
                        };
                    }
                    tourCounts[tourId] += item.quantity || 1;
                    tourDetails[tourId].quantity = tourCounts[tourId];
                }
            });
        });
        
        // Chuyển đổi map thành mảng để sắp xếp
        const sortedTours = Object.keys(tourCounts)
            .map(tourId => ({
                tourId,
                count: tourCounts[tourId],
                ...tourDetails[tourId]
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        // Lấy thông tin chi tiết của các tour
        const tourIds = sortedTours.map(tour => tour.tourId);
        const tours = await Tour.find({ 
            _id: { $in: tourIds },
            deleted: false
        });
        
        // Map thông tin chi tiết vào kết quả
        const result = sortedTours.map(tour => {
            const tourInfo = tours.find(t => t._id.toString() === tour.tourId);
            return {
                tourId: tour.tourId,
                name: tour.name,
                code: tourInfo?.code || 'N/A',
                price: tour.price,
                quantity: tour.quantity,
                image: tourInfo?.image || '/images/default-tour.jpg'
            };
        });
        
        return result;
    } catch (error) {
        console.error("Error getting top cancelled tours:", error);
        return [];
    }
}

// Hàm lấy doanh thu theo tháng trong năm hiện tại
async function getMonthlyRevenue() {
    try {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1); // 1/1/currentYear
        const endDate = new Date(currentYear, 11, 31, 23, 59, 59); // 31/12/currentYear
        
        // Lấy tất cả đơn hàng đã hoàn thành trong năm hiện tại
        const orders = await Order.find({
            status: "completed",
            createdAt: { $gte: startDate, $lte: endDate }
        });
        
        // Khởi tạo mảng doanh thu cho 12 tháng
        const monthlyRevenue = Array(12).fill(0);
        
        // Tính tổng doanh thu cho mỗi tháng
        orders.forEach(order => {
            const month = new Date(order.createdAt).getMonth(); // 0-11
            monthlyRevenue[month] += order.totalAmount;
        });
        
        return monthlyRevenue;
    } catch (error) {
        console.error("Error getting monthly revenue:", error);
        return Array(12).fill(0);
    }
}

// Hàm lấy doanh thu theo phương thức thanh toán
async function getRevenueByPaymentMethod() {
    try {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31, 23, 59, 59);

        // Lấy tất cả đơn hàng đã hoàn thành trong năm hiện tại
        const orders = await Order.find({
            status: "completed",
            createdAt: { $gte: startDate, $lte: endDate }
        });

        // Tính doanh thu theo phương thức thanh toán
        const revenueByPayment = {
            cash: 0,        // Tiền mặt
            momo: 0,        // MoMo
            vnpay: 0        // VNPay
        };

        orders.forEach(order => {
            const amount = order.totalAmount || 0;

            // Map payment method từ database sang categories
            switch (order.paymentMethod) {
                case 'Tiền mặt':
                case 'Cash':
                    revenueByPayment.cash += amount;
                    break;
                case 'MoMo':
                case 'momo':
                    revenueByPayment.momo += amount;
                    break;
                case 'VNPay':
                case 'vnpay':
                    revenueByPayment.vnpay += amount;
                    break;
                default:
                    // Nếu không xác định được, tính vào tiền mặt
                    revenueByPayment.cash += amount;
                    break;
            }
        });

        return revenueByPayment;
    } catch (error) {
        console.error("Error getting revenue by payment method:", error);
        return { cash: 0, momo: 0, vnpay: 0 };
    }
}

const postUpdateUser = async (req, res) => {
    try {
        let email = req.body.email;
        let name = req.body.name;
        let city = req.body.city;
        let userId = req.body.id;

        await User.updateOne(
            { _id: userId },
            {
                email: email,
                fullName: name,
                city: city,
            }
        );

        req.flash("message", "Cập nhật thông tin thành công!");
        res.redirect("/dashboard");
    } catch (error) {
        console.error("Update user error:", error);
        req.flash("error", "Có lỗi xảy ra khi cập nhật thông tin");
        res.redirect("/dashboard");
    }
};

// Lấy dữ liệu CSAT
async function getCSATData() {
    try {
        // Import SessionRating model (mới) thay vì ChatRating (cũ)
        const SessionRating = require('../models/sessionRatingModel');

        // Lấy stats 30 ngày gần đây
        const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const dateTo = new Date();

        // Kiểm tra tổng số ratings
        const totalRatings = await SessionRating.countDocuments({});

        // Sử dụng SessionRating.getCSATScore thay vì ChatRating.getCSATStats
        const stats = await SessionRating.getCSATScore({
            createdAt: {
                $gte: dateFrom,
                $lte: dateTo
            }
        });



        // Sử dụng dữ liệu thật từ database
        let averageScore = stats.avgRating || 0;
        let totalRatingsCount = stats.totalRatings || 0;

        // Nếu không có dữ liệu thật, hiển thị 0 thay vì demo data
        if (totalRatingsCount === 0) {
            averageScore = 0;
            totalRatingsCount = 0;
        }

        return {
            averageScore,
            totalRatings: totalRatingsCount,
            trend: [] // Có thể thêm trend data sau
        };
    } catch (error) {
        console.error("Error getting CSAT data:", error);
        // Trả về 0 khi có lỗi
        return { averageScore: 0, totalRatings: 0, trend: [] };
    }
}

// Lấy tỉ lệ thành công thanh toán
async function getPaymentSuccessRates() {
    try {
        // Kiểm tra tổng số orders
        const allOrders = await Order.countDocuments({});

        // Tính tỉ lệ thành công cho MoMo - chỉ tính từ đơn hàng đã hoàn thành
        const totalMomoOrders = await Order.countDocuments({
            paymentMethod: 'MoMo',
            status: { $in: ['completed', 'confirmed'] } // Chỉ tính đơn hàng đã hoàn thành hoặc xác nhận
        });
        const successMomoOrders = await Order.countDocuments({
            paymentMethod: 'MoMo',
            status: 'completed' // Chỉ tính đơn hàng đã hoàn thành
        });

        // Tính tỉ lệ thành công cho VNPay - chỉ tính từ đơn hàng đã hoàn thành
        const totalVnpayOrders = await Order.countDocuments({
            paymentMethod: 'VNPay',
            status: { $in: ['completed', 'confirmed'] } // Chỉ tính đơn hàng đã hoàn thành hoặc xác nhận
        });
        const successVnpayOrders = await Order.countDocuments({
            paymentMethod: 'VNPay',
            status: 'completed' // Chỉ tính đơn hàng đã hoàn thành
        });

        // Tính tỉ lệ thành công thực tế
        const momoRate = totalMomoOrders > 0 ?
            Math.round((successMomoOrders / totalMomoOrders) * 100) : 0;

        const vnpayRate = totalVnpayOrders > 0 ?
            Math.round((successVnpayOrders / totalVnpayOrders) * 100) : 0;

        // Sử dụng dữ liệu thật từ database
        let finalMomoRate = momoRate;
        let finalVnpayRate = vnpayRate;

        // Nếu không có dữ liệu thật, hiển thị 0
        if (allOrders === 0) {
            finalMomoRate = 0;
            finalVnpayRate = 0;
        }

        return {
            momo: finalMomoRate,
            vnpay: finalVnpayRate
        };
    } catch (error) {
        console.error("Error getting payment success rates:", error);
        return { momo: 0, vnpay: 0 };
    }
}

// Lấy dữ liệu hiệu năng
async function getPerformanceData() {
    try {
        // Kiểm tra tổng số orders
        const totalOrders = await Order.countDocuments({});

        // Đếm số đơn hàng bị hủy trong tuần qua (có thể do hết hạn)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const expiredOrders = await Order.countDocuments({
            status: 'cancelled', // Chỉ tính đơn hàng bị hủy
            updatedAt: { $gte: oneWeekAgo }
        });

        // Lấy response time data thật từ database
        let avgResponseTime = 0;
        let p95 = 0;
        let p99 = 0;

        try {
            const ResponseTime = require('../models/responseTimeModel');

            // Lấy response time stats từ 24h gần đây
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const responseTimeData = await ResponseTime.find({
                timestamp: { $gte: oneDayAgo },
                endpoint: { $regex: /chat/ } // Chỉ lấy chat endpoints
            }).sort({ timestamp: -1 }).limit(1000);

            if (responseTimeData.length > 0) {
                const durations = responseTimeData.map(r => r.duration).sort((a, b) => a - b);
                const total = durations.reduce((sum, d) => sum + d, 0);

                avgResponseTime = Math.round(total / durations.length);
                p95 = Math.round(durations[Math.floor(durations.length * 0.95)] || avgResponseTime * 1.5);
                p99 = Math.round(durations[Math.floor(durations.length * 0.99)] || avgResponseTime * 2.0);
            }
        } catch (responseTimeError) {
            console.log('ResponseTime model not available, using calculated values');
            // Sử dụng giá trị mặc định nếu không có ResponseTime model
        }

        return {
            avgResponseTime,
            p95,
            p99,
            expiredOrders: expiredOrders || 0
        };
    } catch (error) {
        console.error("Error getting performance data:", error);
        return { avgResponseTime: 0, p95: 0, p99: 0, expiredOrders: 0 };
    }
}

module.exports = {
    getHomepage,
    postUpdateUser,
    getCSATData,
    getPaymentSuccessRates,
    getPerformanceData,
    // API exports for realtime dashboard
    apiMonthlyRevenue: async function(req, res) {
        try {
            const data = await getMonthlyRevenue();
            return res.json({ success: true, data });
        } catch (error) {
            console.error('apiMonthlyRevenue error:', error);
            return res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    },
    apiRevenueByPaymentMethod: async function(req, res) {
        try {
            const data = await getRevenueByPaymentMethod();
            return res.json({ success: true, data });
        } catch (error) {
            console.error('apiRevenueByPaymentMethod error:', error);
            return res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    },
    apiPaymentSuccessRates: async function(req, res) {
        try {
            const data = await getPaymentSuccessRates();
            return res.json({ success: true, data });
        } catch (error) {
            console.error('apiPaymentSuccessRates error:', error);
            return res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    },
    apiCleanupStats: async function(req, res) {
        try {
            // Đếm số đơn hàng bị hủy trong tuần qua (có thể do hết hạn)
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            const totalCleaned = await Order.countDocuments({
                status: { $in: ['cancelled', 'expired'] },
                updatedAt: { $gte: oneWeekAgo }
            });

            return res.json({
                success: true,
                data: {
                    stats: {
                        totalCleaned: totalCleaned || 0
                    }
                }
            });
        } catch (error) {
            console.error('apiCleanupStats error:', error);
            return res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    },
    apiTopTours: async function(req, res) {
        try {
            const { type } = req.query;
            let data = [];
            if (type === 'booked') {
                data = await getTopBookedTours();
            } else if (type === 'revenue') {
                data = await getTopRevenueTours();
            } else if (type === 'cancelled') {
                data = await getTopCancelledTours();
            } else {
                return res.status(400).json({ success: false, message: 'Invalid type' });
            }
            return res.json({ success: true, data });
        } catch (error) {
            console.error('apiTopTours error:', error);
            return res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    }
};
