const Destination = require("../models/destinationModel");
const { cloudinary } = require("../config/cloudinary");
const {
    deleteImageFromCloudinary,
    deleteMultipleImagesFromCloudinary,
} = require("../utils/imageUtils");
const { generateSlug, checkNameExists } = require("../utils/slugGenerator");
const { generateDestinationUrlPath } = require("../utils/dynamicUrlGenerator");
const { 
    CONTINENTS, 
    getAllCountries, 
    getCountriesByContinent,
    getContinentByCountry 
} = require("../constants/countries");

// Hiển thị danh sách điểm đến với phân trang
exports.list = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = {};
        if (search) {
            searchQuery = {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { info: { $regex: search, $options: "i" } },
                    { createdBy: { $regex: search, $options: "i" } },
                    { country: { $regex: search, $options: "i" } },
                    { continent: { $regex: search, $options: "i" } },
                    { type: { $regex: search, $options: "i" } },
                ],
            };
        }

        const [destinations, total] = await Promise.all([
            Destination.find(searchQuery)
                .skip(skip)
                .limit(limit)
                .sort({ _id: 1 }), // Sort from old to new (new records at bottom)
            Destination.countDocuments(searchQuery),
        ]);



        const totalPages = Math.ceil(total / limit);

        // Pagination data
        const pagination = {
            current: page,
            total: totalPages,
            limit: limit,
            hasPrev: page > 1,
            hasNext: page < totalPages,
            startIndex: skip,
            endIndex: Math.min(skip + limit, total),
            totalItems: total,
        };

        res.render("destination", {
            destinations,
            pagination,
            search,
            currentPage: page,
            totalPages,
            message: req.flash("success"),
            error: req.flash("error"),
            userPermissions: res.locals.userPermissions // Đảm bảo luôn truyền userPermissions
        });
    } catch (error) {
        console.error("Error in destination list:", error);
        req.flash("error", "Có lỗi xảy ra khi tải danh sách điểm đến");
        res.redirect("/destination");
    }
};

// Hiển thị form thêm mới
exports.showAddForm = async (req, res) => {
    try {
        res.render("destination/add", {
            continents: CONTINENTS, // Danh sách châu lục
            countries: getAllCountries(), // Tất cả quốc gia
            message: req.flash("success"),
            error: req.flash("error"),
            userPermissions: res.locals.userPermissions // Đảm bảo luôn truyền userPermissions
        });
    } catch (error) {
        console.error("Error in showAddForm:", error);
        req.flash("error", "Có lỗi xảy ra khi tải form thêm mới");
        res.redirect("/destination");
    }
};

