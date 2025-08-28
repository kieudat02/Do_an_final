const HomeSection = require("../models/homeSectionModel");
const Category = require("../models/categoriesModel");

// Hiển thị danh sách (có phân trang)
exports.list = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = {};
        if (search) {
            searchQuery.$or = [
                { title: { $regex: search, $options: "i" } }
            ];
        }

        const [homeSections, total] = await Promise.all([
            HomeSection.find(searchQuery)
                .populate('categories', 'name slug')
                .populate('createdBy', 'fullName')
                .populate('updatedBy', 'fullName')
                .skip(skip)
                .limit(limit)
                .sort({ order: 1, createdAt: 1 }), 
            HomeSection.countDocuments(searchQuery),
        ]);

        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.render("homeSection", {
            homeSections,
            currentPage: page,
            totalPages,
            hasNextPage,
            hasPrevPage,
            limit,
            total,
            search,
            message: req.flash("success"),
            error: req.flash("error"),
        });
    } catch (error) {
        console.error("Error loading home sections:", error);
        req.flash("error", "Lỗi khi tải danh sách home section");
        res.redirect("/dashboard");
    }
};

// Hiển thị form thêm mới
exports.showAddForm = async (req, res) => {
    try {
        // Lấy danh sách categories để hiển thị trong dropdown
        const categories = await Category.find({ status: "Hoạt động" }).sort({ name: 1 });

        res.render("homeSection/add", {
            categories,
            message: req.flash("success"),
            error: req.flash("error"),
        });
    } catch (error) {
        console.error("Error loading add form:", error);
        req.flash("error", "Lỗi khi tải form thêm mới");
        res.redirect("/homeSection");
    }
};

// Xử lý thêm mới
exports.create = async (req, res) => {
    try {
        const { 
            title, 
            order, 
            isActive, 
            categories, 
            moreButtonTitle, 
            moreButtonSubtitle, 
            filterQuery 
        } = req.body;

        // Check if it's an AJAX request
        const isAjax =
            req.headers["x-requested-with"] === "XMLHttpRequest" ||
            req.headers.accept?.includes("application/json");

        // Validate input
        if (!title || !title.trim()) {
            const errorMessage = "Tiêu đề section không được để trống";

            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage,
                });
            }
            req.flash("error", errorMessage);
            return res.redirect("/homeSection/add");
        }

        // Validate title length
        if (title.trim().length < 2) {
            const errorMessage = "Tiêu đề section phải có ít nhất 2 ký tự";

            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage,
                });
            }
            req.flash("error", errorMessage);
            return res.redirect("/homeSection/add");
        }

        // Xử lý categories array
        let categoriesArray = [];
        if (categories) {
            if (Array.isArray(categories)) {
                categoriesArray = categories.filter(cat => cat && cat.trim() !== '');
            } else if (typeof categories === 'string' && categories.trim() !== '') {
                categoriesArray = [categories];
            }
        }

        // Xử lý filterQuery
        let parsedFilterQuery = {};
        if (filterQuery) {
            try {
                if (typeof filterQuery === 'string') {
                    parsedFilterQuery = JSON.parse(filterQuery);
                } else {
                    parsedFilterQuery = filterQuery;
                }
            } catch (error) {
                console.error('Error parsing filterQuery:', error);
                parsedFilterQuery = {};
            }
        }

        const newHomeSection = await HomeSection.create({
            title: title.trim(),
            order: parseInt(order) || 0,
            isActive: isActive === "true" || isActive === true,
            categories: categoriesArray,
            moreButtonTitle: moreButtonTitle?.trim() || '',
            moreButtonSubtitle: moreButtonSubtitle?.trim() || '',
            filterQuery: parsedFilterQuery,
            createdBy: req.session?.user?.id || null,
            updatedBy: req.session?.user?.id || null,
        });

        const successMessage = "Thêm home section thành công";

        if (isAjax) {
            return res.status(201).json({
                success: true,
                message: successMessage,
                data: newHomeSection,
            });
        }

        req.flash("success", successMessage);
        res.redirect("/homeSection");
    } catch (error) {
        console.error("Error creating home section:", error);
        let errorMessage = "Lỗi khi thêm home section";

        // Check if it's an AJAX request
        const isAjax =
            req.headers["x-requested-with"] === "XMLHttpRequest" ||
            req.headers.accept?.includes("application/json");

        if (isAjax) {
            return res.status(500).json({
                success: false,
                message: errorMessage,
            });
        }

        req.flash("error", errorMessage);
        res.redirect("/homeSection/add");
    }
};

