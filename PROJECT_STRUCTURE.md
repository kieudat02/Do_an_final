# 📋 Cấu Trúc Dự Án ND Travel

## 🗂️ Tổng Quan Dự Án

Dự án ND Travel là một trang web đặt tour du lịch với chatbot AI hỗ trợ khách hàng, được xây dựng với kiến trúc Fullstack hiện đại.

```
Fullstack/
├──     ├── 📁 utils/                # Utility functions
    │   ├── 📄 dynamicUrlGenerator.js
    │   ├── 📄 emailUtils.js
    │   ├── 📄 imageUtils.js
    │   ├── 📄 jwtUtils.js
    │   ├── 📄 otpUtil.js
    │   ├── 📄 priceCalculator.js
    │   ├── 📄 recalculateAllTourPrices.js
    │   ├── 📄 slugGenerator.js
    │   └── 📄 trackingUtils.jsd/         # React 19 + Vite + SCSS
├── ⚙️ backend/          # Node.js + Express + MongoDB
└── 📋 PROJECT_STRUCTURE.md
```

---

## 🎨 Frontend (React 19 + Vite + SCSS)

### 📦 Công Nghệ Sử Dụng

- **Framework**: React 19 (Function Components với Arrow Functions)
- **Build Tool**: Vite với @vitejs/plugin-react-swc
- **Styling**: SCSS thuần (không sử dụng Tailwind CSS)
- **State Management**: Redux Toolkit + React Redux
- **Data Fetching**: TanStack React Query + React Query DevTools
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form + Yup validation
- **UI Libraries**: React Icons, Lucide React, React Loading Skeleton, Swiper
- **Routing**: React Router DOM v7
- **Notifications**: React Toastify
- **Date Handling**: date-fns, moment, react-datepicker
- **Utils**: js-cookie, sass

### 📂 Cấu Trúc Thư Mục Frontend

```
frontend/
├── 📄 index.html                 # HTML template chính
├── 📄 package.json              # Dependencies và scripts
├── 📄 vite.config.js            # Cấu hình Vite
├── 📄 eslint.config.js          # Cấu hình ESLint
├── 📄 README.md                 # Tài liệu frontend
├── 📄 .env                      # Environment variables
├── 📄 .env.example              # Template cho environment variables
├── 📄 .gitignore                # Git ignore rules
├── 📁 public/
│   └── 🎯 vite.svg              # Icon Vite
└── 📁 src/
    ├── 📄 App.jsx               # Component gốc của ứng dụng
    ├── 📄 main.jsx              # Entry point của React app
    ├── 📁 assets/               # Tài nguyên tĩnh (hình ảnh, icons)
    ├── 📁 components/           # Các component tái sử dụng
    │   ├── 📁 common/           # Components UI cơ bản
    │   ├── 📁 layout/           # Layout components
    │   ├── 📁 SuggestedTours/   # Component gợi ý tour
    │   └── 📁 tour/             # Tour-related components
    ├── 📁 constants/            # Hằng số dùng chung
    ├── 📁 contexts/             # React Context providers
    ├── 📁 hooks/                # Custom React hooks
    ├── 📁 pages/                # Các trang chính của ứng dụng
    │   ├── 📁 Home/             # Trang chủ
    │   ├── 📁 OrderLookup/      # Trang tra cứu đơn hàng
    │   ├── 📁 Success/          # Trang thành công
    │   ├── 📁 TourDetail/       # Trang chi tiết tour
    │   └── 📁 Tours/            # Trang danh sách tour
    ├── 📁 services/             # API services (Axios calls)
    ├── 📁 styles/               # Global SCSS styles
    └── 📁 utils/                # Utility functions
```

### 🎯 Quy Tắc Đặt Tên Frontend

- **Components**: PascalCase (ví dụ: `BannerSlider`, `TourCard`)
- **Files**: PascalCase.jsx (ví dụ: `Banner.jsx`, `Header.jsx`)
- **SCSS Files**: PascalCase.scss (ví dụ: `Banner.scss`, `Header.scss`)
- **CSS Classes**: kebab-case hoặc BEM (ví dụ: `.banner-slider`, `.header__logo`)

