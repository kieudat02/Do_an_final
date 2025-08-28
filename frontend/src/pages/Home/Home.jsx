import React, { useEffect } from "react";
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

  // Reset breadcrumb khi vào trang chủ
  useEffect(() => {
    setBreadcrumbData({
      categoryName: null,
      categorySlug: null,
      tourTitle: null,
      customItems: null
    });
  }, []);

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