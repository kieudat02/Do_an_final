const Tour = require("../models/tourModel");
const TourDetail = require("../models/tourDetailModel");
const Category = require("../models/categoriesModel");
const Departure = require("../models/departureModel");
const Destination = require("../models/destinationModel");
const Transportation = require("../models/transportationModel");
const { recalculateAndUpdateTourPrice, calculateMinPrice, calculateMaxPrice, calculateMinPriceAll, calculateMaxPriceAll } = require("../utils/priceCalculator");
const { recalculateAllTourPrices } = require("../utils/recalculateAllTourPrices");
const { hasPermission } = require("../constants/roles");
const { checkPermission } = require("../middleware/permissionMiddleware");
const sanitizeHtml = require('sanitize-html');

//Cấu hình vệ sinh HTML cho nội dung tour du lịch
const sanitizeConfig = {
    allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'b', 'em', 'i',
        'ul', 'ol', 'li',
        'a', 'blockquote',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'img', 'figure', 'figcaption'
    ],
    allowedAttributes: {
        'a': ['href', 'title'],
        'table': ['border', 'cellpadding', 'cellspacing'],
        'th': ['colspan', 'rowspan'],
        'td': ['colspan', 'rowspan'],
        'img': ['src', 'alt', 'title', 'width', 'height', 'style', 'class'],
        'figure': ['class', 'style'],
        'figcaption': ['class']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
        'a': ['http', 'https', 'mailto'],
        'img': ['http', 'https']
    },
    allowedStyles: {
        'img': {
            'width': [/^\d+(?:px|%)?$/],
            'height': [/^\d+(?:px|%)?$/],
            'float': [/^(?:left|right)$/],
            'margin': [/^\d+(?:px|em|rem|%)?(?:\s+\d+(?:px|em|rem|%)?)*$/]
        },
        'figure': {
            'width': [/^\d+(?:px|%)?$/],
            'float': [/^(?:left|right)$/],
            'margin': [/^\d+(?:px|em|rem|%)?(?:\s+\d+(?:px|em|rem|%)?)*$/]
        }
    }
};

// Utility function để decode HTML entities
const decodeHtmlEntities = (content) => {
    if (!content || typeof content !== 'string') return '';

    // Decode HTML entities
    return content
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
};

//Chức năng trợ giúp để vệ sinh nội dung HTML
const sanitizeHtmlContent = (content) => {
    if (!content) return '';

    // Decode HTML entities trước khi sanitize
    const decodedContent = decodeHtmlEntities(content);

    // Sanitize HTML với config đã định nghĩa
    return sanitizeHtml(decodedContent, sanitizeConfig);
};

// Helper functions for new fields
const toArr = (val) => Array.isArray(val) ? val : (val ? [val] : []);
const fromLines = (text) => text ? text.split('\n').map(line => line.trim()).filter(line => line) : [];
const toNumber = (str) => {
    if (!str) return 0;
    // Remove all non-numeric characters except dots and dashes, then remove dots used as thousand separators
    const cleaned = str.toString().replace(/[^0-9.-]/g, '').replace(/\.(?=\d{3})/g, '');
    return Number(cleaned) || 0;
};
const safeArr = (arr) => Array.isArray(arr) ? arr : [];
const safeObj = (obj) => obj && typeof obj === 'object' ? obj : {};
const vnd = (price) => price && price > 0 ? `${price.toLocaleString('vi-VN')} VNĐ` : '';

// Build overview from request body
const buildOverviewFromReq = (body) => {
    const overview = {
        introHtml: sanitizeHtmlContent(body.overview_introHtml || ''),
        description: sanitizeHtmlContent(body.overview_description || ''), // Thêm trường mô tả mới
        pricing: {
            yearTitle: body.pricing_yearTitle || `LỊCH KHỞI HÀNH ${new Date().getFullYear()}`,
            rows: [],
            noteHtml: sanitizeHtmlContent(body.pricing_noteHtml || '')
        },
        promotions: []
    };

    // Build pricing rows from repeater
    const dateLabels = toArr(body.pricing_dateLabel);
    const priceTexts = toArr(body.pricing_priceText);
    for (let i = 0; i < Math.max(dateLabels.length, priceTexts.length); i++) {
        if (dateLabels[i] || priceTexts[i]) {
            // Clean and validate price text
            let cleanPriceText = priceTexts[i] || '';

            // If price text is provided, check if it's a valid non-zero price
            if (cleanPriceText) {
                // Extract numeric value from price text
                const numericValue = cleanPriceText.replace(/[^\d]/g, '');
                const priceValue = parseInt(numericValue) || 0;

                // Only keep price text if value > 0
                if (priceValue === 0) {
                    cleanPriceText = '';
                }
            }

            overview.pricing.rows.push({
                dateLabel: dateLabels[i] || '',
                priceText: cleanPriceText
            });
        }
    }

    // Build promotions from repeater
    const promoLabels = toArr(body.promo_label);
    const promoDescs = toArr(body.promo_desc);
    for (let i = 0; i < Math.max(promoLabels.length, promoDescs.length); i++) {
        if (promoLabels[i] || promoDescs[i]) {
            overview.promotions.push({
                label: promoLabels[i] || '',
                desc: promoDescs[i] || ''
            });
        }
    }

    return overview;
};

// Build schedule from request body (enhanced itinerary)
const buildScheduleFromReq = (body) => {
    const itinerary = body.itinerary;
    if (!Array.isArray(itinerary)) return [];

    return itinerary.map((item, index) => {
        let dayValue;
        if (item.day !== undefined && item.day !== null && item.day !== "") {
            dayValue = parseInt(item.day);
        } else {
            dayValue = index + 1;
        }
        const validDay = !isNaN(dayValue) && dayValue > 0 ? dayValue : index + 1;

        return {
            day: validDay,
            title: item.title || "",
            details: sanitizeHtmlContent(item.details || "")
        };
    }).filter(item => item.title && item.title.trim() !== "");
};

// Build includes from request body
const buildIncludesFromReq = (body) => {
    return {
        included: fromLines(sanitizeHtmlContent(body.includes_included)),
        excluded: fromLines(sanitizeHtmlContent(body.includes_excluded)),
        notes: {
            important: fromLines(sanitizeHtmlContent(body.notes_important))
        }
    };
};

exports.list = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3; // Allow dynamic limit from query
    const skip = (page - 1) * limit;
    const filter = { deleted: false };
    let sort = { createdAt: 1 }; // Sort from old to new (new records at bottom)

    // Basic filters
    if (req.query.status) filter.status = req.query.status === "true";
    if (req.query.highlight) filter.highlight = req.query.highlight === "true";
    if (req.query.category) filter.category = req.query.category;
    if (req.query.departure) filter.departure = req.query.departure;
    if (req.query.destination) filter.destination = req.query.destination;
    if (req.query.transportation)
        filter.transportation = req.query.transportation;
    if (req.query.q) filter.title = { $regex: req.query.q, $options: "i" };

    // Date filters
    if (req.query.startDate) {
        filter.startDate = { $gte: new Date(req.query.startDate) };
    }
    if (req.query.endDate) {
        filter.endDate = { $lte: new Date(req.query.endDate) };
    }

    // Advanced date filters for quick filter buttons
    const today = new Date();
    const thirtyDaysFromNow = new Date(
        today.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    // Handle quick filter scenarios
    if (req.query.quickFilter) {
        switch (req.query.quickFilter) {
            case "expiring":
                // Tours expiring within 30 days
                filter.endDate = {
                    $gte: today,
                    $lte: thirtyDaysFromNow,
                };
                filter.status = true;
                break;
            case "expired":
                // Tours that have already ended
                filter.endDate = { $lt: today };
                break;
            case "featured":
                // Featured tours
                filter.highlight = true;
                break;
            case "active":
                // Active tours
                filter.status = true;
                break;
        }
    }

    // Handle "expired" filter from quick filter button
    if (req.query.expired === "true") {
        filter.endDate = { $lt: today };
    }

    // Price sorting (dựa vào tour.price = minPrice cache)
    if (req.query.sortPrice) {
        sort = { price: req.query.sortPrice === "asc" ? 1 : -1 };
    }

    // Price range filter (dùng trường price/minPrice cache)
    if (req.query.minPrice || req.query.maxPrice) {
        filter.price = {};
        if (req.query.minPrice)
            filter.price.$gte = parseInt(req.query.minPrice);
        if (req.query.maxPrice)
            filter.price.$lte = parseInt(req.query.maxPrice);
    }

    try {
        const [
            tours,
            total,
            categories,
            departures,
            destinations,
            transportation,
        ] = await Promise.all([
            Tour.find(filter)
                .populate(
                    "category departure destination transportation createdBy updatedBy"
                )
                .sort(sort)
                .skip(skip)
                .limit(limit),
            Tour.countDocuments(filter),
            Category.find({ deleted: false }).sort({ name: 1 }),
            Departure.find({ deleted: false }).sort({ name: 1 }),
            Destination.find({ deleted: false }).sort({ name: 1 }),
            Transportation.find({ deleted: false }).sort({ name: 1 }),
        ]);

        // Load tour details for each tour and calculate pricing info
        const toursWithPricing = await Promise.all(
            tours.map(async (tour) => {
                const tourDetails = await TourDetail.find({
                    tourId: tour._id,
                }).lean();
                const minAvail = calculateMinPrice(tourDetails);
                const maxAvail = calculateMaxPrice(tourDetails);
                const fallbackMin = calculateMinPriceAll(tourDetails);
                const fallbackMax = calculateMaxPriceAll(tourDetails);
                const minPrice = minAvail > 0 ? minAvail : fallbackMin;
                const maxPrice = maxAvail > 0 ? maxAvail : fallbackMax;

                // Calculate total bookings for this tour
                const Order = require('../models/orderModel');
                const bookingCount = await Order.aggregate([
                    {
                        $match: {
                            status: { $in: ["confirmed", "pending"] },
                            "items.tourId": tour._id
                        }
                    },
                    {
                        $unwind: "$items"
                    },
                    {
                        $match: {
                            "items.tourId": tour._id
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalBookings: { $sum: "$items.quantity" }
                        }
                    }
                ]);

                const totalBookings = bookingCount.length > 0 ? bookingCount[0].totalBookings : 0;

                return {
                    ...tour.toObject(),
                    tourDetails,
                    minPrice,
                    maxPrice,
                    hasMultiplePrices: tourDetails.length > 1,
                    priceRange:
                        minPrice !== maxPrice
                            ? `${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`
                            : minPrice.toLocaleString(),
                    bookings: totalBookings, // Thêm thông tin số lượng đặt chỗ
                };
            })
        );

        const totalPages = Math.ceil(total / limit);

        res.render("tour", {
            tours: toursWithPricing,
            currentPage: page,
            totalPages,
            limit,
            total,
            query: req.query,
            categories,
            departures,
            destinations,
            transportations: transportation,
            userPermissions: res.locals.userPermissions, // Đảm bảo luôn truyền userPermissions
        });
    } catch (error) {
        res.render("tour", {
            tours: [],
            currentPage: 1,
            totalPages: 1,
            limit,
            total: 0,
            query: req.query,
            categories: [],
            departures: [],
            destinations: [],
            transportations: [],
            userPermissions: res.locals.userPermissions, // Đảm bảo luôn truyền userPermissions
        });
    }
};

// Hiển thị form thêm mới
exports.showAddForm = async (req, res) => {
    const [categories, departures, destinations, transportations] =
        await Promise.all([
            Category.find({ deleted: false }).sort({ name: 1 }),
            Departure.find({ deleted: false }).sort({ name: 1 }),
            Destination.find({ deleted: false }).sort({ name: 1 }),
            Transportation.find({ deleted: false }).sort({ name: 1 }),
        ]);
    res.render("tour/add", {
        categories,
        departures,
        destinations,
        transportations,
        userPermissions: res.locals.userPermissions, // Đảm bảo luôn truyền userPermissions
    });
};

