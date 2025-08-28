import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import userAvatar from '../../../assets/icons/circle-user.svg';
import './TourReviews.scss';

const TourReviews = ({ tourId, reviewsRef, reviewsTitleRef }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({});
  const [ratingStats, setRatingStats] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  const { user, isAuthenticated } = useAuth();

  // Fetch reviews
  const fetchReviews = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/tours/${tourId}/reviews?page=${page}&limit=10`);
      const data = await response.json();

      if (data.success) {
        setReviews(data.data.reviews || []);
        setPagination(data.data.pagination || {});
        setRatingStats(data.data.ratingStats || []);
        setAverageRating(data.data.averageRating || 0);
        setTotalReviews(data.data.totalReviews || 0);
      } else {
        setError(data.message || 'Có lỗi xảy ra khi tải đánh giá');
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải đánh giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tourId) {
      fetchReviews();
    } else {
      setLoading(false);
    }
  }, [tourId]);

  // Handle submit review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để đánh giá tour');
      return;
    }

    if (!newReview.comment.trim()) {
      alert('Vui lòng nhập nội dung đánh giá');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/public/tours/${tourId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newReview)
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setNewReview({ rating: 5, comment: '' });
        setShowReviewForm(false);
        // Refresh reviews
        fetchReviews();
        alert('Đánh giá của bạn đã được gửi thành công!');
      } else {
        alert(data.message || 'Có lỗi xảy ra khi gửi đánh giá');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Có lỗi xảy ra khi gửi đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  // Render star rating
  const renderStars = (rating, size = 'small', interactive = false, onRatingChange = null) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className={`tour-detail__star tour-detail__star--${size} ${
            i <= rating ? 'tour-detail__star--filled' : ''
          } ${interactive ? 'tour-detail__star--interactive' : ''}`}
          viewBox="0 0 16 16"
          onClick={interactive ? () => onRatingChange(i) : undefined}
          style={interactive ? { cursor: 'pointer' } : {}}
        >
          <path d="M8 0l2.5 5.5L16 6.5l-4 4 1 5.5L8 13.5 2.5 16l1-5.5-4-4L5.5 5.5z" />
        </svg>
      );
    }
    return stars;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="tour-detail__reviews" ref={reviewsRef}>
        <h2 className="tour-detail__section-title" ref={reviewsTitleRef}>Đánh giá tour</h2>
        <div className="tour-reviews__loading">Đang tải đánh giá...</div>
      </div>
    );
  }

  return (
    <div className="tour-detail__reviews" ref={reviewsRef}>
      <h2 className="tour-detail__section-title" ref={reviewsTitleRef}>Đánh giá tour</h2>
      
      {/* Reviews Summary */}
      <div className="tour-detail__reviews-summary">
        <div className="tour-detail__reviews-score">
          <span className="tour-detail__reviews-number">
            {totalReviews > 0 && averageRating > 0 ? averageRating.toFixed(1) : '0'}
          </span>/5
        </div>
        <div className="tour-detail__reviews-stars">
          {renderStars(Math.round(averageRating), 'large')}
        </div>
        <span className="tour-detail__reviews-count">
          {totalReviews > 0
            ? `(${totalReviews}) đánh giá`
            : 'Chưa có đánh giá'
          }
        </span>
      </div>

      {/* Add Review Button */}
      {isAuthenticated && (
        <div className="tour-reviews__add-review">
          {!showReviewForm ? (
            <button 
              className="tour-reviews__add-btn"
              onClick={() => setShowReviewForm(true)}
            >
              Viết đánh giá
            </button>
          ) : (
            <form className="tour-reviews__form" onSubmit={handleSubmitReview}>
              <div className="tour-reviews__form-group">
                <label>Đánh giá của bạn:</label>
                <div className="tour-reviews__rating">
                  {renderStars(newReview.rating, 'medium', true, (rating) => 
                    setNewReview(prev => ({ ...prev, rating }))
                  )}
                </div>
              </div>
              
              <div className="tour-reviews__form-group">
                <label>Nội dung đánh giá:</label>
                <textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Chia sẻ trải nghiệm của bạn về tour này..."
                  rows={4}
                  maxLength={1000}
                  required
                />
                <div className="tour-reviews__char-count">
                  {newReview.comment.length}/1000 ký tự
                </div>
              </div>

              <div className="tour-reviews__form-actions">
                <button 
                  type="button" 
                  className="tour-reviews__cancel-btn"
                  onClick={() => {
                    setShowReviewForm(false);
                    setNewReview({ rating: 5, comment: '' });
                  }}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="tour-reviews__submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Reviews List */}
      {error && (
        <div className="tour-reviews__error">
          {error}
        </div>
      )}

      {reviews.length === 0 && !loading ? (
        <div className="tour-reviews__empty">
          Chưa có đánh giá nào cho tour này. Hãy là người đầu tiên đánh giá!
        </div>
      ) : (
        <div className="tour-reviews__list">
          {reviews.map((review) => (
            <div key={review._id} className="tour-detail__review-item">
              <div className="tour-detail__reviewer">
                <div>
                  <img
                    src={review.user?.avatar || userAvatar}
                    alt={review.user?.fullName || review.customerName || 'Reviewer avatar'}
                    className="tour-detail__reviewer-avatar"
                  />
                  <div>
                    <div className="tour-detail__reviewer-name">
                      {review.user?.fullName || review.customerName || 'Người dùng ẩn danh'}
                    </div>
                    <div className="tour-detail__reviewer-rating">
                      {renderStars(review.rating, 'small')}
                    </div>
                  </div>
                </div>
                <div className="tour-detail__review-date">
                  {formatDate(review.createdAt)}
                </div>
              </div>
              <p className="tour-detail__review-text">
                "{review.comment}"
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total > 1 && (
        <div className="tour-reviews__pagination">
          {pagination.current > 1 && (
            <button 
              className="tour-reviews__page-btn"
              onClick={() => fetchReviews(pagination.current - 1)}
            >
              Trang trước
            </button>
          )}
          
          <span className="tour-reviews__page-info">
            Trang {pagination.current} / {pagination.total}
          </span>
          
          {pagination.current < pagination.total && (
            <button 
              className="tour-reviews__page-btn"
              onClick={() => fetchReviews(pagination.current + 1)}
            >
              Trang sau
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TourReviews;
