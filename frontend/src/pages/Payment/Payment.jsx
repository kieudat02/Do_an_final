import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PaymentStatus from '../../components/payment/PaymentStatus';
import './Payment.scss';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId: paramOrderId } = useParams(); // Lấy orderId từ URL params
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra xem có orderId trong URL params hoặc query params không
    const searchParams = new URLSearchParams(location.search);
    const queryOrderId = searchParams.get('orderId');
    const resultCode = searchParams.get('resultCode');
    const message = searchParams.get('message');

    // Ưu tiên orderId từ URL params, sau đó từ query params
    const orderId = paramOrderId || queryOrderId;

    if (orderId) {
      // Nếu có orderId, hiển thị component kiểm tra trạng thái
      setIsLoading(false);
    } else {
      // Nếu không có orderId, redirect về trang chủ
      navigate('/', { replace: true });
    }
  }, [location.search, paramOrderId, navigate]);

  if (isLoading) {
    return (
      <div className="payment-loading">
        <div className="spinner"></div>
        <p>Đang xử lý...</p>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <PaymentStatus />
    </div>
  );
};

export default Payment;
