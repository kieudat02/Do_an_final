const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const Tour = require('../models/tourModel');
require('dotenv').config();
require('../config/database');

const createOrders = async () => {
  try {
    // Delete existing orders
    await Order.deleteMany({});

    // Get some tour IDs to reference in orders
    const tours = await Tour.find().limit(3);
    if (tours.length === 0) {
      process.exit(1);
    }

    // Sample payment methods (phải khớp với enum trong model)
    const paymentMethods = ['Tiền mặt', 'MoMo'];
    
    // Sample order statuses
    const orderStatuses = ['pending', 'confirmed', 'cancelled'];
    
    // Sample payment statuses
    const paymentStatuses = ['pending', 'completed'];

    // Create 5 sample orders
    const orderData = [
      {
        customer: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        phone: '0987654321',
        address: '123 Đường Lê Lợi, Quận 1, TP.HCM',
        status: orderStatuses[1], // confirmed
        totalAmount: 15000000,
        items: [
          {
            tourId: tours[0]._id,
            name: tours[0].title,
            price: tours[0].price,
            quantity: 1,
            adults: 2,
            children: 1
          }
        ],
        paymentMethod: paymentMethods[1], // bank_transfer
        paymentStatus: paymentStatuses[1], // completed
        notes: 'Khách hàng yêu cầu phòng view biển',
        createdBy: 'admin'
      },
      {
        customer: 'Trần Thị B',
        email: 'tranthib@example.com',
        phone: '0912345678',
        address: '456 Đường Nguyễn Huệ, Quận 3, TP.HCM',
        status: orderStatuses[0], // pending
        totalAmount: 8500000,
        items: [
          {
            tourId: tours[1]._id,
            name: tours[1].title,
            price: tours[1].price,
            quantity: 1,
            adults: 1,
            children: 0
          }
        ],
        paymentMethod: paymentMethods[0], // cash
        paymentStatus: paymentStatuses[0], // pending
        notes: 'Khách hàng sẽ thanh toán khi check-in',
        createdBy: 'admin'
      },
      {
        customer: 'Lê Văn C',
        email: 'levanc@example.com',
        phone: '0965432109',
        address: '789 Đường Hai Bà Trưng, Quận 5, TP.HCM',
        status: orderStatuses[1], // confirmed
        totalAmount: 25000000,
        items: [
          {
            tourId: tours[2]._id,
            name: tours[2].title,
            price: tours[2].price,
            quantity: 1,
            adults: 3,
            children: 2
          }
        ],
        paymentMethod: paymentMethods[2], // credit_card
        paymentStatus: paymentStatuses[1], // completed
        notes: 'Khách hàng cần hỗ trợ đưa đón tại sân bay',
        createdBy: 'admin'
      },
      {
        customer: 'Phạm Thị D',
        email: 'phamthid@example.com',
        phone: '0932145678',
        address: '101 Đường Điện Biên Phủ, Quận Bình Thạnh, TP.HCM',
        status: orderStatuses[2], // cancelled
        totalAmount: 12000000,
        items: [
          {
            tourId: tours[0]._id,
            name: tours[0].title,
            price: tours[0].price,
            quantity: 1,
            adults: 2,
            children: 0
          }
        ],
        paymentMethod: paymentMethods[3], // momo
        paymentStatus: paymentStatuses[0], // pending
        notes: 'Khách hàng hủy do lịch công tác đột xuất',
        createdBy: 'admin'
      },
      {
        customer: 'Hoàng Văn E',
        email: 'hoangvane@example.com',
        phone: '0978563412',
        address: '202 Đường Cách Mạng Tháng 8, Quận 10, TP.HCM',
        status: orderStatuses[1], // confirmed
        totalAmount: 30000000,
        items: [
          {
            tourId: tours[1]._id,
            name: tours[1].title,
            price: tours[1].price,
            quantity: 1,
            adults: 4,
            children: 3
          },
          {
            tourId: tours[2]._id,
            name: tours[2].title,
            price: tours[2].price,
            quantity: 1,
            adults: 4,
            children: 3
          }
        ],
        paymentMethod: paymentMethods[1], // bank_transfer
        paymentStatus: paymentStatuses[1], // completed
        notes: 'Đoàn khách gia đình lớn, yêu cầu sắp xếp phòng gần nhau',
        createdBy: 'admin'
      }
    ];

    for (const orderItem of orderData) {
      const order = new Order(orderItem);
      await order.save();
    }

    // Disconnect from database only if this file is run directly
    if (require.main === module) {
      mongoose.disconnect();
    }
  } catch (error) {
    console.error('Error creating orders:', error);
    if (require.main === module) {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

// Run the seeder if this file is run directly
if (require.main === module) {
  // Make sure database connection is established
  const options = {
    user: process.env.DB_USER,
    pass: process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  };

  mongoose
    .connect(process.env.DB_HOST, options)
    .then(() => {
      return createOrders();
    })
    .then(() => {
      mongoose.disconnect();
    })
    .catch((error) => {
      console.error("❌ Lỗi:", error);
      mongoose.disconnect();
    });
}

module.exports = createOrders; 