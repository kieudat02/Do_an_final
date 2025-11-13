import React, { useState } from "react";
import "./ImageCopyright.scss";

const ImageCopyright = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneSuccess, setPhoneSuccess] = useState("");
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
    <div className="image-copyright-page">
      <div className="policy-container">
        <div className="policy-layout">
          <div className="main-content">
            <div className="policy-header">
              <h1>Bản quyền hình ảnh</h1>
            </div>
            <div className="policy-content">
              <div className="policy-section">
                <h2>Tôn trọng bản quyền hình ảnh</h2>
                <p>
                  Quan điểm của ND Travel là luôn tôn trọng quyền sở hữu trí tuệ về tác phẩm nhiếp ảnh, ảnh chụp của các cá nhân và tổ chức.
                </p>
              </div>

              <div className="policy-section">
                <h2>Về việc sử dụng hình ảnh trên website</h2>
                <p>
                  ND Travel có sử dụng ảnh của các tác giả nhằm minh họa cho các bài viết chia sẻ kinh nghiệm du lịch, giới thiệu các điểm đến, phong cảnh thiên nhiên đất nước, con người Việt Nam nhằm giúp bài viết sống động hơn và hấp dẫn hơn đối với cộng đồng các bạn trẻ yêu du lịch.
                </p>
                <p>
                  Tất cả ảnh sử dụng trong bài viết giới thiệu địa điểm du lịch (blog du lịch) đều ghi rõ nguồn ảnh và tác giả ảnh ngay bên dưới các bức ảnh minh họa.
                </p>
                <p>
                  Chúng tôi luôn cố gắng nỗ lực liên hệ với tất cả các tác giả có ảnh được sử dụng để xin sự cho phép sử dụng ảnh. Nếu có sự sơ xuất hay thiếu sót nào, chúng tôi xin được gửi lời xin lỗi tới các tác giả, chủ sở hữu hình ảnh, và chịu trách nhiệm cho sai sót đó của mình.
                </p>
                <p>
                  Các anh/chị cũng vui lòng gửi lại phản hồi cho ND Travel tới email minhhien@ndtravel.com nếu:
                </p>
                <ul className="working-hours-list">
                  <li>Không đồng ý cho ND Travel sử dụng hình ảnh và yêu cầu gỡ bỏ khỏi website.</li>
                  <li>Yêu cầu đặt link kèm với tên tác giả.</li>
                  <li>Các yêu cầu khác.</li>
                </ul>
              </div>

              <div className="policy-section">
                <h2>Hợp tác sử dụng hình ảnh</h2>
                <p>
                  Chúng tôi đã, đang và luôn mong muốn mở rộng hợp tác với các bạn nhiếp ảnh gia (photographer), thợ chụp ảnh, chuyên gia sáng tạo nội dung, blogger du lịch, các tổ chức, cá nhân sử hữu bản quyền hình ảnh để hợp tác trong tương lai. Chúng tôi rất vui nếu nhận được đề nghị hợp tác từ phía các anh/chị tới địa chỉ minhhien@ndtravel.com
                </p>
                <p>
                  ND Travel trân trọng cám ơn.
                </p>
              </div>
            </div>
          </div>

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

export default ImageCopyright;
