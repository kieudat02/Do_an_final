const mongoose = require("mongoose");
mongoose.set("strictQuery", true);
const dotenv = require("dotenv");
dotenv.config();

const dbState = [
    {
        value: 0,
        label: "Disconnected",
    },
    {
        value: 1,
        label: "Connected",
    },
    {
        value: 2,
        label: "Connecting",
    },
    {
        value: 3,
        label: "Disconnecting",
    },
];

const connection = async () => {
    try {
        const options = {
            user: process.env.DB_USER,
            pass: process.env.DB_PASSWORD,
            dbName: process.env.DB_NAME,
            serverSelectionTimeoutMS: 5000, // Timeout sau 5s thay vì 30s
            socketTimeoutMS: 45000, // Đóng socket sau 45s không hoạt động
            family: 4, // Sử dụng IPv4, bỏ qua cố gắng IPv6
        };

        await mongoose.connect(process.env.DB_HOST, options);
        const state = Number(mongoose.connection.readyState);
        console.log(
            dbState.find((f) => f.value === state).label,
            "to database"
        );
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.log("Error connecting to MongoDB:", error.message);
            console.log("Please check:");
            console.log("1. Your internet connection");
            console.log("2. MongoDB Atlas cluster is running");
            console.log("3. Your IP address is whitelisted in MongoDB Atlas");
            console.log("4. Your database credentials are correct");
        }
        process.exit(1);
    }
};

module.exports = connection;
