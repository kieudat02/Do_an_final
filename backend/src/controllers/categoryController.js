const Category = require("../models/categoriesModel");

// Hiển thị danh sách (có phân trang)
exports.list = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = {};
        if (search) {
            searchQuery.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        const [categories, total] = await Promise.all([
            Category.find(searchQuery)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: 1 }), // Sort from old to new (new records at bottom)
            Category.countDocuments(searchQuery),
        ]);

        const totalPages = Math.ceil(total / limit);

        // Kiểm tra nếu page vượt quá giới hạn
        if (page > totalPages && totalPages > 0) {
            const redirectUrl = `/category?page=${totalPages}${
                search ? `&search=${encodeURIComponent(search)}` : ""
            }&limit=${limit}`;
            return res.redirect(redirectUrl);
        }

        res.render("category", {
            categories,
            search,
            pagination: {
                current: page,
                total: totalPages, // Tổng số trang
                limit,
                totalItems: total, // Tổng số bản ghi
                hasPrev: page > 1,
                hasNext: page < totalPages,
                prevPage: page > 1 ? page - 1 : null,
                nextPage: page < totalPages ? page + 1 : null,
            },
            message: req.flash("success"),
            error: req.flash("error"),
            userPermissions: res.locals.userPermissions, // Đảm bảo luôn truyền userPermissions
        });
    } catch (error) {
        console.error("Error loading categories:", error);
        req.flash("error", "Lỗi khi tải danh sách danh mục");
        res.redirect("/dashboard");
    }
};

// Hiển thị form thêm mới
exports.showAddForm = (req, res) => {
    res.render("category/add", {
        message: req.flash("success"),
        error: req.flash("error"),
    });
};

// Xử lý thêm mới
exports.create = async (req, res) => {
    try {
    const name = req.body.name;
    const description = req.body.description;
    const pageTitle = req.body.pageTitle;
    const pageSubtitle = req.body.pageSubtitle;


        // Check if it's an AJAX request
        const isAjax =
            req.headers["x-requested-with"] === "XMLHttpRequest" ||
            req.headers.accept?.includes("application/json");

        // Validate input
        if (!name || !name.trim()) {
            const errorMessage = "Tên danh mục không được để trống";

            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage,
                });
            }
            req.flash("error", errorMessage);
            return res.redirect("/category/add");
        }

        // Validate name length
        if (name.trim().length < 2) {
            const errorMessage = "Tên danh mục phải có ít nhất 2 ký tự";

            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage,
                });
            }
            req.flash("error", errorMessage);
            return res.redirect("/category/add");
        }

        // Check if category name already exists - use same collation as database index
        const trimmedName = name.trim();

        // Use the same collation as the unique index in model
        const existingCategory = await Category.findOne({
            name: trimmedName,
        }).collation({ locale: "en", strength: 2 });

        if (existingCategory) {
            const errorMessage = "Tên danh mục đã tồn tại";

            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage,
                });
            }
            req.flash("error", errorMessage);
            return res.redirect("/category/add");
        }

        // Generate unique slug from name with timestamp to avoid duplicates
        const baseSlug = name
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
            .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
            .replace(/\s+/g, "-") // Replace spaces with hyphens
            .replace(/-+/g, "-") // Replace multiple hyphens with single
            .trim("-"); // Remove leading/trailing hyphens

        // Add timestamp to ensure uniqueness
        const timestamp = Date.now();
        const slug = `${baseSlug}-${timestamp}`;
        const fullSlug = `category-${baseSlug}-${timestamp}`;



        const newCategory = await Category.create({
            name: name.trim(),
            description: description ? description.trim() : "",
            pageTitle: pageTitle ? pageTitle.trim() : "",
            pageSubtitle: pageSubtitle ? pageSubtitle.trim() : "",

            slug: slug,
            fullSlug: fullSlug,
            status: "Hoạt động",
            createdBy: req.session?.user?.fullName || "System",
            updatedBy: req.session?.user?.fullName || "System",
        });

        const successMessage = "Thêm danh mục mới thành công";

        if (isAjax) {
            return res.status(200).json({
                success: true,
                message: successMessage,
                data: {
                    id: newCategory._id,
                    name: newCategory.name,
                    description: newCategory.description,
                    pageTitle: newCategory.pageTitle,
                    pageSubtitle: newCategory.pageSubtitle,

                    status: newCategory.status,
                },
            });
        }

        req.flash("success", successMessage);
        res.redirect("/category");
    } catch (error) {
        const isAjax =
            req.headers["x-requested-with"] === "XMLHttpRequest" ||
            req.headers.accept?.includes("application/json");

        // Handle specific errors
        let errorMessage = "Có lỗi xảy ra khi tạo danh mục";

        if (error.code === 11000) {
            if (error.keyPattern && error.keyPattern.name) {
                errorMessage = "Tên danh mục đã tồn tại";
            } else if (error.keyPattern && error.keyPattern.slug) {
                errorMessage = "Slug danh mục đã tồn tại";
            } else if (error.keyPattern && error.keyPattern.fullSlug) {
                errorMessage = "FullSlug danh mục đã tồn tại";
            } else {
                errorMessage = "Dữ liệu đã tồn tại trong hệ thống";
            }
        } else if (error.name === "ValidationError") {
            const firstError = Object.values(error.errors)[0];
            errorMessage = firstError
                ? firstError.message
                : "Dữ liệu không hợp lệ";
        } else if (
            error.name === "MongoError" ||
            error.name === "MongoServerError"
        ) {
            errorMessage = "Lỗi kết nối cơ sở dữ liệu";
        } else if (error.message.includes("buffering timed out")) {
            errorMessage = "Kết nối cơ sở dữ liệu bị timeout";
        }

        if (isAjax) {
            return res.status(500).json({
                success: false,
                message: errorMessage,
            });
        }

        req.flash("error", errorMessage);
        res.redirect("/category/add");
    }
};

