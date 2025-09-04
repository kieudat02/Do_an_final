import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../../constants/ApiEndPoints';
import './OrderLookupOTP.scss';

const OrderLookupOTP = ({ orderId, email, onSuccess, onBack }) => {
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer cho resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Tự động gửi OTP khi component mount
  useEffect(() => {
    sendOTP();
  }, []);

  const sendOTP = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ORDER_SEND_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          email
        })
      });

      const data = await response.json();

      if (data.success) {
        setCountdown(60); // 60 giây countdown
        setCanResend(false);
        setError('');
      } else {
        setError(data.message || 'Không thể gửi mã OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      setError('Có lỗi xảy ra khi gửi mã OTP');
    }
  };

  const handleOTPChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Chỉ cho phép số
    if (value.length <= 6) {
      setOtpCode(value);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số của mã OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_ENDPOINTS.ORDER_LOOKUP_WITH_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          email,
          otpCode
        })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.order);
      } else {
        setError(data.message || 'Mã OTP không chính xác');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError('Có lỗi xảy ra khi xác minh mã OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (canResend) {
      sendOTP();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="otp-verification-container">
      <div className="otp-verification-card">
        {/* Header */}
        <div className="otp-header">
          <div className="otp-icon">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#ffffff" strokeWidth="2" fill="none"/>
              <polyline points="22,6 12,13 2,6" stroke="#ffffff" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <h1 className="otp-title">Xác minh email</h1>
          <p className="otp-message">
            Chúng tôi đã gửi mã xác minh 6 chữ số đến email:
            <br />
            <strong>{email}</strong>
          </p>
        </div>

        {/* OTP Form */}
        <form className="otp-form" onSubmit={handleSubmit}>
          <div className="otp-input-group">
            <label htmlFor="otpCode" className="otp-label">
              Nhập mã xác minh
            </label>
            <input
              type="text"
              id="otpCode"
              value={otpCode}
              onChange={handleOTPChange}
              placeholder="000000"
              className="otp-input"
              maxLength="6"
              autoComplete="off"
              autoFocus
            />
            <div className="input-hint">
              Vui lòng nhập 6 chữ số nhận được qua email
            </div>
          </div>

          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="otp-buttons">
            <button
              type="submit"
              className="btn-verify"
              disabled={loading || otpCode.length !== 6}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Đang xác minh...
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i>
                  Xác minh
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-back"
              onClick={onBack}
              disabled={loading}
            >
              <i className="fas fa-arrow-left"></i>
              Quay lại
            </button>
          </div>

          {/* Resend OTP */}
          <div className="resend-section">
            {!canResend ? (
              <p className="resend-countdown">
                Gửi lại mã sau: <span className="countdown">{formatTime(countdown)}</span>
              </p>
            ) : (
              <button
                type="button"
                className="btn-resend"
                onClick={handleResendOTP}
              >
                <i className="fas fa-redo"></i>
                Gửi lại mã OTP
              </button>
            )}
          </div>
        </form>

        {/* Info */}
        <div className="otp-info">
          <p>
            <i className="fas fa-info-circle"></i>
            Mã xác minh có hiệu lực trong 15 phút. Nếu bạn không nhận được email, 
            vui lòng kiểm tra thư mục spam hoặc thử gửi lại.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderLookupOTP;
