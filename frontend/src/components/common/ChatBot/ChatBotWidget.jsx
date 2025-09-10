import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  sendMessage,
  createNewSession,
  getChatbotContext,
  ChatStorage,
  lookupOrder,
  lookupOrderWithOTP,
  sendOTPForOrderLookup,
  getRetryPaymentLink,
  checkPaymentStatus
} from '../../../services/geminiService';
import {
  generateQuickSuggestions
} from '../../../utils/chatbotUtils';
import { PLACEHOLDER_IMAGES } from '../../../utils/placeholderImage';
import { stripHtmlTags, decodeHtmlEntities } from '../../../utils/htmlUtils';
import InlineSessionRating from './InlineSessionRating';
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

  // Đặc biệt bảo vệ các dòng trống có ý định (như giữa các tour)
  cleanedText = cleanedText.replace(/[ \t]+/g, ' ');
  
  // Giữ nguyên double line breaks cho tour formatting
  cleanedText = cleanedText.replace(/\n\s*\n\s*\n+/g, '\n\n'); // Chuẩn hóa multiple line breaks thành double
  cleanedText = cleanedText.replace(/\n\s+/g, '\n'); // Loại bỏ space ở đầu dòng

  return cleanedText;
};

// Hàm xử lý và làm sạch định dạng markdown trong văn bản tin nhắn
const parseAndCleanMarkdown = (text) => {
  if (!text || typeof text !== 'string') return [];

  // Xử lý text theo từng bước
  let processedText = text;

  // Thay thế dấu * đầu dòng bằng bullet point
  processedText = processedText.replace(/^\s*\*\s+/gm, '• ');

  // Xử lý **text** thành bold và loại bỏ dấu **
  processedText = processedText.replace(/\*\*([^*]+)\*\*/g, '|||BOLD_START|||$1|||BOLD_END|||');

  // Xử lý *text* thành italic và loại bỏ dấu *
  processedText = processedText.replace(/\*([^*]+)\*/g, '|||ITALIC_START|||$1|||ITALIC_END|||');

  // Loại bỏ tất cả dấu * còn lại
  processedText = processedText.replace(/\*/g, '');

  // Xử lý links - đánh dấu để xử lý sau
  processedText = processedText.replace(/(https?:\/\/[^\s]+)/g, '|||LINK_START|||$1|||LINK_END|||');

  // Xử lý separators (---)
  processedText = processedText.replace(/^\s*---\s*$/gm, '|||SEPARATOR|||');

  // Chia thành các dòng và xử lý
  const lines = processedText.split('\n');
  const elements = [];

  lines.forEach((line, lineIndex) => {
    // Xử lý separator
    if (line.trim() === '|||SEPARATOR|||') {
      elements.push(
        <div key={`separator-${lineIndex}`} className="message-separator">
          <hr />
        </div>
      );
      return;
    }

    // Xử lý dòng trống - thêm spacing
    if (line.trim() === '') {
      elements.push(
        <div key={`space-${lineIndex}`} className="message-spacing"></div>
      );
      return; 
    }

    // Parse các marker đặc biệt
    const parts = [];
    let currentIndex = 0;
    let partKey = 0;

    // Tìm tất cả markers
    const markerRegex = /\|\|\|(BOLD_START|BOLD_END|ITALIC_START|ITALIC_END|LINK_START|LINK_END)\|\|\|/g;
    let match;
    let isInBold = false;
    let isInItalic = false;
    let isInLink = false;
    let currentText = '';
    let linkUrl = '';

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
        case 'LINK_START':
          if (currentText) {
            if (isInBold) {
              parts.push(<strong key={`bold-${lineIndex}-${partKey++}`} className="markdown-bold">{currentText}</strong>);
            } else if (isInItalic) {
              parts.push(<em key={`italic-${lineIndex}-${partKey++}`} className="markdown-italic">{currentText}</em>);
            } else {
              parts.push(<span key={`text-${lineIndex}-${partKey++}`}>{currentText}</span>);
            }
            currentText = '';
          }
          isInLink = true;
          break;
        case 'LINK_END':
          if (currentText) {
            linkUrl = currentText;
            parts.push(
              <a
                key={`link-${lineIndex}-${partKey++}`}
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="message-link"
                onClick={(e) => {
                  // Cho phép Ctrl+Click mở tab mới, click thường mở cùng tab
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    window.location.href = linkUrl;
                  }
                }}
              >
                {linkUrl}
              </a>
            );
            currentText = '';
            linkUrl = '';
          }
          isInLink = false;
          break;
      }

      currentIndex = match.index + match[0].length;
    }

    // Thêm text còn lại
    if (currentIndex < line.length) {
      currentText += line.substring(currentIndex);
    }

    if (currentText) {
      if (isInLink) {
        // Nếu đang trong link nhưng chưa có LINK_END, xử lý như text thường
        parts.push(<span key={`text-${lineIndex}-${partKey++}`}>{currentText}</span>);
      } else if (isInBold) {
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

  const [isMinimized, setIsMinimized] = useState(false);
  const [quickSuggestions, setQuickSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [imageModal, setImageModal] = useState({ isOpen: false, images: [], currentIndex: 0 });
  const [loadingImages, setLoadingImages] = useState(new Set());
  const [showSystemMenu, setShowSystemMenu] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [messageRatings, setMessageRatings] = useState(new Map()); // Lưu trữ ratings cho từng message (legacy)

  // Session rating states
  const [showSessionRating, setShowSessionRating] = useState(false);
  const [sessionRatingTrigger, setSessionRatingTrigger] = useState('manual');
  const [sessionStats, setSessionStats] = useState({
    totalMessages: 0,
    userMessages: 0,
    botMessages: 0,
    sessionStartTime: null,
    avgResponseTime: 0,
    problemSolved: false,
    tourInfoProvided: false,
    mainTopics: []
  });

  // Quản lý trạng thái người dùng
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isUserLeavingSession, setIsUserLeavingSession] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  // State cho modal xác nhận xóa
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // State cho hệ thống đánh giá mới
  const [hasShownRating, setHasShownRating] = useState(false);
  const [ratingReminderTimeout, setRatingReminderTimeout] = useState(null);

  // State cho timeout logic khi chờ user phản hồi
  const [waitingForContinuationResponse, setWaitingForContinuationResponse] = useState(false);
  const [lastContinuationQuestionTime, setLastContinuationQuestionTime] = useState(null);
  const [continuationTimeout, setContinuationTimeout] = useState(null);

  // State cho xử lý lỗi
  const [error, setError] = useState(null);

  // State cho tính năng tra cứu đơn hàng và thanh toán
  const [orderLookupMode, setOrderLookupMode] = useState(false);
  const [orderLookupStep, setOrderLookupStep] = useState('initial'); // 'initial', 'awaiting_orderid', 'awaiting_contact', 'awaiting_otp', 'processing'
  const [tempOrderData, setTempOrderData] = useState({
    orderId: '',
    phone: '',
    email: '',
    contact: '', // Unified contact field (email or phone)
    otpCode: ''
  });
  const [lastOrderLookupRequest, setLastOrderLookupRequest] = useState(null);
  const [otpSent, setOtpSent] = useState(false);




  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Xử lý rating cho tin nhắn chatbot (legacy)
  const handleRatingSubmit = useCallback((ratingData) => {
    const { messageId, rating, feedback, success, error } = ratingData;

    if (success) {
      // Lưu rating vào state
      setMessageRatings(prev => new Map(prev.set(messageId, { rating, feedback })));

      // Rating submitted successfully
    } else {
      console.error(`❌ Failed to submit rating for message ${messageId}:`, error);
    }
  }, []);

  // Xử lý rating cho phiên hội thoại (NEW)
  const handleSessionRatingSubmit = useCallback((ratingData) => {
    const { sessionId: ratedSessionId, messageId, rating, feedback, success, error, isUpdate } = ratingData;

    if (success) {
      // Session rating submitted successfully

      // Cập nhật tin nhắn đánh giá để hiển thị trạng thái đã hoàn thành
      setMessages(prev => prev.map(msg =>
        msg.id === messageId && msg.isRating
          ? { ...msg, ratingCompleted: true, ratingValue: rating, ratingFeedback: feedback }
          : msg
      ));



      // Ẩn session rating modal nếu có
      setShowSessionRating(false);
    } else {
      console.error(`❌ Failed to submit session rating for session ${ratedSessionId}:`, error);
    }
  }, [messages]);

  // Cập nhật session stats
  const updateSessionStats = useCallback((updates) => {
    setSessionStats(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Kiểm tra điều kiện hiển thị session rating
  const shouldShowSessionRating = useCallback(() => {
    // Hiển thị sau khi có ít nhất 3 tin nhắn từ bot
    const botMessageCount = messages.filter(msg => !msg.isUser && !msg.isError).length;

    // Hoặc sau 5 phút tương tác
    const sessionDuration = sessionStats.sessionStartTime ?
      (Date.now() - new Date(sessionStats.sessionStartTime).getTime()) / 1000 / 60 : 0;

    return (botMessageCount >= 3 || sessionDuration >= 5) && !showSessionRating;
  }, [messages, sessionStats.sessionStartTime, showSessionRating]);

  // Trigger hiển thị session rating (legacy - cho modal)
  const triggerSessionRating = useCallback((trigger = 'manual') => {
    if (sessionId && shouldShowSessionRating()) {
      setSessionRatingTrigger(trigger);
      setShowSessionRating(true);
    }
  }, [sessionId, shouldShowSessionRating]);

  // Phát hiện khi kết thúc hỗ trợ chính
  const detectSupportCompletion = useCallback((botMessage) => {
    if (!botMessage || hasShownRating) return false;

    const text = botMessage.toLowerCase();

    // Các từ khóa cho thấy hỗ trợ đã hoàn thành - cải thiện và mở rộng
    const completionKeywords = [
      // Tin nhắn cảm ơn và chào tạm biệt
      'cảm ơn bạn đã sử dụng dịch vụ',
      'cảm ơn bạn đã liên hệ',
      'cảm ơn bạn đã trò chuyện',
      'chúc bạn có chuyến đi vui vẻ',
      'chúc bạn có kỳ nghỉ thú vị',
      'chúc bạn thành công',
      
      // Tin nhắn hỗ trợ liên tục
      'chúng tôi hỗ trợ 24/7',
      'chúng tôi luôn sẵn sàng hỗ trợ',
      'nếu có thắc mắc, vui lòng liên hệ',
      'mọi thắc mắc xin liên hệ',
      
      // Tin nhắn kết thúc tư vấn
      'hy vọng thông tin này hữu ích',
      'hy vọng đã giúp ích cho bạn',
      'thông tin trên hy vọng hữu ích',
      'mong rằng thông tin này hữu ích',
      
      // Tin nhắn hướng dẫn hành động tiếp theo
      'bạn có thể liên hệ để đặt tour',
      'hãy liên hệ để được tư vấn thêm',
      'xem chi tiết và đặt tour',
      'để đặt tour, vui lòng liên hệ',
      'có thể đặt tour qua website',
      
      // Tin nhắn xác nhận đã trả lời đầy đủ
      'đã trả lời đầy đủ câu hỏi',
      'thông tin đã cung cấp đầy đủ',
      'hy vọng đã giải đáp đầy đủ',
      'mong đã trả lời hết thắc mắc',
      
      // Tin nhắn mời đánh giá
      'đánh giá trải nghiệm của mình',
      'hãy để lại đánh giá',
      'chia sẻ trải nghiệm với chúng tôi',
    ];

    // Các pattern cho thấy bot đang hỏi có muốn tiếp tục không - mở rộng thêm
    const continuationQuestionPatterns = [
      // Câu hỏi trực tiếp về việc tiếp tục
      'bạn muốn tìm hiểu thêm',
      'có muốn xem thêm',
      'còn cần hỗ trợ gì',
      'có cần tư vấn thêm',
      'muốn biết thêm về',
      'có câu hỏi nào khác',
      'cần hỗ trợ gì thêm',
      'muốn tìm hiểu về tour khác',
      'có muốn tìm hiểu về',
      'muốn xem thêm tour',
      'cần tư vấn thêm về',
      'có gì khác cần hỗ trợ',
      'còn gì khác muốn biết',
      'muốn biết gì thêm',
      'có thắc mắc gì khác',
      'cần hỗ trợ thêm về',
      'muốn hỏi gì khác',
      'có câu hỏi gì nữa',
      'cần giúp gì khác',
      'muốn tư vấn về',
      
      // Pattern với các từ khóa ngắn gọn
      'có muốn không',
      'bạn có muốn',
      'bạn có cần',
      'có cần không',
      'muốn không',
      'cần không',
      'còn muốn',
      'còn cần',
      'bạn muốn',
      'bạn cần',
      
      // Pattern với dấu câu hỏi cuối câu (tín hiệu mạnh)
      'gì khác không?',
      'gì nữa không?',
      'thêm không?',
      'khác không?',
      'nữa không?',
    ];

    // Kiểm tra completion keywords
    const hasCompletionKeyword = completionKeywords.some(keyword => text.includes(keyword));

    // Kiểm tra continuation question patterns
    const hasContinuationQuestion = continuationQuestionPatterns.some(pattern => text.includes(pattern));

    // Nếu có continuation question, đánh dấu để bắt đầu timeout logic
    if (hasContinuationQuestion) {
      // Chỉ set flag nếu chưa có rating và không đang chờ phản hồi
      if (!hasShownRating && !waitingForContinuationResponse) {
        setWaitingForContinuationResponse(true);
        setLastContinuationQuestionTime(Date.now());
      }
    }

    // Logic xác định xem có nên hiển thị rating ngay lập tức không
    // Chỉ hiển thị ngay lập tức nếu có completion keyword và không phải continuation question
    const shouldShowRatingImmediately = hasCompletionKeyword && !hasContinuationQuestion;

    return shouldShowRatingImmediately;
  }, [hasShownRating, waitingForContinuationResponse]);

  // Kiểm tra xem cuộc trò chuyện có đang hoạt động không (để tránh gián đoạn)
  const isConversationActive = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityTime;
    const hasRecentUserMessage = messages.length > 0 && messages[messages.length - 1].isUser;
    const isCurrentlyTyping = isLoading;
    
    // Cuộc trò chuyện được coi là đang hoạt động nếu:
    // - Đang có hoạt động trong 10 giây qua
    // - Tin nhắn cuối cùng là từ user (chờ phản hồi bot)
    // - Đang typing/loading
    return timeSinceLastActivity < 10000 || hasRecentUserMessage || isCurrentlyTyping;
  }, [lastActivityTime, messages, isLoading]);

  // Thêm tin nhắn đánh giá vào cuộc trò chuyện (chỉ một lần)
  const addRatingMessage = useCallback((trigger = 'auto') => {
    if (!sessionId || hasShownRating) return;

    // Kiểm tra xem cuộc trò chuyện có đang hoạt động không (trừ khi user từ chối)
    if (trigger !== 'user_declined' && trigger !== 'manual' && isConversationActive()) {
      return;
    }

    // Sử dụng setMessages với callback để kiểm tra state mới nhất
    setMessages(prev => {
      // Kiểm tra xem đã có tin nhắn đánh giá trong state mới nhất chưa
      const hasRatingMessage = prev.some(msg => msg.isRating);
      if (hasRatingMessage) return prev; 

      const ratingMessage = {
        id: Date.now() + '_rating',
        text: '', 
        isUser: false,
        isRating: true, 
        timestamp: new Date().toISOString(),
        ratingTrigger: trigger,
        sessionStats: { ...sessionStats }
      };

      return [...prev, ratingMessage];
    });
    
    setHasShownRating(true); // Đánh dấu đã hiển thị
    setShowSessionRating(false); // Đảm bảo modal không hiển thị

    // Đặt reminder nhẹ sau 45 giây nếu chưa đánh giá
    const reminderTimeout = setTimeout(() => {
      if (!messages.some(msg => msg.isRating && msg.ratingCompleted)) {
        // Có thể thêm hiệu ứng nhẹ ở đây
      }
    }, 45000);

    setRatingReminderTimeout(reminderTimeout);
  }, [sessionId, hasShownRating, sessionStats, isConversationActive]);

  // Phát hiện khi user đang hỏi câu hỏi tiếp theo (để không gián đoạn bằng rating)
  const detectUserFollowUpQuestion = useCallback((userMessage) => {
    if (!userMessage) return false;

    const text = userMessage.toLowerCase().trim();

    // Các từ khóa cho thấy user đang hỏi tiếp
    const questionPatterns = [
      // Câu hỏi trực tiếp
      'còn', 'con',
      'thêm', 'them',
      'khác', 'khac',
      'nữa', 'nua',
      'gì', 'gi',
      'sao', 'thế nào', 'the nao',
      'bao nhiêu', 'bao nhieu',
      'ở đâu', 'o dau',
      'khi nào', 'khi nao',
      
      // Từ khóa tour/du lịch
      'tour',
      'địa điểm', 'dia diem',
      'điểm đến', 'diem den', 
      'giá', 'gia',
      'chi phí', 'chi phi',
      'thời gian', 'thoi gian',
      'lịch trình', 'lich trinh',
    ];

    // Dấu hiệu câu hỏi
    const hasQuestionMark = text.includes('?');
    const hasQuestionWords = questionPatterns.some(pattern => text.includes(pattern));
    const isShortResponse = text.length < 50; // Câu trả lời ngắn thường không phải decline

    // Nếu có dấu ? hoặc từ khóa câu hỏi và không phải câu trả lời ngắn về decline
    return hasQuestionMark || (hasQuestionWords && !isShortResponse);
  }, []);

  // Phát hiện khi user từ chối tiếp tục hoặc kết thúc cuộc trò chuyện
  const detectUserDecline = useCallback((userMessage) => {
    if (!userMessage || hasShownRating) return false;

    const text = userMessage.toLowerCase().trim();

    // Trước tiên kiểm tra xem có phải câu hỏi tiếp không
    if (detectUserFollowUpQuestion(userMessage)) {
      return false; // Không phải decline nếu là câu hỏi tiếp
    }

    // Các từ/cụm từ cho thấy user muốn kết thúc - cải thiện và mở rộng
    const declinePatterns = [
      // Từ chối đơn giản
      'không',
      'ko',
      'khong',
      'k',
      'no',
      
      // Kết thúc lịch sự
      'thôi',
      'thoi', 
      'đủ rồi',
      'du roi',
      'hết rồi',
      'het roi',
      'được rồi',
      'duoc roi',
      'ok rồi',
      'okay rồi',
      
      // Cảm ơn và tạm biệt
      'cảm ơn',
      'cam on',
      'cám ơn',
      'thanks',
      'thank you',
      'thank u',
      'tks',
      'ty',
      'tạm biệt',
      'tam biet',
      'chào nhé',
      'chao nhe',
      'chào',
      'chao',
      'bye',
      'goodbye',
      'good bye',
      'see you',
      'see ya',
      
      // Từ chối tiếp tục
      'không cần',
      'khong can',
      'không muốn',
      'khong muon',
      'không quan tâm',
      'khong quan tam',
      'không thích',
      'khong thich',
      'tạm thế',
      'tam the',
      'tạm thế thôi',
      'tam the thoi',
      'tạm đủ',
      'tam du',
      
      // Kết thúc phiên
      'kết thúc',
      'ket thuc',
      'dừng lại',
      'dung lai',
      'dừng',
      'dung',
      'stop',
      'end',
      'quit',
      'exit',
    ];

    // Kiểm tra exact match, contains, và remove punctuation
    const isDecline = declinePatterns.some(pattern => {
      const cleanText = text.replace(/[.,!?;:]/g, '').trim();
      return text === pattern ||
             text.includes(pattern) ||
             cleanText === pattern ||
             // Kiểm tra với các variant có dấu câu
             text === pattern + '.' ||
             text === pattern + '!' ||
             text === pattern + '?' ||
             // Kiểm tra pattern ở đầu câu
             text.startsWith(pattern + ' ') ||
             text.startsWith(pattern + ',') ||
             text.startsWith(pattern + '.') ||
             // Kiểm tra pattern ở cuối câu  
             text.endsWith(' ' + pattern) ||
             text.endsWith(',' + pattern) ||
             text.endsWith('.' + pattern);
    });

    return isDecline;
  }, [hasShownRating, detectUserFollowUpQuestion]);

  // Phát hiện khi người dùng chuẩn bị rời khỏi (chỉ nhắc nhẹ nếu chưa đánh giá)
  const detectUserLeaving = useCallback(() => {
    const timeSinceLastActivity = Date.now() - lastActivityTime;
    const hasEnoughMessages = messages.filter(msg => !msg.isUser && !msg.isError && !msg.isRating).length >= 2;
    const hasRatingMessage = messages.some(msg => msg.isRating);
    const hasCompletedRating = messages.some(msg => msg.isRating && msg.ratingCompleted);

    // Chỉ nhắc nhẹ nếu đã có rating message nhưng chưa hoàn thành
    if (timeSinceLastActivity > 60000 && hasEnoughMessages && hasRatingMessage && !hasCompletedRating && sessionId) {
      // Có thể thêm hiệu ứng nhẹ ở đây thay vì thêm tin nhắn mới
    }
  }, [lastActivityTime, messages, sessionId]);

  // Cập nhật thời gian hoạt động khi có tin nhắn mới
  useEffect(() => {
    if (messages.length > 0) {
      setLastActivityTime(Date.now());
    }
  }, [messages]);

  // Theo dõi hoạt động của người dùng
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const updateActivity = () => {
      setLastActivityTime(Date.now());
      setIsUserLeavingSession(false);
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, []);

  // Timer để kiểm tra định kỳ
  useEffect(() => {
    const interval = setInterval(() => {
      detectUserLeaving();
    }, 10000); // Kiểm tra mỗi 10 giây
    return () => clearInterval(interval);
  }, []); 

  // Cleanup timeout khi component unmount
  useEffect(() => {
    return () => {
      if (ratingReminderTimeout) {
        clearTimeout(ratingReminderTimeout);
      }
      if (continuationTimeout) {
        clearTimeout(continuationTimeout);
      }
    };
  }, [ratingReminderTimeout, continuationTimeout]);

  // Handle timeout logic khi chờ user phản hồi continuation question
  useEffect(() => {
    if (waitingForContinuationResponse && lastContinuationQuestionTime && !hasShownRating) {
      // Clear timeout cũ nếu có
      if (continuationTimeout) {
        clearTimeout(continuationTimeout);
      }

      // Set timeout mới - 25 giây (hợp lý hơn cho user suy nghĩ)
      const timeout = setTimeout(() => {
        // Kiểm tra một lần nữa xem có tin nhắn mới trong khoảng thời gian này không
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivityTime;
        
        // Chỉ hiển thị rating nếu thực sự không có hoạt động gần đây
        if (timeSinceLastActivity >= 20000) { // 20 giây không hoạt động
          // Reset waiting state
          setWaitingForContinuationResponse(false);
          setLastContinuationQuestionTime(null);

          // Hiển thị form đánh giá
          addRatingMessage('no_response_timeout');
        } else {
          // Nếu có hoạt động gần đây, reset waiting state nhưng không hiển thị rating
          setWaitingForContinuationResponse(false);
          setLastContinuationQuestionTime(null);
        }
      }, 25000); // 25 giây

      setContinuationTimeout(timeout);
    }

    return () => {
      if (continuationTimeout) {
        clearTimeout(continuationTimeout);
      }
    };
  }, [waitingForContinuationResponse, lastContinuationQuestionTime, hasShownRating, lastActivityTime, addRatingMessage]);

  // Reset timeout khi user gửi tin nhắn mới
  useEffect(() => {
    if (messages.length > 0 && waitingForContinuationResponse) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.isUser && !lastMessage.isRating) {
        // User đã phản hồi, reset waiting state
        setWaitingForContinuationResponse(false);
        setLastContinuationQuestionTime(null);

        if (continuationTimeout) {
          clearTimeout(continuationTimeout);
          setContinuationTimeout(null);
        }
      }
    }
  }, [messages, waitingForContinuationResponse]); 

  // Trích xuất chủ đề từ tin nhắn bot
  const extractTopics = useCallback((messageText) => {
    const topics = [];
    const text = messageText.toLowerCase();

    // Các từ khóa chủ đề
    const topicKeywords = {
      'tour': ['tour', 'du lịch', 'chuyến đi', 'hành trình'],
      'booking': ['đặt', 'booking', 'đặt chỗ', 'đặt tour'],
      'price': ['giá', 'chi phí', 'tiền', 'cost', 'price'],
      'location': ['địa điểm', 'nơi', 'chỗ', 'location'],
      'time': ['thời gian', 'ngày', 'giờ', 'time'],
      'support': ['hỗ trợ', 'giúp đỡ', 'support', 'help']
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics.slice(0, 3); // Giới hạn 3 chủ đề
  }, []);

  // ===== FUNCTIONS FOR ORDER LOOKUP & PAYMENT =====
  
  // Kiểm tra xem tin nhắn có phải yêu cầu tra cứu đơn hàng không
  const isOrderLookupRequest = useCallback((message) => {
    const orderKeywords = [
      'tra cứu đơn hàng', 'tra cuu don hang', 'kiểm tra đơn hàng', 'kiem tra don hang',
      'xem đơn hàng', 'xem don hang', 'tìm đơn hàng', 'tim don hang',
      'đơn hàng của tôi', 'don hang cua toi', 'order lookup', 'check order',
      'my order', 'find order', 'track order', 'order status', 'trạng thái đơn hàng',
      'trang thai don hang', 'thanh toán', 'thanh toan', 'payment', 'pay',
      'trả tiền', 'tra tien', 'chưa thanh toán', 'chua thanh toan'
    ];

    const lowerMessage = message.toLowerCase();
    return orderKeywords.some(keyword => lowerMessage.includes(keyword));
  }, []);

  // Kiểm tra yêu cầu thanh toán lại
  const isRetryPaymentRequest = useCallback((message) => {
    const retryPaymentKeywords = [
      'thanh toán lại', 'thanh toan lai', 'retry payment', 'pay again',
      'thanh toán lại đơn hàng', 'thanh toan lai don hang', 'trả tiền lại',
      'tra tien lai', 'tạo link thanh toán', 'tao link thanh toan',
      'link thanh toán', 'link thanh toan', 'payment link',
      'muốn thanh toán', 'muon thanh toan', 'cần thanh toán', 'can thanh toan',
      'có', 'co', 'đồng ý', 'dong y', 'ok', 'được', 'duoc', 'yes'
    ];

    const lowerMessage = message.toLowerCase().trim();
    return retryPaymentKeywords.some(keyword => lowerMessage.includes(keyword));
  }, []);

  // Xử lý luồng tra cứu đơn hàng
  const handleOrderLookupFlow = useCallback(async (message, userMessage) => {
    setOrderLookupMode(true);
    setOrderLookupStep('awaiting_orderid');

    // Thêm tin nhắn hướng dẫn
    const botMessage = {
      id: Date.now() + 1,
      text: `Tôi sẽ giúp bạn tra cứu đơn hàng! 🔍

Để tra cứu đơn hàng, bạn vui lòng cung cấp:
🎫 **Mã đơn hàng** (VD: ORD-20240101-001)
📱 **Email hoặc số điện thoại** đã đặt tour

Bạn có thể gửi thông tin theo định dạng:
"Mã: ORD-xxx-xxx,Email: abc@gmail.com"
"Mã: ORD-xxx-xxx,SĐT: 0123456789"

Hoặc gửi từng thông tin một cách riêng biệt. Hãy bắt đầu bằng **mã đơn hàng** của bạn:`,
      isUser: false,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, botMessage]);
  }, []);

  // Xử lý input trong quá trình tra cứu đơn hàng
  const handleOrderLookupInput = useCallback(async (message, userMessage) => {
    try {
      // Kiểm tra định dạng đầy đủ: "Mã: xxx, SĐT: xxx"
      const fullFormatMatch = message.match(/(?:mã|ma|order|ord)[:\s]*([A-Za-z0-9\-_]+).*?(?:sdt|số điện thoại|so dien thoai|phone)[:\s]*([0-9+\-\s()]+)/i);
      
      if (fullFormatMatch) {
        const orderId = fullFormatMatch[1].trim();
        const phone = fullFormatMatch[2].replace(/[\s\-()]+/g, '').trim();
        
        await processOrderLookup(orderId, phone);
        return;
      }

      // Xử lý từng bước
      switch (orderLookupStep) {
        case 'awaiting_orderid':
          // Kiểm tra định dạng mã đơn hàng
          const orderIdMatch = message.match(/(?:ORD|ord)[A-Za-z0-9\-_]*/i) || message.match(/[A-Za-z0-9\-_]{10,}/);
          
          if (orderIdMatch) {
            setTempOrderData(prev => ({ ...prev, orderId: orderIdMatch[0] }));
            setOrderLookupStep('awaiting_contact');
            
            const botMessage = {
              id: Date.now() + 1,
              text: `Cảm ơn! Tôi đã ghi nhận mã đơn hàng: **${orderIdMatch[0]}**

Bây giờ vui lòng cung cấp **email** hoặc **số điện thoại** đã đặt tour:`,
              isUser: false,
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, botMessage]);
          } else {
            const botMessage = {
              id: Date.now() + 1,
              text: `Mã đơn hàng không đúng định dạng. Vui lòng kiểm tra lại mã đơn hàng của bạn.

Mã đơn hàng thường có dạng: **ORD-20240101-001** hoặc tương tự.`,
              isUser: false,
              timestamp: new Date().toISOString(),
              isError: true
            };
            setMessages(prev => [...prev, botMessage]);
          }
          break;

        case 'awaiting_contact':
          // Kiểm tra email hoặc số điện thoại
          const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const phoneMatch = message.match(/[0-9+\-\s()]{8,}/);
          
          if (emailMatch) {
            const email = emailMatch[0];
            setTempOrderData(prev => ({ ...prev, contact: email }));
            await processSendOTP(tempOrderData.orderId, email);
          } else if (phoneMatch) {
            const phone = phoneMatch[0].replace(/[\s\-()]+/g, '').trim();
            setTempOrderData(prev => ({ ...prev, contact: phone }));
            await processSendOTP(tempOrderData.orderId, phone);
          } else {
            const botMessage = {
              id: Date.now() + 1,
              text: `Vui lòng nhập **email** hoặc **số điện thoại** hợp lệ.

📧 **Email:** example@gmail.com
📱 **Số điện thoại:** 0901234567`,
              isUser: false,
              timestamp: new Date().toISOString(),
              isError: true
            };
            setMessages(prev => [...prev, botMessage]);
          }
          break;

        case 'awaiting_otp':
          // Kiểm tra mã OTP (6 số)
          const otpMatch = message.match(/\b\d{6}\b/);
          
          if (otpMatch) {
            const otpCode = otpMatch[0];
            setTempOrderData(prev => ({ ...prev, otpCode }));
            await processOrderLookupWithOTP(tempOrderData.orderId, tempOrderData.contact, otpCode);
          } else {
            const botMessage = {
              id: Date.now() + 1,
              text: `❌ **Mã OTP không hợp lệ!**

Vui lòng nhập mã OTP **6 số** mà bạn vừa nhận được.

💡 **Ví dụ:** 123456

⏰ Mã OTP có hiệu lực trong **5 phút**. Nếu hết hạn, bạn có thể bắt đầu lại quá trình tra cứu.`,
              isUser: false,
              timestamp: new Date().toISOString(),
              isError: true
            };
            setMessages(prev => [...prev, botMessage]);
          }
          break;
      }
    } catch (error) {
      console.error('Error in handleOrderLookupInput:', error);
      resetOrderLookupMode();
    }
  }, [orderLookupStep, tempOrderData]);

  // Xử lý gửi OTP cho tra cứu đơn hàng
  const processSendOTP = useCallback(async (orderId, contact) => {
    setOrderLookupStep('processing');
    setIsLoading(true);

    try {
      const result = await sendOTPForOrderLookup(orderId, contact);

      if (result.success) {
        // OTP đã được gửi thành công
        setOtpSent(true);
        setOrderLookupStep('awaiting_otp');
        
        const isEmail = contact.includes('@');
        const contactType = isEmail ? 'email' : 'số điện thoại';
        
        const otpMessage = `📱 **Mã OTP đã được gửi!**

Chúng tôi vừa gửi mã xác thực 6 số đến ${contactType}: **${contact}**

Vui lòng nhập mã OTP để tiếp tục tra cứu đơn hàng.

⏰ Mã OTP có hiệu lực trong **5 phút**.`;

        const botMessage = {
          id: Date.now(),
          text: otpMessage,
          isUser: false,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        // Xử lý lỗi gửi OTP
        const errorMessage = {
          id: Date.now(),
          text: `❌ **Lỗi gửi OTP:**\n\n${result.error}`,
          isUser: false,
          isError: true,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, errorMessage]);
        resetOrderLookupMode();
      }
    } catch (error) {
      console.error('Error sending OTP for order lookup:', error);
      
      const errorMessage = {
        id: Date.now(),
        text: `❌ **Có lỗi xảy ra khi gửi mã OTP:**\n\n${error.message}`,
        isUser: false,
        isError: true,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
      resetOrderLookupMode();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Xử lý tra cứu đơn hàng với OTP
  const processOrderLookupWithOTP = useCallback(async (orderId, contact, otpCode) => {
    setOrderLookupStep('processing');
    setIsLoading(true);

    try {
      const result = await lookupOrderWithOTP(orderId, contact, otpCode);

      if (result.success) {
        const order = result.data;
        const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';
        const formatDate = (dateStr) => {
          if (!dateStr) return 'Chưa cập nhật';
          return new Date(dateStr).toLocaleDateString('vi-VN');
        };

        const orderInfo = `✅ **Tìm thấy đơn hàng!**

🎫 **Mã đơn hàng:** ${order.orderId}
👤 **Khách hàng:** ${order.customerName}
📧 **Email:** ${order.customerEmail}
📱 **Điện thoại:** ${order.customerPhone}

🌍 **Tour:** ${order.tourName}
📅 **Ngày khởi hành:** ${formatDate(order.departureDate)}
📅 **Ngày về:** ${formatDate(order.returnDate)}

👥 **Số người:** ${order.totalPeople} (${order.adults} người lớn${order.children > 0 ? `, ${order.children} trẻ em` : ''}${order.babies > 0 ? `, ${order.babies} em bé` : ''})

💰 **Tổng tiền:** ${formatPrice(order.totalAmount)}
💳 **Phương thức TT:** ${order.paymentMethod}

📊 **Trạng thái thanh toán:** ${getPaymentStatusText(order.paymentStatus)}
📋 **Trạng thái đơn hàng:** ${getOrderStatusText(order.status)}

📅 **Ngày đặt:** ${formatDate(order.createdAt)}`;

        // Thêm thông tin thanh toán và hỗ trợ
        let additionalInfo = '';
        
        if (order.paymentStatus !== 'completed' && ['MoMo', 'VNPay'].includes(order.paymentMethod) && order.status !== 'cancelled') {
          additionalInfo += `\n\n🔄 **Bạn có thể thanh toán lại đơn hàng này.**
Hãy cho tôi biết nếu bạn cần hỗ trợ tạo link thanh toán mới!`;
        } else if (order.paymentStatus === 'completed') {
          additionalInfo += `\n\n✅ **Đơn hàng đã được thanh toán thành công.**
Cảm ơn bạn đã sử dụng dịch vụ của NDTravel!`;
        }

        const botMessage = {
          id: Date.now() + 1,
          text: orderInfo + additionalInfo,
          isUser: false,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, botMessage]);
        setLastOrderLookupRequest({ orderId, contact, orderData: order });

      } else {
        const botMessage = {
          id: Date.now() + 1,
          text: `❌ ${result.error}

Vui lòng kiểm tra lại:
- **Mã đơn hàng** có đúng không?
- **Email/Số điện thoại** có chính xác không?
- **Mã OTP** có chính xác không?

Bạn có thể thử lại hoặc liên hệ hotline **0972 122 555** để được hỗ trợ!`,
          isUser: false,
          timestamp: new Date().toISOString(),
          isError: true
        };
        setMessages(prev => [...prev, botMessage]);
      }

    } catch (error) {
      console.error('Error in processOrderLookupWithOTP:', error);
      const botMessage = {
        id: Date.now() + 1,
        text: `❌ Có lỗi xảy ra khi tra cứu đơn hàng. Vui lòng thử lại sau hoặc liên hệ hotline **0972 122 555** để được hỗ trợ!`,
        isUser: false,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
      resetOrderLookupMode();
    }
  }, []);

  // Reset chế độ tra cứu đơn hàng
  const resetOrderLookupMode = useCallback(() => {
    setOrderLookupMode(false);
    setOrderLookupStep('initial');
    setTempOrderData({ orderId: '', phone: '', email: '', contact: '', otpCode: '' });
    setOtpSent(false);
  }, []);

  // Xử lý yêu cầu thanh toán lại
  const handleRetryPayment = useCallback(async (orderId, phone = null, email = null) => {
    setIsLoading(true);

    try {
      const result = await getRetryPaymentLink(orderId, phone, email);

      if (result.success) {
        const data = result.data;
        const botMessage = {
          id: Date.now() + 1,
          text: `✅ **Link thanh toán đã được tạo thành công!**

💳 **Phương thức:** ${data.paymentMethod}
💰 **Số tiền:** ${new Intl.NumberFormat('vi-VN').format(data.totalAmount)}đ

🔗 **Link thanh toán:**
${data.retryPaymentLink}

👉 Bạn có thể click vào link trên để thanh toán ngay!

⏰ **Lưu ý:** Link thanh toán có thời hạn sử dụng, vui lòng thanh toán sớm để tránh hết hạn.`,
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMessage]);

      } else {
        const botMessage = {
          id: Date.now() + 1,
          text: `❌ ${result.error}

Vui lòng liên hệ hotline **0972 122 555** để được hỗ trợ thanh toán!`,
          isUser: false,
          timestamp: new Date().toISOString(),
          isError: true
        };
        setMessages(prev => [...prev, botMessage]);
      }

    } catch (error) {
      console.error('Error in handleRetryPayment:', error);
      const botMessage = {
        id: Date.now() + 1,
        text: `❌ Có lỗi xảy ra khi tạo link thanh toán. Vui lòng thử lại sau hoặc liên hệ hotline **0972 122 555**!`,
        isUser: false,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper functions
  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'completed': return '✅ Đã thanh toán';
      case 'pending': return '⏳ Đang chờ thanh toán';
      case 'failed': return '❌ Thanh toán thất bại';
      case 'cancelled': return '🚫 Đã hủy';
      default: return status;
    }
  };

  const getOrderStatusText = (status) => {
    switch (status) {
      case 'pending': return '⏳ Chờ xử lý';
      case 'confirmed': return '✅ Đã xác nhận';
      case 'completed': return '🎉 Hoàn thành';
      case 'cancelled': return '🚫 Đã hủy';
      default: return status;
    }
  };

  // ===== END ORDER LOOKUP & PAYMENT FUNCTIONS =====



  // Các hàm tiện ích
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Tạo ID thiết bị duy nhất
  const generateDeviceId = useCallback(() => {
    return 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
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

  // Thêm tin nhắn chào mừng một cách thông minh
  const addWelcomeMessageIfNeeded = useCallback((forceAdd = false) => {
    // Chỉ thêm tin nhắn chào mừng nếu:
    // Được yêu cầu force add (từ welcome popup)
    // Hoặc không có tin nhắn nào và người dùng chưa tương tác
    if (forceAdd || (messages.length === 0 && !hasUserInteracted)) {
      const welcomeMessage = {
        id: Date.now(),
        text: 'Xin chào! 👋 Tôi là trợ lý ảo của ND Travel.\n\nTôi có thể giúp bạn:\n• Tìm kiếm tour du lịch phù hợp\n• Tư vấn điểm đến hot\n• So sánh giá tour\n• Giải đáp thắc mắc\n\nBạn muốn khám phá điểm đến nào? 🌍✈️',
        isUser: false,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
      return true;
    }
    return false;
  }, [messages.length, hasUserInteracted]);

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
    }
  }, [getUserState, saveUserState]);

  // Khởi tạo trạng thái người dùng
  const initializeUserExperience = useCallback(() => {
    const state = getUserState();

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
        // Bạn có thể tích hợp với hệ thống đặt tour ở đây
        break;
      case 'details':
        // Xử lý hành động xem chi tiết
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

            // KHÔNG thêm tin nhắn chào mừng tự động ở đây
            // Tin nhắn chào mừng sẽ được thêm khi người dùng thực sự mở chat
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
    // Đảm bảo messageToSend là string và xử lý edge cases
    let messageToSend;
    if (messageText !== null && messageText !== undefined) {
      // Nếu messageText được truyền vào, chuyển thành string
      messageToSend = String(messageText).trim();
    } else {
      // Nếu không, sử dụng inputMessage
      messageToSend = String(inputMessage || '').trim();
    }

    if (!messageToSend || isLoading) return;

    // Đánh dấu người dùng đã tương tác nếu đây là tin nhắn đầu tiên
    if (!hasUserInteracted) {
      markUserAsInteracted();
    }

    // Ẩn gợi ý sau tin nhắn đầu tiên
    setShowSuggestions(false);



    const userMessage = {
      id: Date.now(),
      text: messageToSend,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    // Kiểm tra nếu user đang hỏi câu hỏi tiếp theo - reset waiting state
    if (waitingForContinuationResponse && detectUserFollowUpQuestion(messageToSend)) {
      // Reset waiting state vì user vẫn muốn tiếp tục
      setWaitingForContinuationResponse(false);
      setLastContinuationQuestionTime(null);

      if (continuationTimeout) {
        clearTimeout(continuationTimeout);
        setContinuationTimeout(null);
      }
    }

    // Kiểm tra nếu user từ chối tiếp tục và đang chờ phản hồi continuation
    if (waitingForContinuationResponse && detectUserDecline(messageToSend)) {
      // Reset waiting state
      setWaitingForContinuationResponse(false);
      setLastContinuationQuestionTime(null);

      if (continuationTimeout) {
        clearTimeout(continuationTimeout);
        setContinuationTimeout(null);
      }

      // Thêm tin nhắn người dùng vào chat
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');

      // Hiển thị form đánh giá sau delay ngắn
      setTimeout(() => {
        addRatingMessage('user_declined');
      }, 1000);

      return; // Không gửi tin nhắn đến API
    }

    // Kiểm tra nếu user từ chối ngay cả khi không đang chờ continuation (fallback)
    // Chỉ áp dụng nếu không phải câu hỏi tiếp theo
    if (!waitingForContinuationResponse && detectUserDecline(messageToSend) && !detectUserFollowUpQuestion(messageToSend) && !hasShownRating) {
      // Kiểm tra xem có tin nhắn bot gần đây có chứa continuation question không
      const recentBotMessages = messages.filter(msg => !msg.isUser && !msg.isRating).slice(-2);
      const hasRecentContinuationQuestion = recentBotMessages.some(msg => {
        const text = msg.text.toLowerCase();
        return text.includes('muốn') || text.includes('cần') || text.includes('có') || text.includes('?');
      });

      if (hasRecentContinuationQuestion) {
        // Thêm tin nhắn người dùng vào chat
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');

        // Hiển thị form đánh giá sau delay ngắn
        setTimeout(() => {
          addRatingMessage('user_declined');
        }, 1000);

        return; // Không gửi tin nhắn đến API
      }
    }

    // Thêm tin nhắn người dùng vào chat
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Kiểm tra xem có phải yêu cầu tra cứu đơn hàng không
    if (isOrderLookupRequest(messageToSend)) {
      handleOrderLookupFlow(messageToSend, userMessage);
      return;
    }

    // Kiểm tra nếu đang trong quá trình tra cứu đơn hàng
    if (orderLookupMode) {
      handleOrderLookupInput(messageToSend, userMessage);
      return;
    }

    // Kiểm tra yêu cầu thanh toán lại
    if (isRetryPaymentRequest(messageToSend) && lastOrderLookupRequest) {
      const { orderId, contact, orderData } = lastOrderLookupRequest;
      const isEmail = contact && contact.includes('@');
      
      handleRetryPayment(
        orderId, 
        isEmail ? null : contact, // phone
        isEmail ? contact : null  // email
      );
      return;
    }

    setIsLoading(true);

    // Cập nhật session stats - user message
    updateSessionStats({
      totalMessages: sessionStats.totalMessages + 1,
      userMessages: sessionStats.userMessages + 1,
      sessionStartTime: sessionStats.sessionStartTime || new Date().toISOString()
    });

    const startTime = Date.now();

    try {
      // Gửi tin nhắn đến API
      const result = await sendMessage(messageToSend, sessionId);

      if (result.success) {
        const responseTime = Date.now() - startTime;

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

        // Cập nhật session stats - bot message
        const newBotMessages = sessionStats.botMessages + 1;
        const newTotalMessages = sessionStats.totalMessages + 1;
        const newAvgResponseTime = sessionStats.avgResponseTime === 0 ?
          responseTime :
          (sessionStats.avgResponseTime * (newBotMessages - 1) + responseTime) / newBotMessages;

        updateSessionStats({
          totalMessages: newTotalMessages,
          botMessages: newBotMessages,
          avgResponseTime: Math.round(newAvgResponseTime),
          tourInfoProvided: sessionStats.tourInfoProvided || (tourData.images.length > 0),
          // Phân tích chủ đề từ tin nhắn bot
          mainTopics: [...new Set([...sessionStats.mainTopics, ...extractTopics(result.data.reply)])]
        });

        // Phát hiện khi kết thúc hỗ trợ chính và hiển thị đánh giá
        if (detectSupportCompletion(result.data.reply)) {
          // Delay để người dùng đọc xong tin nhắn và đảm bảo không có hoạt động nào khác
          setTimeout(() => {
            // Kiểm tra lại xem cuộc trò chuyện có còn hoạt động không trước khi hiển thị rating
            if (!isConversationActive()) {
              addRatingMessage('support_completed');
            }
          }, 3000); // Tăng delay lên 3 giây để đảm bảo
        }

        // Cập nhật session ID nếu thay đổi
        if (result.data.sessionId && result.data.sessionId !== sessionId) {
          setSessionId(result.data.sessionId);
          ChatStorage.saveSessionId(result.data.sessionId);
        }

        // Cập nhật trạng thái người dùng
        const updatedHistory = [...messages, userMessage, botMessage];

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

    // Kiểm tra nếu tin nhắn rỗng sau khi clean (fallback)
    const messageToSend = cleanMessage || suggestion.trim();

    if (messageToSend) {
      handleSendMessage(messageToSend);
    }
  };

  // Xử lý nhấn phím
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };



  // Bắt đầu cuộc hội thoại mới
  const handleNewConversation = async () => {
    try {


      const result = await createNewSession();
      if (result.success) {
        const newSessionId = result.data.sessionId;

        // Xóa session ID cũ
        ChatStorage.clearSessionId();

        // Xóa hoàn toàn trạng thái người dùng
        localStorage.removeItem('chatbot_user_state');

        // Reset trạng thái người dùng
        setHasUserInteracted(false);

        // Thiết lập phiên mới
        setSessionId(newSessionId);
        ChatStorage.saveSessionId(newSessionId);
        setMessages([]);
        setShowSuggestions(true); // Hiển thị gợi ý lại


        // KHÔNG thêm tin nhắn chào mừng tự động
        // Tin nhắn chào mừng sẽ được thêm khi người dùng mở chat hoặc gửi tin nhắn đầu tiên
      }
    } catch (error) {
      console.error('Lỗi cuộc hội thoại mới:', error);
      setError('Không thể tạo cuộc hội thoại mới');
    }
  };

  // Xóa cuộc trò chuyện hiện tại
  const handleClearConversation = () => {
    if (messages.length === 0) return;
    setShowClearConfirmModal(true);
  };

  // Xác nhận xóa cuộc trò chuyện
  const confirmClearConversation = useCallback(() => {
    // Xóa tất cả dữ liệu lưu trữ
    if (sessionId) {
      // Xóa lịch sử local của session hiện tại
      try {
        const key = `chatbot_history_${sessionId}`;
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Cannot clear chat history from localStorage:', error);
      }
    }

    // Xóa trạng thái người dùng để reset hoàn toàn
    localStorage.removeItem('chatbot_user_state');

    // Xóa session ID
    ChatStorage.clearSessionId();

    // Reset tất cả state về trạng thái ban đầu
    setMessages([]);
    setShowSuggestions(true);
    setHasUserInteracted(false);
    setSessionId(null);
    setHasShownRating(false); // Reset trạng thái đánh giá
    setError(null); // Reset lỗi

    // Clear timeout nếu có
    if (ratingReminderTimeout) {
      clearTimeout(ratingReminderTimeout);
      setRatingReminderTimeout(null);
    }

    // Clear continuation timeout nếu có
    if (continuationTimeout) {
      clearTimeout(continuationTimeout);
      setContinuationTimeout(null);
    }

    // Reset continuation waiting state
    setWaitingForContinuationResponse(false);
    setLastContinuationQuestionTime(null);

    // Reset session stats
    setSessionStats({
      totalMessages: 0,
      userMessages: 0,
      botMessages: 0,
      sessionStartTime: null,
      avgResponseTime: 0,
      problemSolved: false,
      tourInfoProvided: false,
      mainTopics: []
    });

    // Tạo trạng thái người dùng mới hoàn toàn sạch
    const newUserState = {
      hasInteracted: false,
      hasSeenWelcomePopup: false,
      firstVisitDate: Date.now(),
      lastVisitDate: Date.now(),
      chatHistory: [],
      isDisabled: false,
      deviceId: generateDeviceId(),
      totalInteractions: 0
    };
    saveUserState(newUserState);

    // Đóng modal trước
    setShowClearConfirmModal(false);

    // Thêm tin nhắn chào mừng ngay lập tức với functional update
    setMessages(() => {
      const welcomeMessage = {
        id: Date.now(),
        text: 'Xin chào! 👋 Tôi là trợ lý ảo của ND Travel.\n\nTôi có thể giúp bạn:\n• Tìm kiếm tour du lịch phù hợp\n• Tư vấn điểm đến hot\n• So sánh giá tour\n• Giải đáp thắc mắc\n\nBạn muốn khám phá điểm đến nào? 🌍✈️',
        isUser: false,
        timestamp: new Date().toISOString()
      };
      return [welcomeMessage];
    });
  }, [sessionId, ratingReminderTimeout, continuationTimeout]);

  // Xử lý hành động popup chào mừng
  const handleWelcomeAction = useCallback((action) => {
    setShowWelcomePopup(false);

    if (action === 'start') {
      // Đánh dấu người dùng đã tương tác (điều này cũng đánh dấu popup đã được xem)
      markUserAsInteracted();

      // Mở chat và thêm tin nhắn chào mừng
      setIsOpen(true);
      setIsMinimized(false);

      // Thêm tin nhắn chào mừng vào chat (force add)
      addWelcomeMessageIfNeeded(true);
      setShowSuggestions(true);

      // Focus vào input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [markUserAsInteracted, addWelcomeMessageIfNeeded]);

  // Bật/tắt cửa sổ chat
  const toggleChat = useCallback(() => {
    setIsOpen(prev => {
      const newIsOpen = !prev;

      // Logic đóng chatbot đơn giản - không cần thêm đánh giá
      // Đánh giá sẽ được hiển thị tự động sau khi kết thúc hỗ trợ

      if (newIsOpen) {
        setIsMinimized(false);
        // Ẩn popup chào mừng nếu đang mở chat
        setShowWelcomePopup(false);

        // Thêm tin nhắn chào mừng nếu cần thiết
        addWelcomeMessageIfNeeded();

        // Focus input khi mở với delay phù hợp cho animation
        setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
      }
      return newIsOpen;
    });
  }, [addWelcomeMessageIfNeeded]);

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
                <div className="online-indicator"></div>
              </div>
              <div className="bot-info">
                <h4>Trợ lý ND Travel</h4>
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
                          handleClearConversation();
                          closeSystemMenu();
                        }}
                        disabled={!sessionId || messages.length === 0}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Xóa cuộc trò chuyện</span>
                      </button>

                      <button
                        className="menu-item"
                        onClick={() => {
                          addRatingMessage('manual');
                          closeSystemMenu();
                        }}
                        disabled={!sessionId || messages.length === 0 || messages.some(msg => msg.isRating)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Đánh giá cuộc trò chuyện</span>
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
                    
                    {message.isUser && (
                      <div className="user-message-avatar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
                        </svg>
                      </div>
                    )}
                    
                    <div className="message-content">
                      {/* Hiển thị InlineSessionRating cho tin nhắn đánh giá */}
                      {message.isRating ? (
                        <InlineSessionRating
                          sessionId={sessionId}
                          onRatingSubmit={handleSessionRatingSubmit}
                          trigger={message.ratingTrigger || 'auto'}
                          sessionStats={message.sessionStats || sessionStats}
                          messageId={message.id}
                        />
                      ) : (
                        <>
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
                        </>
                      )}

                      {/* Không hiển thị rating cho từng tin nhắn nữa */}
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
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isLoading}
                    aria-label="Gửi tin nhắn"
                    type="button"
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
                <h4>Trợ lý ND Travel</h4>
                <p>👋 Hôm nay bạn muốn đi đâu?</p>
              </div>
            </div>

            <div className="welcome-actions">
              <button
                className="welcome-action-btn primary"
                onClick={() => handleWelcomeAction('start')}
              >
                💬 Bắt đầu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa cuộc trò chuyện */}
      {showClearConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowClearConfirmModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Xác nhận xóa cuộc trò chuyện</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowClearConfirmModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>Bạn có chắc chắn muốn xóa toàn bộ cuộc trò chuyện này?</p>
              <p className="warning-text">Hành động này không thể hoàn tác.</p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowClearConfirmModal(false)}
              >
                Hủy
              </button>
              <button
                className="btn-confirm"
                onClick={confirmClearConversation}
              >
                Xóa cuộc trò chuyện
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBotWidget;