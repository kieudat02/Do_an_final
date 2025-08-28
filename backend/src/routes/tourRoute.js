const express = require("express");
const router = express.Router();
const controller = require("../controllers/tourController");
const tourDetailController = require("../controllers/tourDetailController");
const { uploadToCloudinaryGeneral } = require("../middleware/uploadMiddleware");
const { ensureAuthenticated } = require("../middleware/authMiddleware");
const { loadUserPermissions, checkPermission, } = require("../middleware/permissionMiddleware");

// Tất cả routes của tour yêu cầu đăng nhập và load quyền
router.use(ensureAuthenticated, loadUserPermissions);

// Xem danh sách tour 
router.get("/", checkPermission("READ_TOUR"), controller.list);

// Xem chi tiết tour 
router.get("/detail/:slug", checkPermission("READ_TOUR"), tourDetailController.detail);
router.get("/:id/detail", checkPermission("READ_TOUR"), controller.detail);

// Thêm tour
router.get("/add", checkPermission("CREATE_TOUR"), controller.showAddForm);
router.post("/add", checkPermission("CREATE_TOUR"), uploadToCloudinaryGeneral.array("images", 10), controller.create);

// Sửa tour 
router.get( "/edit/:id", checkPermission("UPDATE_TOUR"), controller.showEditForm);
router.post( "/edit/:id", checkPermission("UPDATE_TOUR"), uploadToCloudinaryGeneral.array("images", 10), controller.update );

// Xóa tour
router.post("/delete/:id", checkPermission("DELETE_TOUR"), controller.delete);
router.post("/delete-multiple", checkPermission("DELETE_TOUR"), controller.deleteMultiple);

// Chuyển đổi trạng thái
router.post("/toggle-status/:id", checkPermission("UPDATE_TOUR"), controller.toggleStatus);
router.post("/toggle-highlight/:id", checkPermission("UPDATE_TOUR"), controller.toggleHighlight);

// Tạo mã tour tự động
router.post("/generate-code", checkPermission("CREATE_TOUR"), controller.generateCode);

// Kiểm tra mã tour có tồn tại không
router.post("/check-code", checkPermission("READ_TOUR"), controller.checkCode);

// Tính lại giá tours
router.post("/recalculate-all-prices", checkPermission("UPDATE_TOUR"), controller.recalculateAllPrices);
router.post("/recalculate-price/:id", checkPermission("UPDATE_TOUR"), controller.recalculateTourPrice);

module.exports = router;
