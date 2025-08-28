import { useQuery, useQueries } from '@tanstack/react-query';
import { getHomeSections, getToursByHomeSection } from '../services/HomeSectionService';
import { getTours } from '../services/TourService';
import { PLACEHOLDER_IMAGES } from '../utils/placeholderImage';

// Hook để lấy danh sách home sections
export const useHomeSections = () => {
  return useQuery({
    queryKey: ['homeSections'],
    queryFn: getHomeSections,
    staleTime: 5 * 60 * 1000, // 5 phút
    cacheTime: 10 * 60 * 1000, // 10 phút
    select: (data) => data.success ? data.data : [],
  });
};

// Hook để lấy featured tours
export const useFeaturedTours = () => {
  return useQuery({
    queryKey: ['featuredTours'],
    queryFn: () => getTours({
      limit: 5,
      highlight: true,
      page: 1
    }),
    staleTime: 5 * 60 * 1000, // 5 phút
    cacheTime: 10 * 60 * 1000, // 10 phút
    select: (data) => {
      if (data.data.success) {
        return data.data.data.map(tour => ({
          id: tour._id,
          title: tour.title,
          image: tour.image || PLACEHOLDER_IMAGES.TOUR_CARD,
          link: tour.category?.slug ? `/danh-muc-tour/${tour.category.slug}` : '/danh-muc-tour/all'
        }));
      }
      return [];
    },
  });
};

// Hook để lấy tours theo home section
export const useToursByHomeSection = (homeSectionId, enabled = true) => {
  return useQuery({
    queryKey: ['toursByHomeSection', homeSectionId],
    queryFn: () => getToursByHomeSection(homeSectionId, {
      limit: 10,
      page: 1
    }),
    enabled: enabled && !!homeSectionId,
    staleTime: 5 * 60 * 1000, // 5 phút
    cacheTime: 10 * 60 * 1000, // 10 phút
    select: (data) => {
      if (data.success) {
        return data.data.map(tour => ({
          id: tour._id,
          title: tour.title,
          image: tour.image || PLACEHOLDER_IMAGES.TOUR_CARD,
          departure: tour.departure,
          startDate: tour.startDate,
          endDate: tour.endDate,
          calculatedDuration: tour.calculatedDuration,
          tourDetails: tour.tourDetails, 
          originalPrice: tour.originalPrice,
          price: tour.price,
          discountPrice: tour.discountPrice,
          averageRating: tour.averageRating,
          totalReviews: tour.totalReviews,
          bookings: tour.bookings || 0,
          destination: tour.destination || {},
          category: tour.category || {},
          highlight: tour.highlight || false,
          link: `/tour/${tour._id}`,
        }));
      }
      return [];
    },
  });
};

// Hook để lấy tất cả dữ liệu cho home sections
export const useHomeSectionData = () => {
  const { data: homeSections = [], isLoading: homeSectionsLoading, error: homeSectionsError } = useHomeSections();
  const { data: featuredTours = [], isLoading: featuredLoading, error: featuredError } = useFeaturedTours();

  // Sử dụng useQueries để tạo queries động một cách an toàn
  const sectionQueries = useQueries({
    queries: homeSections.map(homeSection => ({
      queryKey: ['toursByHomeSection', homeSection._id],
      queryFn: () => getToursByHomeSection(homeSection._id, {
        limit: 10,
        page: 1
      }),
      enabled: !!homeSection._id,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      select: (data) => {
        if (data.success) {
          return data.data.map(tour => ({
            id: tour._id,
            title: tour.title,
            image: tour.image || PLACEHOLDER_IMAGES.TOUR_CARD,
            departure: tour.departure,
            startDate: tour.startDate,
            endDate: tour.endDate,
            calculatedDuration: tour.calculatedDuration,
            tourDetails: tour.tourDetails,
            originalPrice: tour.originalPrice,
            price: tour.price,
            discountPrice: tour.discountPrice,
            averageRating: tour.averageRating,
            totalReviews: tour.totalReviews,
            bookings: tour.bookings || 0,
            destination: tour.destination || {},
            category: tour.category || {},
            highlight: tour.highlight || false,
            link: `/tour/${tour._id}`,
          }));
        }
        return [];
      },
    }))
  });

  // Tính toán loading state tổng thể
  const isLoading = homeSectionsLoading || featuredLoading ||
    sectionQueries.some(query => query.isLoading);

  // Tính toán error state
  const hasError = homeSectionsError || featuredError ||
    sectionQueries.some(query => query.error);

  // Tạo section data với thông tin đầy đủ
  const sectionData = {};
  sectionQueries.forEach((query, index) => {
    const homeSection = homeSections[index];
    sectionData[index] = {
      homeSection: {
        ...homeSection,
        _id: homeSection._id,
        title: homeSection.title,
        moreButtonSlug: homeSection.moreButtonSlug,
        moreButtonTitle: homeSection.moreButtonTitle,
        moreButtonSubtitle: homeSection.moreButtonSubtitle,
        categories: homeSection.categories || [],
        filterQuery: homeSection.filterQuery || {}
      },
      tours: query.data || [],
      error: query.error ? query.error.message : null,
      isLoading: query.isLoading
    };
  });

  return {
    homeSections,
    featuredTours,
    sectionData,
    isLoading,
    hasError,
    homeSectionsError,
    featuredError
  };
};
