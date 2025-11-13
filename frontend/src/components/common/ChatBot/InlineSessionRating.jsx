import React, { useState, useEffect, useRef } from 'react';
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
    const [displayedRating, setDisplayedRating] = useState(0); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [hasExistingRating, setHasExistingRating] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const hoverTimeoutRef = useRef(null);

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
                }
            } catch (error) {
                console.error('Error checking existing rating:', error);
            }
        };

        checkExistingRating();
    }, [sessionId]);

    // Handle smooth hover effect với delay
    useEffect(() => {
        // Clear timeout cũ
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        if (hoveredRating > 0) {
            // Delay 200ms trước khi hiển thị emotion text
            hoverTimeoutRef.current = setTimeout(() => {
                setDisplayedRating(hoveredRating);
            }, 200);
        } else if (rating > 0 && !hasSubmitted) {
            // Hiển thị ngay nếu đã có rating
            setDisplayedRating(rating);
        } else {
            // Clear ngay lập tức khi không hover
            setDisplayedRating(0);
        }

        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, [hoveredRating, rating, hasSubmitted]);

    // Xử lý submit rating
    const handleRatingSubmit = async (starRating) => {
        if (!sessionId || isSubmitting || hasSubmitted) return;

        setIsSubmitting(true);
        setRating(starRating);

        try {
            const result = await createOrUpdateSessionRating({
                sessionId,
                rating: starRating,
                feedback: '',
                ratingType: trigger === 'auto' ? 'auto_prompt' : 'manual',
                ratingTrigger: trigger === 'session_end' ? 'session_timeout' : 'user_initiated',
                sessionStats
            });

            if (result.success) {
                setHasSubmitted(true);
                setShowFeedback(true);

                // Callback để parent component biết rating đã được submit
                if (onRatingSubmit) {
                    onRatingSubmit({
                        sessionId,
                        messageId,
                        rating: starRating,
                        feedback: '',
                        success: true,
                        isUpdate: result.data.isUpdate
                    });
                }
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

    // Lấy text mô tả rating chính
    const getRatingText = () => {
        // Text chính cho từng trigger
        if (trigger === 'user_declined' || trigger === 'no_response_timeout') {
            return 'Cảm ơn bạn đã trò chuyện với ND Travel! Hãy cho chúng tôi biết trải nghiệm của bạn với Chatbot nhé 😊';
        } else if (trigger === 'support_completed') {
            return 'Đánh giá trải nghiệm của bạn';
        } else if (trigger === 'session_end' || trigger === 'tab_hidden' || trigger === 'page_unload') {
            return 'Bạn hài lòng với cuộc trò chuyện vừa rồi chứ?';
        } else if (trigger === 'chatbot_close') {
            return 'Đánh giá trải nghiệm trước khi đóng nhé! 😊';
        } else if (trigger === 'manual') {
            return 'Đánh giá trải nghiệm của bạn';
        }
        
        return 'Đánh giá trải nghiệm của bạn';
    };

    // Lấy text mô tả cảm xúc tương ứng với số sao
    const getEmotionText = () => {
        const currentRating = displayedRating;
        
        const emotionData = {
            0: { text: '', icon: '' },
            1: { text: 'Rất không hài lòng', icon: '😞' },
            2: { text: 'Không hài lòng', icon: '😕' }, 
            3: { text: 'Bình thường', icon: '😐' },
            4: { text: 'Hài lòng', icon: '😊' },
            5: { text: 'Rất hài lòng', icon: '🤩' }
        };

        return emotionData[currentRating] || emotionData[0];
    };

    // Không hiển thị nếu đã có rating và không cần hiển thị feedback
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

                    {/* Hiển thị text mô tả cảm xúc với delay để mượt hơn */}
                    {displayedRating > 0 && (
                        <div className="emotion-text" key={displayedRating}>
                            <span className="emotion-icon">{getEmotionText().icon}</span>
                            <span className="emotion-description">{getEmotionText().text}</span>
                        </div>
                    )}

                    {hasSubmitted && rating && (
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

                {!hasSubmitted && (
                    <div className="rating-footer">
                        <small>Đánh giá này sẽ giúp chúng tôi cải thiện chất lượng hỗ trợ</small>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InlineSessionRating;
