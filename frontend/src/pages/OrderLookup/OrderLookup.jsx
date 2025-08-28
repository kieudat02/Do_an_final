import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../constants/ApiEndPoints';
import './OrderLookup.scss';

// Component form tra cứu đơn hàng
const OrderLookupForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    orderId: '',
    email: '',
    phone: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="lookup-form-block">
      {/* Search illustration */}
      <div className="search-illustration">
        <div className="search-container">
          <div className="search-icon">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="#3498db" strokeWidth="2"/>
              <path d="21 21l-4.35-4.35" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
              placeholder="Nhập mã đơn hàng"
              className="form-input"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Nhập email đặt tour"
                className="form-input"
              />
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
                placeholder="Nhập số điện thoại"
                className="form-input"
              />
            </div>
          </div>

          <p className="form-note">
            * Vui lòng nhập ít nhất một trong hai: Email hoặc Số điện thoại
          </p>

          <button
            type="submit"
            className="btn-lookup"
            disabled={loading || !formData.orderId || (!formData.email && !formData.phone)}
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
                  <h4 className="tour-name">{item.name}</h4>
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
                </div>

                <div className="tour-price-section">
                  <span className="price-label">Tổng giá tour:</span>
                  <span className="tour-price">
                    {item.price?.toLocaleString('vi-VN')} VNĐ
                  </span>
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
  const [error, setError] = useState('');

  const handleLookup = async (formData) => {
    setLoading(true);
    setError('');

    try {
      const queryParams = new URLSearchParams({
        orderId: formData.orderId,
        ...(formData.email && { email: formData.email }),
        ...(formData.phone && { phone: formData.phone })
      });

      const response = await fetch(`${API_ENDPOINTS.ORDER_LOOKUP}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setOrder(data.order);
      } else {
        setError(data.message || 'Không tìm thấy đơn hàng');
      }
    } catch (error) {
      console.error('Error looking up order:', error);
      setError('Có lỗi xảy ra khi tra cứu đơn hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSearch = () => {
    setOrder(null);
    setError('');
  };

  return (
    <div className="order-lookup-page">
      <div className="lookup-container">
        {order ? (
          <OrderResult order={order} onBackToSearch={handleBackToSearch} />
        ) : (
          <OrderLookupForm onSubmit={handleLookup} loading={loading} />
        )}

        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderLookup;