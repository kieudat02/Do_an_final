const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');
const { loadUserPermissions, checkPermission } = require("../middleware/permissionMiddleware");

// Middleware để đảm bảo user đã xác thực và load quyền hạn
router.use(authMiddleware.ensureAuthenticated, loadUserPermissions);

// Web Views Routes
// Xem danh sách đánh giá
router.get('/', checkPermission("READ_REVIEW"), reviewController.getReviewsPage);

// Toggle trạng thái đánh giá
router.post('/toggle-status/:id', checkPermission("UPDATE_REVIEW"), reviewController.toggleReviewStatus);

// Xóa đánh giá
router.post('/delete/:id', checkPermission("DELETE_REVIEW"), reviewController.deleteReviewWeb);

module.exports = router;
