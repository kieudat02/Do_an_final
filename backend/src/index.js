require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const slowDown = require('express-slow-down');
const configViewEngine = require("./config/viewEngine");
const connection = require("./config/database");
const currentPathMiddleware = require('./middleware/currentPathMiddleware');
const viewContextMiddleware = require('./middleware/viewContextMiddleware');
const sessionSecurityMiddleware = require('./middleware/sessionSecurityMiddleware');

// Import routes
const webRoutes = require("./routes/web");
const authRoute = require('./routes/authRoute');
const tourRoute = require("./routes/tourRoute");
const categoryRoute = require("./routes/categoryRoute");
const homeSectionRoute = require("./routes/homeSectionRoute");
const departureRoute = require('./routes/departureRoute');
const destinationRoute = require('./routes/destinationRoute');
const transportationRoute = require('./routes/transportationRoute');
const roleRoute = require('./routes/roleRoute');
const accountRoute = require('./routes/accountRoute');
const orderRoute = require('./routes/orderRoute');
const apiRoute = require('./routes/api');
const publicApi = require('./routes/publicApi');
const reviewPublicRoute = require('./routes/reviewPublicRoute');
const ckeditorRoute = require('./routes/ckeditorRoutes');
const chatbotRoute = require('./routes/chatBotRoute');
const aiAnalyticsRoute = require('./routes/aiAnalyticsRoute');
const { orderLookupRateLimit } = require('./middleware/rateLimiter');

const app = express();
const port = process.env.PORT || 3000;
const hostname = process.env.HOST_NAME;

const server = app;

// Disable X-Powered-By header (security)
app.disable('x-powered-by');

// Helmet security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://code.jquery.com", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick, etc.)
            imgSrc: ["'self'", "data:", "https:", "https://res.cloudinary.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
            connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173', "https://cdn.jsdelivr.net"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
    },
    crossOriginEmbedderPolicy: false, // Để tương thích với Cloudinary
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.FRONTEND_URL_SECONDARY,
    process.env.BACKEND_URL || `http://localhost:${port}` // Backend's own URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow same-origin requests (server-side rendered pages, null origin from redirects)
        if (!origin || origin === 'null') return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            if (process.env.NODE_ENV === 'development') {
                console.log('CORS BLOCKED - Origin:', origin, 'Allowed:', allowedOrigins);
            }
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// MongoDB injection protection
app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`Sanitized key: ${key} from request`);
        }
    }
}));

// HTTP Parameter Pollution protection
app.use(hpp({
    whitelist: ['page', 'limit', 'sort', 'status', 'q', 'destination', 'transportation'] // Allow arrays for these params
}));

// Slow down middleware (gradual rate limiting)
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 100, // Bắt đầu slow down sau 100 requests
    delayMs: () => 500, // Thêm 500ms delay cho mỗi request sau đó
    maxDelayMs: 20000, // Max delay 20 seconds
    skipFailedRequests: false,
    skipSuccessfulRequests: false
});

app.use('/api/', speedLimiter);

// Session config
if (!process.env.SESSION_SECRET) {
    console.error('FATAL ERROR: SESSION_SECRET is not defined.');
    process.exit(1);
}

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.DB_HOST
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000 // 8 giờ
    }
}));

// Flash messages
app.use(flash());

// Session security middleware
app.use(sessionSecurityMiddleware.preventCache);
app.use(sessionSecurityMiddleware.checkSession);
app.use(sessionSecurityMiddleware.checkMultipleSessions);

// CSRF protection với exceptions
const csrfProtection = csrf({ cookie: true });

// Routes không cần CSRF (API public, file upload, webhooks)
const csrfExceptions = [
    '/api/public/',
    '/api/chat/',
    '/api/chatbot/',
    '/api/review/',
    '/api/momo/',
    '/api/vnpay/',
    '/api/orders/',
    '/ckeditor/upload',
    '/payment/'
];

app.use((req, res, next) => {
    // Kiểm tra xem route có nằm trong exceptions không
    const isException = csrfExceptions.some(path => req.path.startsWith(path));

    if (isException) {
        // Không áp dụng CSRF cho route này
        res.locals.csrfToken = 'not-required';
        return next();
    }

    // Áp dụng CSRF protection
    csrfProtection(req, res, (err) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: 'Invalid CSRF token',
                message: 'Bạn không có quyền thực hiện hành động này'
            });
        }
        res.locals.csrfToken = req.csrfToken();
        next();
    });
});

// View engine and common middleware
configViewEngine(app);
app.use(currentPathMiddleware);
app.use(viewContextMiddleware);

// Routes
app.use('/api/public', publicApi);
app.use('/api/review', reviewPublicRoute);
app.use('/api/chat', chatbotRoute);
app.use('/api/ai-analytics', aiAnalyticsRoute);
app.use('/api/public/retry-payment', require('./routes/retryPaymentRoute'));
// Order lookup route with rate limiting
app.use('/api/orders', orderLookupRateLimit, require('./routes/orderLookupRoute'));
app.use('/api', apiRoute);
app.use('/ckeditor', ckeditorRoute);
app.use("/", authRoute);
app.use("/", webRoutes);
app.use("/tour", tourRoute);
app.use("/category", categoryRoute);
app.use("/homeSection", homeSectionRoute);
app.use("/departure", departureRoute);
app.use('/destination', destinationRoute);
app.use('/transportation', transportationRoute);
app.use('/roles', roleRoute);
app.use('/account', accountRoute);
app.use('/orders', orderRoute);

// Route fallback cho VNPay return
app.get('/payment/vnpay-return', (req, res) => {
    const queryString = new URLSearchParams(req.query).toString();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/payment/vnpay-return?${queryString}`;
    
    res.redirect(redirectUrl);
});

// 404 Error Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Not Found",
        message: process.env.NODE_ENV === 'production'
            ? "Đường dẫn không tồn tại"
            : `Đường dẫn không tồn tại: ${req.originalUrl}`
    });
});

// Global Error Handler (Production-ready)
app.use((err, req, res, next) => {
    // Log chi tiết error (chỉ internal)
    if (process.env.NODE_ENV === 'development') {
        console.error('Error stack:', err.stack);
        console.error('Error details:', {
            message: err.message,
            status: err.status,
            url: req.originalUrl,
            method: req.method
        });
    } else {
        // Production: chỉ log message, không log stack
        console.error('Error:', err.message);
    }

    // Determine status code
    const statusCode = err.status || err.statusCode || 500;

    // Response (không leak thông tin nhạy cảm)
    res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
        message: process.env.NODE_ENV === 'production'
            ? (statusCode === 500 ? 'Có lỗi xảy ra trên server' : err.message)
            : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});


// Start server
(async () => {
    try {
        await connection();


        app.listen(port, hostname, () => {
            console.log(`Backend app listening on port http://${hostname}:${port}`);
        });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.log("Error connect to DB:", error);
        }
        process.exit(1);
    }
})();
