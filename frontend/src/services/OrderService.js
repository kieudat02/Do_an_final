import axiosInstance from "./axiosInstance";
import { API_ENDPOINTS } from "../constants/ApiEndPoints";

// Tạo đơn hàng mới
export const createOrder = async (orderData, recaptchaToken) => {
  try {
    // Thêm recaptcha token vào data nếu có
    const requestData = {
      ...orderData,
      ...(recaptchaToken && { recaptchaToken })
    };
    
    const response = await axiosInstance.post(API_ENDPOINTS.ORDER_CREATE, requestData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Lấy danh sách đơn hàng của user
export const getUserOrders = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.USER_ORDERS);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Lấy chi tiết đơn hàng theo ID
export const getOrderById = async (orderId) => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.USER_ORDERS}/${orderId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Tạo link thanh toán MoMo
export const createMoMoPayment = async (paymentData) => {
  try {
    const response = await axiosInstance.post(API_ENDPOINTS.MOMO_CREATE_PAYMENT, paymentData);
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Kiểm tra trạng thái thanh toán MoMo
export const checkMoMoPaymentStatus = async (orderId) => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.MOMO_CHECK_STATUS}/${orderId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Tạo link thanh toán VNPay
export const createVNPayPayment = async (paymentData) => {
  try {
    const response = await axiosInstance.post(API_ENDPOINTS.VNPAY_CREATE_PAYMENT, paymentData);
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Kiểm tra trạng thái thanh toán VNPay
export const checkVNPayPaymentStatus = async (orderId) => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.VNPAY_CHECK_STATUS}/${orderId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Xử lý return từ VNPay (có thể dùng cho component xử lý return)
export const handleVNPayReturn = async (queryParams) => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.VNPAY_RETURN, { params: queryParams });
    return response.data;
  } catch (error) {
    throw error;
  }
};
