const TourDetail = require('../models/tourDetailModel');

/**
 * Trừ stock cho các tour detail trong order
 * @param {Array} orderItems - Mảng các item trong order
 * @param {string} context - Ngữ cảnh để log (ví dụ: 'momo payment', 'manual update')
 * @returns {Promise<boolean>} - true nếu thành công, false nếu có lỗi
 */
const deductStock = async (orderItems, context = 'unknown') => {
    if (!orderItems || orderItems.length === 0) {
        return false;
    }

    let hasError = false;

    for (const item of orderItems) {
        if (item.tourDetailId) {
            try {
                // Tính tổng số người cho item này
                const totalPeople = (item.adults || 0) + (item.children || 0) + (item.babies || 0);
                
                if (totalPeople <= 0) {
                    continue;
                }
                
                // Kiểm tra stock hiện tại
                const tourDetail = await TourDetail.findById(item.tourDetailId);
                if (!tourDetail) {
                    console.error(`❌ Không tìm thấy tour detail ${item.tourDetailId}`);
                    hasError = true;
                    continue;
                }

                if (tourDetail.stock < totalPeople) {
                    console.warn(`⚠️ Stock không đủ cho tour detail ${item.tourDetailId}. Stock hiện tại: ${tourDetail.stock}, cần: ${totalPeople}`);
                    hasError = true;
                    continue;
                }

                // Trừ stock an toàn (kiểm tra điều kiện trong query để tránh race condition)
                const updateResult = await TourDetail.findOneAndUpdate(
                    { 
                        _id: item.tourDetailId,
                        stock: { $gte: totalPeople } // Chỉ update nếu stock đủ
                    },
                    { $inc: { stock: -totalPeople } },
                    { new: true }
                );
                
                if (!updateResult) {
                    console.warn(`⚠️ Không thể trừ stock cho tour detail ${item.tourDetailId}. Stock có thể đã hết hoặc không đủ.`);
                    hasError = true;
                    continue;
                }
                
                
                
            } catch (stockError) {
                console.error(`❌ Lỗi khi trừ stock cho tour detail ${item.tourDetailId}:`, stockError);
                hasError = true;
            }
        } else {
            hasError = true;
        }
    }

    return !hasError;
};

/**
 * Cộng lại stock cho các tour detail trong order
 * @param {Array} orderItems - Mảng các item trong order
 * @param {string} context - Ngữ cảnh để log (ví dụ: 'order cancelled', 'refund')
 * @returns {Promise<boolean>} - true nếu thành công, false nếu có lỗi
 */
const restoreStock = async (orderItems, context = 'unknown') => {
    if (!orderItems || orderItems.length === 0) {
        return false;
    }

    let hasError = false;

    for (const item of orderItems) {
        if (item.tourDetailId) {
            try {
                // Tính tổng số người cho item này
                const totalPeople = (item.adults || 0) + (item.children || 0) + (item.babies || 0);
                
                if (totalPeople <= 0) {
                    continue;
                }
                
                // Cộng lại stock
                await TourDetail.findByIdAndUpdate(
                    item.tourDetailId,
                    { $inc: { stock: totalPeople } }
                );
                
            } catch (stockError) {
                console.error(`❌ Lỗi khi cộng lại stock cho tour detail ${item.tourDetailId}:`, stockError);
                hasError = true;
            }
        } else {
            hasError = true;
        }
    }

    return !hasError;
};

/**
 * Kiểm tra stock có đủ không cho order
 * @param {Array} orderItems - Mảng các item trong order
 * @returns {Promise<Object>} - {isValid: boolean, errors: Array}
 */
const validateStock = async (orderItems) => {
    const result = {
        isValid: true,
        errors: []
    };

    if (!orderItems || orderItems.length === 0) {
        result.isValid = false;
        result.errors.push('Không có items để kiểm tra');
        return result;
    }

    for (const item of orderItems) {
        if (!item.tourDetailId) {
            result.isValid = false;
            result.errors.push('Thiếu thông tin tour detail');
            continue;
        }

        try {
            const totalPeople = (item.adults || 0) + (item.children || 0) + (item.babies || 0);
            
            if (totalPeople <= 0) {
                result.isValid = false;
                result.errors.push(`Số lượng người không hợp lệ cho tour detail ${item.tourDetailId}`);
                continue;
            }

            const tourDetail = await TourDetail.findById(item.tourDetailId);
            if (!tourDetail) {
                result.isValid = false;
                result.errors.push(`Không tìm thấy tour detail ${item.tourDetailId}`);
                continue;
            }

            if (tourDetail.stock < totalPeople) {
                result.isValid = false;
                result.errors.push(`Vui lòng chọn ngày khác, đã hết chỗ`);
            }
        } catch (error) {
            result.isValid = false;
            result.errors.push(`Lỗi kiểm tra stock cho tour detail ${item.tourDetailId}: ${error.message}`);
        }
    }

    return result;
};

module.exports = {
    deductStock,
    restoreStock,
    validateStock
};
