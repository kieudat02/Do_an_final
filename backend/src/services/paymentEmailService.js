/**
 * Service tổng hợp cho việc gửi email theo phương thức thanh toán
 * Tách riêng thanh toán trực tuyến và tiền mặt
 */

const onlinePaymentEmailUtils = require('../utils/onlinePaymentEmailUtils');
const cashPaymentEmailUtils = require('../utils/cashPaymentEmailUtils');

class PaymentEmailService {
    
    /**
     * Gửi email cho thanh toán trực tuyến (MoMo, VNPay)
     */
    
    // Gửi email thanh toán thành công
    async sendOnlinePaymentSuccess(orderData) {
        try {
            // Chuẩn bị dữ liệu cho email
            const emailData = {
                customerEmail: orderData.email,
                customerName: orderData.customer,
                orderId: orderData.orderId,
                tourName: this.getTourName(orderData),
                totalAmount: orderData.totalAmount,
                paymentMethod: orderData.paymentMethod,
                transactionId: orderData.momoTransId || orderData.vnpayTransactionNo,
                paidAt: orderData.paidAt || new Date(),
                hotline: "0972 122 555"
            };

            return await onlinePaymentEmailUtils.sendSuccessPaymentEmail(emailData);
        } catch (error) {
            throw error;
        }
    }

    // Gửi email thanh toán thất bại với link thanh toán lại
    async sendOnlinePaymentFailed(orderData, failureReason = '', retryPaymentUrl = '') {
        try {
            const emailData = {
                customerEmail: orderData.email,
                customerName: orderData.customer,
                orderId: orderData.orderId,
                tourName: this.getTourName(orderData),
                totalAmount: orderData.totalAmount,
                paymentMethod: orderData.paymentMethod,
                failureReason: failureReason || orderData.momoFailureReason || orderData.vnpayFailureReason,
                retryPaymentUrl: retryPaymentUrl,
                hotline: "0972 122 555"
            };

            return await onlinePaymentEmailUtils.sendFailedPaymentEmail(emailData);
        } catch (error) {
            throw error;
        }
    }

    // Gửi email hoàn tiền với link điền thông tin ngân hàng
    async sendOnlinePaymentRefund(orderData, refundReason = '', refundFormUrl = '') {
        try {
            const emailData = {
                customerEmail: orderData.email,
                customerName: orderData.customer,
                orderId: orderData.orderId,
                tourName: this.getTourName(orderData),
                refundAmount: orderData.totalAmount,
                refundReason: refundReason,
                refundFormUrl: refundFormUrl,
                hotline: "0972 122 555"
            };

            return await onlinePaymentEmailUtils.sendRefundEmail(emailData);
        } catch (error) {
            throw error;
        }
    }

