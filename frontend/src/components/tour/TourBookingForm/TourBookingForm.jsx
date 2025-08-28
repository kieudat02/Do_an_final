import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import vi from 'date-fns/locale/vi';
import 'react-datepicker/dist/react-datepicker.css';
import './TourBookingForm.scss';
import { API_ENDPOINTS } from '../../../constants/ApiEndPoints';

// Đăng ký locale Việt Nam
registerLocale('vi', vi);

const TourBookingForm = ({ tour, isOpen, onClose, onSubmit }) => {
  // Lấy danh sách ngày khởi hành có sẵn (chỉ ngày, không có thông tin stock)
  const getAvailableDates = () => {
    if (!tour?.tourDetails || tour.tourDetails.length === 0) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tour.tourDetails
      .filter(detail => {
        const departureDate = new Date(detail.dayStart);
        return departureDate >= today && detail.stock > 0;
      })
      .map(detail => detail.dayStart)
      .sort((a, b) => new Date(a) - new Date(b));
  };

  // Kiểm tra ngày có trong danh sách khởi hành không
  const isDateAvailable = (date) => {
    if (!date) return false;

    const availableDates = getAvailableDates();
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    return availableDates.some(availableDate => {
      const available = new Date(availableDate);
      available.setHours(0, 0, 0, 0);
      return available.getTime() === selectedDate.getTime();
    });
  };

  // Khởi tạo với ngày có sẵn đầu tiên
  const getDefaultDate = () => {
    const availableDates = getAvailableDates();
    return availableDates.length > 0 ? new Date(availableDates[0]) : null;
  };

  const [formData, setFormData] = useState({
    startDate: null,
    adults: 2,
    children: 0,
    babies: 0,
    customerName: '',
    email: '',
    phone: '',
    notes: '',
    paymentMethod: 'Tiền mặt'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentPricing, setCurrentPricing] = useState(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  // Function để gọi API lấy giá theo ngày
  const fetchPricingByDate = async (date) => {
    if (!tour?._id || !date) return;

    setIsLoadingPrice(true);
    try {
      const dateString = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const response = await fetch(API_ENDPOINTS.TOUR_PRICING_BY_DATE(tour._id, dateString));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setCurrentPricing(result.data);
        // Clear any previous pricing errors
        if (errors.pricing) {
          setErrors(prev => ({
            ...prev,
            pricing: ''
          }));
        }
      } else {
        console.error('Error fetching pricing:', result.message);
        setCurrentPricing(null);
        setErrors(prev => ({
          ...prev,
          pricing: result.message || 'Không thể lấy thông tin giá cho ngày này'
        }));
      }
    } catch (error) {
      console.error('Error fetching pricing by date:', error);
      setCurrentPricing(null);
      setErrors(prev => ({
        ...prev,
        pricing: 'Lỗi kết nối khi lấy thông tin giá. Vui lòng thử lại.'
      }));
    } finally {
      setIsLoadingPrice(false);
    }
  };

  //Đặt lại biểu mẫu khi phương thức mở hoặc tham quan thay đổi
  useEffect(() => {
    if (isOpen && tour) {
      const defaultDate = getDefaultDate();

      setFormData({
        startDate: defaultDate,
        adults: 2,
        children: 0,
        babies: 0,
        customerName: '',
        email: '',
        phone: '',
        notes: '',
        paymentMethod: 'Tiền mặt'
      });
      setErrors({});

      // Fetch pricing for default date
      if (defaultDate) {
        fetchPricingByDate(defaultDate);
      }
    }
  }, [isOpen, tour]);

  // Calculate total price
  const calculateTotal = () => {
    if (!tour) return 0;

    // Nếu có giá từ API theo ngày, sử dụng giá đó
    if (currentPricing?.pricing) {
      const pricing = currentPricing.pricing;
      let total = 0;

      // Tính giá người lớn
      total += formData.adults * (pricing.finalAdultPrice || pricing.adultPrice || 0);

      // Tính giá trẻ em (nếu có)
      if (pricing.finalChildrenPrice > 0) {
        total += formData.children * pricing.finalChildrenPrice;
      }

      // Tính giá trẻ nhỏ (nếu có)
      if (pricing.finalChildPrice > 0) {
        total += formData.babies * pricing.finalChildPrice;
      }

      return total;
    }

    // Fallback: sử dụng giá mặc định từ tour
    const adultPrice = tour.discountPrice || tour.minPrice || tour.price || 0;
    return formData.adults * adultPrice;
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      const numValue = parseInt(value) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: Math.max(0, numValue)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle date change for DatePicker
  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      startDate: date
    }));

    // Clear error when user selects a date
    if (errors.startDate) {
      setErrors(prev => ({
        ...prev,
        startDate: ''
      }));
    }

    // Validate ngày khởi hành real-time
    if (date && !isDateAvailable(date)) {
      setErrors(prev => ({
        ...prev,
        startDate: 'Vui lòng chọn ngày khởi hành có tour'
      }));
    }

    // Fetch pricing for selected date
    if (date && isDateAvailable(date)) {
      fetchPricingByDate(date);
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    const availableDates = getAvailableDates();

    if (!formData.startDate) {
      newErrors.startDate = 'Vui lòng chọn ngày khởi hành';
    } else if (availableDates.length === 0) {
      newErrors.startDate = 'Tour hiện tại không có ngày khởi hành nào khả dụng';
    } else if (!isDateAvailable(formData.startDate)) {
      newErrors.startDate = 'Ngày khởi hành đã chọn không có trong lịch trình tour hoặc đã hết chỗ';
    }

    if (formData.adults < 2) {
      newErrors.participants = 'Phải có ít nhất 2 người lớn tham gia';
    }

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Vui lòng nhập tên khách hàng';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        customer: formData.customerName,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
        paymentMethod: formData.paymentMethod,
        items: [{
          tourId: tour._id,
          name: tour.title,
          adults: formData.adults,
          children: formData.children,
          babies: formData.babies,
          startDate: formData.startDate ? formData.startDate.toISOString().split('T')[0] : '',
          // Gửi thêm thông tin giá để server có thể validate
          expectedPrice: calculateTotal(),
          tourDetailId: currentPricing?.tourDetailId || null,
          pricingInfo: currentPricing?.pricing || null
        }]
      };

      await onSubmit(orderData);
      // onClose() - Let parent component handle closing and navigation
    } catch (error) {
      console.error('Error submitting booking:', error);
      setErrors({ submit: 'Có lỗi xảy ra khi đặt tour. Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !tour) return null;

  return (
    <div className="booking-modal-overlay" onClick={onClose}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="booking-modal__header">
          <h3 className="booking-modal__title">ĐĂNG KÝ TOUR</h3>
          <button className="booking-modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="booking-modal__content">
          <div className="tour-info">
            <h4 className="tour-info__title">{tour.title}</h4>
          </div>

          <form onSubmit={handleSubmit} className="booking-form">
            {/* Date and Participants */}
            <div className="form-row">
              <div className="form-group">
                <label>Ngày khởi hành *</label>
                {(() => {
                  const availableDates = getAvailableDates();

                  if (availableDates.length === 0) {
                    return (
                      <div className="no-dates-available">
                        <p>Tour hiện tại không có ngày khởi hành nào khả dụng</p>
                      </div>
                    );
                  }

                  return (
                    <DatePicker
                      selected={formData.startDate}
                      onChange={handleDateChange}
                      dateFormat="dd/MM/yyyy"
                      locale="vi"
                      minDate={new Date()}
                      placeholderText="Chọn ngày khởi hành"
                      className={`form-control ${errors.startDate ? 'error' : ''}`}
                      showPopperArrow={false}
                    />
                  );
                })()}
                {errors.startDate && <span className="error-text">{errors.startDate}</span>}
              </div>
            <div className="participants-row">
              <div className="form-group">
                <label>Người lớn</label>
                <div className="quantity-control">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, adults: Math.max(2, prev.adults - 1) }))}
                    disabled={formData.adults <= 2}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    name="adults"
                    value={formData.adults}
                    onChange={handleInputChange}
                    min="2"
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, adults: prev.adults + 1 }))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Trẻ em</label>
                <div className="quantity-control">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, children: Math.max(0, prev.children - 1) }))}
                    disabled={formData.children <= 0}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    name="children"
                    value={formData.children}
                    onChange={handleInputChange}
                    min="0"
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, children: prev.children + 1 }))}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            </div>


            {errors.participants && <span className="error-text">{errors.participants}</span>}

            {/* Customer Information */}
            <div className="form-row">
              <div className="form-group">
                <label>Tên liên hệ *</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Nguyễn Văn A"
                  className={errors.customerName ? 'error' : ''}
                />
                {errors.customerName && <span className="error-text">{errors.customerName}</span>}
              </div>

              <div className="form-group">
                <label>Số điện thoại *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="090-123-4567"
                  className={errors.phone ? 'error' : ''}
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@gmail.com"
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label>Phương thức thanh toán *</label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="payment-select"
                >
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Mã QR">Mã QR</option>
                </select>
              </div>
            </div>

            {/* Payment Method */}
            <div className="form-row">
              <div className="form-group">
                <label>Yêu cầu khác</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Nhập yêu cầu đặc biệt của bạn..."
                  rows="3"
                />
              </div>
            </div>

            {/* Total Price */}
            <div className="price-summary">
              {/* Hiển thị giá gốc nếu có giảm giá từ API pricing */}
              {currentPricing?.pricing && currentPricing.pricing.discount > 0 && (
                <div className="price-original">
                  <span>
                    {(() => {
                      const pricing = currentPricing.pricing;
                      let originalTotal = 0;

                      // Tính giá gốc (trước giảm giá)
                      originalTotal += formData.adults * (pricing.adultPrice || 0);

                      if (formData.children > 0 && pricing.childrenPrice > 0) {
                        originalTotal += formData.children * pricing.childrenPrice;
                      }

                      if (formData.babies > 0 && pricing.childPrice > 0) {
                        originalTotal += formData.babies * pricing.childPrice;
                      }

                      return originalTotal.toLocaleString('vi-VN');
                    })()}đ
                  </span>
                </div>
              )}
              {!currentPricing && tour.originalPrice && tour.originalPrice > (tour.discountPrice || tour.price || tour.minPrice || 0) && (
                <div className="price-original">
                  <span>{(tour.originalPrice * formData.adults).toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div className="price-final">
                <span>{calculateTotal().toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {errors.submit && <div className="error-text">{errors.submit}</div>}

            {/* Submit Button */}
            <button
              type="submit"
              className="booking-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Đăng ký tour'}
            </button>

            <div className="payment-note">
              <small>Đặt giữ chỗ trước, thanh toán sau</small>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TourBookingForm;