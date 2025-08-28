import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  sendMessage,
  createNewSession,
  clearChatHistory,
  getChatbotContext,
  ChatStorage
} from '../../../services/geminiService';
import {
  generateQuickSuggestions,
  analyzeUserIntent
} from '../../../utils/chatbotUtils';
import { PLACEHOLDER_IMAGES } from '../../../utils/placeholderImage';
import { stripHtmlTags, decodeHtmlEntities } from '../../../utils/htmlUtils';
import './ChatBotWidget.scss';

// Utility function to clean and sanitize message text
const cleanMessageText = (text) => {
  if (!text || typeof text !== 'string') return '';

  // First decode HTML entities
  let cleanedText = decodeHtmlEntities(text);

  // Strip HTML tags if any
  cleanedText = stripHtmlTags(cleanedText);

  // Trim whitespace and normalize line breaks
  cleanedText = cleanedText.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove excessive whitespace but preserve intentional line breaks
  cleanedText = cleanedText.replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n');

  return cleanedText;
};

const ChatBotWidget = () => {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [quickSuggestions, setQuickSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [imageModal, setImageModal] = useState({ isOpen: false, images: [], currentIndex: 0 });
  const [loadingImages, setLoadingImages] = useState(new Set());
  const [showSystemMenu, setShowSystemMenu] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [welcomePopupDismissed, setWelcomePopupDismissed] = useState(false);

  // User state management
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [userState, setUserState] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Utility functions
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Generate unique device ID
  const generateDeviceId = useCallback(() => {
    return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }, []);

  // LocalStorage service for user state management
  const getUserState = useCallback(() => {
    try {
      const stored = localStorage.getItem('chatbot_user_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate schema
        if (parsed && typeof parsed === 'object') {
          return {
            hasInteracted: parsed.hasInteracted || false,
            hasSeenWelcomePopup: parsed.hasSeenWelcomePopup || false,
            firstVisitDate: parsed.firstVisitDate || Date.now(),
            lastVisitDate: parsed.lastVisitDate || Date.now(),
            chatHistory: Array.isArray(parsed.chatHistory) ? parsed.chatHistory : [],
            isDisabled: parsed.isDisabled || false,
            deviceId: parsed.deviceId || generateDeviceId(),
            totalInteractions: parsed.totalInteractions || 0
          };
        }
      }
    } catch (error) {
      console.warn('Error reading user state from localStorage:', error);
    }

    // Return default state for new users
    return {
      hasInteracted: false,
      hasSeenWelcomePopup: false,
      firstVisitDate: Date.now(),
      lastVisitDate: Date.now(),
      chatHistory: [],
      isDisabled: false,
      deviceId: generateDeviceId(),
      totalInteractions: 0
    };
  }, [generateDeviceId]);

  // Save user state to localStorage with error handling
  const saveUserState = useCallback((state) => {
    try {
      // Check if localStorage is available
      if (typeof Storage === 'undefined') {
        console.warn('localStorage is not supported in this browser');
        return false;
      }

      const stateToSave = {
        ...state,
        lastVisitDate: Date.now()
      };

      // Check localStorage quota
      const serialized = JSON.stringify(stateToSave);
      if (serialized.length > 5000000) { // 5MB limit
        console.warn('User state data too large for localStorage');
        return false;
      }

      localStorage.setItem('chatbot_user_state', serialized);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded:', error);
        // Try to clear old data and retry
        try {
          localStorage.removeItem('chatbot_user_state');
          localStorage.setItem('chatbot_user_state', JSON.stringify({
            ...state,
            chatHistory: state.chatHistory.slice(-10), // Keep only last 10 messages
            lastVisitDate: Date.now()
          }));
          return true;
        } catch (retryError) {
          console.error('Failed to save user state after cleanup:', retryError);
          return false;
        }
      } else {
        console.error('Error saving user state to localStorage:', error);
        return false;
      }
    }
  }, []);

  // Mark user as interacted
  const markUserAsInteracted = useCallback(() => {
    const currentState = getUserState();
    const updatedState = {
      ...currentState,
      hasInteracted: true,
      hasSeenWelcomePopup: true,
      totalInteractions: currentState.totalInteractions + 1
    };

    if (saveUserState(updatedState)) {
      setHasUserInteracted(true);
      setUserState(updatedState);
    }
  }, [getUserState, saveUserState]);

  // Function không cần thiết đã được loại bỏ

  // Initialize user state
  const initializeUserExperience = useCallback(() => {
    const state = getUserState();
    setUserState(state);

    if (state.hasInteracted) {
      // Returning user who has interacted with chatbot
      setHasUserInteracted(true);

      // Load chat history
      if (state.chatHistory && state.chatHistory.length > 0) {
        const formattedHistory = state.chatHistory.map(msg => ({
          id: Date.now() + Math.random(),
          text: cleanMessageText(msg.content || msg.text),
          isUser: msg.role === 'user' || msg.isUser,
          timestamp: msg.timestamp || new Date().toISOString(),
          tourData: msg.tourData || null
        }));
        setMessages(formattedHistory);
        setShowSuggestions(false);
      }
    } else {
      // User who hasn't interacted with chatbot yet
      setHasUserInteracted(false);

      // Always show welcome popup for non-interacted users after delay
      setTimeout(() => {
        setShowWelcomePopup(true);
      }, 5000); // Show after 5 seconds
    }
  }, [getUserState, cleanMessageText]);

  // Extract tour information and images from message text
  const extractTourData = useCallback((messageText) => {
    const tourData = {
      images: [],
      tourInfo: null
    };

    // Look for tour information patterns in the message
    const tourPatterns = [
      /tour\s+([^,\n]+)/gi,
      /địa\s+điểm[:\s]+([^,\n]+)/gi,
      /giá[:\s]+([^,\n]+)/gi
    ];

    // Extract images from message if they contain image URLs or tour references
    const imageUrlPattern = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;
    const imageMatches = messageText.match(imageUrlPattern);

    if (imageMatches) {
      tourData.images = imageMatches.slice(0, 4); // Limit to 4 images
    }

    return tourData;
  }, []);

  // Handle image loading states
  const handleImageLoad = useCallback((imageUrl) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageUrl);
      return newSet;
    });
  }, []);

  const handleImageError = useCallback((imageUrl) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageUrl);
      return newSet;
    });
  }, []);

  // Open image modal
  const openImageModal = useCallback((images, startIndex = 0) => {
    setImageModal({
      isOpen: true,
      images: images,
      currentIndex: startIndex
    });
  }, []);

  // Close image modal
  const closeImageModal = useCallback(() => {
    setImageModal({ isOpen: false, images: [], currentIndex: 0 });
  }, []);

  // Toggle system menu
  const toggleSystemMenu = useCallback(() => {
    setShowSystemMenu(prev => !prev);
  }, []);

  // Close system menu when clicking outside
  const closeSystemMenu = useCallback(() => {
    setShowSystemMenu(false);
  }, []);

  // Handle tour actions
  const handleTourAction = useCallback((action, tourData) => {
    switch (action) {
      case 'book':
        // Handle booking action
        console.log('Booking tour:', tourData);
        // You can integrate with booking system here
        break;
      case 'details':
        // Handle view details action
        console.log('View tour details:', tourData);
        // You can show detailed tour information
        break;
      case 'gallery':
        // Handle view gallery action
        if (tourData.images && tourData.images.length > 0) {
          openImageModal(tourData.images, 0);
        }
        break;
      default:
        break;
    }
  }, [openImageModal]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Close system menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSystemMenu && !event.target.closest('.system-menu-container')) {
        setShowSystemMenu(false);
      }
    };

    if (showSystemMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSystemMenu]);



  // Initialize user experience and chatbot session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Initialize user experience first
        initializeUserExperience();

        // Load tour context
        const contextResult = await getChatbotContext();
        if (contextResult.success) {
          const suggestions = generateQuickSuggestions(contextResult.data);
          setQuickSuggestions(suggestions);
        }

        // Try to get existing session from localStorage
        const existingSessionId = ChatStorage.getSessionId();
        const userStateData = getUserState();

        if (existingSessionId && userStateData.hasInteracted) {
          setSessionId(existingSessionId);
          // For returning users, chat history is already loaded in initializeUserExperience
        } else {
          // Create new session for new users or when no session exists
          const result = await createNewSession();
          if (result.success) {
            const newSessionId = result.data.sessionId;
            setSessionId(newSessionId);
            ChatStorage.saveSessionId(newSessionId);

            // For first-time users, no welcome message needed
            if (userStateData.hasInteracted) {
              // This is a returning user without session, add friendly welcome message
              const welcomeMessage = {
                id: Date.now(),
                text: "Chào mừng bạn quay lại! 👋\n\nTôi có thể giúp bạn tìm tour du lịch mới hôm nay không? ✈️",
                isUser: false,
                timestamp: new Date().toISOString()
              };
              setMessages([welcomeMessage]);
            }
          }
        }
      } catch (error) {
        console.error('Session initialization error:', error);
        setError('Không thể khởi tạo phiên chat');
      }
    };

    initializeSession();
  }, [initializeUserExperience, getUserState, cleanMessageText]);

  // Handle sending message
  const handleSendMessage = async (messageText = null) => {
    const messageToSend = messageText || inputMessage.trim();

    if (!messageToSend || isLoading) return;

    // Mark user as interacted if this is their first message
    if (!hasUserInteracted) {
      markUserAsInteracted();
    }

    // Hide suggestions after first message
    setShowSuggestions(false);

    // Analyze user intent (for potential future enhancements)
    const intent = analyzeUserIntent(messageToSend);
    console.log('User intent:', intent);

    const userMessage = {
      id: Date.now(),
      text: messageToSend,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      // Send message to API
      const result = await sendMessage(messageToSend, sessionId);

      if (result.success) {
        // Extract tour data from the response
        const tourData = extractTourData(result.data.reply);

        const botMessage = {
          id: Date.now() + 1,
          text: result.data.reply,
          isUser: false,
          timestamp: result.data.timestamp,
          tourData: tourData.images.length > 0 ? tourData : null
        };

        // Add loading state for images if any
        if (tourData.images.length > 0) {
          setLoadingImages(prev => new Set([...prev, ...tourData.images]));
        }

        setMessages(prev => [...prev, botMessage]);

        // Update session ID if changed
        if (result.data.sessionId && result.data.sessionId !== sessionId) {
          setSessionId(result.data.sessionId);
          ChatStorage.saveSessionId(result.data.sessionId);
        }

        // Save to local storage and user state
        const updatedHistory = [...messages, userMessage, botMessage];
        ChatStorage.saveLocalHistory(sessionId || result.data.sessionId,
          updatedHistory.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text,
            timestamp: msg.timestamp
          }))
        );

        // Update user state with chat history
        const currentState = getUserState();
        const updatedState = {
          ...currentState,
          chatHistory: updatedHistory.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text,
            text: msg.text,
            isUser: msg.isUser,
            timestamp: msg.timestamp,
            tourData: msg.tourData
          })),
          totalInteractions: currentState.totalInteractions + 1
        };
        saveUserState(updatedState);

      } else {
        // Handle API error
        const errorMessage = {
          id: Date.now() + 1,
          text: result.error || 'Xin lỗi, tôi không thể trả lời lúc này. Vui lòng thử lại sau.',
          isUser: false,
          timestamp: new Date().toISOString(),
          isError: true
        };
        setMessages(prev => [...prev, errorMessage]);
        setError(result.error);
      }

    } catch (error) {
      console.error('Send message error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau.',
        isUser: false,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      setError('Lỗi kết nối');
    } finally {
      setIsLoading(false);
    }
  };



  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    // Remove emoji and send clean message
    const cleanMessage = suggestion.replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, '').trim();
    handleSendMessage(cleanMessage);
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Clear chat history
  const handleClearChat = async () => {
    if (!sessionId) return;

    try {
      const result = await clearChatHistory(sessionId);
      if (result.success) {
        // Clear messages
        setMessages([]);

        // Clear all local storage data
        ChatStorage.clearLocalHistory(sessionId);
        ChatStorage.clearSessionId();

        // Clear user state completely
        localStorage.removeItem('chatbot_user_state');

        // Reset all states
        setUserState({
          hasInteracted: false,
          hasSeenWelcomePopup: false,
          firstVisitDate: Date.now(),
          lastVisitDate: Date.now(),
          chatHistory: [],
          isDisabled: false,
          deviceId: generateDeviceId(),
          totalInteractions: 0
        });
        setHasUserInteracted(false);
        setSessionId(null);
        setShowSuggestions(true);

        // Add friendly welcome message for fresh start
        const welcomeMessage = {
          id: Date.now(),
          text: 'Xin chào 👋 Tôi có thể giúp bạn tìm tour nào hôm nay?',
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Clear chat error:', error);
      setError('Không thể xóa lịch sử hội thoại');
    }
  };

  // Start new conversation
  const handleNewConversation = async () => {
    try {
      const result = await createNewSession();
      if (result.success) {
        const newSessionId = result.data.sessionId;

        // Clear old session completely
        if (sessionId) {
          ChatStorage.clearLocalHistory(sessionId);
        }
        ChatStorage.clearSessionId();

        // Clear user state completely
        localStorage.removeItem('chatbot_user_state');

        // Reset user state
        setUserState({
          hasInteracted: false,
          hasSeenWelcomePopup: false,
          firstVisitDate: Date.now(),
          lastVisitDate: Date.now(),
          chatHistory: [],
          isDisabled: false,
          deviceId: generateDeviceId(),
          totalInteractions: 0
        });
        setHasUserInteracted(false);

        // Set new session
        setSessionId(newSessionId);
        ChatStorage.saveSessionId(newSessionId);
        setMessages([]);
        setError(null);
        setShowSuggestions(true); // Show suggestions again

        // Add friendly welcome message for new conversation
        const welcomeMessage = {
          id: Date.now(),
          text: 'Bắt đầu cuộc trò chuyện mới ✨\n\nXin chào! Tôi là PYS Travel AI. Hãy cho tôi biết bạn muốn khám phá điểm đến nào nhé! 🌍',
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('New conversation error:', error);
      setError('Không thể tạo cuộc hội thoại mới');
    }
  };



  // Handle welcome popup actions
  const handleWelcomeAction = (action) => {
    setShowWelcomePopup(false);

    if (action === 'start') {
      // Mark user as interacted (this also marks popup as seen)
      markUserAsInteracted();

      // Open chat and add welcome message
      setIsOpen(true);
      setIsMinimized(false);

      // Add welcome message to chat
      const welcomeMessage = {
        id: Date.now(),
        text: 'Xin chào! 👋 Tôi là trợ lý ảo của ND Travel.\n\nTôi có thể giúp bạn:\n• Tìm kiếm tour du lịch phù hợp\n• Tư vấn điểm đến hot\n• So sánh giá tour\n• Giải đáp thắc mắc\n\nBạn muốn khám phá điểm đến nào? 🌍✈️',
        isUser: false,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
      setShowSuggestions(true);

      // Focus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  };

  // Toggle chat window
  const toggleChat = useCallback(() => {
    setIsOpen(prev => {
      const newIsOpen = !prev;
      if (newIsOpen) {
        setIsMinimized(false);
        // Hide welcome popup if opening chat
        setShowWelcomePopup(false);

        // If first-time user and no messages, add welcome message
        const currentState = getUserState();
        if (!currentState.hasInteracted && messages.length === 0) {
          const welcomeMessage = {
            id: Date.now(),
            text: 'Xin chào! Tôi là trợ lý ảo của PYS Travel. Tôi có thể giúp bạn tìm kiếm và tư vấn các tour du lịch phù hợp. Bạn muốn đi du lịch ở đâu? 🌍✈️',
            isUser: false,
            timestamp: new Date().toISOString()
          };
          setMessages([welcomeMessage]);
        }

        // Focus input when opening with proper delay for animation
        setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
      }
      return newIsOpen;
    });
  }, [getUserState, messages.length]);

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Tour Action Buttons Component
  const TourActionButtons = ({ tourData, messageId }) => {
    if (!tourData) return null;

    return (
      <div className="tour-actions">
        <button
          className="tour-action-btn primary"
          onClick={() => handleTourAction('book', tourData)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Đặt ngay</span>
        </button>

        {tourData.images && tourData.images.length > 0 && (
          <button
            className="tour-action-btn secondary"
            onClick={() => handleTourAction('gallery', tourData)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>Xem ảnh</span>
          </button>
        )}

        <button
          className="tour-action-btn secondary"
          onClick={() => handleTourAction('details', tourData)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Chi tiết</span>
        </button>
      </div>
    );
  };

  // Tour Image Gallery Component
  const TourImageGallery = ({ images, messageId }) => {
    if (!images || images.length === 0) return null;

    const displayImages = images.slice(0, 4);
    const remainingCount = images.length - 4;

    return (
      <div className="message-images">
        <div className={`image-gallery ${displayImages.length === 1 ? 'single' : 'multiple'}`}>
          {displayImages.map((imageUrl, index) => {
            const isLoading = loadingImages.has(imageUrl);

            if (isLoading) {
              return (
                <div key={`${messageId}-${index}`} className="image-loading">
                  <div className="loading-spinner"></div>
                  <span>Đang tải...</span>
                </div>
              );
            }

            return (
              <div key={`${messageId}-${index}`} className="image-container">
                <img
                  src={imageUrl || PLACEHOLDER_IMAGES.TOUR_CARD}
                  alt={`Hình ảnh tour ${index + 1}`}
                  className="tour-image"
                  onClick={() => openImageModal(images, index)}
                  onLoad={() => handleImageLoad(imageUrl)}
                  onError={() => handleImageError(imageUrl)}
                />
                {index === 3 && remainingCount > 0 && (
                  <div
                    className="image-overlay"
                    data-count={remainingCount}
                    onClick={() => openImageModal(images, index)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };



  // Image Modal Component
  const ImageModal = () => {
    if (!imageModal.isOpen) return null;

    const { images, currentIndex } = imageModal;
    const currentImage = images[currentIndex];

    const nextImage = useCallback(() => {
      setImageModal(prev => ({
        ...prev,
        currentIndex: (prev.currentIndex + 1) % images.length
      }));
    }, [images.length]);

    const prevImage = useCallback(() => {
      setImageModal(prev => ({
        ...prev,
        currentIndex: prev.currentIndex === 0 ? images.length - 1 : prev.currentIndex - 1
      }));
    }, [images.length]);

    // Keyboard navigation
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (!imageModal.isOpen) return;

        switch (e.key) {
          case 'Escape':
            closeImageModal();
            break;
          case 'ArrowLeft':
            prevImage();
            break;
          case 'ArrowRight':
            nextImage();
            break;
          default:
            break;
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [imageModal.isOpen, nextImage, prevImage, closeImageModal]);

    return (
      <div
        className="image-modal-overlay"
        onClick={closeImageModal}
        role="dialog"
        aria-modal="true"
        aria-label="Xem hình ảnh tour"
      >
        <div className="image-modal-content" onClick={e => e.stopPropagation()}>
          <button
            className="modal-close"
            onClick={closeImageModal}
            aria-label="Đóng hình ảnh"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="modal-image-container">
            <img
              src={currentImage || PLACEHOLDER_IMAGES.TOUR_GALLERY}
              alt={`Hình ảnh tour ${currentIndex + 1}`}
              className="modal-image"
            />
          </div>

          {images.length > 1 && (
            <>
              <button
                className="modal-nav modal-prev"
                onClick={prevImage}
                aria-label="Hình ảnh trước"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                className="modal-nav modal-next"
                onClick={nextImage}
                aria-label="Hình ảnh tiếp theo"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className="modal-indicators" role="tablist" aria-label="Chọn hình ảnh">
                {images.map((_, index) => (
                  <button
                    key={index}
                    className={`indicator ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => setImageModal(prev => ({ ...prev, currentIndex: index }))}
                    role="tab"
                    aria-selected={index === currentIndex}
                    aria-label={`Hình ảnh ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Generate dynamic CSS classes based on user state
  const getWidgetClasses = () => {
    const classes = ['chatbot-widget'];
    return classes.join(' ');
  };

  return (
    <div className={getWidgetClasses()}>
      {/* Chat Toggle Button */}
      <button
        className={`chatbot-toggle ${isOpen ? 'active' : ''}`}
        onClick={toggleChat}
        aria-label={isOpen ? "Đóng chatbot" : "Mở chatbot"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {!isOpen && (
          <div className="notification-badge">
            <span>AI</span>
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`chatbot-window ${isMinimized ? 'minimized' : ''}`}>
          {/* Header */}
          <div className="chatbot-header">
            <div className="header-info">
              <div className="bot-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                </svg>
              </div>
              <div className="bot-info">
                <h4>ND Travel</h4>
                <span className="status">Đang hoạt động</span>
              </div>
            </div>
            <div className="header-actions">
              <div className="system-menu-container">
                <button
                  className="system-menu-btn"
                  onClick={toggleSystemMenu}
                  aria-label="Menu hệ thống"
                  aria-expanded={showSystemMenu}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="1" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="19" cy="12" r="1" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="5" cy="12" r="1" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>

                {showSystemMenu && (
                  <div className="system-menu-dropdown" onClick={closeSystemMenu}>
                    <div className="menu-content" onClick={e => e.stopPropagation()}>
                      <button
                        className="menu-item"
                        onClick={() => {
                          handleNewConversation();
                          closeSystemMenu();
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span>Cuộc hội thoại mới</span>
                      </button>
                      <button
                        className="menu-item"
                        onClick={() => {
                          handleClearChat();
                          closeSystemMenu();
                        }}
                        disabled={messages.length === 0}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Xóa lịch sử chat</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="close-btn"
                onClick={toggleChat}
                aria-label="Đóng chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Container */}
              <div className="chatbot-messages" ref={chatContainerRef}>
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`message ${message.isUser ? 'user' : 'bot'} ${message.isError ? 'error' : ''}`}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    {!message.isUser && (
                      <div className="message-avatar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                        </svg>
                      </div>
                    )}
                    <div className="message-content">
                      <div className="message-text">
                        {message.text.split('\n').map((line, lineIndex) => (
                          <React.Fragment key={lineIndex}>
                            {line}
                            {lineIndex < message.text.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </div>
                      {message.tourData && message.tourData.images && (
                        <TourImageGallery
                          images={message.tourData.images}
                          messageId={message.id}
                        />
                      )}
                      {message.tourData && !message.isUser && (
                        <TourActionButtons
                          tourData={message.tourData}
                          messageId={message.id}
                        />
                      )}
                      <div className="message-time">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="message bot typing">
                    <div className="message-avatar">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestions */}
              {showSuggestions && quickSuggestions.length > 0 && (
                <div className="quick-suggestions">
                  <h5>Gợi ý nhanh:</h5>
                  <div className="suggestions-grid">
                    {quickSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="suggestion-btn"
                        onClick={() => handleSuggestionClick(suggestion)}
                        disabled={isLoading}
                      >
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="chatbot-error">
                  <span>{error}</span>
                  <button onClick={() => setError(null)}>×</button>
                </div>
              )}

              {/* Input Area */}
              <div className="chatbot-input">

                <div className="input-container">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Nhập tin nhắn của bạn..."
                    disabled={isLoading}
                    rows="1"
                    maxLength="1000"
                  />
                  <button
                    className="send-btn"
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    aria-label="Gửi tin nhắn"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                <div className="input-footer">
                  <span className="char-count">{inputMessage.length}/1000</span>
                  <span className="powered-by">Powered by Gemini AI</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Image Modal */}
      <ImageModal />

      {/* Welcome Popup */}
      {showWelcomePopup && (
        <div className="chatbot-welcome-popup">
          <div className="welcome-popup-content">
            <button
              className="welcome-close-btn"
              onClick={() => setShowWelcomePopup(false)}
              aria-label="Đóng"
            >
              ×
            </button>

            <div className="welcome-header">
              <div className="welcome-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                </svg>
              </div>
              <div className="welcome-info">
                <h4>ND Travel AI Assistant</h4>
                <p>👋 Xin chào! Tôi có thể giúp bạn tìm tour du lịch phù hợp. Bạn muốn khám phá điểm đến nào?</p>
              </div>
            </div>

            <div className="welcome-actions">
              <button
                className="welcome-action-btn primary"
                onClick={() => handleWelcomeAction('start')}
              >
                💬 Bắt đầu trò chuyện
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBotWidget;