import React, { useState } from 'react';
import './PaymentMethods.scss';

const PaymentMethods = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState('');
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setPhoneError('');
    setPhoneSuccess('');
    setIsSubmittingPhone(true);

    if (!phoneNumber.trim()) {
      setPhoneError('Vui lòng nhập số điện thoại!');
      setIsSubmittingPhone(false);
      return;
    }

    // Validate phone number
    const cleanPhone = phoneNumber.replace(/[\s\-()]/g, '');
    if (!/^(0[3|5|7|8|9])+([0-9]{8})$/.test(cleanPhone)) {
      setPhoneError('Số điện thoại phải có 10 chữ số');
      setIsSubmittingPhone(false);
      return;
    }

    try {
      const contactData = {
        name: 'Khách hàng',
        email: 'no-email@ndtravel.com',
        phone: phoneNumber.trim(),
        content: 'Yêu cầu tư vấn qua số điện thoại'
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/contact/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
        credentials: 'omit'
      });

      const result = await response.json();
      
      if (result.success) {
        setPhoneNumber('');
        setPhoneSuccess('Đã gửi thông tin tư vấn, chúng tôi sẽ liên hệ sớm!');
        setTimeout(() => setPhoneSuccess(''), 3000);
      } else {
        setPhoneError(result.message || 'Có lỗi xảy ra, vui lòng thử lại!');
        setTimeout(() => setPhoneError(''), 5000);
      }
    } catch (err) {
      console.error('Error submitting phone:', err);
      setPhoneError('Gửi thất bại, vui lòng thử lại sau.');
      setTimeout(() => setPhoneError(''), 5000);
    } finally {
      setIsSubmittingPhone(false);
    }
  };

  return (
    <div className="payment-methods-page">
      <div className="policy-container">
        <div className="policy-layout">
          {/* Main Content */}
          <div className="main-content">
            <div className="policy-header">
              <h1>Hướng Dẫn Thanh Toán</h1>
            </div>

            <div className="policy-content">
              <div className="policy-section">
                <p>
                  Quý khách có thể thanh toán bằng một trong các hình thức sau:
                </p>
              </div>

              <div className="policy-section">
                <h2>1. Thanh toán trực tiếp bằng tiền mặt hoặc thẻ tín dụng</h2>
                
                <h3>Trụ sở chính tại Hà Nội:</h3>
                <p>Số 24 Mạc Thái Tông, Phường Yên Hòa, TP Hà Nội</p>

                <h3>Chi nhánh Hồ Chí Minh:</h3>
                <p>Lầu 7, 354-356, đường Nguyễn Thị Minh Khai, Phường Bàn Cờ, Tp.HCM</p>

                <h3>Thời gian làm việc:</h3>
                <ul className="working-hours-list">
                  <li>9h00 – 18h00: Từ thứ 2 đến thứ 6</li>
                  <li>9h00 – 12h00: Thứ 7</li>
                </ul>
              </div>

               <div className="policy-section">
                 <h2>2. Thanh toán online</h2>
                 <p>Thanh toán nhanh chóng và an toàn qua các cổng thanh toán điện tử:</p>

                 <h3>2.1. Ví điện tử MoMo</h3>
                 <ul className="bank-info-list">
                   <li><strong>Phương thức:</strong> Quét QR Code hoặc nhập số điện thoại</li>
                   <li><strong>Ưu điểm:</strong> Thanh toán nhanh, bảo mật cao</li>
                   <li><strong>Hỗ trợ:</strong> Tất cả ngân hàng liên kết với MoMo</li>
                 </ul>

                 <h3>2.2. VNPay</h3>
                 <ul className="bank-info-list">
                   <li><strong>Phương thức:</strong> Internet Banking, thẻ ATM, thẻ tín dụng</li>
                   <li><strong>Ưu điểm:</strong> Hỗ trợ đa dạng ngân hàng, bảo mật tuyệt đối</li>
                   <li><strong>Hỗ trợ:</strong> 40+ ngân hàng tại Việt Nam</li>
                 </ul>

                 <h3>2.3. Chuyển khoản ngân hàng truyền thống</h3>
                 <p><strong>Công ty TNHH Du Lịch ND Travel</strong></p>

                 <div className="bank-section">
                   <h4>Ngân hàng TMCP Công thương Việt Nam (VietinBank)</h4>
                   <ul className="bank-info-list">
                     <li><strong>Tên tài khoản:</strong> CONG TY TNHH DU LICH ND TRAVEL</li>
                     <li><strong>Số tài khoản:</strong> 110623238866</li>
                     <li><strong>Chi nhánh:</strong> CN Tràng An - HN</li>
                   </ul>
                 </div>

                 <div className="bank-section">
                   <h4>Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)</h4>
                   <ul className="bank-info-list">
                     <li><strong>Tên tài khoản:</strong> Công Ty TNHH Du Lịch ND Travel</li>
                     <li><strong>Số tài khoản:</strong> 298015595 (VND) / 302518912 (USD)</li>
                     <li><strong>Chi nhánh:</strong> Chi nhánh Thăng Long - HN</li>
                   </ul>
                 </div>

                 <div className="bank-section">
                   <h4>Ngân hàng TMCP Quân đội (MB)</h4>
                   <ul className="bank-info-list">
                     <li><strong>Tên tài khoản:</strong> Công Ty TNHH Du Lịch ND Travel</li>
                     <li><strong>Số tài khoản:</strong> 0001332636179</li>
                     <li><strong>Chi nhánh:</strong> Chi nhánh Sở giao dịch 1</li>
                   </ul>
                 </div>

                 <div className="payment-note">
                   <h3>Lưu ý quan trọng:</h3>
                   <ul className="note-list">
                     <li>Khi chuyển khoản, vui lòng ghi rõ nội dung: "Thanh toán tour [Mã tour] - [Tên khách hàng]"</li>
                     <li>Sau khi thanh toán online, hệ thống sẽ tự động xác nhận trong vòng 5-10 phút</li>
                     <li>Với chuyển khoản ngân hàng, vui lòng gửi biên lai qua email hoặc hotline để xác nhận</li>
                     <li>Thời gian xử lý: 1-2 giờ làm việc (trong giờ hành chính)</li>
                     <li>Liên hệ hotline 0972 122 555 nếu cần hỗ trợ thanh toán</li>
                   </ul>
                 </div>
               </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            <div className="sidebar-section">
              <h3>Về ND Travel</h3>
              <ul className="sidebar-links">
                <li><a href="/tin-ND">Tin ND</a></li>
                <li><a href="/thanh-tich-noi-bat">Thành Tích Nổi Bật</a></li>
                <li><a href="/con-nguoi-ND-travel">Con người ND Travel</a></li>
                <li><a href="/tuyen-dung">Tuyển dụng</a></li>
                <li><a href="/van-hoa-doanh-nghiep">Văn hóa doanh nghiệp</a></li>
                <li><a href="/bao-chi-noi-ve-ND-travel">Báo chí nói về ND Travel</a></li>
                <li><a href="/cam-ket-chat-luong-dich-vu">Cam kết chất lượng dịch vụ</a></li>
                <li><a href="/gioi-thieu-chung">Giới thiệu chung</a></li>
                <li><a href="/hoat-dong">Hoạt động</a></li>
                <li><a href="/cuoc-thi-su-kien">Cuộc thi - Sự kiện</a></li>
                <li><a href="/ho-so-nang-luc">Hồ sơ năng lực</a></li>
                <li><a href="/ND-travel-tham-du-pata-travel-mart-2025">ND Travel tham dự PATA Travel Mart 2025</a></li>
              </ul>
            </div>

            <div className="sidebar-section consultation-section">
              <div className="consultation-header">
                <h3>Gọi ngay để được tư vấn</h3>
              </div>
              <div className="consultation-content">
                <div className="phone-info">
                  <div className="phone-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </div>
                  <div className="phone-details">
                    <div className="hotline-label">Hotline</div>
                    <div className="phone-number">0972 122 555</div>
                  </div>
                </div>
                <div className="consultation-text">
                  Hoặc gửi yêu cầu tư vấn
                </div>
                
                {/* Success Message */}
                {phoneSuccess && (
                  <div className="consultation-message consultation-message--success">
                    {phoneSuccess}
                  </div>
                )}
                
                {/* Error Message */}
                {phoneError && (
                  <div className="consultation-message consultation-message--error">
                    {phoneError}
                  </div>
                )}
                
                <form className="consultation-form" onSubmit={handlePhoneSubmit}>
                  <input
                    type="tel"
                    className={`phone-input ${phoneError ? 'error' : ''}`}
                    placeholder="Số điện thoại của bạn"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    pattern="^(0|\+84)[0-9]{9}$"
                    required
                  />
                  <button type="submit" className="submit-btn" disabled={isSubmittingPhone}>
                    {isSubmittingPhone ? (
                      <>
                        <span className="loading-spinner"></span>
                      </>
                    ) : (
                      'Gửi'
                    )}
                  </button>
                </form>
                <div className="contact-note">
                  ND Travel sẽ liên hệ với bạn
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethods;
