import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTourBySlug } from '../../hooks/useTour';
import { getTours, getTourSlugById } from '../../services/tourService';
import { useBreadcrumb } from '../../contexts/BreadcrumbContext';
import TourDetailComponent from '../../components/tour/TourDetail/TourDetail';

const TourDetail = () => {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: tourData, isLoading, isError, error } = useTourBySlug(slug);
  const { setBreadcrumbData } = useBreadcrumb();
  const [suggestedTours, setSuggestedTours] = useState([]);

  // Kiểm tra nếu slug là ID thì redirect sang slug thật
  useEffect(() => {
    const isObjectId = (str) => {
      return /^[0-9a-fA-F]{24}$/.test(str);
    };

    if (slug && isObjectId(slug)) {
      // Nếu slug là ObjectId, lấy slug thật và redirect
      const redirectToSlug = async () => {
        try {
          const response = await getTourSlugById(slug);
          if (response.data?.success && response.data?.data?.slug) {
            navigate(`/tour/${response.data.data.slug}`, { replace: true });
          }
        } catch (error) {
          console.error('Error getting slug from ID:', error);
        }
      };
      redirectToSlug();
    }
  }, [slug, navigate]);

  // Fetch suggested tours
  useEffect(() => {
    const fetchSuggestedTours = async () => {
      try {
        const response = await getTours({
          limit: 8, // Lấy nhiều hơn để có đủ tour cho slider
          page: 1
        });

        if (response.data && response.data.success && response.data.data) {
          // Lọc bỏ tour hiện tại
          const filteredTours = response.data.data
            .filter(tour => tour.slug !== slug);
          setSuggestedTours(filteredTours);
        } else {
          // Fallback: tạo dữ liệu mẫu nếu không có dữ liệu từ API
          setSuggestedTours([]);
        }
      } catch (error) {
        console.error('Error fetching suggested tours:', error);
        // Fallback: tạo dữ liệu mẫu khi có lỗi
        setSuggestedTours([]);
      }
    };

    // Fetch suggested tours khi component mount hoặc slug thay đổi
    if (slug) {
      fetchSuggestedTours();
    }
  }, [slug]);

  // Cập nhật breadcrumb khi tourData thay đổi
  useEffect(() => {
    if (tourData) {
      // Lấy thông tin category từ state (nếu navigate từ TourList) hoặc từ tourData
      const categorySlug = location.state?.categorySlug || tourData.category?.slug;
      const categoryName = tourData.category?.name;

      setBreadcrumbData({
        categoryName,
        categorySlug,
        tourTitle: tourData.title,
        customItems: null
      });
    }
  }, [tourData, location.state, setBreadcrumbData]);

  return (
    <>
      <TourDetailComponent
        tourData={tourData}
        isLoading={isLoading}
        isError={isError}
        error={error}
        suggestedTours={suggestedTours}
      />
    </>
  );
};

export default TourDetail;