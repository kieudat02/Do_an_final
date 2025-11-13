import React, { useState } from 'react';
import './CancellationPolicy.scss';

const CancellationPolicy = () => {
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
    <div className="cancellation-policy-page">
      <div className="policy-container">
        <div className="policy-layout">
          {/* Main Content */}
          <div className="main-content">
            <div className="policy-header">
              <h1>Chính Sách Hoàn Hủy Tour</h1>
            </div>

            <div className="policy-content">
              <div className="policy-section">
                <h2>1. Trường hợp bị hủy bỏ do ND Travel:</h2>
                <p>
                  Nếu ND Travel không thực hiện được chuyến du lịch, ND Travel phải báo ngay cho khách hàng biết và thanh toán lại cho khách hàng toàn bộ số tiền khách hàng đã đóng trong vòng 3 ngày kể từ lúc việc thông báo hủy chuyến du lịch bằng tiền mặt hoặc chuyển khoản.
                </p>
              </div>

              <div className="policy-section">
                <h2>2. Trường hợp bị hủy bỏ do khách hàng:</h2>
                <ul className="penalty-list">
                  <li>Trường hợp hủy chuyển du lịch ngay sau khi đăng ký đến 10 ngày trước ngày khởi hành, Quý khách sẽ chịu phạt <strong>30%</strong> trên giá vé du lịch.</li>
                  <li>Trường hợp hủy chuyển du lịch trong vòng từ 5 – 10 ngày trước ngày khởi hành, Quý khách sẽ chịu phạt <strong>50%</strong> trên giá vé du lịch.</li>
                  <li>Trường hợp hủy chuyển du lịch trong vòng từ 3 – 5 ngày trước ngày khởi hành, Quý khách sẽ chịu phạt <strong>75%</strong> trên giá vé du lịch.</li>
                  <li>Quý khách hủy chuyển du lịch trong vòng từ 0 – 3 ngày trước ngày khởi hành, Quý khách sẽ chịu phạt <strong>100%</strong> trên giá vé du lịch.</li>
                </ul>

                <h3>Lưu ý:</h3>
                <ul className="note-list">
                  <li>Trường hợp hủy tour do sự cố khách quan như thiên tai, dịch bệnh, hoãn và hủy chuyển của các phương tiện vận chuyển công cộng... ND Travel sẽ không chịu trách nhiệm bồi thường thêm bất kỳ chi phí nào ngoài việc hoàn trả tiền tour.</li>
                  <li>Trên đây là mức phạt hủy tối đa, chi phí này có thể được giảm tùy theo điều kiện của từng nhà cung cấp dịch vụ cho ND Travel.</li>
                  <li>Thời gian hủy chuyển du lịch được tính cho ngày làm việc, không tính thứ 7, Chủ Nhật và các ngày Lễ, Tết.</li>
                </ul>
              </div>

              <div className="policy-section">
                <h2>DÀNH CHO KHÁCH HÀNG ĐĂNG KÝ TRÊN TRANG NDTRAVEL.VN THANH TOÁN TRỰC TUYẾN</h2>
                <p>
                  Khách hàng hủy Vé du lịch theo đúng những quy định trên, trong trường hợp khách thanh toán trực tuyến, nếu hủy Vé du lịch khách hàng sẽ chịu toàn bộ phí ngân hàng cho việc thanh toán tiền Vé du lịch. Việc hoàn tiền cho khách sẽ được ND Travel thực hiện ngay sau khi ngân hàng thông báo tiền đã vào tài khoản của ND Travel.
                </p>
              </div>

              <div className="policy-section">
                <h2>TRƯỜNG HỢP BẤT KHẢ KHÁNG</h2>
                <p>
                  Nếu chương trình du lịch bị hủy bỏ hoặc thay đổi bởi một trong hai bên vì một lý do bất khả kháng (hỏa hoạn, thời tiết, tai nạn, thiên tai, chiến tranh, hoãn và hủy chuyến của các phương tiện vận chuyển công cộng…), thì hai bên sẽ không chịu bất kỳ nghĩa vụ bồi hoàn các tổn thất đã xảy ra và không chịu bất kỳ trách nhiệm pháp lý nào. Tuy nhiên mỗi bên có trách nhiệm cố gắng tối đa để giúp đỡ bên bị thiệt hại nhằm giảm thiểu các tổn thất gây ra vì lý do bất khả kháng.
                </p>
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
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="phone-details">
                    <span className="hotline-label">Hotline</span>
                    <span className="phone-number">1900 122 555</span>
                  </div>
                </div>
                
                <p className="consultation-text">Hoặc gửi yêu cầu tư vấn</p>
                
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
                
                <form onSubmit={handlePhoneSubmit} className="consultation-form">
                  <input
                    type="tel"
                    placeholder="SĐT của tôi"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    className={`phone-input ${phoneError ? 'error' : ''}`}
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
                
                <p className="contact-note">ND Travel sẽ liên hệ với bạn</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicy;
