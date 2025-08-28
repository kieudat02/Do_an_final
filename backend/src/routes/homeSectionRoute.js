const express = require("express");
const router = express.Router();
const controller = require("../controllers/homeSectionController");
const { ensureAuthenticated } = require("../middleware/authMiddleware");
const {
    loadUserPermissions,
    checkPermission,
} = require("../middleware/permissionMiddleware");

// Tất cả routes của homeSection yêu cầu đăng nhập và load quyền
router.use(ensureAuthenticated, loadUserPermissions);

// Xem danh sách home sections
router.get("/", checkPermission("READ_HOME_SECTION"), controller.list);

// Thêm home section
router.get("/add", checkPermission("CREATE_HOME_SECTION"), controller.showAddForm);
router.post("/add", checkPermission("CREATE_HOME_SECTION"), controller.create);

// Sửa home section
router.get("/edit/:id", checkPermission("UPDATE_HOME_SECTION"), controller.showEditForm);
router.post("/edit/:id", checkPermission("UPDATE_HOME_SECTION"), controller.update);

// Xóa home section
router.post("/delete/:id", checkPermission("DELETE_HOME_SECTION"), controller.delete);

// Chuyển đổi trạng thái
router.post("/toggle-status/:id", checkPermission("UPDATE_HOME_SECTION"), controller.toggleStatus);

module.exports = router;