// Hiển thị form sửa
exports.showEditForm = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send("Không tìm thấy danh mục");
        }
        res.render("category/edit", { category });
    } catch (error) {
        res.status(500).send("Có lỗi xảy ra khi tải thông tin danh mục");
    }
};

// Xử lý cập nhật
exports.update = async (req, res) => {
    try {
    const { name, description, status, pageTitle, pageSubtitle } = req.body;
        const categoryId = req.params.id;

        // Check if it's an AJAX request
        const isAjax =
            req.xhr ||
            req.headers["x-requested-with"] === "XMLHttpRequest" ||
            req.headers.accept?.includes("application/json");

        // Validate input
        if (!name || !name.trim()) {
            const errorMessage = "Tên danh mục không được để trống";
            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage,
                });
            }
            req.flash("error", errorMessage);
            return res.redirect(`/category/edit/${categoryId}`);
        }

        // Validate name length
        if (name.trim().length < 2) {
            const errorMessage = "Tên danh mục phải có ít nhất 2 ký tự";
            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage,
                });
            }
            req.flash("error", errorMessage);
            return res.redirect(`/category/edit/${categoryId}`);
        }

        // Check if category name already exists (excluding current category) - use same collation as database index
        const trimmedName = name.trim();

        const existingCategory = await Category.findOne({
            name: trimmedName,
            _id: { $ne: categoryId },
        }).collation({ locale: "en", strength: 2 });

        if (existingCategory) {
            const errorMessage = "Tên danh mục đã tồn tại";
            if (isAjax) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage,
                });
            }
            req.flash("error", errorMessage);
            return res.redirect(`/category/edit/${categoryId}`);
        }

        // Generate unique slug from name with timestamp to avoid duplicates
        const baseSlug = name
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
            .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
            .replace(/\s+/g, "-") // Replace spaces with hyphens
            .replace(/-+/g, "-") // Replace multiple hyphens with single
            .trim("-"); // Remove leading/trailing hyphens

        // Add timestamp to ensure uniqueness
        const timestamp = Date.now();
        const slug = `${baseSlug}-${timestamp}`;
        const fullSlug = `category-${baseSlug}-${timestamp}`;



    const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            {
                name: name.trim(),
        description: description?.trim() || "",
        pageTitle: pageTitle ? pageTitle.trim() : "",
        pageSubtitle: pageSubtitle ? pageSubtitle.trim() : "",

                slug: slug,
                fullSlug: fullSlug,
                status,
                updatedBy: req.session?.user?.fullName || "System",
                updatedAt: new Date(),
            },
            { new: true } // Return updated document
        );

        if (!updatedCategory) {
            const errorMessage = "Không tìm thấy danh mục";
            if (isAjax) {
                return res.status(404).json({
                    success: false,
                    message: errorMessage,
                });
            }
            req.flash("error", errorMessage);
            return res.redirect("/category");
        }

        // Check if it's an AJAX request
        if (isAjax) {
            return res.status(200).json({
                success: true,
                message: "Cập nhật danh mục thành công",
                data: updatedCategory,
            });
        }

        req.flash("success", "Cập nhật danh mục thành công");
        res.redirect("/category");
    } catch (error) {
        const isAjax =
            req.xhr ||
            req.headers["x-requested-with"] === "XMLHttpRequest" ||
            req.headers.accept?.includes("application/json");

        // Handle specific errors
        let errorMessage = "Có lỗi xảy ra khi cập nhật danh mục";

        if (error.code === 11000) {
            errorMessage = "Tên danh mục đã tồn tại";
        } else if (error.name === "ValidationError") {
            const firstError = Object.values(error.errors)[0];
            errorMessage = firstError
                ? firstError.message
                : "Dữ liệu không hợp lệ";
        } else if (
            error.name === "MongoError" ||
            error.name === "MongoServerError"
        ) {
            errorMessage = "Lỗi kết nối cơ sở dữ liệu";
        } else if (error.message.includes("buffering timed out")) {
            errorMessage = "Kết nối cơ sở dữ liệu bị timeout";
        }

        if (isAjax) {
            return res.status(500).json({
                success: false,
                message: errorMessage,
            });
        }

        req.flash("error", errorMessage);
        res.redirect("/category");
    }
};