// Xử lý thêm mới
exports.create = async (req, res) => {
    try {
        const {
            title,
            code,
            category,
            departure,
            destination,
            transportation,
            attractions,
            cuisine,
            suitableTime,
            suitableObject,
            vehicleInfo,
            promotion,
            promotions,
            itinerary,
            tourDetails,
        } = req.body;

        // Enhanced server-side validation
        const validationErrors = [];

        // 1. Validate required fields
        if (!title || title.trim().length === 0) {
            validationErrors.push('Tiêu đề tour là bắt buộc');
        }
        if (!code || code.trim().length === 0) {
            validationErrors.push('Mã tour là bắt buộc');
        }
        if (!category) {
            validationErrors.push('Danh mục là bắt buộc');
        }
        if (!departure) {
            validationErrors.push('Điểm khởi hành là bắt buộc');
        }
        if (!destination) {
            validationErrors.push('Điểm đến là bắt buộc');
        }
        if (!transportation) {
            validationErrors.push('Phương tiện là bắt buộc');
        }

        // 2. Validate itinerary
        if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
            validationErrors.push('Cần có ít nhất 1 lịch trình tour');
        } else {
            itinerary.forEach((item, index) => {
                if (!item.title || item.title.trim().length === 0) {
                    validationErrors.push(`Tiêu đề ngày ${index + 1} là bắt buộc`);
                }
                if (!item.details || item.details.trim().length === 0) {
                    validationErrors.push(`Chi tiết ngày ${index + 1} là bắt buộc`);
                }
            });
        }

        // 3. Validate tour details
        if (!tourDetails || !Array.isArray(tourDetails) || tourDetails.length === 0) {
            validationErrors.push('Cần có ít nhất 1 chi tiết tour (giá và lịch khởi hành)');
        } else {
            tourDetails.forEach((detail, index) => {
                const blockNumber = index + 1;

                // Validate adult price
                if (!detail.adultPrice || parseFloat(detail.adultPrice) <= 0) {
                    validationErrors.push(`Giá người lớn tour ${blockNumber} phải lớn hơn 0`);
                }

                // Validate stock
                if (!detail.stock || parseInt(detail.stock) <= 0) {
                    validationErrors.push(`Số lượng tour ${blockNumber} phải lớn hơn 0`);
                }

                // Validate dates
                if (!detail.dayStart) {
                    validationErrors.push(`Ngày khởi hành tour ${blockNumber} là bắt buộc`);
                }
                if (!detail.dayReturn) {
                    validationErrors.push(`Ngày trở về tour ${blockNumber} là bắt buộc`);
                }

                // Validate date logic
                if (detail.dayStart && detail.dayReturn) {
                    const startDate = new Date(detail.dayStart);
                    const returnDate = new Date(detail.dayReturn);

                    if (returnDate <= startDate) {
                        validationErrors.push(`Ngày trở về tour ${blockNumber} phải sau ngày khởi hành`);
                    }
                }

                // Validate discount
                if (detail.discount && (parseFloat(detail.discount) < 0 || parseFloat(detail.discount) > 100)) {
                    validationErrors.push(`Giảm giá tour ${blockNumber} phải từ 0-100%`);
                }
            });
        }

        // Return validation errors if any
        if (validationErrors.length > 0) {
            const [categories, departures, destinations, transportations] = await Promise.all([
                Category.find({ deleted: false }).sort({ name: 1 }),
                Departure.find({ deleted: false }).sort({ name: 1 }),
                Destination.find({ deleted: false }).sort({ name: 1 }),
                Transportation.find({ deleted: false }).sort({ name: 1 }),
            ]);

            return res.render("tour/add", {
                categories,
                departures,
                destinations,
                transportations,
                error: validationErrors,
                formData: req.body,
                userPermissions: res.locals.userPermissions,
            });
        }

        // Kiểm tra mã tour đã tồn tại
        if (code) {
            const existingTour = await Tour.findOne({
                code: code,
                deleted: false,
            });

            if (existingTour) {
                const [categories, departures, destinations, transportations] =
                    await Promise.all([
                        Category.find({ deleted: false }).sort({ name: 1 }),
                        Departure.find({ deleted: false }).sort({ name: 1 }),
                        Destination.find({ deleted: false }).sort({ name: 1 }),
                        Transportation.find({ deleted: false }).sort({
                            name: 1,
                        }),
                    ]);

                return res.render("tour/add", {
                    categories,
                    departures,
                    destinations,
                    transportations,
                    error: ["Mã tour đã tồn tại, vui lòng chọn mã khác"],
                    formData: req.body, // Giữ lại dữ liệu form
                    userPermissions: res.locals.userPermissions, // Đảm bảo luôn truyền userPermissions
                });
            }
        }

        let image = "";
        let images = [];

        if (req.files && req.files.length > 0) {
            // Process multiple images - use file.path for Cloudinary or construct path for local storage
            images = req.files.map((file) => {
                // If using Cloudinary, file.path contains the full URL
                // If using local storage, we need to construct the path
                return file.path || "/uploads/" + file.filename;
            });
            // Set the first image as the main image for backward compatibility
            image = images[0];
        }

        // Process promotions from new format
        let processedPromotions = [];
        if (promotions && Array.isArray(promotions)) {
            processedPromotions = promotions
                .filter(promo => promo.dateLabels)
                .map(promo => ({
                    label: promo.label || ''
                }));
        }

        // Process itinerary data with new fields
        const processedItinerary = buildScheduleFromReq(req.body);

        // Build new field structures
        const overview = buildOverviewFromReq(req.body);
        const includes = buildIncludesFromReq(req.body);
        const highlights = fromLines(sanitizeHtmlContent(req.body.highlights));

        // Determine start and end dates from tour details
        let startDate = null;
        let endDate = null;

        if (
            tourDetails &&
            Array.isArray(tourDetails) &&
            tourDetails.length > 0
        ) {
            // Find earliest start date and latest end date
            const validDetails = tourDetails.filter(
                (detail) => detail.dayStart && detail.dayReturn
            );
            if (validDetails.length > 0) {
                const startDates = validDetails.map(
                    (detail) => new Date(detail.dayStart)
                );
                const endDates = validDetails.map(
                    (detail) => new Date(detail.dayReturn)
                );

                startDate = new Date(Math.min(...startDates));
                endDate = new Date(Math.max(...endDates));
            }
        }

        // Create tour
        const tourData = {
            title,
            code,
            category,
            departure,
            destination,
            transportation,
            attractions,
            cuisine,
            suitableTime,
            suitableObject,
            vehicleInfo,
            promotion,
            promotions: processedPromotions,
            itinerary: processedItinerary,
            overview,
            includes,
            highlights,
            status: true,
            highlight: true,
            image,
            images,
            price: 0,
            startDate,
            endDate,
            createdBy: req.session?.user?.fullName || "System",
        };

        const tour = await Tour.create(tourData);

        // Create tour details (price blocks)
        let tourDetailsCreated = false;
        if (tourDetails && Array.isArray(tourDetails)) {
            try {
                const tourDetailPromises = tourDetails.map((detail) => {
                    return TourDetail.create({
                        tourId: tour._id,
                        adultPrice: parseFloat(detail.adultPrice) || 0,
                        childrenPrice: parseFloat(detail.childrenPrice) || 0,
                        childPrice: parseFloat(detail.childPrice) || 0,
                        babyPrice: parseFloat(detail.babyPrice) || 0,
                        singleRoomSupplementPrice:
                            parseFloat(detail.singleRoomSupplementPrice) || 0,
                        discount: parseFloat(detail.discount) || 0,
                        stock: parseInt(detail.stock) || 0,
                        dayStart: new Date(detail.dayStart),
                        dayReturn: new Date(detail.dayReturn),
                    });
                });
                await Promise.all(tourDetailPromises);
                tourDetailsCreated = true;

                // Tính toán lại tổng giá sau khi tạo tour details
                try {
                    await recalculateAndUpdateTourPrice(tour._id);
                } catch (priceError) {
                    // Failed to recalculate tour price - continue anyway
                }
            } catch (detailError) {
                // Failed to create tour details - continue anyway
            }
        }

        // Check if request expects JSON (AJAX) or HTML (form submission)
        if (
            req.headers.accept &&
            req.headers.accept.includes("application/json")
        ) {
            // Return JSON response for AJAX requests
            return res.status(201).json({
                success: true,
                message: "Thêm tour thành công!",
                tour: {
                    id: tour._id,
                    title: tour.title,
                    code: tour.code,
                    status: tour.status,
                    highlight: tour.highlight,
                    images: tour.images,
                    createdAt: tour.createdAt,
                    hasDetails: tourDetailsCreated,
                },
            });
        } else {
            // Return redirect response for form submissions
            req.flash("success", "Thêm tour mới thành công!");
            return res.redirect("/tour");
        }
    } catch (error) {

        // Check if request expects JSON or HTML
        if (
            req.headers.accept &&
            req.headers.accept.includes("application/json")
        ) {
            // Return JSON response for AJAX requests
            if (error.name === "ValidationError") {
                const errors = Object.values(error.errors).map(
                    (err) => err.message
                );
                return res.status(400).json({
                    success: false,
                    message: `Lỗi xác thực: ${errors.join(", ")}`,
                });
            } else if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: "Mã tour đã tồn tại, vui lòng chọn mã khác!",
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: "Có lỗi xảy ra khi thêm tour: " + error.message,
                });
            }
        } else {
            // Return redirect response for form submissions
            if (error.name === "ValidationError") {
                const errors = Object.values(error.errors).map(
                    (err) => err.message
                );
                req.flash("error", `Lỗi xác thực: ${errors.join(", ")}`);
            } else if (error.code === 11000) {
                req.flash(
                    "error",
                    "Mã tour đã tồn tại, vui lòng chọn mã khác!"
                );
            } else {
                req.flash(
                    "error",
                    "Có lỗi xảy ra khi thêm tour: " + error.message
                );
            }
            return res.redirect("/tour/add");
        }
    }
};

// Hiển thị form sửa
exports.showEditForm = async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        const tourDetails = await TourDetail.find({ tourId: req.params.id });
        const [categories, departures, destinations, transportations] =
            await Promise.all([
                Category.find({ deleted: false }).sort({ name: 1 }),
                Departure.find({ deleted: false }).sort({ name: 1 }),
                Destination.find({ deleted: false }).sort({ name: 1 }),
                Transportation.find({ deleted: false }).sort({ name: 1 }),
            ]);
        res.render("tour/edit", {
            tour,
            tourDetails,
            categories,
            departures,
            destinations,
            transportations,
            userPermissions: res.locals.userPermissions, // Đảm bảo luôn truyền userPermissions
        });
    } catch (error) {
        req.flash("error", "Có lỗi xảy ra khi tải form chỉnh sửa!");
        res.redirect("/tour");
    }
};

