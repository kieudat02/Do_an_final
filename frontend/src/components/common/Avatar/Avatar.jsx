import React from 'react';
import './Avatar.scss';

const Avatar = ({ 
  src, 
  alt, 
  name, 
  size = 'medium', 
  className = '', 
  fallbackText = null 
}) => {
  // Lấy chữ cái đầu từ tên
  const getInitials = (name) => {
    if (!name) return '?';
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    
    // Lấy chữ cái đầu của từ đầu tiên và từ cuối cùng
    const firstInitial = words[0].charAt(0).toUpperCase();
    const lastInitial = words[words.length - 1].charAt(0).toUpperCase();
    
    return firstInitial + lastInitial;
  };

  // Tạo màu nền dựa trên tên
  const getBackgroundColor = (name) => {
    if (!name) return '#6c757d';
    
    const colors = [
      '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
      '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#f1c40f'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = fallbackText || getInitials(name || alt);
  const backgroundColor = getBackgroundColor(name || alt);

  return (
    <div className={`avatar avatar--${size} ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className="avatar__image"
          onError={(e) => {
            // Nếu ảnh lỗi, ẩn ảnh và hiển thị chữ cái đầu
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      
      <div 
        className="avatar__fallback"
        style={{ 
          backgroundColor,
          display: src ? 'none' : 'flex'
        }}
      >
        <span className="avatar__initials">{initials}</span>
      </div>
    </div>
  );
};

export default Avatar;
