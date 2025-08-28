const Departure = require('../models/departureModel');

const departures = [
    {
        name: "Hà Nội",
        description: "Thủ đô của Việt Nam, điểm xuất phát chính cho các tour miền Bắc",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "TP. Hồ Chí Minh",
        description: "Thành phố lớn nhất Việt Nam, điểm xuất phát cho các tour miền Nam",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "Đà Nẵng",
        description: "Thành phố biển miền Trung, điểm xuất phát cho các tour Hội An, Huế",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "Nha Trang",
        description: "Thành phố biển nổi tiếng, điểm xuất phát cho các tour biển đảo",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "Đà Lạt",
        description: "Thành phố ngàn hoa, điểm xuất phát cho các tour cao nguyên",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "Hải Phòng",
        description: "Thành phố cảng miền Bắc, điểm xuất phát đi Hạ Long",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "Cần Thơ",
        description: "Thành phố lớn nhất đồng bằng sông Cửu Long",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "Phú Quốc",
        description: "Đảo ngọc phương Nam, điểm xuất phát cho tour biển đảo",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "Sapa",
        description: "Thị trấn miền núi phía Bắc, điểm xuất phát cho trekking",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "Hạ Long",
        description: "Thành phố du lịch Quảng Ninh, điểm xuất phát tour vịnh",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "Vinh",
        description: "Thành phố miền Trung, điểm xuất phát đi Phong Nha",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "Huế",
        description: "Cố đô Việt Nam, điểm xuất phát tour lịch sử văn hóa",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "Phan Thiết",
        description: "Thành phố biển miền Nam, nổi tiếng với đồi cát",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "Quy Nhon",
        description: "Thành phố biển miền Trung, điểm xuất phát tour Bình Định",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    },
    {
        name: "Buôn Ma Thuột",
        description: "Thủ phủ cà phê Việt Nam, điểm xuất phát tour Tây Nguyên",
        status: "Hoạt động",
        createdBy: "Admin",
        updatedBy: "Admin"
    }
];

const seedDepartures = async () => {
    try {
        // Clear existing data
        await Departure.deleteMany({});

        // Insert new data
        await Departure.insertMany(departures);
    } catch (error) {
        throw error;
    }
};

module.exports = { seedDepartures };