// Xử lý cập nhật
exports.update = async (req, res) => {
    try {
        const {
            title,
            code,
            category,
            departure,
            destination,
            transportation,
            attractions,
            cuisine,
            suitableTime,
            suitableObject,
            vehicleInfo,
            promotion,
            promotions,
            itinerary,
            tourDetails,
            status,
            highlight,
        } = req.body;

        // Kiểm tra mã tour đã tồn tại (ngoại trừ tour hiện tại)
        if (code) {
            const existingTour = await Tour.findOne({
                code: code,
                deleted: false,
                _id: { $ne: req.params.id }, // Loại trừ tour hiện tại
            });

            if (existingTour) {
                const [
                    tour,
                    tourDetails,
                    categories,
                    departures,
                    destinations,
                    transportations,
                ] = await Promise.all([
                    Tour.findById(req.params.id),
                    TourDetail.find({ tourId: req.params.id }),
                    Category.find({ deleted: false }).sort({ name: 1 }),
                    Departure.find({ deleted: false }).sort({ name: 1 }),
                    Destination.find({ deleted: false }).sort({ name: 1 }),
                    Transportation.find({ deleted: false }).sort({ name: 1 }),
                ]);

                return res.render("tour/edit", {
                    tour,
                    tourDetails,
                    categories,
                    departures,
                    destinations,
                    transportations,
                    error: ["Mã tour đã tồn tại, vui lòng chọn mã khác"],
                    formData: req.body, // Giữ lại dữ liệu form
                    userPermissions: res.locals.userPermissions, // Đảm bảo luôn truyền userPermissions
                });
            }
        }

        // Get current tour to preserve status and highlight
        const currentTour = await Tour.findById(req.params.id);
        if (!currentTour) {
            return res.status(404).json({
                success: false,
                message: "Tour không tồn tại!",
            });
        }

        // Process promotions from new format
        let processedPromotions = [];
        if (promotions && Array.isArray(promotions)) {
            processedPromotions = promotions
                .filter(promo => promo.label)
                .map(promo => ({
                    label: promo.label || ''
                }));
        }

        let updateData = {
            title,
            code,
            category,
            departure,
            destination,
            transportation,
            attractions,
            cuisine,
            suitableTime,
            suitableObject,
            vehicleInfo,
            promotion,
            promotions: processedPromotions,
            status: currentTour.status,
            highlight: currentTour.highlight,
            updatedBy: req.session?.user?.fullName || "System",
        };

        // Process itinerary data with new fields
        updateData.itinerary = buildScheduleFromReq(req.body);

        // Build new field structures
        updateData.overview = buildOverviewFromReq(req.body);
        updateData.includes = buildIncludesFromReq(req.body);
        updateData.highlights = fromLines(sanitizeHtmlContent(req.body.highlights));

        // Determine start and end dates from tour details
        let startDate = null;
        let endDate = null;

        if (
            tourDetails &&
            Array.isArray(tourDetails) &&
            tourDetails.length > 0
        ) {
            // Find earliest start date and latest end date
            const validDetails = tourDetails.filter(
                (detail) => detail.dayStart && detail.dayReturn
            );
            if (validDetails.length > 0) {
                const startDates = validDetails.map(
                    (detail) => new Date(detail.dayStart)
                );
                const endDates = validDetails.map(
                    (detail) => new Date(detail.dayReturn)
                );

                startDate = new Date(Math.min(...startDates));
                endDate = new Date(Math.max(...endDates));

                // Update tour dates
                updateData.startDate = startDate;
                updateData.endDate = endDate;
            }
        }

        // Handle multiple images
        if (req.files && req.files.length > 0) {
            const images = req.files.map((file) => {
                // If using Cloudinary, file.path contains the full URL
                // If using local storage, we need to construct the path
                return file.path || "/uploads/" + file.filename;
            });
            updateData.images = images;
            updateData.image = images[0]; // Set first image as main image
        }

        // Update tour
        const updatedTour = await Tour.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedTour) {
            return res.status(404).json({
                success: false,
                message: "Tour không tồn tại!",
            });
        }

        // Delete existing tour details and create new ones
        let tourDetailsUpdated = false;
        try {
            await TourDetail.deleteMany({ tourId: req.params.id });

            if (tourDetails && Array.isArray(tourDetails)) {
                const tourDetailPromises = tourDetails.map((detail) => {
                    return TourDetail.create({
                        tourId: req.params.id,
                        adultPrice: parseFloat(detail.adultPrice) || 0,
                        childrenPrice: parseFloat(detail.childrenPrice) || 0,
                        childPrice: parseFloat(detail.childPrice) || 0,
                        babyPrice: parseFloat(detail.babyPrice) || 0,
                        singleRoomSupplementPrice:
                            parseFloat(detail.singleRoomSupplementPrice) || 0,
                        discount: parseFloat(detail.discount) || 0,
                        stock: parseInt(detail.stock) || 0,
                        dayStart: new Date(detail.dayStart),
                        dayReturn: new Date(detail.dayReturn),
                    });
                });
                await Promise.all(tourDetailPromises);
                tourDetailsUpdated = true;

                // Tính toán lại tổng giá sau khi cập nhật tour details
                try {
                    await recalculateAndUpdateTourPrice(req.params.id);
                } catch (priceError) {
                    // Continue anyway - tour was updated successfully
                }
            }
        } catch (detailError) {
            // Continue anyway - tour was updated successfully
        }

        // Check if request expects JSON (AJAX) or HTML (form submission)
        if (
            req.headers.accept &&
            req.headers.accept.includes("application/json")
        ) {
            // Return JSON response for AJAX requests
            return res.status(200).json({
                success: true,
                message: "Cập nhật tour thành công!",
                tour: {
                    id: updatedTour._id,
                    title: updatedTour.title,
                    code: updatedTour.code,
                    status: updatedTour.status,
                    highlight: updatedTour.highlight,
                    images: updatedTour.images,
                    updatedAt: updatedTour.updatedAt,
                    hasDetails: tourDetailsUpdated,
                },
            });
        } else {
            // Return redirect response for form submissions
            req.flash("success", "Cập nhật tour thành công!");
            return res.redirect("/tour");
        }
    } catch (error) {

        // Check if request expects JSON or HTML
        if (
            req.headers.accept &&
            req.headers.accept.includes("application/json")
        ) {
            // Return JSON response for AJAX requests
            if (error.name === "ValidationError") {
                const errors = Object.values(error.errors).map(
                    (err) => err.message
                );
                return res.status(400).json({
                    success: false,
                    message: `Lỗi xác thực: ${errors.join(", ")}`,
                });
            } else if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: "Mã tour đã tồn tại, vui lòng chọn mã khác!",
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message:
                        "Có lỗi xảy ra khi cập nhật tour: " + error.message,
                });
            }
        } else {
            // Return redirect response for form submissions
            if (error.name === "ValidationError") {
                const errors = Object.values(error.errors).map(
                    (err) => err.message
                );
                req.flash("error", `Lỗi xác thực: ${errors.join(", ")}`);
            } else if (error.code === 11000) {
                req.flash(
                    "error",
                    "Mã tour đã tồn tại, vui lòng chọn mã khác!"
                );
            } else {
                req.flash(
                    "error",
                    "Có lỗi xảy ra khi cập nhật tour: " + error.message
                );
            }
            return res.redirect(`/tour/edit/${req.params.id}`);
        }
    }
};

// Xử lý xóa (soft delete)
exports.delete = async (req, res) => {
    try {
        const deletedTour = await Tour.findByIdAndUpdate(
            req.params.id,
            { deleted: true, deletedBy: req.session?.user?._id },
            { new: true }
        );

        if (!deletedTour) {
            if (
                req.headers.accept &&
                req.headers.accept.includes("application/json")
            ) {
                return res.status(404).json({
                    success: false,
                    message: "Tour không tồn tại!",
                });
            } else {
                req.flash("error", "Tour không tồn tại!");
                return res.redirect("/tour");
            }
        }

        // Check if request expects JSON (AJAX) or HTML (form submission)
        if (
            req.headers.accept &&
            req.headers.accept.includes("application/json")
        ) {
            // For AJAX requests, calculate proper redirect URL
            const currentPage = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 3;
            
            // Count remaining tours with current filters
            const filter = { deleted: false };
            
            // Apply same filters as in list function
            if (req.query.status) filter.status = req.query.status === "true";
            if (req.query.highlight) filter.highlight = req.query.highlight === "true";
            if (req.query.category) filter.category = req.query.category;
            if (req.query.departure) filter.departure = req.query.departure;
            if (req.query.destination) filter.destination = req.query.destination;
            if (req.query.transportation) filter.transportation = req.query.transportation;
            if (req.query.q) filter.title = { $regex: req.query.q, $options: "i" };
            
            const totalRemainingTours = await Tour.countDocuments(filter);
            const totalPages = Math.ceil(totalRemainingTours / limit);
            
            // Calculate proper page to redirect to
            let redirectPage = currentPage;
            if (currentPage > totalPages && totalPages > 0) {
                redirectPage = totalPages;
            } else if (totalPages === 0) {
                redirectPage = 1;
            }

            // Return JSON response for AJAX requests with redirect info
            return res.status(200).json({
                success: true,
                message: "Xóa tour thành công!",
                tour: {
                    id: deletedTour._id,
                    title: deletedTour.title,
                    deleted: deletedTour.deleted,
                },
                pagination: {
                    currentPage: currentPage,
                    redirectPage: redirectPage,
                    totalPages: totalPages,
                    totalRemainingTours: totalRemainingTours,
                    needsRedirect: redirectPage !== currentPage
                }
            });
        } else {
            // Return redirect response for form submissions
            req.flash("success", "Xóa tour thành công!");
            return res.redirect("/tour");
        }
    } catch (error) {
        console.error('Error deleting tour:', error);

        // Check if request expects JSON or HTML
        if (
            req.headers.accept &&
            req.headers.accept.includes("application/json")
        ) {
            return res.status(500).json({
                success: false,
                message: "Có lỗi xảy ra khi xóa tour!",
            });
        } else {
            req.flash("error", "Có lỗi xảy ra khi xóa tour!");
            return res.redirect("/tour");
        }
    }
};

// Toggle status
exports.toggleStatus = async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: "Tour không tồn tại",
            });
        }

        tour.status = !tour.status;
        await tour.save();

        return res.status(200).json({
            success: true,
            message: `Tour đã được ${tour.status ? "kích hoạt" : "tạm dừng"}`,
            tour: {
                id: tour._id,
                title: tour.title,
                status: tour.status,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi cập nhật trạng thái",
        });
    }
};

// Toggle highlight
exports.toggleHighlight = async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: "Tour không tồn tại",
            });
        }

        tour.highlight = !tour.highlight;
        await tour.save();

        return res.status(200).json({
            success: true,
            message: `Tour đã được ${
                tour.highlight ? "đánh dấu nổi bật" : "bỏ đánh dấu nổi bật"
            }`,
            tour: {
                id: tour._id,
                title: tour.title,
                highlight: tour.highlight,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi cập nhật nổi bật",
        });
    }
};

// Handle multiple tour deletion
exports.deleteMultiple = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn ít nhất một tour để xóa",
            });
        }

        // Update multiple tours to mark as deleted
        const result = await Tour.updateMany(
            { _id: { $in: ids } },
            {
                deleted: true,
                deletedBy: req.session?.user?._id,
                deletedAt: new Date(),
            }
        );

        if (result.modifiedCount > 0) {
            // Calculate proper redirect page after deletion
            const currentPage = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 3;
            
            // Count remaining tours with current filters
            const filter = { deleted: false };
            
            // Apply same filters as in list function
            if (req.query.status) filter.status = req.query.status === "true";
            if (req.query.highlight) filter.highlight = req.query.highlight === "true";
            if (req.query.category) filter.category = req.query.category;
            if (req.query.departure) filter.departure = req.query.departure;
            if (req.query.destination) filter.destination = req.query.destination;
            if (req.query.transportation) filter.transportation = req.query.transportation;
            if (req.query.q) filter.title = { $regex: req.query.q, $options: "i" };
            
            const totalRemainingTours = await Tour.countDocuments(filter);
            const totalPages = Math.ceil(totalRemainingTours / limit);
            
            // Calculate proper page to redirect to
            let redirectPage = currentPage;
            if (currentPage > totalPages && totalPages > 0) {
                redirectPage = totalPages;
            } else if (totalPages === 0) {
                redirectPage = 1;
            }

            return res.status(200).json({
                success: true,
                message: `Đã xóa ${result.modifiedCount} tour thành công`,
                deletedCount: result.modifiedCount,
                pagination: {
                    currentPage: currentPage,
                    redirectPage: redirectPage,
                    totalPages: totalPages,
                    totalRemainingTours: totalRemainingTours,
                    needsRedirect: redirectPage !== currentPage
                }
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Không có tour nào được xóa",
            });
        }
    } catch (error) {
        console.error('Error deleting multiple tours:', error);
        return res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa tour",
        });
    }
};

// Hàm tạo mã tour tự động
function generateTourCode(title) {
    // Tạo mã từ tên tour
    const prefix = title
        .toLowerCase()
        .trim()
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
        .replace(/[èéẹẻẽêềếệểễ]/g, "e")
        .replace(/[ìíịỉĩ]/g, "i")
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
        .replace(/[ùúụủũưừứựửữ]/g, "u")
        .replace(/[ỳýỵỷỹ]/g, "y")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .split("-")
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase()
        .substring(0, 3);

    // Thêm số ngẫu nhiên và timestamp
    const timestamp = Date.now().toString().slice(-4);
    const randomNum = Math.floor(Math.random() * 99)
        .toString()
        .padStart(2, "0");

    return `${prefix}-${timestamp}${randomNum}`;
}

// API tạo mã tour tự động
exports.generateCode = async (req, res) => {
    try {
        const { title } = req.body;

        if (!title) {
            return res.json({
                success: false,
                message: "Vui lòng nhập tên tour",
            });
        }

        let code = generateTourCode(title);
        let counter = 1;

        // Kiểm tra mã đã tồn tại và tạo mã mới nếu cần
        while (true) {
            const existingTour = await Tour.findOne({
                code: code,
                deleted: false,
            });

            if (!existingTour) {
                break;
            }

            // Tạo mã mới với số thứ tự
            const baseCode = code.split("-")[0];
            const newSuffix = (Date.now() + counter).toString().slice(-6);
            code = `${baseCode}-${newSuffix}`;
            counter++;
        }

        return res.status(200).json({
            success: true,
            message: "Tạo mã tour thành công",
            code: code,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi tạo mã tour",
        });
    }
};

// API kiểm tra mã tour
exports.checkCode = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.json({
                success: false,
                message: "Vui lòng nhập mã tour",
            });
        }

        const existingTour = await Tour.findOne({
            code: code,
            deleted: false,
        });

        if (existingTour) {
            return res.status(400).json({
                success: false,
                exists: true,
                message: "Mã tour đã tồn tại, vui lòng chọn mã khác",
            });
        }

        return res.status(200).json({
            success: true,
            exists: false,
            message: "Mã tour có thể sử dụng",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi kiểm tra mã tour",
        });
    }
};

// Hiển thị chi tiết tour
exports.detail = async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) {
            req.flash("error", "Tour không tồn tại!");
            return res.redirect("/tour");
        }

        // Lấy thông tin liên quan song song để tối ưu hiệu suất
        const [tourDetail, departure, destination, transportation, category] = await Promise.all([
            TourDetail.find({ tourId: tour._id }).sort({ dayStart: 1 }),
            Departure.findById(tour.departure),
            Destination.findById(tour.destination),
            Transportation.findById(tour.transportation),
            Category.findById(tour.category)
        ]);

        res.render("tour/detail", {
            tour,
            tourDetail: tourDetail || [],
            departure,
            destination,
            transportation,
            category,
            userPermissions: res.locals.userPermissions,
        });
    } catch (error) {
        req.flash("error", "Có lỗi xảy ra khi tải chi tiết tour!");
        res.redirect("/tour");
    }
};

//-- API Methods --

