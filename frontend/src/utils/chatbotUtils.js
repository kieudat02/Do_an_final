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
  // Câu hỏi ngắn gọn, tự nhiên như người thật
  const suggestions = [
    "🏖️ Đi biển",
    "🏔️ Leo núi",
    "💰 Tour rẻ",
    "⭐ Tour hot",
    "🔍 Tra cứu đơn hàng",
    "💳 Thanh toán"
  ];

  // Thêm điểm đến phổ biến (ưu tiên cao)
  if (context?.popularDestinations) {
    context.popularDestinations.slice(0, 2).forEach(dest => {
      suggestions.push(`✈️ ${dest.name}`);
    });
  }

  // Thêm suggestions dựa trên danh mục có sẵn
  if (context?.toursByCategory) {
    Object.keys(context.toursByCategory).slice(0, 2).forEach(category => {
      // Kiểm tra category là string trước khi gọi toLowerCase
      if (typeof category === 'string' && !suggestions.some(s =>
        typeof s === 'string' && s.toLowerCase().includes(category.toLowerCase())
      )) {
        suggestions.push(`🎯 ${category}`);
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
  // Kiểm tra và chuyển đổi message thành string
  if (!message || typeof message !== 'string') {
    return {
      intent: 'GENERAL',
      entities: {},
      originalMessage: message || ''
    };
  }

  const lowerMessage = message.toLowerCase();
  
  const intents = {
    SEARCH_TOUR: [
      'tour', 'du lịch', 'đi chơi', 'nghỉ dưỡng', 'trip', 'travel', 'vacation',
      'đi đâu', 'đi chơi đâu', 'nghỉ mát', 'tham quan', 'khám phá', 'du ngoạn',
      'chuyến đi', 'hành trình', 'kỳ nghỉ', 'picnic', 'leo núi', 'đi biển'
    ],
    PRICE_INQUIRY: [
      'giá', 'chi phí', 'bao nhiêu tiền', 'cost', 'price', 'phí',
      'tiền', 'đắt', 'rẻ', 'mắc', 'ngân sách', 'budget', 'tốn kém',
      'giá cả', 'chi tiêu', 'kinh phí', 'tiết kiệm'
    ],
    DESTINATION_INFO: [
      'địa điểm', 'nơi nào', 'đâu', 'destination', 'điểm đến',
      'vùng', 'khu vực', 'thành phố', 'tỉnh', 'quốc gia', 'place', 'location'
    ],
    DURATION_INFO: [
      'bao lâu', 'mấy ngày', 'duration', 'thời gian', 'ngày', 'đêm',
      'tuần', 'tháng', 'bao nhiêu ngày', 'kéo dài', 'time'
    ],
    BOOKING_INFO: [
      'đặt', 'book', 'booking', 'đăng ký', 'reserve', 'reservation',
      'đặt tour', 'đặt chỗ', 'đặt vé', 'mua tour', 'thanh toán'
    ],
    RECOMMENDATION: [
      'gợi ý', 'recommend', 'tư vấn', 'suggest', 'nên', 'should',
      'khuyên', 'advice', 'chọn', 'lựa chọn', 'pick', 'select'
    ],
    COMPARISON: [
      'so sánh', 'khác nhau', 'nên chọn', 'tốt hơn', 'hơn kém',
      'compare', 'difference', 'better', 'worse', 'vs', 'hay hơn'
    ],
    WEATHER_INFO: [
      'thời tiết', 'mùa nào', 'khi nào đi', 'thời điểm', 'weather',
      'climate', 'mùa', 'season', 'nắng', 'mưa', 'lạnh', 'nóng'
    ],
    TRANSPORTATION: [
      'phương tiện', 'xe', 'máy bay', 'tàu', 'ô tô', 'bus',
      'transportation', 'vehicle', 'flight', 'car', 'train'
    ],
    ACCOMMODATION: [
      'khách sạn', 'nơi ở', 'lưu trú', 'resort', 'hotel',
      'homestay', 'villa', 'accommodation', 'stay', 'lodging'
    ],
    FOOD_INFO: [
      'ăn gì', 'đặc sản', 'ẩm thực', 'món ngon', 'food',
      'cuisine', 'specialty', 'delicious', 'restaurant', 'quán ăn'
    ],
    CULTURE_INFO: [
      'văn hóa', 'lịch sử', 'truyền thống', 'phong tục', 'culture',
      'history', 'tradition', 'custom', 'heritage', 'di sản'
    ],
    ACTIVITY_INFO: [
      'hoạt động', 'làm gì', 'chơi gì', 'trải nghiệm', 'activity',
      'experience', 'entertainment', 'fun', 'adventure', 'thú vị'
    ]
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
  // Kiểm tra input
  if (!message || typeof message !== 'string') return null;

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
  // Kiểm tra input
  if (!message || typeof message !== 'string') return [];

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
  // Kiểm tra input
  if (!message || typeof message !== 'string') return null;

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

/**
 * Phân tích loại câu hỏi phức tạp
 * @param {string} message - Tin nhắn người dùng
 * @returns {string} Loại câu hỏi
 */
export const analyzeQuestionComplexity = (message) => {
  if (!message || typeof message !== 'string') return 'SIMPLE';
  
  const lowerMessage = message.toLowerCase();
  
  // Phát hiện câu hỏi so sánh
  const comparisonKeywords = ['so sánh', 'khác nhau', 'nên chọn', 'tốt hơn', 'hay hơn', 'vs', 'compare'];
  if (comparisonKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'COMPARISON';
  }
  
  // Phát hiện câu hỏi điều kiện
  const conditionalKeywords = ['nếu', 'khi nào', 'trong trường hợp', 'giả sử', 'if', 'when', 'suppose'];
  if (conditionalKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'CONDITIONAL';
  }
  
  // Phát hiện câu hỏi tư vấn
  const advisoryKeywords = ['nên', 'không nên', 'có nên', 'có thể', 'should', 'recommend'];
  if (advisoryKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'ADVISORY';
  }
  
  // Phát hiện câu hỏi nhiều tiêu chí
  const criteriaCount = [
    lowerMessage.includes('giá') || lowerMessage.includes('tiền'),
    lowerMessage.includes('ngày') || lowerMessage.includes('thời gian'),
    lowerMessage.includes('địa điểm') || lowerMessage.includes('đâu'),
    lowerMessage.includes('người') || lowerMessage.includes('cặp'),
    lowerMessage.includes('mùa') || lowerMessage.includes('thời tiết')
  ].filter(Boolean).length;
  
  if (criteriaCount >= 2) {
    return 'MULTI_CRITERIA';
  }
  
  return 'SIMPLE';
};

/**
 * Tạo gợi ý thông minh dựa trên ngữ cảnh
 * @param {Array} chatHistory - Lịch sử chat
 * @param {string} currentMessage - Tin nhắn hiện tại
 * @returns {Array} Danh sách gợi ý
 */
export const generateContextualSuggestions = (chatHistory = [], currentMessage = '') => {
  const suggestions = [];
  const historyText = chatHistory.map(msg => msg.text || msg.content || '').join(' ').toLowerCase();
  const currentText = currentMessage.toLowerCase();
  
  // Dựa trên lịch sử chat
  if (historyText.includes('tour biển') || historyText.includes('đi biển')) {
    suggestions.push('🌊 Tour biển khác', '🏄 Hoạt động dưới nước', '🏖️ Resort biển');
  }
  
  if (historyText.includes('leo núi') || historyText.includes('núi')) {
    suggestions.push('⛰️ Tour núi khác', '🥾 Trekking', '🌲 Eco tour');
  }
  
  // Dựa trên ngân sách đã đề cập
  const budgetMatch = currentText.match(/(\d+)\s*(triệu|tr|k)/);
  if (budgetMatch) {
    const budget = parseInt(budgetMatch[1]);
    const unit = budgetMatch[2];
    const budgetVND = unit === 'k' ? budget * 1000 : budget * 1000000;
    
    suggestions.push(
      `💰 Tour dưới ${budget}${unit}`,
      '💎 Tour cao cấp',
      '🎁 Tour khuyến mãi'
    );
  }
  
  // Dựa trên điểm đến
  const destinations = extractDestinations(currentText);
  if (destinations.length > 0) {
    const dest = destinations[0];
    if (dest.includes('phú quốc')) {
      suggestions.push('🏝️ Tour đảo khác', '🌊 Nghỉ dưỡng biển', '🎣 Tour câu cá');
    } else if (dest.includes('đà lạt')) {
      suggestions.push('🌸 Tour hoa', '☕ Tour cà phê', '🏔️ Tour núi');
    } else if (dest.includes('sapa')) {
      suggestions.push('🌾 Tour ruộng bậc thang', '🥾 Trekking', '🏘️ Homestay');
    }
  }
  
  // Dựa trên thời gian
  if (currentText.includes('cuối tuần') || currentText.includes('weekend')) {
    suggestions.push('⚡ Tour 2N1Đ', '🚗 Tour gần HN/HCM', '🎯 Tour nhanh');
  }
  
  // Dựa trên số người
  if (currentText.includes('cặp đôi') || currentText.includes('couple')) {
    suggestions.push('💕 Tour honeymoon', '🥂 Tour lãng mạn', '🌅 Tour ngắm hoàng hôn');
  }
  
  if (currentText.includes('gia đình') || currentText.includes('family')) {
    suggestions.push('👨‍👩‍👧‍👦 Tour gia đình', '🎢 Tour vui chơi', '🏖️ Resort family');
  }
  
  // Nếu không có gợi ý cụ thể, dùng gợi ý mặc định
  if (suggestions.length === 0) {
    suggestions.push(
      '🔥 Tour hot nhất',
      '💰 Tour tiết kiệm',
      '⭐ Tour được yêu thích',
      '🆕 Tour mới nhất'
    );
  }
  
  return suggestions.slice(0, 6);
};

/**
 * Lưu câu hỏi không trả lời được để cải thiện
 * @param {string} question - Câu hỏi
 * @param {string} sessionId - ID phiên
 * @param {string} reason - Lý do không trả lời được
 */
export const trackUnansweredQuestion = (question, sessionId, reason = 'unknown') => {
  try {
    const unansweredQuestions = JSON.parse(localStorage.getItem('unanswered_questions') || '[]');
    unansweredQuestions.push({
      question: question.trim(),
      sessionId,
      reason,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    
    // Giữ tối đa 100 câu hỏi
    if (unansweredQuestions.length > 100) {
      unansweredQuestions.splice(0, unansweredQuestions.length - 100);
    }
    
    localStorage.setItem('unanswered_questions', JSON.stringify(unansweredQuestions));
    
    // Gửi về backend để phân tích (không chặn UI)
    fetch('/api/chatbot/unanswered-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, sessionId, reason })
    }).catch(err => console.warn('Failed to log unanswered question:', err));
    
  } catch (error) {
    console.warn('Failed to track unanswered question:', error);
  }
};

/**
 * Phân tích cảm xúc người dùng từ tin nhắn
 * @param {string} message - Tin nhắn
 * @returns {Object} Kết quả phân tích cảm xúc
 */
export const analyzeSentiment = (message) => {
  if (!message || typeof message !== 'string') {
    return { sentiment: 'neutral', confidence: 0 };
  }
  
  const lowerMessage = message.toLowerCase();
  
  // Từ khóa tích cực
  const positiveKeywords = [
    'tốt', 'hay', 'đẹp', 'tuyệt', 'wonderful', 'great', 'excellent',
    'thích', 'yêu', 'love', 'like', 'amazing', 'fantastic',
    'cảm ơn', 'thank', 'good', 'nice', 'perfect'
  ];
  
  // Từ khóa tiêu cực
  const negativeKeywords = [
    'tệ', 'xấu', 'không tốt', 'bad', 'terrible', 'awful',
    'không thích', 'ghét', 'hate', 'dislike', 'boring',
    'đắt quá', 'expensive', 'poor', 'worst'
  ];
  
  // Từ khóa thất vọng
  const disappointedKeywords = [
    'thất vọng', 'disappointed', 'not good', 'không như mong đợi',
    'kém', 'không đáng', 'waste', 'lãng phí'
  ];
  
  let positiveCount = positiveKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
  let negativeCount = negativeKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
  let disappointedCount = disappointedKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
  
  if (disappointedCount > 0) {
    return { sentiment: 'disappointed', confidence: 0.8 };
  } else if (positiveCount > negativeCount) {
    return { sentiment: 'positive', confidence: Math.min(0.9, 0.5 + positiveCount * 0.2) };
  } else if (negativeCount > positiveCount) {
    return { sentiment: 'negative', confidence: Math.min(0.9, 0.5 + negativeCount * 0.2) };
  } else {
    return { sentiment: 'neutral', confidence: 0.5 };
  }
};

/**
 * Tối ưu hóa tin nhắn gửi đến AI
 * @param {string} message - Tin nhắn gốc
 * @param {Array} chatHistory - Lịch sử chat
 * @returns {string} Tin nhắn đã tối ưu
 */
export const optimizeMessageForAI = (message, chatHistory = []) => {
  if (!message) return message;
  
  let optimizedMessage = message.trim();
  
  // Thêm context từ lịch sử nếu tin nhắn quá ngắn
  if (optimizedMessage.length < 10 && chatHistory.length > 0) {
    const lastUserMessage = chatHistory
      .filter(msg => msg.isUser)
      .slice(-2)[0];
    
    if (lastUserMessage) {
      optimizedMessage = `Liên quan đến câu hỏi trước: "${lastUserMessage.text}". ${optimizedMessage}`;
    }
  }
  
  // Phân tích intent và thêm context
  const intent = analyzeUserIntent(optimizedMessage);
  const complexity = analyzeQuestionComplexity(optimizedMessage);
  
  if (complexity === 'COMPARISON') {
    optimizedMessage = `[YÊU CẦU SO SÁNH] ${optimizedMessage}`;
  } else if (complexity === 'ADVISORY') {
    optimizedMessage = `[YÊU CẦU TƯ VẤN] ${optimizedMessage}`;
  } else if (complexity === 'MULTI_CRITERIA') {
    optimizedMessage = `[TÌM KIẾM NHIỀU TIÊU CHÍ] ${optimizedMessage}`;
  }
  
  return optimizedMessage;
};

export default {
  formatPrice,
  formatRating,
  formatDate,
  generateQuickSuggestions,
  analyzeUserIntent,
  createTourCard,
  createStatsSummary,
  analyzeQuestionComplexity,
  generateContextualSuggestions,
  trackUnansweredQuestion,
  analyzeSentiment,
  optimizeMessageForAI,
  extractDestinations,
  extractPriceRange,
  extractDuration
};
