import React, { useState, useEffect } from 'react';
import { createOrUpdateSessionRating, checkSessionRated } from '../../../services/chatRatingService';
import './InlineSessionRating.scss';

/**
 * Component đánh giá phiên hội thoại hiển thị inline trong cuộc trò chuyện
 * Thay vì modal overlay, hiển thị như một tin nhắn đặc biệt
 */
const InlineSessionRating = ({ 
    sessionId, 
    onRatingSubmit,
    trigger = 'manual',
    sessionStats = {},
    messageId
}) => {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [hasExistingRating, setHasExistingRating] = useState(false);

    // Kiểm tra xem session đã được đánh giá chưa
    useEffect(() => {
        const checkExistingRating = async () => {
            if (!sessionId) return;
            
            try {
                const result = await checkSessionRated(sessionId);
                if (result.success && result.data.hasRating) {
                    setHasExistingRating(true);
                    setHasSubmitted(true);
                    setRating(result.data.rating.rating);
                    setFeedback(result.data.rating.feedback || '');
                }
            } catch (error) {
                console.error('Error checking existing rating:', error);
            }
        };

        checkExistingRating();
    }, [sessionId]);

    // Xử lý submit rating
    const handleRatingSubmit = async (starRating) => {
        if (!sessionId || isSubmitting || hasSubmitted) return;

        setIsSubmitting(true);
        setRating(starRating);

        try {
            const result = await createOrUpdateSessionRating({
                sessionId,
                rating: starRating,
                feedback: feedback.trim(),
                ratingType: trigger === 'auto' ? 'auto_prompt' : 'manual',
                ratingTrigger: trigger === 'session_end' ? 'session_timeout' : 'user_initiated',
                sessionStats
            });

            if (result.success) {
                setHasSubmitted(true);

                // Callback để parent component biết rating đã được submit
                if (onRatingSubmit) {
                    onRatingSubmit({
                        sessionId,
                        messageId,
                        rating: starRating,
                        feedback: feedback.trim(),
                        success: true,
                        isUpdate: result.data.isUpdate
                    });
                }

                // Luôn hiển thị feedback form để người dùng có thể để lại ý kiến
                setShowFeedback(true);
            } else {
                console.error('Lỗi khi gửi rating:', result.error);
                setRating(0);

                if (onRatingSubmit) {
                    onRatingSubmit({
                        sessionId,
                        messageId,
                        rating: starRating,
                        error: result.error,
                        success: false
                    });
                }
            }
        } catch (error) {
            console.error('Lỗi khi gửi rating:', error);
            setRating(0);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Xử lý submit feedback
    const handleFeedbackSubmit = async () => {
        if (!feedback.trim() || isSubmitting) return;

        setIsSubmitting(true);

        try {
            const result = await createOrUpdateSessionRating({
                sessionId,
                rating,
                feedback: feedback.trim(),
                ratingType: trigger === 'auto' ? 'auto_prompt' : 'manual',
                ratingTrigger: 'user_initiated',
                sessionStats
            });

            if (result.success) {
                setShowFeedback(false);
                
                if (onRatingSubmit) {
                    onRatingSubmit({
                        sessionId,
                        messageId,
                        rating,
                        feedback: feedback.trim(),
                        success: true,
                        isUpdate: true
                    });
                }
            }
        } catch (error) {
            console.error('Lỗi khi gửi feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render sao
    const renderStars = () => {
        const stars = [];
        const displayRating = hoveredRating || rating || 0;

        for (let i = 1; i <= 5; i++) {
            const isFilled = i <= displayRating;
            const isHovered = hoveredRating > 0 && i <= hoveredRating;

            stars.push(
                <button
                    key={i}
                    type="button"
                    className={`star ${isFilled ? 'filled' : ''} ${isHovered ? 'hovered' : ''}`}
                    onClick={() => !hasSubmitted && handleRatingSubmit(i)}
                    onMouseEnter={() => !hasSubmitted && setHoveredRating(i)}
                    onMouseLeave={() => !hasSubmitted && setHoveredRating(0)}
                    disabled={hasSubmitted || isSubmitting}
                    aria-label={`Đánh giá ${i} sao`}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                </button>
            );
        }

        return stars;
    };

    // Lấy text mô tả rating
    const getRatingText = () => {
        const currentRating = hoveredRating || rating || 0;

        // Text hiện đại và thân thiện hơn
        let baseTexts = {
            0: 'Bạn hài lòng với cuộc trò chuyện vừa rồi chứ?',
            1: 'Rất không hài lòng 😞',
            2: 'Không hài lòng 😕',
            3: 'Bình thường 😐',
            4: 'Hài lòng 😊',
            5: 'Rất hài lòng 🤩'
        };

        // Thay đổi message cho các trigger đặc biệt
        if (currentRating === 0) {
            if (trigger === 'user_declined' || trigger === 'no_response_timeout') {
                return 'Cảm ơn bạn đã trò chuyện với ND Travel! Hãy cho chúng tôi biết trải nghiệm của bạn với Chatbot nhé 😊';
            } else if (trigger === 'support_completed') {
                baseTexts[0] = 'Đánh giá trải nghiệm của bạn';
            } else if (trigger === 'session_end' || trigger === 'tab_hidden' || trigger === 'page_unload') {
                baseTexts[0] = 'Bạn hài lòng với cuộc trò chuyện vừa rồi chứ?';
            } else if (trigger === 'chatbot_close') {
                baseTexts[0] = 'Đánh giá trải nghiệm trước khi đóng nhé! 😊';
            } else if (trigger === 'manual') {
                baseTexts[0] = 'Đánh giá trải nghiệm của bạn';
            }
        }

        return baseTexts[currentRating] || baseTexts[0];
    };

    // Không hiển thị nếu đã có rating
    if (hasExistingRating && hasSubmitted && !showFeedback) {
        return (
            <div className="inline-session-rating completed">
                <div className="rating-header">
                    <div className="bot-avatar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                        </svg>
                    </div>
                    <span className="rating-title">Cảm ơn bạn đã đánh giá!</span>
                </div>
                <div className="rating-result">
                    <div className="stars-display">
                        {[1, 2, 3, 4, 5].map(i => (
                            <span key={i} className={`star ${i <= rating ? 'filled' : ''}`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                            </span>
                        ))}
                    </div>
                    <span className="rating-value">{rating}/5</span>
                </div>
            </div>
        );
    }

    return (
        <div className="inline-session-rating">
            <div className="rating-header">
                <div className="rating-header-text">
                    <h3 className="rating-title">
                        {trigger === 'user_declined' || trigger === 'no_response_timeout'
                            ? 'Đánh giá trải nghiệm của bạn'
                            : trigger === 'support_completed'
                            ? 'Đánh giá trải nghiệm của bạn'
                            : trigger === 'session_end' || trigger === 'tab_hidden' || trigger === 'page_unload'
                            ? 'Đánh giá trước khi kết thúc'
                            : trigger === 'chatbot_close'
                            ? 'Đánh giá trước khi đóng'
                            : 'Đánh giá trải nghiệm của bạn'
                        }
                    </h3>
                    {/* <p className="rating-subtitle">
                        {getRatingText()}
                    </p> */}
                </div>
            </div>

            <div className="rating-content">
                <div className="rating-container">
                    <div className="rating-stars">
                        {renderStars()}
                    </div>

                    {hasSubmitted && rating && !showFeedback && (
                        <div className="rating-result">
                            <span className="rating-thanks">Cảm ơn bạn đã đánh giá!</span>
                            <span className="rating-value">({rating}/5)</span>
                        </div>
                    )}

                    {isSubmitting && (
                        <div className="rating-loading">
                            <div className="spinner"></div>
                            <span>Đang gửi đánh giá...</span>
                        </div>
                    )}
                </div>

                {/* Feedback form đơn giản */}
                {showFeedback && (
                    <div className="feedback-container">
                        <div className="feedback-header">
                            <div className="feedback-header-text">
                                <h4>Ý kiến đóng góp</h4>
                                <p>Chia sẻ thêm để chúng tôi cải thiện dịch vụ</p>
                            </div>
                        </div>
                        <div className="feedback-input">
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Ý kiến đóng góp thêm (không bắt buộc)"
                                maxLength={1000}
                                rows={3}
                                disabled={isSubmitting}
                            />
                            <div className="feedback-actions">
                                <button
                                    className="feedback-skip"
                                    onClick={() => setShowFeedback(false)}
                                    disabled={isSubmitting}
                                    type="button"
                                >
                                    Bỏ qua
                                </button>
                                <button
                                    className="feedback-submit"
                                    onClick={handleFeedbackSubmit}
                                    disabled={isSubmitting}
                                    type="button"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="button-spinner"></div>
                                            Đang gửi...
                                        </>
                                    ) : (
                                        'Gửi đánh giá'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!hasSubmitted && !showFeedback && (
                    <div className="rating-footer">
                        <small>Đánh giá này sẽ giúp chúng tôi cải thiện chất lượng hỗ trợ</small>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InlineSessionRating;
