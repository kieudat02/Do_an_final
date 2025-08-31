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

// Hàm tiện ích để làm sạch và xử lý văn bản tin nhắn
const cleanMessageText = (text) => {
  if (!text || typeof text !== 'string') return '';

  // Giải mã HTML entities trước
  let cleanedText = decodeHtmlEntities(text);

  // Loại bỏ HTML tags nếu có
  cleanedText = stripHtmlTags(cleanedText);

  // Cắt khoảng trắng và chuẩn hóa xuống dòng
  cleanedText = cleanedText.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Loại bỏ khoảng trắng thừa nhưng giữ nguyên xuống dòng có ý định
  cleanedText = cleanedText.replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n');

  return cleanedText;
};

// Hàm xử lý và làm sạch định dạng markdown trong văn bản tin nhắn
const parseAndCleanMarkdown = (text) => {
  if (!text || typeof text !== 'string') return [];

  // Xử lý text theo từng bước
  let processedText = text;

  // Bước 1: Thay thế dấu * đầu dòng bằng bullet point
  processedText = processedText.replace(/^\s*\*\s+/gm, '• ');

  // Bước 2: Xử lý **text** thành bold và loại bỏ dấu **
  processedText = processedText.replace(/\*\*([^*]+)\*\*/g, '|||BOLD_START|||$1|||BOLD_END|||');

  // Bước 3: Xử lý *text* thành italic và loại bỏ dấu *
  processedText = processedText.replace(/\*([^*]+)\*/g, '|||ITALIC_START|||$1|||ITALIC_END|||');

  // Bước 4: Loại bỏ tất cả dấu * còn lại
  processedText = processedText.replace(/\*/g, '');

  // Bước 5: Chia thành các dòng và xử lý
  const lines = processedText.split('\n');
  const elements = [];

  lines.forEach((line, lineIndex) => {
    if (line.trim() === '') {
      elements.push(<br key={`br-${lineIndex}`} />);
      return;
    }

    // Parse các marker đặc biệt
    const parts = [];
    let currentIndex = 0;
    let partKey = 0;

    // Tìm tất cả markers
    const markerRegex = /\|\|\|(BOLD_START|BOLD_END|ITALIC_START|ITALIC_END)\|\|\|/g;
    let match;
    let isInBold = false;
    let isInItalic = false;
    let currentText = '';

    while ((match = markerRegex.exec(line)) !== null) {
      // Thêm text trước marker
      if (match.index > currentIndex) {
        currentText += line.substring(currentIndex, match.index);
      }

      // Xử lý marker
      switch (match[1]) {
        case 'BOLD_START':
          if (currentText) {
            if (isInItalic) {
              parts.push(<em key={`italic-${lineIndex}-${partKey++}`} className="markdown-italic">{currentText}</em>);
            } else {
              parts.push(<span key={`text-${lineIndex}-${partKey++}`}>{currentText}</span>);
            }
            currentText = '';
          }
          isInBold = true;
          break;
        case 'BOLD_END':
          if (currentText) {
            parts.push(<strong key={`bold-${lineIndex}-${partKey++}`} className="markdown-bold">{currentText}</strong>);
            currentText = '';
          }
          isInBold = false;
          break;
        case 'ITALIC_START':
          if (currentText) {
            if (isInBold) {
              parts.push(<strong key={`bold-${lineIndex}-${partKey++}`} className="markdown-bold">{currentText}</strong>);
            } else {
              parts.push(<span key={`text-${lineIndex}-${partKey++}`}>{currentText}</span>);
            }
            currentText = '';
          }
          isInItalic = true;
          break;
        case 'ITALIC_END':
          if (currentText) {
            parts.push(<em key={`italic-${lineIndex}-${partKey++}`} className="markdown-italic">{currentText}</em>);
            currentText = '';
          }
          isInItalic = false;
          break;
      }

      currentIndex = match.index + match[0].length;
    }

    // Thêm text còn lại
    if (currentIndex < line.length) {
      currentText += line.substring(currentIndex);
    }

    if (currentText) {
      if (isInBold) {
        parts.push(<strong key={`bold-${lineIndex}-${partKey++}`} className="markdown-bold">{currentText}</strong>);
      } else if (isInItalic) {
        parts.push(<em key={`italic-${lineIndex}-${partKey++}`} className="markdown-italic">{currentText}</em>);
      } else {
        parts.push(<span key={`text-${lineIndex}-${partKey++}`}>{currentText}</span>);
      }
    }

    // Nếu không có parts, thêm dòng thuần
    if (parts.length === 0) {
      parts.push(<span key={`text-${lineIndex}-0`}>{line}</span>);
    }

    // Thêm dòng với styling phù hợp
    const lineClass = line.includes('•') ? 'message-line bullet-line' :
                     line.includes(':') && !line.includes('http') ? 'message-line title-line' :
                     'message-line';

    elements.push(
      <div key={`line-${lineIndex}`} className={lineClass}>
        {parts}
      </div>
    );
  });

  return elements;
};

