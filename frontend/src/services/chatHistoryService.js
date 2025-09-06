/**
 * Service để quản lý lịch sử cuộc trò chuyện
 * Lưu trữ trong localStorage với khả năng sync với server
 */

const STORAGE_KEY = 'nd_travel_chat_history';
const MAX_HISTORY_ITEMS = 50; // Giới hạn số lượng lịch sử

/**
 * Cấu trúc dữ liệu lịch sử:
 * {
 *   id: string,
 *   sessionId: string,
 *   title: string, // Tự động tạo từ tin nhắn đầu tiên
 *   messages: Array,
 *   createdAt: Date,
 *   updatedAt: Date,
 *   messageCount: number,
 *   rating: number | null,
 *   tags: Array<string> // Tự động phân loại
 * }
 */

/**
 * Lấy tất cả lịch sử cuộc trò chuyện
 */
export const getChatHistory = () => {
  try {
    const history = localStorage.getItem(STORAGE_KEY);
    if (!history) return [];
    
    const parsed = JSON.parse(history);
    
    // Sắp xếp theo thời gian cập nhật mới nhất
    return parsed.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
};

/**
 * Lưu cuộc trò chuyện vào lịch sử
 */
export const saveChatToHistory = (sessionId, messages, rating = null) => {
  try {
    if (!sessionId || !messages || messages.length === 0) {
      return { success: false, error: 'Invalid session data' };
    }

    // Lọc tin nhắn hợp lệ (bỏ tin nhắn đánh giá và lỗi)
    const validMessages = messages.filter(msg => 
      !msg.isRating && !msg.isError && msg.text && msg.text.trim()
    );

    if (validMessages.length === 0) {
      return { success: false, error: 'No valid messages to save' };
    }

    const history = getChatHistory();
    
    // Kiểm tra xem session đã tồn tại chưa
    const existingIndex = history.findIndex(item => item.sessionId === sessionId);
    
    // Tạo title từ tin nhắn đầu tiên của user
    const firstUserMessage = validMessages.find(msg => msg.isUser);
    const title = firstUserMessage 
      ? truncateText(firstUserMessage.text, 50)
      : `Cuộc trò chuyện ${new Date().toLocaleDateString('vi-VN')}`;

    // Tạo tags tự động
    const tags = generateTags(validMessages);

    const chatItem = {
      id: existingIndex >= 0 ? history[existingIndex].id : generateId(),
      sessionId,
      title,
      messages: validMessages,
      createdAt: existingIndex >= 0 ? history[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: validMessages.length,
      rating,
      tags
    };

    if (existingIndex >= 0) {
      // Cập nhật cuộc trò chuyện hiện có
      history[existingIndex] = chatItem;
    } else {
      // Thêm cuộc trò chuyện mới
      history.unshift(chatItem);
      
      // Giới hạn số lượng lịch sử
      if (history.length > MAX_HISTORY_ITEMS) {
        history.splice(MAX_HISTORY_ITEMS);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    
    return { 
      success: true, 
      data: chatItem,
      isUpdate: existingIndex >= 0
    };
  } catch (error) {
    console.error('Error saving chat to history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Xóa một mục lịch sử
 */
export const deleteChatHistory = (id) => {
  try {
    const history = getChatHistory();
    const filteredHistory = history.filter(item => item.id !== id);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));
    
    return { 
      success: true, 
      deletedCount: history.length - filteredHistory.length 
    };
  } catch (error) {
    console.error('Error deleting chat history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Xóa tất cả lịch sử
 */
export const clearAllChatHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return { success: true };
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Lấy một cuộc trò chuyện cụ thể
 */
export const getChatById = (id) => {
  try {
    const history = getChatHistory();
    return history.find(item => item.id === id) || null;
  } catch (error) {
    console.error('Error getting chat by id:', error);
    return null;
  }
};

/**
 * Tìm kiếm lịch sử cuộc trò chuyện
 */
export const searchChatHistory = (query) => {
  try {
    if (!query || query.trim() === '') {
      return getChatHistory();
    }

    const history = getChatHistory();
    const searchTerm = query.toLowerCase().trim();
    
    return history.filter(item => {
      // Tìm trong title
      if (item.title.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Tìm trong tags
      if (item.tags.some(tag => tag.toLowerCase().includes(searchTerm))) {
        return true;
      }
      
      // Tìm trong nội dung tin nhắn
      return item.messages.some(msg => 
        msg.text.toLowerCase().includes(searchTerm)
      );
    });
  } catch (error) {
    console.error('Error searching chat history:', error);
    return [];
  }
};

/**
 * Lấy thống kê lịch sử
 */
export const getChatHistoryStats = () => {
  try {
    const history = getChatHistory();
    
    const totalChats = history.length;
    const totalMessages = history.reduce((sum, chat) => sum + chat.messageCount, 0);
    const ratedChats = history.filter(chat => chat.rating !== null).length;
    const avgRating = ratedChats > 0 
      ? history.reduce((sum, chat) => sum + (chat.rating || 0), 0) / ratedChats 
      : 0;
    
    // Thống kê theo tags
    const tagStats = {};
    history.forEach(chat => {
      chat.tags.forEach(tag => {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
      });
    });
    
    return {
      totalChats,
      totalMessages,
      ratedChats,
      avgRating: Math.round(avgRating * 10) / 10,
      tagStats
    };
  } catch (error) {
    console.error('Error getting chat history stats:', error);
    return {
      totalChats: 0,
      totalMessages: 0,
      ratedChats: 0,
      avgRating: 0,
      tagStats: {}
    };
  }
};

// Helper functions

/**
 * Tạo ID ngẫu nhiên
 */
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Cắt ngắn text
 */
const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength).trim() + '...';
};

/**
 * Tạo tags tự động từ nội dung cuộc trò chuyện
 */
const generateTags = (messages) => {
  const tags = [];
  const content = messages.map(msg => msg.text.toLowerCase()).join(' ');
  
  // Từ khóa để phân loại
  const keywords = {
    'tour': ['tour', 'du lịch', 'chuyến đi', 'hành trình'],
    'booking': ['đặt', 'booking', 'đặt chỗ', 'đặt tour'],
    'price': ['giá', 'chi phí', 'tiền', 'cost', 'price'],
    'location': ['hà nội', 'hồ chí minh', 'đà nẵng', 'phú quốc', 'sapa', 'hạ long'],
    'international': ['singapore', 'malaysia', 'thái lan', 'nhật bản', 'hàn quốc'],
    'domestic': ['trong nước', 'việt nam', 'miền bắc', 'miền nam', 'miền trung'],
    'support': ['hỗ trợ', 'giúp đỡ', 'support', 'help', 'tư vấn']
  };

  Object.entries(keywords).forEach(([tag, words]) => {
    if (words.some(word => content.includes(word))) {
      tags.push(tag);
    }
  });

  // Thêm tag theo thời gian
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 6 && hour < 12) tags.push('morning');
  else if (hour >= 12 && hour < 18) tags.push('afternoon');
  else if (hour >= 18 && hour < 22) tags.push('evening');
  else tags.push('night');

  return tags.length > 0 ? tags : ['general'];
};
