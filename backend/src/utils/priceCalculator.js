const TourDetail = require("../models/tourDetailModel");
const Tour = require("../models/tourModel");

// Helpers
function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function isAvailable(detail) {
    if (!detail) return false;
    const hasStock = typeof detail.stock === 'number' ? detail.stock > 0 : true;
    const today = startOfToday();
    const start = detail.dayStart ? new Date(detail.dayStart) : null;
    const future = start ? start >= today : true;
    return hasStock && future;
}

function clampPercent(p) {
    if (typeof p !== 'number' || isNaN(p)) return 0;
    if (p < 0) return 0;
    if (p > 100) return 100;
    return p;
}

function applyDiscount(price, discountPercent) {
    const p = typeof price === 'number' ? price : 0;
    const d = clampPercent(discountPercent);
    const discounted = p - (p * d) / 100;
    return Math.max(0, discounted);
}

function roundPrice(price) {
    const p = typeof price === 'number' ? price : 0;
    return Math.round(p / 1000) * 1000;
}

function calculateTotalPrice(tourDetails) {
    if (!tourDetails || !Array.isArray(tourDetails) || tourDetails.length === 0) {
        return 0;
    }
    return 0;
}

async function recalculateAndUpdateTourPrice(tourId) {
    try {
        // Lấy tất cả tour details của tour
        const tourDetails = await TourDetail.find({ tourId }).lean();

        // Tính các loại giá (hiển thị)
        const minPrice = calculateMinPrice(tourDetails);
        const maxPrice = calculateMaxPrice(tourDetails);

        // Cập nhật tất cả giá vào tour
        await Tour.findByIdAndUpdate(tourId, {
            // totalPrice không còn ý nghĩa trong hiển thị, đặt 0 để tránh hiểu nhầm
            totalPrice: 0,
            minPrice: minPrice,
            maxPrice: maxPrice,
            price: minPrice > 0 ? minPrice : 0 // Ưu tiên minPrice cho hiển thị
        });

        return {
            minPrice,
            maxPrice,
            displayPrice: minPrice > 0 ? minPrice : 0
        };
    } catch (error) {
        console.error('Error recalculating tour price:', error);
        throw error;
    }
}

function calculateMinPrice(tourDetails) {
    if (!tourDetails || !Array.isArray(tourDetails) || tourDetails.length === 0) {
        return 0;
    }

    const candidates = tourDetails
        .filter(isAvailable)
        .map(detail => {
            const adult = typeof detail.adultPrice === 'number' ? detail.adultPrice : 0;
            const discounted = applyDiscount(adult, detail.discount);
            return roundPrice(discounted);
        })
        .filter(v => v > 0);

    if (candidates.length === 0) return 0;
    return Math.min(...candidates);
}

function calculateMaxPrice(tourDetails) {
    if (!tourDetails || !Array.isArray(tourDetails) || tourDetails.length === 0) {
        return 0;
    }

    const candidates = tourDetails
        .filter(isAvailable)
        .map(detail => {
            const adult = typeof detail.adultPrice === 'number' ? detail.adultPrice : 0;
            const discounted = applyDiscount(adult, detail.discount);
            return roundPrice(discounted);
        })
        .filter(v => v > 0);

    if (candidates.length === 0) return 0;
    return Math.max(...candidates);
}


//Máy tính dự phòng bỏ qua tính khả dụng (ngày/cổ phiếu)
function calculateMinPriceAll(tourDetails) {
    if (!tourDetails || !Array.isArray(tourDetails) || tourDetails.length === 0) {
        return 0;
    }
    const candidates = tourDetails
        .map(detail => {
            const adult = typeof detail.adultPrice === 'number' ? detail.adultPrice : 0;
            const discounted = applyDiscount(adult, detail.discount);
            return roundPrice(discounted);
        })
        .filter(v => v > 0);
    if (candidates.length === 0) return 0;
    return Math.min(...candidates);
}

function calculateMaxPriceAll(tourDetails) {
    if (!tourDetails || !Array.isArray(tourDetails) || tourDetails.length === 0) {
        return 0;
    }
    const candidates = tourDetails
        .map(detail => {
            const adult = typeof detail.adultPrice === 'number' ? detail.adultPrice : 0;
            const discounted = applyDiscount(adult, detail.discount);
            return roundPrice(discounted);
        })
        .filter(v => v > 0);
    if (candidates.length === 0) return 0;
    return Math.max(...candidates);
}

function calculateBookingTotal(detail, pax = {}, options = {}) {
    if (!detail) return 0;
    const { adults = 0, children = 0, child = 0, baby = 0 } = pax;
    const { singleRooms = 0 } = options;

    // Trong tương lai có thể tách discount theo loại; hiện tại dùng chung
    const adultDiscount = (detail.discountAdultPercent ?? detail.discount);
    const childrenDiscount = (detail.discountChildrenPercent ?? detail.discount);
    const childDiscount = (detail.discountChildPercent ?? detail.discount);
    const babyDiscount = (detail.discountBabyPercent ?? detail.discount);

    const adultUnit = roundPrice(applyDiscount(detail.adultPrice || 0, adultDiscount));
    const childrenUnit = roundPrice(applyDiscount(detail.childrenPrice || 0, childrenDiscount));
    const childUnit = roundPrice(applyDiscount(detail.childPrice || 0, childDiscount));
    const babyUnit = roundPrice(applyDiscount(detail.babyPrice || 0, babyDiscount));

    const srs = (detail.singleRoomSupplementPrice || 0) * singleRooms;

    // Chỉ tính giá khi giá > 0, nếu giá = 0 thì miễn phí
    let total = 0;
    total += adults * adultUnit; // Người lớn luôn tính

    // Chỉ tính trẻ em nếu có giá được thiết lập
    if (childrenUnit > 0) {
        total += children * childrenUnit;
    }
    if (childUnit > 0) {
        total += child * childUnit;
    }
    if (babyUnit > 0) {
        total += baby * babyUnit;
    }

    total += srs;

    return Math.max(0, total);
}

module.exports = {
    calculateTotalPrice,
    recalculateAndUpdateTourPrice,
    calculateMinPrice,
    calculateMaxPrice,
    calculateMinPriceAll,
    calculateMaxPriceAll,
    calculateBookingTotal
};
