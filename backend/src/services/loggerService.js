/**
 * Logging service cho chatbot và các service khác
 */

const fs = require('fs');
const path = require('path');

// Tạo thư mục logs nếu chưa có
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Định nghĩa các loại log
const LOG_TYPES = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
    CHATBOT: 'CHATBOT',
    API: 'API',
    DATABASE: 'DATABASE'
};

// Format timestamp
const formatTimestamp = () => {
    return new Date().toISOString();
};

// Sanitize PII data for logging
const sanitizeForLog = (data) => {
    if (typeof data === 'string') {
        return data
            .replace(/\b\d{10,11}\b/g, '***PHONE***') // SĐT
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***EMAIL***') // Email
            .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '***CARD***') // Thẻ
            .replace(/\b\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g, '***CARD***'); // Thẻ khác
    }
    if (typeof data === 'object' && data !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = sanitizeForLog(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeForLog(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    return data;
};

// Format log message
const formatLogMessage = (type, message, data = null) => {
    const timestamp = formatTimestamp();
    const sanitizedData = data ? sanitizeForLog(data) : null;
    const logEntry = {
        timestamp,
        type,
        message,
        data: sanitizedData ? JSON.stringify(sanitizedData, null, 2) : null
    };
    
    return `[${timestamp}] [${type}] ${message}${sanitizedData ? '\n' + JSON.stringify(sanitizedData, null, 2) : ''}`;
};

// Ghi log vào file
const writeToFile = (filename, message) => {
    try {
        const logFile = path.join(logsDir, filename);
        fs.appendFileSync(logFile, message + '\n');
    } catch (error) {
        console.error('Error writing to log file:', error);
    }
};

// Logging functions
const logger = {
    // Log thông tin chung
    info: (message, data = null) => {
        const logMessage = formatLogMessage(LOG_TYPES.INFO, message, data);
        console.log(logMessage);
        writeToFile('app.log', logMessage);
    },

    // Log cảnh báo
    warn: (message, data = null) => {
        const logMessage = formatLogMessage(LOG_TYPES.WARN, message, data);
        console.warn(logMessage);
        writeToFile('app.log', logMessage);
        writeToFile('warnings.log', logMessage);
    },

    // Log lỗi
    error: (message, error = null) => {
        const errorData = error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : null;
        
        const logMessage = formatLogMessage(LOG_TYPES.ERROR, message, errorData);
        console.error(logMessage);
        writeToFile('app.log', logMessage);
        writeToFile('errors.log', logMessage);
    },

    // Log debug
    debug: (message, data = null) => {
        if (process.env.NODE_ENV === 'development') {
            const logMessage = formatLogMessage(LOG_TYPES.DEBUG, message, data);
            console.log(logMessage);
            writeToFile('debug.log', logMessage);
        }
    },

    // Log chatbot specific
    chatbot: (message, data = null) => {
        const logMessage = formatLogMessage(LOG_TYPES.CHATBOT, message, data);
        console.log(logMessage);
        writeToFile('chatbot.log', logMessage);
    },

    // Log API calls
    api: (method, url, statusCode, responseTime, data = null) => {
        const message = `${method} ${url} - ${statusCode} (${responseTime}ms)`;
        const logMessage = formatLogMessage(LOG_TYPES.API, message, data);
        console.log(logMessage);
        writeToFile('api.log', logMessage);
    },

    // Log database operations
    database: (operation, collection, query, result = null) => {
        const message = `${operation} on ${collection}`;
        const data = {
            query: query,
            result: result ? (typeof result === 'object' ? result.length || 'object' : result) : null
        };
        const logMessage = formatLogMessage(LOG_TYPES.DATABASE, message, data);
        console.log(logMessage);
        writeToFile('database.log', logMessage);
    },

    // Log performance metrics
    performance: (operation, duration, data = null) => {
        const message = `${operation} took ${duration}ms`;
        const logMessage = formatLogMessage('PERFORMANCE', message, data);
        console.log(logMessage);
        writeToFile('performance.log', logMessage);
    },

    // Log security events
    security: (event, data = null) => {
        const message = `Security event: ${event}`;
        const logMessage = formatLogMessage('SECURITY', message, data);
        console.warn(logMessage);
        writeToFile('security.log', logMessage);
    }
};

// Middleware để log API requests
const apiLoggerMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    // Log request
    logger.api(req.method, req.originalUrl, 'START', 0, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.method === 'POST' ? '***' : undefined
    });
    
    // Override res.end để log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        logger.api(req.method, req.originalUrl, res.statusCode, duration, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

// Metrics tracking
const metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    sensitiveQuestionsBlocked: 0,
    outOfScopeQuestionsBlocked: 0,
    circuitBreakerTrips: 0,
    rateLimitHits: 0,
    startTime: Date.now()
};

const updateMetrics = (success, responseTime, type) => {
    metrics.totalRequests++;
    if (success) {
        metrics.successfulRequests++;
    } else {
        metrics.failedRequests++;
    }
    
    // Update average response time
    if (responseTime) {
        metrics.averageResponseTime = metrics.averageResponseTime === 0 
            ? responseTime 
            : (metrics.averageResponseTime + responseTime) / 2;
    }
    
    if (type === 'sensitive') metrics.sensitiveQuestionsBlocked++;
    if (type === 'outOfScope') metrics.outOfScopeQuestionsBlocked++;
    if (type === 'circuitBreaker') metrics.circuitBreakerTrips++;
    if (type === 'rateLimit') metrics.rateLimitHits++;
};

const getMetrics = () => {
    const uptime = Date.now() - metrics.startTime;
    const successRate = metrics.totalRequests > 0 
        ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2) 
        : '0.00';
    
    return {
        ...metrics,
        uptime: Math.floor(uptime / 1000), // seconds
        successRate: `${successRate}%`,
        averageResponseTime: Math.round(metrics.averageResponseTime)
    };
};

// Cleanup old log files (keep only last 7 days)
const cleanupOldLogs = () => {
    try {
        const files = fs.readdirSync(logsDir);
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        files.forEach(file => {
            const filePath = path.join(logsDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime.getTime() < sevenDaysAgo) {
                fs.unlinkSync(filePath);
                logger.info(`Cleaned up old log file: ${file}`);
            }
        });
    } catch (error) {
        logger.error('Error cleaning up old logs:', error);
    }
};

// Run cleanup daily
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

module.exports = {
    logger,
    apiLoggerMiddleware,
    LOG_TYPES,
    updateMetrics,
    getMetrics
};
