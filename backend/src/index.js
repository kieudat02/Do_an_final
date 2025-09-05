require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const cors = require('cors');
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

const app = express();
const port = process.env.PORT || 3000;
const hostname = process.env.HOST_NAME;

// CORS configuration
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5174'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session config
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.DB_HOST
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 60 * 1000 // 30 phút
    }
}));

// Flash messages
app.use(flash());

// Session security middleware
app.use(sessionSecurityMiddleware.preventCache);
app.use(sessionSecurityMiddleware.checkSession);
app.use(sessionSecurityMiddleware.checkMultipleSessions);

// CSRF protection - temporary disabled for file upload compatibility
app.use((req, res, next) => {
    res.locals.csrfToken = 'disabled-for-file-upload-compatibility';
    next();
});

// View engine and common middleware
configViewEngine(app);
app.use(currentPathMiddleware);
app.use(viewContextMiddleware);

// Routes
app.use('/api/public', publicApi);
app.use('/api/review', reviewPublicRoute);
app.use('/api/chat', chatbotRoute);
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

// Error handling
app.use((req, res) => {
    res.status(404).json({
        error: "Not Found",
        message: `Đường dẫn không tồn tại: ${req.originalUrl}`
    });
});

app.use((err, req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        console.error('Application error:', err);
    }
    res.status(500).json({
        error: "Internal Server Error",
        message: "Có lỗi xảy ra trên server. Vui lòng thử lại sau!"
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
