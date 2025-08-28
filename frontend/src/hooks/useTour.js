import { useQuery } from '@tanstack/react-query';
import { getPublicTourById } from '../services/TourService';

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

// React Query hook for fetching tour data
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
