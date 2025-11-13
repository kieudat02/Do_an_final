import React, { useState } from "react";
import "./TermsOfService.scss";

const TermsOfService = () => {
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
    <div className="terms-of-service-page">
      <div className="policy-container">
        <div className="policy-layout">
          <div className="main-content">
            <div className="policy-header">
              <h1>Chính Sách & Quy Định Chung</h1>
            </div>
            <div className="policy-content">
              <div className="policy-section">
                <h2>CHÍNH SÁCH VÀ ĐIỀU KHOẢN CHUNG</h2>
                <p>
                  Trang web này được điều hành bởi ND Travel. Xin vui lòng đọc kỹ các Điều kiện & Điều khoản trước khi sử dụng hoặc đăng ký trên trang web này. Bạn phải hoàn toàn đồng ý với các điều kiện và điều khoản này nếu muốn sử dụng trang web. Nếu bạn không đồng ý với bất kỳ phần nào trong các điều kiện và điều khoản này, bạn sẽ không thể sử dụng trang web này dưới bất kỳ hình thức nào. Lưu ý rằng trang web này được xây dựng nhằm phục vụ truy cập trên phạm vi toàn cầu đối với người sử dụng. Những thông tin và mức giá trên trang web này được áp dụng cho người sử dụng trên phạm vi toàn cầu. Chúng tôi có quyền từ chối truy cập vào trang web này bất cứ lúc nào mà không cần phải thông báo trước.
                </p>
              </div>

              <div className="policy-section">
                <h2>LUẬT ĐIỀU CHỈNH</h2>
                <p>
                  Việc truy cập vào trang web này có điều kiện theo sự đồng ý của bạn rằng toàn bộ những thông tin trên trang web và toàn bộ các vấn đề phát sinh giữa bạn và chúng tôi sẽ được điều chỉnh bởi pháp luật Việt Nam và rằng mọi tranh chấp phát sinh giữa bạn và chúng tôi sẽ căn cứ vào quyền hạn xét xử của các tòa án Việt Nam.
                </p>
              </div>

              <div className="policy-section">
                <h2>NGHĨA VỤ CỦA NGƯỜI SỬ DỤNG TRANG WEB</h2>
                <p>Khi sử dụng trang web này, xin vui lòng đồng ý rằng:</p>
                <ul className="working-hours-list">
                  <li>Bạn chấp nhận trách nhiệm về tài chính đối với toàn bộ các giao dịch được thực hiện theo tên và tài khoản của bạn.</li>
                  <li>Để có năng lực pháp lý, bạn phải từ 18 tuổi trở lên.</li>
                  <li>Bạn bảo đảm rằng mọi thông tin mà bạn cung cấp về chính bạn và về bất cứ ai khác là hoàn toàn chính xác.</li>
                  <li>Không được sử dụng trang web này để thực hiện hành vi đăng ký sai trái, gian lận.</li>
                  <li>Nghiêm cấm mọi hành vi phát tán tài liệu mang tính đe dọa, phỉ báng, khiêu dâm, chính trị hoặc phân biệt chủng tộc hoặc bất kỳ tài liệu bất hợp pháp hoặc khiêu khích nào khác thông qua trang web này.</li>
                  <li>Bạn không được sửa đổi, sao chép, truyền tải, phân phối, bán, phát tán, hoặc cấp phép trang web này và bất kỳ phần nội dung nào của nó dưới bất kỳ hình thức nào trừ trường hợp bạn sao chép thông tin từ trang web này để sử dụng cho cá nhân bạn và mang tính phi thương mại.</li>
                </ul>
              </div>

              <div className="policy-section">
                <h2>CÁC ĐIỀU KIỆN ĐĂNG KÝ</h2>
                <p>
                  Khi thực hiện đăng ký qua trang web của chúng tôi, xin vui lòng thực hiện mối quan hệ theo hợp đồng trực tiếp (ràng buộc pháp lý) với chúng tôi. Các điều kiện đăng ký bao gồm những giới hạn và những loại trừ về trách nhiệm pháp lý, và phí hủy và thay đổi phải thanh toán nếu việc đăng ký bị hủy hoặc thay đổi sau khi đã được xác nhận. Chúng tôi đề xuất rằng bạn nên đọc kỹ các điều kiện đăng ký được áp dụng khi thực hiện đăng ký. Các điều kiện đăng ký bao gồm những giới hạn và những loại trừ về trách nhiệm pháp lý, và phí hủy cũng như thay đổi phải thanh toán nếu việc đăng ký bị hủy hoặc thay đổi sau khi đã được xác nhận.
                </p>
              </div>

              <div className="policy-section">
                <h2>KHỞI HÀNH ĐẢM BẢO</h2>
                <ul className="working-hours-list">
                  <li>ND Travel bảo đảm khởi hành được đăng tải trên trang web NDTravel.vn</li>
                  <li>Những thông tin về tour và các ngày khởi hành trong sổ tay hướng dẫn và các tài liệu được in ấn khác có thể thay đổi tùy lúc và không cấu thành một phần của chương trình bảo đảm.</li>
                  <li>Trang web của công ty là nguồn duy nhất từ đó công ty sẽ bảo đảm khởi hành. Một thời điểm khởi hành được bảo đảm chỉ khi khách hàng đã xác nhận đăng ký theo thời điểm khởi hành đó (việc đăng ký phải bao gồm tối thiểu một khoản tiền đặt cọc được thanh toán để được xem xét "đã xác nhận"). Sự bảo đảm này vẫn sẽ căn cứ vào các trường hợp Bất khả kháng.</li>
                </ul>
              </div>

              <div className="policy-section">
                <h2>CÁC TRƯỜNG HỢP BẤT KHẢ KHÁNG</h2>
                <p>
                  ND Travel không chịu trách nhiệm trước khách hàng về những thay đổi hoặc hủy bỏ vì những lý do khách quan và chủ quan như: Động đất, núi lửa, bão gió, chiến tranh, đình công, biểu tình, khủng bố, rối loạn chính trị..Các giải pháp hoặc đền bù (nếu có) sẽ phụ thuộc vào Nhà cung cấp dịch vụ liên quan.
                </p>
              </div>

              <div className="policy-section">
                <h2>GIẤY THÔNG HÀNH</h2>
                <h3>Hộ chiếu có giá trị:</h3>
                <ul className="working-hours-list">
                  <li>Khách hàng phải có hộ chiếu có giá trị để nhập cảnh, khởi hành và đi lại qua mỗi điểm đến trong lịch trình tour (hộ chiếu phải có giá trị từ 6 tháng trở lên tính đến ngày về).</li>
                </ul>

                <h3>Các loại giấy tờ:</h3>
                <p>
                  Xin lưu ý rằng "Để xúc tiến việc cấp giấy thông thành, toàn bộ các loại giấy tờ liên quan đến tour như các phiếu thanh toán, lịch trình tour, hóa đơn sẽ được gửi qua email hoặc sẽ có trên trang web NDTravel.Com", khi công ty đã nhận được thanh toán đầy đủ.
                </p>

                <h3>Thông tin chi tiết về chuyến đi:</h3>
                <p>
                  Khách hàng có trách nhiệm truy cập trang web ít nhất 72 giờ trước ngày khởi hành để bảo đảm họ có được thông tin chi tiết nhất về chuyến đi bởi vì có thể đã có những thay đổi nhỏ kể từ khi hồ sơ tour được công ty cung cấp lúc đầu.
                </p>
              </div>

              <div className="policy-section">
                <h2>GIÁ TOUR</h2>
                <p>
                  Toàn bộ các mức giá tour được thực hiện bằng Việt Nam Đồng (VND). Các khoản thanh toán bằng ngoại tệ khác sẽ được quy đổi ra Việt Nam Đồng (VND) theo tỷ giá hối đoái hiện hành. Các mức giá bao gồm các hạng mục được liệt kê trong phần "Bao gồm". Những chính sách giảm giá từ 25% – 50% đối với trẻ em và miễn phí đối với trẻ em còn ẵm ngửa. Những thông tin và mức giá trên trang web này không mang tính trực tiếp và đôi lúc được cập nhật. Mọi sự nỗ lực được thực hiện nhằm bảo đảm sự chính xác về thông tin và các mức giá, nhưng đáng tiếc là đôi khi vẫn xảy ra lỗi. Trong trường hợp một mức giá không chính xác do lỗi hệ thống, chúng tôi không chịu sự ràng buộc bởi mức giá đó.
                </p>
              </div>

              <div className="policy-section">
                <h2>THANH TOÁN</h2>
                <p>
                  Toàn bộ các tour hoặc dịch vụ cần phải được thanh toán trước trừ phi có quy định khác. Chúng tôi chấp nhận thanh toán bằng thẻ Visa, ATM nội địa ND Travel sẽ không thu thập thông tin chi tiết thẻ tín dụng của bạn. Những thông tin mà bạn cung cấp sẽ được bảo đảm an toàn tuyệt đối trong hệ thống kỹ thuật theo tiêu chuẩn an ninh công nghệ toàn cầu (SSL) của MasterCard và Ngân hàng ngoại thương Việt Nam (Vietcombank) khi bạn tiến hành thanh toán bằng thẻ tín dụng.
                </p>
              </div>

              <div className="policy-section">
                <h2>CẤP PHIẾU THANH TOÁN</h2>
                <p>
                  Sau khi thanh toán, ND Travel sẽ gửi xác nhận/phiếu thanh toán qua email; phiếu này phải được in ra như là bằng chứng của việc mua bán, và sẽ được xuất trình cho Nhà cung cấp dịch vụ. Tất cả thông tin về du khách cần phải được cung cấp một cách chính xác tại thời điểm đăng ký. Mọi yêu cầu sửa đổi/bổ sung cần phải được gửi qua email đến ND Travel. ND Travel không chịu trách nhiệm về bất cứ vấn đề gì có thể xảy ra nếu bạn không nhận hoặc đọc kỹ xác nhận/phiếu thanh toán của bạn. Trong trường hợp bạn chưa nhận được phiếu thanh toán, bạn cần phải thông báo cho ND Travel ít nhất 72 giờ trước ngày cung cấp dịch vụ ấn định.
                </p>
              </div>

              <div className="policy-section">
                <h2>QUY TRÌNH HỦY DỊCH VỤ VÀ HOÀN TRẢ</h2>
                <p>
                  Việc hủy toàn bộ các dịch vụ bởi người tham gia tour phải được gửi và nhận bằng văn bản: email hoặc fax. ND Travel không chấp nhận việc hủy dịch vụ qua điện thoại. ND Travel không chịu trách nhiệm về mọi yêu cầu hủy vì chưa nhận được và chưa xác nhận lại với bạn. Trong trường hợp này, sẽ áp dụng phí hủy dịch vụ hoặc bỏ tour.
                </p>
              </div>

              <div className="policy-section">
                <h2>KHIẾU NẠI VÀ ĐÒI BỒI THƯỜNG</h2>
                <p>
                  Nếu khách hàng có khiếu nại đến ND Travel, trước hết khách hàng phải thông báo cho trưởng đoàn càng sớm càng tốt để khắc phục vấn đề khiếu nại đó. Nếu không hài lòng, khách hàng có thể liên hệ với đại diện (bán hàng) của VTV trong khi đi tour để ND Travel có cơ hội khắc phục vấn đề đó. Nếu vẫn chưa hài lòng qua các kênh đó trong chuyến đi thì khách hàng cần gửi mọi vấn đề khiếu nại trực tiếp đến c.s@NDTravel.com.vn trong vòng 30 ngày kể từ ngày kết thúc chuyến đi. Công ty sẽ không nhận mọi trách nhiệm đối với những khiếu nại nhận được sau thời hạn này.
                </p>
              </div>

              <div className="policy-section">
                <h2>KHUYẾN MẠI</h2>
                <p>
                  Các tour/gói tour/các sản phẩm được giao dịch bằng mã code khuyến mại sẽ không thể hủy và không được hoàn trả. Hơn thế nữa, mọi khoản giảm giá và điểm thưởng được đăng tải trên trang web này chỉ được áp dụng cho trang web NDTravel.Com và có thể thay đổi qua các trang web khác liên kết với NDTravel.Com.
                </p>
              </div>

              <div className="policy-section">
                <h2>QUAN HỆ THỨ TỰ</h2>
                <p>
                  Khi hoàn thành một đăng ký, bạn đồng ý nhận email mà chúng tôi có thể gửi đến bạn, cung cấp cho bạn những thông tin về điểm đến và những thông tin cụ thể liên quan đến đăng ký và các điểm đến của bạn, và chúng tôi có thể gửi email mời bạn đánh giá của khách hàng.
                </p>
              </div>

              <div className="policy-section">
                <h2>BẢN QUYỀN VÀ THƯƠNG HIỆU</h2>
                <p>
                  Bản quyền trong nội dung của trang web này thuộc về ND Travel. Chúng tôi bảo lưu bản quyền và có toàn bộ quyền sở hữu đối với trang web này và toàn bộ nội dung của nó. Thương hiệu ND Travel và ký hiệu, logo và hình ảnh của ND Travel trên trang web này đã được đăng ký bảo hộ bản quyền của ND Travel hoặc các đơn vị trực thuộc của ND Travel. Các thương hiệu của các công ty và sản phẩm/dịch vụ khác trên trang web này có thể là thương hiệu của các chủ sở hữu của các thương hiệu ấy. Bạn không có quyền và không được cấp phép sử dụng bất kỳ thương hiệu nào trong số ấy.
                </p>
              </div>

              <div className="policy-section">
                <h2>NHỮNG THAY ĐỔI</h2>
                <p>
                  ND Travel.vn có thể thay đổi bất kỳ phương diện nào của trang web này hoặc nội dung của nó, bao gồm những điểm đặc trưng, những thông tin hoặc nội dung khác vào bất cứ lúc nào mà không cần phải đưa ra thông báo trước.
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

export default TermsOfService;
