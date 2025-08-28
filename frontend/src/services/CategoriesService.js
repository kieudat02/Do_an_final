import axiosInstance from "./axiosInstance";
import { API_ENDPOINTS } from "../constants/ApiEndPoints";

// Lấy danh sách danh mục
export const getCategories = (params) => {
  return axiosInstance.get(API_ENDPOINTS.CATEGORIES, { params });
};