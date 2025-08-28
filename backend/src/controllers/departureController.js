const Departure = require("../models/departureModel");
const { generateSlug } = require("../utils/slugGenerator");

// Hiển thị danh sách điểm khởi hành
exports.list = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(5, parseInt(req.query.limit) || 5)); // Đặt lại về 10 items/page
        const skip = (page - 1) * limit;

        // Tìm kiếm nếu có
        const search = req.query.search ? req.query.search.trim() : "";
        const searchQuery = search
            ? {
                  $or: [
                      { name: { $regex: search, $options: "i" } },
                      { description: { $regex: search, $options: "i" } },
                      { createdBy: { $regex: search, $options: "i" } },
                  ],
              }
            : {};

        // Đếm tổng số documents
        const totalDepartures = await Departure.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalDepartures / limit);

        // Kiểm tra nếu page vượt quá giới hạn
        if (page > totalPages && totalPages > 0) {
            const redirectUrl = `/departure?page=${totalPages}${
                search ? `&search=${encodeURIComponent(search)}` : ""
            }&limit=${limit}`;
            return res.redirect(redirectUrl);
        }

        // Lấy dữ liệu với phân trang
        const departures = await Departure.find(searchQuery)
            .sort({ createdAt: 1 }) // Sort from old to new (new records at bottom)
            .skip(skip)
            .limit(limit);

        res.render("departure", {
            departures,
            pagination: {
                current: page,
                total: totalPages,
                limit,
                totalItems: totalDepartures,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                nextPage: page + 1,
                prevPage: page - 1,
                startItem: totalDepartures > 0 ? skip + 1 : 0,
                endItem: Math.min(skip + limit, totalDepartures),
            },
            search,
            message: req.flash("message"),
            error: req.flash("error"),
            userPermissions: res.locals.userPermissions, // Đảm bảo luôn truyền userPermissions
        });
    } catch (error) {
        console.error("Error loading departures:", error);
        req.flash("error", "Có lỗi xảy ra khi tải danh sách điểm khởi hành");
        res.render("departure", {
            departures: [],
            pagination: {
                current: 1,
                total: 0,
                limit: 10,
                totalItems: 0,
                hasNext: false,
                hasPrev: false,
                nextPage: 1,
                prevPage: 1,
                startItem: 0,
                endItem: 0,
            },
            search: "",
            message: req.flash("message"),
            error: req.flash("error"),
        });
    }
};

// Hiển thị form thêm mới
exports.showAddForm = (req, res) => {
    res.render("departure/add", {
        message: req.flash("message"),
        error: req.flash("error"),
        userPermissions: res.locals.userPermissions, // Đảm bảo luôn truyền userPermissions
    });
};

