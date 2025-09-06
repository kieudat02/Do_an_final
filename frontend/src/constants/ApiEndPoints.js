// Định nghĩa các endpoint API dùng chung cho frontend

export const API_ENDPOINTS = {
  TOURS: "/api/public/tours",
  TOUR_DETAIL: (id) => `/api/public/tours/${id}`,
  // Lấy giá tour theo ngày cụ thể
  TOUR_PRICING_BY_DATE: (id, date) => `/api/public/tours/${id}/pricing/${date}`,
  // Lấy danh sách tour theo slug (danh mục)
  TOURS_BY_SLUG: (slug) => `/api/public/tours/slug/${slug}`,
  // Lấy danh sách tour theo category
  TOURS_BY_CATEGORY: (categoryId) => `/api/public/tours/category/${categoryId}`,
  // Lấy danh sách tour theo home section
  TOURS_BY_HOME_SECTION: (homeSectionId) => `/api/public/tours/home-section/${homeSectionId}`,
  // Lấy danh sách đánh giá của tour
  CATEGORIES: "/api/public/categories",
  // Lấy chi tiết danh mục theo slug
  CATEGORIES_BY_SLUG: (slug) => `/api/public/categories/slug/${slug}`,
  // Lấy danh sách đánh giá của tour
  TOUR_REVIEWS: (tourId) => `/api/public/tours/${tourId}/reviews`,
  // Lấy chi tiết đánh giá của tour
  TOUR_REVIEW: (tourId, reviewId) => `/api/public/tours/${tourId}/reviews/${reviewId}`,
  // Lấy danh sách điểm xuất phát
  DEPARTURES: "/api/public/departures",
  // Lấy danh sách điểm đến
  DESTINATIONS: "/api/public/destinations",
  // Lấy danh sách phương tiện di chuyển
  TRANSPORTATIONS: "/api/public/transportations",
  // Lấy danh sách home sections
  HOME_SECTIONS: "/api/public/home-sections",
  // // Đăng nhập
  // LOGIN: "/api/auth/login",
  // // Đăng xuất
  // LOGOUT: "/api/auth/logout",
  // // Đăng ký tài khoản
  // REGISTER: "/api/auth/register",
  // // Lấy thông tin người dùng
  // USER_PROFILE: "/api/user/profile",
  // // Cập nhật thông tin người dùng
  // UPDATE_PROFILE: "/api/user/profile/update",
  // Tạo đơn hàng
  ORDER_CREATE: "/api/public/order/create",
  // Tra cứu đơn hàng
  ORDER_LOOKUP: "/api/public/order/lookup",
  // Gửi OTP cho tra cứu đơn hàng
  ORDER_SEND_OTP: "/api/public/order/send-otp",
  // Tra cứu đơn hàng với OTP
  ORDER_LOOKUP_WITH_OTP: "/api/public/order/lookup-with-otp",
  // Lấy danh sách đơn hàng của người dùng
  USER_ORDERS: "/api/user/orders",
  // MoMo payment endpoints
  MOMO_CREATE_PAYMENT: "/api/momo/create-payment",
  MOMO_CHECK_STATUS: "/api/momo/status",
  // VNPay payment endpoints
  VNPAY_CREATE_PAYMENT: "/api/vnpay/create-payment",
  VNPAY_RETURN: "/api/vnpay/return",
  VNPAY_CHECK_STATUS: "/api/vnpay/status",
  // Review endpoints (public, token-based)
  REVIEW_CHECK_LINK: "/api/review/check-link",
  REVIEW_SUBMIT: "/api/review/submit",
  REVIEW_ORDER_INFO: "/api/review/order-info",
  // Chat rating endpoints (legacy - per message)
  CHAT_RATING_CREATE: "/api/chat/rating",
  CHAT_RATING_STATS: "/api/chat/rating/stats",
  CHAT_RATING_TREND: "/api/chat/rating/trend",
  // Session rating endpoints (new - per session)
  SESSION_RATING_CREATE: "/api/chat/session-rating",
  SESSION_RATING_CHECK: (sessionId) => `/api/chat/session-rating/${sessionId}`,
  SESSION_RATING_STATS: "/api/chat/session-rating/stats",
  SESSION_RATING_TREND: "/api/chat/session-rating/trend",
  SESSION_RATING_LIST: "/api/chat/session-rating/list",
  // Response time endpoints
  RESPONSE_TIME_STATS: "/api/chat/response-time/stats",
};

//Chức năng trợ giúp cho chi tiết tour du lịch công cộng
export const GET_PUBLIC_TOUR_BY_ID = (id) => `/api/public/tours/${id}`;