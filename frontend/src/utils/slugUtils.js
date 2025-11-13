/**
 * Tạo slug từ title (đồng bộ với backend createFrontendSlug)
 * @param {string} title - Tiêu đề cần tạo slug
 * @returns {string} - Slug đã được chuẩn hóa
 */
export const createFrontendSlug = (title) => {
  if (!title) return "";
  
  return title
    .toLowerCase()
    .trim()
    // Chuyển đổi ký tự tiếng Việt có dấu thành không dấu
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    // Loại bỏ các ký tự đặc biệt, chỉ giữ lại chữ cái, số, khoảng trắng và dấu gạch ngang
    .replace(/[^a-z0-9\s-]/g, '')
    // Thay thế khoảng trắng bằng dấu gạch ngang
    .replace(/\s+/g, '-')
    // Loại bỏ dấu gạch ngang liên tiếp
    .replace(/-+/g, '-')
    // Loại bỏ dấu gạch ngang ở đầu và cuối
    .replace(/^-|-$/g, '');
};

/**
 * Tạo slug sử dụng normalize (phương pháp thay thế)
 * @param {string} title - Tiêu đề cần tạo slug
 * @returns {string} - Slug đã được chuẩn hóa
 */
export const createNormalizedSlug = (title) => {
  if (!title) return "";
  
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
};

/**
 * Tạo URL cho trang danh mục tour
 * @param {Object} homeSection - Đối tượng HomeSection
 * @returns {string} - URL đầy đủ
 */
export const createCategoryUrl = (homeSection) => {
  if (!homeSection) return '/danh-muc-tour/all';
  
  // Ưu tiên sử dụng moreButtonSlug nếu có
  if (homeSection.moreButtonSlug) {
    return `/danh-muc-tour/${homeSection.moreButtonSlug}`;
  }
  
  // Fallback 1: Tạo slug từ moreButtonTitle nếu có
  if (homeSection.moreButtonTitle) {
    const slug = createFrontendSlug(homeSection.moreButtonTitle);
    return `/danh-muc-tour/${slug}`;
  }
  
  // Fallback 2: Tạo slug từ title
  const slug = createFrontendSlug(homeSection.title);
  return `/danh-muc-tour/${slug}`;
};

/**
 * Log thông tin debug cho việc tạo slug (chỉ trong development)
 * @param {Object} homeSection - Đối tượng HomeSection
 * @param {string} finalSlug - Slug cuối cùng được sử dụng
 */
export const debugSlugCreation = (homeSection, finalSlug) => {
  // Debug function removed for production
};
