const Transportation = require("../models/transportationModel");
const { generateSlug, checkTitleExists } = require("../utils/slugGenerator");
const {
    getCreateTrackingInfo,
    getUpdateTrackingInfo,
} = require("../utils/trackingUtils");

// Hiển thị danh sách (có phân trang)
exports.list = async (req, res) => {
    // Không redirect nữa, chỉ render view với thông báo lỗi nếu không có quyền
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = { deleted: false };
        if (search) {
            searchQuery.$or = [
                { title: { $regex: search, $options: "i" } },
                { information: { $regex: search, $options: "i" } },
            ];
        }

        const [transportations, total] = await Promise.all([
            Transportation.find(searchQuery)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: 1 }),
            Transportation.countDocuments(searchQuery),
        ]);

        const totalPages = Math.ceil(total / limit);

        if (page > totalPages && totalPages > 0) {
            const redirectUrl = `/transportation?page=${totalPages}${
                search ? `&search=${encodeURIComponent(search)}` : ""
            }&limit=${limit}`;
            return res.redirect(redirectUrl);
        }

        res.render("transportation", {
            transportations,
            search,
            pagination: {
                current: page,
                total: totalPages,
                limit,
                totalItems: total,
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
        req.flash("error", "Lỗi khi tải danh sách phương tiện");
        res.redirect("/dashboard");
    }
};

// Hiển thị form thêm mới
exports.showAddForm = (req, res) => {
    res.render("transportation/add", {
        message: req.flash("success"),
        error: req.flash("error"),
        userPermissions: res.locals.userPermissions, // Đảm bảo luôn truyền userPermissions
    });
};

// Xử lý thêm mới
exports.create = async (req, res) => {
    try {
        const { title, information } = req.body;

        // Check if it's an AJAX request
        const isAjax =
            req.xhr ||
            req.headers["x-requested-with"] === "XMLHttpRequest" ||
            req.headers.accept?.includes("application/json");

        // Validate input
        if (!title || !title.trim()) {
            const errorMessage = "Tên phương tiện không được để trống";
            if (isAjax) {
                return res
                    .status(400)
                    .json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect("/transportation/add");
        }

        if (title.trim().length < 2) {
            const errorMessage = "Tên phương tiện phải có ít nhất 2 ký tự";
            if (isAjax) {
                return res
                    .status(400)
                    .json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect("/transportation/add");
        }

        // Check if transportation title already exists
        const trimmedTitle = title.trim();
        console.log(
            "Checking for existing transportation with title:",
            trimmedTitle
        );

        const titleExists = await checkTitleExists(
            Transportation,
            trimmedTitle
        );

        if (titleExists) {
            const errorMessage = "Tên phương tiện đã tồn tại";
            if (isAjax) {
                return res
                    .status(400)
                    .json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect("/transportation/add");
        }

        // Generate unique slug
        const { slug, fullSlug } = generateSlug(trimmedTitle, "transportation");

        // Get tracking information
        const trackingInfo = getCreateTrackingInfo(req);

        const newTransportation = await Transportation.create({
            title: trimmedTitle,
            slug,
            fullSlug,
            information: information ? information.trim() : "",
            ...trackingInfo,
        });

        const successMessage = "Thêm phương tiện thành công";

        if (isAjax) {
            return res.json({ success: true, message: successMessage });
        }

        req.flash("success", successMessage);
        res.redirect("/transportation");
    } catch (error) {
        console.error("Error creating transportation:", error);

        const isAjax =
            req.xhr ||
            req.headers["x-requested-with"] === "XMLHttpRequest" ||
            req.headers.accept?.includes("application/json");

        // Handle specific errors
        let errorMessage = "Có lỗi xảy ra khi tạo phương tiện";

        if (error.code === 11000) {
            if (error.keyPattern && error.keyPattern.title) {
                errorMessage = "Tên phương tiện đã tồn tại";
            } else if (error.keyPattern && error.keyPattern.slug) {
                errorMessage = "Slug phương tiện đã tồn tại";
            } else if (error.keyPattern && error.keyPattern.fullSlug) {
                errorMessage = "FullSlug phương tiện đã tồn tại";
            } else {
                errorMessage = "Dữ liệu đã tồn tại trong hệ thống";
            }
        } else if (error.name === "ValidationError") {
            const firstError = Object.values(error.errors)[0];
            errorMessage = firstError
                ? firstError.message
                : "Dữ liệu không hợp lệ";
        }

        if (isAjax) {
            return res
                .status(500)
                .json({ success: false, message: errorMessage });
        }

        req.flash("error", errorMessage);
        res.redirect("/transportation/add");
    }
};

// Hiển thị form sửa
exports.showEditForm = async (req, res) => {
    try {
        const transportation = await Transportation.findById(req.params.id);
        if (!transportation) {
            req.flash("error", "Không tìm thấy phương tiện");
            return res.redirect("/transportation");
        }
        res.render("transportation/edit", {
            transportation,
            message: req.flash("success"),
            error: req.flash("error"),
            userPermissions: res.locals.userPermissions, // Thêm dòng này
        });
    } catch (error) {
        req.flash("error", "Lỗi khi tải thông tin phương tiện");
        res.redirect("/transportation");
    }
};

// Xử lý cập nhật
exports.update = async (req, res) => {
    try {
        const { title, information, status } = req.body;
        const transportationId = req.params.id;

        // Check if it's an AJAX request
        const isAjax =
            req.xhr ||
            req.headers["x-requested-with"] === "XMLHttpRequest" ||
            req.headers.accept?.includes("application/json");

        // Validate input
        if (!title || !title.trim()) {
            const errorMessage = "Tên phương tiện không được để trống";
            if (isAjax) {
                return res
                    .status(400)
                    .json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect(`/transportation/edit/${transportationId}`);
        }

        if (title.trim().length < 2) {
            const errorMessage = "Tên phương tiện phải có ít nhất 2 ký tự";
            if (isAjax) {
                return res
                    .status(400)
                    .json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect(`/transportation/edit/${transportationId}`);
        }

        // Check if transportation title already exists (excluding current transportation)
        const trimmedTitle = title.trim();
        console.log(
            "Checking for existing transportation with title (excluding current):",
            trimmedTitle,
            "transportationId:",
            transportationId
        );

        const titleExists = await checkTitleExists(
            Transportation,
            trimmedTitle,
            transportationId
        );

        if (titleExists) {
            const errorMessage = "Tên phương tiện đã tồn tại";
            if (isAjax) {
                return res
                    .status(400)
                    .json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect(`/transportation/edit/${transportationId}`);
        }

        // Generate unique slug
        const { slug, fullSlug } = generateSlug(trimmedTitle, "transportation");

        // Get tracking information
        const trackingInfo = getUpdateTrackingInfo(req);

        await Transportation.findByIdAndUpdate(transportationId, {
            title: trimmedTitle,
            slug,
            fullSlug,
            information: information ? information.trim() : "",
            status: status === "true",
            ...trackingInfo,
        });

        const successMessage = "Cập nhật phương tiện thành công";

        if (isAjax) {
            return res.json({ success: true, message: successMessage });
        }

        req.flash("success", successMessage);
        res.redirect("/transportation");
    } catch (error) {
        console.error("Error updating transportation:", error);

        const isAjax =
            req.xhr ||
            req.headers["x-requested-with"] === "XMLHttpRequest" ||
            req.headers.accept?.includes("application/json");

        // Handle specific errors
        let errorMessage = "Có lỗi xảy ra khi cập nhật phương tiện";

        if (error.code === 11000) {
            if (error.keyPattern && error.keyPattern.title) {
                errorMessage = "Tên phương tiện đã tồn tại";
            } else if (error.keyPattern && error.keyPattern.slug) {
                errorMessage = "Slug phương tiện đã tồn tại";
            } else if (error.keyPattern && error.keyPattern.fullSlug) {
                errorMessage = "FullSlug phương tiện đã tồn tại";
            } else {
                errorMessage = "Dữ liệu đã tồn tại trong hệ thống";
            }
        } else if (error.name === "ValidationError") {
            const firstError = Object.values(error.errors)[0];
            errorMessage = firstError
                ? firstError.message
                : "Dữ liệu không hợp lệ";
        }

        if (isAjax) {
            return res
                .status(500)
                .json({ success: false, message: errorMessage });
        }

        req.flash("error", errorMessage);
        res.redirect("/transportation");
    }
};

// Xử lý xóa (soft delete)
exports.delete = async (req, res) => {
    try {
        const userRole = req.user?.role || "System";
        await Transportation.findByIdAndUpdate(req.params.id, {
            deleted: true,
            deletedBy: userRole,
        });

        // Handle AJAX request
        if (req.xhr || req.get("X-Requested-With") === "XMLHttpRequest") {
            // Calculate pagination after deletion for AJAX requests
            const currentPage = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 5;

            // Build search query to count remaining items
            const search = req.query.search ? req.query.search.trim() : "";
            const searchQuery = search
                ? {
                      $and: [
                          { deleted: false },
                          {
                              $or: [
                                  { name: { $regex: search, $options: "i" } },
                                  { description: { $regex: search, $options: "i" } },
                                  { createdBy: { $regex: search, $options: "i" } },
                              ],
                          },
                      ],
                  }
                : { deleted: false };

            // Count remaining transportations
            const totalRemainingTransportations = await Transportation.countDocuments(searchQuery);
            const totalPages = Math.ceil(totalRemainingTransportations / limit);

            // Calculate proper page to redirect to
            let redirectPage = currentPage;
            if (currentPage > totalPages && totalPages > 0) {
                redirectPage = totalPages;
            } else if (totalPages === 0) {
                redirectPage = 1;
            }

            return res.json({
                success: true,
                message: "Xóa phương tiện thành công",
                pagination: {
                    currentPage: currentPage,
                    redirectPage: redirectPage,
                    totalPages: totalPages,
                    totalRemainingTransportations: totalRemainingTransportations,
                    needsRedirect: redirectPage !== currentPage
                }
            });
        }

        req.flash("success", "Xóa phương tiện thành công");
        res.redirect("/transportation");
    } catch (error) {
        // Handle AJAX request error
        if (req.xhr || req.get("X-Requested-With") === "XMLHttpRequest") {
            return res.status(500).json({
                success: false,
                message: "Lỗi khi xóa phương tiện"
            });
        }

        req.flash("error", "Lỗi khi xóa phương tiện");
        res.redirect("/transportation");
    }
};

// Toggle trạng thái
exports.toggleStatus = async (req, res) => {
    try {
        const transportation = await Transportation.findById(req.params.id);
        if (!transportation) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phương tiện",
            });
        }

        const newStatus = !transportation.status;
        await Transportation.findByIdAndUpdate(req.params.id, {
            status: newStatus,
            updatedBy: req.user?.fullName || "System",
        });

        res.json({
            success: true,
            status: newStatus,
            message: `Đã ${newStatus ? "kích hoạt" : "tạm dừng"} phương tiện`,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật trạng thái",
        });
    }
};

// Xử lý xóa nhiều (soft delete)
exports.deleteMultiple = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Không có phương tiện nào được chọn để xóa",
            });
        }

        const adminId = req.user?._id;

        // Soft delete multiple transportations
        const result = await Transportation.updateMany(
            { _id: { $in: ids }, deleted: false },
            {
                deleted: true,
                deletedBy: adminId,
                updatedAt: new Date(),
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Không tìm thấy phương tiện nào để xóa hoặc phương tiện đã bị xóa",
            });
        }

        // Calculate proper redirect page after deletion
        const currentPage = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;

        // Build search query to count remaining items
        const search = req.query.search ? req.query.search.trim() : "";
        const searchQuery = search
            ? {
                  $and: [
                      { deleted: false },
                      {
                          $or: [
                              { name: { $regex: search, $options: "i" } },
                              { description: { $regex: search, $options: "i" } },
                              { createdBy: { $regex: search, $options: "i" } },
                          ],
                      },
                  ],
              }
            : { deleted: false };

        // Count remaining transportations
        const totalRemainingTransportations = await Transportation.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalRemainingTransportations / limit);

        // Calculate proper page to redirect to
        let redirectPage = currentPage;
        if (currentPage > totalPages && totalPages > 0) {
            redirectPage = totalPages;
        } else if (totalPages === 0) {
            redirectPage = 1;
        }

        res.json({
            success: true,
            message: `Đã xóa thành công ${result.modifiedCount} phương tiện`,
            deletedCount: result.modifiedCount,
            pagination: {
                currentPage: currentPage,
                redirectPage: redirectPage,
                totalPages: totalPages,
                totalRemainingTransportations: totalRemainingTransportations,
                needsRedirect: redirectPage !== currentPage
            }
        });
    } catch (error) {
        console.error("Error deleting multiple transportations:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa phương tiện",
        });
    }
};


