import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { handleVNPayReturn } from '../../services/OrderService';

/**
 * Component xử lý return từ VNPay
 * Gọi API backend để xử lý và cập nhật trạng thái thanh toán, sau đó chuyển hướng
 */
const VNPayReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processVNPayReturn = async () => {
      try {
        // Lấy tất cả tham số từ VNPay return
        const vnpParams = {};
        for (const [key, value] of searchParams.entries()) {
          vnpParams[key] = value;
        }

        // Lấy orderId từ vnp_TxnRef (format: orderId_timestamp)
        const vnpTxnRef = vnpParams.vnp_TxnRef;
        const orderId = vnpTxnRef ? vnpTxnRef.split('_')[0] : null;

        if (orderId && vnpParams.vnp_ResponseCode && vnpParams.vnp_SecureHash) {
          // Gọi API backend để xử lý VNPay return và cập nhật trạng thái
          const response = await handleVNPayReturn(vnpParams);
          
          if (response.success) {
            // Tạo URL sạch với thông tin cơ bản để hiển thị kết quả
            const cleanParams = new URLSearchParams();
            cleanParams.append('vnp_ResponseCode', vnpParams.vnp_ResponseCode);
            cleanParams.append('vnp_TxnRef', vnpParams.vnp_TxnRef);
            if (vnpParams.vnp_TransactionNo) {
              cleanParams.append('vnp_TransactionNo', vnpParams.vnp_TransactionNo);
            }
            if (vnpParams.vnp_BankCode) {
              cleanParams.append('vnp_BankCode', vnpParams.vnp_BankCode);
            }
            if (vnpParams.vnp_PayDate) {
              cleanParams.append('vnp_PayDate', vnpParams.vnp_PayDate);
            }

            // Chuyển hướng đến trang kết quả thanh toán với URL sạch
            const resultUrl = `/payment/success/${orderId}?${cleanParams.toString()}`;
            navigate(resultUrl, { replace: true });
          } else {
            // Vẫn chuyển hướng để người dùng thấy kết quả, backend sẽ kiểm tra lại
            navigate(`/payment/success/${orderId}?vnp_ResponseCode=${vnpParams.vnp_ResponseCode}`, { replace: true });
          }
        } else {
          navigate('/', { replace: true });
        }
      } catch (error) {
        // Nếu có lỗi, vẫn cố gắng lấy orderId để chuyển hướng
        const vnpTxnRef = searchParams.get('vnp_TxnRef');
        const orderId = vnpTxnRef ? vnpTxnRef.split('_')[0] : null;
        const responseCode = searchParams.get('vnp_ResponseCode');
        
        if (orderId && responseCode) {
          navigate(`/payment/success/${orderId}?vnp_ResponseCode=${responseCode}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } finally {
        setProcessing(false);
      }
    };

    processVNPayReturn();
  }, [searchParams, navigate]);

  // Hiển thị loading trong khi xử lý
  if (processing) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '20px', fontSize: '16px', color: '#666' }}>
          Đang xử lý kết quả thanh toán VNPay...
        </p>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return null;
};

export default VNPayReturn;