// Lấy danh sách tour API
exports.getAllTours = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || "";
        const destinationName = req.query.destinationName;
        const destinationId = req.query.destination; 
        const departureFrom = req.query.departureFrom; 
        const departure = req.query.departure; 
        const destinationType = req.query.destinationType;
        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = { deleted: false, status: true };

        // Filter by highlight (featured tours)
        if (req.query.highlight !== undefined) {
            searchQuery.highlight = req.query.highlight === 'true';
        }

        // Build sort query
        let sortQuery = { createdAt: -1 }; // Default sort

        // Handle sortBy parameter from frontend
        let needsAggregation = false;
        if (req.query.sortBy) {
            const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
            switch (req.query.sortBy) {
                case 'PRICE_ASC':
                    sortQuery = { price: 1 };
                    break;
                case 'PRICE_DESC':
                    sortQuery = { price: -1 };
                    break;
                case 'DURATION_ASC':
                case 'DURATION_DESC':
                    needsAggregation = true;
                    break;
                case 'views':
                    sortQuery = { views: sortOrder };
                    break;
                case 'createdAt':
                    sortQuery = { createdAt: sortOrder };
                    break;
                default:
                    sortQuery = { createdAt: -1 };
            }
        }

        if (search) {
            searchQuery.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { code: { $regex: search, $options: "i" } },
            ];
        }

        // Filter theo destination ID (ưu tiên) - hỗ trợ multiple destinations
        if (destinationId) {
            try {
                const mongoose = require('mongoose');

                // Kiểm tra nếu destinationId là chuỗi chứa nhiều ID phân tách bằng dấu phẩy
                if (typeof destinationId === 'string' && destinationId.includes(',')) {
                    const destinationIds = destinationId.split(',').map(id => id.trim()).filter(id => id);
                    const validDestinationIds = [];

                    // Kiểm tra từng destination ID
                    for (const id of destinationIds) {
                        if (mongoose.Types.ObjectId.isValid(id)) {
                            const destination = await Destination.findById(id);
                            if (destination && destination.status === 'Hoạt động') {
                                validDestinationIds.push(id);
                            }
                        }
                    }

                    if (validDestinationIds.length > 0) {
                        searchQuery.destination = { $in: validDestinationIds };
                    }
                } else {
                    // Xử lý single destination ID như trước
                    if (mongoose.Types.ObjectId.isValid(destinationId)) {
                        const destination = await Destination.findById(destinationId);
                        if (destination && destination.status === 'Hoạt động') {
                            searchQuery.destination = destinationId;
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing destination ID:', error);
            }
        }
        // Filter theo destination name (điểm đến) - chỉ khi không có destinationId
        else if (destinationName) {
            // Tìm destination trong database
            const destination = await Destination.findOne({
                name: { $regex: destinationName, $options: 'i' },
                status: 'Hoạt động'
            });

            // Nếu không tìm thấy, thử tìm với case insensitive
            if (!destination) {
                const alternativeDestination = await Destination.findOne({
                    name: { $regex: destinationName.toLowerCase(), $options: 'i' },
                    status: 'Hoạt động'
                });
                if (alternativeDestination) {
                    searchQuery.destination = alternativeDestination._id;
                }
            } else {
                searchQuery.destination = destination._id;
            }

            // Nếu vẫn không tìm thấy destination, fallback tìm theo tên tour
            if (!searchQuery.destination) {
                searchQuery.title = { $regex: destinationName, $options: 'i' };
            }
        }

        // Filter theo departure (điểm khởi hành) - hỗ trợ cả legacy và mới
        const departureId = departure || departureFrom;
        if (departureId) {
            searchQuery.departure = departureId;
        }

        // Filter theo destination type (chỉ khi không có destinationName và destinationId cụ thể)
        if (destinationType && !destinationName && !destinationId) {
            // Tìm destinations theo type
            const destinations = await Destination.find({
                type: destinationType,
                status: 'Hoạt động'
            });

            if (destinations.length > 0) {
                const destinationIds = destinations.map(d => d._id);
                searchQuery.destination = { $in: destinationIds };
            }
        }

        // Filter theo category từ frontend
        if (req.query.category) {
            searchQuery.category = req.query.category;
        }



        //Filter theo price range từ frontend
        if (req.query.minPrice || req.query.maxPrice) {
            searchQuery.price = {};
            if (req.query.minPrice) {
                const minPrice = parseInt(req.query.minPrice);
                if (!isNaN(minPrice)) {
                    searchQuery.price.$gte = minPrice;
                }
            }
            if (req.query.maxPrice) {
                const maxPrice = parseInt(req.query.maxPrice);
                if (!isNaN(maxPrice)) {
                    searchQuery.price.$lte = maxPrice;
                }
            }
        }

        // Legacy filters 
        if (req.query.budgetId) {
            const budgetRanges = {
                1: { $lte: 5000000 },
                2: { $gte: 5000000, $lte: 10000000 },
                3: { $gte: 10000000, $lte: 20000000 },
                4: { $gte: 20000000 }
            };
            if (budgetRanges[req.query.budgetId]) {
                // Dùng trường price (minPrice cache) thay cho totalPrice legacy
                searchQuery.price = budgetRanges[req.query.budgetId];
            }
        }

        if (req.query.tourLine) {
            searchQuery.category = req.query.tourLine;
        }

        if (req.query.transTypeId) {
            searchQuery.transportation = req.query.transTypeId;
        }

        if (req.query.fromDate) {
            searchQuery.startDate = { $gte: new Date(req.query.fromDate) };
        }



        let tours, total;

        // Nếu cần aggregation cho duration sorting hoặc filtering
        if (needsAggregation || req.query.duration) {
            // Tạo base match query, đảm bảo ObjectId được xử lý đúng cách
            const baseMatch = { ...searchQuery };

            // Chuyển đổi string ID thành ObjectId cho aggregation
            const mongoose = require('mongoose');
            if (baseMatch.category && typeof baseMatch.category === 'string') {
                baseMatch.category = new mongoose.Types.ObjectId(baseMatch.category);
            }
            if (baseMatch.departure && typeof baseMatch.departure === 'string') {
                baseMatch.departure = new mongoose.Types.ObjectId(baseMatch.departure);
            }
            if (baseMatch.destination && typeof baseMatch.destination === 'string') {
                baseMatch.destination = new mongoose.Types.ObjectId(baseMatch.destination);
            }
            if (baseMatch.transportation && typeof baseMatch.transportation === 'string') {
                baseMatch.transportation = new mongoose.Types.ObjectId(baseMatch.transportation);
            }

            // Sử dụng aggregation pipeline
            const pipeline = [
                { $match: baseMatch },
                {
                    $addFields: {
                        calculatedDuration: {
                            $cond: {
                                if: { $and: [{ $ne: ["$startDate", null] }, { $ne: ["$endDate", null] }] },
                                then: {
                                    $add: [
                                        {
                                            $ceil: {
                                                $divide: [
                                                    { $subtract: ["$endDate", "$startDate"] },
                                                    1000 * 60 * 60 * 24
                                                ]
                                            }
                                        },
                                        1
                                    ]
                                },
                                else: 0
                            }
                        }
                    }
                }
            ];

            // Thêm filter cho duration nếu có
            if (req.query.duration) {
                const duration = parseInt(req.query.duration);
                if (!isNaN(duration)) {
                    pipeline.push({
                        $match: {
                            calculatedDuration: duration
                        }
                    });
                }
            }

            // Thêm sort
            if (req.query.sortBy === 'DURATION_ASC') {
                pipeline.push({ $sort: { calculatedDuration: 1 } });
            } else if (req.query.sortBy === 'DURATION_DESC') {
                pipeline.push({ $sort: { calculatedDuration: -1 } });
            } else {
                pipeline.push({ $sort: sortQuery });
            }

            // Thêm pagination
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: limit });

            // Thêm populate
            pipeline.push({
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            });
            pipeline.push({
                $lookup: {
                    from: 'departures',
                    localField: 'departure',
                    foreignField: '_id',
                    as: 'departure'
                }
            });
            pipeline.push({
                $lookup: {
                    from: 'destinations',
                    localField: 'destination',
                    foreignField: '_id',
                    as: 'destination'
                }
            });
            pipeline.push({
                $lookup: {
                    from: 'transportations',
                    localField: 'transportation',
                    foreignField: '_id',
                    as: 'transportation'
                }
            });

            // Unwind populated fields
            pipeline.push({
                $unwind: { path: '$category', preserveNullAndEmptyArrays: true }
            });
            pipeline.push({
                $unwind: { path: '$departure', preserveNullAndEmptyArrays: true }
            });
            pipeline.push({
                $unwind: { path: '$destination', preserveNullAndEmptyArrays: true }
            });
            pipeline.push({
                $unwind: { path: '$transportation', preserveNullAndEmptyArrays: true }
            });

            const [toursResult, totalResult] = await Promise.all([
                Tour.aggregate(pipeline),
                Tour.aggregate([
                    { $match: baseMatch },
                    {
                        $addFields: {
                            calculatedDuration: {
                                $cond: {
                                    if: { $and: [{ $ne: ["$startDate", null] }, { $ne: ["$endDate", null] }] },
                                    then: {
                                        $add: [
                                            {
                                                $ceil: {
                                                    $divide: [
                                                        { $subtract: ["$endDate", "$startDate"] },
                                                        1000 * 60 * 60 * 24
                                                    ]
                                                }
                                            },
                                            1
                                        ]
                                    },
                                    else: 0
                                }
                            }
                        }
                    },
                    ...(req.query.duration ? [{
                        $match: {
                            calculatedDuration: parseInt(req.query.duration)
                        }
                    }] : []),
                    { $count: "total" }
                ])
            ]);

            tours = toursResult;
            total = totalResult.length > 0 ? totalResult[0].total : 0;
        } else {
            // Sử dụng query thông thường
            const [toursResult, totalResult] = await Promise.all([
                Tour.find(searchQuery)
                    .populate('category departure destination transportation createdBy updatedBy')
                    .skip(skip)
                    .limit(limit)
                    .sort(sortQuery),
                Tour.countDocuments(searchQuery),
            ]);

            tours = toursResult;
            total = totalResult;
        }

        
        // Nếu có destinationName hoặc destinationId nhưng không tìm thấy tour, trả về empty array
        if ((destinationName || destinationId) && tours.length === 0) {
            
            res.status(200).json({
                success: true,
                data: [],
                pagination: {
                    current: page,
                    total: 0,
                    limit,
                    totalItems: 0,
                    hasNext: false,
                    hasPrev: false
                }
            });
            return;
        }
        


        // Load tour details for each tour and calculate pricing info
        const toursWithPricing = await Promise.all(
            tours.map(async (tour) => {
                const tourDetails = await TourDetail.find({
                    tourId: tour._id,
                }).lean();

                const minAvail = calculateMinPrice(tourDetails);
                const maxAvail = calculateMaxPrice(tourDetails);
                const fallbackMin = calculateMinPriceAll(tourDetails);
                const fallbackMax = calculateMaxPriceAll(tourDetails);
                const minPrice = minAvail > 0 ? minAvail : fallbackMin;
                const maxPrice = maxAvail > 0 ? maxAvail : fallbackMax;

                // Calculate total bookings for this tour
                const Order = require('../models/orderModel');
                const bookingCount = await Order.aggregate([
                    {
                        $match: {
                            status: { $in: ["confirmed", "completed"] },
                            "items.tourId": tour._id
                        }
                    },
                    {
                        $unwind: "$items"
                    },
                    {
                        $match: {
                            "items.tourId": tour._id
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalBookings: { $sum: "$items.quantity" }
                        }
                    }
                ]);

                const totalBookings = bookingCount.length > 0 ? bookingCount[0].totalBookings : 0;

                // Handle both Mongoose documents and plain objects from aggregation
                const tourObject = tour.toObject ? tour.toObject() : tour;

                // Tính original/discount dựa vào block giá có discounted thấp nhất
                let bestDiscountPrice = Number.POSITIVE_INFINITY;
                let bestOriginalPrice = 0;
                if (Array.isArray(tourDetails) && tourDetails.length > 0) {
                    tourDetails.forEach(detail => {
                        const candidates = [detail.adultPrice || 0, detail.childrenPrice || 0, detail.childPrice || 0, detail.babyPrice || 0].filter(p => p > 0);
                        if (candidates.length === 0) return;
                        const base = (detail.adultPrice && detail.adultPrice > 0) ? detail.adultPrice : Math.min(...candidates);
                        let final = base;
                        if (detail.discount && detail.discount > 0) {
                            final = base - (base * detail.discount / 100);
                        }
                        if (final < bestDiscountPrice) {
                            bestDiscountPrice = final;
                            bestOriginalPrice = base;
                        }
                    });
                }
                const discountPrice = (isFinite(bestDiscountPrice) && bestDiscountPrice > 0)
                    ? Math.round(bestDiscountPrice)
                    : (minPrice > 0 ? minPrice : (tour.price || 0));
                const originalPrice = (bestOriginalPrice > 0)
                    ? Math.round(bestOriginalPrice)
                    : (maxPrice > 0 ? maxPrice : discountPrice);
                const discountPercent = originalPrice > 0 && originalPrice > discountPrice
                    ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
                    : 0;
                const discountLabel = discountPercent > 0 ? `-${discountPercent}%` : null;

                return {
                    ...tourObject,
                    tourDetails,
                    minPrice,
                    maxPrice,
                    hasMultiplePrices: tourDetails.length > 1,
                    priceRange:
                        minPrice !== maxPrice
                            ? `${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`
                            : minPrice.toLocaleString(),
                    // Giữ tương thích: price là giá sau giảm để frontend hiện tại không vỡ
                    price: discountPrice,
                    totalPrice: discountPrice > 0 ? discountPrice : tour.totalPrice,
                    // Bổ sung trường cho UI hiển thị khuyến mãi
                    originalPrice,
                    discountPrice,
                    discountPercent,
                    discountLabel,
                    calculatedDuration: tour.calculatedDuration,
                    bookings: totalBookings,
                };
            })
        );

        const totalPages = Math.ceil(total / limit);



        res.status(200).json({
            success: true,
            data: toursWithPricing,
            pagination: {
                current: page,
                total: totalPages,
                limit,
                totalItems: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải danh sách tours",
            error: error.message
        });
    }
};

