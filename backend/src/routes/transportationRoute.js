const express = require("express");
const router = express.Router();
const controller = require("../controllers/transportationController");
const { ensureAuthenticated } = require("../middleware/authMiddleware");
const {
    loadUserPermissions,
    checkPermission,
} = require("../middleware/permissionMiddleware");

// Tất cả routes của transportation yêu cầu đăng nhập và load quyền
router.use(ensureAuthenticated, loadUserPermissions);

// Xem danh sách phương tiện 
router.get("/", checkPermission("READ_TRANSPORTATION"), controller.list);

// Thêm phương tiện 
router.get("/add", checkPermission("CREATE_TRANSPORTATION"), controller.showAddForm);
router.post("/add", checkPermission("CREATE_TRANSPORTATION"), controller.create);

// Sửa phương tiện 
router.get("/edit/:id", checkPermission("UPDATE_TRANSPORTATION"), controller.showEditForm);
router.post("/edit/:id", checkPermission("UPDATE_TRANSPORTATION"), controller.update);

// Xóa phương tiện 
router.post("/delete/:id", checkPermission("DELETE_TRANSPORTATION"), controller.delete);
router.post("/delete-multiple", checkPermission("DELETE_TRANSPORTATION"), controller.deleteMultiple);

// Chuyển đổi trạng thái 
router.post("/toggle-status/:id", checkPermission("UPDATE_TRANSPORTATION"), controller.toggleStatus);

module.exports = router;
