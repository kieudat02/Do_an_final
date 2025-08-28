/**
 * Utility functions để hỗ trợ chatbot hiển thị thông tin tour
 */

/**
 * Format giá tiền
 * @param {number} price - Giá tiền
 * @returns {string} Giá đã format
 */
export const formatPrice = (price) => {
  if (!price || price === 0) return 'Liên hệ';
  
  // Chuyển đổi số thành chuỗi và thêm dấu chấm phân cách
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
};

/**
 * Format rating với stars
 * @param {number} rating - Điểm rating
 * @returns {string} Rating với stars
 */
export const formatRating = (rating) => {
  if (!rating || rating === 0) return 'Chưa có đánh giá';
  
  const stars = '⭐'.repeat(Math.floor(rating));
  return `${rating.toFixed(1)}/5 ${stars}`;
};

/**
 * Format ngày tháng
 * @param {string|Date} date - Ngày cần format
 * @returns {string} Ngày đã format
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Tạo quick suggestions cho chatbot
 * @param {Object} context - Context data từ API
 * @returns {Array} Danh sách suggestions
 */
export const generateQuickSuggestions = (context) => {
  // Thứ tự ưu tiên theo UX: phổ biến nhất → cụ thể hơn
  const suggestions = [
    "🏖️ Tour biển đảo",
    "🏔️ Tour miền núi",
    "💰 Tour giá rẻ",
    "⭐ Tour đánh giá cao",
    "🍜 Tour ẩm thực",
    "🏛️ Tour văn hóa lịch sử"
  ];

  // Thêm điểm đến phổ biến (ưu tiên cao)
  if (context?.popularDestinations) {
    context.popularDestinations.slice(0, 2).forEach(dest => {
      suggestions.push(`✈️ Tour ${dest.name}`);
    });
  }

  // Thêm suggestions dựa trên danh mục có sẵn
  if (context?.toursByCategory) {
    Object.keys(context.toursByCategory).slice(0, 2).forEach(category => {
      if (!suggestions.some(s => s.toLowerCase().includes(category.toLowerCase()))) {
        suggestions.push(`🎯 Tour ${category}`);
      }
    });
  }

  return suggestions.slice(0, 6); // Giới hạn 6 suggestions để gọn gàng hơn
};

/**
 * Phân tích intent từ tin nhắn người dùng
 * @param {string} message - Tin nhắn người dùng
 * @returns {Object} Intent và entities
 */
export const analyzeUserIntent = (message) => {
  const lowerMessage = message.toLowerCase();
  
  const intents = {
    SEARCH_TOUR: ['tour', 'du lịch', 'đi chơi', 'nghỉ dưỡng'],
    PRICE_INQUIRY: ['giá', 'chi phí', 'bao nhiêu tiền', 'cost'],
    DESTINATION_INFO: ['địa điểm', 'nơi nào', 'đâu', 'destination'],
    DURATION_INFO: ['bao lâu', 'mấy ngày', 'duration', 'thời gian'],
    BOOKING_INFO: ['đặt', 'book', 'booking', 'đăng ký'],
    RECOMMENDATION: ['gợi ý', 'recommend', 'tư vấn', 'suggest']
  };
  
  let detectedIntent = 'GENERAL';
  
  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      detectedIntent = intent;
      break;
    }
  }
  
  // Extract entities (giá, điểm đến, thời gian)
  const entities = {
    priceRange: extractPriceRange(lowerMessage),
    destinations: extractDestinations(lowerMessage),
    duration: extractDuration(lowerMessage)
  };
  
  return {
    intent: detectedIntent,
    entities,
    originalMessage: message
  };
};

/**
 * Trích xuất khoảng giá từ tin nhắn
 * @param {string} message - Tin nhắn
 * @returns {Object|null} Khoảng giá
 */