// Lấy danh sách tour theo Home Section với filter merge từ JSON
exports.getToursByHomeSection = async (req, res) => {
    try {
        const homeSectionId = req.params.homeSectionId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Import filter utilities
        const { 
            mergeFilters, 
            mergeCategoriesFilter, 
            buildSortQuery 
        } = require('../utils/filterUtils');

        // Lấy thông tin HomeSection
        const HomeSection = require("../models/homeSectionModel");
        const homeSection = await HomeSection.findOne({ 
            _id: homeSectionId, 
            isActive: true 
        }).populate('categories');

        if (!homeSection) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy Home Section hoặc đã bị vô hiệu hóa",
            });
        }

        // Xử lý filter đặc biệt cho country = "nuoc-ngoai"
        let needsDestinationFilter = false;
        let destinationTypeFilter = null;
        
        if (homeSection.filterQuery?.country) {
            const countryValue = homeSection.filterQuery.country;
            if (Array.isArray(countryValue) && countryValue.includes('nuoc-ngoai')) {
                needsDestinationFilter = true;
                destinationTypeFilter = 'Nước ngoài';
            } else if (countryValue === 'nuoc-ngoai') {
                needsDestinationFilter = true; 
                destinationTypeFilter = 'Nước ngoài';
            }
        }

        // Build base search query
        let searchQuery = { 
            deleted: false, 
            status: true 
        };

        // Merge basic filters (trừ country nếu cần filter theo destination)
        const filterForMerge = { ...homeSection.filterQuery };
        if (needsDestinationFilter) {
            delete filterForMerge.country; // Tạm xóa để xử lý riêng
        }
        
        searchQuery = { ...searchQuery, ...mergeFilters(filterForMerge, req.query) };

        // Merge categories từ HomeSection
        searchQuery = mergeCategoriesFilter(homeSection.categories, searchQuery);

        // Build sort query
        const sortQuery = buildSortQuery(req.query);

        let tours, total;

        if (needsDestinationFilter) {
            // Sử dụng aggregation để filter theo destination.type
            const mongoose = require('mongoose');
            
            // Chuyển đổi ObjectId cho aggregation
            const baseMatch = { ...searchQuery };
            if (baseMatch.category && typeof baseMatch.category === 'object' && baseMatch.category.$in) {
                baseMatch.category.$in = baseMatch.category.$in.map(id => 
                    typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
                );
            }

            const pipeline = [
                { $match: baseMatch },
                {
                    $lookup: {
                        from: 'destinations',
                        localField: 'destination',
                        foreignField: '_id',
                        as: 'destinationInfo'
                    }
                },
                {
                    $unwind: '$destinationInfo'
                },
                {
                    $match: {
                        'destinationInfo.type': destinationTypeFilter
                    }
                },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'category',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                {
                    $lookup: {
                        from: 'departures',
                        localField: 'departure',
                        foreignField: '_id',
                        as: 'departure'
                    }
                },
                {
                    $lookup: {
                        from: 'transportations',
                        localField: 'transportation',
                        foreignField: '_id',
                        as: 'transportation'
                    }
                },
                {
                    $unwind: { path: '$category', preserveNullAndEmptyArrays: true }
                },
                {
                    $unwind: { path: '$departure', preserveNullAndEmptyArrays: true }
                },
                {
                    $unwind: { path: '$transportation', preserveNullAndEmptyArrays: true }
                },
                {
                    $addFields: {
                        destination: '$destinationInfo'
                    }
                },
                { $sort: sortQuery },
                { $skip: skip },
                { $limit: limit }
            ];

            const countPipeline = [
                { $match: baseMatch },
                {
                    $lookup: {
                        from: 'destinations',
                        localField: 'destination',
                        foreignField: '_id',
                        as: 'destinationInfo'
                    }
                },
                {
                    $unwind: '$destinationInfo'
                },
                {
                    $match: {
                        'destinationInfo.type': destinationTypeFilter
                    }
                },
                { $count: "total" }
            ];

            const [toursResult, totalResult] = await Promise.all([
                Tour.aggregate(pipeline),
                Tour.aggregate(countPipeline)
            ]);

            tours = toursResult;
            total = totalResult.length > 0 ? totalResult[0].total : 0;
        } else {
            // Sử dụng query thông thường
            const [toursResult, totalResult] = await Promise.all([
                Tour.find(searchQuery)
                    .populate('category departure destination transportation createdBy updatedBy')
                    .skip(skip)
                    .limit(limit)
                    .sort(sortQuery),
                Tour.countDocuments(searchQuery),
            ]);

            tours = toursResult;
            total = totalResult;
        }

        // Load tour details for each tour and calculate pricing info (tương tự getAllTours)
        const toursWithPricing = await Promise.all(
            tours.map(async (tour) => {
                const tourDetails = await TourDetail.find({
                    tourId: tour._id,
                }).lean();

                const minAvail = calculateMinPrice(tourDetails);
                const maxAvail = calculateMaxPrice(tourDetails);
                const fallbackMin = calculateMinPriceAll(tourDetails);
                const fallbackMax = calculateMaxPriceAll(tourDetails);
                const minPrice = minAvail > 0 ? minAvail : fallbackMin;
                const maxPrice = maxAvail > 0 ? maxAvail : fallbackMax;

                // Calculate total bookings for this tour (chỉ tính confirmed và completed)
                const Order = require('../models/orderModel');
                const bookingCount = await Order.aggregate([
                    {
                        $match: {
                            status: { $in: ["confirmed", "completed"] },
                            "items.tourId": tour._id
                        }
                    },
                    {
                        $unwind: "$items"
                    },
                    {
                        $match: {
                            "items.tourId": tour._id
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalBookings: { $sum: "$items.quantity" }
                        }
                    }
                ]);

                const totalBookings = bookingCount.length > 0 ? bookingCount[0].totalBookings : 0;
                const tourObject = tour.toObject ? tour.toObject() : tour;

                // Calculate originalPrice and discountPrice (same logic as getAllTours)
                let bestDiscountPrice = Infinity;
                let bestOriginalPrice = 0;

                if (tourDetails && tourDetails.length > 0) {
                    tourDetails.forEach(detail => {
                        if (detail.discount > 0) {
                            const base = detail.adultPrice || 0;
                            const discounted = base * (1 - detail.discount / 100);
                            if (discounted < bestDiscountPrice) {
                                bestDiscountPrice = discounted;
                            }
                            if (base > bestOriginalPrice) {
                                bestOriginalPrice = base;
                            }
                        }
                    });
                }

                const discountPrice = (isFinite(bestDiscountPrice) && bestDiscountPrice > 0)
                    ? Math.round(bestDiscountPrice)
                    : (minPrice > 0 ? minPrice : (tour.price || 0));
                const originalPrice = (bestOriginalPrice > 0)
                    ? Math.round(bestOriginalPrice)
                    : (maxPrice > 0 ? maxPrice : discountPrice);
                const discountPercent = originalPrice > 0 && originalPrice > discountPrice
                    ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
                    : 0;
                const discountLabel = discountPercent > 0 ? `-${discountPercent}%` : null;

                return {
                    ...tourObject,
                    tourDetails,
                    totalBookings,
                    bookings: totalBookings,
                    price: discountPrice,
                    originalPrice,
                    discountPrice,
                    discountPercent,
                    discountLabel,
                    pricingInfo: {
                        basePrice: tour.price || 0,
                        minPrice: minPrice,
                        maxPrice: maxPrice,
                        priceRange: minPrice === maxPrice ?
                            `${minPrice.toLocaleString("vi-VN")} VNĐ` :
                            `${minPrice.toLocaleString("vi-VN")} - ${maxPrice.toLocaleString("vi-VN")} VNĐ`,
                        hasAvailableSlots: minAvail > 0,
                        calculatedAt: new Date()
                    }
                };
            })
        );

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: toursWithPricing,
            homeSection: {
                id: homeSection._id,
                title: homeSection.title,
                moreButtonTitle: homeSection.moreButtonTitle,
                moreButtonSubtitle: homeSection.moreButtonSubtitle,
                moreButtonSlug: homeSection.moreButtonSlug,
                filterQuery: homeSection.filterQuery,
                categories: homeSection.categories
            },
            pagination: {
                current: page,
                total: totalPages,
                limit,
                totalItems: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            appliedFilters: {
                baseQuery: searchQuery,
                destinationTypeFilter: destinationTypeFilter,
                needsDestinationFilter: needsDestinationFilter
            }
        });
    } catch (error) {
        console.error('Error in getToursByHomeSection:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách tour theo Home Section',
            error: error.message
        });
    }
};

// Lấy thông tin chi tiết tour theo ID API
exports.getTourById = async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id)
            .populate("category departure destination transportation createdBy updatedBy");

        if (!tour) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tour",
            });
        }

        // Lấy thông tin tour details với các ngày khởi hành cụ thể
        const TourDetail = require('../models/tourDetailModel');
        const tourDetails = await TourDetail.find({ tourId: tour._id })
            .sort({ dayStart: 1 })
            .lean();

        // Calculate total bookings for this tour (chỉ tính confirmed và completed)
        const Order = require('../models/orderModel');
        const bookingCount = await Order.aggregate([
            {
                $match: {
                    status: { $in: ["confirmed", "completed"] },
                    "items.tourId": tour._id
                }
            },
            {
                $unwind: "$items"
            },
            {
                $match: {
                    "items.tourId": tour._id
                }
            },
            {
                $group: {
                    _id: null,
                    totalBookings: { $sum: "$items.quantity" }
                }
            }
        ]);

        const totalBookings = bookingCount.length > 0 ? bookingCount[0].totalBookings : 0;

        //Tính toán thông tin giá (với dự phòng quản trị viên)
        const minAvail = calculateMinPrice(tourDetails);
        const maxAvail = calculateMaxPrice(tourDetails);
        const fallbackMin = calculateMinPriceAll(tourDetails);
        const fallbackMax = calculateMaxPriceAll(tourDetails);
        const minPrice = minAvail > 0 ? minAvail : fallbackMin;
        const maxPrice = maxAvail > 0 ? maxAvail : fallbackMax;

        // Tính original/discount dựa vào block giá có discounted thấp nhất cho tour chi tiết
        let bestDiscountPrice = Number.POSITIVE_INFINITY;
        let bestOriginalPrice = 0;
        if (Array.isArray(tourDetails) && tourDetails.length > 0) {
            tourDetails.forEach(detail => {
                const candidates = [detail.adultPrice || 0, detail.childrenPrice || 0, detail.childPrice || 0, detail.babyPrice || 0].filter(p => p > 0);
                if (candidates.length === 0) return;
                const base = (detail.adultPrice && detail.adultPrice > 0) ? detail.adultPrice : Math.min(...candidates);
                let final = base;
                if (detail.discount && detail.discount > 0) {
                    final = base - (base * detail.discount / 100);
                }
                if (final < bestDiscountPrice) {
                    bestDiscountPrice = final;
                    bestOriginalPrice = base;
                }
            });
        }
        const discountPrice = (isFinite(bestDiscountPrice) && bestDiscountPrice > 0)
            ? Math.round(bestDiscountPrice)
            : (minPrice > 0 ? minPrice : (tour.price || 0));
        const originalPrice = (bestOriginalPrice > 0)
            ? Math.round(bestOriginalPrice)
            : (maxPrice > 0 ? maxPrice : discountPrice);
        const discountPercent = originalPrice > 0 && originalPrice > discountPrice
            ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
            : 0;
        const discountLabel = discountPercent > 0 ? `-${discountPercent}%` : null;

        // Build schedule from itinerary
        const schedule = (tour.itinerary || []).map(item => ({
            day: item.day,
            title: item.title,
            content: decodeHtmlEntities(item.details || '')
        }));

        // Ensure overview structure with auto-fill pricing if needed
        let overview = safeObj(tour.overview);
        if (!overview.pricing || !overview.pricing.rows || overview.pricing.rows.length === 0) {
            // Auto-fill from TourDetail if available
            const pricingRows = [];
            if (tourDetails && tourDetails.length > 0) {
                tourDetails.forEach(detail => {
                    if (detail.dayStart && detail.adultPrice) {
                        const dateLabel = new Date(detail.dayStart).toLocaleDateString('vi-VN');
                        const priceText = vnd(detail.adultPrice);
                        pricingRows.push({ dateLabel, priceText });
                    }
                });
            }
            overview = {
                ...overview,
                pricing: {
                    yearTitle: overview.pricing?.yearTitle || `LỊCH KHỞI HÀNH ${new Date().getFullYear()}`,
                    rows: pricingRows,
                    noteHtml: overview.pricing?.noteHtml || ''
                }
            };
        }

        // Ensure all arrays are properly initialized
        const tourData = {
            ...tour.toObject(),
            tourDetails,
            minPrice,
            maxPrice,
            hasMultiplePrices: tourDetails.length > 1,
            priceRange: minPrice !== maxPrice
                ? `${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`
                : minPrice.toLocaleString(),
            // Giá hiển thị và trường bổ sung
            price: discountPrice,
            originalPrice,
            discountPrice,
            discountPercent,
            discountLabel,
            // New structured fields for FE
            schedule,
            overview: {
                introHtml: decodeHtmlEntities(overview.introHtml || ''),
                description: decodeHtmlEntities(overview.description || ''), 
                pricing: {
                    ...overview.pricing,
                    noteHtml: decodeHtmlEntities(overview.pricing?.noteHtml || '')
                } || { yearTitle: `LỊCH KHỞI HÀNH ${new Date().getFullYear()}`, rows: [], noteHtml: '' },
                promotions: safeArr(overview.promotions)
            },
            includes: {
                included: safeArr(tour.includes?.included),
                excluded: safeArr(tour.includes?.excluded),
                notes: {
                    important: safeArr(tour.includes?.notes?.important)
                }
            },
            highlights: safeArr(tour.highlights),
            bookings: totalBookings 
        };

        res.status(200).json({
            success: true,
            data: tourData,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải thông tin tour",
        });
    }
};

