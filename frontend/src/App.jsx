import React, { useEffect } from "react";
import Header from "./components/layout/Header/Header";
import Footer from "./components/layout/Footer/Footer";
import BreadcrumbWrapper from "./components/layout/Breadcrumb/BreadcrumbWrapper";
import { Outlet, useLocation } from "react-router-dom";
import ScrollToTop from "./components/common/ScrollToTop/ScrollToTop";
import BackToTop from "./components/common/BackToTop/BackToTop";
import ChatBotWidget from "./components/common/ChatBot/ChatBotWidget";

const App = () => {
  const location = useLocation();
  const isTourDetailPage = location.pathname.startsWith("/tour/");
  const isHomePage = location.pathname === "/";

  return (
    <>
      <Header noShadow={isTourDetailPage} noSticky={isHomePage}/>
      <ScrollToTop />
      <BreadcrumbWrapper />
      <main>
        <Outlet />
      </main>
      <BackToTop />
      <ChatBotWidget />
      <Footer />
    </>
  );
};

export default App;