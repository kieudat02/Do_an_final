import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BannerSlider from "../../components/common/Banner/Banner";
import TourSearch from "../../components/tour/TourSearch/TourSearch";
import Features from "../../components/common/Features/Features";
import TourSection from "../../components/tour/TourSection/TourSection";
import Discover from "../../components/common/Features/Discover";
import NewsLetter from "../../components/common/Features/NewsLetter";
import { useBreadcrumb } from "../../contexts/BreadcrumbContext";

import "./Home.scss";

const Home = () => {
  const { setBreadcrumbData } = useBreadcrumb();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Kiểm tra xem có phải VNPay return về trang chủ không
  useEffect(() => {
    const vnpayResponseCode = searchParams.get('vnp_ResponseCode');
    const vnpayTxnRef = searchParams.get('vnp_TxnRef');
    
    if (vnpayResponseCode && vnpayTxnRef) {
      // Redirect đến VNPayReturn để xử lý đúng
      const currentUrl = window.location.href;
      const newUrl = currentUrl.replace(window.location.pathname, '/payment/vnpay-return');
      
      window.location.href = newUrl;
      return;
    }
  }, [searchParams, navigate]);

  // Reset breadcrumb khi vào trang chủ
  useEffect(() => {
    setBreadcrumbData({
      categoryName: null,
      categorySlug: null,
      tourTitle: null,
      customItems: null
    });
  }, [setBreadcrumbData]);

  return (
    <>
        <div className="home-page">
            <BannerSlider />
            <TourSearch />
            <Features />
            <TourSection />
            <Discover />
            <NewsLetter />
        </div>
    </>
  );
};

export default Home;