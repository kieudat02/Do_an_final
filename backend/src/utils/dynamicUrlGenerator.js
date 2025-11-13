const { generateSlug } = require('./slugGenerator');

/**
 * Tạo URL path từ tên
 * @param {string} name - Tên để tạo URL path
 * @returns {string} - URL path
 */
function generateUrlPath(name) {
  return name.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
    .replace(/[^a-z0-9\s-]/g, '') // Xóa ký tự đặc biệt
    .replace(/\s+/g, '-') // Thay thế khoảng trắng bằng dấu gạch ngang
    .replace(/-+/g, '-') // Thay thế nhiều dấu gạch ngang bằng một dấu gạch ngang
    .trim('-'); // Xóa dấu gạch ngang ở đầu và cuối
}

/**
 * Tạo URL structure động cho destination với dấu /
 * @param {object} destination - Object destination
 * @param {object} parent - Object parent (nếu có)
 * @returns {string} - URL structure
 */
function generateDestinationUrlPath(destination, parent = null) {
  let basePath = '';
  
  // Xác định base path theo type
  if (destination.type === 'Nước ngoài') {
    basePath = 'du-lich-nuoc-ngoai';
  } else if (destination.type === 'Trong nước') {
    basePath = 'du-lich-trong-nuoc';
  } else {
    basePath = 'du-lich';
  }

  // Tạo URL path từ tên destination
  const destinationPath = `du-lich-${generateUrlPath(destination.name)}`;

  // Nếu có parent, tạo subcategory
  if (parent) {
    const parentPath = generateUrlPath(parent.name);
    return `${basePath}/du-lich-${parentPath}`;
  }

  // Nếu không có parent, tạo category chính
  return `${basePath}/${destinationPath}`;
}

/**
 * Parse URL path để lấy thông tin filter
 * @param {string} urlPath - URL path
 * @returns {object} - Object chứa thông tin filter
 */
function parseUrlPath(urlPath) {
  const result = {};

  // Xác định loại tour
  if (urlPath.includes('nuoc-ngoai')) {
    result.destinationType = 'Nước ngoài';
  } else if (urlPath.includes('trong-nuoc')) {
    result.destinationType = 'Trong nước';
  }

  // Xác định category
  if (urlPath.includes('tieu-chuan')) {
    result.category = 'Tiêu chuẩn';
  } else if (urlPath.includes('cao-cap')) {
    result.category = 'Cao cấp';
  } else if (urlPath.includes('gia-re')) {
    result.category = 'Giá rẻ';
  }

  // Xác định destination name từ URL
  const destinationMappings = {
    'thai-lan': 'Thái Lan',
    'singapore': 'Singapore',
    'malaysia': 'Malaysia',
    'campuchia': 'Campuchia',
    'lao': 'Lào',
    'nhat-ban': 'Nhật Bản',
    'han-quoc': 'Hàn Quốc',
    'trung-quoc': 'Trung Quốc',
    'chau-au': 'Châu Âu',
    'chau-my': 'Châu Mỹ',
    'chau-uc': 'Châu Úc',
    'chau-phi': 'Châu Phi',
    'chau-a': 'Châu Á',
    'ha-noi': 'Hà Nội',
    'ho-chi-minh': 'TP.HCM',
    'tphcm': 'TP.HCM',
    'da-nang': 'Đà Nẵng',
    'hue': 'Huế',
    'sapa': 'Sapa',
    'ha-long': 'Hạ Long',
    'nha-trang': 'Nha Trang',
    'phu-quoc': 'Phú Quốc',
    'da-lat': 'Đà Lạt',
    'vung-tau': 'Vũng Tàu',
    'ha-giang': 'Hà Giang',
  };

  // Tìm destination name trong phần cuối của URL
  const urlParts = urlPath.split('/');
  const lastPart = urlParts[urlParts.length - 1];
  
  for (const [key, value] of Object.entries(destinationMappings)) {
    if (lastPart.includes(key)) {
      result.destinationName = value;
      break;
    }
  }

  return result;
}

module.exports = {
  generateUrlPath,
  generateDestinationUrlPath,
  parseUrlPath
};