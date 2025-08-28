import React, { useState, useEffect } from "react";
import "./BackToTop.scss";

// Xuất hiện khi người dùng cuộn xuống > 200px và có animation mượt mà
const BackToTop = () => {
  const [show, setShow] = useState(false);

  // Hàm lấy vị trí cuộn hiện tại - tương thích đa trình duyệt
  const getCurrentScrollPosition = () => {
    return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  };

  // Thiết lập scroll listener để theo dõi vị trí cuộn
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = getCurrentScrollPosition();
      setShow(scrollPosition > 200);
    };

    // Thêm event listeners cho nhiều targets để đảm bảo tương thích
    const scrollTargets = [window, document, document.body];
    scrollTargets.forEach(target => {
      target.addEventListener("scroll", handleScroll, { passive: true });
    });

    // Cleanup function
    return () => {
      scrollTargets.forEach(target => {
        target.removeEventListener("scroll", handleScroll);
      });
    };
  }, []);

  // Hàm cuộn mượt về đầu trang
  const smoothScrollToTop = () => {
    const currentScroll = getCurrentScrollPosition();

    if (currentScroll > 0) {
      // Tính toán bước cuộn để tạo hiệu ứng mượt mà
      const step = Math.max(currentScroll / 15, 20);
      const newPosition = Math.max(currentScroll - step, 0);

      // Áp dụng vị trí cuộn mới cho các container có thể
      if (document.documentElement.scrollTop > 0) {
        document.documentElement.scrollTop = newPosition;
      }
      if (document.body.scrollTop > 0) {
        document.body.scrollTop = newPosition;
      }

      // Tiếp tục animation nếu chưa đến đầu trang
      if (newPosition > 5) {
        requestAnimationFrame(smoothScrollToTop);
      } else {
        // Đảm bảo về đúng vị trí đầu trang
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    }
  };

  // Xử lý sự kiện click nút BackToTop
  const handleBackToTop = () => {
    try {
      smoothScrollToTop();
    } catch (error) {
      // Fallback: Cuộn trực tiếp nếu smooth scroll thất bại
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      try {
        window.scrollTo(0, 0);
      } catch (e) {
        // Silent fallback
      }
    }
  };

  return (
    show && (
      <button
        className="back-to-top"
        onClick={handleBackToTop}
        aria-label="Lên đầu trang"
        title="Lên đầu trang"
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M4 6.66666H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 13.3333H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 26.6667L16 17.3333L28 26.6667" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    )
  );
};

export default BackToTop;
