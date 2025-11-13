/**
 * Tạo slug duy nhất từ tên với timestamp
 * @param {string} name - Tên để tạo slug
 * @param {string} prefix - Tiền tố tùy chọn cho fullSlug (mặc định: 'item')
 * @returns {object} - Object với slug và fullSlug
 */
function generateSlug(name, prefix = 'item') {
  const baseSlug = name.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
    .replace(/[^a-z0-9\s-]/g, '') // Xóa ký tự đặc biệt
    .replace(/\s+/g, '-') // Thay thế khoảng trắng bằng dấu gạch ngang
    .replace(/-+/g, '-') // Thay thế nhiều dấu gạch ngang bằng một dấu gạch ngang
    .trim('-'); // Xóa dấu gạch ngang ở đầu và cuối
  
  // Thêm timestamp để đảm bảo tính duy nhất
  const timestamp = Date.now();
  const slug = `${baseSlug}-${timestamp}`;
  const fullSlug = `${prefix}-${baseSlug}-${timestamp}`;
  
  return { slug, fullSlug };
}

/**
 * Kiểm tra xem tên đã tồn tại trong collection (không phân biệt hoa thường)
 * @param {object} Model - Model Mongoose
 * @param {string} name - Tên để kiểm tra
 * @param {string} excludeId - ID để loại trừ khỏi kiểm tra (để cập nhật)
 * @returns {Promise<boolean>} - True nếu tên tồn tại
 */
async function checkNameExists(Model, name, excludeId = null) {
  const query = { 
    name: new RegExp(`^${name.trim()}$`, 'i')
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const existing = await Model.findOne(query);
  return !!existing;
}

/**
 * Kiểm tra xem tiêu đề đã tồn tại trong collection (không phân biệt hoa thường) - cho phương tiện
 * @param {object} Model - Model Mongoose
 * @param {string} title - Tiêu đề để kiểm tra
 * @param {string} excludeId - ID để loại trừ khỏi kiểm tra (để cập nhật)
 * @returns {Promise<boolean>} - True nếu tiêu đề tồn tại
 */
async function checkTitleExists(Model, title, excludeId = null) {
  const query = { 
    title: new RegExp(`^${title.trim()}$`, 'i')
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const existing = await Model.findOne(query);
  return !!existing;
}

module.exports = {
  generateSlug,
  checkNameExists,
  checkTitleExists
};
