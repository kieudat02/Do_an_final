import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import './NotFound.scss';

const NotFound = () => {
  return (
    <div className="not-found">
      <div className="not-found__container">
        <div className="not-found__content">
          {/* Decorative Elements */}
          <div className="not-found__decoration">
            <div className="not-found__circle not-found__circle--1"></div>
            <div className="not-found__circle not-found__circle--2"></div>
            <div className="not-found__circle not-found__circle--3"></div>
          </div>
          
          {/* Main Content */}
          <div className="not-found__main">
            <div className="not-found__icon">
              <Search size={48} />
            </div>
            <div className="not-found__number">404</div>
            <h1 className="not-found__title">Trang không tìm thấy</h1>
            <p className="not-found__description">
              Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="not-found__actions">
            <Link to="/" className="not-found__btn not-found__btn--primary">
              <Home size={18} />
              Về trang chủ
            </Link>
            <button 
              onClick={() => window.history.back()} 
              className="not-found__btn not-found__btn--secondary"
            >
              <ArrowLeft size={18} />
              Quay lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