//-- API Methods --

// Lấy danh sách phương tiện API
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
                    { description: { $regex: search, $options: "i" } },
                    { createdBy: { $regex: search, $options: "i" } },
                ],
            };
        }

        const [transportations, total] = await Promise.all([
            Transportation.find(searchQuery)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: 1 }),
            Transportation.countDocuments(searchQuery),
        ]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: transportations,
            pagination: {
                current: page,
                total: totalPages,
                limit,
                totalItems: total,
            },
        });
    } catch (error) {
        console.error("Error in getAll transportations API:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải danh sách phương tiện",
        });
    }
};

// Lấy thông tin phương tiện theo ID API
exports.getById = async (req, res) => {
    try {
        const transportation = await Transportation.findById(req.params.id);
        
        if (!transportation) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phương tiện",
            });
        }

        res.status(200).json({
            success: true,
            data: transportation,
        });
    } catch (error) {
        console.error("Error in getById transportation API:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải thông tin phương tiện",
        });
    }
};

// Tạo phương tiện mới qua API
exports.apiCreate = async (req, res) => {
    try {
        const { name, description, type } = req.body;

        // Validate input
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Tên phương tiện không được để trống",
            });
        }

        // Check if name already exists
        const existingTransportation = await Transportation.findOne({
            name: name.trim(),
        });

        if (existingTransportation) {
            return res.status(400).json({
                success: false,
                message: "Tên phương tiện đã tồn tại",
            });
        }

        // Create new transportation
        const newTransportation = new Transportation({
            name: name.trim(),
            description: description ? description.trim() : "",
            type: type || "Mặt đất",
            status: "Hoạt động",
            createdBy: req.session.user ? req.session.user.name : "Admin",
        });

        await newTransportation.save();

        res.status(201).json({
            success: true,
            message: "Thêm phương tiện thành công",
            data: newTransportation,
        });
    } catch (error) {
        console.error("Error in apiCreate transportation:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thêm phương tiện",
        });
    }
};