// Hiển thị form chỉnh sửa
exports.showEditForm = async (req, res) => {
    try {
        const homeSectionId = req.params.id;

        const [homeSection, categories] = await Promise.all([
            HomeSection.findById(homeSectionId)
                .populate('categories', 'name slug')
                .populate('createdBy', 'fullName')
                .populate('updatedBy', 'fullName'),
            Category.find({ status: "Hoạt động" }).sort({ name: 1 })
        ]);

        if (!homeSection) {
            req.flash("error", "Không tìm thấy home section");
            return res.redirect("/homeSection");
        }

        res.render("homeSection/edit", {
            homeSection,
            categories,
            message: req.flash("success"),
            error: req.flash("error"),
        });
    } catch (error) {
        console.error("Error loading edit form:", error);
        req.flash("error", "Lỗi khi tải form chỉnh sửa");
        res.redirect("/homeSection");
    }
};

// Xử lý cập nhật
exports.update = async (req, res) => {
    try {
        const { 
            title, 
            order, 
            isActive, 
            categories, 
            moreButtonTitle, 
            moreButtonSubtitle, 
            filterQuery 
        } = req.body;
        const homeSectionId = req.params.id;

        // Check if it's an AJAX request
        const isAjax =
            req.xhr ||
            req.headers["x-requested-with"] === "XMLHttpRequest" ||
            req.headers.accept?.includes("application/json");

        // Validate input
        if (!title || !title.trim()) {
            const errorMessage = "Tiêu đề section không được để trống";
            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage,
                });
            }
            req.flash("error", errorMessage);
            return res.redirect(`/homeSection/edit/${homeSectionId}`);
        }

        // Validate title length
        if (title.trim().length < 2) {
            const errorMessage = "Tiêu đề section phải có ít nhất 2 ký tự";
            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage,
                });
            }
            req.flash("error", errorMessage);
            return res.redirect(`/homeSection/edit/${homeSectionId}`);
        }

        // Check if home section exists
        const existingHomeSection = await HomeSection.findById(homeSectionId);
        if (!existingHomeSection) {
            const errorMessage = "Không tìm thấy home section";
            if (isAjax) {
                return res.status(404).json({
                    success: false,
                    message: errorMessage,
                });
            }
            req.flash("error", errorMessage);
            return res.redirect("/homeSection");
        }

        // Xử lý categories array
        let categoriesArray = [];
        if (categories) {
            if (Array.isArray(categories)) {
                categoriesArray = categories.filter(cat => cat && cat.trim() !== '');
            } else if (typeof categories === 'string' && categories.trim() !== '') {
                categoriesArray = [categories];
            }
        }

        // Xử lý filterQuery
        let parsedFilterQuery = {};
        if (filterQuery) {
            try {
                if (typeof filterQuery === 'string') {
                    parsedFilterQuery = JSON.parse(filterQuery);
                } else {
                    parsedFilterQuery = filterQuery;
                }
            } catch (error) {
                console.error('Error parsing filterQuery:', error);
                parsedFilterQuery = {};
            }
        }

        const updatedHomeSection = await HomeSection.findByIdAndUpdate(
            homeSectionId,
            {
                title: title.trim(),
                order: parseInt(order) || 0,
                isActive: isActive === "true" || isActive === true,
                categories: categoriesArray,
                moreButtonTitle: moreButtonTitle?.trim() || '',
                moreButtonSubtitle: moreButtonSubtitle?.trim() || '',
                filterQuery: parsedFilterQuery,
                updatedBy: req.session?.user?.id || null,
                updatedAt: new Date(),
            },
            { new: true, runValidators: true }
        );

        const successMessage = "Cập nhật home section thành công";

        if (isAjax) {
            return res.json({
                success: true,
                message: successMessage,
                data: updatedHomeSection,
            });
        }

        req.flash("success", successMessage);
        res.redirect("/homeSection");
    } catch (error) {
        console.error("Error updating home section:", error);
        let errorMessage = "Lỗi khi cập nhật home section";

        const isAjax =
            req.xhr ||
            req.headers["x-requested-with"] === "XMLHttpRequest" ||
            req.headers.accept?.includes("application/json");

        if (isAjax) {
            return res.status(500).json({
                success: false,
                message: errorMessage,
            });
        }

        req.flash("error", errorMessage);
        res.redirect(`/homeSection/edit/${req.params.id}`);
    }
};

// Xử lý xóa
exports.delete = async (req, res) => {
    try {
        const homeSectionId = req.params.id;

        const homeSection = await HomeSection.findById(homeSectionId);
        if (!homeSection) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy home section",
            });
        }

        await HomeSection.findByIdAndDelete(homeSectionId);

        res.json({
            success: true,
            message: "Xóa home section thành công",
        });
    } catch (error) {
        console.error("Error deleting home section:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa home section",
        });
    }
};

