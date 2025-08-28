import axiosInstance from "./axiosInstance";
import { API_ENDPOINTS } from "../constants/ApiEndPoints";

// Tạo đơn hàng mới
export const createOrder = async (orderData) => {
  try {
    const response = await axiosInstance.post(API_ENDPOINTS.ORDER_CREATE, orderData);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi tạo đơn hàng:', error);
    throw error;
  }
};

// Lấy danh sách đơn hàng của user
export const getUserOrders = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.USER_ORDERS);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách đơn hàng:', error);
    throw error;
  }
};

// Lấy chi tiết đơn hàng theo ID
export const getOrderById = async (orderId) => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.USER_ORDERS}/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết đơn hàng:', error);
    throw error;
  }
};
