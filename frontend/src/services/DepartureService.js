import axiosInstance from "./axiosInstance";
import { API_ENDPOINTS } from "../constants/ApiEndPoints";

// Lấy danh sách điểm khởi hành
export const getDepartures = () => {
  return axiosInstance.get(API_ENDPOINTS.DEPARTURES);
};