const mongoose = require('mongoose');

/**
 * Schema để lưu trữ thời gian phản hồi chatbot
 */
const responseTimeSchema = new mongoose.Schema({
    // ID phiên hội thoại
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    
    // ID tin nhắn
    messageId: {
        type: String,
        required: true,
        index: true
    },
    
    // Endpoint được gọi
    endpoint: {
        type: String,
        required: true,
        index: true
    },
    
    // Thời gian bắt đầu request (timestamp)
    startTime: {
        type: Date,
        required: true,
        index: true
    },
    
    // Thời gian kết thúc request (timestamp)
    endTime: {
        type: Date,
        required: true
    },
    
    // Thời gian phản hồi (milliseconds)
    responseTime: {
        type: Number,
        required: true,
        min: 0,
        index: true
    },
    
    // HTTP status code
    statusCode: {
        type: Number,
        required: true,
        index: true
    },
    
    // Có thành công không
    success: {
        type: Boolean,
        required: true,
        index: true
    },
    
    // Thông tin lỗi (nếu có)
    error: {
        type: String,
        default: null
    },
    
    // Metadata bổ sung
    metadata: {
        // Độ dài tin nhắn input
        inputLength: {
            type: Number,
            min: 0
        },
        
        // Độ dài response
        outputLength: {
            type: Number,
            min: 0
        },
        
        // User agent
        userAgent: {
            type: String,
            trim: true
        },
        
        // IP address
        clientIP: {
            type: String,
            trim: true
        },
        
        // Loại request (message, history, etc.)
        requestType: {
            type: String,
            enum: ['message', 'history', 'session', 'context', 'other'],
            default: 'other'
        }
    }
}, {
    timestamps: true,
    collection: 'response_times'
});

// Indexes để tối ưu query
responseTimeSchema.index({ startTime: -1 }); // Sắp xếp theo thời gian
responseTimeSchema.index({ endpoint: 1, startTime: -1 }); // Lọc theo endpoint và thời gian
responseTimeSchema.index({ success: 1, startTime: -1 }); // Lọc theo success và thời gian
responseTimeSchema.index({ responseTime: 1 }); // Sắp xếp theo response time

// Static methods để tính toán thống kê
responseTimeSchema.statics.getResponseTimeStats = async function(dateFrom, dateTo, endpoint = null) {
    const matchConditions = {
        startTime: {
            $gte: dateFrom || new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h trước
            $lte: dateTo || new Date()
        }
    };
    
    if (endpoint) {
        matchConditions.endpoint = endpoint;
    }
    
    const stats = await this.aggregate([
        { $match: matchConditions },
        {
            $group: {
                _id: null,
                totalRequests: { $sum: 1 },
                successfulRequests: { $sum: { $cond: ['$success', 1, 0] } },
                averageResponseTime: { $avg: '$responseTime' },
                minResponseTime: { $min: '$responseTime' },
                maxResponseTime: { $max: '$responseTime' },
                responseTimes: { $push: '$responseTime' }
            }
        }
    ]);
    
    if (stats.length === 0) {
        return {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            successRate: 0,
            averageResponseTime: 0,
            minResponseTime: 0,
            maxResponseTime: 0,
            p50: 0,
            p95: 0,
            p99: 0
        };
    }
    
    const result = stats[0];
    const responseTimes = result.responseTimes.sort((a, b) => a - b);
    
    // Tính percentiles
    const p50Index = Math.floor(responseTimes.length * 0.5);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    
    return {
        totalRequests: result.totalRequests,
        successfulRequests: result.successfulRequests,
        failedRequests: result.totalRequests - result.successfulRequests,
        successRate: Math.round((result.successfulRequests / result.totalRequests) * 10000) / 100,
        averageResponseTime: Math.round(result.averageResponseTime * 100) / 100,
        minResponseTime: result.minResponseTime,
        maxResponseTime: result.maxResponseTime,
        p50: responseTimes[p50Index] || 0,
        p95: responseTimes[p95Index] || 0,
        p99: responseTimes[p99Index] || 0
    };
};

// Model
const ResponseTime = mongoose.model('ResponseTime', responseTimeSchema);

/**
 * Middleware để đo thời gian phản hồi
 */
