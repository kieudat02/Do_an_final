const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Cấu hình Cloudinary Storage cho CKEditor images
const ckeditorStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'ckeditor-images', 
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
            { width: 1200, height: 800, crop: 'limit' }, 
            { quality: 'auto' }, 
            { fetch_format: 'auto' }
        ]
    }
});

// Multer configuration
const upload = multer({ 
    storage: ckeditorStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 
    },
    fileFilter: (req, file, cb) => {
        
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Upload image endpoint for CKEditor
router.post('/upload-image', upload.single('upload'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: {
                    message: 'No file uploaded'
                }
            });
        }

        // CKEditor expects specific response format
        res.json({
            url: req.file.path 
        });

    } catch (error) {
        console.error('CKEditor image upload error:', error);
        res.status(500).json({
            error: {
                message: 'Upload failed: ' + error.message
            }
        });
    }
});

// Delete image endpoint (optional)
router.delete('/delete-image', async (req, res) => {
    try {
        const { publicId } = req.body;
        
        if (!publicId) {
            return res.status(400).json({
                error: 'Public ID is required'
            });
        }

        // Delete from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId);
        
        if (result.result === 'ok') {
            res.json({
                success: true,
                message: 'Image deleted successfully'
            });
        } else {
            res.status(400).json({
                error: 'Failed to delete image'
            });
        }

    } catch (error) {
        console.error('CKEditor image delete error:', error);
        res.status(500).json({
            error: 'Delete failed: ' + error.message
        });
    }
});

// Get image info endpoint (optional)
router.get('/image-info/:publicId', async (req, res) => {
    try {
        const { publicId } = req.params;
        
        const result = await cloudinary.api.resource(publicId);
        
        res.json({
            url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes,
            created: result.created_at
        });

    } catch (error) {
        console.error('CKEditor image info error:', error);
        res.status(500).json({
            error: 'Failed to get image info: ' + error.message
        });
    }
});

module.exports = router;
