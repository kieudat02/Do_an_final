const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true
    },
    customer: {
        type: String,
        required: [true, 'Tên khách hàng là bắt buộc']
    },
    email: {
        type: String,
        required: [true, 'Email là bắt buộc'],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
    },
    phone: {
        type: String,
        validate: {
            validator: function(v) {
                return /\d{10,11}/.test(v);
            },
            message: props => `${props.value} không phải là số điện thoại hợp lệ!`
        }
    },
    address: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled', 'expired'],
        default: 'pending'
    },
    totalAmount: {
        type: Number,
        required: [true, 'Tổng tiền là bắt buộc'],
        min: 0
    },
    items: [{
        tourId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tour'
        },
        name: String,
        price: Number,
        quantity: Number,
        adults: Number,
        children: Number,
        babies: Number,
        singleRooms: { type: Number, default: 0 }, 
        startDate: String, // Ngày khởi hành khách hàng chọn
        startTime: String, // Giờ khởi hành
        tourDetailId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TourDetail'
        }
    }],
    paymentMethod: {
        type: String,
        enum: ['Tiền mặt', 'MoMo', 'VNPay'],
        default: 'Tiền mặt'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refund'],
        default: 'pending'
    },
    // Thông tin thanh toán MoMo
    momoRequestId: {
        type: String
    },
    momoTransId: {
        type: String
    },
    momoResponseTime: {
        type: String
    },
    momoFailureReason: {
        type: String
    },
    // Thông tin thanh toán VNPay
    vnpayTxnRef: {
        type: String
    },
    vnpayTransactionNo: {
        type: String
    },
    vnpayBankCode: {
        type: String
    },
    vnpayPayDate: {
        type: String
    },
    vnpayCreateDate: {
        type: String
    },
    vnpayFailureReason: {
        type: String
    },
    paidAt: {
        type: Date
    },
    // Đếm số lần thanh toán thất bại
    paymentFailCount: {
        type: Number,
        default: 0
    },
    // Thông tin hoàn tiền
    refundBankInfo: {
        bankName: String,
        accountNumber: String,
        accountHolderName: String,
        customerPhone: String,
        notes: String,
        submittedAt: Date
    },
    stockDeducted: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String
    },
    // Thông tin hủy đơn hàng
    cancelledAt: {
        type: Date
    },
    cancelReason: {
        type: String
    },
    //Các trường hệ thống xem xét
    reviewToken: {
        type: String,
        unique: true,
        sparse: true 
    },
    reviewed: {
        type: Boolean,
        default: false
    },
    reviewTokenExpiredAt: {
        type: Date
    },
    createdBy: {
        type: String
    },
    updatedBy: {
        type: String
    },

    // TTL field - tự động xóa đơn hàng theo điều kiện
    expiresAt: {
        type: Date,
        default: function() {
            // Pending orders: tự động xóa sau 15 phút
            if (this.status === 'pending' && this.paymentStatus === 'pending') {
                return new Date(Date.now() + 15 * 60 * 1000);  // 15 phút
            }
            return null;
        }
    },
    
    // TTL field riêng cho các đơn hủy/hết hạn - tự động xóa sau 1 ngày
    deleteAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

//Chỉ mục cho hiệu suất tốt hơn
orderSchema.index({ reviewToken: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ reviewed: 1 });

// TTL Index - tự động xóa documents sau khi expire
orderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// TTL Index riêng cho deleteAt - xóa cancelled/expired orders
orderSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes cho performance
orderSchema.index({ status: 1, paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderId: 1 }, { unique: true });

// Middleware để cập nhật TTL khi status thay đổi
orderSchema.pre('save', function(next) {
    const DAY_IN_MS = 24 * 60 * 60 * 1000; // 1 ngày
    
    if (this.isModified('status') || this.isModified('paymentStatus')) {
        if (this.status === 'confirmed' || this.paymentStatus === 'completed') {
            // Xóa TTL khi order thành công
            this.expiresAt = undefined;
            this.deleteAt = undefined;
        } else if (this.status === 'cancelled' || this.status === 'expired') {
            // Đặt deleteAt cho orders đã hủy/hết hạn - xóa sau 1 ngày
            this.expiresAt = undefined; // Xóa expiresAt cũ
            this.deleteAt = new Date(Date.now() + DAY_IN_MS);
        } else if (this.status === 'pending' && this.paymentStatus === 'pending') {
            // Reset TTL nếu order quay về pending
            if (!this.expiresAt) {
                this.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
            }
            this.deleteAt = undefined; // Xóa deleteAt nếu có
        }
    }
    next();
});

// Middleware to generate order ID before saving
orderSchema.pre('save', async function(next) {
    // Chỉ tạo OrderID nếu nó không tồn tại
    if (!this.orderId) {
        const crypto = require('crypto');
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const prefix = `ND${year}${month}${day}`;

        let attempts = 0;
        let orderId;
        const maxAttempts = 10;

        // Retry logic để tránh race condition
        while (attempts < maxAttempts) {
            try {
                // Tạo mã ngẫu nhiên 4 ký tự (thay vì số tuần tự)
                // Sử dụng crypto để tăng tính bảo mật
                const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase().substring(0, 4);
                orderId = `${prefix}${randomPart}`;

                // Kiểm tra xem orderId đã tồn tại chưa
                const existingOrder = await this.constructor.findOne({ orderId });
                if (!existingOrder) {
                    this.orderId = orderId;
                    break;
                }

                attempts++;
                // Delay ngắn trước khi retry
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
                }
            } catch (error) {
                attempts++;
                if (attempts >= maxAttempts) {
                    // Fallback với timestamp
                    const fallbackSeq = now.getTime().toString().slice(-4);
                    const fallbackId = `${prefix}${fallbackSeq}`;
                    this.orderId = fallbackId;
                    break;
                }
            }
        }

        // Nếu vẫn không tạo được orderId, dùng fallback với timestamp
        if (!this.orderId) {
            const fallbackSeq = now.getTime().toString().slice(-4);
            this.orderId = `${prefix}${fallbackSeq}`;
        }
    }

    next();
});

// Method để tạo review token bảo mật
orderSchema.methods.generateReviewToken = function() {
    const crypto = require('crypto');

    // Chỉ tạo token nếu chưa có và chưa được review
    if (!this.reviewToken && !this.reviewed) {
        this.reviewToken = crypto.randomBytes(32).toString('hex');
        // Token hết hạn sau 7 ngày
        this.reviewTokenExpiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    return this.reviewToken;
};

// Method để kiểm tra token có hợp lệ không
orderSchema.methods.isReviewTokenValid = function(token) {
    if (!this.reviewToken || this.reviewed) {
        return false;
    }

    if (this.reviewToken !== token) {
        return false;
    }

    if (this.reviewTokenExpiredAt && new Date() > this.reviewTokenExpiredAt) {
        return false;
    }

    return true;
};

// Method để đánh dấu đã review
orderSchema.methods.markAsReviewed = function() {
    this.reviewed = true;
    // Có thể xóa token sau khi đã review để bảo mật
    // this.reviewToken = undefined;
    // this.reviewTokenExpiredAt = undefined;
};

module.exports = mongoose.model('Order', orderSchema);