const responseTimeMiddleware = (options = {}) => {
    const {
        enableLogging = true,
        enableDatabase = true,
        logSlowRequests = true,
        slowRequestThreshold = 2000, // 2 seconds
        excludePaths = ['/health', '/ping'],
        includeMetadata = true
    } = options;

    return async (req, res, next) => {
        // Bỏ qua các path không cần đo
        if (excludePaths.some(path => req.path.includes(path))) {
            return next();
        }

        const startTime = new Date();
        const startHrTime = process.hrtime();

        // Lưu thông tin vào request
        req.responseTimeStart = startTime;
        req.responseTimeHrStart = startHrTime;

        // Override res.end để capture response
        const originalEnd = res.end;
        let responseBody = '';

        res.end = function(chunk, encoding) {
            // Tính thời gian phản hồi
            const endTime = new Date();
            const hrDiff = process.hrtime(startHrTime);
            const responseTime = hrDiff[0] * 1000 + hrDiff[1] / 1000000; // Convert to milliseconds

            // Lấy thông tin từ request
            const sessionId = req.body?.sessionId || req.query?.sessionId || 'unknown';
            const messageId = req.body?.messageId || req.query?.messageId || `msg_${Date.now()}`;
            const endpoint = req.path;
            const statusCode = res.statusCode;
            const success = statusCode >= 200 && statusCode < 400;

            // Lấy metadata
            let metadata = {};
            if (includeMetadata) {
                metadata = {
                    inputLength: req.body?.message?.length || 0,
                    outputLength: chunk ? chunk.length : 0,
                    userAgent: req.headers['user-agent'] || '',
                    clientIP: req.headers['x-forwarded-for'] || 
                             req.connection.remoteAddress || 
                             req.socket.remoteAddress || 
                             '127.0.0.1',
                    requestType: getRequestType(endpoint)
                };
            }

            // Log nếu cần
            if (enableLogging) {
                const logData = {
                    sessionId,
                    messageId,
                    endpoint,
                    responseTime: Math.round(responseTime * 100) / 100,
                    statusCode,
                    success,
                    timestamp: endTime.toISOString()
                };

                if (logSlowRequests && responseTime > slowRequestThreshold) {
                    console.warn('🐌 Slow request detected:', logData);
                } else {
                    console.log('⏱️ Response time:', logData);
                }
            }

            // Lưu vào database nếu cần
            if (enableDatabase) {
                const responseTimeDoc = new ResponseTime({
                    sessionId,
                    messageId,
                    endpoint,
                    startTime,
                    endTime,
                    responseTime: Math.round(responseTime * 100) / 100,
                    statusCode,
                    success,
                    error: success ? null : (res.locals.error || 'Unknown error'),
                    metadata
                });

                // Lưu async để không block response
                responseTimeDoc.save().catch(error => {
                    console.error('❌ Error saving response time:', error);
                });
            }

            // Thêm header response time
            res.set('X-Response-Time', `${Math.round(responseTime * 100) / 100}ms`);

            // Gọi original end
            originalEnd.call(this, chunk, encoding);
        };

        next();
    };
};

/**
 * Xác định loại request
 */
const getRequestType = (endpoint) => {
    if (endpoint.includes('/message')) return 'message';
    if (endpoint.includes('/history')) return 'history';
    if (endpoint.includes('/session')) return 'session';
    if (endpoint.includes('/context')) return 'context';
    return 'other';
};

/**
 * Controller để lấy thống kê response time
 */
const getResponseTimeStats = async (req, res) => {
    try {
        const { dateFrom, dateTo, endpoint } = req.query;

        // Parse dates
        let fromDate = null;
        let toDate = null;

        if (dateFrom) {
            fromDate = new Date(dateFrom);
            if (isNaN(fromDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Định dạng dateFrom không hợp lệ'
                });
            }
        }

        if (dateTo) {
            toDate = new Date(dateTo);
            if (isNaN(toDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Định dạng dateTo không hợp lệ'
                });
            }
        }

        const stats = await ResponseTime.getResponseTimeStats(fromDate, toDate, endpoint);

        return res.status(200).json({
            success: true,
            message: 'Lấy thống kê response time thành công',
            data: {
                period: {
                    from: fromDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
                    to: toDate || new Date()
                },
                endpoint: endpoint || 'all',
                stats
            }
        });

    } catch (error) {
        console.error('❌ Lỗi khi lấy thống kê response time:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê response time',
            error: error.message
        });
    }
};

module.exports = {
    responseTimeMiddleware,
    getResponseTimeStats,
    ResponseTime
};