// Xử lý thêm mới
exports.create = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Check if it's an AJAX request
        const isAjax = req.xhr || 
                      req.headers["x-requested-with"] === "XMLHttpRequest" ||
                      req.headers.accept?.includes("application/json");

        // Validate input
        if (!name || !name.trim()) {
            const errorMessage = "Tên điểm khởi hành không được để trống";
            if (isAjax) {
                return res.status(400).json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect("/departure/add");
        }

        if (name.trim().length < 2) {
            const errorMessage = "Tên điểm khởi hành phải có ít nhất 2 ký tự";
            if (isAjax) {
                return res.status(400).json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect("/departure/add");
        }

        // Check if departure name already exists
        const trimmedName = name.trim();
        const existingDeparture = await Departure.findOne({
            name: new RegExp(`^${trimmedName}$`, "i"),
        });

        if (existingDeparture) {
            const errorMessage = "Tên điểm khởi hành đã tồn tại";
            if (isAjax) {
                return res.status(400).json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect("/departure/add");
        }

        // Generate unique slug
        const baseSlug = name
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim("-");

        const timestamp = Date.now();
        const slug = `${baseSlug}-${timestamp}`;
        const fullSlug = `departure-${baseSlug}-${timestamp}`;

        await Departure.create({
            name: name.trim(),
            description: description?.trim() || "",
            slug: slug,
            fullSlug: fullSlug,
            status: "Hoạt động",
            createdBy: req.user?.fullName || "System",
            updatedBy: req.user?.fullName || "System",
        });

        const successMessage = "Thêm điểm khởi hành thành công!";

        // Handle AJAX request
        if (isAjax) {
            return res.status(200).json({ success: true, message: successMessage });
        }

        // Handle regular form submission
        req.flash("message", successMessage);
        res.redirect("/departure");
    } catch (error) {
        console.error("Error creating departure:", error);

        const isAjax = req.xhr || 
                      req.headers["x-requested-with"] === "XMLHttpRequest" ||
                      req.headers.accept?.includes("application/json");

        // Handle specific errors
        let errorMessage = "Có lỗi xảy ra khi tạo điểm khởi hành";

        if (error.code === 11000) {
            if (error.keyPattern && error.keyPattern.name) {
                errorMessage = "Tên điểm khởi hành đã tồn tại";
            } else if (error.keyPattern && error.keyPattern.slug) {
                errorMessage = "Slug điểm khởi hành đã tồn tại";
            } else if (error.keyPattern && error.keyPattern.fullSlug) {
                errorMessage = "FullSlug điểm khởi hành đã tồn tại";
            } else {
                errorMessage = "Dữ liệu đã tồn tại trong hệ thống";
            }
        } else if (error.name === "ValidationError") {
            const firstError = Object.values(error.errors)[0];
            errorMessage = firstError ? firstError.message : "Dữ liệu không hợp lệ";
        }

        // Handle AJAX request
        if (isAjax) {
            return res.status(500).json({ success: false, message: errorMessage });
        }

        // Handle regular form submission
        req.flash("error", errorMessage);
        res.redirect("/departure/add");
    }
};

// Hiển thị form sửa
exports.showEditForm = async (req, res) => {
    try {
        const departure = await Departure.findById(req.params.id);
        if (!departure) {
            req.flash("error", "Không tìm thấy điểm khởi hành!");
            return res.redirect("/departure");
        }
        res.render("departure/edit", {
            departure,
            message: req.flash("message"),
            error: req.flash("error"),
        });
    } catch (error) {
        req.flash("error", "Có lỗi xảy ra!");
        res.redirect("/departure");
    }
};

// Xử lý cập nhật
exports.update = async (req, res) => {
    try {
        const { name, description, status } = req.body;
        const departureId = req.params.id;

        // Check if it's an AJAX request
        const isAjax = req.xhr ||
                      req.headers["x-requested-with"] === "XMLHttpRequest" ||
                      req.headers.accept?.includes("application/json");

        // Validate input
        if (!name || !name.trim()) {
            const errorMessage = "Tên điểm khởi hành không được để trống";
            if (isAjax) {
                return res.status(400).json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect(`/departure/edit/${departureId}`);
        }

        if (name.trim().length < 2) {
            const errorMessage = "Tên điểm khởi hành phải có ít nhất 2 ký tự";
            if (isAjax) {
                return res.status(400).json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect(`/departure/edit/${departureId}`);
        }

        // Check if departure name already exists (excluding current departure)
        const trimmedName = name.trim();
        const existingDeparture = await Departure.findOne({
            name: new RegExp(`^${trimmedName}$`, "i"),
            _id: { $ne: departureId },
        });

        if (existingDeparture) {
            const errorMessage = "Tên điểm khởi hành đã tồn tại";
            if (isAjax) {
                return res.status(400).json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect(`/departure/edit/${departureId}`);
        }

        // Generate unique slug
        const baseSlug = name
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim("-");

        const timestamp = Date.now();
        const slug = `${baseSlug}-${timestamp}`;
        const fullSlug = `departure-${baseSlug}-${timestamp}`;

        await Departure.findByIdAndUpdate(departureId, {
            name: name.trim(),
            description: description?.trim() || "",
            slug: slug,
            fullSlug: fullSlug,
            status,
            updatedBy: req.user?.fullName || "System",
        });

        const successMessage = "Cập nhật điểm khởi hành thành công!";

        // Handle AJAX request
        if (isAjax) {
            return res.status(200).json({ success: true, message: successMessage });
        }

        // Handle regular form submission
        req.flash("message", successMessage);
        res.redirect("/departure");
    } catch (error) {
        console.error("Error updating departure:", error);
        const errorMessage = "Có lỗi xảy ra khi cập nhật điểm khởi hành!";

        // Handle AJAX request
        const isAjax = req.xhr ||
                      req.headers["x-requested-with"] === "XMLHttpRequest" ||
                      req.headers.accept?.includes("application/json");

        if (isAjax) {
            return res.status(500).json({ success: false, message: errorMessage });
        }

        // Handle regular form submission
        req.flash("error", errorMessage);
        res.redirect("/departure");
    }
};

// Xử lý xóa
exports.delete = async (req, res) => {
    try {
        await Departure.findByIdAndDelete(req.params.id);

        const successMessage = "Xóa điểm khởi hành thành công!";

        // Handle AJAX request
        if (req.xhr || req.get("X-Requested-With") === "XMLHttpRequest") {
            // Calculate pagination after deletion for AJAX requests
            const currentPage = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 5;

            // Build search query to count remaining items
            const search = req.query.search ? req.query.search.trim() : "";
            const searchQuery = search
                ? {
                      $or: [
                          { name: { $regex: search, $options: "i" } },
                          { description: { $regex: search, $options: "i" } },
                          { createdBy: { $regex: search, $options: "i" } },
                      ],
                  }
                : {};

            // Count remaining departures
            const totalRemainingDepartures = await Departure.countDocuments(searchQuery);
            const totalPages = Math.ceil(totalRemainingDepartures / limit);

            // Calculate proper page to redirect to
            let redirectPage = currentPage;
            if (currentPage > totalPages && totalPages > 0) {
                redirectPage = totalPages;
            } else if (totalPages === 0) {
                redirectPage = 1;
            }

            return res.json({
                success: true,
                message: successMessage,
                pagination: {
                    currentPage: currentPage,
                    redirectPage: redirectPage,
                    totalPages: totalPages,
                    totalRemainingDepartures: totalRemainingDepartures,
                    needsRedirect: redirectPage !== currentPage
                }
            });
        }

        // Handle regular form submission
        req.flash("message", successMessage);
        res.redirect("/departure");
    } catch (error) {
        console.error("Error deleting departure:", error);
        const errorMessage = "Có lỗi xảy ra khi xóa điểm khởi hành!";

        // Handle AJAX request
        if (req.xhr || req.get("X-Requested-With") === "XMLHttpRequest") {
            return res
                .status(500)
                .json({ success: false, message: errorMessage });
        }

        // Handle regular form submission
        req.flash("error", errorMessage);
        res.redirect("/departure");
    }
};

// Xử lý thay đổi trạng thái
exports.toggleStatus = async (req, res) => {
    try {
        const departure = await Departure.findById(req.params.id);
        if (!departure) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy điểm khởi hành!",
            });
        }

        const newStatus =
            departure.status === "Hoạt động" ? "Tạm dừng" : "Hoạt động";
        await Departure.findByIdAndUpdate(req.params.id, {
            status: newStatus,
            updatedBy: req.user?.fullName || "System",
        });

        res.json({
            success: true,
            status: newStatus,
            message: `Đã ${
                newStatus === "Hoạt động" ? "kích hoạt" : "tạm dừng"
            } điểm khởi hành thành công!`,
        });
    } catch (error) {
        console.error("Toggle status error:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thay đổi trạng thái!",
        });
    }
};