// Xử lý thay đổi trạng thái
exports.toggleStatus = async (req, res) => {
    try {
        const homeSection = await HomeSection.findById(req.params.id);
        if (!homeSection) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy home section",
            });
        }

        // Chuyển đổi trạng thái
        const newStatus = !homeSection.isActive;

        await HomeSection.findByIdAndUpdate(req.params.id, {
            isActive: newStatus,
            updatedBy: req.session?.user?.id || null,
            updatedAt: new Date(),
        });

        res.json({
            success: true,
            isActive: newStatus,
            message: `Đã ${
                newStatus ? "kích hoạt" : "tắt"
            } home section thành công`,
        });
    } catch (error) {
        console.error("Error toggling home section status:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi thay đổi trạng thái home section",
        });
    }
};

// Lấy danh sách home sections (API)
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = {};
        if (search) {
            searchQuery.$or = [
                { title: { $regex: search, $options: "i" } }
            ];
        }

        const [homeSections, total] = await Promise.all([
            HomeSection.find(searchQuery)
                .populate('categories', 'name slug')
                .populate('createdBy', 'fullName')
                .populate('updatedBy', 'fullName')
                .skip(skip)
                .limit(limit)
                .sort({ order: 1, createdAt: 1 }),
            HomeSection.countDocuments(searchQuery),
        ]);

        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: homeSections,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: total,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    } catch (error) {
        console.error("Error getting home sections:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách home sections",
        });
    }
};

// Tạo home section mới qua API
exports.apiCreate = async (req, res) => {
    try {
        const { 
            title, 
            order, 
            isActive, 
            categories, 
            moreButtonTitle, 
            moreButtonSubtitle, 
            filterQuery 
        } = req.body;

        // Validate input
        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Tiêu đề section không được để trống",
            });
        }

        // Validate title length
        if (title.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Tiêu đề section phải có ít nhất 2 ký tự",
            });
        }

        // Xử lý categories array
        let categoriesArray = [];
        if (categories) {
            if (Array.isArray(categories)) {
                categoriesArray = categories.filter(cat => cat && cat.trim() !== '');
            } else if (typeof categories === 'string' && categories.trim() !== '') {
                categoriesArray = [categories];
            }
        }

        // Xử lý filterQuery
        let parsedFilterQuery = {};
        if (filterQuery) {
            try {
                if (typeof filterQuery === 'string') {
                    parsedFilterQuery = JSON.parse(filterQuery);
                } else {
                    parsedFilterQuery = filterQuery;
                }
            } catch (error) {
                console.error('Error parsing filterQuery:', error);
                parsedFilterQuery = {};
            }
        }

        const newHomeSection = new HomeSection({
            title: title.trim(),
            order: parseInt(order) || 0,
            isActive: isActive !== false,
            categories: categoriesArray,
            moreButtonTitle: moreButtonTitle?.trim() || '',
            moreButtonSubtitle: moreButtonSubtitle?.trim() || '',
            filterQuery: parsedFilterQuery,
            createdBy: req.session?.user?.id || null,
            updatedBy: req.session?.user?.id || null,
        });

        await newHomeSection.save();

        res.status(201).json({
            success: true,
            message: "Thêm home section thành công",
            data: newHomeSection,
        });
    } catch (error) {
        console.error("Error creating home section via API:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi thêm home section",
        });
    }
};

// Lấy danh sách home sections công khai (cho frontend)
exports.getPublicHomeSections = async (req, res) => {
    try {
        const homeSections = await HomeSection.find({ isActive: true })
            .populate('categories', 'name slug')
            .sort({ order: 1, createdAt: 1 })
            .select('-createdBy -updatedBy -__v');

        res.json({
            success: true,
            data: homeSections,
        });
    } catch (error) {
        console.error("Error getting public home sections:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách home sections",
        });
    }
};

// Lấy home section theo slug (cho trang category)
exports.getHomeSectionBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        if (!slug) {
            return res.status(400).json({
                success: false,
                message: "Slug không được để trống",
            });
        }

        const homeSection = await HomeSection.findOne({ 
            moreButtonSlug: slug, 
            isActive: true 
        })
        .populate('categories', 'name slug')
        .select('-createdBy -updatedBy -__v');

        if (!homeSection) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy section với slug này",
            });
        }

        res.json({
            success: true,
            data: homeSection,
        });
    } catch (error) {
        console.error("Error getting home section by slug:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy thông tin section",
        });
    }
};