// Xử lý xóa
exports.delete = async (req, res) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if (!deletedCategory) {
            if (req.xhr || req.headers.accept?.includes("application/json")) {
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy danh mục",
                });
            }
            req.flash("error", "Không tìm thấy danh mục");
            return res.redirect("/category");
        }

        // Check if it's an AJAX request
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            // Calculate pagination after deletion for AJAX requests
            const currentPage = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            // Build search query to count remaining items
            const search = req.query.search || "";
            let searchQuery = {};
            if (search) {
                searchQuery.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ];
            }

            // Count remaining categories
            const totalRemainingCategories = await Category.countDocuments(searchQuery);
            const totalPages = Math.ceil(totalRemainingCategories / limit);

            // Calculate proper page to redirect to
            let redirectPage = currentPage;
            if (currentPage > totalPages && totalPages > 0) {
                redirectPage = totalPages;
            } else if (totalPages === 0) {
                redirectPage = 1;
            }

            return res.status(200).json({
                success: true,
                message: "Xóa danh mục thành công",
                pagination: {
                    currentPage: currentPage,
                    redirectPage: redirectPage,
                    totalPages: totalPages,
                    totalRemainingCategories: totalRemainingCategories,
                    needsRedirect: redirectPage !== currentPage
                }
            });
        }

        req.flash("success", "Xóa danh mục thành công");
        res.redirect("/category");
    } catch (error) {
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(500).json({
                success: false,
                message: "Có lỗi xảy ra khi xóa danh mục",
            });
        }

        req.flash("error", "Có lỗi xảy ra khi xóa danh mục");
        res.redirect("/category");
    }
};

// Xử lý thay đổi trạng thái
exports.toggleStatus = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy danh mục",
            });
        }

        // Chuyển đổi trạng thái
        const newStatus =
            category.status === "Hoạt động" ? "Không hoạt động" : "Hoạt động";

        await Category.findByIdAndUpdate(req.params.id, {
            status: newStatus,
            updatedBy: "Admin",
            updatedAt: new Date(),
        });

        res.json({
            success: true,
            status: newStatus,
            message: `Đã ${
                newStatus === "Hoạt động" ? "kích hoạt" : "tắt"
            } danh mục thành công`,
        });
    } catch (error) {
        console.error("Error toggling category status:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thay đổi trạng thái",
        });
    }
};

//-- API Methods --

// Lấy danh sách danh mục
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
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        const [categories, total] = await Promise.all([
            Category.find(searchQuery)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: 1 }),
            Category.countDocuments(searchQuery),
        ]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: categories,
            pagination: {
                current: page,
                total: totalPages,
                limit,
                totalItems: total,
            },
        });
    } catch (error) {
        console.error("Error in getAll categories API:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải danh sách danh mục",
        });
    }
};

