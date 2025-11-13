import React, { useState, useEffect, useCallback } from 'react';
import './Banner.scss';

const BannerSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const banners = [
    {
      id: 1,
      title: "Đặt tour Doanh nghiệp - Nhận ngay trợ lý AI miễn phí",
      link: "/",
      image: "https://objectstorage.omzcloud.vn/pys-object-storage/dev/banner/1754579805841.jpg"
    },
    {
      id: 2,
      title: "Tour Trong Nước dịp Lễ 2/9",
      link: "/",
      image: "https://objectstorage.omzcloud.vn/pys-object-storage/dev/banner/1750516572511.png"
    },
    {
      id: 3,
      title: "Tour Nước Ngoài dịp Lễ 2/9",
      link: "/",
      image: "https://objectstorage.omzcloud.vn/pys-object-storage/dev/banner/1750516529416.png"
    },
    {
      id: 4,
      title: "Chùm Tour Đoàn Biển Hè 2025",
      link: "/",
      image: "https://objectstorage.omzcloud.vn/pys-object-storage/dev/banner/1754579765901.jpg"
    }
  ];

  const extendedBanners = [
    banners[banners.length - 1], 
    ...banners,                   
    banners[0]                    
  ];

  const handleTransitionEnd = useCallback(() => {
    // Only reset transitioning state for normal slides
    if (currentSlide > 0 && currentSlide <= banners.length) {
      setIsTransitioning(false);
      return;
    }

    // Handle clone positions - instant reset without visual glitch
    if (currentSlide === 0) {
      setIsResetting(true);
      setIsTransitioning(false);
      requestAnimationFrame(() => {
        setCurrentSlide(banners.length);
        requestAnimationFrame(() => {
          setIsResetting(false);
        });
      });
    } else if (currentSlide === banners.length + 1) {
      setIsResetting(true);
      setIsTransitioning(false);
      requestAnimationFrame(() => {
        setCurrentSlide(1);
        requestAnimationFrame(() => {
          setIsResetting(false);
        });
      });
    }
  }, [currentSlide, banners.length]);

  const goToSlide = useCallback((index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    setCurrentSlide(index + 1);
  }, [isTransitioning]);

  const prevSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(prev => prev - 1); 
  }, [isTransitioning]);

  const nextSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(prev => prev + 1); 
  }, [isTransitioning]);

  // Auto slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(timer);
  }, [nextSlide]);

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevSlide, nextSlide]);

  return (
    <div className="banner-slider">
      <div className="banner-slider__container">
        <div className="banner-slider__wrapper">
          <div className="banner-slider__track">
            <div
              className={`banner-slider__slides ${isTransitioning && !isResetting ? 'transitioning' : ''}`}
              style={{ transform: `translate3d(-${currentSlide * 100}%, 0px, 0px)` }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTransitionEnd={handleTransitionEnd}
            >
              {extendedBanners.map((banner, index) => (
                <div key={`${banner.id}-${index}`} className="banner-slider__slide">
                  <div className="banner-slider__slide-content">
                    <a 
                      href={banner.link} 
                      className="banner-slider__link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={banner.image}
                        alt={banner.title}
                        className="banner-slider__image"
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Dots Indicator */}
          <div className="banner-slider__dots banner-slider__dots--mobile">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`banner-slider__dot ${
                  currentSlide === index + 1 ? 'banner-slider__dot--active' : ''
                }`}
                onClick={() => goToSlide(index)}
                aria-label={`Chuyển tới slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop Navigation Arrows */}
        <div className="banner-slider__nav">
          <button 
            className="banner-slider__arrow banner-slider__arrow--prev"
            onClick={prevSlide}
            aria-label="Slide trước"
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
            className="banner-slider__arrow banner-slider__arrow--next"
            onClick={nextSlide}
            aria-label="Slide tiếp theo"
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
      </div>
    </div>
  );
};

export default BannerSlider;