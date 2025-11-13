import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_ENDPOINTS } from '../../constants/ApiEndPoints';
import OrderLookupOTP from '../../components/OrderLookupOTP/OrderLookupOTP';
import ReCaptchaComponent from '../../components/common/ReCaptcha/ReCaptcha';
import { useRecaptcha } from '../../hooks/useRecaptcha';
import { formatTime24h } from '../../utils/timeFormatter';
import './OrderLookup.scss';

// Component form tra cứu đơn hàng
const OrderLookupForm = ({ onSubmit, loading, recaptchaRef, validationErrors, onFieldChange, initialOrderId = '' }) => {
  const [formData, setFormData] = useState({
    orderId: initialOrderId,
    email: '',
    phone: ''
  });
  const [touched, setTouched] = useState({});

  // Update orderId khi initialOrderId thay đổi
  useEffect(() => {
    if (initialOrderId && initialOrderId !== formData.orderId) {
      setFormData(prev => ({
        ...prev,
        orderId: initialOrderId
      }));
    }
  }, [initialOrderId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const trimmedValue = value.trim();
    
    setFormData(prev => ({
      ...prev,
      [name]: trimmedValue
    }));

    // Clear validation error khi user bắt đầu nhập
    if (onFieldChange && trimmedValue && validationErrors?.[name]) {
      onFieldChange(name, null);
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Mark all fields as touched when submitting
    setTouched({
      orderId: true,
      email: true,
      phone: true
    });

    onSubmit(formData);
  };

  // Chỉ hiển thị lỗi khi field đã được touch hoặc đã submit
  const shouldShowError = (fieldName) => {
    return touched[fieldName] && validationErrors?.[fieldName];
  };

  return (
    <div className="lookup-form-block">
      {/* Search illustration */}
      <div className="search-illustration">
        <div className="search-container">
          <div className="search-icon">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="#3498db" strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {/* Decorative elements */}
          <div className="decoration decoration-1"></div>
          <div className="decoration decoration-2"></div>
          <div className="decoration decoration-3"></div>
        </div>
      </div>

      {/* Form Content */}
      <div className="lookup-content">
        <h1 className="lookup-title">Tra cứu đơn hàng</h1>
        <p className="lookup-message">
          Nhập thông tin đơn hàng để tra cứu trạng thái và chi tiết đặt tour của bạn
        </p>

        <form className="lookup-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="orderId" className="form-label">
              Mã đơn hàng <span className="required">*</span>
            </label>
            <input
              type="text"
              id="orderId"
              name="orderId"
              value={formData.orderId}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Nhập mã đơn hàng"
              className={`form-input ${shouldShowError('orderId') ? 'error' : ''}`}
              required
              autoComplete="off"
            />
            {shouldShowError('orderId') && (
              <div className="field-error">
                <i className="fas fa-exclamation-circle"></i>
                {validationErrors.orderId}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Nhập email đặt tour"
                className={`form-input ${shouldShowError('email') ? 'error' : ''}`}
                autoComplete="email"
              />
              {shouldShowError('email') && (
                <div className="field-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {validationErrors.email}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                Số điện thoại
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Nhập số điện thoại"
                className={`form-input ${shouldShowError('phone') ? 'error' : ''}`}
                autoComplete="tel"
              />
              {shouldShowError('phone') && (
                <div className="field-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {validationErrors.phone}
                </div>
              )}
            </div>
          </div>

          <p className="form-note">
            <span className="otp-note">
              <i className="fas fa-envelope"></i>
              * Email là bắt buộc để nhận mã OTP xác thực và tra cứu đơn hàng
            </span>
            <br />
            <span className="security-note">
              <i className="fas fa-shield-alt"></i>
              Hệ thống chỉ hỗ trợ tra cứu qua Email để đảm bảo bảo mật thông tin khách hàng
            </span>
          </p>

          <button
            type="submit"
            className="btn-lookup"
            disabled={loading || !formData.orderId || !formData.email}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Đang tra cứu...
              </>
            ) : (
              <>
                <i className="fas fa-search"></i>
                Tra cứu đơn hàng
              </>
            )}
          </button>
        </form>

        {/* ReCAPTCHA component - Invisible */}
        <ReCaptchaComponent recaptchaRef={recaptchaRef} />

        {/* Hotline */}
        <div className="hotline-info">
          <span className="hotline-text">Cần hỗ trợ? Liên hệ hotline: </span>
          <span className="hotline-number">0972 122 555</span>
        </div>
      </div>
    </div>
  );
};

// Component hiển thị kết quả tra cứu
const OrderResult = ({ order, onBackToSearch }) => {
  const navigate = useNavigate();

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Chờ xác nhận';
      case 'confirmed':
        return 'Đã xác nhận';
      case 'completed':
        return 'Hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'confirmed':
        return 'status-confirmed';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const getPaymentStatusText = (paymentStatus) => {
    switch (paymentStatus) {
      case 'pending':
        return 'Chờ thanh toán';
      case 'paid':
      case 'completed':
        return 'Đã thanh toán';
      case 'failed':
        return 'Thanh toán thất bại';
      case 'refunded':
      case 'refund':
        return 'Đã hoàn tiền';
      case 'cancelled':
        return 'Đã hủy thanh toán';
      default:
        return paymentStatus || 'Chưa xác định';
    }
  };

  const getPaymentStatusClass = (paymentStatus) => {
    switch (paymentStatus) {
      case 'pending':
        return 'payment-status-pending';
      case 'paid':
      case 'completed':
        return 'payment-status-paid';
      case 'failed':
        return 'payment-status-failed';
      case 'refunded':
      case 'refund':
        return 'payment-status-refunded';
      case 'cancelled':
        return 'payment-status-cancelled';
      default:
        return '';
    }
  };

  const handleTourClick = (tourId, event) => {
    if (tourId) {
      // Kiểm tra nếu nhấn Ctrl (hoặc Cmd trên Mac) + Click
      if (event.ctrlKey || event.metaKey) {
        // Mở trong tab mới
        window.open(`/tour/${tourId}`, '_blank');
      } else {
        // Điều hướng bình thường
        navigate(`/tour/${tourId}`);
      }
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="order-result-block">
      {/* Order info icon */}
      <div className="result-icon">
        <div className="icon-container">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="white"/>
            <polyline points="14,2 14,8 20,8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="13" x2="8" y2="13" stroke="#3498db" strokeWidth="2" strokeLinecap="round"/>
            <line x1="16" y1="17" x2="8" y2="17" stroke="#3498db" strokeWidth="2" strokeLinecap="round"/>
            <polyline points="10,9 9,9 8,9" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <div className="result-content">
        <h1 className="result-title">Thông tin đơn hàng</h1>

        {/* Order Information */}
        <div className="order-info">
          <div className="order-details">
            <div className="order-detail-item">
              <span className="detail-label">Mã đơn hàng:</span>
              <span className="detail-value">{order.orderId}</span>
            </div>
            <div className="order-detail-item">
              <span className="detail-label">Khách hàng:</span>
              <span className="detail-value">{order.customer}</span>
            </div>
            <div className="order-detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{order.email}</span>
            </div>
            <div className="order-detail-item">
              <span className="detail-label">Số điện thoại:</span>
              <span className="detail-value">{order.phone}</span>
            </div>
            <div className="order-detail-item">
              <span className="detail-label">Trạng thái:</span>
              <span className={`detail-value ${getStatusClass(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>
            <div className="order-detail-item">
              <span className="detail-label">Trạng thái thanh toán:</span>
              <span className={`detail-value ${getPaymentStatusClass(order.paymentStatus)}`}>
                {getPaymentStatusText(order.paymentStatus)}
              </span>
            </div>
            <div className="order-detail-item">
              <span className="detail-label">Tổng tiền:</span>
              <span className="detail-value total-amount">
                {order.totalAmount?.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
            <div className="order-detail-item">
              <span className="detail-label">Phương thức thanh toán:</span>
              <span className="detail-value">{order.paymentMethod}</span>
            </div>
            <div className="order-detail-item">
              <span className="detail-label">Thời gian đặt:</span>
              <span className="detail-value">
                {new Date(order.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
            {order.notes && (
              <div className="order-detail-item">
                <span className="detail-label">Ghi chú:</span>
                <span className="detail-value">{order.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tour Information */}
        {order.items && order.items.length > 0 && (
          <div className="tour-info">
            <h3 className="tour-info-title">
              Chi tiết tour đã đặt
            </h3>
            {order.items.map((item, index) => (
              <div key={index} className="tour-item">
                <div className="tour-header">
                  <h4 
                    className={`tour-name ${item.tourId ? 'tour-name-clickable' : ''}`}
                    onClick={(event) => item.tourId && handleTourClick(item.tourId, event)}
                    title={item.tourId ? 'Click để xem chi tiết tour, Ctrl+Click để mở tab mới' : ''}
                  >
                    {item.name}
                    {item.tourId && (
                      <i className="fas fa-external-link-alt tour-link-icon"></i>
                    )}
                  </h4>
                  <span className="tour-quantity">x{item.quantity || 1}</span>
                </div>

                <div className="tour-details-grid">
                  <div className="detail-item">
                    <span className="detail-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="detail-text">Người lớn: <strong>{item.adults}</strong></span>
                  </div>

                  {item.children > 0 && (
                    <div className="detail-item">
                      <span className="detail-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="8" r="3" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 14s-4 2-4 6h8c0-4-4-6-4-6z" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span className="detail-text">Trẻ em: <strong>{item.children}</strong></span>
                    </div>
                  )}

                  <div className="detail-item">
                    <span className="detail-icon">
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
                    <span className="detail-text">Tổng khách: <strong>{item.adults + (item.children || 0)}</strong></span>
                  </div>

                  {item.singleRooms > 0 && (
                    <div className="detail-item">
                      <span className="detail-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7 13h10l4-8H5.4L4 2H1" stroke="#856404" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="10" cy="20" r="1" stroke="#856404" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="21" cy="20" r="1" stroke="#856404" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span className="detail-text" style={{color: '#856404'}}>
                        Phụ thu phòng đơn: <strong>{item.singleRooms} phòng</strong>
                      </span>
                    </div>
                  )}

                  {item.startDate && (
                    <div className="detail-item">
                      <span className="detail-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="#6c757d" strokeWidth="2"/>
                          <line x1="16" y1="2" x2="16" y2="6" stroke="#6c757d" strokeWidth="2"/>
                          <line x1="8" y1="2" x2="8" y2="6" stroke="#6c757d" strokeWidth="2"/>
                          <line x1="3" y1="10" x2="21" y2="10" stroke="#6c757d" strokeWidth="2"/>
                        </svg>
                      </span>
                      <span className="detail-text">
                        Ngày khởi hành: <strong>
                          {new Date(item.startDate).toLocaleDateString('vi-VN')}
                          {item.startTime && ` lúc ${formatTime24h(item.startTime)}`}
                        </strong>
                      </span>
                    </div>
                  )}

                  {order.tourDetailInfo && order.tourDetailInfo.dayReturn && (
                    <div className="detail-item">
                      <span className="detail-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="#6c757d" strokeWidth="2"/>
                          <line x1="16" y1="2" x2="16" y2="6" stroke="#6c757d" strokeWidth="2"/>
                          <line x1="8" y1="2" x2="8" y2="6" stroke="#6c757d" strokeWidth="2"/>
                          <line x1="3" y1="10" x2="21" y2="10" stroke="#6c757d" strokeWidth="2"/>
                        </svg>
                      </span>
                      <span className="detail-text">
                        Ngày về: <strong>
                          {new Date(order.tourDetailInfo.dayReturn).toLocaleDateString('vi-VN')}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="tour-price-section">
                  <span className="price-label">Tổng giá tour:</span>
                  <span className="tour-price">
                    {item.price?.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>

                {/* Contact Information and Policy */}
                <div className="contact-policy-section">
                  <div className="cancellation-policy">
                    <a href="/chinh-sach-hoan-huy-tour" className="policy-link" target="_blank" rel="noopener noreferrer">
                      Xem chính sách hoàn/hủy tour
                    </a>
                  </div>
                  <div className="contact-info">
                    <p className="contact-text">
                      Nếu có thắc mắc, vui lòng liên hệ hotline hoặc email hỗ trợ.
                    </p>
                    <p className="contact-text">
                      Vui lòng kiểm tra thông tin trước ngày khởi hành.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="result-actions">
          <button className="btn-secondary" onClick={onBackToSearch}>
            <i className="fas fa-search"></i>
            Tra cứu đơn hàng khác
          </button>
          <button className="btn-primary" onClick={handleBackToHome}>
            <i className="fas fa-home"></i>
            Về trang chủ
          </button>
        </div>

        {/* Hotline */}
        <div className="hotline-info">
          <span className="hotline-text">Hotline hỗ trợ: </span>
          <span className="hotline-number">0972 122 555</span>
        </div>
      </div>
    </div>
  );
};

// Component chính
const OrderLookup = () => {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [lookupData, setLookupData] = useState(null);
  const [searchParams] = useSearchParams();
  
  // Hook reCAPTCHA
  const { recaptchaRef, executeRecaptcha, resetRecaptcha } = useRecaptcha();

  // Đọc orderId từ URL parameters khi component mount
  const [initialOrderId, setInitialOrderId] = useState('');

  useEffect(() => {
    const orderIdFromUrl = searchParams.get('orderId');
    const autoFill = searchParams.get('autoFill');

    if (orderIdFromUrl && autoFill === 'true') {
      setInitialOrderId(orderIdFromUrl);
    }
  }, [searchParams]);

  // Handle field change to clear individual validation errors
  const handleFieldChange = (fieldName, error) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      if (error === null) {
        delete newErrors[fieldName];
      } else {
        newErrors[fieldName] = error;
      }
      return newErrors;
    });
  };

  // Focus to first error field
  const focusToFirstError = (errors) => {
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      const firstErrorField = errorFields[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.focus();
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  };



  const handleLookup = async (formData) => {
    // Reset errors trước khi bắt đầu
    setValidationErrors({});
    
    // Validate email là bắt buộc
    if (!formData.email || formData.email.trim() === '') {
      setValidationErrors({ 
        email: 'Email là bắt buộc để tra cứu đơn hàng' 
      });
      return;
    }
    
    // Thực thi reCAPTCHA trước khi gửi form
    let recaptchaToken = null;
    try {
      recaptchaToken = await executeRecaptcha();
    } catch (recaptchaError) {
      console.error('reCAPTCHA error:', recaptchaError);
      setValidationErrors({ 
        orderId: recaptchaError.message || 'Xác minh reCAPTCHA thất bại. Vui lòng thử lại.' 
      });
      resetRecaptcha();
      return;
    }

    setLoading(true);

    try {
      const cleanedData = {
        orderId: formData.orderId.trim(),
        email: formData.email.trim(),
        phone: formData.phone ? formData.phone.trim() : '',
        recaptchaToken
      };

      // Email bắt buộc để gửi OTP xác thực
      if (!cleanedData.email) {
        setValidationErrors({
          email: 'Email là bắt buộc để tra cứu đơn hàng. Chúng tôi sẽ gửi mã OTP xác thực đến email của bạn.'
        });
        setTimeout(() => focusToFirstError({ email: true }), 100);
        resetRecaptcha();
        setLoading(false);
        return;
      }

      setLookupData({ ...formData, recaptchaToken });
      setShowOTPVerification(true);
      setLoading(false);

    } catch (error) {
      console.error('Error looking up order:', error);
      setValidationErrors({ 
        orderId: 'Có lỗi xảy ra khi tra cứu đơn hàng. Vui lòng thử lại.' 
      });
      resetRecaptcha(); // Reset reCAPTCHA khi có lỗi
    } finally {
      setLoading(false);
    }
  };

  // Xử lý khi OTP được xác minh thành công
  const handleOTPSuccess = (orderData) => {
    setOrder(orderData);
    setShowOTPVerification(false);
    setLookupData(null);
  };

  // Xử lý quay lại từ OTP verification
  const handleBackFromOTP = () => {
    setShowOTPVerification(false);
    setLookupData(null);
    setValidationErrors({});
  };

  const handleBackToSearch = () => {
    setOrder(null);
    setValidationErrors({});
    setShowOTPVerification(false);
    setLookupData(null);
    resetRecaptcha(); // Reset reCAPTCHA khi quay lại form
  };

  // Hiển thị OTP verification
  if (showOTPVerification && lookupData) {
    return (
      <OrderLookupOTP
        orderId={lookupData.orderId}
        email={lookupData.email}
        recaptchaToken={lookupData.recaptchaToken}
        onSuccess={handleOTPSuccess}
        onBack={handleBackFromOTP}
      />
    );
  }

  return (
    <div className="order-lookup-page">
      <div className="lookup-container">
        {order ? (
          <OrderResult order={order} onBackToSearch={handleBackToSearch} />
        ) : (
          <OrderLookupForm 
            onSubmit={handleLookup} 
            loading={loading} 
            recaptchaRef={recaptchaRef}
            validationErrors={validationErrors}
            onFieldChange={handleFieldChange}
            initialOrderId={initialOrderId}
          />
        )}
      </div>
    </div>
  );
};

export default OrderLookup;