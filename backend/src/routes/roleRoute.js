const express = require("express");
const router = express.Router();
const roleController = require("../controllers/roleController");
const {
    ensureAuthenticated,
    checkPermission,
} = require("../middleware/authMiddleware");
const { loadUserPermissions } = require("../middleware/permissionMiddleware");

// Tất cả routes của roles yêu cầu đăng nhập
router.use(ensureAuthenticated);
router.use(loadUserPermissions);

// Xem danh sách vai trò
router.get("/", checkPermission("READ_ROLES"), roleController.getRoles);

// Thêm vai trò
router.get("/add", checkPermission("CREATE_ROLES"), roleController.getAddRole);

// Thêm vai trò
router.post("/add", checkPermission("CREATE_ROLES"), roleController.postAddRole);

// Sửa vai trò
router.get("/edit/:id", checkPermission("UPDATE_ROLES"), roleController.getEditRole);

// Cập nhật vai trò
router.post("/edit/:id", checkPermission("UPDATE_ROLES"), roleController.postEditRole);

// Xóa vai trò
router.post("/delete/:id", checkPermission("DELETE_ROLES"), roleController.deleteRole);

module.exports = router;
