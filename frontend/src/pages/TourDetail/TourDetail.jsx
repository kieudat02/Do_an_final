import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTour } from '../../hooks/useTour';
import { getTours } from '../../services/TourService';
import { useBreadcrumb } from '../../contexts/BreadcrumbContext';
import TourDetailComponent from '../../components/tour/TourDetail/TourDetail';

const TourDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const { data: tourData, isLoading, isError, error } = useTour(id);
  const { setBreadcrumbData } = useBreadcrumb();
  const [suggestedTours, setSuggestedTours] = useState([]);

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
            .filter(tour => tour._id !== id);
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

    // Fetch suggested tours khi component mount hoặc id thay đổi
    if (id) {
      fetchSuggestedTours();
    }
  }, [id]);

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