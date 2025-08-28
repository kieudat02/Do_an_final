import axiosInstance from "./axiosInstance";
import { API_ENDPOINTS, GET_PUBLIC_TOUR_BY_ID } from "../constants/ApiEndPoints";

// Lấy danh sách tour (có thể truyền params để filter, phân trang)
export const getTours = (params) => {
  return axiosInstance.get(API_ENDPOINTS.TOURS, { params });
};

// Lấy chi tiết tour theo id
export const getTourDetail = (id) => {
  return axiosInstance.get(API_ENDPOINTS.TOUR_DETAIL(id));
};

// Lấy danh sách tour theo slug (danh mục)
export const getToursBySlug = (slug, params) => {
  return axiosInstance.get(API_ENDPOINTS.TOURS_BY_SLUG(slug), { params });
};

// Lấy danh sách đánh giá của tour
export const getTourReviews = (tourId) => {
  return axiosInstance.get(API_ENDPOINTS.TOUR_REVIEWS(tourId));
};

// Lấy tours theo destination ID
export const getToursByDestination = (destinationId, params = {}) => {
  return axiosInstance.get(API_ENDPOINTS.TOURS, {
    params: {
      destination: destinationId,
      limit: 1, 
      ...params
    }
  });
};

// Lấy chi tiết tour public (cho React Query)
export const getPublicTourById = async (id) => {
  const res = await axiosInstance.get(GET_PUBLIC_TOUR_BY_ID(id));
  return res?.data?.data ?? null;
};