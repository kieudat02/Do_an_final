const express = require("express");
const router = express.Router();
const accountController = require("../controllers/accountController");
const { ensureAuthenticated } = require("../middleware/authMiddleware");
const { loadUserPermissions } = require("../middleware/permissionMiddleware");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary");

// Cấu hình Cloudinary Storage cho avatar
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "avatars",
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
        transformation: [
            { width: 200, height: 200, crop: "fill", gravity: "face" },
            { quality: "auto" },
        ],
    },
});

const upload = multer({
    storage: avatarStorage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Chỉ cho phép upload file ảnh!"), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
    },
});

// Tất cả routes của account yêu cầu đăng nhập
router.use(ensureAuthenticated);
router.use(loadUserPermissions);

// Xem danh sách tài khoản 
router.get("/", accountController.getUsers);

// Thêm tài khoản
router.get("/add", accountController.getAddUser);
router.post("/add", upload.single("avatar"), accountController.postAddUser);

// Sửa tài khoản
router.get("/edit/:id", accountController.getEditUser);
router.post(
    "/edit/:id",
    upload.single("avatar"),
    accountController.postEditUser
);

// Chuyển đổi trạng thái tài khoản
router.post("/toggle-status/:id", accountController.toggleUserStatus);

// Xóa tài khoản
router.post("/delete/:id", accountController.deleteUser);

module.exports = router;
