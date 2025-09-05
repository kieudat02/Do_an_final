const { sendBookingConfirmationEmail, sendBookingNotificationToStaff, sendBookingStatusEmail } = require('../utils/emailUtils');
const paymentEmailService = require('./paymentEmailService');

class BookingNotificationService {

    // Gửi tất cả thông báo cho booking mới
    async sendBookingNotifications(order, tourDetails = null) {
        const results = {
            customerEmail: { success: false, error: null },
            staffEmail: { success: false, error: null }
        };

        try {
            // Prepare booking data for notifications
            const bookingData = await this.prepareBookingData(order, tourDetails);
            
            // Send notifications in parallel for better performance
            const notifications = await Promise.allSettled([
                this.sendCustomerEmailNotification(bookingData),
                this.sendStaffEmailNotification(bookingData)
            ]);

            // Process results
            results.customerEmail = this.processNotificationResult(notifications[0], 'Customer Email');
            results.staffEmail = this.processNotificationResult(notifications[1], 'Staff Email');

            // Log summary
            this.logNotificationSummary(order.orderId, results);

            return results;

        } catch (error) {
            console.error('Error in sendBookingNotifications:', error);
            throw error;
        }
    }

    // Chuẩn bị dữ liệu booking từ đối tượng order
    async prepareBookingData(order, tourDetails) {
        try {
            const Tour = require('../models/tourModel');
            const TourDetail = require('../models/tourDetailModel');

            // Lấy thông tin tour từ order items
            let tourName = 'Tour không xác định';
            let departureDate = null;
            let returnDate = null;
            let totalPeople = 0;
            let adults = 0;
            let children = 0;
            let babies = 0;
            let tourInfo = null;

            if (order.items && order.items.length > 0) {
                const firstItem = order.items[0];
                tourName = firstItem.name || tourName;
                adults = firstItem.adults || 0;
                children = firstItem.children || 0;
                babies = firstItem.babies || 0;
                totalPeople = adults + children + babies;

                // Ưu tiên sử dụng ngày khách hàng chọn
                if (firstItem.startDate) {
                    departureDate = firstItem.startDate;
                }

                // Lấy thông tin chi tiết tour từ database với timeout
                if (firstItem.tourId) {
                    try {
                        // Tạo timeout promise để tránh chờ quá lâu
                        const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Database query timeout')), 5000);
                        });

                        // Lấy thông tin tour với timeout
                        const tourPromise = Tour.findById(firstItem.tourId)
                            .populate('category departure destination transportation')
                            .lean();

                        tourInfo = await Promise.race([tourPromise, timeoutPromise]);

                        if (tourInfo) {
                            tourName = tourInfo.title || tourName;
                        }

                        // Lấy thông tin tour detail phù hợp với ngày khách hàng chọn
                        if (!tourDetails && firstItem.tourId) {
                            let tourDetailQuery;

                            if (firstItem.startDate) {
                                // Tìm tour detail có ngày khởi hành khớp với ngày khách hàng chọn
                                tourDetailQuery = TourDetail.findOne({
                                    tourId: firstItem.tourId,
                                    dayStart: { $lte: new Date(firstItem.startDate) },
                                    dayReturn: { $gte: new Date(firstItem.startDate) }
                                }).sort({ dayStart: -1 }).lean();
                            } else {
                                // Fallback: lấy tour detail gần nhất
                                tourDetailQuery = TourDetail.findOne({
                                    tourId: firstItem.tourId
                                }).sort({ dayStart: 1 }).lean();
                            }

                            tourDetails = await Promise.race([tourDetailQuery, timeoutPromise]);
                        }

                        // Lấy ngày khởi hành và trở về
                        if (tourDetails) {
                            // Nếu khách hàng không chọn ngày cụ thể, sử dụng từ tour details
                            if (!departureDate) {
                                departureDate = tourDetails.dayStart;
                            }
                            returnDate = tourDetails.dayReturn;

                            // Tính ngày về dựa trên ngày khởi hành khách chọn và duration
                            if (departureDate && tourDetails.dayStart && tourDetails.dayReturn) {
                                const duration = Math.ceil((new Date(tourDetails.dayReturn) - new Date(tourDetails.dayStart)) / (1000 * 60 * 60 * 24));
                                const startDate = new Date(departureDate);
                                const endDate = new Date(startDate);
                                endDate.setDate(startDate.getDate() + duration);
                                returnDate = endDate.toISOString().split('T')[0];
                            }
                        }
                    } catch (dbError) {
                        // Tiếp tục với thông tin có sẵn từ order items
                        console.warn('Error fetching tour details:', dbError.message);
                    }
                }
            }