// Xóa nhiều điểm khởi hành
exports.deleteMultiple = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn ít nhất một điểm khởi hành để xóa!",
            });
        }

        // Validate all IDs
        const validIds = ids.filter(
            (id) => id && typeof id === "string" && id.length === 24
        );

        if (validIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Danh sách ID không hợp lệ!",
            });
        }

        // Delete multiple departures
        const result = await Departure.deleteMany({ _id: { $in: validIds } });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy điểm khởi hành nào để xóa!",
            });
        }

        // Calculate proper redirect page after deletion
        const currentPage = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;

        // Build search query to count remaining items
        const search = req.query.search ? req.query.search.trim() : "";
        const searchQuery = search
            ? {
                  $or: [
                      { name: { $regex: search, $options: "i" } },
                      { description: { $regex: search, $options: "i" } },
                      { createdBy: { $regex: search, $options: "i" } },
                  ],
              }
            : {};

        // Count remaining departures
        const totalRemainingDepartures = await Departure.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalRemainingDepartures / limit);

        // Calculate proper page to redirect to
        let redirectPage = currentPage;
        if (currentPage > totalPages && totalPages > 0) {
            redirectPage = totalPages;
        } else if (totalPages === 0) {
            redirectPage = 1;
        }

        res.json({
            success: true,
            message: `Đã xóa thành công ${result.deletedCount} điểm khởi hành!`,
            deletedCount: result.deletedCount,
            pagination: {
                currentPage: currentPage,
                redirectPage: redirectPage,
                totalPages: totalPages,
                totalRemainingDepartures: totalRemainingDepartures,
                needsRedirect: redirectPage !== currentPage
            }
        });
    } catch (error) {
        console.error("Error deleting multiple departures:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa điểm khởi hành!",
        });
    }
};

//-- API Methods --

