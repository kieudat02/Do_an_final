const mongoose = require("mongoose");
const { Schema } = mongoose;

const TourDetailSchema = new Schema({
    tourId: { type: Schema.Types.ObjectId, ref: "Tour", required: true },
    adultPrice: { type: Number, required: true },                // Giá người lớn
    childrenPrice: { type: Number, default: 0 },                 // Giá trẻ em
    childPrice: { type: Number, default: 0 },                    // Giá trẻ nhỏ
    babyPrice: { type: Number, default: 0 },                     // Giá trẻ sơ sinh
    singleRoomSupplementPrice: { type: Number, default: 0 },     // Phụ thu phòng đơn
    stock: { type: Number, required: true },                     // Số lượng còn lại
    dayStart: { type: Date, required: true },                    // Ngày khởi hành
    dayReturn: { type: Date, required: true },                   // Ngày trở lại
    discount: { type: Number, default: 0 },                      // Giảm giá chung (%)
    // Tuỳ chọn: giảm giá theo từng loại giá (ưu tiên hơn discount nếu có)
    discountAdultPercent: { type: Number, default: null },
    discountChildrenPercent: { type: Number, default: null },
    discountChildPercent: { type: Number, default: null },
    discountBabyPercent: { type: Number, default: null },
}, { timestamps: true, collection: "tour_detail" });

// Middleware để tính toán lại giá tour khi tour detail thay đổi
TourDetailSchema.post('save', async function(doc) {
    try {
        const { recalculateAndUpdateTourPrice } = require("../utils/priceCalculator");
        await recalculateAndUpdateTourPrice(doc.tourId);
    } catch (error) {
        console.error('Error recalculating tour price after save:', error);
    }
});

TourDetailSchema.post('findOneAndUpdate', async function(doc) {
    try {
        if (doc && doc.tourId) {
            const { recalculateAndUpdateTourPrice } = require("../utils/priceCalculator");
            await recalculateAndUpdateTourPrice(doc.tourId);
        }
    } catch (error) {
        console.error('Error recalculating tour price after update:', error);
    }
});

TourDetailSchema.post('findOneAndDelete', async function(doc) {
    try {
        if (doc && doc.tourId) {
            const { recalculateAndUpdateTourPrice } = require("../utils/priceCalculator");
            await recalculateAndUpdateTourPrice(doc.tourId);
        }
    } catch (error) {
        console.error('Error recalculating tour price after delete:', error);
    }
});

module.exports = mongoose.model("TourDetail", TourDetailSchema);