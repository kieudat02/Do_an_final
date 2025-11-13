import axiosInstance from "./axiosInstance";
import { API_ENDPOINTS } from "../constants/ApiEndPoints";

/**
 * Service để xử lý chat rating
 */

/**
 * Tạo hoặc cập nhật rating cho tin nhắn chatbot (legacy - sẽ được thay thế)
 * @param {Object} ratingData - Dữ liệu rating
 * @param {string} ratingData.sessionId - ID phiên hội thoại
 * @param {string} ratingData.messageId - ID tin nhắn
 * @param {number} ratingData.rating - Điểm rating (1-5)
 * @param {string} ratingData.feedback - Feedback (optional)
 * @returns {Promise} Response từ API
 */
export const createOrUpdateRating = async (ratingData) => {
  try {
    // Validate input
    if (!ratingData.sessionId || !ratingData.messageId || !ratingData.rating) {
      throw new Error('Thiếu thông tin sessionId, messageId hoặc rating');
    }

    if (!Number.isInteger(ratingData.rating) || ratingData.rating < 1 || ratingData.rating > 5) {
      throw new Error('Rating phải là số nguyên từ 1 đến 5');
    }

    const response = await axiosInstance.post(API_ENDPOINTS.CHAT_RATING_CREATE, {
      sessionId: ratingData.sessionId,
      messageId: ratingData.messageId,
      rating: ratingData.rating,
      feedback: ratingData.feedback || ''
    });

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      throw new Error(response.data.message || 'Có lỗi xảy ra khi gửi rating');
    }

  } catch (error) {
    console.error('Create/Update rating error:', error);

    let errorMessage = 'Có lỗi xảy ra khi gửi rating. Vui lòng thử lại sau.';

    if (error.response) {
      const status = error.response.status;
      const serverError = error.response.data?.message;

      if (status === 400) {
        errorMessage = serverError || 'Dữ liệu không hợp lệ';
      } else if (status === 429) {
        errorMessage = serverError || 'Bạn đang gửi rating quá nhanh. Vui lòng chờ một chút.';
      } else if (status === 500) {
        errorMessage = serverError || 'Lỗi hệ thống. Vui lòng thử lại sau.';
      } else {
        errorMessage = serverError || errorMessage;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Lấy thống kê CSAT
 * @param {Object} params - Tham số query
 * @param {string} params.dateFrom - Ngày bắt đầu (optional)
 * @param {string} params.dateTo - Ngày kết thúc (optional)
 * @param {string} params.sessionId - ID phiên hội thoại (optional)
 * @returns {Promise} Thống kê CSAT
 */
export const getCSATStats = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.dateFrom) {
      queryParams.append('dateFrom', params.dateFrom);
    }
    if (params.dateTo) {
      queryParams.append('dateTo', params.dateTo);
    }
    if (params.sessionId) {
      queryParams.append('sessionId', params.sessionId);
    }

    const url = `${API_ENDPOINTS.CHAT_RATING_STATS}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await axiosInstance.get(url);

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      throw new Error(response.data.message || 'Không thể lấy thống kê CSAT');
    }

  } catch (error) {
    console.error('Get CSAT stats error:', error);

    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Không thể lấy thống kê CSAT'
    };
  }
};

/**
 * Lấy trend đánh giá theo thời gian
 * @param {number} days - Số ngày (default: 7)
 * @returns {Promise} Trend data
 */
export const getRatingTrend = async (days = 7) => {
  try {
    if (days < 1 || days > 365) {
      throw new Error('Số ngày phải từ 1 đến 365');
    }

    const response = await axiosInstance.get(`${API_ENDPOINTS.CHAT_RATING_TREND}?days=${days}`);

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      throw new Error(response.data.message || 'Không thể lấy trend đánh giá');
    }

  } catch (error) {
    console.error('Get rating trend error:', error);

    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Không thể lấy trend đánh giá'
    };
  }
};

/**
 * Utility functions cho localStorage
 */
export const ChatRatingStorage = {
  // Lưu rating local (backup)
  saveLocalRating: (messageId, rating, feedback = '') => {
    try {
      const key = `chat_rating_${messageId}`;
      const data = {
        rating,
        feedback,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Cannot save rating to localStorage:', error);
    }
  },

  // Lấy rating local
  getLocalRating: (messageId) => {
    try {
      const key = `chat_rating_${messageId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Cannot get rating from localStorage:', error);
      return null;
    }
  },

  // Xóa rating local
  clearLocalRating: (messageId) => {
    try {
      const key = `chat_rating_${messageId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Cannot clear rating from localStorage:', error);
    }
  },

  // Lấy tất cả ratings local
  getAllLocalRatings: () => {
    try {
      const ratings = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chat_rating_')) {
          const messageId = key.replace('chat_rating_', '');
          const data = localStorage.getItem(key);
          if (data) {
            ratings[messageId] = JSON.parse(data);
          }
        }
      }
      return ratings;
    } catch (error) {
      console.warn('Cannot get all ratings from localStorage:', error);
      return {};
    }
  },

  // Xóa tất cả ratings local
  clearAllLocalRatings: () => {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chat_rating_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Cannot clear all ratings from localStorage:', error);
    }
  }
};

/**
 * Helper functions
 */

/**
 * Tính CSAT score từ ratings
 * @param {Array} ratings - Mảng ratings
 * @returns {number} CSAT score (%)
 */
export const calculateCSATScore = (ratings) => {
  if (!ratings || ratings.length === 0) return 0;
  
  const satisfiedCount = ratings.filter(rating => rating >= 4).length;
  return Math.round((satisfiedCount / ratings.length) * 100);
};

/**
 * Phân loại rating
 * @param {number} rating - Rating (1-5)
 * @returns {string} Category
 */
export const getRatingCategory = (rating) => {
  if (rating >= 4) return 'satisfied';
  if (rating === 3) return 'neutral';
  return 'dissatisfied';
};

/**
 * Lấy text mô tả rating
 * @param {number} rating - Rating (1-5)
 * @returns {string} Description
 */
export const getRatingDescription = (rating) => {
  switch (rating) {
    case 1: return 'Rất không hài lòng';
    case 2: return 'Không hài lòng';
    case 3: return 'Bình thường';
    case 4: return 'Hài lòng';
    case 5: return 'Rất hài lòng';
    default: return 'Chưa đánh giá';
  }
};

// ========== SESSION RATING FUNCTIONS (NEW) ==========

/**
 * Tạo hoặc cập nhật rating cho phiên hội thoại
 * @param {Object} ratingData - Dữ liệu rating phiên
 * @param {string} ratingData.sessionId - ID phiên hội thoại
 * @param {number} ratingData.rating - Điểm rating (1-5)
 * @param {string} ratingData.feedback - Feedback (optional)
 * @param {string} ratingData.ratingType - Loại rating (manual, auto_prompt, etc.)
 * @param {string} ratingData.ratingTrigger - Trigger rating (user_initiated, session_timeout, etc.)
 * @param {Object} ratingData.sessionStats - Thống kê phiên (optional)
 * @returns {Promise} Response từ API
 */
export const createOrUpdateSessionRating = async (ratingData) => {
  try {
    // Validate input
    if (!ratingData.sessionId || !ratingData.rating) {
      throw new Error('Thiếu thông tin sessionId hoặc rating');
    }

    if (!Number.isInteger(ratingData.rating) || ratingData.rating < 1 || ratingData.rating > 5) {
      throw new Error('Rating phải là số nguyên từ 1 đến 5');
    }

    if (ratingData.feedback && ratingData.feedback.length > 1000) {
      throw new Error('Feedback không được vượt quá 1000 ký tự');
    }

    const response = await axiosInstance.post(API_ENDPOINTS.SESSION_RATING_CREATE, {
      sessionId: ratingData.sessionId,
      rating: ratingData.rating,
      feedback: ratingData.feedback || '',
      ratingType: ratingData.ratingType || 'manual',
      ratingTrigger: ratingData.ratingTrigger || 'user_initiated',
      sessionStats: ratingData.sessionStats || {}
    });

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } else {
      throw new Error(response.data.message || 'Có lỗi xảy ra khi gửi đánh giá phiên');
    }

  } catch (error) {
    console.error('Create/Update session rating error:', error);

    let errorMessage = 'Có lỗi xảy ra khi gửi đánh giá phiên. Vui lòng thử lại sau.';

    if (error.response) {
      const status = error.response.status;
      const serverError = error.response.data?.message;

      if (status === 400) {
        errorMessage = serverError || 'Dữ liệu không hợp lệ';
      } else if (status === 409) {
        errorMessage = serverError || 'Phiên này đã được đánh giá. Vui lòng thử lại.';
      } else if (status === 429) {
        errorMessage = serverError || 'Bạn đang gửi đánh giá quá nhanh. Vui lòng chờ một chút.';
      } else if (status === 500) {
        errorMessage = serverError || 'Lỗi hệ thống. Vui lòng thử lại sau.';
      } else {
        errorMessage = serverError || errorMessage;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Kiểm tra xem session đã được đánh giá chưa
 * @param {string} sessionId - ID phiên hội thoại
 * @returns {Promise} Response từ API
 */
export const checkSessionRated = async (sessionId) => {
  try {
    if (!sessionId) {
      throw new Error('Thiếu sessionId');
    }

    const response = await axiosInstance.get(API_ENDPOINTS.SESSION_RATING_CHECK(sessionId));

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      throw new Error(response.data.message || 'Có lỗi xảy ra khi kiểm tra đánh giá');
    }

  } catch (error) {
    console.error('Check session rating error:', error);

    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Có lỗi xảy ra khi kiểm tra đánh giá'
    };
  }
};
