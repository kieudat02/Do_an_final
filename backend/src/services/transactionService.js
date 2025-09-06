const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const { deductStock, restoreStock } = require('../utils/stockManager');

/**
 * Service để xử lý các transaction phức tạp với MongoDB
 * Đảm bảo tính toàn vẹn dữ liệu khi cập nhật nhiều collection
 */

/**
 * Tạo order với transaction - đảm bảo tất cả operations thành công hoặc rollback
 * @param {Object} orderData - Dữ liệu order
 * @param {Array} tourItems - Danh sách tour items để trừ stock
 * @returns {Promise<Object>} Kết quả transaction
 */
exports.createOrderWithTransaction = async (orderData, tourItems = []) => {
    const session = await mongoose.startSession();
    
    try {
        // Bắt đầu transaction
        await session.startTransaction();
        
        console.log(`🔄 Starting transaction for order: ${orderData.orderId}`);
        
        // Step 1: Tạo order
        const order = new Order({
            ...orderData,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour TTL
        });
        
        const savedOrder = await order.save({ session });
        console.log(`✅ Order created: ${savedOrder.orderId}`);
        
        // Step 2: Trừ stock cho các tour items (nếu có)
        if (tourItems && tourItems.length > 0) {
            const stockResult = await deductStock(tourItems, `order_creation_${savedOrder.orderId}`, session);
            
            if (!stockResult) {
                throw new Error('Không thể trừ stock cho tour items');
            }
            
            // Cập nhật order với thông tin stock đã trừ
            savedOrder.stockDeducted = true;
            await savedOrder.save({ session });
            
            console.log(`✅ Stock deducted for ${tourItems.length} items`);
        }
        
        // Step 3: Log transaction (có thể thêm vào collection logs)
        const transactionLog = {
            type: 'order_creation',
            orderId: savedOrder.orderId,
            timestamp: new Date(),
            details: {
                orderAmount: savedOrder.totalAmount,
                itemsCount: tourItems.length,
                stockDeducted: savedOrder.stockDeducted
            }
        };
        
        // Có thể lưu log vào collection riêng nếu cần
        console.log(`📝 Transaction logged:`, transactionLog);
        
        // Commit transaction
        await session.commitTransaction();
        console.log(`✅ Transaction committed successfully for order: ${savedOrder.orderId}`);
        
        return {
            success: true,
            data: savedOrder,
            transactionId: session.id
        };
        
    } catch (error) {
        // Rollback transaction nếu có lỗi
        await session.abortTransaction();
        console.error(`❌ Transaction aborted for order: ${orderData.orderId}`, error);
        
        return {
            success: false,
            error: error.message,
            transactionId: session.id
        };
        
    } finally {
        // Kết thúc session
        await session.endSession();
    }
};

/**
 * Cập nhật order status với transaction
 * @param {string} orderId - ID của order
 * @param {Object} updateData - Dữ liệu cập nhật
 * @param {Object} options - Tùy chọn bổ sung
 * @returns {Promise<Object>} Kết quả transaction
 */
exports.updateOrderWithTransaction = async (orderId, updateData, options = {}) => {
    const session = await mongoose.startSession();
    
    try {
        await session.startTransaction();
        
        console.log(`🔄 Starting update transaction for order: ${orderId}`);
        
        // Step 1: Tìm order hiện tại
        const currentOrder = await Order.findOne({ orderId }).session(session);
        if (!currentOrder) {
            throw new Error(`Order not found: ${orderId}`);
        }
        
        const oldStatus = currentOrder.status;
        const oldPaymentStatus = currentOrder.paymentStatus;
        
        // Step 2: Cập nhật order
        const updatedOrder = await Order.findOneAndUpdate(
            { orderId },
            { 
                ...updateData,
                updatedAt: new Date(),
                updatedBy: options.updatedBy || 'Transaction System'
            },
            { 
                new: true, 
                session,
                runValidators: true
            }
        );
        
        console.log(`✅ Order updated: ${orderId} - ${oldStatus} -> ${updatedOrder.status}`);
        
        // Step 3: Xử lý stock nếu cần
        if (options.handleStock && updatedOrder.items && updatedOrder.items.length > 0) {
            // Nếu order bị hủy, restore stock
            if (updatedOrder.status === 'cancelled' && currentOrder.stockDeducted) {
                const restoreResult = await restoreStock(
                    updatedOrder.items, 
                    `order_cancelled_${orderId}`,
                    session
                );
                
                if (restoreResult) {
                    updatedOrder.stockDeducted = false;
                    await updatedOrder.save({ session });
                    console.log(`✅ Stock restored for cancelled order: ${orderId}`);
                }
            }
            
            // Nếu order confirmed và chưa trừ stock, trừ stock
            if (updatedOrder.status === 'confirmed' && !currentOrder.stockDeducted) {
                const deductResult = await deductStock(
                    updatedOrder.items,
                    `order_confirmed_${orderId}`,
                    session
                );
                
                if (deductResult) {
                    updatedOrder.stockDeducted = true;
                    await updatedOrder.save({ session });
                    console.log(`✅ Stock deducted for confirmed order: ${orderId}`);
                }
            }
        }
        
        // Step 4: Cập nhật TTL nếu cần
        if (updatedOrder.status === 'confirmed' || updatedOrder.paymentStatus === 'completed') {
            // Xóa TTL khi order thành công
            if (updatedOrder.expiresAt) {
                updatedOrder.expiresAt = undefined;
                await updatedOrder.save({ session });
                console.log(`✅ TTL removed for completed order: ${orderId}`);
            }
        }
        
        // Step 5: Log transaction
        const transactionLog = {
            type: 'order_update',
            orderId: orderId,
            timestamp: new Date(),
            changes: {
                from: { status: oldStatus, paymentStatus: oldPaymentStatus },
                to: { status: updatedOrder.status, paymentStatus: updatedOrder.paymentStatus }
            },
            details: updateData
        };
        
        console.log(`📝 Update transaction logged:`, transactionLog);
        
        // Commit transaction
        await session.commitTransaction();
        console.log(`✅ Update transaction committed for order: ${orderId}`);
        
        return {
            success: true,
            data: updatedOrder,
            transactionId: session.id,
            changes: transactionLog.changes
        };
        
    } catch (error) {
        await session.abortTransaction();
        console.error(`❌ Update transaction aborted for order: ${orderId}`, error);
        
        return {
            success: false,
            error: error.message,
            transactionId: session.id
        };
        
    } finally {
        await session.endSession();
    }
};