const ChatBotWidget = () => {
  // Quản lý state
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

  // Quản lý trạng thái người dùng
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [userState, setUserState] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Các hàm tiện ích
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Tạo ID thiết bị duy nhất
  const generateDeviceId = useCallback(() => {
    return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }, []);

  // Dịch vụ LocalStorage để quản lý trạng thái người dùng
  const getUserState = useCallback(() => {
    try {
      const stored = localStorage.getItem('chatbot_user_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Xác thực schema
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
      console.warn('Lỗi đọc trạng thái người dùng từ localStorage:', error);
    }

    // Trả về trạng thái mặc định cho người dùng mới
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

  // Lưu trạng thái người dùng vào localStorage với xử lý lỗi
  const saveUserState = useCallback((state) => {
    try {
      // Kiểm tra localStorage có khả dụng không
      if (typeof Storage === 'undefined') {
        console.warn('localStorage không được hỗ trợ trong trình duyệt này');
        return false;
      }

      const stateToSave = {
        ...state,
        lastVisitDate: Date.now()
      };

      // Kiểm tra quota localStorage
      const serialized = JSON.stringify(stateToSave);
      if (serialized.length > 5000000) { // Giới hạn 5MB
        console.warn('Dữ liệu trạng thái người dùng quá lớn cho localStorage');
        return false;
      }

      localStorage.setItem('chatbot_user_state', serialized);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('Vượt quá quota localStorage:', error);
        // Thử xóa dữ liệu cũ và thử lại
        try {
          localStorage.removeItem('chatbot_user_state');
          localStorage.setItem('chatbot_user_state', JSON.stringify({
            ...state,
            chatHistory: state.chatHistory.slice(-10), // Chỉ giữ 10 tin nhắn cuối
            lastVisitDate: Date.now()
          }));
          return true;
        } catch (retryError) {
          console.error('Không thể lưu trạng thái người dùng sau khi dọn dẹp:', retryError);
          return false;
        }
      } else {
        console.error('Lỗi lưu trạng thái người dùng vào localStorage:', error);
        return false;
      }
    }
  }, []);

  // Đánh dấu người dùng đã tương tác
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

  // Khởi tạo trạng thái người dùng
  const initializeUserExperience = useCallback(() => {
    const state = getUserState();
    setUserState(state);

    if (state.hasInteracted) {
      // Người dùng quay lại đã từng tương tác với chatbot
      setHasUserInteracted(true);

      // Tải lịch sử chat
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
      // Người dùng chưa từng tương tác với chatbot
      setHasUserInteracted(false);

      // Luôn hiển thị popup chào mừng cho người dùng chưa tương tác sau delay
      setTimeout(() => {
        setShowWelcomePopup(true);
      }, 5000); // Hiển thị sau 5 giây
    }
  }, [getUserState, cleanMessageText]);

  // Trích xuất thông tin tour và hình ảnh từ văn bản tin nhắn
  const extractTourData = useCallback((messageText) => {
    const tourData = {
      images: [],
      tourInfo: null
    };

    // Tìm kiếm các pattern thông tin tour trong tin nhắn
    const tourPatterns = [
      /tour\s+([^,\n]+)/gi,
      /địa\s+điểm[:\s]+([^,\n]+)/gi,
      /giá[:\s]+([^,\n]+)/gi
    ];

    // Trích xuất hình ảnh từ tin nhắn nếu chứa URL hình ảnh hoặc tham chiếu tour
    const imageUrlPattern = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;
    const imageMatches = messageText.match(imageUrlPattern);

    if (imageMatches) {
      tourData.images = imageMatches.slice(0, 4); // Giới hạn 4 hình ảnh
    }

    return tourData;
  }, []);

  // Xử lý trạng thái tải hình ảnh
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

  // Mở modal hình ảnh
  const openImageModal = useCallback((images, startIndex = 0) => {
    setImageModal({
      isOpen: true,
      images: images,
      currentIndex: startIndex
    });
  }, []);

  // Đóng modal hình ảnh
  const closeImageModal = useCallback(() => {
    setImageModal({ isOpen: false, images: [], currentIndex: 0 });
  }, []);

  // Bật/tắt menu hệ thống
  const toggleSystemMenu = useCallback(() => {
    setShowSystemMenu(prev => !prev);
  }, []);

  // Đóng menu hệ thống khi click bên ngoài
  const closeSystemMenu = useCallback(() => {
    setShowSystemMenu(false);
  }, []);

  // Xử lý các hành động tour
  const handleTourAction = useCallback((action, tourData) => {
    switch (action) {
      case 'book':
        // Xử lý hành động đặt tour
        console.log('Đặt tour:', tourData);
        // Bạn có thể tích hợp với hệ thống đặt tour ở đây
        break;
      case 'details':
        // Xử lý hành động xem chi tiết
        console.log('Xem chi tiết tour:', tourData);
        // Bạn có thể hiển thị thông tin chi tiết tour
        break;
      case 'gallery':
        // Xử lý hành động xem thư viện ảnh
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

  // Đóng menu hệ thống khi click bên ngoài
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

  // Khởi tạo trải nghiệm người dùng và phiên chatbot
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Khởi tạo trải nghiệm người dùng trước
        initializeUserExperience();

        // Tải ngữ cảnh tour
        const contextResult = await getChatbotContext();
        if (contextResult.success) {
          const suggestions = generateQuickSuggestions(contextResult.data);
          setQuickSuggestions(suggestions);
        }

        // Thử lấy phiên hiện có từ localStorage
        const existingSessionId = ChatStorage.getSessionId();
        const userStateData = getUserState();

        if (existingSessionId && userStateData.hasInteracted) {
          setSessionId(existingSessionId);
          // Đối với người dùng quay lại, lịch sử chat đã được tải trong initializeUserExperience
        } else {
          // Tạo phiên mới cho người dùng mới hoặc khi không có phiên nào tồn tại
          const result = await createNewSession();
          if (result.success) {
            const newSessionId = result.data.sessionId;
            setSessionId(newSessionId);
            ChatStorage.saveSessionId(newSessionId);

            // Đối với người dùng lần đầu, không cần tin nhắn chào mừng
            if (userStateData.hasInteracted) {
              // Đây là người dùng quay lại không có phiên, thêm tin nhắn chào mừng thân thiện
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
        console.error('Lỗi khởi tạo phiên:', error);
        setError('Không thể khởi tạo phiên chat');
      }
    };

    initializeSession();
  }, [initializeUserExperience, getUserState]);

  // Xử lý gửi tin nhắn
  const handleSendMessage = async (messageText = null) => {
    const messageToSend = messageText || inputMessage.trim();

    if (!messageToSend || isLoading) return;

    // Đánh dấu người dùng đã tương tác nếu đây là tin nhắn đầu tiên
    if (!hasUserInteracted) {
      markUserAsInteracted();
    }

    // Ẩn gợi ý sau tin nhắn đầu tiên
    setShowSuggestions(false);

    // Phân tích ý định người dùng (để cải tiến trong tương lai)
    const intent = analyzeUserIntent(messageToSend);
    console.log('Ý định người dùng:', intent);

    const userMessage = {
      id: Date.now(),
      text: messageToSend,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    // Thêm tin nhắn người dùng vào chat
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      // Gửi tin nhắn đến API
      const result = await sendMessage(messageToSend, sessionId);

      if (result.success) {
        // Trích xuất dữ liệu tour từ phản hồi
        const tourData = extractTourData(result.data.reply);

        const botMessage = {
          id: Date.now() + 1,
          text: result.data.reply,
          isUser: false,
          timestamp: result.data.timestamp,
          tourData: tourData.images.length > 0 ? tourData : null
        };

        // Thêm trạng thái loading cho hình ảnh nếu có
        if (tourData.images.length > 0) {
          setLoadingImages(prev => new Set([...prev, ...tourData.images]));
        }

        setMessages(prev => [...prev, botMessage]);

        // Cập nhật session ID nếu thay đổi
        if (result.data.sessionId && result.data.sessionId !== sessionId) {
          setSessionId(result.data.sessionId);
          ChatStorage.saveSessionId(result.data.sessionId);
        }

        // Lưu vào local storage và trạng thái người dùng
        const updatedHistory = [...messages, userMessage, botMessage];
        ChatStorage.saveLocalHistory(sessionId || result.data.sessionId,
          updatedHistory.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text,
            timestamp: msg.timestamp
          }))
        );

        // Cập nhật trạng thái người dùng với lịch sử chat
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
        // Xử lý lỗi API
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



  // Xử lý click gợi ý
  const handleSuggestionClick = (suggestion) => {
    // Loại bỏ emoji và gửi tin nhắn sạch
    const cleanMessage = suggestion.replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, '').trim();
    handleSendMessage(cleanMessage);
  };

  // Xử lý nhấn phím
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Xóa lịch sử chat
  const handleClearChat = async () => {
    if (!sessionId) return;

    try {
      const result = await clearChatHistory(sessionId);
      if (result.success) {
        // Xóa tin nhắn
        setMessages([]);

        // Xóa tất cả dữ liệu local storage
        ChatStorage.clearLocalHistory(sessionId);
        ChatStorage.clearSessionId();

        // Xóa hoàn toàn trạng thái người dùng
        localStorage.removeItem('chatbot_user_state');

        // Reset tất cả states
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

        // Thêm tin nhắn chào mừng thân thiện cho khởi đầu mới
        const welcomeMessage = {
          id: Date.now(),
          text: 'Xin chào 👋 Tôi có thể giúp bạn tìm tour nào hôm nay?',
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Lỗi xóa chat:', error);
      setError('Không thể xóa lịch sử hội thoại');
    }
  };

  // Bắt đầu cuộc hội thoại mới
  const handleNewConversation = async () => {
    try {
      const result = await createNewSession();
      if (result.success) {
        const newSessionId = result.data.sessionId;

        // Xóa hoàn toàn phiên cũ
        if (sessionId) {
          ChatStorage.clearLocalHistory(sessionId);
        }
        ChatStorage.clearSessionId();

        // Xóa hoàn toàn trạng thái người dùng
        localStorage.removeItem('chatbot_user_state');

        // Reset trạng thái người dùng
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

        // Thiết lập phiên mới
        setSessionId(newSessionId);
        ChatStorage.saveSessionId(newSessionId);
        setMessages([]);
        setError(null);
        setShowSuggestions(true); // Hiển thị gợi ý lại

        // Thêm tin nhắn chào mừng thân thiện cho cuộc hội thoại mới
        const welcomeMessage = {
          id: Date.now(),
          text: 'Bắt đầu cuộc trò chuyện mới ✨\n\nXin chào! Tôi là ND Travel AI. Hãy cho tôi biết bạn muốn khám phá điểm đến nào nhé! 🌍',
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Lỗi cuộc hội thoại mới:', error);
      setError('Không thể tạo cuộc hội thoại mới');
    }
  };



  // Xử lý hành động popup chào mừng
  const handleWelcomeAction = (action) => {
    setShowWelcomePopup(false);

    if (action === 'start') {
      // Đánh dấu người dùng đã tương tác (điều này cũng đánh dấu popup đã được xem)
      markUserAsInteracted();

      // Mở chat và thêm tin nhắn chào mừng
      setIsOpen(true);
      setIsMinimized(false);

      // Thêm tin nhắn chào mừng vào chat
      const welcomeMessage = {
        id: Date.now(),
        text: 'Xin chào! 👋 Tôi là trợ lý ảo của ND Travel.\n\nTôi có thể giúp bạn:\n• Tìm kiếm tour du lịch phù hợp\n• Tư vấn điểm đến hot\n• So sánh giá tour\n• Giải đáp thắc mắc\n\nBạn muốn khám phá điểm đến nào? 🌍✈️',
        isUser: false,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
      setShowSuggestions(true);

      // Focus vào input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  };

  // Bật/tắt cửa sổ chat
  const toggleChat = useCallback(() => {
    setIsOpen(prev => {
      const newIsOpen = !prev;
      if (newIsOpen) {
        setIsMinimized(false);
        // Ẩn popup chào mừng nếu đang mở chat
        setShowWelcomePopup(false);

        // Nếu là người dùng lần đầu và không có tin nhắn, thêm tin nhắn chào mừng
        const currentState = getUserState();
        if (!currentState.hasInteracted && messages.length === 0) {
          const welcomeMessage = {
            id: Date.now(),
            text: 'Xin chào! Tôi là trợ lý ảo của ND Travel. Tôi có thể giúp bạn tìm kiếm và tư vấn các tour du lịch phù hợp. Bạn muốn đi du lịch ở đâu? 🌍✈️',
            isUser: false,
            timestamp: new Date().toISOString()
          };
          setMessages([welcomeMessage]);
        }

        // Focus input khi mở với delay phù hợp cho animation
        setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
      }
      return newIsOpen;
    });
  }, [getUserState, messages.length]);

  // Định dạng timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Component Nút Hành Động Tour
  const TourActionButtons = ({ tourData }) => {
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

  // Component Thư Viện Hình Ảnh Tour
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



  // Component Modal Hình Ảnh
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

    // Điều hướng bằng bàn phím
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

  // Tạo CSS classes động dựa trên trạng thái người dùng
  const getWidgetClasses = () => {
    const classes = ['chatbot-widget'];
    return classes.join(' ');
  };

  return (
    <div className={getWidgetClasses()}>
      {/* Nút Bật/Tắt Chat */}
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

      {/* Cửa Sổ Chat */}
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
              {/* Container Tin Nhắn */}
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
                        {parseAndCleanMarkdown(message.text)}
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

                {/* Chỉ báo đang tải */}
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

              {/* Gợi Ý Nhanh */}
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

              {/* Hiển Thị Lỗi */}
              {error && (
                <div className="chatbot-error">
                  <span>{error}</span>
                  <button onClick={() => setError(null)}>×</button>
                </div>
              )}

              {/* Khu Vực Nhập Liệu */}
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

      {/* Modal Hình Ảnh */}
      <ImageModal />

      {/* Popup Chào Mừng */}
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