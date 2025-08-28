import React, { useEffect } from 'react';
import TourList from '../../components/tour/TourList/TourList';
import { useBreadcrumb } from '../../contexts/BreadcrumbContext';

const Tour = () => {
  const { setBreadcrumbData } = useBreadcrumb();

  // Set breadcrumb cho trang /tours
  useEffect(() => {
    setBreadcrumbData({
      categoryName: 'Tất cả tour',
      categorySlug: null,
      tourTitle: null,
      customItems: null
    });
  }, []);

  return (
      <>
        <TourList />
      </>
  );
};

export default Tour;