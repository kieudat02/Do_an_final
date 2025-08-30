# 🏢 HỆ THỐNG QUẢN LÝ TOUR DU LỊCH ND TRAVEL

## 📋 **TỔNG QUAN HỆ THỐNG**
Hệ thống quản lý tour du lịch hoàn chỉnh với 2 phần chính:
- **Frontend React**: Website công khai cho khách hàng
- **Backend Admin**: Hệ thống quản trị với EJS templates
- **API Integration**: Kết nối FE-BE qua REST APIs

---

## 🎯 **TÍNH NĂNG FRONTEND REACT (PUBLIC WEBSITE)**

### **📱 Pages & Routes:**
```javascript
/                    // Trang chủ
/danh-muc-tour/:slug // Danh sách tour theo category
/tour/:id           // Chi tiết tour
/tours              // Tất cả tour
/tra-cuu-don-hang   // Tra cứu đơn hàng
/review             // Form đánh giá (token-based)
/thank-you          // Trang cảm ơn
```

### **🧩 Components Chính:**
- **Layout**: Header, Footer, Breadcrumb
- **Tour**: TourList, TourDetail, TourSearch, TourSection
- **Booking**: Order forms, Success pages
- **Common**: Banner, Features, ChatBot, BackToTop
- **Review**: ReviewForm với token validation

### **⚡ Features:**
- **Responsive Design**: Mobile-first approach
- **React Query**: Data caching và state management
- **SCSS Styling**: Component-based styling
- **SEO Friendly**: Meta tags và structured data
- **Performance**: Lazy loading, code splitting

---

## 🔗 **TÍNH NĂNG CHATBOT AI (FE ↔ BE)**

### **📤 Backend APIs:**
```javascript
POST /api/chat/message        // Gửi tin nhắn AI
GET  /api/chat/history/:id    // Lấy lịch sử chat
DELETE /api/chat/history/:id  // Xóa lịch sử
POST /api/chat/session        // Tạo session mới
GET  /api/chat/context        // Lấy context tour
GET  /api/chat/status         // Kiểm tra trạng thái
GET  /api/chat/search         // Tìm kiếm tour qua AI
GET  /api/chat/tours/:id      // Chi tiết tour qua AI
```

### **📥 Frontend Integration:**
- **AI Engine**: Google Gemini 1.5-flash
- **Service**: `geminiService.js`
- **Component**: `ChatBotWidget.jsx`
- **Features**:
  - Trò chuyện AI thông minh
  - Context từ database tour thực
  - Session management
  - Quick suggestions động
  - Intent analysis (6 loại)
  - Rate limiting (30 req/min)

### **🔄 Data Flow:**
1. **FE** → User message → **BE** `/api/chat/message`
2. **BE** → Gemini AI + Tour context → AI response
3. **FE** → Display + LocalStorage backup
4. **BE** → Session cache + Tour data cache (10 phút)

---

## 🏪 **TÍNH NĂNG TOUR MANAGEMENT (FE ↔ BE)**

### **📤 Backend APIs:**
```javascript
GET  /api/public/tours                    // Danh sách tour + filter + phân trang
GET  /api/public/tours/:id                // Chi tiết tour
GET  /api/public/tours/slug/:slug         // Tour theo category slug
GET  /api/public/tours/home-section/:id   // Tour theo home section
GET  /api/public/tours/:id/pricing/:date  // Giá tour theo ngày
GET  /api/public/tours/:id/reviews        // Đánh giá tour
GET  /api/public/tours/url/:urlPath       // Tour theo URL path động
```

### **📥 Frontend Integration:**
- **Service**: `TourService.js`
- **Components**: `TourList`, `TourDetail`, `TourReviews`, `TourSection`
- **Hooks**: `useTour`, `useHomeSections`, `useFeaturedTours`
- **Features**:
  - Danh sách tour với filter nâng cao
  - Chi tiết tour đầy đủ (itinerary, pricing, reviews)
  - Pricing động theo ngày khởi hành
  - Review system với rating stars
  - Phân trang và infinite scroll
  - Featured tours cho homepage
  - Tour theo home sections

### **🔄 Data Flow:**
1. **FE** → `getTours(params)` → **BE** `/api/public/tours`
2. **BE** → MongoDB query + populate relations → **FE**
3. **FE** → React Query caching + component render
4. **Real-time**: Tour data sync với admin changes

---

## 📍 **TÍNH NĂNG MASTER DATA (FE ↔ BE)**