// Lấy thông tin danh mục theo ID
exports.getById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy danh mục",
            });
        }

        res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error) {
        console.error("Error in getById category API:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải thông tin danh mục",
        });
    }
};

// Tạo danh mục mới qua API
exports.apiCreate = async (req, res) => {
    try {
    const { name, description, pageTitle, pageSubtitle } = req.body;

        // Validate input
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Tên danh mục không được để trống",
            });
        }

        // Validate name length
        if (name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Tên danh mục phải có ít nhất 2 ký tự",
            });
        }

        // Check if category name already exists
        const existingCategory = await Category.findOne({ name: name.trim() });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Tên danh mục đã tồn tại",
            });
        }



        const newCategory = new Category({
            name: name.trim(),
            description: description ? description.trim() : "",
            pageTitle: pageTitle ? pageTitle.trim() : "",
            pageSubtitle: pageSubtitle ? pageSubtitle.trim() : "",

            status: "Hoạt động",
            createdBy: req.session.user ? req.session.user.name : "Admin",
        });

        await newCategory.save();

        res.status(201).json({
            success: true,
            message: "Thêm danh mục thành công",
            data: newCategory,
        });
    } catch (error) {
        console.error("Error in apiCreate category:", error);
        let errorMessage = "Có lỗi xảy ra khi thêm danh mục";

        if (error.code === 11000) {
            errorMessage = "Tên danh mục đã tồn tại";
        } else if (error.name === "ValidationError") {
            const firstError = Object.values(error.errors)[0];
            errorMessage = firstError
                ? firstError.message
                : "Dữ liệu không hợp lệ";
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
        });
    }
};

// Cập nhật danh mục qua API
exports.apiUpdate = async (req, res) => {
    try {
    const { name, description, pageTitle, pageSubtitle } = req.body;

        // Validate input
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Tên danh mục không được để trống",
            });
        }

        // Validate name length
        if (name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Tên danh mục phải có ít nhất 2 ký tự",
            });
        }

        // Check if category exists
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy danh mục",
            });
        }

        // Check if category name already exists (excluding current category)
        const existingCategory = await Category.findOne({
            name: name.trim(),
            _id: { $ne: req.params.id },
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Tên danh mục đã tồn tại",
            });
        }



    const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            {
                name: name.trim(),
        description: description ? description.trim() : "",
        pageTitle: pageTitle ? pageTitle.trim() : "",
        pageSubtitle: pageSubtitle ? pageSubtitle.trim() : "",

                updatedBy: req.session.user ? req.session.user.name : "Admin",
                updatedAt: new Date(),
            },
            { new: true } // Return the updated document
        );

        res.status(200).json({
            success: true,
            message: "Cập nhật danh mục thành công",
            data: updatedCategory,
        });
    } catch (error) {
        console.error("Error in apiUpdate category:", error);
        let errorMessage = "Có lỗi xảy ra khi cập nhật danh mục";

        if (error.code === 11000) {
            errorMessage = "Tên danh mục đã tồn tại";
        } else if (error.name === "ValidationError") {
            const firstError = Object.values(error.errors)[0];
            errorMessage = firstError
                ? firstError.message
                : "Dữ liệu không hợp lệ";
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
        });
    }
};

// Xóa danh mục qua API
exports.apiDelete = async (req, res) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        
        if (!deletedCategory) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy danh mục",
            });
        }

        res.status(200).json({
            success: true,
            message: "Xóa danh mục thành công",
        });
    } catch (error) {
        console.error("Error in apiDelete category:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa danh mục",
        });
    }
};

// Thay đổi trạng thái danh mục qua API
exports.apiToggleStatus = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy danh mục",
            });
        }

        // Chuyển đổi trạng thái
        const newStatus = category.status === "Hoạt động" ? "Không hoạt động" : "Hoạt động";

        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            {
                status: newStatus,
                updatedBy: req.session.user ? req.session.user.name : "Admin",
                updatedAt: new Date(),
            },
            { new: true } // Return the updated document
        );

        res.status(200).json({
            success: true,
            message: `Đã ${newStatus === "Hoạt động" ? "kích hoạt" : "tắt"} danh mục thành công`,
            status: newStatus,
            data: updatedCategory
        });
    } catch (error) {
        console.error("Error in apiToggleStatus category:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thay đổi trạng thái danh mục",
        });
    }
};
