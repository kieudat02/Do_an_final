import React, { useState } from 'react';
import { createVNPayPayment, createMoMoPayment } from '../../services/orderService';
import { toast } from 'react-toastify';
import './PaymentSelection.scss';

/**
 * Component chọn phương thức thanh toán
 * Demo cách tích hợp VNPay và MoMo
 */
const PaymentSelection = ({ orderData, onPaymentSuccess, onCancel }) => {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Danh sách ngân hàng hỗ trợ VNPay (một số ngân hàng phổ biến)
  const vnpayBanks = [
    { code: '', name: 'Cổng thanh toán VNPayQR' },
    { code: 'VNPAYQR', name: 'Thanh toán qua ứng dụng hỗ trợ VNPAYQR' },
    { code: 'VNBANK', name: 'Ngân hàng điện tử VNBank' },
    { code: 'VIETCOMBANK', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam' },
    { code: 'VIETINBANK', name: 'Ngân hàng TMCP Công Thương Việt Nam' },
    { code: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
    { code: 'AGRIBANK', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam' },
    { code: 'TPB', name: 'Ngân hàng TMCP Tiên Phong' },
    { code: 'TECHCOMBANK', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam' },
    { code: 'MBBANK', name: 'Ngân hàng TMCP Quân Đội' },
    { code: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
    { code: 'DONGABANK', name: 'Ngân hàng TMCP Đông Á' },
    { code: 'EXIMBANK', name: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam' },
    { code: 'SACOMBANK', name: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
    { code: 'IVB', name: 'Ngân hàng TNHH Indovina' },
    { code: 'SEABANK', name: 'Ngân hàng TMCP Đông Nam Á' }
  ];

  const handlePaymentMethodChange = (method) => {
    setSelectedMethod(method);
    setSelectedBank(''); // Reset bank selection when changing method
  };

  const handleBankChange = (bankCode) => {
    setSelectedBank(bankCode);
  };

  const handleVNPayPayment = async () => {
    if (!orderData || !orderData.orderId) {
      toast.error('Thiếu thông tin đơn hàng');
      return;
    }

    setIsProcessing(true);
    
    try {
      const paymentData = {
        orderId: orderData.orderId,
        amount: orderData.totalAmount,
        orderInfo: `Thanh toan tour ${orderData.tourName || 'du lich'}`,
        bankCode: selectedBank || ''
      };

      const response = await createVNPayPayment(paymentData);
      
      if (response.success && response.data.paymentUrl) {
        toast.success('Đang mở VNPay trong tab mới...');
        
        // Mở VNPay trong tab mới
        window.open(response.data.paymentUrl, '_blank');
        
        if (onPaymentSuccess) {
          onPaymentSuccess(response.data);
        }
      } else {
        throw new Error(response.message || 'Không thể tạo link thanh toán VNPay');
      }
    } catch (error) {
      console.error('❌ Lỗi thanh toán VNPay:', error);
      toast.error(error.response?.data?.message || error.message || 'Lỗi khi tạo thanh toán VNPay');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoMoPayment = async () => {
    if (!orderData || !orderData.orderId) {
      toast.error('Thiếu thông tin đơn hàng');
      return;
    }

    setIsProcessing(true);
    
    try {
      const paymentData = {
        orderId: orderData.orderId,
        amount: orderData.totalAmount,
        orderInfo: `Thanh toan tour ${orderData.tourName || 'du lich'}`
      };

      const response = await createMoMoPayment(paymentData);
      
      if (response.success && response.data.payUrl) {
        toast.success('Đang mở MoMo trong tab mới...');
        
        // Mở MoMo trong tab mới
        window.open(response.data.payUrl, '_blank');
        
        if (onPaymentSuccess) {
          onPaymentSuccess(response.data);
        }
      } else {
        throw new Error(response.message || 'Không thể tạo link thanh toán MoMo');
      }
    } catch (error) {
      console.error('❌ Lỗi thanh toán MoMo:', error);
      toast.error(error.response?.data?.message || error.message || 'Lỗi khi tạo thanh toán MoMo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = () => {
    if (!selectedMethod) {
      toast.error('Vui lòng chọn phương thức thanh toán');
      return;
    }

    if (selectedMethod === 'vnpay') {
      handleVNPayPayment();
    } else if (selectedMethod === 'momo') {
      handleMoMoPayment();
    }
  };

  return (
    <div className="payment-selection">
      <div className="payment-selection-header">
        <h3>Chọn phương thức thanh toán</h3>
        {orderData && (
          <div className="order-summary">
            <p><strong>Mã đơn hàng:</strong> {orderData.orderId}</p>
            <p><strong>Tổng tiền:</strong> {new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND'
            }).format(orderData.totalAmount)}</p>
          </div>
        )}
      </div>

      <div className="payment-methods">
        {/* VNPay */}
        <div className={`payment-method ${selectedMethod === 'vnpay' ? 'selected' : ''}`}>
          <div className="method-header" onClick={() => handlePaymentMethodChange('vnpay')}>
            <input 
              type="radio" 
              name="paymentMethod" 
              value="vnpay" 
              checked={selectedMethod === 'vnpay'}
              onChange={() => handlePaymentMethodChange('vnpay')}
            />
            <div className="method-info">
              <img src="/images/vnpay-logo.png" alt="VNPay" className="payment-logo" />
              <div>
                <h4>VNPay</h4>
                <p>Thanh toán qua VNPay (ATM, Internet Banking, Ví điện tử)</p>
              </div>
            </div>
          </div>

          {selectedMethod === 'vnpay' && (
            <div className="bank-selection">
              <label>Chọn ngân hàng (tùy chọn):</label>
              <select 
                value={selectedBank} 
                onChange={(e) => handleBankChange(e.target.value)}
                className="bank-select"
              >
                {vnpayBanks.map(bank => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
              <p className="bank-note">
                * Nếu không chọn ngân hàng, bạn sẽ được chuyển đến trang chọn phương thức thanh toán của VNPay
              </p>
            </div>
          )}
        </div>

        {/* MoMo */}
        <div className={`payment-method ${selectedMethod === 'momo' ? 'selected' : ''}`}>
          <div className="method-header" onClick={() => handlePaymentMethodChange('momo')}>
            <input 
              type="radio" 
              name="paymentMethod" 
              value="momo" 
              checked={selectedMethod === 'momo'}
              onChange={() => handlePaymentMethodChange('momo')}
            />
            <div className="method-info">
              <img src="/images/momo-logo.png" alt="MoMo" className="payment-logo" />
              <div>
                <h4>Ví điện tử MoMo</h4>
                <p>Thanh toán qua ví điện tử MoMo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tiền mặt */}
        <div className={`payment-method ${selectedMethod === 'cash' ? 'selected' : ''}`}>
          <div className="method-header" onClick={() => handlePaymentMethodChange('cash')}>
            <input 
              type="radio" 
              name="paymentMethod" 
              value="cash" 
              checked={selectedMethod === 'cash'}
              onChange={() => handlePaymentMethodChange('cash')}
            />
            <div className="method-info">
              <div className="cash-icon">💵</div>
              <div>
                <h4>Tiền mặt</h4>
                <p>Thanh toán bằng tiền mặt khi nhận tour</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="payment-actions">
        <button 
          className="btn-cancel" 
          onClick={onCancel}
          disabled={isProcessing}
        >
          Hủy
        </button>
        <button 
          className="btn-payment" 
          onClick={handlePayment}
          disabled={isProcessing || !selectedMethod}
        >
          {isProcessing ? (
            <>
              <span className="spinner"></span>
              Đang xử lý...
            </>
          ) : (
            'Thanh toán'
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentSelection;