// Tạo tour mới qua API
exports.apiCreate = async (req, res) => {
    try {
        const {
            title,
            code,
            category,
            departure,
            destination,
            transportation,
            attractions,
            cuisine,
            suitableTime,
            suitableObject,
            vehicleInfo,
            promotion,
            itinerary,
            tourDetails,
        } = req.body;

        // Kiểm tra mã tour đã tồn tại
        if (code) {
            const existingTour = await Tour.findOne({
                code: code,
                deleted: false,
            });

            if (existingTour) {
                return res.status(400).json({
                    success: false,
                    message: "Mã tour đã tồn tại, vui lòng chọn mã khác",
                });
            }
        }

        let image = "";
        let images = [];

        if (req.files && req.files.length > 0) {
            images = req.files.map((file) => file.path);
            image = images[0];
        }

        // Process itinerary data with new fields
        const processedItinerary = buildScheduleFromReq(req.body);

        // Build new field structures
        const overview = buildOverviewFromReq(req.body);
        const includes = buildIncludesFromReq(req.body);
        const highlights = fromLines(sanitizeHtmlContent(req.body.highlights));

        // Determine start and end dates from tour details
        let startDate = null;
        let endDate = null;

        if (tourDetails && Array.isArray(tourDetails) && tourDetails.length > 0) {
            // Find earliest start date and latest end date
            const validDetails = tourDetails.filter(
                (detail) => detail.dayStart && detail.dayReturn
            );
            if (validDetails.length > 0) {
                const startDates = validDetails.map(
                    (detail) => new Date(detail.dayStart)
                );
                const endDates = validDetails.map(
                    (detail) => new Date(detail.dayReturn)
                );

                startDate = new Date(Math.min(...startDates));
                endDate = new Date(Math.max(...endDates));
            }
        }

        // Create tour
        const tourData = {
            title,
            code,
            category,
            departure,
            destination,
            transportation,
            attractions,
            cuisine,
            suitableTime,
            suitableObject,
            vehicleInfo,
            promotion,
            itinerary: processedItinerary,
            overview,
            includes,
            highlights,
            status: true,
            highlight: true,
            image,
            images,
            price: 0,
            startDate,
            endDate,
            createdBy: req.session?.user?.fullName || "System",
        };

        const tour = await Tour.create(tourData);

        // Create tour details (price blocks)
        let tourDetailsCreated = false;
        if (tourDetails && Array.isArray(tourDetails)) {
            try {
                const tourDetailPromises = tourDetails.map((detail) => {
                    return TourDetail.create({
                        tourId: tour._id,
                        adultPrice: parseFloat(detail.adultPrice) || 0,
                        childrenPrice: parseFloat(detail.childrenPrice) || 0,
                        childPrice: parseFloat(detail.childPrice) || 0,
                        babyPrice: parseFloat(detail.babyPrice) || 0,
                        singleRoomSupplementPrice: parseFloat(detail.singleRoomSupplementPrice) || 0,
                        discount: parseFloat(detail.discount) || 0,
                        stock: parseInt(detail.stock) || 0,
                        dayStart: new Date(detail.dayStart),
                        dayReturn: new Date(detail.dayReturn),
                    });
                });
                await Promise.all(tourDetailPromises);
                tourDetailsCreated = true;

                // Tính toán lại tổng giá sau khi tạo tour details
                try {
                    await recalculateAndUpdateTourPrice(tour._id);
                } catch (priceError) {
                    // Failed to recalculate tour price - continue anyway
                }
            } catch (detailError) {
                // Failed to create tour details - continue anyway
            }
        }

        return res.status(201).json({
            success: true,
            message: "Thêm tour thành công!",
            tour: {
                id: tour._id,
                title: tour.title,
                code: tour.code,
                status: tour.status,
                highlight: tour.highlight,
                images: tour.images,
                createdAt: tour.createdAt,
                hasDetails: tourDetailsCreated,
            },
        });
    } catch (error) {
        
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map((err) => err.message);
            return res.status(400).json({
                success: false,
                message: `Lỗi xác thực: ${errors.join(", ")}`,
            });
        } else if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Mã tour đã tồn tại, vui lòng chọn mã khác!",
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Có lỗi xảy ra khi thêm tour: " + error.message,
            });
        }
    }
};

// Cập nhật tour qua API
exports.apiUpdate = async (req, res) => {
    try {
        const {
            title,
            code,
            category,
            departure,
            destination,
            transportation,
            attractions,
            cuisine,
            suitableTime,
            suitableObject,
            vehicleInfo,
            promotion,
            itinerary,
            tourDetails,
            status,
            highlight,
        } = req.body;

        // Kiểm tra mã tour đã tồn tại (ngoại trừ tour hiện tại)
        if (code) {
            const existingTour = await Tour.findOne({
                code: code,
                deleted: false,
                _id: { $ne: req.params.id }, // Loại trừ tour hiện tại
            });

            if (existingTour) {
                return res.status(400).json({
                    success: false,
                    message: "Mã tour đã tồn tại, vui lòng chọn mã khác",
                });
            }
        }

        // Get current tour
        const currentTour = await Tour.findById(req.params.id);
        if (!currentTour) {
            return res.status(404).json({
                success: false,
                message: "Tour không tồn tại!",
            });
        }

        let updateData = {
            title,
            code,
            category,
            departure,
            destination,
            transportation,
            attractions,
            cuisine,
            suitableTime,
            suitableObject,
            vehicleInfo,
            promotion,
            status: status !== undefined ? status : currentTour.status,
            highlight: highlight !== undefined ? highlight : currentTour.highlight,
            updatedBy: req.session?.user?.fullName || "System",
        };

        // Process itinerary data with new fields
        updateData.itinerary = buildScheduleFromReq(req.body);

        // Build new field structures
        updateData.overview = buildOverviewFromReq(req.body);
        updateData.includes = buildIncludesFromReq(req.body);
        updateData.highlights = fromLines(sanitizeHtmlContent(req.body.highlights));

        // Determine start and end dates from tour details
        if (tourDetails && Array.isArray(tourDetails) && tourDetails.length > 0) {
            // Find earliest start date and latest end date
            const validDetails = tourDetails.filter(
                (detail) => detail.dayStart && detail.dayReturn
            );
            if (validDetails.length > 0) {
                const startDates = validDetails.map(
                    (detail) => new Date(detail.dayStart)
                );
                const endDates = validDetails.map(
                    (detail) => new Date(detail.dayReturn)
                );

                updateData.startDate = new Date(Math.min(...startDates));
                updateData.endDate = new Date(Math.max(...endDates));
            }
        }

        // Handle multiple images
        if (req.files && req.files.length > 0) {
            updateData.images = req.files.map((file) => file.path);
            updateData.image = updateData.images[0]; // Set first image as main image
        }

        // Update tour
        const updatedTour = await Tour.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        // Delete existing tour details and create new ones
        let tourDetailsUpdated = false;
        try {
            await TourDetail.deleteMany({ tourId: req.params.id });

            if (tourDetails && Array.isArray(tourDetails)) {
                const tourDetailPromises = tourDetails.map((detail) => {
                    return TourDetail.create({
                        tourId: req.params.id,
                        adultPrice: parseFloat(detail.adultPrice) || 0,
                        childrenPrice: parseFloat(detail.childrenPrice) || 0,
                        childPrice: parseFloat(detail.childPrice) || 0,
                        babyPrice: parseFloat(detail.babyPrice) || 0,
                        singleRoomSupplementPrice: parseFloat(detail.singleRoomSupplementPrice) || 0,
                        discount: parseFloat(detail.discount) || 0,
                        stock: parseInt(detail.stock) || 0,
                        dayStart: new Date(detail.dayStart),
                        dayReturn: new Date(detail.dayReturn),
                    });
                });
                await Promise.all(tourDetailPromises);
                tourDetailsUpdated = true;

                // Tính toán lại tổng giá sau khi cập nhật tour details
                try {
                    await recalculateAndUpdateTourPrice(req.params.id);
                } catch (priceError) {
                    // Failed to recalculate tour price - continue anyway
                }
            }
        } catch (detailError) {
            // Failed to update tour details - continue anyway
        }

        return res.status(200).json({
            success: true,
            message: "Cập nhật tour thành công!",
            tour: {
                id: updatedTour._id,
                title: updatedTour.title,
                code: updatedTour.code,
                status: updatedTour.status,
                highlight: updatedTour.highlight,
                images: updatedTour.images,
                updatedAt: updatedTour.updatedAt,
                hasDetails: tourDetailsUpdated,
            },
        });
    } catch (error) {
        
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map((err) => err.message);
            return res.status(400).json({
                success: false,
                message: `Lỗi xác thực: ${errors.join(", ")}`,
            });
        } else if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Mã tour đã tồn tại, vui lòng chọn mã khác!",
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Có lỗi xảy ra khi cập nhật tour: " + error.message,
            });
        }
    }
};

// Xóa tour qua API
exports.apiDelete = async (req, res) => {
    try {
        const deletedTour = await Tour.findByIdAndUpdate(
            req.params.id,
            { deleted: true, deletedBy: req.session?.user?._id },
            { new: true }
        );

        if (!deletedTour) {
            return res.status(404).json({
                success: false,
                message: "Tour không tồn tại!",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Xóa tour thành công!",
            tour: {
                id: deletedTour._id,
                title: deletedTour.title,
                deleted: deletedTour.deleted,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa tour!",
        });
    }
};

exports.recalculateAllPrices = async (req, res) => {
    try {
        const result = await recalculateAllTourPrices();
        res.status(200).json({
            success: true,
            message: 'Tính lại giá thành công',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tính lại giá tours',
            error: error.message
        });
    }
};

exports.recalculateTourPrice = async (req, res) => {
    try {
        const { id } = req.params;
        
        const tour = await Tour.findById(id);
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tour'
            });
        }
        
        const result = await recalculateAndUpdateTourPrice(id);
        
        res.status(200).json({
            success: true,
            message: 'Tính lại giá thành công',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tính lại giá tour',
            error: error.message
        });
    }
};