// Xử lý thêm mới (có upload ảnh)
exports.create = async (req, res) => {
    try {


        const { name, info, country, continent, type } = req.body;

        // Check if it's an AJAX request
        const isAjax = req.xhr || req.headers.accept?.indexOf("json") > -1;

        // Validate required fields
        if (!name || name.trim() === "") {
            const errorMessage = "Tên điểm đến không được để trống";
            if (isAjax) {
                return res
                    .status(400)
                    .json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect("/destination/add");
        }

        // Check if destination name already exists
        const trimmedName = name.trim();

        const nameExists = await checkNameExists(Destination, trimmedName);

        if (nameExists) {
            const errorMessage = "Tên điểm đến đã tồn tại";
            if (isAjax) {
                return res
                    .status(400)
                    .json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect("/destination/add");
        }

        let image = "";
        if (req.file) {
            // Cloudinary automatically provides the secure URL
            image = req.file.path; // This will be the Cloudinary URL
        }

        // Generate unique slug
        const { slug, fullSlug } = generateSlug(trimmedName, "destination");

        const newDestination = {
            name: trimmedName,
            slug,
            fullSlug,
            info: info ? info.trim() : "",
            image,
            status: "Hoạt động", // Mặc định là Hoạt động
            country: country ? country.trim() : null,
            continent: continent ? continent.trim() : null,
            type: type ? type.trim() : "Trong nước", // Mặc định là Trong nước
            createdBy: req.user?.fullName || "System",
            updatedBy: req.user?.fullName || "System",
        };



        await Destination.create(newDestination);

        const successMessage = "Thêm điểm đến thành công!";

        req.flash("success", successMessage);
        res.redirect("/destination");
    } catch (error) {
        console.error("Error in create:", error);

        const isAjax = req.xhr || req.headers.accept?.indexOf("json") > -1;

        // Handle specific errors
        let errorMessage = "Có lỗi xảy ra khi thêm điểm đến";

        if (error.code === 11000) {
            if (error.keyPattern && error.keyPattern.name) {
                errorMessage = "Tên điểm đến đã tồn tại";
            } else if (error.keyPattern && error.keyPattern.slug) {
                errorMessage = "Slug điểm đến đã tồn tại";
            } else if (error.keyPattern && error.keyPattern.fullSlug) {
                errorMessage = "FullSlug điểm đến đã tồn tại";
            } else {
                errorMessage = "Dữ liệu đã tồn tại trong hệ thống";
            }
        } else if (error.name === "ValidationError") {
            const firstError = Object.values(error.errors)[0];
            errorMessage = firstError
                ? firstError.message
                : "Dữ liệu không hợp lệ";
        }

        // Check if this is an AJAX request
        if (isAjax) {
            return res.status(500).json({
                success: false,
                message: errorMessage,
            });
        }

        req.flash("error", errorMessage);
        res.redirect("/destination/add");
    }
};

// Hiển thị form sửa
exports.showEditForm = async (req, res) => {
    try {
        const destination = await Destination.findById(req.params.id);
        if (!destination) {
            req.flash("error", "Không tìm thấy điểm đến");
            return res.redirect("/destination");
        }

        res.render("destination/edit", {
            destination,
            continents: CONTINENTS, // Danh sách châu lục
            countries: getAllCountries(), // Tất cả quốc gia
            message: req.flash("success"),
            error: req.flash("error"),
            userPermissions: res.locals.userPermissions // Đảm bảo luôn truyền userPermissions
        });
    } catch (error) {
        console.error("Error in showEditForm:", error);
        req.flash("error", "Có lỗi xảy ra khi tải form chỉnh sửa");
        res.redirect("/destination");
    }
};

// Xử lý cập nhật
exports.update = async (req, res) => {
    try {


        const { name, info, country, continent, type } = req.body;
        const destinationId = req.params.id;

        // Check if it's an AJAX request
        const isAjax = req.body.ajax === '1' ||
                    req.xhr ||
                    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                    req.headers.accept?.indexOf("json") > -1;

        // Validate required fields
        if (!name || !name.trim()) {
            const errorMessage = "Tên điểm đến không được để trống";
            if (isAjax) {
                return res
                    .status(400)
                    .json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect("/destination/edit/" + destinationId);
        }

        if (name.trim().length < 2) {
            const errorMessage = "Tên điểm đến phải có ít nhất 2 ký tự";
            if (isAjax) {
                return res
                    .status(400)
                    .json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect("/destination/edit/" + destinationId);
        }

        // Check if destination name already exists (excluding current destination)
        const trimmedName = name.trim();

        const nameExists = await checkNameExists(
            Destination,
            trimmedName,
            destinationId
        );

        if (nameExists) {
            const errorMessage = "Tên điểm đến đã tồn tại";
            if (isAjax) {
                return res
                    .status(400)
                    .json({ success: false, message: errorMessage });
            }
            req.flash("error", errorMessage);
            return res.redirect("/destination/edit/" + destinationId);
        }

        // Generate unique slug
        const { slug, fullSlug } = generateSlug(trimmedName, "destination");

        let updateData = {
            name: trimmedName,
            slug,
            fullSlug,
            info: info ? info.trim() : "",
            country: country ? country.trim() : null,
            continent: continent ? continent.trim() : null,
            type: type ? type.trim() : "Trong nước",
            updatedBy: req.user?.fullName || "System",
        };

        if (req.file) {
            // Get old image URL to delete from Cloudinary if needed
            const oldDestination = await Destination.findById(destinationId);
            if (oldDestination && oldDestination.image) {
                // Delete old image from Cloudinary
                await deleteImageFromCloudinary(oldDestination.image);
            }

            updateData.image = req.file.path; // Cloudinary URL
        }



        await Destination.findByIdAndUpdate(destinationId, updateData);

        const successMessage = "Cập nhật điểm đến thành công!";

        // Check if this is an AJAX request
        if (isAjax) {
            return res.json({ success: true, message: successMessage });
        }

        req.flash("success", successMessage);
        res.redirect("/destination");
    } catch (error) {
        console.error("Error in update:", error);

        // Use the same isAjax detection as in the try block
        const isAjax = req.body.ajax === '1' ||
                      req.xhr ||
                      req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                      req.headers.accept?.indexOf("json") > -1;

        // Handle specific errors
        let errorMessage = "Có lỗi xảy ra khi cập nhật điểm đến";

        if (error.code === 11000) {
            if (error.keyPattern && error.keyPattern.name) {
                errorMessage = "Tên điểm đến đã tồn tại";
            } else if (error.keyPattern && error.keyPattern.slug) {
                errorMessage = "Slug điểm đến đã tồn tại";
            } else if (error.keyPattern && error.keyPattern.fullSlug) {
                errorMessage = "FullSlug điểm đến đã tồn tại";
            } else {
                errorMessage = "Dữ liệu đã tồn tại trong hệ thống";
            }
        } else if (error.name === "ValidationError") {
            const firstError = Object.values(error.errors)[0];
            errorMessage = firstError
                ? firstError.message
                : "Dữ liệu không hợp lệ";
        }

        // Check if this is an AJAX request
        if (isAjax) {
            return res.status(500).json({
                success: false,
                message: errorMessage,
            });
        }

        req.flash("error", errorMessage);
        res.redirect("/destination/edit/" + req.params.id);
    }
};

// Xử lý xóa
exports.delete = async (req, res) => {
    try {
        // Get destination to delete associated image
        const destination = await Destination.findById(req.params.id);
        if (destination && destination.image) {
            await deleteImageFromCloudinary(destination.image);
        }

        await Destination.findByIdAndDelete(req.params.id);

        // Check if this is an AJAX request
        if (req.xhr || req.headers.accept.indexOf("json") > -1) {
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

            // Count remaining destinations
            const totalRemainingDestinations = await Destination.countDocuments(searchQuery);
            const totalPages = Math.ceil(totalRemainingDestinations / limit);

            // Calculate proper page to redirect to
            let redirectPage = currentPage;
            if (currentPage > totalPages && totalPages > 0) {
                redirectPage = totalPages;
            } else if (totalPages === 0) {
                redirectPage = 1;
            }

            return res.json({
                success: true,
                message: "Xóa điểm đến thành công!",
                pagination: {
                    currentPage: currentPage,
                    redirectPage: redirectPage,
                    totalPages: totalPages,
                    totalRemainingDestinations: totalRemainingDestinations,
                    needsRedirect: redirectPage !== currentPage
                }
            });
        }

        req.flash("success", "Xóa điểm đến thành công!");
        res.redirect("/destination");
    } catch (error) {
        console.error("Error in delete:", error);

        // Check if this is an AJAX request
        if (req.xhr || req.headers.accept.indexOf("json") > -1) {
            return res.status(500).json({
                success: false,
                message: "Có lỗi xảy ra khi xóa điểm đến: " + error.message,
            });
        }

        req.flash("error", "Có lỗi xảy ra khi xóa điểm đến: " + error.message);
        res.redirect("/destination");
    }
};

// Toggle status
exports.toggleStatus = async (req, res) => {
    try {
        const destination = await Destination.findById(req.params.id);
        if (!destination) {
            return res
                .status(404)
                .json({ success: false, message: "Không tìm thấy điểm đến" });
        }

        const newStatus =
            destination.status === "Hoạt động" ? "Tạm dừng" : "Hoạt động";
        destination.status = newStatus;
        destination.updatedBy = req.user?.fullName || "System";
        await destination.save();

        res.json({
            success: true,
            status: newStatus,
            message: `Đã ${
                newStatus === "Hoạt động" ? "kích hoạt" : "tạm dừng"
            } điểm đến thành công`,
        });
    } catch (error) {
        console.error("Error toggling status:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thay đổi trạng thái",
        });
    }
};

// Delete multiple
exports.deleteMultiple = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res
                .status(400)
                .json({ success: false, message: "Danh sách ID không hợp lệ" });
        }

        // Get destinations to delete associated images
        const destinations = await Destination.find({ _id: { $in: ids } });

        // Delete images from Cloudinary
        const imageUrls = destinations
            .map((dest) => dest.image)
            .filter(Boolean);
        if (imageUrls.length > 0) {
            await deleteMultipleImagesFromCloudinary(imageUrls);
        }

        const result = await Destination.deleteMany({ _id: { $in: ids } });

        if (result.deletedCount > 0) {
            // Calculate proper redirect page after deletion
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

            // Count remaining destinations
            const totalRemainingDestinations = await Destination.countDocuments(searchQuery);
            const totalPages = Math.ceil(totalRemainingDestinations / limit);

            // Calculate proper page to redirect to
            let redirectPage = currentPage;
            if (currentPage > totalPages && totalPages > 0) {
                redirectPage = totalPages;
            } else if (totalPages === 0) {
                redirectPage = 1;
            }

            return res.json({
                success: true,
                message: `Đã xóa thành công ${result.deletedCount} điểm đến`,
                deletedCount: result.deletedCount,
                pagination: {
                    currentPage: currentPage,
                    redirectPage: redirectPage,
                    totalPages: totalPages,
                    totalRemainingDestinations: totalRemainingDestinations,
                    needsRedirect: redirectPage !== currentPage
                }
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Không có điểm đến nào được xóa",
            });
        }
    } catch (error) {
        console.error("Error deleting multiple:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa điểm đến",
        });
    }
};

