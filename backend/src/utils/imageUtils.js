const { cloudinary } = require('../config/cloudinary');

// Lấy public_id từ URL
const extractPublicId = (url, folder = 'destinations') => {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }
  
  try {
    // Lấy public_id từ URL
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];
    return `${folder}/${publicId}`;
  } catch (error) {
    return null;
  }
};

// Xóa ảnh từ Cloudinary
const deleteImageFromCloudinary = async (url, folder = 'destinations') => {
  try {
    const publicId = extractPublicId(url, folder);
    if (!publicId) {
      return false;
    }
    
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    return false;
  }
};

// Xóa nhiều ảnh từ Cloudinary
const deleteMultipleImagesFromCloudinary = async (urls, folder = 'destinations') => {
  let deletedCount = 0;
  
  for (const url of urls) {
    const success = await deleteImageFromCloudinary(url, folder);
    if (success) {
      deletedCount++;
    }
  }
  
  return deletedCount;
};

// Lấy URL ảnh đã tối ưu từ Cloudinary
const getOptimizedImageUrl = (url, options = {}) => {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }
  
  const {
    width = 800,
    height = 600,
    crop = 'limit',
    quality = 'auto',
    format = 'auto'
  } = options;
  
  try {
    // Thêm tham số biến đổi vào URL
    const parts = url.split('/upload/');
    if (parts.length !== 2) {
      return url;
    }
    
    const transformations = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
    return `${parts[0]}/upload/${transformations}/${parts[1]}`;
  } catch (error) {
    return url;
  }
};

module.exports = {
  extractPublicId,
  deleteImageFromCloudinary,
  deleteMultipleImagesFromCloudinary,
  getOptimizedImageUrl
};
