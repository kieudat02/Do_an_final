import React, { useState } from "react";
import "./PrivacyPolicy.scss";

const PrivacyPolicy = () => {
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
    <div className="privacy-policy-page">
      <div className="policy-container">
        <div className="policy-layout">
          <div className="main-content">
            <div className="policy-header">
              <h1>Chính sách bảo mật thông tin</h1>
            </div>
            <div className="policy-content">
              <div className="policy-section">
                <p>
                  ND Travel cam kết sẽ bảo mật những thông tin mang tính riêng tư của bạn. Bạn vui lòng đọc bản "Chính sách bảo mật" dưới đây để hiểu hơn những cam kết mà chúng tôi thực hiện, nhằm tôn trọng và bảo vệ quyền lợi của người truy cập:
                </p>
              </div>

              <div className="policy-section">
                <h2>Mục đích sử dụng thông tin cá nhân</h2>
                <p>
                  ND Travel thu thập và sử dụng thông tin cá nhân bạn với mục đích phù hợp và hoàn toàn tuân thủ nội dung của "Chính sách bảo mật" này. Khi cần thiết, chúng tôi có thể sử dụng những thông tin này để liên hệ trực tiếp với bạn dưới các hình thức như: gởi thư ngỏ, đơn đặt hàng, thư cảm ơn, thông tin về kỹ thuật và bảo mật…
                </p>
              </div>

              <div className="policy-section">
                <h2>Phạm vi thu thập thông tin cá nhân</h2>
                <p>
                  Để truy cập và sử dụng một số dịch vụ tại ND Travel, bạn có thể sẽ được yêu cầu đăng ký với chúng tôi thông tin cá nhân (Email, Họ tên, Số ĐT liên lạc…). Mọi thông tin khai báo phải đảm bảo tính chính xác và hợp pháp. ND Travel không chịu mọi trách nhiệm liên quan đến pháp luật của thông tin khai báo. Chúng tôi cũng có thể thu thập thông tin về số lần viếng thăm, bao gồm số trang bạn xem, số links (liên kết) bạn click và những thông tin khác liên quan đến việc kết nối đến site ND Travel. Chúng tôi cũng thu thập các thông tin mà trình duyệt Web (Browser) bạn sử dụng mỗi khi truy cập vào ND Travel, bao gồm: địa chỉ IP, loại Browser, ngôn ngữ sử dụng, thời gian và những địa chỉ mà Browser truy xuất đến.
                </p>
              </div>

              <div className="policy-section">
                <h2>Địa chỉ của đơn vị thu thập và quản lý thông tin cá nhân</h2>
                <p>
                  Thông tin cá nhân của khách hàng được lưu trữ trực tuyến tại hệ thống máy chủ của công ty ND Travel có trụ sở chính tại phòng 502A, tòa nhà M3-M4, 91 Nguyễn Chí Thanh, Hà Nội
                </p>
              </div>

              <div className="policy-section">
                <h2>Chia sẻ thông tin cá nhân</h2>
                <p>
                  Ngoại trừ các trường hợp về Sử dụng thông tin cá nhân như đã nêu trong chính sách này, chúng tôi cam kết sẽ không tiết lộ thông tin cá nhân bạn ra ngoài. Trong một số trường hợp, chúng tôi có thể thuê một đơn vị độc lập để tiến hành các dự án nghiên cứu thị trường và khi đó thông tin của bạn sẽ được cung cấp cho đơn vị này để tiến hành dự án. Bên thứ ba này sẽ bị ràng buộc bởi một thỏa thuận về bảo mật mà theo đó họ chỉ được phép sử dụng những thông tin được cung cấp cho mục đích hoàn thành dự án Chúng tôi có thể tiết lộ hoặc cung cấp thông tin cá nhân của bạn trong các trường hợp thật sự cần thiết như sau: (a) khi có yêu cầu của các cơ quan pháp luật; (b) trong trường hợp mà chúng tôi tin rằng điều đó sẽ giúp chúng tôi bảo vệ quyền lợi chính đáng của mình trước pháp luật; (c) tình huống khẩn cấp và cần thiết để bảo vệ quyền an toàn cá nhân của các thành viên ND Travel khác.
                </p>
              </div>

              <div className="policy-section">
                <h2>Phương tiện và công cụ để người dùng tiếp cận và chỉnh sửa dữ liệu cá nhân của mình.</h2>
                <p>
                  Bất cứ thời điểm nào bạn cũng có thể truy cập và chỉnh sửa những thông tin cá nhân của mình bằng cách đăng nhập vào trang quản lý thông tin cá nhân trên website hoặc theo các liên kết thích hợp mà chúng tôi cung cấp.
                </p>
              </div>

              <div className="policy-section">
                <h2>Cam kết bảo mật thông tin cá nhân</h2>
                <p>
                  ND Travel cam kết bảo mật thông tin cá nhân của bạn bằng mọi cách thức có thể. Chúng tôi sẽ sử dụng nhiều công nghệ bảo mật thông tin khác nhau nhằm bảo vệ thông tin này không bị truy lục, sử dụng hoặc tiết lộ ngoài ý muốn. ND Travel khuyến cáo bạn nên bảo mật các thông tin liên quan đến mật khẩu truy xuất của bạn và không nên chia sẻ với bất kỳ người nào khác. Nếu sử dụng máy tính chung nhiều người, bạn nên đăng xuất, hoặc thoát hết tất cả cửa sổ Website đang mở.
                </p>
              </div>

              <div className="policy-section">
                <h2>Sử dụng "Cookie"</h2>
                <p>
                  ND Travel dùng "Cookie" để giúp cá nhân hóa và nâng cao tối đa hiệu quả sử dụng thời gian trực tuyến của bạn. Một cookie là một file văn bản được đặt trên đĩa cứng của bạn bởi một máy chủ của trang web. Cookie không được dùng để chạy chương trình hay đưa virus vào máy tính của bạn. Cookie được chỉ định vào máy tính của bạn và chỉ có thể được đọc bởi một máy chủ trang web trên miền được đưa ra cookie cho bạn. Một trong những mục đích của Cookie là cung cấp những tiện ích để tiết kiệm thời gian của bạn khi truy cập tại website hoặc viếng thăm website lần nữa mà không cần đăng ký lại thông tin sẵn có. Bạn có thể chấp nhận hoặc từ chối dùng cookie. Hầu hết những Browser tự động chấp nhận cookie, nhưng bạn có thể thay đổi những cài đặt để từ chối tất cả những cookie nếu bạn thích. Tuy nhiên, nếu bạn chọn từ chối cookie, điều đó có thể gây cản trở và ảnh hưởng không tốt đến một số dịch vụ và tính năng phụ thuộc vào cookie tại website ND Travel
                </p>
              </div>

              <div className="policy-section">
                <h2>Quy định về "Spam"</h2>
                <p>
                  ND Travel thực sự quan ngại đến vấn nạn Spam (thư rác), các Email giả mạo danh tín chúng tôi gởi đi. Do đó, ND Travel khẳng định chỉ gởi Email đến bạn khi và chỉ khi bạn có đăng ký hoặc sử dụng dịch vụ từ hệ thống của chúng tôi. ND Travel cam kết không bán, thuê lại hoặc cho thuê email của bạn từ bên thứ ba. Nếu bạn vô tình nhận được Email không theo yêu cầu từ hệ thống chúng tôi do một nguyên nhân ngoài ý muốn, xin vui lòng nhấn vào link từ chối nhận Email này kèm theo, hoặc thông báo trực tiếp đến ban quản trị Website.
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

export default PrivacyPolicy;