//-- API Methods --

// Lấy danh sách điểm đến API
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
                    { info: { $regex: search, $options: "i" } },
                    { createdBy: { $regex: search, $options: "i" } },
                ],
            };
        }

        const [destinations, total] = await Promise.all([
            Destination.find(searchQuery)
                .skip(skip)
                .limit(limit)
                .sort({ _id: 1 }),
            Destination.countDocuments(searchQuery),
        ]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: destinations,
            pagination: {
                current: page,
                total: totalPages,
                limit,
                totalItems: total,
            },
        });
    } catch (error) {
        console.error("Error in getAll destinations API:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải danh sách điểm đến",
        });
    }
};

// Lấy thông tin điểm đến theo ID API
exports.getById = async (req, res) => {
    try {
        const destination = await Destination.findById(req.params.id);
        
        if (!destination) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy điểm đến",
            });
        }

        res.status(200).json({
            success: true,
            data: destination,
        });
    } catch (error) {
        console.error("Error in getById destination API:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải thông tin điểm đến",
        });
    }
};

// Tạo điểm đến mới qua API
exports.apiCreate = async (req, res) => {
    try {
        const { name, info, country, continent, type } = req.body;

        // Validate input
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Tên điểm đến không được để trống",
            });
        }

        // Check if name already exists
        const nameExists = await checkNameExists(name, Destination);
        if (nameExists) {
            return res.status(400).json({
                success: false,
                message: "Tên điểm đến đã tồn tại",
            });
        }

        // Handle image upload
        let imageUrl = "";
        let publicId = "";
        
        if (req.file && req.file.path) {
            imageUrl = req.file.path;
            publicId = req.file.filename;
        }

        // Generate slug
        const slug = generateSlug(name);

        const newDestination = new Destination({
            name: name.trim(),
            slug,
            info: info ? info.trim() : "",
            country: country ? country.trim() : null,
            continent: continent ? continent.trim() : null,
            type: type ? type.trim() : "Trong nước",
            image: imageUrl,
            cloudinaryId: publicId,
            status: "Hoạt động",
            createdBy: req.session.user ? req.session.user.name : "Admin",
        });

        await newDestination.save();

        res.status(201).json({
            success: true,
            message: "Thêm điểm đến thành công",
            data: newDestination,
        });
    } catch (error) {
        console.error("Error in apiCreate destination:", error);
        
        // Delete uploaded image if there was an error
        if (req.file && req.file.path && req.file.filename) {
            await deleteImageFromCloudinary(req.file.filename);
        }
        
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thêm điểm đến",
        });
    }
};

