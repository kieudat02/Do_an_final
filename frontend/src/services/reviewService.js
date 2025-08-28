import axiosInstance from "./axiosInstance";

// Kiểm tra tính hợp lệ của review link
export const checkReviewLink = async (bookingId, token) => {
  try {
    const response = await axiosInstance.get('/api/review/check-link', {
      params: {
        bookingId,
        token
      }
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi kiểm tra review link:', error);
    
    // Trả về error response nếu có
    if (error.response && error.response.data) {
      return error.response.data;
    }
    
    // Trả về generic error
    return {
      success: false,
      error: 'Có lỗi xảy ra khi kiểm tra link đánh giá',
      errorCode: 'NETWORK_ERROR'
    };
  }
};

// Gửi đánh giá từ khách hàng
export const submitReview = async (bookingId, token, rating, comment) => {
  try {
    const response = await axiosInstance.post('/api/review/submit', {
      bookingId,
      token,
      rating,
      comment
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi gửi đánh giá:', error);
    
    // Trả về error response nếu có
    if (error.response && error.response.data) {
      return error.response.data;
    }
    
    // Trả về generic error
    return {
      success: false,
      error: 'Có lỗi xảy ra khi gửi đánh giá',
      errorCode: 'NETWORK_ERROR'
    };
  }
};

// Lấy thông tin order để hiển thị trong form
export const getOrderInfo = async (bookingId, token) => {
  try {
    const response = await axiosInstance.get('/api/review/order-info', {
      params: {
        bookingId,
        token
      }
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi lấy thông tin order:', error);
    
    // Trả về error response nếu có
    if (error.response && error.response.data) {
      return error.response.data;
    }
    
    // Trả về generic error
    return {
      success: false,
      error: 'Có lỗi xảy ra khi lấy thông tin đơn hàng',
      errorCode: 'NETWORK_ERROR'
    };
  }
};

// Validate review form data trước khi submit
export const validateReviewForm = (rating, comment) => {
  const errors = {};

  // Validate rating
  if (!rating) {
    errors.rating = 'Vui lòng chọn số sao đánh giá';
  } else {
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      errors.rating = 'Đánh giá sao phải từ 1 đến 5';
    }
  }

  // Validate comment
  if (!comment || comment.trim() === '') {
    errors.comment = 'Vui lòng nhập bình luận';
  } else {
    const trimmedComment = comment.trim();
    if (trimmedComment.length < 10) {
      errors.comment = 'Bình luận phải có ít nhất 10 ký tự';
    } else if (trimmedComment.length > 1000) {
      errors.comment = 'Bình luận không được vượt quá 1000 ký tự';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};


// Parse URL parameters để lấy bookingId và token
export const parseReviewParams = (search) => {
  const urlParams = new URLSearchParams(search);
  return {
    bookingId: urlParams.get('bookingId'),
    token: urlParams.get('token')
  };
};

// Format error message để hiển thị cho user
export const formatErrorMessage = (errorCode, defaultMessage = 'Có lỗi xảy ra') => {
  const errorMessages = {
    'ORDER_NOT_FOUND': 'Không tìm thấy đơn đặt tour',
    'ALREADY_REVIEWED': 'Đơn đặt tour này đã được đánh giá rồi',
    'TOKEN_NOT_FOUND': 'Link đánh giá không hợp lệ hoặc đã hết hạn',
    'INVALID_TOKEN': 'Link đánh giá không hợp lệ',
    'TOKEN_EXPIRED': 'Link đánh giá đã hết hạn',
    'MISSING_PARAMS': 'Thiếu thông tin cần thiết',
    'VALIDATION_ERROR': 'Dữ liệu không hợp lệ',
    'NETWORK_ERROR': 'Lỗi kết nối mạng',
    'SERVER_ERROR': 'Lỗi server'
  };

  return errorMessages[errorCode] || defaultMessage;
};

// Generate star rating display
export const generateStarDisplay = (rating) => {
  const fullStars = '★'.repeat(rating);
  const emptyStars = '☆'.repeat(5 - rating);
  return fullStars + emptyStars;
};

// Check if review link is valid format
export const isValidReviewLinkFormat = (bookingId, token) => {
  // Check if bookingId looks like a MongoDB ObjectId (24 hex characters)
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  
  // Check if token looks like a hex string (64 characters for 32 bytes)
  const tokenRegex = /^[0-9a-fA-F]{64}$/;
  
  return objectIdRegex.test(bookingId) && tokenRegex.test(token);
};