### **📤 Backend APIs:**
```javascript
GET  /api/public/destinations              // Danh sách điểm đến
GET  /api/public/destinations/countries-by-continent  // Quốc gia theo châu lục
GET  /api/public/destinations/with-urls    // Destinations với URL structure
GET  /api/public/categories                // Danh sách danh mục
GET  /api/public/categories/slug/:slug     // Category theo slug
GET  /api/public/departures                // Điểm xuất phát
GET  /api/public/transportations           // Phương tiện di chuyển
GET  /api/public/home-sections             // Home sections cho trang chủ
```

### **📥 Frontend Integration:**
- **Services**: `DestinationService.js`, `CategoriesService.js`, `HomeSectionService.js`
- **Components**: Filter components, Navigation, Homepage sections
- **Features**:
  - Filter tour theo destination/category
  - Browse theo category slug
  - Quốc gia theo châu lục (cho tour quốc tế)
  - Home sections động cho trang chủ
  - URL structure cho SEO
  - Master data cho form booking

### **🔄 Data Flow:**
1. **FE** → Load master data → **BE** `/api/public/*`
2. **BE** → Cached master data → **FE**
3. **FE** → Populate dropdowns, filters, navigation

---

## 🛒 **TÍNH NĂNG BOOKING & ORDER (FE ↔ BE)**

### **📤 Backend APIs:**
```javascript
POST /api/public/order/create       // Tạo đơn hàng công khai
GET  /api/public/order/lookup       // Tra cứu đơn hàng
GET  /api/user/orders               // Đơn hàng của user
```

### **📥 Frontend Integration:**
- **Service**: `OrderService.js`
- **Components**: Booking forms, Order tracking
- **Features**:
  - Tạo đơn hàng với validation
  - Tra cứu đơn hàng bằng mã
  - Quản lý đơn hàng user
  - Email notification tự động

### **🔄 Data Flow:**
1. **FE** → Form booking → **BE** `/api/public/order/create`
2. **BE** → Validate + Save + Email → **FE** Order confirmation
3. **FE** → Tracking với order ID

---

## ⭐ **TÍNH NĂNG REVIEW & RATING (FE ↔ BE)**

### **📤 Backend APIs:**
```javascript
GET  /api/review/check-link         // Kiểm tra review link
POST /api/review/submit             // Gửi đánh giá
GET  /api/review/order-info         // Thông tin order để review
GET  /api/public/tours/:id/reviews  // Đánh giá của tour
```

### **📥 Frontend Integration:**
- **Service**: `reviewService.js`
- **Components**: `ReviewForm.jsx`, `TourReviews.jsx`
- **Features**:
  - Review form với token validation
  - Star rating system
  - Review display với pagination
  - Anonymous review từ email link

### **🔄 Data Flow:**
1. **Email link** → **FE** ReviewForm → **BE** token validation
2. **FE** → Submit review → **BE** → Save + Update tour rating
3. **FE** → Display reviews → **BE** → Paginated reviews

---

## 📧 **TÍNH NĂNG OTP & VERIFICATION (FE ↔ BE)**

### **📤 Backend APIs:**
```javascript
POST /api/email/otp/send        // Gửi OTP email
POST /api/email/otp/verify      // Verify OTP email
GET  /api/email/otp/check       // Kiểm tra email verified
POST /api/otp/send              // Gửi OTP SMS
POST /api/otp/verify            // Verify OTP SMS
GET  /api/otp/check             // Kiểm tra phone verified
```

### **📥 Frontend Integration:**
- **Email verification**: Trong registration flow
- **Phone verification**: Cho booking process
- **Security**: 2-factor authentication ready

---

## 🔧 **TÍNH NĂNG BACKEND ADMIN SYSTEM**

### **🖥️ Admin Panel (Server-side EJS):**
```javascript
// Web Routes (EJS Templates)
GET  /dashboard                 // Trang chủ admin
GET  /tour/*                   // Quản lý tour (CRUD)
GET  /category/*               // Quản lý danh mục
GET  /destination/*            // Quản lý điểm đến
GET  /departure/*              // Quản lý điểm xuất phát
GET  /transportation/*         // Quản lý phương tiện
GET  /orders/*                 // Quản lý đơn hàng
GET  /account/*                // Quản lý tài khoản
GET  /roles/*                  // Quản lý vai trò
GET  /permissions/*            // Quản lý quyền hạn
GET  /review/*                 // Quản lý đánh giá
```