// Cập nhật điểm đến qua API
exports.apiUpdate = async (req, res) => {
    try {
        const { name, info, country, continent, type, status } = req.body;
        const destinationId = req.params.id;

        // Validate input
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Tên điểm đến không được để trống",
            });
        }

        // Check if destination exists
        const existingDestination = await Destination.findById(destinationId);
        if (!existingDestination) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy điểm đến",
            });
        }

        // Check if name already exists (excluding current destination)
        const nameExists = await Destination.findOne({ 
            name: name.trim(), 
            _id: { $ne: destinationId } 
        });
        
        if (nameExists) {
            return res.status(400).json({
                success: false,
                message: "Tên điểm đến đã tồn tại",
            });
        }

        // Handle image upload
        let imageUrl = existingDestination.image;
        let publicId = existingDestination.cloudinaryId;
        
        if (req.file && req.file.path) {
            // Delete old image if it exists
            if (existingDestination.cloudinaryId) {
                await deleteImageFromCloudinary(existingDestination.cloudinaryId);
            }
            
            imageUrl = req.file.path;
            publicId = req.file.filename;
        }

        // Update destination
        const updatedDestination = await Destination.findByIdAndUpdate(
            destinationId,
            {
                name: name.trim(),
                slug: generateSlug(name),
                info: info ? info.trim() : "",
                country: country ? country.trim() : null,
                continent: continent ? continent.trim() : null,
                type: type ? type.trim() : "Trong nước",
                image: imageUrl,
                cloudinaryId: publicId,
                status: status || existingDestination.status,
                updatedBy: req.session.user ? req.session.user.name : "Admin",
                updatedAt: new Date(),
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Cập nhật điểm đến thành công",
            data: updatedDestination,
        });
    } catch (error) {
        console.error("Error in apiUpdate destination:", error);
        
        // If there was a new file uploaded but update failed, delete it
        if (req.file && req.file.path && req.file.filename) {
            await deleteImageFromCloudinary(req.file.filename);
        }
        
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi cập nhật điểm đến",
        });
    }
};