    // Gửi email hoàn thành tour (dùng chung)
    async sendOnlinePaymentCompleted(orderData, reviewUrl = '') {
        try {
            const emailData = {
                customerEmail: orderData.email,
                customerName: orderData.customer,
                orderId: orderData.orderId,
                tourName: this.getTourName(orderData),
                completedDate: new Date(),
                reviewUrl: reviewUrl,
                hotline: "0972 122 555"
            };

            return await onlinePaymentEmailUtils.sendCompletedEmail(emailData);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gửi email cho thanh toán tiền mặt
     */
    
    // Gửi email chờ xác nhận
    async sendCashPaymentPending(orderData) {
        try {
            const emailData = this.prepareCashEmailData(orderData);
            return await cashPaymentEmailUtils.sendPendingEmail(emailData);
        } catch (error) {
            throw error;
        }
    }

    // Gửi email đã xác nhận
    async sendCashPaymentConfirmed(orderData) {
        try {
            const emailData = this.prepareCashEmailData(orderData);
            return await cashPaymentEmailUtils.sendConfirmedEmail(emailData);
        } catch (error) {
            throw error;
        }
    }

    // Gửi email đã hủy
    async sendCashPaymentCancelled(orderData, cancellationReason = '') {
        try {
            const emailData = this.prepareCashEmailData(orderData);
            emailData.cancellationReason = cancellationReason;
            return await cashPaymentEmailUtils.sendCancelledEmail(emailData);
        } catch (error) {
            throw error;
        }
    }

    // Gửi email đã hoàn thành
    async sendCashPaymentCompleted(orderData, reviewUrl = '') {
        try {
            const emailData = this.prepareCashEmailData(orderData);
            emailData.completedDate = new Date();
            emailData.reviewUrl = reviewUrl;
            return await cashPaymentEmailUtils.sendCompletedEmail(emailData);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Phương thức tự động gửi email theo phương thức thanh toán và trạng thái
     */
    async sendPaymentStatusEmail(orderData, status, additionalData = {}) {
        try {
            const isOnlinePayment = ['MoMo', 'VNPay'].includes(orderData.paymentMethod);
            
            if (isOnlinePayment) {
                return await this.handleOnlinePaymentEmail(orderData, status, additionalData);
            } else {
                return await this.handleCashPaymentEmail(orderData, status, additionalData);
            }
        } catch (error) {
            throw error;
        }
    }

    // Xử lý email cho thanh toán trực tuyến
    async handleOnlinePaymentEmail(orderData, status, additionalData) {
        switch (status) {
            case 'payment_success':
                return await this.sendOnlinePaymentSuccess(orderData);
            
            case 'payment_failed':
                return await this.sendOnlinePaymentFailed(
                    orderData, 
                    additionalData.failureReason, 
                    additionalData.retryPaymentUrl
                );
            
            case 'refund':
                return await this.sendOnlinePaymentRefund(
                    orderData, 
                    additionalData.refundReason, 
                    additionalData.refundFormUrl
                );
            
            case 'completed':
                return await this.sendOnlinePaymentCompleted(orderData, additionalData.reviewUrl);
            
            default:
                return {
                    success: false,
                    error: `Không hỗ trợ gửi email cho status: ${status} với thanh toán trực tuyến`
                };
        }
    }

    // Xử lý email cho thanh toán tiền mặt
    async handleCashPaymentEmail(orderData, status, additionalData) {
        switch (status) {
            case 'pending':
                return await this.sendCashPaymentPending(orderData);
            
            case 'confirmed':
                return await this.sendCashPaymentConfirmed(orderData);
            
            case 'cancelled':
                return await this.sendCashPaymentCancelled(orderData, additionalData.cancellationReason);
            
            case 'completed':
                return await this.sendCashPaymentCompleted(orderData, additionalData.reviewUrl);
            
            default:
                return {
                    success: false,
                    error: `Không hỗ trợ gửi email cho status: ${status} với thanh toán tiền mặt`
                };
        }
    }

    /**
     * Utility methods
     */
    
    // Chuẩn bị dữ liệu email cho thanh toán tiền mặt
    prepareCashEmailData(orderData) {
        const firstItem = orderData.items && orderData.items[0];
        
        return {
            customerEmail: orderData.email,
            customerName: orderData.customer,
            orderId: orderData.orderId,
            tourName: this.getTourName(orderData),
            departureDate: firstItem?.startDate || new Date(),
            returnDate: this.calculateReturnDate(firstItem?.startDate),
            totalPeople: this.calculateTotalPeople(orderData.items),
            adults: firstItem?.adults || 0,
            children: firstItem?.children || 0,
            babies: firstItem?.babies || 0,
            totalAmount: orderData.totalAmount,
            paymentMethod: orderData.paymentMethod,
            notes: orderData.notes,
            hotline: "0972 122 555"
        };
    }

    // Lấy tên tour từ order data
    getTourName(orderData) {
        if (orderData.items && orderData.items.length > 0) {
            return orderData.items[0].name || 'Tour du lịch';
        }
        return 'Tour du lịch';
    }

    // Tính ngày về (giả sử tour 3 ngày)
    calculateReturnDate(startDate) {
        if (!startDate) return new Date();
        const returnDate = new Date(startDate);
        returnDate.setDate(returnDate.getDate() + 3);
        return returnDate;
    }

    // Tính tổng số người
    calculateTotalPeople(items) {
        if (!items || items.length === 0) return 0;
        const firstItem = items[0];
        return (firstItem.adults || 0) + (firstItem.children || 0) + (firstItem.babies || 0);
    }
}

module.exports = new PaymentEmailService();