// Lấy danh sách tour theo slug danh mục (Public API)
exports.getToursBySlug = async (req, res) => {
    try {
        const rawSlug = req.params.slug || "";

        // Chuẩn hóa slug để hỗ trợ các link legacy kiểu 502-du-lich-bien.html
        let normalized = rawSlug
            .toString()
            .trim()
            .toLowerCase()
            .replace(/\.html$/i, "") // bỏ đuôi .html
            .replace(/^category-/, "") // bỏ prefix không cần thiết nếu có
            .replace(/^\d+-/, ""); // bỏ tiền tố số nếu có

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Function để tạo slug giống frontend
        const createFrontendSlug = (title) => {
            return title
                .toLowerCase()
                .trim()
                .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
                .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
                .replace(/[ìíịỉĩ]/g, 'i')
                .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
                .replace(/[ùúụủũưừứựửữ]/g, 'u')
                .replace(/[ỳýỵỷỹ]/g, 'y')
                .replace(/đ/g, 'd')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
        };

        // Đầu tiên, thử tìm HomeSection với moreButtonSlug
        const HomeSection = require("../models/homeSectionModel");
        let homeSection = await HomeSection.findOne({
            moreButtonSlug: normalized,
            isActive: true
        }).populate('categories');

        // Nếu không tìm thấy, thử tìm HomeSection bằng cách tạo slug từ title
        if (!homeSection) {
            const allHomeSections = await HomeSection.find({ isActive: true }).select('title moreButtonTitle');

            for (const section of allHomeSections) {
                const frontendSlug = createFrontendSlug(section.title);
                const frontendSlugFromMoreButton = section.moreButtonTitle ? createFrontendSlug(section.moreButtonTitle) : null;

                if (frontendSlug === normalized || frontendSlugFromMoreButton === normalized) {
                    homeSection = await HomeSection.findById(section._id).populate('categories');
                    break;
                }
            }
        }

        let category = null;
        let categoryInfo = null;
        let isFromHomeSection = false;

        if (homeSection) {
            isFromHomeSection = true;

            // Nếu tìm thấy HomeSection, sử dụng filterQuery để lọc tours
            if (homeSection.categories && homeSection.categories.length > 0) {
                category = homeSection.categories[0]; // Lấy category đầu tiên
                categoryInfo = {
                    id: category._id,
                    name: homeSection.moreButtonTitle || homeSection.title,
                    slug: homeSection.moreButtonSlug,
                    fullSlug: homeSection.moreButtonSlug,
                    pageTitle: homeSection.moreButtonTitle || homeSection.title,
                    pageSubtitle: homeSection.moreButtonSubtitle || "",
                    homeSection: homeSection
                };
            } else {
                // Nếu HomeSection không có categories, vẫn có thể filter theo filterQuery
                categoryInfo = {
                    id: null,
                    name: homeSection.moreButtonTitle || homeSection.title,
                    slug: homeSection.moreButtonSlug,
                    fullSlug: homeSection.moreButtonSlug,
                    pageTitle: homeSection.moreButtonTitle || homeSection.title,
                    pageSubtitle: homeSection.moreButtonSubtitle || "",
                    homeSection: homeSection
                };
            }
        } else {
            // Nếu không tìm thấy HomeSection, tìm category theo slug hoặc fullSlug
            category = await Category.findOne({ $or: [{ slug: normalized }, { fullSlug: normalized }] });

            if (!category) {
                // Nếu không có timestamp phía sau, thử tìm theo tiền tố slug-
                // Ví dụ: 'du-lich-bien' sẽ match 'du-lich-bien-1733700000000'
                const baseSlug = normalized
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9\s-]/g, "")
                    .replace(/\s+/g, "-")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$|/g, "");
                const regex = new RegExp(`^${baseSlug}-\\d+$`, "i");
                category = await Category.findOne({ slug: regex });
            }

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy danh mục hoặc section",
                });
            }

            categoryInfo = {
                id: category._id,
                name: category.name,
                slug: category.slug,
                fullSlug: category.fullSlug,
                pageTitle: category.pageTitle,
                pageSubtitle: category.pageSubtitle
            };
        }

        // Xây dựng filter từ query string và HomeSection filterQuery
        let searchQuery = { deleted: false, status: true };

        // Nếu có category, filter theo category
        if (category && category._id) {
            searchQuery.category = category._id;
        }

        // Nếu là từ HomeSection, áp dụng filterQuery và categories
        if (isFromHomeSection) {
            // Import filter utilities để sử dụng logic tương tự getToursByHomeSection
            const {
                mergeFilters,
                mergeCategoriesFilter
            } = require('../utils/filterUtils');

            // Áp dụng categories từ HomeSection TRƯỚC (QUAN TRỌNG!)
            if (homeSection.categories && homeSection.categories.length > 0) {
                searchQuery = mergeCategoriesFilter(homeSection.categories, searchQuery);
            }

            // Áp dụng filterQuery từ HomeSection (trừ các field cần aggregation)
            if (homeSection.filterQuery && Object.keys(homeSection.filterQuery).length > 0) {
                const filterQueryCopy = { ...homeSection.filterQuery };
                // Loại bỏ các field cần aggregation
                delete filterQueryCopy.country;
                delete filterQueryCopy.domestic;
                delete filterQueryCopy.scope;
                delete filterQueryCopy.region;

                if (Object.keys(filterQueryCopy).length > 0) {
                    searchQuery = { ...searchQuery, ...mergeFilters(filterQueryCopy, req.query) };
                }
            }
        }

        // Lọc theo departure
        if (req.query.departure) searchQuery.departure = req.query.departure;

        // Lọc theo destination - hỗ trợ multiple destinations
        if (req.query.destination) {
            try {
                const mongoose = require('mongoose');
                const destinationId = req.query.destination;

                // Kiểm tra nếu destinationId là chuỗi chứa nhiều ID phân tách bằng dấu phẩy
                if (typeof destinationId === 'string' && destinationId.includes(',')) {
                    const destinationIds = destinationId.split(',').map(id => id.trim()).filter(id => id);
                    const validDestinationIds = [];

                    // Kiểm tra từng destination ID
                    for (const id of destinationIds) {
                        if (mongoose.Types.ObjectId.isValid(id)) {
                            const destination = await Destination.findById(id);
                            if (destination && destination.status === 'Hoạt động') {
                                validDestinationIds.push(id);
                            }
                        }
                    }

                    if (validDestinationIds.length > 0) {
                        searchQuery.destination = { $in: validDestinationIds };
                    }
                } else {
                    // Xử lý single destination ID như trước
                    if (mongoose.Types.ObjectId.isValid(destinationId)) {
                        const destination = await Destination.findById(destinationId);
                        if (destination && destination.status === 'Hoạt động') {
                            searchQuery.destination = destinationId;
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing destination ID in getToursBySlug:', error);
            }
        }

        // Lọc theo price range
        if (req.query.minPrice || req.query.maxPrice) {
            searchQuery.price = {};
            if (req.query.minPrice) {
                const minPrice = parseInt(req.query.minPrice);
                if (!isNaN(minPrice)) searchQuery.price.$gte = minPrice;
            }
            if (req.query.maxPrice) {
                const maxPrice = parseInt(req.query.maxPrice);
                if (!isNaN(maxPrice)) searchQuery.price.$lte = maxPrice;
            }
        }

        // Kiểm tra xem có cần aggregation không
        let needsAggregation = false;
        let needsDestinationFilter = false;
        let destinationFilters = {};

        // Kiểm tra HomeSection filters cần aggregation
        if (isFromHomeSection && homeSection.filterQuery) {
            const filters = homeSection.filterQuery;

            if (filters.domestic !== undefined || filters.scope || filters.country || filters.region) {
                needsAggregation = true;
                needsDestinationFilter = true;
                destinationFilters = { ...filters };
            }
        }

        // Kiểm tra query parameters cần aggregation
        if (req.query.sortBy === "DURATION_ASC" || req.query.sortBy === "DURATION_DESC" || req.query.duration) {
            needsAggregation = true;
        }

        // Kiểm tra destinationType filter - cần aggregation để join với destinations
        if (req.query.destinationType) {
            needsAggregation = true;
            needsDestinationFilter = true;
            destinationFilters.destinationType = req.query.destinationType;
        }

        // Sort mặc định
        let sortQuery = { createdAt: -1 };
        if (req.query.sortBy) {
            switch (req.query.sortBy) {
                case "PRICE_ASC":
                    sortQuery = { price: 1 };
                    break;
                case "PRICE_DESC":
                    sortQuery = { price: -1 };
                    break;
                case "DURATION_ASC":
                case "DURATION_DESC":
                    // Đã được xử lý ở trên
                    break;
                default:
                    sortQuery = { createdAt: -1 };
            }
        }



        let tours = [], total = 0;

        if (needsAggregation || req.query.duration) {
            // Aggregation để tính duration và filter destination
            const mongoose = require("mongoose");
            const baseMatch = { ...searchQuery };

            // Chỉ thêm category filter nếu có category (từ URL slug)
            if (category && category._id) {
                baseMatch.category = new mongoose.Types.ObjectId(category._id);
            }

            // Đảm bảo category filter từ HomeSection được áp dụng
            if (searchQuery.category && searchQuery.category.$in) {
                baseMatch.category = {
                    $in: searchQuery.category.$in.map(id => new mongoose.Types.ObjectId(id))
                };
            }

            const pipeline = [
                { $match: baseMatch }
            ];

            // Thêm lookup destination nếu cần filter theo destination
            if (needsDestinationFilter) {
                pipeline.push({
                    $lookup: {
                        from: 'destinations',
                        localField: 'destination',
                        foreignField: '_id',
                        as: 'destinationInfo'
                    }
                });
                pipeline.push({
                    $unwind: '$destinationInfo'
                });

                // Áp dụng destination filters
                const destinationMatch = {};

                if (destinationFilters.domestic !== undefined) {
                    if (destinationFilters.domestic) {
                        destinationMatch.$or = [
                            { 'destinationInfo.type': { $regex: 'trong.*nước', $options: 'i' } },
                            { 'destinationInfo.country': { $regex: 'việt.*nam', $options: 'i' } }
                        ];
                    } else {
                        destinationMatch.$and = [
                            { 'destinationInfo.type': { $not: { $regex: 'trong.*nước', $options: 'i' } } },
                            { 'destinationInfo.country': { $not: { $regex: 'việt.*nam', $options: 'i' } } }
                        ];
                    }
                }

                if (destinationFilters.scope) {
                    if (destinationFilters.scope === 'trong-nuoc') {
                        destinationMatch.$or = [
                            { 'destinationInfo.type': { $regex: 'trong.*nước', $options: 'i' } },
                            { 'destinationInfo.country': { $regex: 'việt.*nam', $options: 'i' } }
                        ];
                    } else if (destinationFilters.scope === 'nuoc-ngoai') {
                        destinationMatch['destinationInfo.type'] = { $regex: 'nước.*ngoài', $options: 'i' };
                    }
                }

                if (destinationFilters.country) {
                    const countryValue = Array.isArray(destinationFilters.country) ? destinationFilters.country : [destinationFilters.country];

                    if (countryValue.includes('nuoc-ngoai')) {
                        destinationMatch.$or = [
                            { 'destinationInfo.type': { $regex: 'nước.*ngoài', $options: 'i' } },
                            { 'destinationInfo.type': { $regex: 'quốc.*tế', $options: 'i' } },
                            { 'destinationInfo.country': { $not: { $regex: 'việt.*nam', $options: 'i' } } }
                        ];
                    } else {
                        // Xử lý các country khác
                        destinationMatch['destinationInfo.country'] = { $in: countryValue };
                    }
                }

                if (destinationFilters.region) {
                    destinationMatch['destinationInfo.region'] = { $regex: destinationFilters.region, $options: 'i' };
                }

                // Xử lý destinationType từ query parameter (cho seasonal tours)
                if (destinationFilters.destinationType) {
                    // Exact match cho destinationType vì giá trị trong DB là "Trong nước" và "Nước ngoài"
                    destinationMatch['destinationInfo.type'] = destinationFilters.destinationType;
                }

                if (Object.keys(destinationMatch).length > 0) {
                    pipeline.push({ $match: destinationMatch });
                }
            }

            // Thêm calculated duration
            pipeline.push({
                $addFields: {
                    calculatedDuration: {
                        $cond: {
                            if: { $and: [{ $ne: ["$startDate", null] }, { $ne: ["$endDate", null] }] },
                            then: {
                                $add: [
                                    {
                                        $ceil: {
                                            $divide: [
                                                { $subtract: ["$endDate", "$startDate"] },
                                                1000 * 60 * 60 * 24,
                                            ],
                                        },
                                    },
                                    1,
                                ],
                            },
                            else: 0,
                        },
                    },
                },
            });

            if (req.query.duration) {
                const duration = parseInt(req.query.duration);
                if (!isNaN(duration)) {
                    pipeline.push({ $match: { calculatedDuration: duration } });
                }
            }

            if (req.query.sortBy === "DURATION_ASC") {
                pipeline.push({ $sort: { calculatedDuration: 1 } });
            } else if (req.query.sortBy === "DURATION_DESC") {
                pipeline.push({ $sort: { calculatedDuration: -1 } });
            } else {
                pipeline.push({ $sort: sortQuery });
            }

            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: limit });

            // Populate tương tự (tránh duplicate destination lookup)
            if (!needsDestinationFilter) {
                pipeline.push({ $lookup: { from: "destinations", localField: "destination", foreignField: "_id", as: "destination" } });
                pipeline.push({ $unwind: { path: "$destination", preserveNullAndEmptyArrays: true } });
            } else {
                // Đã có destinationInfo từ lookup trước đó, rename thành destination
                pipeline.push({
                    $addFields: {
                        destination: "$destinationInfo"
                    }
                });
            }

            pipeline.push(
                { $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
                { $lookup: { from: "departures", localField: "departure", foreignField: "_id", as: "departure" } },
                { $lookup: { from: "transportations", localField: "transportation", foreignField: "_id", as: "transportation" } },
                { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$departure", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$transportation", preserveNullAndEmptyArrays: true } }
            );

            // Tạo count pipeline tương tự nhưng không có skip/limit/sort
            let countPipeline = [];
            if (needsDestinationFilter) {
                // Sử dụng aggregation để count với destination filter
                countPipeline = [
                    { $match: baseMatch },
                    {
                        $lookup: {
                            from: 'destinations',
                            localField: 'destination',
                            foreignField: '_id',
                            as: 'destinationInfo'
                        }
                    },
                    { $unwind: '$destinationInfo' }
                ];

                // Áp dụng destination filters cho count
                const destinationMatch = {};

                if (destinationFilters.domestic !== undefined) {
                    if (destinationFilters.domestic) {
                        destinationMatch.$or = [
                            { 'destinationInfo.type': { $regex: 'trong.*nước', $options: 'i' } },
                            { 'destinationInfo.country': { $regex: 'việt.*nam', $options: 'i' } }
                        ];
                    } else {
                        destinationMatch.$and = [
                            { 'destinationInfo.type': { $not: { $regex: 'trong.*nước', $options: 'i' } } },
                            { 'destinationInfo.country': { $not: { $regex: 'việt.*nam', $options: 'i' } } }
                        ];
                    }
                }

                if (destinationFilters.scope) {
                    if (destinationFilters.scope === 'trong-nuoc') {
                        destinationMatch.$or = [
                            { 'destinationInfo.type': { $regex: 'trong.*nước', $options: 'i' } },
                            { 'destinationInfo.country': { $regex: 'việt.*nam', $options: 'i' } }
                        ];
                    } else if (destinationFilters.scope === 'nuoc-ngoai') {
                        destinationMatch['destinationInfo.type'] = { $regex: 'nước.*ngoài', $options: 'i' };
                    }
                }

                if (destinationFilters.country) {
                    const countryValue = Array.isArray(destinationFilters.country) ? destinationFilters.country : [destinationFilters.country];

                    if (countryValue.includes('nuoc-ngoai')) {
                        destinationMatch.$or = [
                            { 'destinationInfo.type': { $regex: 'nước.*ngoài', $options: 'i' } },
                            { 'destinationInfo.type': { $regex: 'quốc.*tế', $options: 'i' } },
                            { 'destinationInfo.country': { $not: { $regex: 'việt.*nam', $options: 'i' } } }
                        ];
                    } else {
                        destinationMatch['destinationInfo.country'] = { $in: countryValue };
                    }
                }

                if (destinationFilters.region) {
                    destinationMatch['destinationInfo.region'] = { $regex: destinationFilters.region, $options: 'i' };
                }

                // Xử lý destinationType từ query parameter (cho seasonal tours) - count pipeline
                if (destinationFilters.destinationType) {
                    // Exact match cho destinationType vì giá trị trong DB là "Trong nước" và "Nước ngoài"
                    destinationMatch['destinationInfo.type'] = destinationFilters.destinationType;
                }

                if (Object.keys(destinationMatch).length > 0) {
                    countPipeline.push({ $match: destinationMatch });
                }

                countPipeline.push({ $count: "total" });
            }

            const [toursResult, totalResult] = await Promise.all([
                Tour.aggregate(pipeline),
                needsDestinationFilter ?
                    Tour.aggregate(countPipeline).then(result => result.length > 0 ? result[0].total : 0) :
                    Tour.countDocuments(searchQuery)
            ]);
            tours = toursResult;
            total = totalResult;
        } else {
            // Simple query without aggregation
            const [toursResult, totalResult] = await Promise.all([
                Tour.find(searchQuery)
                    .populate("category departure destination transportation createdBy updatedBy")
                    .skip(skip)
                    .limit(limit)
                    .sort(sortQuery),
                Tour.countDocuments(searchQuery),
            ]);
            tours = toursResult;
            total = totalResult;
        }

        // Tính min/max price
        const toursWithPricing = await Promise.all(
            tours.map(async (tour) => {
                const tourDetails = await TourDetail.find({ tourId: tour._id }).lean();
                const minAvail = calculateMinPrice(tourDetails);
                const maxAvail = calculateMaxPrice(tourDetails);
                const fallbackMin = calculateMinPriceAll(tourDetails);
                const fallbackMax = calculateMaxPriceAll(tourDetails);
                const minPrice = minAvail > 0 ? minAvail : fallbackMin;
                const maxPrice = maxAvail > 0 ? maxAvail : fallbackMax;

                // Calculate total bookings for this tour (chỉ tính confirmed và completed)
                const Order = require('../models/orderModel');
                const bookingCount = await Order.aggregate([
                    {
                        $match: {
                            status: { $in: ["confirmed", "completed"] },
                            "items.tourId": tour._id
                        }
                    },
                    {
                        $unwind: "$items"
                    },
                    {
                        $match: {
                            "items.tourId": tour._id
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalBookings: { $sum: "$items.quantity" }
                        }
                    }
                ]);

                const totalBookings = bookingCount.length > 0 ? bookingCount[0].totalBookings : 0;
                const tourObject = tour.toObject ? tour.toObject() : tour;
                // Tính original/discount dựa vào block giá có discounted thấp nhất
                let bestDiscountPrice = Number.POSITIVE_INFINITY;
                let bestOriginalPrice = 0;
                if (Array.isArray(tourDetails) && tourDetails.length > 0) {
                    tourDetails.forEach(detail => {
                        const candidates = [detail.adultPrice || 0, detail.childrenPrice || 0, detail.childPrice || 0, detail.babyPrice || 0].filter(p => p > 0);
                        if (candidates.length === 0) return;
                        const base = (detail.adultPrice && detail.adultPrice > 0) ? detail.adultPrice : Math.min(...candidates);
                        let final = base;
                        if (detail.discount && detail.discount > 0) {
                            final = base - (base * detail.discount / 100);
                        }
                        if (final < bestDiscountPrice) {
                            bestDiscountPrice = final;
                            bestOriginalPrice = base;
                        }
                    });
                }
                const discountPrice = (isFinite(bestDiscountPrice) && bestDiscountPrice > 0)
                    ? Math.round(bestDiscountPrice)
                    : (minPrice > 0 ? minPrice : (tour.price || 0));
                const originalPrice = (bestOriginalPrice > 0)
                    ? Math.round(bestOriginalPrice)
                    : (maxPrice > 0 ? maxPrice : discountPrice);
                const discountPercent = originalPrice > 0 && originalPrice > discountPrice
                    ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
                    : 0;
                const discountLabel = discountPercent > 0 ? `-${discountPercent}%` : null;
                return {
                    ...tourObject,
                    tourDetails,
                    minPrice,
                    maxPrice,
                    hasMultiplePrices: tourDetails.length > 1,
                    priceRange: minPrice !== maxPrice ? `${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}` : minPrice.toLocaleString(),
                    price: discountPrice,
                    totalPrice: discountPrice > 0 ? discountPrice : tour.totalPrice,
                    originalPrice,
                    discountPrice,
                    discountPercent,
                    discountLabel,
                    calculatedDuration: tour.calculatedDuration,
                    bookings: totalBookings, // Thêm thông tin số lượng đặt chỗ
                };
            })
        );

        const totalPages = Math.ceil(total / limit);


        return res.status(200).json({
            success: true,
            tours: toursWithPricing,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit),
            categoryInfo,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                limit: parseInt(limit),
                totalItems: total,
                hasNext: parseInt(page) < Math.ceil(total / limit),
                hasPrev: parseInt(page) > 1,
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi khi tải danh sách tours theo slug",
            error: error.message,
        });
    }
};

