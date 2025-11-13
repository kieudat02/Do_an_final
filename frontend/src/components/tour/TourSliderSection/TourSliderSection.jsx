import React, { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import TourCard from '../TourCard/TourCard';

const TourSliderSection = ({
  title,
  tours,
  onViewMore,
  viewMoreText = "Xem thêm",
  emptyMessage = "Hiện tại chưa có tour phù hợp."
}) => {
    const swiperRef = useRef(null);

    const handlePrevSlide = () => {
        if (swiperRef.current && swiperRef.current.swiper) {
        swiperRef.current.swiper.slidePrev();
        }
    };
    const handleNextSlide = () => {
        if (swiperRef.current && swiperRef.current.swiper) {
        swiperRef.current.swiper.slideNext();
        }
    };
    return (
        <>
        <div className="tour-section__container">
            <div className="tour-section__header">
                <div className="tour-section__title">
                    <div className="tour-section__title-content">
                        <span className="mobile-only">{title}</span>
                        <h2 className="desktop-only">{title}</h2>
                    </div>
                </div>
                {onViewMore && (
                    <div className="tour-section__view-more">
                        <button onClick={onViewMore} className="view-more-link">
                            <span className="desktop-only">{viewMoreText}</span>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="view-more-icon">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 1C5.92487 1 1 5.92487 1 12C1 18.0751 5.92487 23 12 23C18.0751 23 23 18.0751 23 12C23 5.92487 18.0751 1 12 1ZM11.7071 6.29289C11.3166 5.90237 10.6834 5.90237 10.2929 6.29289C9.90237 6.68342 9.90237 7.31658 10.2929 7.70711L12.4645 9.87868C13.1511 10.5653 13.5935 11.0107 13.8766 11.3817C14.142 11.7296 14.1716 11.8923 14.1716 12C14.1716 12.1077 14.142 12.2704 13.8766 12.6183C13.5935 12.9893 13.1511 13.4347 12.4645 14.1213L10.2929 16.2929C9.90237 16.6834 9.90237 17.3166 10.2929 17.7071C10.6834 18.0976 11.3166 18.0976 11.7071 17.7071L13.9252 15.489C14.5521 14.8622 15.0922 14.3221 15.4666 13.8315C15.8678 13.3056 16.1716 12.7208 16.1716 12C16.1716 11.2792 15.8678 10.6944 15.4666 10.1685C15.0922 9.67789 14.5521 9.13782 13.9252 8.51102L13.8787 8.46447L11.7071 6.29289Z" fill="currentColor"></path>
                            </svg>
                        </button>
                    </div>
                )}
            </div>
            <div className="tour-section__slider">
                <div className="tour-section__slider-wrapper">
                    {tours && tours.length > 0 ? (
                        <>
                            <Swiper
                                ref={swiperRef}
                                modules={[Navigation]}
                                spaceBetween={48}
                                slidesPerView={4}
                                navigation={false}
                                loop={tours.length > 4}
                                breakpoints={{
                                    640: {
                                        slidesPerView: 2,
                                        spaceBetween: 20,
                                    },
                                    1024: {
                                        slidesPerView: 3,
                                        spaceBetween: 24,
                                    },
                                    1280: {
                                        slidesPerView: 4,
                                        spaceBetween: 120,
                                    },
                                }}
                            >
                                {tours.map((tour) => (
                                    <SwiperSlide key={tour.id}>
                                        <TourCard tour={tour} />
                                    </SwiperSlide>
                                ))}
                            </Swiper>

                            {/* Custom Navigation Buttons - Only show if more than 4 tours */}
                            {tours.length > 4 && (
                                <div className="tour-section__navigation">
                                    <button
                                        className="tour-section__nav-btn tour-section__nav-btn--prev"
                                        onClick={handlePrevSlide}
                                        aria-label="Previous tours"
                                    >
                                        <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                d="M15.7071 5.9829C16.0976 6.37342 16.0976 7.00659 15.7071 7.39711L12.5355 10.5687C11.8489 11.2553 11.4065 11.7007 11.1235 12.0717C10.858 12.4196 10.8284 12.5823 10.8284 12.69C10.8284 12.7977 10.858 12.9604 11.1235 13.3083C11.4065 13.6793 11.8489 14.1247 12.5355 14.8113L15.7071 17.9829C16.0976 18.3734 16.0976 19.0066 15.7071 19.3971C15.3166 19.7876 14.6834 19.7876 14.2929 19.3971L11.0748 16.179C10.4479 15.5522 9.90777 15.0121 9.53341 14.5215C9.13221 13.9956 8.82843 13.4108 8.82843 12.69C8.82843 11.9692 9.13221 11.3844 9.53341 10.8585C9.90777 10.3679 10.4479 9.82782 11.0748 9.20102C11.0902 9.18555 11.1058 9.17004 11.1213 9.15447L14.2929 5.9829C14.6834 5.59237 15.3166 5.59237 15.7071 5.9829Z"
                                                fill="currentColor"
                                            />
                                        </svg>
                                    </button>
                                    <button
                                        className="tour-section__nav-btn tour-section__nav-btn--next"
                                        onClick={handleNextSlide}
                                        aria-label="Next tours"
                                    >
                                        <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                d="M8.29289 5.9829C8.68342 5.59237 9.31658 5.59237 9.70711 5.9829L12.8787 9.15447C12.8942 9.17004 12.9098 9.18555 12.9252 9.20102C13.5521 9.82782 14.0922 10.3679 14.4666 10.8585C14.8678 11.3844 15.1716 11.9692 15.1716 12.69C15.1716 13.4108 14.8678 13.9956 14.4666 14.5215C14.0922 15.0121 13.5521 15.5522 12.9252 16.179L9.70711 19.3971C9.31658 19.7876 8.68342 19.7876 8.29289 19.3971C7.90237 19.0066 7.90237 18.3734 8.29289 17.9829L11.4645 14.8113C12.1511 14.1247 12.5935 13.6793 12.8766 13.3083C13.142 12.9604 13.1716 12.7977 13.1716 12.69C13.1716 12.5823 13.142 12.4196 12.8766 12.0717C12.5935 11.7007 12.1511 11.2553 11.4645 10.5687L8.29289 7.39711C7.90237 7.00659 7.90237 6.37342 8.29289 5.9829Z"
                                                fill="currentColor"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="tour-section__empty">
                            <p className="tour-section__empty-message">{emptyMessage}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
};

export default TourSliderSection;
