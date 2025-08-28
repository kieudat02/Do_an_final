const express = require("express");
const router = express.Router();
const controller = require("../controllers/departureController");
const { ensureAuthenticated } = require("../middleware/authMiddleware");
const { loadUserPermissions, checkPermission } = require("../middleware/permissionMiddleware");

// Tất cả routes của departure yêu cầu đăng nhập và load quyền
router.use(ensureAuthenticated, loadUserPermissions);

// Xem danh sách điểm khởi hành
router.get("/", checkPermission("READ_DEPARTURE"), controller.list);

// Thêm điểm khởi hành 
router.get("/add", checkPermission("CREATE_DEPARTURE"), controller.showAddForm);
router.post("/add", checkPermission("CREATE_DEPARTURE"), controller.create);

// Sửa điểm khởi hành
router.get("/edit/:id", checkPermission("UPDATE_DEPARTURE"), controller.showEditForm);
router.post("/edit/:id", checkPermission("UPDATE_DEPARTURE"), controller.update);

// Xóa điểm khởi hành
router.post("/delete/:id", checkPermission("DELETE_DEPARTURE"), controller.delete);
router.post("/delete-multiple", checkPermission("DELETE_DEPARTURE"), controller.deleteMultiple);

// Chuyển đổi trạng thái
router.post("/toggle-status/:id", checkPermission("UPDATE_DEPARTURE"), controller.toggleStatus);

module.exports = router;