### **🔐 Authentication & Authorization:**
- **Session-based**: Express-session + MongoDB store
- **Role System**: Super Admin, Admin, Manager, Viewer
- **Permission System**: Granular permissions per resource
- **Security**: Rate limiting, CSRF protection, input validation

### **📊 Admin APIs (Internal):**
```javascript
// CRUD APIs cho admin panel
GET/POST/PUT/DELETE /api/tours/*           // Tour management
GET/POST/PUT/DELETE /api/orders/*          // Order management
GET/POST/PUT/DELETE /api/users/*           // User management
GET/POST/PUT/DELETE /api/categories/*      // Category management
GET/POST/PUT/DELETE /api/destinations/*    // Destination management
GET/POST/PUT/DELETE /api/departures/*      // Departure management
GET/POST/PUT/DELETE /api/transportations/* // Transportation management
GET/POST/PUT/DELETE /api/reviews/*         // Review management
```

### **📁 File Management:**
- **Cloudinary Integration**: Image upload và optimization
- **Multi-file Upload**: Support multiple images per tour
- **Image Processing**: Auto resize, format conversion
- **CDN Delivery**: Fast image delivery globally

---

## 🔧 **TÍNH NĂNG KỸ THUẬT (FE ↔ BE)**

### **📤 Backend Infrastructure:**
```javascript
// File Upload
POST /upload/*                  // Cloudinary upload
// Rate Limiting: 30 req/min
// CORS: Configured for frontend
// Session: Express-session + MongoDB
// Error Handling: Comprehensive middleware
```

### **📥 Frontend Infrastructure:**
- **Axios Instance**: Centralized HTTP client
- **Base URL**: Environment-based configuration
- **Interceptors**: Request/Response processing
- **Error Handling**: Global error management
- **Credentials**: Cookie-based authentication

### **🔄 Core Integration:**
1. **Authentication**: Session cookies
2. **File Upload**: Multipart form data
3. **Error Handling**: Consistent error format
4. **CORS**: Proper cross-origin setup
5. **Rate Limiting**: Client-side aware

---

## 📋 **TÓM TẮT TÍNH NĂNG HOÀN CHỈNH**

### **✅ TÍNH NĂNG HOÀN CHỈNH (FE ↔ BE):**
1. **🤖 Chatbot AI** - Google Gemini + tour context + session management
2. **🏪 Tour System** - CRUD + search + filter + reviews + pricing
3. **🛒 Booking System** - Đặt tour + email notification + tracking
4. **⭐ Review System** - Token-based review + rating + moderation
5. **📧 OTP Verification** - Email + SMS cho booking process
6. **📍 Master Data** - Destinations, categories, departures, transportations
7. **🏠 Homepage** - Dynamic sections + featured tours + banners
8. **🔧 Admin Panel** - Full CRUD với role-based permissions

### **🏗️ KIẾN TRÚC HỆ THỐNG:**
- **Frontend**: React 19 + Vite + SCSS + React Query
- **Backend**: Node.js + Express + MongoDB + EJS templates
- **Authentication**: Session-based cho admin, token-based cho reviews
- **File Storage**: Cloudinary CDN integration
- **AI Integration**: Google Gemini 1.5-flash
- **Email Service**: Nodemailer với SMTP
- **Security**: Rate limiting, CSRF, input validation

### **📊 THỐNG KÊ TỔNG QUAN:**
- **Frontend Pages**: 7 routes chính
- **Backend APIs**: 40+ endpoints
- **Admin Routes**: 50+ server-side routes
- **Database Models**: 15+ MongoDB collections
- **File Upload**: Multi-file với Cloudinary
- **Real-time Features**: Chatbot AI, tour data sync

### **❌ TÍNH NĂNG CHƯA CÓ:**
1. **Payment Gateway** - VNPay/MoMo integration
2. **Direct Chat Booking** - Booking trong chatbot
3. **Real-time Notifications** - WebSocket/SSE
4. **Analytics Dashboard** - User behavior tracking
5. **Multi-language** - i18n support
6. **Mobile App** - React Native/Flutter
7. **Social Login** - Google/Facebook OAuth (có code nhưng chưa dùng)

### **🎯 ROADMAP PHÁT TRIỂN:**
1. **Phase 1**: Payment gateway integration
2. **Phase 2**: Chat booking functionality
3. **Phase 3**: Real-time notifications
4. **Phase 4**: Analytics và reporting
5. **Phase 5**: Mobile app development
