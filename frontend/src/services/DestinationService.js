import axiosInstance from "./axiosInstance";
import { API_ENDPOINTS } from "../constants/ApiEndPoints";

// Lấy danh sách điểm đến
export const getDestinations = (params) => {
  return axiosInstance.get(API_ENDPOINTS.DESTINATIONS, { params });
};

// Lấy danh sách quốc gia theo châu lục
export const getCountriesByContinent = () => {
  return axiosInstance.get(API_ENDPOINTS.DESTINATIONS + '/countries-by-continent');
};

// Lấy tất cả destinations với URL structure
export const getDestinationsWithUrls = () => {
  return axiosInstance.get(API_ENDPOINTS.DESTINATIONS + '/with-urls');
};
