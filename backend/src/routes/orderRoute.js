const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const { loadUserPermissions, checkPermission } = require("../middleware/permissionMiddleware");

// Middleware để đảm bảo user đã xác thực
router.use(authMiddleware.ensureAuthenticated, loadUserPermissions);

// Xem danh sách đơn hàng
router.get('/', checkPermission("READ_ORDER"), orderController.getOrdersPage);

// Xem chi tiết đơn hàng
router.get('/:id', checkPermission("READ_ORDER"), orderController.getOrderDetailPage);

// API endpoints cho dashboard statistics (chỉ cần authentication, không cần permission)
router.get('/api/monthly-stats', authMiddleware.ensureAuthenticated, orderController.getMonthlyOrderStats);
router.get('/api/cancellation-rate', authMiddleware.ensureAuthenticated, orderController.getCancellationRateStats);
router.get('/api/cancelled-stats', authMiddleware.ensureAuthenticated, orderController.getCancelledOrderStats);

module.exports = router;