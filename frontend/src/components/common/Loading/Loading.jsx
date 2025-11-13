import React from 'react';
import './Loading.scss';

const Loading = ({ 
  size = 'medium', 
  text = 'Đang tải...', 
  overlay = false, 
  className = '',
  variant = 'spinner' 
}) => {
  const sizeClasses = {
    small: 'loading--small',
    medium: 'loading--medium',
    large: 'loading--large'
  };

  const variantClasses = {
    spinner: 'loading--spinner',
    dots: 'loading--dots',
    pulse: 'loading--pulse'
  };

  const baseClass = `loading ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  const containerClass = overlay ? `loading-overlay ${baseClass}` : baseClass;

  const renderSpinner = () => (
    <div className="loading__spinner">
      <div className="loading__spinner-circle"></div>
    </div>
  );

  const renderDots = () => (
    <div className="loading__dots">
      <div className="loading__dot"></div>
      <div className="loading__dot"></div>
      <div className="loading__dot"></div>
    </div>
  );

  const renderPulse = () => (
    <div className="loading__pulse">
      <div className="loading__pulse-circle"></div>
    </div>
  );

  const renderVariant = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={containerClass}>
      <div className="loading__content">
        {renderVariant()}
        {text && <p className="loading__text">{text}</p>}
      </div>
    </div>
  );
};

export default Loading;
