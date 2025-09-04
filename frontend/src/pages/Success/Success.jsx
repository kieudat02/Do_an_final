import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTours } from "../../services/TourService";
import SuggestedTours from "../../components/SuggestedTours/SuggestedTours";
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
            </div>
          </div>
        )}

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
      setOrderInfo(state.orderInfo);
    } else if (urlParams.get('orderId')) {
      // Nếu có orderId trong URL, tạo object thông tin cơ bản
      setOrderInfo({
        orderId: urlParams.get('orderId'),
        customer: urlParams.get('customer') || '',
        email: urlParams.get('email') || '',
        phone: urlParams.get('phone') || ''
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
