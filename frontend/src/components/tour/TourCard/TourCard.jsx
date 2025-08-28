import React from 'react';
import { Link } from 'react-router-dom';
import { calculateTourDuration } from '../../../utils/durationUtils';
import './TourCard.scss';

const TourCard = ({ tour }) => {
  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price);
  const toNumber = (v) => (v === null || v === undefined ? NaN : Number(v));
  const isFiniteNum = (v) => Number.isFinite(toNumber(v));

  const originalPrice = toNumber(tour?.originalPrice) || 0;
  const discountPrice = toNumber(tour?.discountPrice) || 0;
  const regularPrice = toNumber(tour?.price) || 0;

  // Xác định giá hiển thị: ưu tiên discountPrice, sau đó là price
  const displayPrice = discountPrice > 0 ? discountPrice : regularPrice;

  // Hiển thị giá gốc khi có giảm giá và giá gốc > giá hiển thị
  const showOriginal = originalPrice > 0 && displayPrice > 0 && originalPrice > displayPrice;

  // Sử dụng utility function mới để tính duration từ tourDetails
  const duration = calculateTourDuration(tour);

  return (
    <div className="tour-card">
      <Link to={tour.link} className="tour-card__image-link">
        <img
          src={tour.image}
          alt={tour.title}
          className="tour-card__image"
          loading="lazy"
        />
      </Link>
      <div className="tour-card__content">
          <div className="tour-card__main">
            <div className="tour-card__title">
              <Link to={tour.link}>
                <h3>{tour.title}</h3>
              </Link>
            </div>
            
            <div className="tour-card__rating">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" className="star-icon" xmlns="http://www.w3.org/2000/svg">
                <path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"></path>
              </svg>
              <span>
                {tour.totalReviews > 0
                  ? `${tour.averageRating?.toFixed(1) || '0.0'} (${tour.totalReviews} đánh giá)`
                  : 'Chưa có đánh giá'
                }
              </span>
              {((tour.totalReviews > 0) || (tour.bookings > 0)) && <span>|</span>}
              {(tour.bookings > 0) && <span>{tour.bookings} đã đặt chỗ</span>}
            </div>

            <hr className="tour-card__divider" />

            <div className="tour-card__details">
              <div className="tour-card__info">
                <div className="tour-card__duration">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.99984 14.6667C10.9454 14.6667 13.3332 12.2789 13.3332 9.33333C13.3332 6.38781 10.9454 4 7.99984 4C5.05432 4 2.6665 6.38781 2.6665 9.33333C2.6665 12.2789 5.05432 14.6667 7.99984 14.6667Z" stroke="#1F50EA" strokeWidth="1.5"></path>
                    <path d="M9.33317 1.33334H6.6665" stroke="#1F50EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M8 1.33334V4.00001" stroke="#1F50EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M11.6665 5.33334L12.6665 4.33334" stroke="#1F50EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M8 9.33334V7.33334" stroke="#1F50EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M8 9.33334H6" stroke="#1F50EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                  <span className="tour-card__duration-text">
                    <span className="desktop-hidden">{duration !== 'Không rõ thời lượng'
                      ? duration.replace(' ngày', 'N').replace(' đêm', 'Đ')
                      : 'Không rõ thời lượng'}
                    </span>
                    <span className="mobile-hidden">{duration}</span>
                  </span>
                </div>
                <div className="tour-card__departure">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" stroke="currentColor" className="location-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.333 6.788c0 2.432-1.752 4.664-3.248 6.127-.847.828-1.27 1.242-2.085 1.242-.816 0-1.239-.414-2.085-1.242-1.496-1.463-3.248-3.695-3.248-6.127 0-1.447.561-2.834 1.562-3.857a5.274 5.274 0 0 1 3.77-1.598c1.415 0 2.772.575 3.772 1.598a5.518 5.518 0 0 1 1.562 3.857Z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 8.606c.982 0 1.778-.814 1.778-1.818S8.982 4.97 8 4.97s-1.778.814-1.778 1.818S7.018 8.606 8 8.606Z"></path>
                  </svg>
                  <span className="tour-card__departure-text">
                    <span className="mobile-hidden">Điểm đi: </span>{tour.departure?.name || 'Không rõ điểm đi'}
                  </span>
                </div>
              </div>
              <div className="tour-card__pricing">
                {showOriginal && (
                  <div className="tour-card__original-price">
                    {formatPrice(originalPrice)}đ
                  </div>
                )}
                <div className="tour-card__price">
                  {formatPrice(displayPrice)}đ
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default TourCard;