// Lấy danh sách điểm khởi hành API
exports.getAll = async (req, res) => {
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
                    { createdBy: { $regex: search, $options: "i" } },
                ],
            };
        }

        const [departures, total] = await Promise.all([
            Departure.find(searchQuery)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: 1 }),
            Departure.countDocuments(searchQuery),
        ]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: departures,
            pagination: {
                current: page,
                total: totalPages,
                limit,
                totalItems: total,
            },
        });
    } catch (error) {
        console.error("Error in getAll departures API:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải danh sách điểm khởi hành",
        });
    }
};

// Lấy thông tin điểm khởi hành theo ID API
exports.getById = async (req, res) => {
    try {
        const departure = await Departure.findById(req.params.id);
        
        if (!departure) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy điểm khởi hành",
            });
        }

        res.status(200).json({
            success: true,
            data: departure,
        });
    } catch (error) {
        console.error("Error in getById departure API:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải thông tin điểm khởi hành",
        });
    }
};

// Tạo điểm khởi hành mới qua API
exports.apiCreate = async (req, res) => {
    try {
        const { name } = req.body;

        // Validate input
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Tên điểm khởi hành không được để trống",
            });
        }

        // Check if name already exists
        const existingDeparture = await Departure.findOne({
            name: name.trim(),
        });

        if (existingDeparture) {
            return res.status(400).json({
                success: false,
                message: "Tên điểm khởi hành đã tồn tại",
            });
        }

        // Generate slug
        const slug = generateSlug(name);

        const newDeparture = new Departure({
            name: name.trim(),
            slug,
            status: "Hoạt động",
            createdBy: req.session.user ? req.session.user.name : "Admin",
        });

        await newDeparture.save();

        res.status(201).json({
            success: true,
            message: "Thêm điểm khởi hành thành công",
            data: newDeparture,
        });
    } catch (error) {
        console.error("Error in apiCreate departure:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thêm điểm khởi hành",
        });
    }
};

// Cập nhật điểm khởi hành qua API
exports.apiUpdate = async (req, res) => {
    try {
        const { name } = req.body;
        const departureId = req.params.id;

        // Validate input
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Tên điểm khởi hành không được để trống",
            });
        }

        // Check if departure exists
        const existingDeparture = await Departure.findById(departureId);
        if (!existingDeparture) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy điểm khởi hành",
            });
        }

        // Check if name already exists (excluding current departure)
        const nameExists = await Departure.findOne({
            name: name.trim(),
            _id: { $ne: departureId },
        });

        if (nameExists) {
            return res.status(400).json({
                success: false,
                message: "Tên điểm khởi hành đã tồn tại",
            });
        }

        // Update departure
        const updatedDeparture = await Departure.findByIdAndUpdate(
            departureId,
            {
                name: name.trim(),
                slug: generateSlug(name),
                updatedBy: req.session.user ? req.session.user.name : "Admin",
                updatedAt: new Date(),
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Cập nhật điểm khởi hành thành công",
            data: updatedDeparture,
        });
    } catch (error) {
        console.error("Error in apiUpdate departure:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi cập nhật điểm khởi hành",
        });
    }
};

// Xóa điểm khởi hành qua API
exports.apiDelete = async (req, res) => {
    try {
        const departureId = req.params.id;

        // Check if departure exists
        const departure = await Departure.findById(departureId);
        if (!departure) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy điểm khởi hành",
            });
        }

        // Delete departure
        await Departure.findByIdAndDelete(departureId);

        res.status(200).json({
            success: true,
            message: "Xóa điểm khởi hành thành công",
        });
    } catch (error) {
        console.error("Error in apiDelete departure:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa điểm khởi hành",
        });
    }
};

// Thay đổi trạng thái điểm khởi hành qua API
exports.apiToggleStatus = async (req, res) => {
    try {
        const departureId = req.params.id;

        // Check if departure exists
        const departure = await Departure.findById(departureId);
        if (!departure) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy điểm khởi hành",
            });
        }

        // Toggle status
        const newStatus = departure.status === "Hoạt động" ? "Không hoạt động" : "Hoạt động";

        const updatedDeparture = await Departure.findByIdAndUpdate(
            departureId,
            {
                status: newStatus,
                updatedBy: req.session.user ? req.session.user.name : "Admin",
                updatedAt: new Date(),
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: `Đã ${newStatus === "Hoạt động" ? "kích hoạt" : "vô hiệu hóa"} điểm khởi hành thành công`,
            data: updatedDeparture,
        });
    } catch (error) {
        console.error("Error in apiToggleStatus departure:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thay đổi trạng thái điểm khởi hành",
        });
    }
};
