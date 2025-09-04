import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import TourReviews from '../TourReviews/TourReviews';
import Loading from '../../common/Loading/Loading';
import TourBookingForm from '../TourBookingForm/TourBookingForm';
import SuggestedTours from '../../SuggestedTours/SuggestedTours';
import { replacePlaceholderUrl, PLACEHOLDER_IMAGES } from '../../../utils/placeholderImage';
import { formatPrice } from '../../../utils/formatPrice';
import { processHtmlContent } from '../../../utils/htmlUtils';
import { createOrder } from '../../../services/OrderService';
import { calculateTourDuration } from '../../../utils/durationUtils';
import './TourDetail.scss';

const TourDetail = ({ tourData, isLoading = false, isError = false, error = null, suggestedTours = [] }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Sidebar scroll
  const [currentScrollY, setCurrentScrollY] = useState(0);
  const [showSidebarImage, setShowSidebarImage] = useState(false);
  const [isSidebarScrolled, setIsSidebarScrolled] = useState(false);

  // Booking modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  useEffect(() => {
  const handleScroll = () => {
    const scrollY = document.body.scrollTop || document.documentElement.scrollTop || window.pageYOffset || 0;
    const threshold = 100;
    const shouldShow = scrollY > threshold;

    setCurrentScrollY(scrollY);
    setIsSidebarScrolled(scrollY > threshold);
    setShowSidebarImage(shouldShow);
  };

  document.body.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('scroll', handleScroll, { passive: true });

  handleScroll();

    return () => {
      document.body.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const tourId = tourData?._id;

  // Gallery động dựa trên dữ liệu backend
  const gallery = useMemo(() => {
    const title = tourData?.title || 'Hình ảnh Tour';
    // Nếu backend trả về mảng images [url1, url2, ...]
    if (Array.isArray(tourData?.images) && tourData.images.length > 0) {
      return tourData.images.map((rawUrl, i) => ({
        id: i + 1,
        src: replacePlaceholderUrl(rawUrl),
        alt: title,
        caption: title
      }));
    }

    // Fallback: dùng ảnh chính nếu có + 1-2 placeholder
    const fallback = [];
    if (tourData?.image) {
      fallback.push({
        id: 1,
        src: replacePlaceholderUrl(tourData.image),
        alt: title,
        caption: title
      });
    }
    fallback.push({ id: fallback.length + 1, src: PLACEHOLDER_IMAGES.TOUR_GALLERY, alt: title, caption: title });
    fallback.push({ id: fallback.length + 1, src: PLACEHOLDER_IMAGES.TOUR_DETAIL, alt: title, caption: title });
    return fallback.slice(0, 2);
  }, [tourData?.images, tourData?.image, tourData?.title]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState({
      overview: false,
      schedule: [],
      includes: {
      included: false,
      excluded: false,
      notes: false
    },
  });

  // Trạng thái swipe của gallery (dùng Pointer Events)
  const startXRef = useRef(0);
  const dxRef = useRef(0);

  const thumbnailsRef = useRef(null);
  const overviewRef = useRef(null);
  const overviewTitleRef = useRef(null);
  const scheduleRef = useRef(null);
  const scheduleTitleRef = useRef(null);
  const includesRef = useRef(null);
  const includesTitleRef = useRef(null);
  const reviewsRef = useRef(null);
  const reviewsTitleRef = useRef(null);



  // Initialize expanded sections based on schedule length
  useEffect(() => {
    if (tourData?.schedule) {
      setExpandedSections(prev => ({
        ...prev,
        schedule: new Array(tourData.schedule.length).fill(false)
      }));
    }
  }, [tourData?.schedule]);

  // Đảm bảo currentImageIndex hợp lệ khi độ dài gallery thay đổi
  useEffect(() => {
    if (gallery.length > 0 && currentImageIndex >= gallery.length) {
      setCurrentImageIndex(0);
    }
  }, [gallery.length, currentImageIndex]);

  // Booking handlers
  const handleBookingClick = () => {
    setIsBookingModalOpen(true);
    setBookingResult(null);
  };

  const handleBookingClose = () => {
    setIsBookingModalOpen(false);
    setBookingResult(null);
  };

  const handleBookingSubmit = async (orderData, recaptchaToken) => {
    try {
      const result = await createOrder(orderData, recaptchaToken);

      // Close modal immediately
      setIsBookingModalOpen(false);
      setBookingResult(null);

      // Kiểm tra phương thức thanh toán
      if (orderData.paymentMethod === 'Ví điện tử MoMo') {
        // Xử lý thanh toán MoMo - chuyển hướng trực tiếp
        const { createMoMoPayment } = await import('../../../services/OrderService');
        
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            const paymentData = {
              orderId: result.order.orderId,
              amount: result.order.totalAmount,
              orderInfo: `Thanh toán tour du lịch - ${result.order.orderId}`
            };

            const paymentResult = await createMoMoPayment(paymentData);
            
            if (paymentResult.success) {
              // Chuyển hướng trực tiếp đến trang thanh toán MoMo
              window.location.href = paymentResult.data.payUrl;
              return; // Dừng thực thi để chuyển hướng
            } else {
              // Kiểm tra nếu là lỗi orderId trùng và còn retry
              if (paymentResult.resultCode === 41 && retryCount < maxRetries) {
                retryCount++;
                // Đợi một chút trước khi retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
              }
              
              throw new Error(paymentResult.message || 'Không thể tạo thanh toán MoMo');
            }
          } catch (paymentError) {
            
            if (retryCount < maxRetries) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            
            // Đã hết retry, chuyển đến trang thành công với thông báo lỗi
            navigate('/thank-you', {
              state: {
                orderInfo: {
                  orderId: result.order?.orderId || 'N/A',
                  customer: result.order?.customer || orderData.customer,
                  email: result.order?.email || orderData.email,
                  phone: result.order?.phone || orderData.phone,
                  totalAmount: result.order?.totalAmount,
                  status: result.order?.status,
                  createdAt: result.order?.createdAt,
                  paymentError: 'Có lỗi xảy ra với thanh toán MoMo sau nhiều lần thử. Vui lòng liên hệ hỗ trợ hoặc thử lại sau.'
                }
              },
              replace: true
            });
            return;
          }
        }
      } else if (orderData.paymentMethod === 'Ví điện tử VNPay') {
        // Xử lý thanh toán VNPay - chuyển hướng trực tiếp
        const { createVNPayPayment } = await import('../../../services/OrderService');
        
        try {
          const paymentData = {
            orderId: result.order.orderId,
            amount: result.order.totalAmount,
            orderInfo: `Thanh toán tour du lịch - ${result.order.orderId}`,
            bankCode: '' // Để trống sẽ hiển thị trang chọn phương thức thanh toán VNPay
          };

          const paymentResult = await createVNPayPayment(paymentData);
          
          if (paymentResult.success && paymentResult.data.paymentUrl) {
            // Chuyển hướng trực tiếp đến trang thanh toán VNPay
            window.location.href = paymentResult.data.paymentUrl;
            return; // Dừng thực thi để chuyển hướng
          } else {
            throw new Error(paymentResult.message || 'Không thể tạo thanh toán VNPay');
          }
        } catch (paymentError) {
          console.error('❌ Lỗi thanh toán VNPay:', paymentError);
          
          // Chuyển đến trang thành công với thông báo lỗi VNPay
          navigate('/thank-you', {
            state: {
              orderInfo: {
                orderId: result.order?.orderId || 'N/A',
                customer: result.order?.customer || orderData.customer,
                email: result.order?.email || orderData.email,
                phone: result.order?.phone || orderData.phone,
                totalAmount: result.order?.totalAmount,
                status: result.order?.status,
                createdAt: result.order?.createdAt,
                paymentError: 'Có lỗi xảy ra với thanh toán VNPay. Vui lòng liên hệ hỗ trợ hoặc thử lại sau.'
              }
            },
            replace: true
          });
          return;
        }
      } else {
        // Các phương thức thanh toán khác
        navigate('/thank-you', {
          state: {
            orderInfo: {
              orderId: result.order?.orderId || 'N/A',
              customer: result.order?.customer || orderData.customer,
              email: result.order?.email || orderData.email,
              phone: result.order?.phone || orderData.phone,
              totalAmount: result.order?.totalAmount,
              status: result.order?.status,
              createdAt: result.order?.createdAt
            }
          },
          replace: true
        });
      }

    } catch (error) {
      console.error('Error creating order:', error);

      setBookingResult({
        success: false,
        message: error.response?.data?.message || 'Có lỗi xảy ra khi đặt tour. Vui lòng thử lại.',
        error: error.response?.data?.validationErrors || null
      });
    }
  };

  //Cấu hình hình thu nhỏ vô hạn
  const TOTAL_COPIES = 300;
  const CENTER = Math.floor(TOTAL_COPIES / 2);

  //Xây dựng dải hình thu nhỏ "vô hạn" bằng cách lặp lại
  const repeatedThumbnails = useMemo(() => {
    if (!gallery?.length) return [];
    const copies = [];
    for (let c = 0; c < TOTAL_COPIES; c++) {
      for (let i = 0; i < gallery.length; i++) {
        const img = gallery[i];
        copies.push({
          ...img,
          __realIndex: i,
          __key: `${c}-${i}-${img.src || i}`,
        });
      }
    }
    return copies;
  }, [gallery]);

 //Xây dựng một dải hình ảnh chính "vô hạn" bằng cách lặp lại
  const repeatedMainImages = useMemo(() => {
    if (!gallery?.length) return [];
    const copies = [];
    for (let c = 0; c < TOTAL_COPIES; c++) {
      for (let i = 0; i < gallery.length; i++) {
        const img = gallery[i];
        copies.push({
          ...img,
          __realIndex: i,
          __key: `main-${c}-${i}-${img.src || i}`,
        });
      }
    }
    return copies;
  }, [gallery]);

  //vị trí tuyệt đối trong dải lặp lại
  const [absolutePosition, setAbsolutePosition] = useState(0);

  //Tham khảo cho các thuộc tính tùy chỉnh CSS
  const galleryRef = useRef(null);

  // Enable transitions only after mount
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Guard to avoid re-initializing absolute position
  const didInit = useRef(false);

  // animation config
  const SLIDE_MS = 420;
  const isAnimatingRef = useRef(false);

  // Disable transition on first paint, enable after ready
  useLayoutEffect(() => {
    const el = galleryRef.current;
    if (!el) return;

    // turn off transitions for initial mount to avoid flicker
    el.classList.remove('is-ready');
    el.style.setProperty('--duration-main', '0ms');
    el.style.setProperty('--duration-thumb', '0ms');

    let id1, id2;
      id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        if (el) {
          el.classList.add('is-ready');
          el.style.removeProperty('--duration-main');
          el.style.removeProperty('--duration-thumb');
        }
      });
    });
    return () => {
      if (id1) cancelAnimationFrame(id1);
      if (id2) cancelAnimationFrame(id2);
    };
  }, [repeatedMainImages.length]);



  //Khởi tạo vị trí tuyệt đối cho hình ảnh hiện tại
  useLayoutEffect(() => {
    if (!gallery?.length || didInit.current) return;
    setAbsolutePosition(CENTER * gallery.length + currentImageIndex);
    didInit.current = true;
  }, [gallery.length, currentImageIndex]);

  //Di chuyển theo đường dẫn ngắn nhất khi CurrentImageIndex thay đổi
  useLayoutEffect(() => {
    if (!gallery?.length) return;
    setAbsolutePosition(prev => {
      if (prev === 0) return CENTER * gallery.length + currentImageIndex;
      const n = gallery.length;
      const mod = ((prev % n) + n) % n;
      const fwd = (currentImageIndex - mod + n) % n;
      const bwd = fwd - n;
      const step = Math.abs(bwd) <= fwd ? bwd : fwd;
      return prev + step;
    });
  }, [currentImageIndex]);

  //Đặt các thuộc tính tùy chỉnh CSS cho kiểu dáng động
  useLayoutEffect(() => {
    if (galleryRef.current && repeatedMainImages.length > 0) {
      const n = repeatedMainImages.length;
      const shiftPercent = (100 / n) * absolutePosition;

      galleryRef.current.style.setProperty('--total-images', n);
      galleryRef.current.style.setProperty('--absolute-position', String(Math.round(absolutePosition)));
      galleryRef.current.style.setProperty('--shift-percent', `${shiftPercent}%`);
      galleryRef.current.style.setProperty('--image-width', `${100 / n}%`);
    }
  }, [absolutePosition, repeatedMainImages.length]);



  // Điều hướng ảnh: chuyển ngay (không fade)
  const nextImage = useCallback(() => {
    if (!gallery?.length || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    if (galleryRef.current) {
      galleryRef.current.style.setProperty('--duration-main', `${SLIDE_MS}ms`);
      galleryRef.current.style.setProperty('--duration-thumb', `${SLIDE_MS - 60}ms`);
      galleryRef.current.classList.add('is-animating');
    }
    setCurrentImageIndex(prev => (prev + 1) % gallery.length);
    window.setTimeout(() => {
      isAnimatingRef.current = false;
      if (galleryRef.current) {
        galleryRef.current.classList.remove('is-animating');
        galleryRef.current.style.removeProperty('--duration-main');
        galleryRef.current.style.removeProperty('--duration-thumb');
      }
    }, SLIDE_MS);
  }, [gallery?.length]);

  const prevImage = useCallback(() => {
    if (!gallery?.length || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    if (galleryRef.current) {
      galleryRef.current.style.setProperty('--duration-main', `${SLIDE_MS}ms`);
      galleryRef.current.style.setProperty('--duration-thumb', `${SLIDE_MS - 60}ms`);
      galleryRef.current.classList.add('is-animating');
    }
    setCurrentImageIndex(prev => (prev - 1 + gallery.length) % gallery.length);
    window.setTimeout(() => {
      isAnimatingRef.current = false;
      if (galleryRef.current) {
        galleryRef.current.classList.remove('is-animating');
        galleryRef.current.style.removeProperty('--duration-main');
        galleryRef.current.style.removeProperty('--duration-thumb');
      }
    }, SLIDE_MS);
  }, [gallery?.length]);

  const selectImage = useCallback((index) => {
    if (!gallery?.length) return;
    setCurrentImageIndex(index);
  }, [gallery?.length]);

  // Preload ảnh lân cận
  useEffect(() => {
    if (gallery?.length > 1) {
      const n = new Image();
      n.src = gallery[(currentImageIndex + 1) % gallery.length]?.src || "";
      const p = new Image();
      p.src = gallery[(currentImageIndex - 1 + gallery.length) % gallery.length]?.src || "";
    }
  }, [currentImageIndex, gallery]);

  //điều hướng bàn phím
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prevImage();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevImage, nextImage]);

  const toggleSection = (section, subsection = null) => {
    if (subsection !== null) {
      if (section === 'schedule') {
        // Handle schedule array
        setExpandedSections(prev => ({
          ...prev,
          schedule: prev.schedule.map((item, index) =>
            index === subsection ? !item : item
          )
        }));
      } else {
        // Handle includes object
        setExpandedSections(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            [subsection]: !prev[section][subsection]
          }
        }));
      }
    } else {
      setExpandedSections(prev => {
        const newState = {
          ...prev,
          [section]: !prev[section]
        };

        //Nếu sụp đổ phần tổng quan, hãy cuộn lên đầu tổng quan
        if (section === 'overview' && prev[section] === true) {
          setTimeout(() => {
            if (overviewRef.current) {
              overviewRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
            }
          }, 100);
        }

        return newState;
      });
    }
  };

  const handleNavClick = (tab) => {
    setActiveTab(tab);

    //Cuộn theo tiêu đề phần tương ứng (H2)
    const titleRefs = {
      'overview': overviewTitleRef,
      'schedule': scheduleTitleRef,
      'includes': includesTitleRef,
      'reviews': reviewsTitleRef
    };

    const targetTitleRef = titleRefs[tab];
    if (targetTitleRef && targetTitleRef.current) {
      targetTitleRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const durationText = useMemo(() => {
    return calculateTourDuration(tourData);
  }, [tourData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="tour-detail">
        {/* Header Skeleton */}
        <div className="tour-detail__header">
          <div className="tour-detail__skeleton tour-detail__skeleton--badge"></div>
          <div className="tour-detail__skeleton tour-detail__skeleton--title"></div>
          <div className="tour-detail__skeleton tour-detail__skeleton--rating"></div>
        </div>

        <div className="tour-detail__container">
          <div className="tour-detail__content">
            {/* Gallery Skeleton */}
            <div className="tour-detail__skeleton tour-detail__skeleton--gallery"></div>

            {/* Navigation Skeleton */}
            <div className="tour-detail__skeleton tour-detail__skeleton--nav"></div>

            {/* Content Sections Skeleton */}
            <div className="tour-detail__skeleton tour-detail__skeleton--section">
              <div className="tour-detail__skeleton tour-detail__skeleton--section-title"></div>
              <div className="tour-detail__skeleton tour-detail__skeleton--text"></div>
              <div className="tour-detail__skeleton tour-detail__skeleton--text tour-detail__skeleton--text-short"></div>
              <div className="tour-detail__skeleton tour-detail__skeleton--text"></div>
            </div>

            <div className="tour-detail__skeleton tour-detail__skeleton--section">
              <div className="tour-detail__skeleton tour-detail__skeleton--section-title"></div>
              <div className="tour-detail__skeleton tour-detail__skeleton--text"></div>
              <div className="tour-detail__skeleton tour-detail__skeleton--text tour-detail__skeleton--text-short"></div>
            </div>

            <div className="tour-detail__skeleton tour-detail__skeleton--section">
              <div className="tour-detail__skeleton tour-detail__skeleton--section-title"></div>
              <div className="tour-detail__skeleton tour-detail__skeleton--text"></div>
              <div className="tour-detail__skeleton tour-detail__skeleton--text"></div>
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="tour-detail__sidebar">
            <div className="tour-detail__skeleton tour-detail__skeleton--sidebar"></div>
          </div>
        </div>

        {/* Loading Overlay */}
        <Loading
          overlay={true}
          size="large"
          text="Đang tải thông tin tour..."
        />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="tour-detail">
        <div className="tour-detail__error">
          <div className="tour-detail__error-content">
            <svg className="tour-detail__error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h2 className="tour-detail__error-title">Không thể tải thông tin tour</h2>
            <p className="tour-detail__error-message">
              {error?.message || 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.'}
            </p>
            <button
              className="tour-detail__error-retry"
              onClick={() => window.location.reload()}
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If no tour data, show not found
  if (!tourData) {
    return (
      <div className="tour-detail">
        <div className="tour-detail__not-found">
          <div className="tour-detail__not-found-content">
            <svg className="tour-detail__not-found-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <h2 className="tour-detail__not-found-title">Không tìm thấy tour</h2>
            <p className="tour-detail__not-found-message">
              Tour bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
            </p>
            <Link to="/tours" className="tour-detail__not-found-back">
              Quay lại danh sách tour
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tour-detail">
      {/* Header Section */}
      <div className="tour-detail__header">

        <h1 className="tour-detail__title">
          {tourData?.title || 'Chi tiết tour'}
        </h1>
        <div className="tour-detail__rating">
          <div className="tour-detail__stars">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className={`tour-detail__star ${i < Math.round(tourData?.averageRating || 0) ? 'tour-detail__star--filled' : ''}`} viewBox="0 0 16 17">
                <path d="M6.35149 4.57033C7.09984 3.47962 7.47402 2.93426 8.00065 2.93426C8.52729 2.93426 8.90146 3.47962 9.64981 4.57033L10.0706 5.18358C10.2697 5.4738 10.3692 5.61891 10.5088 5.72021C10.6484 5.82152 10.8172 5.87123 11.1548 5.97064L11.8654 6.17988C13.1365 6.55418 13.7721 6.74133 13.935 7.24278C14.0979 7.74423 13.6935 8.26912 12.8849 9.3189L12.435 9.90295C12.22 10.1821 12.1125 10.3217 12.0591 10.4859C12.0057 10.6501 12.0105 10.8262 12.0202 11.1785L12.0406 11.9172C12.077 13.2404 12.0952 13.9019 11.669 14.2117C11.2429 14.5215 10.6192 14.3 9.37191 13.8569L8.67008 13.6076C8.33868 13.4899 8.17298 13.431 8.00065 13.431C7.82832 13.431 7.66262 13.4899 7.33122 13.6076L6.62939 13.8569C5.38209 14.3 4.75844 14.5215 4.33225 14.2117C3.90607 13.9019 3.92429 13.2404 3.96072 11.9172L3.98106 11.1785C3.99076 10.8262 3.99561 10.6501 3.94221 10.4859C3.88882 10.3217 3.7813 10.1821 3.56626 9.90294L3.11639 9.3189C2.30776 8.26912 1.90345 7.74423 2.06632 7.24278C2.22918 6.74133 2.86476 6.55418 4.13591 6.17988L4.84651 5.97064C5.18413 5.87123 5.35294 5.82152 5.4925 5.72021C5.63206 5.61891 5.73162 5.4738 5.93074 5.18358L6.35149 4.57033Z"/>
              </svg>
            ))}
          </div>
          {tourData?.totalReviews > 0 && tourData?.averageRating > 0 ? (
            <>
              <span className="tour-detail__rating-score">
                {tourData.averageRating.toFixed(1)}
              </span>
              <span className="tour-detail__rating-info">
                ({tourData.totalReviews}) | {tourData?.bookings || 0}+ đã đặt chỗ
              </span>
            </>
          ) : (
            <span className="tour-detail__rating-info">
              Chưa có đánh giá
            </span>
          )}
        </div>
      </div>

      <div className="tour-detail__container">
        <div className="tour-detail__content">
          {/* Image Gallery */}
          <div className={`tour-detail__gallery ${ready ? 'is-ready' : ''}`} ref={galleryRef}>
            <div
              className="tour-detail__main-image"
              onPointerDown={(e) => { startXRef.current = e.clientX ?? 0; dxRef.current = 0; }}
              onPointerMove={(e) => { const x = e.clientX ?? 0; dxRef.current = x - startXRef.current; }}
              onPointerUp={() => { const t = 40; if (dxRef.current > t) prevImage(); else if (dxRef.current < -t) nextImage(); dxRef.current = 0; }}
            >
              <div className="tour-detail__main-image-strip">
                {repeatedMainImages.map((image, idx) => (
                  <img
                    key={image.__key}
                    src={image.src || PLACEHOLDER_IMAGES.TOUR_GALLERY}
                    alt={image.alt || tourData?.title || 'Hình ảnh Tour'}
                    className="tour-detail__image"
                    loading={idx === absolutePosition ? 'eager' : 'lazy'}
                    decoding="async"
                    draggable={false}
                  />
                ))}
              </div>

              {/* Navigation arrows */}
              <button
                className="tour-detail__gallery-nav tour-detail__gallery-nav--prev"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (gallery.length > 1) prevImage();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (gallery.length > 1) prevImage();
                }}
                onClick={(e) => e.preventDefault()}
                aria-label="Ảnh trước"
                disabled={gallery.length <= 1}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <button
                className="tour-detail__gallery-nav tour-detail__gallery-nav--next"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (gallery.length > 1) nextImage();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (gallery.length > 1) nextImage();
                }}
                onClick={(e) => e.preventDefault()}
                aria-label="Ảnh tiếp theo"
                disabled={gallery.length <= 1}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div
              className="tour-detail__thumbnails"
              ref={thumbnailsRef}
              role="listbox"
            >
              <div className="tour-detail__thumbnails-inner">
                {repeatedThumbnails.map((image, idx) => {
                  const cycleLen = gallery.length || 1;
                  const nThumb = repeatedThumbnails.length || 1;
                  const nMain  = repeatedMainImages.length || 1;

                  let activeIdx = ((absolutePosition % nThumb) + nThumb) % nThumb;
                  if (nThumb === nMain) {
                    const mainReal  = ((absolutePosition % cycleLen) + cycleLen) % cycleLen;
                    const baseCycle = Math.floor(absolutePosition / cycleLen);
                    activeIdx = ((baseCycle * cycleLen + mainReal) % nThumb + nThumb) % nThumb;
                  }

                  const isActive = idx === activeIdx;
                  return (
                  <button
                    key={image.__key}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`tour-detail__thumbnail ${isActive ? 'tour-detail__thumbnail--active' : ''}`}
                    onClick={() => selectImage(image.__realIndex)}
                    title={`Ảnh ${image.__realIndex + 1}`}
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="tour-detail__thumbnail-image"
                      loading="lazy"
                    />
                  </button>
                );
                })}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="tour-detail__nav">
            <ul className="tour-detail__nav-list">
              <li
                className={`tour-detail__nav-item ${activeTab === 'overview' ? 'tour-detail__nav-item--active' : ''}`}
                onClick={() => handleNavClick('overview')}
              >
                Giới thiệu
              </li>
              <li
                className={`tour-detail__nav-item ${activeTab === 'schedule' ? 'tour-detail__nav-item--active' : ''}`}
                onClick={() => handleNavClick('schedule')}
              >
                Lịch trình
              </li>
              <li
                className={`tour-detail__nav-item ${activeTab === 'includes' ? 'tour-detail__nav-item--active' : ''}`}
                onClick={() => handleNavClick('includes')}
              >
                Bao gồm và điều khoản
              </li>
              <li
                className={`tour-detail__nav-item ${activeTab === 'reviews' ? 'tour-detail__nav-item--active' : ''}`}
                onClick={() => handleNavClick('reviews')}
              >
                Đánh giá tour
              </li>
            </ul>
          </div>

          {/* Overview Section */}
          <div className="tour-detail__overview" ref={overviewRef}>
            <h2 className="tour-detail__section-title" ref={overviewTitleRef}>Giới thiệu chung</h2>
            <div className={`tour-detail__overview-content ${expandedSections.overview ? 'tour-detail__overview-content--expanded' : ''}`}>
              {/* Intro HTML from API */}
              {tourData?.overview?.introHtml ? (
                <div className="html-content" dangerouslySetInnerHTML={{ __html: processHtmlContent(tourData.overview.introHtml) }} />
              ) : (
                <p>Thông tin giới thiệu sẽ được cập nhật.</p>
              )}

              {/* Pricing and Schedule Table */}
              {tourData?.overview?.pricing && (
                <div className="tour-detail__pricing-schedule">
                  <div className="tour-detail__pricing-table">
                    <div className="tour-detail__table-header">
                      <h3>{tourData.overview.pricing.yearTitle || 'LỊCH KHỞI HÀNH'}</h3>
                      <h3>GIÁ TOUR CHỈ TỪ (VNĐ/KHÁCH)</h3>
                    </div>
                    {tourData.overview.pricing.rows?.map((row, index) => (
                      <div key={index} className="tour-detail__table-row">
                        <div className="tour-detail__table-cell">{row.dateLabel}</div>
                        <div className="tour-detail__table-cell tour-detail__table-cell--price">
                          {formatPrice(row.priceText)}
                        </div>
                      </div>
                    ))}
                    {tourData.overview.pricing.noteHtml && (
                      <div className="tour-detail__table-note">
                        <div className="html-content" dangerouslySetInnerHTML={{ __html: processHtmlContent(tourData.overview.pricing.noteHtml) }} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Promotional Offers */}
              {tourData?.overview?.promotions && tourData.overview.promotions.length > 0 && (
                <div className="tour-detail__promotions">
                  <h3 className="tour-detail__promotions-title">Các chương trình Khuyến mãi</h3>
                  {tourData.overview.promotions.map((promotion, index) => (
                    <div key={index} className="tour-detail__promotion-item">
                      <div className="tour-detail__promotion-label">{promotion.label}</div>
                      <div className="tour-detail__promotion-desc">{promotion.desc}</div>
                    </div>
                  ))}
                </div>
              )}

              {expandedSections.overview && (
                <>
                  {/* Detailed Description */}
                  <div className="tour-detail__detailed-description">
                    {/* Description from API */}
                    {tourData?.overview?.description && (
                      <div className="tour-detail__description-content">
                        <div className="html-content" dangerouslySetInnerHTML={{ __html: processHtmlContent(tourData.overview.description) }} />
                      </div>
                    )}

                    <div className="tour-detail__collapse-btn-container">
                      <button
                        className="tour-detail__collapse-btn"
                        onClick={() => toggleSection('overview')}
                      >
                        <svg className="tour-detail__collapse-icon" viewBox="0 0 24 24">
                          <path d="M7 14L12 9L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Thu gọn
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
            {!expandedSections.overview && (
              <button
                className="tour-detail__expand-btn"
                onClick={() => toggleSection('overview')}
              >
                <svg className="tour-detail__expand-icon" viewBox="0 0 24 24">
                  <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Xem thêm</span>
              </button>
            )}

            {/* Highlights - Always visible outside of overview content */}
            {tourData?.highlights && tourData.highlights.length > 0 && (
              <div className="tour-detail__highlights-section">
                <h3 className="tour-detail__highlight-title">Điểm nổi bật</h3>
                <ul className="tour-detail__highlight-list">
                  {tourData.highlights.map((highlight, index) => (
                    <li key={index} className="html-content" dangerouslySetInnerHTML={{ __html: processHtmlContent(highlight) }} />
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Schedule Section */}
          <div className="tour-detail__schedule" ref={scheduleRef}>
            <h2 className="tour-detail__section-title" ref={scheduleTitleRef}>Lịch trình</h2>
            <div className="tour-detail__timeline">
              {tourData?.schedule && tourData.schedule.length > 0 ? (
                tourData.schedule.map((day, index) => (
                  <div key={index} className="tour-detail__timeline-item">
                    <div className="tour-detail__timeline-marker">
                      <button
                        className="tour-detail__timeline-btn"
                        onClick={() => toggleSection('schedule', index)}
                      >
                        {expandedSections.schedule[index] ? '-' : '+'}
                      </button>
                    </div>
                    <div className="tour-detail__timeline-content">
                      <h3
                        className="tour-detail__timeline-title"
                        onClick={() => toggleSection('schedule', index)}
                      >
                        NGÀY {day.day}: {day.title}
                      </h3>
                      {expandedSections.schedule[index] && (
                        <div className="tour-detail__timeline-details">
                          <div className="tour-detail__timeline-text">
                            {day.content ? (
                              <div className="html-content" dangerouslySetInnerHTML={{ __html: processHtmlContent(day.content) }} />
                            ) : (
                              <p>Nội dung lịch trình sẽ được cập nhật.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p>Lịch trình sẽ được cập nhật.</p>
              )}
            </div>
          </div>

          {/* Includes & Terms */}
          <div className="tour-detail__includes" ref={includesRef}>
            <h2 className="tour-detail__section-title" ref={includesTitleRef}>Bao gồm và điều khoản</h2>

            <div className="tour-detail__includes-section">
              <div
                className="tour-detail__includes-header"
                onClick={() => toggleSection('includes', 'included')}
              >
                <h3>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572M22 4.00574L14.8284 11.1845C13.4952 12.5191 12.8285 13.1864 11.9998 13.1866C11.1711 13.1868 10.5041 12.5198 9.17016 11.1859L9 11.0157" stroke="#1F50EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Giá tour bao gồm
                </h3>
                <span className={`tour-detail__includes-icon ${expandedSections.includes.included ? 'tour-detail__includes-icon--expanded' : ''}`}>
                  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="text-primary-500 transition" height="1em" width="1em">
                    <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/>
                  </svg>
                </span>
              </div>
              {expandedSections.includes.included && (
                <ul className="tour-detail__includes-list">
                  {tourData?.includes?.included && tourData.includes.included.length > 0 ? (
                    tourData.includes.included.map((item, index) => (
                      <li key={index} className="html-content" dangerouslySetInnerHTML={{ __html: processHtmlContent(item) }} />
                    ))
                  ) : (
                    <li>Thông tin sẽ được cập nhật.</li>
                  )}
                </ul>
              )}
            </div>

            <div className="tour-detail__includes-section">
              <div
                className="tour-detail__includes-header"
                onClick={() => toggleSection('includes', 'excluded')}
              >
                <h3>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="#1F50EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14.2426 14.2426L10 10" stroke="#1F50EA" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M14.2426 10L10 14.2427" stroke="#1F50EA" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Giá tour không bao gồm
                </h3>
                <span className={`tour-detail__includes-icon ${expandedSections.includes.excluded ? 'tour-detail__includes-icon--expanded' : ''}`}>
                  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="text-primary-500 transition" height="1em" width="1em">
                    <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/>
                  </svg>
                </span>
              </div>
              {expandedSections.includes.excluded && (
                <ul className="tour-detail__includes-list">
                  {tourData?.includes?.excluded && tourData.includes.excluded.length > 0 ? (
                    tourData.includes.excluded.map((item, index) => (
                      <li key={index} className="html-content" dangerouslySetInnerHTML={{ __html: processHtmlContent(item) }} />
                    ))
                  ) : (
                    <li>Thông tin sẽ được cập nhật.</li>
                  )}
                </ul>
              )}
            </div>

            <div className="tour-detail__includes-section">
              <div
                className="tour-detail__includes-header"
                onClick={() => toggleSection('includes', 'notes')}
              >
                <h3>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 8V12M12 16H12.01" stroke="#1F50EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="#1F50EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Lưu ý
                </h3>
                <span className={`tour-detail__includes-icon ${expandedSections.includes.notes ? 'tour-detail__includes-icon--expanded' : ''}`}>
                  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="text-primary-500 transition" height="1em" width="1em">
                    <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/>
                  </svg>
                </span>
              </div>
              {expandedSections.includes.notes && (
                <div className="tour-detail__includes-content">
                  {/* Important Notes */}
                  {tourData?.includes?.notes?.important && tourData.includes.notes.important.length > 0 && (
                    <div className="tour-detail__notes-section">
                      <ul className="tour-detail__includes-list">
                        {tourData.includes.notes.important.map((note, index) => (
                          <li key={index} className="html-content" dangerouslySetInnerHTML={{ __html: processHtmlContent(note) }} />
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fallback if no notes data */}
                  {(!tourData?.includes?.notes ||
                    (!tourData.includes.notes.cancelPolicy?.length &&
                     !tourData.includes.notes.payment?.length &&
                     !tourData.includes.notes.important?.length)) && (
                    <p>Thông tin lưu ý sẽ được cập nhật.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reviews */}
          <TourReviews
            tourId={tourId}
            reviewsRef={reviewsRef}
            reviewsTitleRef={reviewsTitleRef}
          />
        </div>

        {/* Sidebar */}
        <div className="tour-detail__sidebar">
          <div className={`tour-detail__booking-card ${isSidebarScrolled ? 'tour-detail__booking-card--scrolled' : ''}`}>
            <div className={`tour-detail__booking-image-container ${showSidebarImage ? 'tour-detail__booking-image-container--visible' : ''}`}>
              <img
                src={tourData?.image || gallery[0]?.src || PLACEHOLDER_IMAGES.TOUR_CARD}
                alt={tourData?.title || 'Tour thumbnail'}
                className="tour-detail__booking-image"
              />
            </div>
            <h3
              className="tour-detail__booking-title"
            >
              {showSidebarImage
                ? (tourData?.title || 'Chi tiết tour')
                : 'Giá tour trọn gói'
              }
            </h3>
            <div className="tour-detail__pricing">
              {tourData?.originalPrice &&
               tourData?.originalPrice !== (tourData?.price || tourData?.discountPrice) &&
               (tourData?.price || tourData?.discountPrice) && (
                <div className="tour-detail__price-original">{formatPrice(tourData.originalPrice)}</div>
              )}
              <div className="tour-detail__price-current">{formatPrice(tourData?.price || tourData?.discountPrice || 0)}</div>
            </div>

            <div className="tour-detail__info-list">
              <div className="tour-detail__info-item">
                <svg className="tour-detail__info-icon" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="9.33" r="5.33" stroke="#1F50EA" strokeWidth="1.5"/>
                  <path d="M6.67 1.33h2.66M8 1.33V4M11.67 5.33l1-1M8 9.33V7.33M8 9.33H6" stroke="#1F50EA" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="tour-detail__label"><strong>Thời gian:</strong> {durationText}</span>
              </div>

              <div className="tour-detail__info-item">
                <svg className="tour-detail__info-icon" viewBox="0 0 16 16" fill="none">
                  <path d="M13.33 6.79c0 2.43-1.75 4.66-3.25 6.12-.85.83-1.27 1.25-2.08 1.25s-1.24-.41-2.08-1.25c-1.5-1.46-3.25-3.69-3.25-6.12 0-2.95 2.39-5.33 5.33-5.33s5.33 2.38 5.33 5.33z" stroke="#1F50EA" strokeWidth="1.5"/>
                  <circle cx="8" cy="6.79" r="1.78" stroke="#1F50EA" strokeWidth="1.5"/>
                </svg>
                <span className="tour-detail__label"><strong>Điểm khởi hành:</strong> {tourData?.departure?.name || 'Chưa xác định'}</span>
              </div>

              <div className="tour-detail__info-item">
                <svg className="tour-detail__info-icon" viewBox="0 0 16 16" fill="none">
                  <g fill="#1F50EA" fillRule="evenodd" clipRule="evenodd">
                    <path d="M.67 3.33C.67 2.6 1.26 2 2 2h12c.74 0 1.33.6 1.33 1.33V14c0 .74-.59 1.33-1.33 1.33H2c-.74 0-1.33-.59-1.33-1.33V3.33zm13.33 0H2V14h12V3.33z"/>
                    <path d="M.67 6.67c0-.37.3-.67.66-.67h13.34a.67.67 0 1 1 0 1.33H1.33a.67.67 0 0 1-.66-.66zM.67 10.67c0-.37.3-.67.66-.67h13.34a.67.67 0 0 1 0 1.33H1.33a.67.67 0 0 1-.66-.66zM5.67.67c.37 0 .66.3.66.66V4a.67.67 0 1 1-1.33 0V1.33c0-.37.3-.66.67-.66zM10.33.67c.37 0 .67.3.67.66V4a.67.67 0 1 1-1.33 0V1.33c0-.37.3-.66.66-.66z"/>
                    <path d="M5.67 6c.37 0 .66.3.66.67v8a.67.67 0 1 1-1.33 0v-8c0-.37.3-.67.67-.67zM10.33 6c.37 0 .67.3.67.67v8a.67.67 0 1 1-1.33 0v-8c0-.37.3-.67.67-.67zM14.67 3.67c.37 0 .66.3.66.66V13a.67.67 0 0 1-1.33 0V4.33c0-.37.3-.66.67-.66zM1.33 3.67c.37 0 .67.3.67.66V13a.67.67 0 0 1-1.33 0V4.33c0-.37.3-.66.67-.66z"/>
                    <path d="M4 14.67c0-.37.3-.67.67-.67h6.66a.67.67 0 0 1 0 1.33H4.67a.67.67 0 0 1-.67-.66z"/>
                  </g>
                </svg>
                <div className='tour-detail__departure'>
                  <span className="tour-detail__label"><strong>Lịch khởi hành:</strong></span>
                  <ul className="tour-detail__departure-dates">
                    {tourData?.tourDetails && tourData.tourDetails.length > 0 ? (
                      (() => {
                        // Nhóm các ngày khởi hành theo tháng
                        const groupedByMonth = tourData.tourDetails
                          .filter(detail => detail.dayStart && detail.stock > 0)
                          .reduce((acc, detail) => {
                            const date = new Date(detail.dayStart);
                            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                            const monthName = `Tháng ${String(date.getMonth() + 1).padStart(2, '0')}`;
                            const day = String(date.getDate()).padStart(2, '0');

                            if (!acc[monthKey]) {
                              acc[monthKey] = {
                                monthName,
                                days: []
                              };
                            }
                            acc[monthKey].days.push(day);
                            return acc;
                          }, {});

                        // Sắp xếp theo tháng
                        const sortedMonths = Object.keys(groupedByMonth).sort();

                        return sortedMonths.map(monthKey => (
                          <li key={monthKey} className="month-group">
                            <strong>{groupedByMonth[monthKey].monthName}:</strong> {groupedByMonth[monthKey].days.join(', ')}
                          </li>
                        ));
                      })()
                    ) : tourData?.startDate ? (
                      <li>{(() => {
                        const d = new Date(tourData.startDate);
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        return `${day}/${month}/${year}`;
                      })()}</li>
                    ) : (
                      <li>Đang cập nhật lịch khởi hành</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="tour-detail__info-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path fill="#1F50EA" d="M19.492 6.373c-.099-1.162-.845-1.914-1.996-2.013a.29.29 0 0 0-.315.267.29.29 0 0 0 .265.316c.871.076 1.392.601 1.467 1.48a.293.293 0 0 0 .314.266.29.29 0 0 0 .265-.316"/>
                  <path fill="#1F50EA" d="M20.99 2.849a1.29 1.29 0 0 0-1.038-.379l-.451.042a6.67 6.67 0 0 0-4.467 2.312l-.693.808-1.6-.669.085-.086a.664.664 0 0 0 0-.932l-.485-.49a.65.65 0 0 0-.924 0l-.67.675-.769-.321.193-.195a.664.664 0 0 0 0-.932l-.485-.49a.65.65 0 0 0-.924 0l-.776.784-1.308-.547a1.64 1.64 0 0 0-1.802.361l-.871.878a.91.91 0 0 0 .098 1.369l6.528 4.914-2.179 2.537a.295.295 0 0 0 .03.413.29.29 0 0 0 .41-.03l2.383-2.774 4.199-4.89a6.1 6.1 0 0 1 4.08-2.111l.45-.042a.71.71 0 0 1 .575.21.73.73 0 0 1 .207.578l-.04.455a6.24 6.24 0 0 1-1.055 2.942.295.295 0 0 0 .074.408.29.29 0 0 0 .404-.076 6.8 6.8 0 0 0 1.155-3.22l.041-.455a1.31 1.31 0 0 0-.375-1.047m-9.162 1.02a.07.07 0 0 1 .102 0l.485.49a.074.074 0 0 1 0 .103l-.255.258-.831-.347zM9.173 2.608a.07.07 0 0 1 .102 0l.485.49a.074.074 0 0 1 0 .103l-.363.366-.83-.348zm1.84 6.9L4.45 4.567a.32.32 0 0 1-.128-.234.32.32 0 0 1 .093-.25l.87-.878a1.065 1.065 0 0 1 1.17-.235L13.94 6.1z"/>
                  <path fill="#1F50EA" d="m21.809 14.419-.485-.49a.65.65 0 0 0-.925 0l-.24.242-.368-.896.597-.602a.664.664 0 0 0 0-.932l-.485-.49a.65.65 0 0 0-.924 0l-.014.015-.711-1.732.777-.68q.087-.075.17-.153a.295.295 0 0 0 .016-.414.29.29 0 0 0-.41-.016l-.156.14-8.488 7.415a18 18 0 0 1-3.458 2.37q-.278.147-.56.282a.48.48 0 0 1-.557-.096.49.49 0 0 1-.096-.562 18 18 0 0 1 .416-.824l.027-.05.12-.217.025-.045q.062-.11.126-.22l.024-.04q.065-.113.131-.222l.024-.04.135-.218.027-.044a19 19 0 0 1 .469-.705q.466-.67.993-1.295a.295.295 0 0 0-.034-.412.29.29 0 0 0-.41.033q-.45.537-.86 1.106L4.078 13.43a1.31 1.31 0 0 0-1.47.27l-.447.45a.56.56 0 0 0 .058.839l2.924 2.218q-.09.18-.176.362c-.198.418-.116.9.209 1.228a1.06 1.06 0 0 0 1.218.211q.18-.087.359-.178l2.2 2.949a.55.55 0 0 0 .83.059l.447-.45a1.34 1.34 0 0 0 .268-1.484l-1.188-2.647q.636-.466 1.232-.987l3.413-2.98 4.918 6.645a.897.897 0 0 0 1.358.099l.87-.878a1.67 1.67 0 0 0 .358-1.818l-.475-1.156.824-.83a.664.664 0 0 0 0-.933m-19.213.12.423-.426a.73.73 0 0 1 .82-.15l2.525 1.152-.016.024-.094.142-.045.069q-.16.243-.31.492l-.038.062-.089.148-.045.078-.085.145-.042.075q-.07.122-.136.245l-.047.085zm7.374 5.606a.75.75 0 0 1-.15.827l-.423.427-2.122-2.845.137-.076.194-.11.092-.054.145-.085.072-.044q.25-.15.495-.309l.064-.041.151-.1.06-.04q.072-.047.142-.096zm9.42-8.479a.07.07 0 0 1 .102 0l.485.49a.074.074 0 0 1 0 .103l-.427.43-.344-.838zm1.301 7.074-.87.878a.31.31 0 0 1-.249.094.31.31 0 0 1-.232-.129l-4.944-6.68 3.395-2.965 3.133 7.624c.166.405.075.868-.233 1.178m.707-3.804-.654.66-.344-.839.41-.413a.07.07 0 0 1 .103 0l.485.489a.074.074 0 0 1 0 .103"/>
                </svg>
                <span className="tour-detail__label"><strong>Phương tiện:</strong> {tourData?.transportation?.title || tourData?.transportation?.name || (typeof tourData?.transportation === 'string' ? tourData?.transportation : 'Xe du lịch')}</span>
              </div>
            </div>
            <button
              className="tour-detail__booking-btn"
              onClick={handleBookingClick}
            >
              Đặt tour ngay
            </button>
          </div>
        </div>
      </div>

      {/* Booking Form Modal */}
      <TourBookingForm
        tour={tourData}
        isOpen={isBookingModalOpen}
        onClose={handleBookingClose}
        onSubmit={handleBookingSubmit}
      />

      {/* Booking Result Notification */}
      {bookingResult && (
        <div className={`booking-notification ${bookingResult.success ? 'booking-notification--success' : 'booking-notification--error'}`}>
          <div className="booking-notification__content">
            <h4>{bookingResult.success ? '✅ Thành công!' : '❌ Lỗi!'}</h4>
            <p>{bookingResult.message}</p>
            {bookingResult.orderId && (
              <p><strong>Mã đơn hàng:</strong> {bookingResult.orderId}</p>
            )}
            <button
              className="booking-notification__close"
              onClick={() => setBookingResult(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

          {/* Suggested Tours */}
          {suggestedTours && suggestedTours.length > 0 && (
            <SuggestedTours
              tours={suggestedTours}
              title="Khách hàng còn xem thêm"
            />
          )}
    </div>
  );
};

export default TourDetail;