// Xóa điểm đến qua API
exports.apiDelete = async (req, res) => {
    try {
        const destinationId = req.params.id;
        
        // Check if destination exists
        const destination = await Destination.findById(destinationId);
        if (!destination) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy điểm đến",
            });
        }

        // Delete image from Cloudinary if it exists
        if (destination.cloudinaryId) {
            await deleteImageFromCloudinary(destination.cloudinaryId);
        }
        
        // Delete destination
        await Destination.findByIdAndDelete(destinationId);
        
        res.status(200).json({
            success: true,
            message: "Xóa điểm đến thành công",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa điểm đến",
        });
    }
};

// Thay đổi trạng thái điểm đến qua API
exports.apiToggleStatus = async (req, res) => {
    try {
        const destinationId = req.params.id;
        
        // Check if destination exists
        const destination = await Destination.findById(destinationId);
        if (!destination) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy điểm đến",
            });
        }
        
        // Toggle status
        const newStatus = destination.status === "Hoạt động" ? "Không hoạt động" : "Hoạt động";
        
        const updatedDestination = await Destination.findByIdAndUpdate(
            destinationId,
            {
                status: newStatus,
                updatedBy: req.session.user ? req.session.user.name : "Admin",
                updatedAt: new Date(),
            },
            { new: true }
        );
        
        res.status(200).json({
            success: true,
            message: `Đã ${newStatus === "Hoạt động" ? "kích hoạt" : "vô hiệu hóa"} điểm đến thành công`,
            data: updatedDestination,
        });
    } catch (error) {
        console.error("Error in apiToggleStatus destination:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thay đổi trạng thái điểm đến",
        });
    }
};

// API lấy quốc gia theo châu lục
exports.getCountriesByContinent = async (req, res) => {
    try {
        const { continent } = req.query;
        
        if (!continent) {
            return res.status(400).json({
                success: false,
                message: "Tham số châu lục không được để trống"
            });
        }
        
        const countries = getCountriesByContinent(continent);
        
        res.status(200).json({
            success: true,
            countries: countries
        });
    } catch (error) {
        console.error("Error in getCountriesByContinent:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi lấy danh sách quốc gia"
        });
    }
};

