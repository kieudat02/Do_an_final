import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useHomeSectionData } from '../../../hooks/useHomeSections';
import TourSliderSection from '../TourSliderSection/TourSliderSection';
import { createCategoryUrl } from '../../../utils/slugUtils';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import './TourSection.scss';

const TourSection = () => {
  const navigate = useNavigate();

  // Sử dụng React Query hooks để lấy dữ liệu
  const {
    homeSections,
    featuredTours,
    sectionData,
    isLoading,
    homeSectionsError,
    featuredError
  } = useHomeSectionData();

  // Đã chuyển logic tạo slug sang utils/slugUtils.js

  // Handle tour click
  const handleTourClick = (tour) => {
    navigate(tour.link);
  };

  // Handle xem thêm section - sử dụng utility function
  const handleViewMore = (homeSection) => {
    const categoryUrl = createCategoryUrl(homeSection);
    navigate(categoryUrl);
  };

  // Lấy tên ngắn gọn của tour
  const getShortTourName = (fullName) => {
    if (!fullName) return "";
    return fullName.split(' ').slice(0, 3).join(' ');
  };



  return (
    <section className="tour-section">
      {/* Featured Tours Section */}
      <div className="featured-tours">
        <div className="featured-tours__container">
          <h2 className="featured-tours__title">Tour đang xu hướng</h2>
          <div className="featured-tours__wrapper">
            {isLoading ? (
              <div className="featured-tours__loading">
                <p>Đang tải tour đang xu hướng...</p>
              </div>
            ) : featuredError ? (
              <div className="featured-tours__error">
                <p>Có lỗi khi tải tour đang xu hướng. Vui lòng thử lại sau.</p>
              </div>
            ) : featuredTours.length > 0 ? (
              <div className="featured-tours__grid">
                {featuredTours.map((tour) => (
                  <div key={tour.id} className="featured-tours__item">
                    <div
                      className="featured-tours__link"
                      onClick={() => handleTourClick(tour)}
                      style={{ cursor: 'pointer' }}
                    >
                      <img
                        src={tour.image}
                        alt={tour.title}
                        className="featured-tours__image"
                        loading="lazy"
                      />
                      <div className="featured-tours__overlay">
                        <span className="featured-tours__text">{getShortTourName(tour.title)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="featured-tours__empty">
                <p>Hiện tại chưa có tour đang xu hướng.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Sections từ HomeSection API */}
      {homeSectionsError ? (
        <div className="home-sections__error">
          <p>Có lỗi khi tải danh sách sections. Vui lòng thử lại sau.</p>
        </div>
      ) : (
        homeSections.map((homeSection, idx) => {
          const sectionInfo = sectionData[idx] || { tours: [], homeSection: null, error: null, isLoading: false };
          const tours = sectionInfo.tours;
          const error = sectionInfo.error;
          const sectionLoading = sectionInfo.isLoading;

          // Tạo loading/error message phù hợp
          let emptyMessage = "Hiện tại chưa có tour phù hợp.";
          if (sectionLoading) {
            emptyMessage = "Đang tải dữ liệu...";
          } else if (error) {
            emptyMessage = `Có lỗi khi tải dữ liệu: ${error}`;
          }

          return (
            <div key={homeSection._id}>
              <TourSliderSection
                title={homeSection.title}
                tours={sectionLoading ? [] : tours}
                onViewMore={() => handleViewMore(homeSection)}
                viewMoreText="Xem thêm"
                emptyMessage={emptyMessage}
                isLoading={sectionLoading}
              />
            </div>
          );
        })
      )}
    </section>
  );
};

export default TourSection;