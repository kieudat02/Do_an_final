import React, { useState } from 'react';
import './NewsLetter.scss';
import Image from '../../../assets/images/newsletters-person.jpg'

const NewsLetter = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    // Newsletter subscription functionality to be implemented
    // Add your newsletter logic
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  return (
    <section className="newsletter">
      <div className="newsletter__container">
        <div className="newsletter__title">
          Cơ hội giảm giá tới 50%
        </div>
        <p className="newsletter__description">
          Hãy đăng ký ngay để nhận ưu đãi bí mật từ ND Travel nhé!
        </p>
        
        <form className="newsletter__form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Nhập Email của bạn"
            className="newsletter__input"
            value={email}
            onChange={handleEmailChange}
            name="email"
            required
          />
          <button type="submit" className="newsletter__button">
            Đăng kí
          </button>
        </form>
        
        <div className="newsletter__person">
          <img
            src={Image}
            alt="Newsletter Person"
            className="newsletter__person-image"
            width="356"
            height="323"
          />
        </div>
      </div>
    </section>
  );
};

export default NewsLetter;