// API cho frontend - lấy danh sách điểm đến public
exports.getPublicDestinations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || "";
        const type = req.query.type; // 'Trong nước' hoặc 'Nước ngoài'
        const continent = req.query.continent;
        const country = req.query.country;
        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = { status: "Hoạt động" }; // Chỉ lấy điểm đến đang hoạt động
        
        if (search) {
            searchQuery.$or = [
                { name: { $regex: search, $options: "i" } },
                { info: { $regex: search, $options: "i" } },
                { country: { $regex: search, $options: "i" } },
                { continent: { $regex: search, $options: "i" } },
                { type: { $regex: search, $options: "i" } },
            ];
        }

        // Lọc theo phân loại
        if (type) {
            searchQuery.type = type;
        }

        // Lọc theo châu lục
        if (continent) {
            searchQuery.continent = continent;
        }

        // Lọc theo quốc gia
        if (country) {
            searchQuery.country = country;
        }

        const [destinations, total] = await Promise.all([
            Destination.find(searchQuery)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }) // Sắp xếp theo mới nhất
                .select('name slug info image country continent type createdAt'), // Loại bỏ parent
            Destination.countDocuments(searchQuery),
        ]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: destinations,
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
        console.error("Error in getPublicDestinations API:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải danh sách điểm đến",
        });
    }
};
// API để lấy tất cả destinations với URL structure
exports.getAllDestinationsWithUrls = async (req, res) => {
    try {
        const destinations = await Destination.find({ status: 'Hoạt động' })
            .populate('parent', 'name urlPath')
            .sort({ level: 1, name: 1 });

        // Tạo URL structure cho từng destination
        const destinationsWithUrls = destinations.map(dest => {
            const urlPath = generateDestinationUrlPath(dest, dest.parent);
            return {
                id: dest._id,
                name: dest.name,
                type: dest.type,
                continent: dest.continent,
                country: dest.country,
                urlPath: urlPath,
                level: dest.level,
                parent: dest.parent ? {
                    id: dest.parent._id,
                    name: dest.parent.name,
                    urlPath: dest.parent.urlPath
                } : null
            };
        });

        // Nhóm theo type và continent
        const groupedDestinations = {
            abroad: {},
            domestic: {}
        };

        destinationsWithUrls.forEach(dest => {
            if (dest.type === 'Nước ngoài') {
                const continent = dest.continent || 'Khác';
                if (!groupedDestinations.abroad[continent]) {
                    groupedDestinations.abroad[continent] = [];
                }
                groupedDestinations.abroad[continent].push(dest);
            } else {
                // Nhóm theo vùng miền cho trong nước
                const region = getRegionFromName(dest.name);
                if (!groupedDestinations.domestic[region]) {
                    groupedDestinations.domestic[region] = [];
                }
                groupedDestinations.domestic[region].push(dest);
            }
        });

        res.status(200).json({
            success: true,
            data: {
                destinations: destinationsWithUrls,
                grouped: groupedDestinations
            }
        });
    } catch (error) {
        console.error("Error in getAllDestinationsWithUrls:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách destinations",
        });
    }
};

// Helper function để xác định vùng miền từ tên
function getRegionFromName(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('hà nội') || nameLower.includes('hạ long') || nameLower.includes('sapa') || 
        nameLower.includes('ninh bình') || nameLower.includes('lào cai') || nameLower.includes('cao bằng') || 
        nameLower.includes('hải phòng') || nameLower.includes('quảng ninh') || nameLower.includes('thái nguyên') || 
        nameLower.includes('bắc giang') || nameLower.includes('hà giang') || nameLower.includes('điện biên')) {
        return 'Miền Bắc';
    } else if (nameLower.includes('huế') || nameLower.includes('đà nẵng') || nameLower.includes('hội an') || 
               nameLower.includes('quảng nam') || nameLower.includes('nghệ an') || nameLower.includes('thanh hóa') || 
               nameLower.includes('quảng bình') || nameLower.includes('quảng trị') || nameLower.includes('thừa thiên') || 
               nameLower.includes('hà tĩnh') || nameLower.includes('quảng ngãi') || nameLower.includes('bình định') || 
               nameLower.includes('phú yên') || nameLower.includes('khánh hòa') || nameLower.includes('nha trang')) {
        return 'Miền Trung';
    } else if (nameLower.includes('hồ chí minh') || nameLower.includes('sài gòn') || nameLower.includes('vũng tàu') || 
               nameLower.includes('đà lạt') || nameLower.includes('bình dương') || nameLower.includes('đồng nai') || 
               nameLower.includes('bà rịa') || nameLower.includes('tây ninh') || nameLower.includes('bình phước') || 
               nameLower.includes('lâm đồng') || nameLower.includes('ninh thuận') || nameLower.includes('bình thuận')) {
        return 'Miền Đông Nam Bộ';
    } else if (nameLower.includes('cần thơ') || nameLower.includes('phú quốc') || nameLower.includes('an giang') || 
               nameLower.includes('cà mau') || nameLower.includes('kiên giang') || nameLower.includes('tiền giang') || 
               nameLower.includes('bến tre') || nameLower.includes('vĩnh long') || nameLower.includes('trà vinh') || 
               nameLower.includes('sóc trăng') || nameLower.includes('bạc liêu') || nameLower.includes('hậu giang') || 
               nameLower.includes('đồng tháp') || nameLower.includes('long an')) {
        return 'Miền Tây Nam Bộ';
    }
    
    return 'Khác';
}

