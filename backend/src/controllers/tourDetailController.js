const Tour = require("../models/tourModel");
const TourDetail = require("../models/tourDetailModel");
const Category = require("../models/categoriesModel");
const Departure = require("../models/departureModel");
const Destination = require("../models/destinationModel");
const Transportation = require("../models/transportationModel");
const { recalculateAndUpdateTourPrice } = require("../utils/priceCalculator");

// Hiển thị chi tiết tour
exports.detail = async (req, res) => {
    const slug = req.params.slug;
    try {
    // Tìm tour theo slug
    const tour = await Tour.findOne({ slug }).lean();
    if (!tour) {
        return res.status(404).render('404', { 
        title: 'Tour không tìm thấy' 
        });
    }

    // Lấy thông tin liên quan song song để tối ưu hiệu suất
    const [tourDetail, departure, destination, transportation, category] = await Promise.all([
        TourDetail.find({ tourId: tour._id }).sort({ dayStart: 1 }).lean(),
        Departure.findById(tour.departure).lean(),
        Destination.findById(tour.destination).lean(),
        Transportation.findById(tour.transportation).lean(),
        Category.findById(tour.category).lean()
    ]);

    // Render trang chi tiết với tất cả dữ liệu cần thiết
    res.render('tour/detail', {
        title: `${tour.title} - Chi tiết tour`,
        tour,
        tourDetail: tourDetail || [],
        departure,
        destination,
        transportation,
        category,
        currentPath: req.path,
        userPermissions: res.locals.userPermissions
        });
    } catch (error) {
    console.error('Error loading tour detail:', error);
    res.status(500).render('error', { 
        error: 'Có lỗi xảy ra khi tải chi tiết tour',
        title: 'Lỗi hệ thống'
        });
    }
};

//-- API Methods --

// Tạo chi tiết tour mới
exports.create = async (req, res) => {
    try {
        const { tourId } = req.params;
        const {
            adultPrice,
            childrenPrice,
            childPrice,
            babyPrice,
            singleRoomSupplementPrice,
            discount,
            stock,
            dayStart,
            dayReturn
        } = req.body;

        // Kiểm tra tour có tồn tại không
        const tour = await Tour.findById(tourId);
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: 'Tour không tồn tại'
            });
        }

        // Tạo chi tiết tour
        const tourDetail = await TourDetail.create({
            tourId,
            adultPrice: parseFloat(adultPrice) || 0,
            childrenPrice: parseFloat(childrenPrice) || 0,
            childPrice: parseFloat(childPrice) || 0,
            babyPrice: parseFloat(babyPrice) || 0,
            singleRoomSupplementPrice: parseFloat(singleRoomSupplementPrice) || 0,
            discount: parseFloat(discount) || 0,
            stock: parseInt(stock) || 0,
            dayStart: new Date(dayStart),
            dayReturn: new Date(dayReturn)
        });

    // Tính toán lại giá tour
    const newPricing = await recalculateAndUpdateTourPrice(tourId);

        res.status(201).json({
            success: true,
            message: 'Thêm chi tiết tour thành công',
            data: tourDetail,
            // Trả về pricing chi tiết và giữ totalPrice (legacy) = displayPrice để tương thích ngược
            pricing: newPricing,
            totalPrice: newPricing?.displayPrice || 0
        });
    } catch (error) {
        console.error('Error creating tour detail:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi thêm chi tiết tour'
        });
    }
};

// Cập nhật chi tiết tour
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            adultPrice,
            childrenPrice,
            childPrice,
            babyPrice,
            singleRoomSupplementPrice,
            discount,
            stock,
            dayStart,
            dayReturn
        } = req.body;

        // Tìm và cập nhật chi tiết tour
        const tourDetail = await TourDetail.findByIdAndUpdate(
            id,
            {
                adultPrice: parseFloat(adultPrice) || 0,
                childrenPrice: parseFloat(childrenPrice) || 0,
                childPrice: parseFloat(childPrice) || 0,
                babyPrice: parseFloat(babyPrice) || 0,
                singleRoomSupplementPrice: parseFloat(singleRoomSupplementPrice) || 0,
                discount: parseFloat(discount) || 0,
                stock: parseInt(stock) || 0,
                dayStart: new Date(dayStart),
                dayReturn: new Date(dayReturn)
            },
            { new: true }
        );

        if (!tourDetail) {
            return res.status(404).json({
                success: false,
                message: 'Chi tiết tour không tồn tại'
            });
        }

    // Tính toán lại giá tour
    const newPricing = await recalculateAndUpdateTourPrice(tourDetail.tourId);

        res.json({
            success: true,
            message: 'Cập nhật chi tiết tour thành công',
            data: tourDetail,
            pricing: newPricing,
            totalPrice: newPricing?.displayPrice || 0
        });
    } catch (error) {
        console.error('Error updating tour detail:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi cập nhật chi tiết tour'
        });
    }
};

// Xóa chi tiết tour
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        // Tìm chi tiết tour để lấy tourId trước khi xóa
        const tourDetail = await TourDetail.findById(id);
        if (!tourDetail) {
            return res.status(404).json({
                success: false,
                message: 'Chi tiết tour không tồn tại'
            });
        }

        const tourId = tourDetail.tourId;

        // Xóa chi tiết tour
        await TourDetail.findByIdAndDelete(id);

    // Tính toán lại giá tour
    const newPricing = await recalculateAndUpdateTourPrice(tourId);

        res.json({
            success: true,
            message: 'Xóa chi tiết tour thành công',
            pricing: newPricing,
            totalPrice: newPricing?.displayPrice || 0
        });
    } catch (error) {
        console.error('Error deleting tour detail:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi xóa chi tiết tour'
        });
    }
};

// Lấy chi tiết tour theo tour ID
exports.getByTourId = async (req, res) => {
    try {
        const { tourId } = req.params;
        
        const tourDetails = await TourDetail.find({ tourId }).sort({ dayStart: 1 });
        
        res.json({
            success: true,
            data: tourDetails
        });
    } catch (error) {
        console.error('Error getting tour details:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy chi tiết tour'
        });
    }
};

// Lấy chi tiết tour theo ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const tourDetail = await TourDetail.findById(id);
        if (!tourDetail) {
            return res.status(404).json({
                success: false,
                message: 'Chi tiết tour không tồn tại'
            });
        }
        
        res.json({
            success: true,
            data: tourDetail
        });
    } catch (error) {
        console.error('Error getting tour detail:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy chi tiết tour'
        });
    }
};