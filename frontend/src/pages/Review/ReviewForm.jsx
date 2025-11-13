import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  checkReviewLink,
  submitReview,
  parseReviewParams,
  validateReviewForm,
  formatErrorMessage,
  isValidReviewLinkFormat
} from '../../services/reviewService';
import './ReviewForm.scss';

const ReviewForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // State management
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [linkValid, setLinkValid] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const [formData, setFormData] = useState({
    rating: 0,
    comment: ''
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Parse URL parameters
  const { bookingId, token } = parseReviewParams(location.search);

  // Helper function to scroll to top
  const scrollToTop = () => {
    // Scroll window to top
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      window.scrollTo(0, 0);
    }

    // Scroll container to top if ref exists
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Additional fallback methods
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Scroll to top when submitted state changes to true
  useEffect(() => {
    if (submitted) {
      scrollToTop();
    }
  }, [submitted]);

  // Validate and check review link on component mount
  useEffect(() => {
    const validateReviewLink = async () => {
      try {
        setLoading(true);

        // Check if URL parameters exist
        if (!bookingId || !token) {
          toast.error('Link đánh giá không hợp lệ - thiếu thông tin cần thiết');
          navigate('/');
          return;
        }

        // Check format
        if (!isValidReviewLinkFormat(bookingId, token)) {
          toast.error('Link đánh giá không đúng định dạng');
          navigate('/');
          return;
        }

        // Check with server
        const result = await checkReviewLink(bookingId, token);

        if (result.success) {
          setLinkValid(true);
          setOrderInfo(result.data.orderInfo);
        } else {
          const errorMessage = formatErrorMessage(result.errorCode, result.error);
          toast.error(errorMessage);

          // If already reviewed, show success message instead of redirecting
          if (result.errorCode === 'ALREADY_REVIEWED') {
            setLinkValid(true);
            setSubmitted(true);
          } else {
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Error validating review link:', error);
        toast.error('Có lỗi xảy ra khi kiểm tra link đánh giá');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    validateReviewLink();
  }, [bookingId, token, navigate]);

  // Handle rating change
  const handleRatingChange = (rating) => {
    setFormData(prev => ({ ...prev, rating }));
    if (errors.rating) {
      setErrors(prev => ({ ...prev, rating: '' }));
    }
  };

  // Handle comment change
  const handleCommentChange = (e) => {
    const comment = e.target.value;
    setFormData(prev => ({ ...prev, comment }));
    if (errors.comment) {
      setErrors(prev => ({ ...prev, comment: '' }));
    }
  };

  // Quick review suggestions
  const quickSuggestions = [
    'Hướng dẫn viên nhiệt tình, chu đáo!',
    'Lịch trình hợp lý, đúng như mô tả!',
    'Khách sạn sạch sẽ, tiện nghi!',
    'Món ăn ngon, đa dạng!',
    'Phương tiện di chuyển thoải mái!',
    'Điểm tham quan đẹp, ấn tượng!',
    'Giá cả hợp lý, đáng tiền',
    'Dịch vụ chuyên nghiệp!'
  ];

  // Handle quick suggestion click
  const handleQuickSuggestion = (suggestion) => {
    const currentComment = formData.comment.trim();
    const newComment = currentComment
      ? `${currentComment}. ${suggestion}`
      : suggestion;

    if (newComment.length <= 1000) {
      setFormData(prev => ({ ...prev, comment: newComment }));
      if (errors.comment) {
        setErrors(prev => ({ ...prev, comment: '' }));
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const validation = validateReviewForm(formData.rating, formData.comment);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const result = await submitReview(
        bookingId,
        token,
        formData.rating,
        formData.comment.trim()
      );

      if (result.success) {
        // Scroll to top immediately before state update
        scrollToTop();

        // Small delay to ensure smooth scroll, then show success
        setTimeout(() => {
          setSubmitted(true);
          toast.success('Cảm ơn bạn đã gửi đánh giá! Đánh giá của bạn sẽ được xem xét và phê duyệt.');
        }, 400);
      } else {
        const errorMessage = formatErrorMessage(result.errorCode, result.error);
        toast.error(errorMessage);

        // If already reviewed, mark as submitted to show thank you message
        if (result.errorCode === 'ALREADY_REVIEWED') {
          scrollToTop();
          setTimeout(() => {
            setSubmitted(true);
          }, 400);
        }

        // Show validation errors if any
        if (result.validationErrors) {
          setErrors(result.validationErrors);
        }
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi gửi đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  // Render star rating component
  const StarRating = ({ rating, onRatingChange, disabled = false }) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star ${star <= rating ? 'filled' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onRatingChange(star)}
            disabled={disabled}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="review-form-container" ref={containerRef}>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang kiểm tra link đánh giá...</p>
        </div>
      </div>
    );
  }

  // Invalid link state
  if (!linkValid) {
    return (
      <div className="review-form-container" ref={containerRef}>
        <div className="error-state">
          <h2>Link không hợp lệ</h2>
          <p>Link đánh giá không hợp lệ hoặc đã hết hạn.</p>
        </div>
      </div>
    );
  }

  // Success state after submission
  if (submitted) {
    return (
      <div className="review-form-container" ref={containerRef}>
        <div className="success-state">
          <div className="success-icon">✓</div>
          <h2>Cảm ơn bạn đã đánh giá!</h2>
          <p>Đánh giá của bạn đã được gửi thành công và đang chờ phê duyệt.</p>
          <p>Chúng tôi rất trân trọng ý kiến đóng góp của bạn.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/')}
            style={{
              border: "1px solid #1e78bd",
              padding: "15px",
              borderRadius: "10px",
              background: "#1e78bd",
              color: "#ffffff",
              fontWeight: 600,
            }}
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Main review form
  return (
    <div className="review-form-container" ref={containerRef}>
      <div className="review-form-card">
        <div className="form-header">
          <h1>Đánh giá chuyến đi</h1>
          <p>Chia sẻ trải nghiệm của bạn để giúp những du khách khác</p>
        </div>

        {orderInfo && (
          <div className="order-info">
            <h3>Thông tin chuyến đi</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Mã đơn hàng:</span>
                <span className="value">{orderInfo.orderId}</span>
              </div>
              <div className="info-item">
                <span className="label">Tour:</span>
                <span className="value">{orderInfo.tourName}</span>
              </div>
              <div className="info-item">
                <span className="label">Khách hàng:</span>
                <span className="value">{orderInfo.customerName}</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="review-form">
          <div className="form-group">
            <label className="form-label">
              Đánh giá tổng thể <span className="required">*</span>
            </label>
            <StarRating 
              rating={formData.rating} 
              onRatingChange={handleRatingChange}
              disabled={submitting}
            />
            {errors.rating && <div className="error-message">{errors.rating}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="comment" className="form-label">
              Chia sẻ trải nghiệm của bạn <span className="required">*</span>
            </label>

            <div className="quick-suggestions">
              <p className="suggestions-label">Gợi ý nhanh:</p>
              <div className="suggestions-grid">
                {quickSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => handleQuickSuggestion(suggestion)}
                    disabled={submitting || (formData.comment.length + suggestion.length) > 1000}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              id="comment"
              value={formData.comment}
              onChange={handleCommentChange}
              placeholder="Hãy chia sẻ những điều bạn thích về chuyến đi này..."
              rows={6}
              maxLength={1000}
              disabled={submitting}
              className={errors.comment ? 'error' : ''}
            />
            <div className="char-count">
              {formData.comment.length}/1000 ký tự
            </div>
            {errors.comment && <div className="error-message">{errors.comment}</div>}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-small"></span>
                  Đang gửi...
                </>
              ) : (
                'Gửi đánh giá'
              )}
            </button>
          </div>
        </form>

        <div className="form-footer">
          <p className="note">
            <strong>Lưu ý:</strong> Đánh giá của bạn sẽ được xem xét trước khi hiển thị công khai.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReviewForm;