### 📋 Scripts Frontend

```bash
npm run dev      # Chạy development server
npm run build    # Build production
npm run lint     # Kiểm tra code với ESLint
npm run preview  # Preview production build
```

---

## ⚙️ Backend (Node.js + Express + MongoDB)

### 📦 Công Nghệ Sử Dụng

- **Framework**: Express.js
- **Database**: MongoDB với Mongoose ODM
- **Authentication**: JWT + Passport (Google OAuth, Facebook)
- **File Upload**: Multer + Cloudinary
- **Email**: Nodemailer
- **Security**: bcrypt, express-rate-limit, cors, express-validator
- **Session**: express-session + connect-mongo
- **Template Engine**: EJS (cho admin panel)
- **Utils**: moment, slugify, sanitize-html, dompurify, jsdom
- **Development**: nodemon, concurrently, cross-env
- **OAuth**: passport, passport-google-oauth20, passport-facebook

### 📂 Cấu Trúc Thư Mục Backend

```
backend/
├── 📄 package.json              # Dependencies và scripts
└── 📁 src/
    ├── 📄 index.js              # Entry point của server
    ├── 📁 config/               # Cấu hình hệ thống
    │   ├── 📄 cloudinary.js     # Cấu hình Cloudinary
    │   ├── 📄 database.js       # Kết nối MongoDB
    │   └── 📄 viewEngine.js     # Cấu hình EJS
    ├── 📁 constants/            # Hằng số hệ thống
    │   ├── 📄 countries.js      # Danh sách quốc gia
    │   └── 📄 roles.js          # Định nghĩa roles
    ├── 📁 controllers/          # Logic xử lý request
    │   ├── 📄 accountController.js
    │   ├── 📄 authController.js
    │   ├── 📄 categoryController.js
    │   ├── 📄 departureController.js
    │   ├── 📄 destinationController.js
    │   ├── 📄 emailOtpController.js
    │   ├── 📄 homeController.js
    │   ├── 📄 orderController.js
    │   ├── 📄 otpController.js
    │   ├── 📄 permissionController.js
    │   ├── 📄 reviewController.js
    │   ├── 📄 roleController.js
    │   ├── 📄 socialAuthController.js
    │   ├── 📄 tourController.js
    │   ├── 📄 tourDetailController.js
    │   └── 📄 transportationController.js
    ├── 📁 middleware/           # Custom middleware
    │   ├── 📄 authMiddleware.js
    │   ├── 📄 currentPathMiddleware.js
    │   ├── 📄 jwtAuthMiddleware.js
    │   ├── 📄 permissionMiddleware.js
    │   ├── 📄 recaptchaMiddleware.js
    │   ├── 📄 securityMiddleware.js
    │   ├── 📄 sessionSecurityMiddleware.js
    │   ├── 📄 uploadMiddleware.js
    │   └── 📄 viewContextMiddleware.js
    ├── 📁 models/               # Mongoose schemas
    │   ├── 📄 categoriesModel.js
    │   ├── 📄 departureModel.js
    │   ├── 📄 destinationModel.js
    │   ├── 📄 emailOtpModel.js
    │   ├── 📄 homeSectionModel.js
    │   ├── 📄 orderModel.js
    │   ├── 📄 otpModel.js
    │   ├── 📄 permissonsModel.js
    │   ├── 📄 reviewModel.js
    │   ├── 📄 roleModel.js
    │   ├── 📄 rolePermissionModel.js
    │   ├── 📄 tourDetailModel.js
    │   ├── 📄 tourModel.js
    │   ├── 📄 transportationModel.js
    │   ├── 📄 userModel.js
    │   ├── 📄 verifiedEmailModel.js
    │   └── 📄 verifiedPhoneModel.js
    ├── 📁 public/               # Static files cho admin panel
    │   ├── 📁 css/              # Compiled CSS files
    │   │   ├── 📁 base/         # Base styles
    │   │   ├── 📁 components/   # Component styles
    │   │   └── 📁 layout/       # Layout styles
    │   ├── 📁 images/           # Static images
    │   ├── 📁 js/               # Client-side JavaScript
    │   ├── 📁 scss/             # SCSS source files
    │   │   ├── 📁 abstracts/    # Variables, mixins, functions
    │   │   ├── 📁 base/         # Reset, typography, utilities
    │   │   ├── 📁 components/   # Buttons, forms, modals
    │   │   ├── 📁 layout/       # Header, footer, sidebar
    │   │   ├── 📁 pages/        # Page-specific styles
    │   │   ├── 📁 themes/       # Theme configurations
    │   │   └── 📁 vendors/      # Third-party styles
    │   └── 📁 vendor/           # Third-party libraries
    │       └── 📁 ckeditor/     # CKEditor files
    ├── 📁 routes/               # API endpoints
    │   ├── 📄 accountRoute.js
    │   ├── 📄 api.js            # Private API routes
    │   ├── 📄 authRoute.js
    │   ├── 📄 categoryRoute.js
    │   ├── 📄 ckeditorRoutes.js
    │   ├── 📄 departureRoute.js
    │   ├── 📄 destinationRoute.js
    │   ├── 📄 homeSectionRoute.js
    │   ├── 📄 orderRoute.js
    │   ├── 📄 permissionRoute.js
    │   ├── 📄 publicApi.js      # Public API routes
    │   ├── 📄 reviewRoute.js
    │   ├── 📄 roleRoute.js
    │   ├── 📄 tourRoute.js
    │   ├── 📄 transportationRoute.js
    │   └── 📄 web.js            # Web routes cho admin
    ├── 📁 seeder/               # Database seeding
    │   ├── 📄 addReviewMuCangChai.js
    │   ├── 📄 categorySeeder.js
    │   ├── 📄 deleteOrdersSeeder.js
    │   ├── 📄 departureSeeder.js
    │   ├── 📄 destinationSeeder.js
    │   ├── 📄 homeSectionSeeder.js
    │   ├── 📄 homeSectionSeeder.js
    │   ├── 📄 orderSeeder.js
    │   ├── 📄 permissionSeeder.js
    │   ├── 📄 reviewSeeder.js
    │   ├── 📄 rolePermissionSeeder.js
    │   ├── 📄 roleSeeder.js
    │   ├── 📄 runReviewSeeder.js
    │   ├── 📄 seedAll.js
    │   ├── 📄 seedPermissionsAndRoles.js
    │   ├── 📄 tourSeeder.js
    │   ├── 📄 transportationSeeder.js
    │   └── 📄 userSeeder.js
    ├── 📁 services/             # Business logic services
    ├── 📁 styles/               # Additional styles
    ├── 📁 utils/                # Utility functions
    ├── � utils/                # Utility functions
    │   ├── 📄 emailUtils.js
    │   ├── 📄 imageUtils.js
    │   ├── 📄 jwtUtils.js
    │   ├── 📄 otpUtil.js
    │   ├── 📄 priceCalculator.js
    │   ├── 📄 recalculateAllTourPrices.js
    │   ├── 📄 slugGenerator.js
    │   └── 📄 trackingUtils.js
    └── 📁 views/                # EJS templates cho admin panel
        ├── 📄 account.ejs       # Trang quản lý tài khoản
        ├── 📄 category.ejs      # Trang quản lý categories
        ├── 📄 dashboard.ejs     # Dashboard admin
        ├── 📄 departure.ejs     # Trang quản lý điểm khởi hành
        ├── 📄 destination.ejs   # Trang quản lý điểm đến
        ├── 📄 homeSection.ejs   # Trang quản lý home sections
        ├── 📄 login.ejs         # Trang đăng nhập admin
        ├── 📄 order.ejs         # Trang quản lý đơn hàng
        ├── 📄 permissions.ejs   # Trang quản lý quyền
        ├── 📄 review.ejs        # Trang quản lý đánh giá
        ├── 📄 role.ejs          # Trang quản lý roles
        ├── 📄 tour.ejs          # Trang quản lý tours
        ├── 📄 transportation.ejs # Trang quản lý phương tiện
        ├── 📁 account/          # Form account operations
        ├── 📁 category/         # Form category operations
        ├── 📁 departure/        # Form departure operations
        ├── 📁 destination/      # Form destination operations
        ├── 📁 homeSection/      # Home section management
        │   ├── 📄 add.ejs       # Form thêm home section
        │   └── 📄 edit.ejs      # Form sửa home section
        ├── 📁 order/            # Form order operations
        ├── 📁 partials/         # Partial templates
        │   ├── 📄 action-buttons.ejs # Nút hành động chung
        │   ├── 📄 csrf-token.ejs     # CSRF token
        │   ├── 📄 header.ejs         # Header admin
        │   └── 📄 sidebar.ejs        # Sidebar admin
        ├── 📁 role/             # Form role operations
        ├── 📁 tour/             # Form tour operations
        └── 📁 transportation/   # Form transportation operations
```

