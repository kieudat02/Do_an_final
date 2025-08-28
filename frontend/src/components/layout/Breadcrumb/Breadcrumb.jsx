import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import './Breadcrumb.scss';

/**
 * Component Breadcrumb hiển thị đường dẫn navigation theo 3 phân cấp:
 * 1. Trang chủ (/)
 * 2. Danh mục tour (/danh-muc-tour/:slug) 
 * 3. Chi tiết tour (/tour/:id)
 */
const Breadcrumb = ({ 
  categoryName = null,     // Tên danh mục tour (cấp 2)
  categorySlug = null,     // Slug danh mục để tạo link
  tourTitle = null,        // Tên tour (cấp 3)
  customItems = null       // Cho phép override breadcrumb items tùy chỉnh
}) => {
  const location = useLocation();
  const params = useParams();

  /**
   * Tạo breadcrumb items dựa trên route hiện tại
   */
  const generateBreadcrumbItems = () => {
    // Nếu có customItems, sử dụng chúng
    if (customItems && Array.isArray(customItems)) {
      return customItems;
    }

    const items = [
      {
        label: 'Trang chủ',
        path: '/',
        icon: <Home size={16} />
      }
    ];

    const pathname = location.pathname;

    // Cấp 2: Danh mục tour
    if (pathname.startsWith('/danh-muc-tour/') || pathname.startsWith('/tours')) {
      if (pathname.startsWith('/danh-muc-tour/') && params.slug) {
        // Trang danh mục cụ thể
        items.push({
          label: categoryName || 'Danh mục tour',
          path: `/danh-muc-tour/${params.slug}`,
          icon: null
        });
      } else if (pathname === '/tours') {
        // Trang tất cả tour
        items.push({
          label: 'Tất cả tour',
          path: '/tours',
          icon: null
        });
      }
    }

    // Cấp 3: Chi tiết tour
    if (pathname.startsWith('/tour/') && params.id) {
      // Nếu chưa có danh mục trong breadcrumb, thêm link tổng quát
      if (items.length === 1) {
        items.push({
          label: categoryName || 'Danh sách tour',
          path: categorySlug ? `/danh-muc-tour/${categorySlug}` : '/tours',
          icon: null
        });
      }
      
      items.push({
        label: tourTitle || 'Chi tiết tour',
        path: null, // Trang hiện tại, không cần link
        icon: null
      });
    }

    // Các trang khác
    if (pathname === '/tra-cuu-don-hang') {
      items.push({
        label: 'Tra cứu đơn hàng',
        path: null,
        icon: null
      });
    }

    if (pathname === '/review') {
      items.push({
        label: 'Đánh giá tour',
        path: null,
        icon: null
      });
    }

    if (pathname === '/success' || pathname === '/thank-you') {
      items.push({
        label: 'Đặt tour thành công',
        path: null,
        icon: null
      });
    }

    return items;
  };

  const breadcrumbItems = generateBreadcrumbItems();

  // Không hiển thị breadcrumb trên trang chủ
  if (location.pathname === '/') {
    return null;
  }

  // Không hiển thị nếu chỉ có 1 item (trang chủ)
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb navigation">
      <div className="breadcrumb__container">
        <ol className="breadcrumb__list">
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            
            return (
              <li key={index} className="breadcrumb__item">
                {item.path && !isLast ? (
                  <span
                    className="breadcrumb__link"
                    aria-label={`Đi tới ${item.label}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.location.replace(item.path);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {item.icon && <span className="breadcrumb__icon">{item.icon}</span>}
                    <span className="breadcrumb__text">{item.label}</span>
                  </span>
                ) : (
                  <span className="breadcrumb__current" aria-current="page">
                    {item.icon && <span className="breadcrumb__icon">{item.icon}</span>}
                    <span className="breadcrumb__text">{item.label}</span>
                  </span>
                )}
                
                {!isLast && (
                  <ChevronRight 
                    size={14} 
                    className="breadcrumb__separator"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};

export default Breadcrumb;
