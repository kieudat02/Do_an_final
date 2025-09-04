import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { checkMoMoPaymentStatus, checkVNPayPaymentStatus, handleVNPayReturn } from '../../services/OrderService';
import { toast } from 'react-toastify';
import './PaymentStatus.scss';

// Component hiển thị trạng thái thanh toán thành công
const PaymentSuccessBlock = ({ paymentData, countdown, onNavigateToOrders, onNavigateToHome }) => {
  return (
    <div className="payment-success-block">
      {/* Success Icon */}
      <div className="payment-illustration">
        <div className="payment-success-icon-container">
          <div className="payment-success-icon">✓</div>
          <div className="payment-success-ring"></div>
        </div>
        {/* Decorative elements */}
        <div className="payment-decoration payment-decoration-1"></div>
        <div className="payment-decoration payment-decoration-2"></div>
        <div className="payment-decoration payment-decoration-3"></div>
      </div>

      {/* Success Message */}
      <div className="payment-success-content">
        <h1 className="payment-success-title">Thanh toán thành công!</h1>
        <p className="payment-success-message">
          Cảm ơn bạn đã đặt tour. Chúng tôi sẽ liên hệ với bạn sớm nhất.
        </p>

        {/* Payment Information */}
        {paymentData && (
          <div className="payment-info">
            <div className="payment-details">
              <div className="payment-detail-item">
                <span className="detail-label">Mã đơn hàng:</span>
                <span className="detail-value">{paymentData.orderId}</span>
              </div>
              <div className="payment-detail-item">
                <span className="detail-label">Khách hàng:</span>
                <span className="detail-value">{paymentData.customer}</span>
              </div>
              <div className="payment-detail-item">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{paymentData.email}</span>
              </div>
              <div className="payment-detail-item">
                <span className="detail-label">Số điện thoại:</span>
                <span className="detail-value">{paymentData.phone}</span>
              </div>
                <div className="payment-detail-item">
                    <span className="detail-label">Trạng thái:</span>
                    <span className="detail-value status-completed">
                    {paymentData.paymentStatus === 'completed' ? 'Đã thanh toán' : 
                        paymentData.status === 'confirmed' ? 'Đã xác nhận' : 'Đang xử lý'}
                    </span>
                </div>
                <div className="payment-detail-item">
                    <span className="detail-label">Phương thức thanh toán:</span>
                    <span className="detail-value">{paymentData.paymentMethod}</span>
                </div>
              <div className="payment-detail-item">
                <span className="detail-label">Tổng tiền:</span>
                <span className="detail-value total-amount">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND'
                  }).format(paymentData.totalAmount)}
                </span>
              </div>
              <div className="payment-detail-item">
                <span className="detail-label">Thời gian đặt:</span>
                <span className="detail-value">
                  {new Date(paymentData.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Hotline */}
        <div className="payment-hotline-info">
          <span className="payment-hotline-text">Hotline hỗ trợ: </span>
          <span className="payment-hotline-number">0972 122 555</span>
        </div>

        {/* Auto redirect countdown */}
        <div className="payment-countdown">
          <p>Tự động chuyển đến trang đơn hàng trong {countdown} giây</p>
        </div>

        {/* Action Buttons */}
        <div className="payment-action-buttons">
          <button className="payment-btn-primary" onClick={onNavigateToOrders}>
            Xem đơn hàng
          </button>
          <button className="payment-btn-secondary" onClick={onNavigateToHome}>
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};

// Component hiển thị trạng thái lỗi thanh toán
const PaymentErrorBlock = ({ errorMessage, momoMessage, onRetry, onNavigateToHome }) => {
  return (
    <div className="payment-error-block">
      <div className="payment-error-illustration">
        <div className="payment-error-icon-container">
          <div className="payment-error-icon">✗</div>
        </div>
      </div>
      
      <div className="payment-error-content">
        <h1 className="payment-error-title">Thanh toán thất bại</h1>
        <p className="payment-error-message">
          {errorMessage || 'Đã có lỗi xảy ra trong quá trình thanh toán.'}
        </p>
        {momoMessage && (
          <p className="payment-error-detail">Lý do: {momoMessage}</p>
        )}
        
        <div className="payment-hotline-info">
          <span className="payment-hotline-text">Hotline hỗ trợ: </span>
          <span className="payment-hotline-number">0972 122 555</span>
        </div>
        
        <div className="payment-action-buttons">
          <button className="payment-btn-primary" onClick={onRetry}>
            Kiểm tra lại
          </button>
          <button className="payment-btn-secondary" onClick={onNavigateToHome}>
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};

// Component hiển thị trạng thái đang xử lý
const PaymentPendingBlock = ({ onRetry, onNavigateToHome }) => {
  return (
    <div className="payment-pending-block">
      <div className="payment-pending-illustration">
        <div className="payment-pending-icon-container">
          <div className="payment-pending-icon">⏳</div>
        </div>
      </div>
      
      <div className="payment-pending-content">
        <h1 className="payment-pending-title">Thanh toán đang xử lý</h1>
        <p className="payment-pending-message">
          Giao dịch của bạn đang được xử lý. Vui lòng đợi trong giây lát.
        </p>
        
        <div className="payment-hotline-info">
          <span className="payment-hotline-text">Hotline hỗ trợ: </span>
          <span className="payment-hotline-number">0972 122 555</span>
        </div>
        
        <div className="payment-action-buttons">
          <button className="payment-btn-primary" onClick={onRetry}>
            Kiểm tra lại
          </button>
          <button className="payment-btn-secondary" onClick={onNavigateToHome}>
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};

// Component hiển thị khi đang kiểm tra
const PaymentCheckingBlock = () => {
  return (
    <div className="payment-checking-block">
      <div className="payment-checking-illustration">
        <div className="payment-spinner"></div>
      </div>
      <div className="payment-checking-content">
        <h2 className="payment-checking-title">Đang kiểm tra trạng thái thanh toán...</h2>
        <p className="payment-checking-message">Vui lòng đợi trong giây lát</p>
      </div>
    </div>
  );
};

const PaymentStatus = () => {
  const { orderId: paramOrderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState('checking');
  const [paymentData, setPaymentData] = useState(null);
  const [countdown, setCountdown] = useState(10);

  // Lấy orderId từ params hoặc search params (MoMo callback)
  const orderId = paramOrderId || searchParams.get('orderId');
  const momoResultCode = searchParams.get('resultCode');
  const momoMessage = searchParams.get('message');
  
  // VNPay parameters
  const vnpayResponseCode = searchParams.get('vnp_ResponseCode');
  const vnpayTxnRef = searchParams.get('vnp_TxnRef');
  const vnpayTransactionNo = searchParams.get('vnp_TransactionNo');
  const vnpayMessage = searchParams.get('vnp_OrderInfo');
  
  // Xác định loại thanh toán từ URL hoặc params
  const paymentType = vnpayResponseCode ? 'vnpay' : (momoResultCode ? 'momo' : 'unknown');

  // Validate orderId sớm để tránh render không cần thiết
  const isValidOrderId = orderId && typeof orderId === 'string' && orderId.trim().length > 0;

  useEffect(() => {
    // Validate orderId - phải là một chuỗi hợp lệ
    if (isValidOrderId) {
      checkPaymentStatus();
      
      // Làm sạch URL ngay lập tức để tránh bị thu thập thông tin nhạy cảm
      // Chỉ giữ lại orderId trong URL, loại bỏ tất cả params
      if (searchParams.size > 0) {
        const cleanUrl = `/payment/success/${orderId}`;
        // Sử dụng setTimeout để đảm bảo xử lý params xong rồi mới clean URL
        setTimeout(() => {
          window.history.replaceState({}, document.title, cleanUrl);
        }, 100);
      }
    } else {
      // Nếu không có orderId hợp lệ, chuyển về trang chủ và thay thế history
      toast.error('Không tìm thấy thông tin đơn hàng');
      navigate('/', { replace: true });
    }
  }, [isValidOrderId, orderId, searchParams.size, navigate]);

  // SEO: Ngăn search engine index trang thanh toán và bảo mật thông tin
  useEffect(() => {
    // Cập nhật title trang cho SEO
    const originalTitle = document.title;
    document.title = 'Kết quả thanh toán - Du lịch F8';

    // Thêm meta robots noindex, nofollow
    const metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    metaRobots.content = 'noindex, nofollow, noarchive, nosnippet, noimageindex';
    document.head.appendChild(metaRobots);

    // Thêm meta viewport sensitive content
    const metaSensitive = document.createElement('meta');
    metaSensitive.name = 'sensitive';
    metaSensitive.content = 'true';
    document.head.appendChild(metaSensitive);

    // Thêm meta để ngăn cache
    const metaCache = document.createElement('meta');
    metaCache.httpEquiv = 'Cache-Control';
    metaCache.content = 'no-cache, no-store, must-revalidate';
    document.head.appendChild(metaCache);

    // Thêm meta description cho SEO
    const metaDescription = document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'Trang kết quả thanh toán tour du lịch. Thông tin này chỉ dành cho khách hàng đã thực hiện giao dịch.';
    document.head.appendChild(metaDescription);

    // Cleanup khi component unmount
    return () => {
      document.title = originalTitle;
      try {
        document.head.removeChild(metaRobots);
        document.head.removeChild(metaSensitive);
        document.head.removeChild(metaCache);
        document.head.removeChild(metaDescription);
      } catch (error) {
        // Ignore errors nếu element đã bị xóa
      }
    };
  }, []);

  useEffect(() => {
    if (paymentStatus === 'completed' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 10000);

      return () => clearInterval(timer);
    } else if (countdown === 0) {
      // Chuyển đến trang đơn hàng với replace để tránh back về PaymentStatus
      navigate('/tra-cuu-don-hang', { replace: true });
    }
  }, [paymentStatus, countdown, navigate]);

  const checkPaymentStatus = async () => {
    try {
      setPaymentStatus('checking');
      
      // Xử lý VNPay return callback
      if (vnpayResponseCode) {
        const vnpayOrderId = vnpayTxnRef ? vnpayTxnRef.split('_')[0] : orderId;
        
        // Gọi API backend để xử lý VNPay return và cập nhật trạng thái
        try {
          const vnpayParams = {};
          searchParams.forEach((value, key) => {
            if (key.startsWith('vnp_')) {
              vnpayParams[key] = value;
            }
          });
          
          const vnpayResponse = await handleVNPayReturn(vnpayParams);
          
          if (vnpayResponse.success) {
            if (vnpayResponseCode === '00') {
              setPaymentStatus('completed');
              toast.success('Thanh toán VNPay thành công!');
            } else {
              setPaymentStatus('failed');
              toast.error(`Thanh toán VNPay thất bại. Mã lỗi: ${vnpayResponseCode}`);
            }
          } else {
            setPaymentStatus('failed');
            toast.error('Có lỗi xảy ra khi xử lý thanh toán VNPay');
          }
        } catch (error) {
          // Vẫn hiển thị kết quả dựa trên response code
          if (vnpayResponseCode === '00') {
            setPaymentStatus('completed');
            toast.success('Thanh toán VNPay thành công!');
          } else {
            setPaymentStatus('failed');
            toast.error(`Thanh toán VNPay thất bại. Mã lỗi: ${vnpayResponseCode}`);
          }
        }
        
        // Kiểm tra trạng thái VNPay từ backend để lấy thông tin chi tiết
        try {
          const response = await checkVNPayPaymentStatus(vnpayOrderId);
          if (response.success) {
            setPaymentData(response.data);
          }
        } catch (error) {
          console.error('Lỗi khi lấy thông tin đơn hàng VNPay:', error);
        }
        return;
      }
      
      // Kiểm tra callback từ MoMo trước
      if (momoResultCode) {
        if (momoResultCode === '0') {
          setPaymentStatus('completed');
          toast.success('Thanh toán MoMo thành công!');
        } else {
          setPaymentStatus('failed');
          toast.error(`Thanh toán MoMo thất bại: ${momoMessage}`);
          return;
        }
      }

      // Kiểm tra trạng thái từ backend 
      // Ưu tiên VNPay nếu có vnpayTxnRef, ngược lại dùng MoMo
      let response;
      if (paymentType === 'vnpay' || (paymentData && paymentData.vnpayTxnRef)) {
        response = await checkVNPayPaymentStatus(orderId);
      } else {
        response = await checkMoMoPaymentStatus(orderId);
      }
      
      if (response.success) {
        setPaymentData(response.data);
        
        if (response.data.paymentStatus === 'completed' || 
            response.data.momoStatus === 'completed') {
          setPaymentStatus('completed');
          if (!momoResultCode && !vnpayResponseCode) {
            toast.success('Thanh toán thành công!');
          }
        } else if (response.data.paymentStatus === 'failed') {
          setPaymentStatus('failed');
          if (!momoResultCode && !vnpayResponseCode) {
            toast.error('Thanh toán thất bại!');
          }
        } else {
          setPaymentStatus('pending');
          // Có thể thêm logic kiểm tra lại sau 5 giây
          setTimeout(() => {
            checkPaymentStatus();
          }, 5000);
        }
      } else {
        setPaymentStatus('error');
        toast.error(response.message || 'Không thể kiểm tra trạng thái thanh toán');
      }
    } catch (error) {
      setPaymentStatus('error');
      toast.error('Lỗi khi kiểm tra trạng thái thanh toán');
    }
  };

  const handleNavigateToOrders = () => {
    navigate('/tra-cuu-don-hang', { replace: true });
  };

  const handleNavigateToHome = () => {
    navigate('/', { replace: true });
  };

  const renderStatus = () => {
    switch (paymentStatus) {
      case 'checking':
        return <PaymentCheckingBlock />;

      case 'completed':
        return (
          <PaymentSuccessBlock
            paymentData={paymentData}
            countdown={countdown}
            onNavigateToOrders={handleNavigateToOrders}
            onNavigateToHome={handleNavigateToHome}
          />
        );

      case 'failed':
        return (
          <PaymentErrorBlock
            errorMessage="Thanh toán thất bại"
            momoMessage={momoMessage}
            onRetry={checkPaymentStatus}
            onNavigateToHome={handleNavigateToHome}
          />
        );

      case 'pending':
        return (
          <PaymentPendingBlock
            onRetry={checkPaymentStatus}
            onNavigateToHome={handleNavigateToHome}
          />
        );

      case 'error':
      default:
        return (
          <PaymentErrorBlock
            errorMessage="Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại."
            onRetry={checkPaymentStatus}
            onNavigateToHome={handleNavigateToHome}
          />
        );
    }
  };

  if (!isValidOrderId) {
    return (
      <div className="payment-status-page loading">
        <div className="payment-status-container">
          <PaymentCheckingBlock />
        </div>
      </div>
    );
  }

  return (
    <div className="payment-status-page">
      <div className="payment-status-container">
        {renderStatus()}
      </div>
    </div>
  );
};

export default PaymentStatus;