### 🎯 Quy Tắc Đặt Tên Backend

- **Controllers**: camelCase.js (ví dụ: `tourController.js`)
- **Models**: camelCase.js (ví dụ: `tourModel.js`)
- **Routes**: camelCase.js (ví dụ: `tourRoute.js`)
- **Middleware**: camelCase.js (ví dụ: `authMiddleware.js`)

### 📋 Scripts Backend

```bash
npm start              # Chạy server với nodemon
npm run sass           # Watch và compile SCSS
npm run dev            # Chạy cả server và sass watch
npm run recalculate-prices # Tính lại giá tour
npm run seed-images    # Seed hình ảnh categories
npm run seed-tours     # Seed dữ liệu tours
```

---

## 🌐 Cấu Trúc API

### 🔓 Public API (Không cần Authentication)
```
GET /api/public/tours          # Lấy danh sách tours
GET /api/public/tours/:id      # Lấy chi tiết tour
GET /api/public/categories     # Lấy danh sách categories
GET /api/public/destinations   # Lấy danh sách destinations
```

### 🔒 Private API (Cần JWT Authentication)
```
POST /api/login               # Đăng nhập
POST /api/register            # Đăng ký
POST /api/tours              # Tạo tour mới
PUT /api/tours/:id           # Cập nhật tour
DELETE /api/tours/:id        # Xóa tour
POST /api/orders             # Tạo đơn hàng
GET /api/orders              # Lấy danh sách đơn hàng
```

