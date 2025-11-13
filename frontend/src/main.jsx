import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages/Home/Home.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { BreadcrumbProvider } from "./contexts/BreadcrumbContext.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Import global styles
import "./styles/main.scss";
import TourList from "./components/tour/TourList/TourList.jsx";
import TourDetail from "./pages/TourDetail/TourDetail.jsx";
import Success from "./pages/Success/Success.jsx";
import Payment from "./pages/Payment/Payment.jsx";
import OrderLookup from "./pages/OrderLookup/OrderLookup.jsx";
import Tours from "./pages/Tours/Tour.jsx";
import ReviewForm from "./pages/Review/ReviewForm.jsx";
import RetryPayment from "./components/payment/RetryPayment.jsx";
import NotFound from "./pages/NotFound/NotFound.jsx";
import CancellationPolicy from "./pages/CancellationPolicy/CancellationPolicy.jsx";
import PaymentMethods from "./pages/PaymentMethods/PaymentMethods.jsx";
import TermsOfService from "./pages/TermsOfService/TermsOfService.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy/PrivacyPolicy.jsx";
import ImageCopyright from "./pages/ImageCopyright/ImageCopyright.jsx";
import Contact from "./pages/Contact/Contact.jsx";

// Lazy load VNPayReturn component
const VNPayReturn = lazy(() => import("./pages/Payment/VNPayReturn.jsx"));


const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "/danh-muc-tour/:slug",
        element: <TourList />,
      },
      {
        path: "/tour/:slug",
        element: <TourDetail />,
      },
      {
        path: "/thank-you",
        element: <Success />,
      },
      {
        path: "/success",
        element: <Success />,
      },
      {
        path: "/payment/success",
        element: <Payment />,
      },
      {
        path: "/payment/success/:orderId",
        element: <Payment />,
      },
      {
        path: "/payment/vnpay-return",
        element: (
          <Suspense fallback={<div>Đang tải...</div>}>
            <VNPayReturn />
          </Suspense>
        ),
      },
      {
        path: "/tours",
        element: <Tours />,
      },
      {
        path: "/tra-cuu-don-hang",
        element: <OrderLookup />,
      },
      {
        path: "/review",
        element: <ReviewForm />,
      },
      {
        path: "/payment/retry/:orderId",
        element: <RetryPayment />,
      },
      {
        path: "/order-lookup",
        element: <OrderLookup />,
      },
      {
        path: "/chinh-sach-hoan-huy-tour",
        element: <CancellationPolicy />,
      },
      {
        path: "/huong-dan-thanh-toan",
        element: <PaymentMethods />,
      },
      {
        path: "/chinh-sach-quy-dinh-chung",
        element: <TermsOfService />,
      },
      {
        path: "/chinh-sach-bao-mat-thong-tin",
        element: <PrivacyPolicy />,
      },
      {
        path: "/ban-quyen-hinh-anh",
        element: <ImageCopyright />,
      },
      {
        path: "/lien-he",
        element: <Contact />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

//Tạo trường hợp QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, 
      cacheTime: 10 * 60 * 1000, 
    },
  },
});

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BreadcrumbProvider>
        <RouterProvider router={router} />
      </BreadcrumbProvider>
    </AuthProvider>
  </QueryClientProvider>
);