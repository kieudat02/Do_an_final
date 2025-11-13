const express = require("express");
const router = express.Router();
const controller = require("../controllers/destinationController");
const { uploadToCloudinary } = require("../middleware/uploadMiddleware");
const { ensureAuthenticated } = require("../middleware/authMiddleware");
const { loadUserPermissions, checkPermission } = require("../middleware/permissionMiddleware");

// Tất cả routes của destination yêu cầu đăng nhập và load quyền
router.use(ensureAuthenticated, loadUserPermissions);

// Xem danh sách điểm đến
router.get("/", checkPermission("READ_DESTINATION"), controller.list);

// Thêm điểm đến
router.get("/add", checkPermission("CREATE_DESTINATION"), controller.showAddForm);
router.post("/add", checkPermission("CREATE_DESTINATION"), uploadToCloudinary.single("image"), controller.create);

// Sửa điểm đến
router.get("/edit/:id", checkPermission("UPDATE_DESTINATION"), controller.showEditForm);
router.post("/edit/:id", checkPermission("UPDATE_DESTINATION"), uploadToCloudinary.single("image"), controller.update);

// Xóa điểm đến
router.post("/delete/:id", checkPermission("DELETE_DESTINATION"), controller.delete);
router.post("/delete-multiple", checkPermission("DELETE_DESTINATION"), controller.deleteMultiple);

// Chuyển đổi trạng thái
router.post("/toggle-status/:id", checkPermission("UPDATE_DESTINATION"), controller.toggleStatus);

// API lấy quốc gia theo châu lục
router.get("/api/countries/:continent", controller.getCountriesByContinent);

module.exports = router;
