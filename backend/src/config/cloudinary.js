const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cấu hình Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cấu hình Cloudinary Storage cho điểm đến
const destinationStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'destinations', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
            { width: 800, height: 600, crop: 'limit' }, // Resize image
            { quality: 'auto' } // Optimize quality
        ]
    }
});

// Cấu hình Cloudinary Storage cho các upload khác (tours, categories, etc.)
const generalStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploads', // General folder
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto' }
        ]
    }
});

// Cấu hình Cloudinary Storage cho ảnh đại diện
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'avatars', // Avatar folder
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
            { width: 200, height: 200, crop: 'fill', gravity: 'face' },
            { quality: 'auto' }
        ]
    }
});

module.exports = {
    cloudinary,
    destinationStorage,
    generalStorage,
    avatarStorage
};
