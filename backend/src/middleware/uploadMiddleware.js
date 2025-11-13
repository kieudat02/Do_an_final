const multer = require('multer');
const path = require('path');
const { destinationStorage, generalStorage } = require('../config/cloudinary');

// Local storage (fallback)
const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/images/'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Hàm lọc file
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ được phép tải lên file hình ảnh (jpeg, jpg, png, gif, webp)'));
  }
};

// Cấu hình Multer
const uploadToCloudinary = multer({
  storage: destinationStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const uploadToCloudinaryGeneral = multer({
  storage: generalStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const uploadToLocal = multer({
  storage: localStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = {
  uploadToCloudinary,
  uploadToCloudinaryGeneral,
  uploadToLocal,
  // Export default cho tương thích với cũ
  single: uploadToCloudinary.single.bind(uploadToCloudinary),
  array: uploadToCloudinary.array.bind(uploadToCloudinary),
  fields: uploadToCloudinary.fields.bind(uploadToCloudinary)
};