/**
 * Xử lý payment completion với transaction
 * @param {string} orderId - ID của order
 * @param {Object} paymentData - Dữ liệu thanh toán
 * @returns {Promise<Object>} Kết quả transaction
 */
exports.completePaymentWithTransaction = async (orderId, paymentData) => {
    const session = await mongoose.startSession();
    
    try {
        await session.startTransaction();
        
        console.log(`🔄 Starting payment completion transaction for order: ${orderId}`);
        
        // Step 1: Cập nhật order status
        const updateResult = await this.updateOrderWithTransaction(
            orderId,
            {
                status: 'confirmed',
                paymentStatus: 'completed',
                paidAt: new Date(),
                ...paymentData
            },
            {
                handleStock: true,
                updatedBy: 'Payment System'
            }
        );
        
        if (!updateResult.success) {
            throw new Error(`Failed to update order: ${updateResult.error}`);
        }
        
        // Step 2: Có thể thêm các operations khác như:
        // - Gửi email confirmation
        // - Tạo invoice
        // - Cập nhật loyalty points
        // - Sync với external systems
        
        console.log(`✅ Payment completion transaction committed for order: ${orderId}`);
        
        return {
            success: true,
            data: updateResult.data,
            transactionId: session.id
        };
        
    } catch (error) {
        await session.abortTransaction();
        console.error(`❌ Payment completion transaction aborted for order: ${orderId}`, error);
        
        return {
            success: false,
            error: error.message,
            transactionId: session.id
        };
        
    } finally {
        await session.endSession();
    }
};

/**
 * Cleanup expired orders - chạy định kỳ để dọn dẹp
 * @returns {Promise<Object>} Kết quả cleanup
 */
exports.cleanupExpiredOrders = async () => {
    try {
        console.log('🧹 Starting cleanup of expired orders...');
        
        // Tìm các orders đã expire nhưng chưa được xử lý
        const expiredOrders = await Order.find({
            status: 'pending',
            paymentStatus: 'pending',
            expiresAt: { $lt: new Date() }
        }).limit(100); // Giới hạn 100 orders mỗi lần
        
        if (expiredOrders.length === 0) {
            console.log('✅ No expired orders found');
            return { success: true, cleanedCount: 0 };
        }
        
        let cleanedCount = 0;
        
        // Xử lý từng order với transaction
        for (const order of expiredOrders) {
            const result = await this.updateOrderWithTransaction(
                order.orderId,
                {
                    status: 'expired',
                    paymentStatus: 'expired',
                    cancelReason: 'Order expired due to timeout'
                },
                {
                    handleStock: true,
                    updatedBy: 'TTL Cleanup System'
                }
            );
            
            if (result.success) {
                cleanedCount++;
                console.log(`✅ Expired order cleaned: ${order.orderId}`);
            } else {
                console.error(`❌ Failed to clean expired order: ${order.orderId}`, result.error);
            }
        }
        
        console.log(`🧹 Cleanup completed: ${cleanedCount}/${expiredOrders.length} orders processed`);
        
        return {
            success: true,
            cleanedCount,
            totalFound: expiredOrders.length
        };
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        return {
            success: false,
            error: error.message
        };
    }
};
