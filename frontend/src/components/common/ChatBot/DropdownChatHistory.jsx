import React, { useState, useEffect } from 'react';
import { 
  getChatHistory, 
  deleteChatHistory, 
  searchChatHistory 
} from '../../../services/chatHistoryService';
import './DropdownChatHistory.css';

/**
 * Component hiển thị lịch sử cuộc trò chuyện trong dropdown menu
 * Compact và gọn nhẹ, phù hợp với system menu
 */
const DropdownChatHistory = ({ onSelectChat, currentSessionId, onClose }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);

  // Load lịch sử khi component mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    setIsLoading(true);
    try {
      const chatHistory = getChatHistory();
      setHistory(chatHistory.slice(0, 10)); // Hiển thị 10 cuộc trò chuyện gần nhất
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChat = async (id, event) => {
    event.stopPropagation();
    setShowConfirmDelete(id);
  };

  const confirmDelete = async (id) => {
    try {
      const result = deleteChatHistory(id);
      if (result.success) {
        loadHistory();
        setShowConfirmDelete(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleSelectChat = (chat) => {
    if (onSelectChat) {
      onSelectChat(chat);
    }
    if (onClose) {
      onClose();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Hôm qua';
    if (diffDays <= 7) return `${diffDays}d`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const getTagColor = (tag) => {
    const colors = {
      'tour': '#3b82f6',
      'booking': '#10b981',
      'price': '#f59e0b',
      'location': '#8b5cf6',
      'international': '#ef4444',
      'domestic': '#06b6d4',
      'support': '#6b7280',
      'general': '#6b7280'
    };
    return colors[tag] || '#6b7280';
  };

  if (isLoading) {
    return (
      <div className="dropdown-chat-history">
        <div className="dropdown-history-header">
          <span>Lịch sử cuộc trò chuyện</span>
        </div>
        <div className="dropdown-loading">
          <div className="spinner-small"></div>
          <span>Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dropdown-chat-history">
      <div className="dropdown-history-header">
        <span>Lịch sử cuộc trò chuyện</span>
        <span className="history-count">({history.length})</span>
      </div>



      {/* History List */}
      <div className="dropdown-history-content">
        {history.length === 0 ? (
          <div className="dropdown-empty-state">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>Chưa có lịch sử</span>
          </div>
        ) : (
          <div className="dropdown-history-list">
            {history.map((chat) => (
              <div 
                key={chat.id} 
                className={`dropdown-history-item ${chat.sessionId === currentSessionId ? 'current' : ''}`}
                onClick={() => handleSelectChat(chat)}
              >
                <div className="history-item-content">
                  <div className="history-item-main">
                    <h6 className="history-title-small">{chat.title}</h6>
                    <button
                      className="delete-button-small"
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      title="Xóa cuộc trò chuyện"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="history-meta-small">
                    <span className="message-count-small">{chat.messageCount} tin nhắn</span>
                    <span className="date-small">{formatDate(chat.updatedAt)}</span>
                    {chat.rating && (
                      <span className="rating-small">
                        {chat.rating}⭐
                      </span>
                    )}
                  </div>

                  <div className="history-tags-small">
                    {chat.tags.slice(0, 2).map((tag) => (
                      <span 
                        key={tag} 
                        className="tag-small"
                        style={{ backgroundColor: getTagColor(tag) }}
                      >
                        {tag}
                      </span>
                    ))}
                    {chat.tags.length > 2 && (
                      <span className="tag-more-small">+{chat.tags.length - 2}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <div className="confirm-delete-overlay-small">
          <div className="confirm-delete-modal-small">
            <h6>Xác nhận xóa</h6>
            <p>Bạn có chắc chắn muốn xóa cuộc trò chuyện này?</p>
            <div className="confirm-actions-small">
              <button 
                className="cancel-button-small"
                onClick={() => setShowConfirmDelete(null)}
              >
                Hủy
              </button>
              <button 
                className="confirm-button-small"
                onClick={() => confirmDelete(showConfirmDelete)}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownChatHistory;