// Cập nhật phương tiện qua API
exports.apiUpdate = async (req, res) => {
    try {
        const { name, description, type } = req.body;
        const transportationId = req.params.id;

        // Validate input
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Tên phương tiện không được để trống",
            });
        }

        // Check if transportation exists
        const existingTransportation = await Transportation.findById(transportationId);
        if (!existingTransportation) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phương tiện",
            });
        }

        // Check if name already exists (excluding current transportation)
        const nameExists = await Transportation.findOne({
            name: name.trim(),
            _id: { $ne: transportationId },
        });

        if (nameExists) {
            return res.status(400).json({
                success: false,
                message: "Tên phương tiện đã tồn tại",
            });
        }

        // Update transportation
        const updatedTransportation = await Transportation.findByIdAndUpdate(
            transportationId,
            {
                name: name.trim(),
                description: description ? description.trim() : "",
                type: type || existingTransportation.type,
                updatedBy: req.session.user ? req.session.user.name : "Admin",
                updatedAt: new Date(),
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Cập nhật phương tiện thành công",
            data: updatedTransportation,
        });
    } catch (error) {
        console.error("Error in apiUpdate transportation:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi cập nhật phương tiện",
        });
    }
};

// Xóa phương tiện qua API
exports.apiDelete = async (req, res) => {
    try {
        const transportationId = req.params.id;

        // Check if transportation exists
        const transportation = await Transportation.findById(transportationId);
        if (!transportation) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phương tiện",
            });
        }

        // Delete transportation
        await Transportation.findByIdAndDelete(transportationId);

        res.status(200).json({
            success: true,
            message: "Xóa phương tiện thành công",
        });
    } catch (error) {
        console.error("Error in apiDelete transportation:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa phương tiện",
        });
    }
};

// Thay đổi trạng thái phương tiện qua API
exports.apiToggleStatus = async (req, res) => {
    try {
        const transportationId = req.params.id;

        // Check if transportation exists
        const transportation = await Transportation.findById(transportationId);
        if (!transportation) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phương tiện",
            });
        }

        // Toggle status
        const newStatus = transportation.status === "Hoạt động" ? "Không hoạt động" : "Hoạt động";

        const updatedTransportation = await Transportation.findByIdAndUpdate(
            transportationId,
            {
                status: newStatus,
                updatedBy: req.session.user ? req.session.user.name : "Admin",
                updatedAt: new Date(),
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: `Đã ${newStatus === "Hoạt động" ? "kích hoạt" : "vô hiệu hóa"} phương tiện thành công`,
            data: updatedTransportation,
        });
    } catch (error) {
        console.error("Error in apiToggleStatus transportation:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thay đổi trạng thái phương tiện",
        });
    }
};
