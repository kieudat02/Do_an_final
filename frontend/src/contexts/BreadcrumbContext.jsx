import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

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

  // Tạo stable setter function với useCallback để tránh re-render
  const updateBreadcrumb = useCallback((newData) => {
    setBreadcrumbData(prev => {
      // Chỉ update nếu data thực sự thay đổi
      if (JSON.stringify(prev) !== JSON.stringify(newData)) {
        return newData;
      }
      return prev;
    });
  }, []);

  // Memoize context value để tránh re-render không cần thiết
  const contextValue = useMemo(() => ({
    breadcrumbData,
    setBreadcrumbData: updateBreadcrumb
  }), [breadcrumbData, updateBreadcrumb]);

  return (
    <BreadcrumbContext.Provider value={contextValue}>
      {children}
    </BreadcrumbContext.Provider>
  );
};
