import React from 'react';
import { useBreadcrumb } from '../../../contexts/BreadcrumbContext';
import Breadcrumb from './Breadcrumb';

/**
 * Wrapper component để sử dụng breadcrumb context
 * Tách riêng để tránh lỗi khi sử dụng hook trong App component
 */
const BreadcrumbWrapper = () => {
  const { breadcrumbData } = useBreadcrumb();
  
  return (
    <Breadcrumb 
      categoryName={breadcrumbData.categoryName}
      categorySlug={breadcrumbData.categorySlug}
      tourTitle={breadcrumbData.tourTitle}
      customItems={breadcrumbData.customItems}
    />
  );
};

export default BreadcrumbWrapper;
