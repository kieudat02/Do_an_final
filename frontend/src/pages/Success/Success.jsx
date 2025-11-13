import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTours } from "../../services/tourService";
import SuggestedTours from "../../components/SuggestedTours/SuggestedTours";
import { formatDateTimeVietnam } from "../../utils/timeFormatter";
import "./Success.scss";

// Component khối trung tâm cảm ơn
const ThankYouBlock = ({ orderInfo, countdown, onBackToHome }) => {
  return (
    <div className="thank-you-block">
      {/* Email illustration with wings */}
      <div className="email-illustration">
        <div className="email-container">
          <div className="email-body">
            <div className="email-content">
              <div className="email-lines">
                <div className="line"></div>
                <div className="line"></div>
                <div className="line"></div>
              </div>
            </div>
          </div>
          <div className="wing wing-left"></div>
          <div className="wing wing-right"></div>
        </div>
        {/* Decorative elements */}
        <div className="decoration decoration-1"></div>
        <div className="decoration decoration-2"></div>
        <div className="decoration decoration-3"></div>
      </div>

      {/* Success Message */}
      <div className="success-content">
        <h1 className="success-title">Gửi yêu cầu đặt tour thành công!</h1>
        <p className="success-message">
          Cảm ơn bạn đã tin tưởng và lựa chọn ND Travel.<br />
          Chúng tôi sẽ liên hệ lại để xác nhận đặt chỗ của bạn.
        </p>

        {/* Order Information */}
        {orderInfo && (
          <div className="order-info">
            <div className="order-details">
              <div className="order-detail-item">
                <span className="detail-label">Mã đơn hàng:</span>
                <span className="detail-value">{orderInfo.orderId}</span>
              </div>
              <div className="order-detail-item">
                <span className="detail-label">Khách hàng:</span>
                <span className="detail-value">{orderInfo.customer}</span>
              </div>
              <div className="order-detail-item">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{orderInfo.email}</span>
              </div>
              <div className="order-detail-item">
                <span className="detail-label">Số điện thoại:</span>
                <span className="detail-value">{orderInfo.phone}</span>
              </div>
              {orderInfo.totalAmount && (
                <div className="order-detail-item">
                  <span className="detail-label">Tổng tiền:</span>
                  <span className="detail-value total-amount">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(orderInfo.totalAmount)}
                  </span>
                </div>
              )}
              {orderInfo.status && (
              <div className="order-detail-item">
                <span className="detail-label">Trạng thái:</span>
                  <span className={`detail-value status-${orderInfo.status}`}>
                    {orderInfo.status === 'pending' ? 'Chờ xác nhận' :
                     orderInfo.status === 'confirmed' ? 'Đã xác nhận' :
                     orderInfo.status === 'cancelled' ? 'Đã hủy' : orderInfo.status}
                </span>
              </div>
              )}
              {orderInfo.createdAt && (
                <div className="order-detail-item">
                  <span className="detail-label">Thời gian đặt:</span>
                  <span className="detail-value">
                    {new Date(orderInfo.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              )}
              {orderInfo.paymentMethod && (
                <div className="order-detail-item">
                  <span className="detail-label">Phương thức thanh toán:</span>
                  <span className="detail-value">
                    {orderInfo.paymentMethod === 'VNPay' ? 'Ví điện tử VNPay' :
                     orderInfo.paymentMethod === 'MoMo' ? 'Ví điện tử MoMo' :
                     orderInfo.paymentMethod === 'Tiền mặt' ? 'Tiền mặt' :
                     orderInfo.paymentMethod}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tour Details */}
        {orderInfo?.items && orderInfo.items.length > 0 && (
          <div className="success-tour-info">
            <h3 className="success-tour-info-title">
              Chi tiết tour đã đặt
            </h3>
            {orderInfo.items.map((item, index) => {
              const adults = item?.adults || 0;
              const children = item?.children || 0;
              const babies = item?.babies || 0;
              const singleRooms = item?.singleRooms || 0;
              const totalGuests = adults + children + babies;

              return (
                <div key={index} className="success-tour-item">
                  <div className="success-tour-header">
                    <h4 className="success-tour-name">
                      {item.name || orderInfo?.tourDetails?.tourName || 'Tour du lịch'}
                    </h4>
                    {item.quantity > 1 && (
                      <span className="success-tour-quantity">x{item.quantity}</span>
                    )}
                  </div>

                  <div className="success-tour-details-grid">
                    <div className="success-detail-item">
                      <span className="success-detail-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="7" r="4" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span className="success-detail-text">Người lớn: <strong>{adults}</strong></span>
                    </div>

                    {children > 0 && (
                      <div className="success-detail-item">
                        <span className="success-detail-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="8" r="3" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 14s-4 2-4 6h8c0-4-4-6-4-6z" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        <span className="success-detail-text">Trẻ em: <strong>{children}</strong></span>
                      </div>
                    )}

                    {babies > 0 && (
                      <div className="success-detail-item">
                        <span className="success-detail-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="#6c757d" strokeWidth="2"/>
                            <circle cx="9" cy="10" r="1.5" fill="#6c757d"/>
                            <circle cx="15" cy="10" r="1.5" fill="#6c757d"/>
                            <path d="M8 15c1 1 3 1 4 1s3 0 4-1" stroke="#6c757d" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </span>
                        <span className="success-detail-text">Trẻ nhỏ: <strong>{babies}</strong></span>
                      </div>
                    )}

                    <div className="success-detail-item">
                      <span className="success-detail-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <line x1="12" y1="1" x2="12" y2="3" stroke="#6c757d" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="12" y1="21" x2="12" y2="23" stroke="#6c757d" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="#6c757d" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="#6c757d" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="1" y1="12" x2="3" y2="12" stroke="#6c757d" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="21" y1="12" x2="23" y2="12" stroke="#6c757d" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="#6c757d" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="#6c757d" strokeWidth="2" strokeLinecap="round"/>
                          <circle cx="12" cy="12" r="5" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span className="success-detail-text">Tổng khách: <strong>{totalGuests}</strong></span>
                    </div>

                    {singleRooms > 0 && (
                      <div className="success-detail-item">
                        <span className="success-detail-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 13h10l4-8H5.4L4 2H1" stroke="#856404" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="10" cy="20" r="1" stroke="#856404" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="21" cy="20" r="1" stroke="#856404" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        <span className="success-detail-text" style={{color: '#856404'}}>
                          Phụ thu phòng đơn: <strong>{singleRooms} phòng</strong>
                        </span>
                      </div>
                    )}

                    {item.startDate && (
                      <div className="success-detail-item">
                        <span className="success-detail-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="#6c757d" strokeWidth="2"/>
                            <line x1="16" y1="2" x2="16" y2="6" stroke="#6c757d" strokeWidth="2"/>
                            <line x1="8" y1="2" x2="8" y2="6" stroke="#6c757d" strokeWidth="2"/>
                            <line x1="3" y1="10" x2="21" y2="10" stroke="#6c757d" strokeWidth="2"/>
                          </svg>
                        </span>
                        <span className="success-detail-text">
                          Ngày khởi hành: <strong>
                            {formatDateTimeVietnam(item.startDate, item.startTime)}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {item.price && (
                    <div className="success-tour-price-section">
                      <span className="success-price-label">Tổng giá tour:</span>
                      <span className="success-tour-price">
                        {item.price?.toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Email Notification */}
        <div className="success-email-notification">
          <span className="success-email-icon">📧</span>
          <span className="success-email-text">Đơn hàng đã được gửi đến email của bạn</span>
        </div>

        {/* Hotline */}
        <div className="hotline-info">
          <span className="hotline-text">Hotline hỗ trợ: </span>
          <span className="hotline-number">0972 122 555</span>
        </div>

        {/* Back to Home Button */}
        <button className="btn-home" onClick={onBackToHome}>
          Quay lại trang chủ ({countdown}s)
        </button>
      </div>
    </div>
  );
};

const Success = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderInfo, setOrderInfo] = useState(null);
  const [countdown, setCountdown] = useState(13);
  const [recommendedTours, setRecommendedTours] = useState([]);

  useEffect(() => {
    // Lấy thông tin đơn hàng từ state hoặc URL params
    const state = location.state;
    const urlParams = new URLSearchParams(location.search);

    if (state && state.orderInfo) {
      // Sử dụng dữ liệu thực từ orderInfo, không dùng dữ liệu mặc định
      setOrderInfo(state.orderInfo);
    } else if (urlParams.get('orderId')) {
      // Nếu có orderId trong URL, tạo object thông tin cơ bản
      setOrderInfo({
        orderId: urlParams.get('orderId'),
        customer: urlParams.get('customer') || '',
        email: urlParams.get('email') || '',
        phone: urlParams.get('phone') || '',
        tourDetails: {
          tourName: urlParams.get('tourName') || 'Du lịch Đà Lạt 3N2Đ',
          departureDate: urlParams.get('departureDate') || '27/09/2025',
          departureTime: urlParams.get('departureTime') || '06:30',
          adults: parseInt(urlParams.get('adults')) || 2,
          children: parseInt(urlParams.get('children')) || 1,
          totalGuests: (parseInt(urlParams.get('adults')) || 2) + (parseInt(urlParams.get('children')) || 1)
        }
      });
    } else {
      // Nếu không có thông tin đơn hàng, chuyển hướng về trang chủ
      navigate('/', { replace: true });
      return;
    }
  }, [location, navigate]);

  // Fetch recommended tours
  useEffect(() => {
    const fetchRecommendedTours = async () => {
      try {
        const response = await getTours({ limit: 4, page: 1 });
        if (response.data && response.data.success && response.data.data) {
          setRecommendedTours(response.data.data.slice(0, 4));
        }
      } catch (error) {
        console.error('Error fetching recommended tours:', error);
      }
    };

    fetchRecommendedTours();
  }, []);

  // Auto redirect countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      navigate('/', { replace: true });
    }
  }, [countdown, navigate]);

  const handleBackToHome = () => {
    navigate('/', { replace: true });
  };



  if (!orderInfo) {
    return (
      <div className="success-page loading">
        <div className="loading-spinner">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="success-page">
      <div className="success-container">
        <ThankYouBlock
          orderInfo={orderInfo}
          countdown={countdown}
          onBackToHome={handleBackToHome}
        />

        <div className="suggested-tours--success">
          <SuggestedTours tours={recommendedTours} />
        </div>
      </div>
    </div>
  );
};

export default Success;
