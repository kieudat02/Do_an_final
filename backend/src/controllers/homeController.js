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
            cancelledOrders,
            
            // Top 5 tour được đặt nhiều nhất
            topBookedTours,
            
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
            Order.countDocuments({ status: "cancelled" }),
            
            // Top 5 tour được đặt nhiều nhất
            getTopBookedTours(),
            
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
            cancelledOrders: cancelledOrders || 0,

            // Top 5 tour được đặt nhiều nhất
            topBookedTours: topBookedTours || [],

            // Doanh thu theo tháng
            monthlyRevenue: monthlyRevenue || Array(12).fill(0),

            // Doanh thu theo phương thức thanh toán
            revenueByPaymentMethod: revenueByPaymentMethod || { cash: 0, bankTransfer: 0, eWallet: 0 },

            currentUser,
            message,
            error: errorMessage,
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
        // Tìm tất cả các đơn hàng có trạng thái đã xác nhận
        const orders = await Order.find({ 
            status: { $in: ["confirmed", "pending"] } 
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

// Hàm lấy doanh thu theo tháng trong năm hiện tại
async function getMonthlyRevenue() {
    try {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1); // 1/1/currentYear
        const endDate = new Date(currentYear, 11, 31, 23, 59, 59); // 31/12/currentYear
        
        // Lấy tất cả đơn hàng đã xác nhận trong năm hiện tại
        const orders = await Order.find({
            status: "confirmed",
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

        // Lấy tất cả đơn hàng đã xác nhận trong năm hiện tại
        const orders = await Order.find({
            status: "confirmed",
            createdAt: { $gte: startDate, $lte: endDate }
        });

        // Tính doanh thu theo phương thức thanh toán
        const revenueByPayment = {
            cash: 0,        // Tiền mặt
            bankTransfer: 0, // Chuyển khoản
            eWallet: 0      // Ví điện tử
        };

        orders.forEach(order => {
            const amount = order.totalAmount || 0;

            // Map payment method từ database sang categories
            switch (order.paymentMethod) {
                case 'Tiền mặt':
                    revenueByPayment.cash += amount;
                    break;
                case 'Chuyển khoản':
                case 'bank_transfer':
                    revenueByPayment.bankTransfer += amount;
                    break;
                case 'Mã QR':
                case 'momo':
                case 'vnpay':
                case 'zalopay':
                    revenueByPayment.eWallet += amount;
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
        return { cash: 0, bankTransfer: 0, eWallet: 0 };
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

module.exports = {
    getHomepage,
    postUpdateUser,
};
