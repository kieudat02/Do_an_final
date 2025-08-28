🗺️ Ngữ cảnh dự án
Chúng ta đang xây dựng một trang web đặt tour du lịch ND Travel có tích hợp chatbot AI để hỗ trợ khách hàng.

🎯 Quy tắc chung
Ngôn ngữ: Luôn luôn phản hồi, giải thích và viết comment bằng tiếng Việt.

Tài liệu thiết kế: Tuân thủ nghiêm ngặt cấu trúc đã được định nghĩa và codebase hiện có.

Tính nhất quán: Duy trì sự nhất quán trong cách đặt tên, cấu trúc thư mục và phong cách code.

💻 Frontend: React 19 + Vite + SCSS
⚠️ QUAN TRỌNG: Dự án KHÔNG sử dụng Tailwind CSS mà sử dụng SCSS thuần.

Công nghệ Stack
Framework: React 19 (sử dụng function components với arrow functions).

Build Tool: Vite với @vitejs/plugin-react-swc.

Styling: SCSS thuần (mỗi component có file .scss riêng).

State Management: Redux Toolkit + React Redux (đã cài đặt, chưa sử dụng).

Data Fetching: TanStack React Query (đã cài đặt, chưa sử dụng).

HTTP Client: Axios.

Form Handling: React Hook Form + Yup validation.

UI Libraries: React Icons, React Loading Skeleton, Swiper.

Routing: React Router DOM v7.

Notifications: React Toastify.

Utils: js-cookie, moment (với locale tiếng Việt).

Cấu trúc thư mục 📂
src/
├── components/
│   ├── auth/          # Components xác thực (chưa phát triển)
│   ├── common/        # Components UI cơ bản (Button, Input, Modal...)
│   ├── layout/        # Layout components (Header, Footer, Breadcrumb)
│   └── tour/          # Tour-related components
├── pages/
│   ├── Home/          # Trang chủ (đã có)
│   ├── Auth/          # Trang xác thực
│   ├── Cart/          # Trang giỏ hàng
│   ├── Checkout/      # Trang thanh toán
│   ├── Profile/       # Trang hồ sơ
│   ├── TourDetail/    # Trang chi tiết tour
│   └── Tours/         # Trang danh sách tour
├── styles/
│   ├── main.scss      # File SCSS chính
│   └── globals/       # Global styles (_reset.scss, _base.scss...)
├── services/          # API services (trống - cần phát triển)
├── hooks/             # Custom hooks (trống - cần phát triển)
├── constants/         # Constants (trống - cần phát triển)
├── utils/             # Utility functions (trống - cần phát triển)
└── assets/
    ├── images/        # Hình ảnh
    └── icons/         # Icons
Cấu trúc Component & Styling 🎨
Component được viết dưới dạng file .jsx và import file .scss tương ứng.

Ví dụ: Banner.jsx

JavaScript

// src/components/common/Banner/Banner.jsx
import React from 'react';
import './Banner.scss'; // Import SCSS file

const BannerSlider = () => {
  // Component logic
  return (
    <div className="banner-slider">
      {/* JSX content với CSS classes từ SCSS */}
    </div>
  );
};

export default BannerSlider;
Ví dụ: Banner.scss

SCSS

// src/components/common/Banner/Banner.scss
.banner-slider {
  // Styles cho banner slider

  &__container {
    // Nested styles
  }

  &__item {
    // Item styles
  }
}
⚙️ Backend: Node.js + Express + MongoDB
Công nghệ Stack
Framework: Express.js.

Database: MongoDB với Mongoose ODM.

Authentication: JWT + Passport (hỗ trợ Google OAuth, Facebook).

File Upload: Multer + Cloudinary.

Email: Nodemailer.

Security: bcrypt, express-rate-limit, cors, express-validator.

Session: express-session + connect-mongo.

Utils: moment, slugify.

Cấu trúc thư mục 🗂️
src/
├── controllers/       # Logic xử lý request (tourController, authController...)
├── models/            # Mongoose schemas (tourModel, userModel...)
├── routes/            # API endpoints (tourRoute, authRoute...)
├── middleware/        # Custom middleware (auth, error handling...)
├── config/            # Cấu hình (database, environment variables...)
├── utils/             # Utility functions
├── constants/         # Constants
├── views/             # EJS templates (cho admin panel)
├── public/            # Static files
└── seeder/            # Database seeding scripts
Cấu trúc và Định dạng API 📡
Public API: GET /api/public/* (Không cần authentication).

GET /api/public/tours - Lấy danh sách tours.

GET /api/public/tours/:id - Lấy chi tiết tour.

Private API: POST /api/* (Cần authentication).

POST /api/login - Đăng nhập.

Các endpoint khác yêu cầu token JWT.

Định dạng Response chuẩn:

JSON

{
  "success": true,
  "message": "Thông báo bằng tiếng Việt",
  "data": { ... } // hoặc []
}
Cấu trúc Model (Ví dụ: tourModel.js)
JavaScript

const TourSchema = new Schema({
    title: { type: String, required: true },
    code: { type: String, unique: true },
    slug: { type: String, unique: true },
    images: [{ type: String }],
    status: { type: Boolean, default: true },
    highlight: { type: Boolean, default: false },
    price: { type: Number, required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    departure: { type: Schema.Types.ObjectId, ref: "Departure" },
    // ... các fields khác
    itinerary: [{
        day: { type: Number, required: true },
        title: { type: String, required: true },
        details: { type: String }
    }],
}, { timestamps: true, collection: "tour" });
🚀 Ưu tiên phát triển
Frontend
Phát triển services/: Tạo các hàm gọi API sử dụng Axios.

Tạo hooks/: Xây dựng custom hooks để fetch dữ liệu (sử dụng TanStack React Query).

Setup Redux: Cấu hình Redux store cho state toàn cục (giỏ hàng, user...).

Hoàn thiện Components: Xây dựng các components còn thiếu trong src/components/tour/.

Phát triển pages/: Hoàn thiện các trang còn lại (Tours, TourDetail, Cart...).

Tạo constants/: Định nghĩa các hằng số dùng chung.

Backend
API đã khá hoàn thiện.

Tối ưu hóa: Refactor và tối ưu các controllers hiện có.

Validation: Bổ sung và hoàn thiện validation cho các request body.

Error Handling: Cải thiện cơ chế bắt và trả về lỗi.

📋 Quy tắc đặt tên
Frontend
Components: PascalCase (ví dụ: BannerSlider, TourCard).

Files: PascalCase.jsx (ví dụ: Banner.jsx, Header.jsx).

SCSS Files: PascalCase.scss (ví dụ: Banner.scss, Header.scss).

CSS Classes: kebab-case hoặc theo quy tắc BEM (ví dụ: .banner-slider, .header__logo).

Backend
Controllers: camelCase.js (ví dụ: tourController.js).

Models: camelCase.js (ví dụ: tourModel.js).

Routes: camelCase.js (ví dụ: tourRoute.js).

📌 Lưu ý quan trọng
KHÔNG sử dụng Tailwind CSS. Chỉ dùng SCSS thuần.

Redux Toolkit và React Query đã được cài đặt nhưng chưa được sử dụng. Cần tích hợp vào dự án.

Backend đã khá hoàn thiện, trong khi Frontend đang trong giai đoạn phát triển cơ bản.

Cần tập trung phát triển các thư mục còn trống trong frontend: services/, hooks/, constants/, utils/.