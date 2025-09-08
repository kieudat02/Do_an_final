import axiosInstance from "./axiosInstance";
import responseTimeTracker from "../utils/responseTimeTracker";

// API endpoints cho chatbot - cleaned up unused endpoints
const CHATBOT_ENDPOINTS = {
  SEND_MESSAGE: "/api/chat/message",
  CREATE_SESSION: "/api/chat/session",
  GET_STATUS: "/api/chat/status",
  GET_CONTEXT: "/api/chat/context"
};

/**
 * Gửi tin nhắn đến chatbot
 * @param {string} message - Tin nhắn từ người dùng
 * @param {string} sessionId - ID phiên hội thoại (optional)
 * @returns {Promise} Response từ API
 */
export const sendMessage = async (message, sessionId = null) => {
  // Tạo unique request ID
  const requestId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Tin nhắn không được để trống');
    }

    if (message.trim().length > 1000) {
      throw new Error('Tin nhắn quá dài. Vui lòng nhập tối đa 1000 ký tự.');
    }

    const requestData = {
      message: message.trim(),
      ...(sessionId && { sessionId })
    };

    // Bắt đầu tracking response time
    responseTimeTracker.startTracking(requestId, {
      endpoint: CHATBOT_ENDPOINTS.SEND_MESSAGE,
      sessionId: sessionId || 'unknown',
      messageId: requestId,
      inputLength: message.trim().length,
      requestType: 'message'
    });

    const response = await axiosInstance.post(CHATBOT_ENDPOINTS.SEND_MESSAGE, requestData);

    if (response.data.success) {
      // Kết thúc tracking với kết quả thành công
      responseTimeTracker.endTracking(requestId, {
        success: true,
        statusCode: response.status,
        outputLength: response.data.data?.reply?.length || 0,
        data: response.data.data
      });

      return {
        success: true,
        data: {
          ...response.data.data,
          requestId // Thêm requestId để có thể track rating sau này
        }
      };
    } else {
      // Kết thúc tracking với kết quả thất bại
      responseTimeTracker.endTracking(requestId, {
        success: false,
        statusCode: response.status,
        error: response.data.error || 'Có lỗi xảy ra khi gửi tin nhắn'
      });

      throw new Error(response.data.error || 'Có lỗi xảy ra khi gửi tin nhắn');
    }

  } catch (error) {
    console.error('Send message error:', error);

    // Kết thúc tracking với lỗi
    responseTimeTracker.endTracking(requestId, {
      success: false,
      statusCode: error.response?.status || 0,
      error: error.message
    });

    // Xử lý các loại lỗi khác nhau
    let errorMessage = 'Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau.';

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const serverError = error.response.data?.error;

      if (status === 400) {
        errorMessage = serverError || 'Dữ liệu không hợp lệ';
      } else if (status === 429) {
        errorMessage = serverError || 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng chờ một chút.';
      } else if (status === 500) {
        errorMessage = serverError || 'Lỗi hệ thống. Vui lòng thử lại sau.';
      } else {
        errorMessage = serverError || errorMessage;
      }
    } else if (error.request) {
      // Network error
      errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
    } else if (error.message) {
      // Custom error message
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};





/**
 * Tạo phiên hội thoại mới
 * @returns {Promise} Session ID mới
 */
export const createNewSession = async () => {
  try {
    const response = await axiosInstance.post(CHATBOT_ENDPOINTS.CREATE_SESSION);

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      throw new Error(response.data.error || 'Không thể tạo phiên hội thoại mới');
    }

  } catch (error) {
    console.error('Create session error:', error);

    return {
      success: false,
      error: error.message || 'Không thể tạo phiên hội thoại mới'
    };
  }
};

// Removed unused functions: searchTours and getToursByPriceRange
// These functions are not used in the current implementation

/**
 * Lấy thông tin context cho chatbot
 * @returns {Promise} Context data
 */
export const getChatbotContext = async () => {
  try {
    const response = await axiosInstance.get(CHATBOT_ENDPOINTS.GET_CONTEXT);

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      throw new Error(response.data.error || 'Không thể lấy thông tin context');
    }

  } catch (error) {
    console.error('Get chatbot context error:', error);

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Không thể lấy thông tin context'
    };
  }
};

/**
 * Lấy chi tiết tour
 * @param {string} tourId - ID của tour
 * @returns {Promise} Thông tin chi tiết tour
 */
export const getTourDetails = async (tourId) => {
  try {
    if (!tourId) {
      throw new Error('ID tour không hợp lệ');
    }

    const response = await axiosInstance.get(CHATBOT_ENDPOINTS.TOUR_DETAILS(tourId));

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      throw new Error(response.data.error || 'Không thể lấy thông tin chi tiết tour');
    }

  } catch (error) {
    console.error('Get tour details error:', error);

    let errorMessage = 'Không thể lấy thông tin chi tiết tour';
    if (error.response?.status === 404) {
      errorMessage = 'Không tìm thấy tour';
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
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
 * Kiểm tra trạng thái chatbot
 * @returns {Promise} Trạng thái chatbot
 */
export const getChatbotStatus = async () => {
  try {
    const response = await axiosInstance.get(CHATBOT_ENDPOINTS.GET_STATUS);

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      throw new Error(response.data.error || 'Không thể kiểm tra trạng thái chatbot');
    }

  } catch (error) {
    console.error('Get chatbot status error:', error);

    return {
      success: false,
      error: error.message || 'Không thể kiểm tra trạng thái chatbot'
    };
  }
};

/**
 * Utility functions cho localStorage
 */
export const ChatStorage = {
  // Lưu session ID
  saveSessionId: (sessionId) => {
    try {
      localStorage.setItem('chatbot_session_id', sessionId);
    } catch (error) {
      console.warn('Cannot save session ID to localStorage:', error);
    }
  },

  // Lấy session ID
  getSessionId: () => {
    try {
      return localStorage.getItem('chatbot_session_id');
    } catch (error) {
      console.warn('Cannot get session ID from localStorage:', error);
      return null;
    }
  },

  // Xóa session ID
  clearSessionId: () => {
    try {
      localStorage.removeItem('chatbot_session_id');
    } catch (error) {
      console.warn('Cannot clear session ID from localStorage:', error);
    }
  },




};