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
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
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
        startDate: String, // Ngày khởi hành khách hàng chọn
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
    }
}, {
    timestamps: true
});

//Chỉ mục cho hiệu suất tốt hơn
orderSchema.index({ reviewToken: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ reviewed: 1 });

// Middleware to generate order ID before saving
orderSchema.pre('save', async function(next) {
    // Only generate orderId if it doesn't exist
    if (!this.orderId) {
        // Get date components for prefix
        const now = new Date();
        const year = now.getFullYear().toString().substr(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const prefix = `ND${year}${month}${day}`;
        
        let attempts = 0;
        let orderId;
        const maxAttempts = 10;
        
        // Retry logic để tránh race condition
        while (attempts < maxAttempts) {
            try {
                // Find the latest order with the same prefix
                const latestOrder = await this.constructor.findOne(
                    { orderId: new RegExp('^' + prefix) },
                    {},
                    { sort: { orderId: -1 } }
                );
                
                // Generate the sequential number
                let sequentialNum = 1;
                if (latestOrder && latestOrder.orderId) {
                    const latestSeq = parseInt(latestOrder.orderId.substring(8));
                    if (!isNaN(latestSeq)) {
                        sequentialNum = latestSeq + 1;
                    }
                }
                
                // Create short orderId 
                const seqStr = sequentialNum.toString().padStart(3, '0');
                orderId = `${prefix}${seqStr}`;
                
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
                    const fallbackSeq = now.getTime().toString().slice(-3);
                    const fallbackId = `${prefix}${fallbackSeq}`;
                    this.orderId = fallbackId;
                    break;
                }
            }
        }
        
        // Nếu vẫn không tạo được orderId, dùng fallback với timestamp
        if (!this.orderId) {
            const fallbackSeq = now.getTime().toString().slice(-3);
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