            return {
                // Thông tin khách hàng
                customerEmail: order.email,
                customerName: order.customer,
                customerPhone: order.phone,

                // Thông tin đơn hàng
                orderId: order.orderId,
                tourName: tourName,
                departureDate: departureDate,
                returnDate: returnDate,
                totalPeople: totalPeople,
                adults: adults,
                children: children,
                babies: babies,
                totalAmount: order.totalAmount,
                paymentMethod: order.paymentMethod,
                notes: order.notes,

                // Thông tin liên hệ
                hotline: process.env.COMPANY_HOTLINE || "0972 122 555",
                staffEmail: process.env.STAFF_EMAIL || process.env.EMAIL_USER,

                // Thông tin tour chi tiết (để sử dụng trong template)
                tourInfo: tourInfo,
                tourDetails: tourDetails
            };
        } catch (error) {
            console.error('Error preparing booking data:', error);
            throw error;
        }
    }


    async sendCustomerEmailNotification(bookingData) {
        try {
            if (!bookingData.customerEmail) {
                throw new Error('Customer email is required');
            }

            const result = await sendBookingConfirmationEmail(bookingData);
            return result;
        } catch (error) {
            console.error('❌ Failed to send customer email:', error.message);
            throw error;
        }
    }

    async sendStaffEmailNotification(bookingData) {
        try {
            const result = await sendBookingNotificationToStaff(bookingData);
            return result;
        } catch (error) {
            console.error('❌ Failed to send staff email:', error.message);
            throw error;
        }
    }



    processNotificationResult(result, type) {
        if (result.status === 'fulfilled') {
            return {
                success: true,
                data: result.value,
                error: null
            };
        } else {
            return {
                success: false,
                data: null,
                error: result.reason?.message || `Failed to send ${type}`
            };
        }
    }

    logNotificationSummary(orderId, results) {
        const summary = {
            orderId,
            customerEmail: results.customerEmail.success ? '✅' : '❌',
            staffEmail: results.staffEmail.success ? '✅' : '❌'
        };

        // Log errors if any
        Object.keys(results).forEach(key => {
            if (!results[key].success && results[key].error) {
                console.error(`❌ ${key} error:`, results[key].error);
            }
        });
    }

    async sendEmailNotificationsOnly(order, tourDetails = null) {
        const results = {
            customerEmail: { success: false, error: null },
            staffEmail: { success: false, error: null }
        };

        try {
            const bookingData = await this.prepareBookingData(order, tourDetails);
            
            const notifications = await Promise.allSettled([
                this.sendCustomerEmailNotification(bookingData),
                this.sendStaffEmailNotification(bookingData)
            ]);

            results.customerEmail = this.processNotificationResult(notifications[0], 'Customer Email');
            results.staffEmail = this.processNotificationResult(notifications[1], 'Staff Email');



            return results;

        } catch (error) {
            console.error('Error in sendEmailNotificationsOnly:', error);
            throw error;
        }
    }

    async retryFailedNotifications(order, previousResults, tourDetails = null) {
        const retryResults = {
            customerEmail: previousResults.customerEmail,
            staffEmail: previousResults.staffEmail
        };

        try {
            const bookingData = await this.prepareBookingData(order, tourDetails);
            const retryPromises = [];

            // Retry failed notifications
            if (!previousResults.customerEmail.success) {
                retryPromises.push(
                    this.sendCustomerEmailNotification(bookingData)
                        .then(result => ({ type: 'customerEmail', result }))
                        .catch(error => ({ type: 'customerEmail', error }))
                );
            }

            if (!previousResults.staffEmail.success) {
                retryPromises.push(
                    this.sendStaffEmailNotification(bookingData)
                        .then(result => ({ type: 'staffEmail', result }))
                        .catch(error => ({ type: 'staffEmail', error }))
                );
            }



            const retryAttempts = await Promise.all(retryPromises);

            // Update results
            retryAttempts.forEach(attempt => {
                if (attempt.result) {
                    retryResults[attempt.type] = {
                        success: true,
                        data: attempt.result,
                        error: null
                    };
                } else if (attempt.error) {
                    retryResults[attempt.type] = {
                        success: false,
                        data: null,
                        error: attempt.error.message || 'Retry failed'
                    };
                }
            });

            return retryResults;

        } catch (error) {
            console.error('Error in retryFailedNotifications:', error);
            throw error;
        }
    }

    
    // Gửi email thông báo thay đổi trạng thái đơn đặt tour
    async sendStatusChangeEmail(order, newStatus, cancellationReason = '', tourDetails = null) {
        try {
            // Chuẩn bị dữ liệu booking
            const bookingData = await this.prepareBookingData(order, tourDetails);

            // Thêm lý do hủy nếu có
            if (cancellationReason) {
                bookingData.cancellationReason = cancellationReason;
            }

            // Gửi email theo trạng thái
            const result = await sendBookingStatusEmail(newStatus, bookingData);

            return {
                success: true,
                result: result
            };

        } catch (error) {
            console.error(`❌ Lỗi gửi email thông báo trạng thái ${newStatus} cho đơn ${order.orderId}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    
    // Gửi email chờ xác nhận (pending) - sử dụng hệ thống email mới
    async sendPendingEmail(order, tourDetails = null) {
        try {
            // Kiểm tra phương thức thanh toán
            const isOnlinePayment = ['MoMo', 'VNPay'].includes(order.paymentMethod);

            if (isOnlinePayment) {
                // Thanh toán trực tuyến không cần gửi email pending
                return { success: true, message: 'Thanh toán trực tuyến không cần email pending' };
            } else {
                // Thanh toán tiền mặt - sử dụng email service mới
                return await paymentEmailService.sendCashPaymentPending(order);
            }
        } catch (error) {
            console.error(`❌ Lỗi gửi email pending cho đơn ${order.orderId}:`, error.message);
            return { success: false, error: error.message };
        }
    }


    // Gửi email xác nhận thành công (confirmed) - sử dụng hệ thống email mới
    async sendConfirmedEmail(order, tourDetails = null) {
        try {
            // Kiểm tra phương thức thanh toán
            const isOnlinePayment = ['MoMo', 'VNPay'].includes(order.paymentMethod);

            if (isOnlinePayment) {
                // Thanh toán trực tuyến đã được xử lý trong callback
                return { success: true, message: 'Email thanh toán trực tuyến đã được gửi' };
            } else {
                // Thanh toán tiền mặt - sử dụng email service mới
                return await paymentEmailService.sendCashPaymentConfirmed(order);
            }
        } catch (error) {
            console.error(`❌ Lỗi gửi email confirmed cho đơn ${order.orderId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // Gửi email thông báo hủy tour (cancelled) - sử dụng hệ thống email mới
    async sendCancelledEmail(order, cancellationReason = '', tourDetails = null) {
        try {
            // Kiểm tra phương thức thanh toán
            const isOnlinePayment = ['MoMo', 'VNPay'].includes(order.paymentMethod);

            if (isOnlinePayment) {
                // Thanh toán trực tuyến - luôn gửi link hoàn tiền (cho cả trường hợp đã thanh toán và chưa thanh toán)
                const refundFormUrl = `${process.env.FRONTEND_URL}/refund-form/${order.orderId}`;
                return await paymentEmailService.sendOnlinePaymentRefund(order, cancellationReason, refundFormUrl);
            } else {
                // Thanh toán tiền mặt - sử dụng email service mới
                return await paymentEmailService.sendCashPaymentCancelled(order, cancellationReason);
            }
        } catch (error) {
            console.error(`❌ Lỗi gửi email cancelled cho đơn ${order.orderId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // Gửi email mời đánh giá tour (completed) - sử dụng hệ thống email mới
    async sendReviewInvitationEmail(order, reviewUrl, tourDetails = null) {
        try {
            // Kiểm tra phương thức thanh toán
            const isOnlinePayment = ['MoMo', 'VNPay'].includes(order.paymentMethod);

            if (isOnlinePayment) {
                // Thanh toán trực tuyến - sử dụng email service mới
                return await paymentEmailService.sendOnlinePaymentCompleted(order, reviewUrl);
            } else {
                // Thanh toán tiền mặt - sử dụng email service mới
                return await paymentEmailService.sendCashPaymentCompleted(order, reviewUrl);
            }

        } catch (error) {
            console.error(`❌ Lỗi gửi email mời đánh giá cho đơn ${order.orderId}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new BookingNotificationService();