// API lấy giá tour theo ngày cụ thể
exports.getTourPricingByDate = async (req, res) => {
    try {
        const { id, date } = req.params;

        // Validate tour ID
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "ID tour không hợp lệ"
            });
        }

        // Validate date format and value
        const selectedDate = new Date(date);
        if (isNaN(selectedDate.getTime()) || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return res.status(400).json({
                success: false,
                message: "Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD"
            });
        }

        // Check if date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            return res.status(400).json({
                success: false,
                message: "Không thể chọn ngày trong quá khứ"
            });
        }

        // Tìm tour
        const tour = await Tour.findById(id);
        if (!tour || tour.deleted) {
            return res.status(404).json({
                success: false,
                message: "Tour không tồn tại"
            });
        }

        // Lấy tất cả tour details của tour này
        const tourDetails = await TourDetail.find({ tourId: id }).lean();

        if (!tourDetails || tourDetails.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Tour chưa có lịch trình chi tiết"
            });
        }

        // Kiểm tra xem tất cả tour details có cùng giá không
        const firstDetail = tourDetails[0];
        const allSamePrice = tourDetails.every(detail =>
            detail.adultPrice === firstDetail.adultPrice &&
            detail.childrenPrice === firstDetail.childrenPrice &&
            detail.childPrice === firstDetail.childPrice &&
            detail.babyPrice === firstDetail.babyPrice &&
            detail.singleRoomSupplementPrice === firstDetail.singleRoomSupplementPrice &&
            detail.discount === firstDetail.discount
        );

        // Nếu tất cả cùng giá, trả về giá chung
        if (allSamePrice) {
            return res.status(200).json({
                success: true,
                message: "Giá tour cố định cho tất cả ngày",
                data: {
                    tourId: id,
                    selectedDate: date,
                    hasFixedPrice: true,
                    pricing: {
                        adultPrice: firstDetail.adultPrice,
                        childrenPrice: firstDetail.childrenPrice,
                        childPrice: firstDetail.childPrice,
                        babyPrice: firstDetail.babyPrice,
                        singleRoomSupplementPrice: firstDetail.singleRoomSupplementPrice,
                        discount: firstDetail.discount,
                        // Tính giá sau giảm giá
                        finalAdultPrice: Math.round(firstDetail.adultPrice * (100 - firstDetail.discount) / 100),
                        finalChildrenPrice: firstDetail.childrenPrice > 0 ? Math.round(firstDetail.childrenPrice * (100 - firstDetail.discount) / 100) : 0,
                        finalChildPrice: firstDetail.childPrice > 0 ? Math.round(firstDetail.childPrice * (100 - firstDetail.discount) / 100) : 0,
                        finalBabyPrice: firstDetail.babyPrice > 0 ? Math.round(firstDetail.babyPrice * (100 - firstDetail.discount) / 100) : 0
                    },
                    availableStock: firstDetail.stock,
                    dayStart: firstDetail.dayStart,
                    dayReturn: firstDetail.dayReturn
                }
            });
        }

        // Nếu giá khác nhau, tìm tour detail cho ngày cụ thể
        const targetDetail = tourDetails.find(detail => {
            const detailDate = new Date(detail.dayStart);
            const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            const detailDateOnly = new Date(detailDate.getFullYear(), detailDate.getMonth(), detailDate.getDate());
            return detailDateOnly.getTime() === selectedDateOnly.getTime();
        });

        if (!targetDetail) {
            // Nếu không tìm thấy ngày cụ thể, trả về giá mặc định (giá thấp nhất)
            const { calculateMinPrice } = require("../utils/priceCalculator");
            const minPrice = calculateMinPrice(tourDetails);

            return res.status(200).json({
                success: true,
                message: "Không tìm thấy lịch trình cho ngày này, hiển thị giá mặc định",
                data: {
                    tourId: id,
                    selectedDate: date,
                    hasFixedPrice: false,
                    hasSpecificDate: false,
                    pricing: {
                        minPrice: minPrice,
                        message: "Vui lòng chọn ngày khởi hành có sẵn"
                    }
                }
            });
        }

        // Trả về giá cho ngày cụ thể
        return res.status(200).json({
            success: true,
            message: "Giá tour cho ngày được chọn",
            data: {
                tourId: id,
                selectedDate: date,
                hasFixedPrice: false,
                hasSpecificDate: true,
                pricing: {
                    adultPrice: targetDetail.adultPrice,
                    childrenPrice: targetDetail.childrenPrice,
                    childPrice: targetDetail.childPrice,
                    babyPrice: targetDetail.babyPrice,
                    singleRoomSupplementPrice: targetDetail.singleRoomSupplementPrice,
                    discount: targetDetail.discount,
                    // Tính giá sau giảm giá
                    finalAdultPrice: Math.round(targetDetail.adultPrice * (100 - targetDetail.discount) / 100),
                    finalChildrenPrice: targetDetail.childrenPrice > 0 ? Math.round(targetDetail.childrenPrice * (100 - targetDetail.discount) / 100) : 0,
                    finalChildPrice: targetDetail.childPrice > 0 ? Math.round(targetDetail.childPrice * (100 - targetDetail.discount) / 100) : 0,
                    finalBabyPrice: targetDetail.babyPrice > 0 ? Math.round(targetDetail.babyPrice * (100 - targetDetail.discount) / 100) : 0
                },
                availableStock: targetDetail.stock,
                dayStart: targetDetail.dayStart,
                dayReturn: targetDetail.dayReturn,
                tourDetailId: targetDetail._id
            }
        });

    } catch (error) {
        console.error('Error getting tour pricing by date:', error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy giá tour theo ngày",
            error: error.message
        });
    }
};
