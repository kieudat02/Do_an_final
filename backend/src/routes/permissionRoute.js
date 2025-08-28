const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { checkLevel } = require('../middleware/permissionMiddleware');
const { loadUserPermissions, checkPermission } = require('../middleware/permissionMiddleware');

// Xem danh sách quyền
router.get('/', checkPermission("READ_PERMISSIONS"), loadUserPermissions, checkLevel(2), permissionController.index);

// Cập nhật quyền
router.post('/update', checkPermission("UPDATE_PERMISSIONS"), checkLevel(2), permissionController.update);

module.exports = router;