### 📊 Response Format Chuẩn
```json
{
  "success": true,
  "message": "Thông báo bằng tiếng Việt",
  "data": { ... } // hoặc []
}
```

---

## 🎯 Trạng Thái Phát Triển

### ✅ Hoàn Thành
- ✅ Cấu trúc Backend cơ bản với Node.js + Express
- ✅ Models và Controllers đầy đủ
- ✅ Authentication và Authorization với JWT
- ✅ API endpoints cơ bản và public API
- ✅ Cấu trúc Frontend React 19 + Vite
- ✅ Component structure và layout
- ✅ Pages cơ bản (Home, Tours, TourDetail, OrderLookup, Success)
- ✅ Services và hooks setup
- ✅ Redux Toolkit và React Query integration

### 🔄 Đang Phát Triển
- 🔄 Hoàn thiện booking flow và checkout
- 🔄 Email verification và OTP system
- 🔄 Social authentication (Google, Facebook)
- 🔄 Review và rating system
- 🔄 Advanced filtering và search
- 🔄 Payment gateway integration
- 🔄 Admin dashboard improvements

### 📋 Ưu Tiên Tiếp Theo

#### Frontend
1. **Authentication Pages**: Tạo login/register pages với form validation
2. **Admin Panel**: Phát triển admin panel cho quản lý tours
3. **Profile Management**: Trang quản lý hồ sơ người dùng
4. **Cart & Checkout**: Hoàn thiện flow đặt tour
5. **Responsive Design**: Tối ưu cho mobile

#### Backend
1. **API Documentation**: Swagger/OpenAPI documentation
2. **Testing**: Unit và integration tests
3. **Performance**: Database indexing và query optimization
4. **Security**: Enhanced security measures
5. **Monitoring**: Logging và error tracking

---

## 🔧 Environment Variables

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_NAME=ND Travel
```

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nd_travel
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
---

## 📚 Tài Liệu Tham Khảo

- [React 19 Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [React Query Documentation](https://tanstack.com/query/)

---

*Cập nhật lần cuối: 24/08/2025*
