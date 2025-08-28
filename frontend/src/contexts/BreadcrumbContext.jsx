import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Context để quản lý thông tin breadcrumb
 * Phiên bản đơn giản để tránh vòng lặp re-render
 */
const BreadcrumbContext = createContext();

export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  return context;
};

export const BreadcrumbProvider = ({ children }) => {
  const [breadcrumbData, setBreadcrumbData] = useState({
    categoryName: null,
    categorySlug: null,
    tourTitle: null,
    customItems: null
  });

  // Tạo stable setter function
  const updateBreadcrumb = useCallback((newData) => {
    setBreadcrumbData(newData);
  }, []);

  // Tạo context value một lần duy nhất
  const contextValue = {
    breadcrumbData,
    setBreadcrumbData: updateBreadcrumb
  };

  return (
    <BreadcrumbContext.Provider value={contextValue}>
      {children}
    </BreadcrumbContext.Provider>
  );
};
