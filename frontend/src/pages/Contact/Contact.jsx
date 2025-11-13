import React, { useState, useEffect } from "react";
import { useBreadcrumb } from "../../contexts/BreadcrumbContext";
import contactService from "../../services/contactService";
import "./Contact.scss";

const Contact = () => {
  const { setBreadcrumbData } = useBreadcrumb();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    content: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Set breadcrumb khi component mount
  useEffect(() => {
    setBreadcrumbData({
      categoryName: null,
      categorySlug: null,
      tourTitle: null,
      customItems: null
    });
  }, [setBreadcrumbData]);

  // Client-side validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = "Tên không được để trống";
    }
    
    if (!formData.email.trim()) {
      errors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email không hợp lệ";
    }
    
    if (!formData.phone.trim()) {
      errors.phone = "Số điện thoại không được để trống";
    } else {
      const cleanPhone = formData.phone.replace(/[\s\-()]/g, '');
      if (!/^(0[3|5|7|8|9])+([0-9]{8})$/.test(cleanPhone)) {
        errors.phone = "Số điện thoại phải có 10 chữ số";
      }
    }
    
    if (!formData.content.trim()) {
      errors.content = "Nội dung câu hỏi không được để trống";
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setValidationErrors({});

    // Client-side validation
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await contactService.submitContactForm(formData);
      
      if (response.success) {
        setSubmitStatus({
          type: 'success',
          message: response.message
        });
        
        // Reset form
        setFormData({
          name: "",
          phone: "",
          email: "",
          content: ""
        });
        
        // Auto hide success message after 5 seconds
        setTimeout(() => {
          setSubmitStatus(null);
        }, 5000);
      } else {
        setSubmitStatus({
          type: 'error',
          message: response.message || 'Có lỗi xảy ra khi gửi câu hỏi'
        });
        
        // Auto hide error message after 5 seconds
        setTimeout(() => {
          setSubmitStatus(null);
        }, 5000);
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setSubmitStatus({
        type: 'error',
        message: error.response?.data?.message || 'Có lỗi xảy ra khi gửi câu hỏi. Vui lòng thử lại sau.'
      });
      
      // Auto hide error message after 5 seconds
      setTimeout(() => {
        setSubmitStatus(null);
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-container">
        {/* Main Heading */}
        <h1 className="contact-title">Liên hệ</h1>

        {/* Contact Information and Maps */}
        <div className="contact-content">
          {/* Left Column - Contact Info */}
          <div className="contact-info">
            {/* Company Information */}
            <div className="company-info">
              <h2>Công ty TNHH Du lịch ND</h2>
              <p className="tax-code">
                Mã số thuế: 0105225586 - Sở kế hoạch và đầu tư Thành phố Hà Nội cấp ngày 29/03/2011
              </p>
              <p className="business-license">
                Giấy phép Kinh doanh dịch vụ Lữ hành Quốc tế số 01-771/2018/CDLQGVN-GPLHQT
              </p>
            </div>

            {/* Contact Details */}
            <div className="contact-details">
              {/* Head Office */}
              <div className="contact-item">
                <div className="contact-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#00506C" strokeWidth="2"/>
                    <circle cx="12" cy="10" r="3" stroke="#00506C" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <h3>Trụ sở chính tại Hà Nội</h3>
                  <p>Địa chỉ: Số 24 Mạc Thái Tông, Phường Yên Hòa, TP Hà Nội</p>
                </div>
              </div>

              {/* Representative Office */}
              <div className="contact-item">
                <div className="contact-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#00506C" strokeWidth="2"/>
                    <circle cx="12" cy="10" r="3" stroke="#00506C" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <h3>Văn phòng đại diện tại TP. Hồ Chí Minh</h3>
                  <p>Địa chỉ: Lầu 7, 354-356, đường Nguyễn Thị Minh Khai, Phường Bàn Cờ, Tp.HCM</p>
                </div>
              </div>

              {/* Email */}
              <div className="contact-item">
                <div className="contact-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#00506C" strokeWidth="2"/>
                    <polyline points="22,6 12,13 2,6" stroke="#00506C" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <p>Email: contact@ndtravel.com</p>
                </div>
              </div>

              {/* Hotline */}
              <div className="contact-item">
                <div className="contact-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="#00506C" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <p>Hotline: 1900 122 555</p>
                </div>
              </div>

              {/* Important Note */}
              <div className="contact-item">
                <div className="contact-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="#00506C" strokeWidth="2"/>
                    <path d="M12 16v-4" stroke="#00506C" strokeWidth="2"/>
                    <path d="M12 8h.01" stroke="#00506C" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="contact-text">
                  <p className="note">
                    Lưu ý: Khi ND Travel gọi cho bạn, thì trên điện thoại của bạn sẽ hiển thị các số máy bàn của ND Travel: (024-028).730x.5060
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Maps */}
          <div className="maps-section">
            {/* Hanoi Map */}
            <div className="map-container">
              <h3>BẢN ĐỒ TRỤ SỞ CHÍNH TẠI HÀ NỘI</h3>
              <div className="map-embed">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.123456789!2d105.8123456!3d21.0123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab1234567890%3A0x1234567890abcdef!2sC%C3%B4ng%20Ty%20Du%20L%E1%BB%8Bch%20ND%20Travel!5e0!3m2!1svi!2s!4v1234567890123!5m2!1svi!2s"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>

            {/* HCMC Map */}
            <div className="map-container">
              <h3>BẢN ĐỒ VĂN PHÒNG ĐẠI DIỆN TẠI TP. HỒ CHÍ MINH</h3>
              <div className="map-embed">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.123456789!2d106.7123456!3d10.8123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f1234567890%3A0x1234567890abcdef!2sND%20Travel%20-%20V%C4%83n%20ph%C3%B2ng%20%C4%91%E1%BA%A1i%20di%E1%BB%87n%20t%E1%BA%A1i%20TP.HCM!5e0!3m2!1svi!2s!4v1234567890123!5m2!1svi!2s"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="contact-form-section">
          <h2>Vui lòng để lại câu hỏi ND Travel sẽ liên hệ lại với bạn</h2>
          
          {/* Status Message */}
          {submitStatus && (
            <div className={`status-message ${submitStatus.type}`}>
              {submitStatus.message}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-row">
              <div className="form-group">
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Tên của bạn"
                  className={validationErrors.name ? 'error' : ''}
                />
                {validationErrors.name && (
                  <div className="validation-error">{validationErrors.name}</div>
                )}
              </div>
              <div className="form-group">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Số điện thoại của bạn"
                  className={validationErrors.phone ? 'error' : ''}
                />
                {validationErrors.phone && (
                  <div className="validation-error">{validationErrors.phone}</div>
                )}
              </div>
              <div className="form-group">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email của bạn"
                  className={validationErrors.email ? 'error' : ''}
                />
                {validationErrors.email && (
                  <div className="validation-error">{validationErrors.email}</div>
                )}
              </div>
            </div>
            <div className="form-group">
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows="6"
                placeholder="Nội dung"
                className={validationErrors.content ? 'error' : ''}
              ></textarea>
              {validationErrors.content && (
                <div className="validation-error">{validationErrors.content}</div>
              )}
            </div>
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loading-spinner"></span>
                  Đang gửi...
                </>
              ) : (
                'Gửi đi'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
