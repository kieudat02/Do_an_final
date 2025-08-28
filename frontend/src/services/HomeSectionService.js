import axiosInstance from "./axiosInstance";
import { API_ENDPOINTS } from "../constants/ApiEndPoints";

export const getHomeSections = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.HOME_SECTIONS);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách home sections:', error);
    throw error;
  }
};

export const getHomeSectionBySlug = async (slug) => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.HOME_SECTIONS}/slug/${slug}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy home section theo slug:', error);
    throw error;
  }
};

// Lấy tours theo home section ID sử dụng API chuyên dụng
export const getToursByHomeSection = async (homeSectionId, params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    // Thêm các params vào query string
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });

    const queryString = queryParams.toString();
    const url = `${API_ENDPOINTS.TOURS_BY_HOME_SECTION(homeSectionId)}${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error(`Lỗi khi lấy tours cho home section ${homeSectionId}:`, error);
    throw error;
  }
};
