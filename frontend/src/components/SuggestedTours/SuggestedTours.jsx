
import React, { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import TourCard from '../tour/TourCard/TourCard';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import './SuggestedTours.scss';

const SuggestedTours = ({ tours = [], title = "Khách hàng còn xem thêm" }) => {
  const swiperRef = useRef(null);

  if (tours.length === 0) {
    return null;
  }

  const formatTourForCard = (tour) => {
    return {
      ...tour,
      image: tour.images && tour.images.length > 0 ? tour.images[0] : tour.image,
      link: tour.link || `/tour/${tour._id}`,
      departure: tour.departure || { name: 'Không rõ điểm đi' },
      totalReviews: tour.totalReviews || 0,
      averageRating: tour.averageRating || 0,
      bookings: tour.bookings || 0
    };
  };

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
    <div className="suggested-tours">
      <div className="suggested-tours__header">
        <h3 className="suggested-tours__title">{title}</h3>
        {tours.length > 4 && (
          <div className="suggested-tours__navigation">
            <button
              className="suggested-tours__nav-btn suggested-tours__nav-btn--prev"
              onClick={handlePrevSlide}
              aria-label="Previous tours"
            >
              <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15.7071 6.79289C16.0976 7.18342 16.0976 7.81658 15.7071 8.20711L11.4142 12.5L15.7071 16.7929C16.0976 17.1834 16.0976 17.8166 15.7071 18.2071C15.3166 18.5976 14.6834 18.5976 14.2929 18.2071L9.29289 13.2071C8.90237 12.8166 8.90237 12.1834 9.29289 11.7929L14.2929 6.79289C14.6834 6.40237 15.3166 6.40237 15.7071 6.79289Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button
              className="suggested-tours__nav-btn suggested-tours__nav-btn--next"
              onClick={handleNextSlide}
              aria-label="Next tours"
            >
              <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M8.29289 6.79289C8.68342 6.40237 9.31658 6.40237 9.70711 6.79289L14.7071 11.7929C15.0976 12.1834 15.0976 12.8166 14.7071 13.2071L9.70711 18.2071C9.31658 18.5976 8.68342 18.5976 8.29289 18.2071C7.90237 17.8166 7.90237 17.1834 8.29289 16.7929L12.5858 12.5L8.29289 8.20711C7.90237 7.81658 7.90237 7.18342 8.29289 6.79289Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="suggested-tours__slider">
        <Swiper
          ref={swiperRef}
          modules={[Navigation]}
          spaceBetween={24}
          slidesPerView={4}
          navigation={false}
          loop={tours.length > 4}
          breakpoints={{
            640: {
              slidesPerView: 1,
              spaceBetween: 20,
            },
            768: {
              slidesPerView: 2,
              spaceBetween: 20,
            },
            1024: {
              slidesPerView: 3,
              spaceBetween: 24,
            },
            1280: {
              slidesPerView: 4,
              spaceBetween: 24,
            },
          }}
        >
          {tours.map((tour) => (
            <SwiperSlide key={tour._id}>
              <TourCard tour={formatTourForCard(tour)} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

export default SuggestedTours;
