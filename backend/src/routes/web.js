const express = require("express");
const { getHomepage } = require("../controllers/homeController");
const { ensureAuthenticated, ensureAdminAccess } = require("../middleware/authMiddleware");
const { loadUserPermissions } = require("../middleware/permissionMiddleware");
const { logAdminAccess, blockCustomerRoutes, validateSession } = require("../middleware/securityMiddleware");
const router = express.Router();

// Import permission routes
const permissionRoutes = require("./permissionRoute");
const reviewRoutes = require("./reviewRoute");

// Middleware bảo mật cho tất cả routes
router.use(logAdminAccess);           // Log truy cập (chỉ development)
router.use(validateSession);          // Kiểm tra tính hợp lệ session
router.use(blockCustomerRoutes);      // Chặn customer truy cập routes admin
router.use(ensureAdminAccess);        // Kiểm tra quyền admin

// Chuyển hướng đến trang dashboard
router.get("/", (req, res) => { res.redirect("/dashboard"); });

// Trang dashboard
router.get("/dashboard", loadUserPermissions, getHomepage);

// Quản lý quyền
router.use("/permissions", permissionRoutes);

// Quản lý đánh giá
router.use("/review", reviewRoutes);

module.exports = router;