const extractPriceRange = (message) => {
  // Tìm số tiền trong tin nhắn
  const pricePatterns = [
    /(\d+)\s*triệu/gi,
    /(\d+)\s*tr/gi,
    /(\d+)\s*k/gi,
    /(\d+)[.,](\d+)\s*triệu/gi
  ];
  
  const matches = [];
  pricePatterns.forEach(pattern => {
    const found = message.match(pattern);
    if (found) matches.push(...found);
  });
  
  if (matches.length === 0) return null;
  
  // Convert to actual price
  const prices = matches.map(match => {
    if (match.includes('triệu') || match.includes('tr')) {
      const num = parseFloat(match.replace(/[^\d.,]/g, '').replace(',', '.'));
      return num * 1000000;
    } else if (match.includes('k')) {
      const num = parseFloat(match.replace(/[^\d.,]/g, '').replace(',', '.'));
      return num * 1000;
    }
    return parseFloat(match.replace(/[^\d.,]/g, '').replace(',', '.'));
  });
  
  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
};

/**
 * Trích xuất điểm đến từ tin nhắn
 * @param {string} message - Tin nhắn
 * @returns {Array} Danh sách điểm đến
 */
const extractDestinations = (message) => {
  const commonDestinations = [
    'hà nội', 'sài gòn', 'tp hcm', 'đà nẵng', 'hội an', 'huế',
    'nha trang', 'đà lạt', 'phú quốc', 'hạ long', 'sapa',
    'cần thơ', 'vũng tàu', 'phan thiết', 'quy nhon',
    'thailand', 'thái lan', 'singapore', 'malaysia', 'indonesia',
    'nhật bản', 'hàn quốc', 'trung quốc', 'campuchia'
  ];
  
  return commonDestinations.filter(dest => 
    message.includes(dest)
  );
};

/**
 * Trích xuất thời gian từ tin nhắn
 * @param {string} message - Tin nhắn
 * @returns {Object|null} Thông tin thời gian
 */
const extractDuration = (message) => {
  const durationPatterns = [
    /(\d+)\s*ngày/gi,
    /(\d+)\s*đêm/gi,
    /(\d+)n(\d+)đ/gi
  ];
  
  for (const pattern of durationPatterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        days: parseInt(match[1]),
        pattern: match[0]
      };
    }
  }
  
  return null;
};

/**
 * Tạo tour card component cho chatbot
 * @param {Object} tour - Thông tin tour
 * @returns {string} HTML string
 */
export const createTourCard = (tour) => {
  return `
    <div class="tour-card" style="
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      margin: 8px 0;
      background: #f9fafb;
    ">
      <h4 style="margin: 0 0 8px 0; color: #1f2937;">${tour.title}</h4>
      <p style="margin: 4px 0; color: #059669; font-weight: 600;">
        💰 ${formatPrice(tour.price || tour.minPrice)}
      </p>
      ${tour.averageRating > 0 ? `
        <p style="margin: 4px 0; color: #d97706;">
          ${formatRating(tour.averageRating)}
        </p>
      ` : ''}
      ${tour.highlights && tour.highlights.length > 0 ? `
        <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
          ✨ ${tour.highlights.slice(0, 2).join(', ')}
        </p>
      ` : ''}
      ${tour.category ? `
        <p style="margin: 4px 0; color: #8b5cf6; font-size: 12px;">
          📂 ${tour.category.name || tour.category}
        </p>
      ` : ''}
      ${tour.code ? `
        <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">
          🔖 Mã tour: ${tour.code}
        </p>
      ` : ''}
    </div>
  `;
};

/**
 * Tạo summary stats cho chatbot
 * @param {Object} statistics - Thống kê
 * @returns {string} HTML string
 */
export const createStatsSummary = (statistics) => {
  return `
    <div class="stats-summary" style="
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
    ">
      <h4 style="margin: 0 0 12px 0;">📊 Thống kê NDTravel</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
        <div>🎯 ${statistics.totalTours} tours</div>
        <div>📂 ${statistics.totalCategories} danh mục</div>
        <div>🌍 ${statistics.totalDestinations} điểm đến</div>
        <div>⭐ ${statistics.averageRating?.toFixed(1)}/5 sao</div>
      </div>
      ${statistics.priceRange ? `
        <p style="margin: 8px 0 0 0; font-size: 14px;">
          💰 Từ ${formatPrice(statistics.priceRange.minPrice)} - ${formatPrice(statistics.priceRange.maxPrice)}
        </p>
      ` : ''}
    </div>
  `;
};

export default {
  formatPrice,
  formatRating,
  formatDate,
  generateQuickSuggestions,
  analyzeUserIntent,
  createTourCard,
  createStatsSummary
};
