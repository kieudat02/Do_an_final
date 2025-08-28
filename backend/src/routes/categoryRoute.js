const express = require("express");
const router = express.Router();
const controller = require("../controllers/categoryController");
const { ensureAuthenticated } = require("../middleware/authMiddleware");
const {
    loadUserPermissions,
    checkPermission,
} = require("../middleware/permissionMiddleware");

// Tất cả routes của category yêu cầu đăng nhập và load quyền
router.use(ensureAuthenticated, loadUserPermissions);

// Xem danh sách danh mục
router.get("/", checkPermission("READ_CATEGORY"), controller.list);

// Thêm danh mục
router.get("/add", checkPermission("CREATE_CATEGORY"), controller.showAddForm);
router.post("/add", checkPermission("CREATE_CATEGORY"), controller.create);

// Sửa danh mục
router.get("/edit/:id", checkPermission("UPDATE_CATEGORY"), controller.showEditForm);
router.post("/edit/:id", checkPermission("UPDATE_CATEGORY"), controller.update);

// Xóa danh mục
router.post("/delete/:id", checkPermission("DELETE_CATEGORY"), controller.delete);

// Chuyển đổi trạng thái
router.post("/toggle-status/:id", checkPermission("UPDATE_CATEGORY"), controller.toggleStatus);

module.exports = router;
