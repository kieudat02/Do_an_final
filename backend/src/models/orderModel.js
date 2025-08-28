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
        enum: ['Tiền mặt', 'Mã QR'],
        default: 'Tiền mặt'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    },
    notes: {
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
        const prefix = `ORD${year}${month}${day}`;
        
        // Find the latest order with the same prefix
        const latestOrder = await this.constructor.findOne(
            { orderId: new RegExp('^' + prefix) },
            {},
            { sort: { orderId: -1 } }
        );
        
        // Generate the sequential number
        let sequentialNum = 1;
        if (latestOrder && latestOrder.orderId) {
            const latestSeq = parseInt(latestOrder.orderId.substring(9));
            if (!isNaN(latestSeq)) {
                sequentialNum = latestSeq + 1;
            }
        }
        
        // Create the orderId
        this.orderId = `${prefix}${sequentialNum.toString().padStart(4, '0')}`;
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
