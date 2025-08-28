import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.scss';
import Image from '../../../assets/images/bo-cong-thuong.jpg';
import ImgLogo from '../../../assets/images/Logo.svg';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__container">
        {/* Company Info Section */}
        <div className="footer__company">
          <div className="footer__logo">
            <Link to="/">
              <img 
                src={ImgLogo} 
                alt="ND Travel" 
                className="footer__logo-img"
              />
            </Link>
          </div>
          <p className="footer__company-name">Công ty TNHH du lịch PYS</p>
          <ul className="footer__licenses">
            <li>Giấy phép kinh doanh số 0105225586 - Sở kế hoạch và đầu tư Thành phố Hà Nội cấp ngày 29/03/2011</li>
            <li>Giấy phép Kinh doanh Lữ hành Quốc tế số 01771/2015/TCDL-GPLHQT</li>
          </ul>
        </div>

        {/* Links Section */}
        <div className="footer__links">
          {/* Activities Column */}
          <div className="footer__column">
            <h3 className="footer__column-title">Hoạt động</h3>
            <div className="footer__column-links">
              <Link to="/tin-pys-travel" className="footer__link">Về ND Travel</Link>
              <Link to="/khach-hang" className="footer__link">Khách hàng nói về ND Travel</Link>
              <Link to="/about/167-tuyen-dung.html" className="footer__link">Tuyển dụng</Link>
              <Link to="/about/165-cac-hoat-dong.html" className="footer__link">Hoạt động của ND Travel</Link>
              <Link to="/about/161-bao-chi-noi-ve-pys-travel.html" className="footer__link">Báo chí nói về ND Travel</Link>
              <Link to="/blog" className="footer__link">Blog du lịch</Link>
            </div>
          </div>

          {/* Useful Info Column */}
          <div className="footer__column">
            <h3 className="footer__column-title">Thông tin hữu ích</h3>
            <div className="footer__column-links">
              <Link to="/huong-dan-thanh-toan" className="footer__link">Hình thức thanh toán</Link>
              <Link to="/chinh-sach-hoan-huy-tour" className="footer__link">Chính sách hoàn hủy</Link>
              <Link to="/chinh-sach-quy-dinh-chung" className="footer__link">Điều khoản sử dụng</Link>
              <Link to="/chinh-sach-bao-mat-thong-tin" className="footer__link">Chính sách bảo mật</Link>
              <Link to="/ban-quyen-hinh-anh" className="footer__link">Bản quyền hình ảnh</Link>
              <Link to="/lien-he" className="footer__link">Liên hệ</Link>
            </div>
          </div>

          {/* Contact Info Column */}
          <div className="footer__column footer__column--contact">
            <h3 className="footer__column-title">Thông tin liên lạc</h3>
            <div className="footer__contact">
              <div className="footer__office">
                <div className="footer__office-title">
                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="footer__location-icon">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Trụ sở chính tại Hà Nội
                </div>
                <p className="footer__office-address">
                  Số 5, Lô 1C, Trung Yên 11C, Phường Yên Hòa, TP Hà Nội
                </p>
              </div>

              <div className="footer__office">
                <div className="footer__office-title">
                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="footer__location-icon">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Văn phòng đại diện tại<br />TP. Hồ Chí Minh
                </div>
                <p className="footer__office-address">
                  Lầu 7, 354-356, đường Nguyễn Thị Minh Khai, Phường Bàn Cờ, Tp.HCM
                </p>
              </div>

              <div className="footer__contact-item">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.14445 6.29707C3.51108 9.72516 4.89983 13.0783 7.34308 15.8695C9.78633 18.6608 12.9261 20.4812 16.2755 21.2984C16.3265 21.3108 16.199 21.2797 16.4217 21.3082C17.96 21.5049 20.0365 20.2984 20.6273 18.8645C20.7129 18.6569 20.7429 18.552 20.803 18.342L20.803 18.342C20.8572 18.1526 20.8843 18.058 20.9012 17.9699C21.0352 17.2694 20.7861 16.5507 20.2475 16.0833C20.1797 16.0245 20.0999 15.9669 19.9401 15.8517L17.53 14.1128C16.7572 13.5553 15.6881 13.6725 15.0545 14.3842C14.3111 15.2192 13.0042 15.2137 12.2679 14.3725L9.47889 11.1862C8.74259 10.3451 8.91015 9.04892 9.83616 8.42264C10.6254 7.88883 10.8832 6.84458 10.4329 6.00484L9.02839 3.38571C8.93531 3.21213 8.88877 3.12534 8.83946 3.05038C8.44753 2.45462 7.76804 2.11262 7.05606 2.15275C6.96649 2.15779 6.86907 2.17212 6.67427 2.20075L6.67418 2.20077L6.67416 2.20077C6.45812 2.23253 6.35009 2.24841 6.13302 2.30572C4.63357 2.70156 3.16276 4.60004 3.15408 6.15084C3.15283 6.37535 3.13887 6.24489 3.14445 6.29707Z" stroke="#242424" strokeWidth="2" strokeLinecap="round"></path>
                </svg>
                0972 122 555
              </div>

              <div className="footer__contact-item">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.5 8L13.014 12.4035C12.3881 12.7717 11.6119 12.7717 10.986 12.4035L3.5 8" stroke="#242424" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                  <rect x="3" y="4" width="18" height="16" rx="4" stroke="#242424" strokeWidth="2" strokeLinecap="round"></rect>
                </svg>
                contact@pystravel.com
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr className="footer__divider" />

      {/* Bottom Section */}
      <div className="footer__bottom">
        <div className="footer__copyright">
          Copyright © 2011-2024. All Rights Reserved by ND Travel
        </div>

        <div className="footer__social">
          <a href="https://www.facebook.com/pystravel" target="_blank" rel="noopener noreferrer" className="footer__social-link">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 320 512" xmlns="http://www.w3.org/2000/svg">
              <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"></path>
            </svg>
          </a>
          <a href="https://zalo.me/652598983976304792" target="_blank" rel="noopener noreferrer" className="footer__social-link">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z"></path>
            </svg>
          </a>
          <a href="https://www.youtube.com/user/pystravel" target="_blank" rel="noopener noreferrer" className="footer__social-link">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg">
              <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"></path>
            </svg>
          </a>
          <a href="https://www.instagram.com/pystravelvn/" target="_blank" rel="noopener noreferrer" className="footer__social-link">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
              <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"></path>
            </svg>
          </a>
          <a href="https://www.linkedin.com/company/pys-travel/" target="_blank" rel="noopener noreferrer" className="footer__social-link">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
              <path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z"></path>
            </svg>
          </a>
          <a href="https://www.tiktok.com/@pystravel" target="_blank" rel="noopener noreferrer" className="footer__social-link">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
              <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"></path>
            </svg>
          </a>
          <a href="https://www.threads.net/@pystravelvn" target="_blank" rel="noopener noreferrer" className="footer__social-link">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
              <path d="M331.5 235.7c2.2 .9 4.2 1.9 6.3 2.8c29.2 14.1 50.6 35.2 61.8 61.4c15.7 36.5 17.2 95.8-30.3 143.2c-36.2 36.2-80.3 52.5-142.6 53h-.3c-70.2-.5-124.1-24.1-160.4-70.2c-32.3-41-48.9-98.1-49.5-169.6V256v-.2C17 184.3 33.6 127.2 65.9 86.2C102.2 40.1 156.2 16.5 226.4 16h.3c70.3 .5 124.9 24 162.3 69.9c18.4 22.7 32 50 40.6 81.7l-40.4 10.8c-7.1-25.8-17.8-47.8-32.2-65.4c-29.2-35.8-73-54.2-130.5-54.6c-57 .5-100.1 18.8-128.2 54.4C72.1 146.1 58.5 194.3 58 256c.5 61.7 14.1 109.9 40.3 143.3c28 35.6 71.2 53.9 128.2 54.4c51.4-.4 85.4-12.6 113.7-40.9c32.3-32.2 31.7-71.8 21.4-95.9c-6.1-14.2-17.1-26-31.9-34.9c-3.7 26.9-11.8 48.3-24.7 64.8c-17.1 21.8-41.4 33.6-72.7 35.3c-23.6 1.3-46.3-4.4-63.9-16c-20.8-13.8-33-34.8-34.3-59.3c-2.5-48.3 35.7-83 95.2-86.4c21.1-1.2 40.9-.3 59.2 2.8c-2.4-14.8-7.3-26.6-14.6-35.2c-10-11.7-25.6-17.7-46.2-17.8H227c-16.6 0-39 4.6-53.3 26.3l-34.4-23.6c19.2-29.1 50.3-45.1 87.8-45.1h.8c62.6 .4 99.9 39.5 103.7 107.7l-.2 .2zm-156 68.8c1.3 25.1 28.4 36.8 54.6 35.3c25.6-1.4 54.6-11.4 59.5-73.2c-13.2-2.9-27.8-4.4-43.4-4.4c-4.8 0-9.6 .1-14.4 .4c-42.9 2.4-57.2 23.2-56.2 41.8l-.1 .1z"></path>
            </svg>
          </a>
        </div>

        <div className="footer__certificates">
          <a href="http://online.gov.vn/Home/WebDetails/17685" target="_blank" rel="noopener noreferrer">
            <img 
              src={Image} 
              alt="Certificate" 
              className="footer__certificate"
            />
          </a>
          <a href="//www.dmca.com/Protection/Status.aspx?ID=6edd9259-28a7-43c5-8650-a15c6354887e" 
             title="DMCA.com Protection Status" 
             className="footer__dmca"
             target="_blank"
             rel="noopener noreferrer">
            <img 
              src="https://images.dmca.com/Badges/dmca_protected_16_120.png?ID=6edd9259-28a7-43c5-8650-a15c6354887e" 
              alt="DMCA.com Protection Status" 
            />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;