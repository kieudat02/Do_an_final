import { useQuery } from '@tanstack/react-query';
import { getPublicTourById, getTourDetailBySlug, incrementTourViews } from '../services/tourService';

// Helper functions for safe data handling
const safeArr = (v) => (Array.isArray(v) ? v : []);
const safeStr = (v) => (typeof v === 'string' ? v : '');

// Normalize tour data to ensure safe structure
const normalizeTour = (t) => {
  if (!t) return null;
  
  return {
    ...t,
    images: safeArr(t.images),
    overview: {
      introHtml: safeStr(t?.overview?.introHtml),
      description: safeStr(t?.overview?.description),
      pricing: {
        yearTitle: safeStr(t?.overview?.pricing?.yearTitle),
        rows: safeArr(t?.overview?.pricing?.rows),
        noteHtml: safeStr(t?.overview?.pricing?.noteHtml),
      },
      promotions: safeArr(t?.overview?.promotions),
    },
    schedule: safeArr(t?.schedule),
    includes: {
      included: safeArr(t?.includes?.included),
      excluded: safeArr(t?.includes?.excluded),
      notes: {
        important: safeArr(t?.includes?.notes?.important),
      },
    },
    highlights: safeArr(t?.highlights),
  };
};

// React Query hook for fetching tour data by ID
export const useTour = (id) => {
  const query = useQuery({
    queryKey: ['tour', id],
    queryFn: () => getPublicTourById(id),
    enabled: Boolean(id),
  });
  
  return {
    ...query,
    data: normalizeTour(query.data),
  };
};

// React Query hook for fetching tour data by slug (SEO-friendly)
export const useTourBySlug = (slug) => {
  const query = useQuery({
    queryKey: ['tour-slug', slug],
    queryFn: async () => {
      const response = await getTourDetailBySlug(slug);
      const tourData = response.data?.data; // Extract the tour data from API response
      
      // Tăng views cho tour khi fetch thành công
      if (tourData && tourData._id) {
        try {
          await incrementTourViews(tourData._id);
        } catch (error) {
          console.error('Error incrementing tour views:', error);
          // Không throw error để không ảnh hưởng đến việc hiển thị tour
        }
      }
      
      return tourData;
    },
    enabled: Boolean(slug),
  });
  
  return {
    ...query,
    data: normalizeTour(query.data),
  };
};
