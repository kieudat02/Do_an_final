/**
 * Utility để đo và theo dõi thời gian phản hồi ở frontend
 */

/**
 * Class để track response time
 */
class ResponseTimeTracker {
    constructor() {
        this.activeRequests = new Map();
        this.completedRequests = [];
        this.maxStoredRequests = 1000; // Giới hạn số request lưu trữ
    }

    /**
     * Bắt đầu đo thời gian cho một request
     * @param {string} requestId - ID unique của request
     * @param {Object} metadata - Thông tin bổ sung
     */
    startTracking(requestId, metadata = {}) {
        const startTime = performance.now();
        const timestamp = new Date();

        this.activeRequests.set(requestId, {
            requestId,
            startTime,
            timestamp,
            metadata: {
                endpoint: metadata.endpoint || 'unknown',
                sessionId: metadata.sessionId || 'unknown',
                messageId: metadata.messageId || requestId,
                inputLength: metadata.inputLength || 0,
                requestType: metadata.requestType || 'unknown',
                ...metadata
            }
        });

        console.log(`⏱️ Started tracking request: ${requestId}`);
        return requestId;
    }

    /**
     * Kết thúc đo thời gian cho một request
     * @param {string} requestId - ID của request
     * @param {Object} result - Kết quả response
     */
    endTracking(requestId, result = {}) {
        const activeRequest = this.activeRequests.get(requestId);
        if (!activeRequest) {
            console.warn(`⚠️ Request ${requestId} not found in active tracking`);
            return null;
        }

        const endTime = performance.now();
        const responseTime = endTime - activeRequest.startTime;
        const endTimestamp = new Date();

        const completedRequest = {
            ...activeRequest,
            endTime,
            endTimestamp,
            responseTime: Math.round(responseTime * 100) / 100, // Round to 2 decimal places
            success: result.success !== false,
            statusCode: result.statusCode || (result.success !== false ? 200 : 500),
            error: result.error || null,
            outputLength: result.outputLength || 0,
            result: result.data || null
        };

        // Xóa khỏi active requests
        this.activeRequests.delete(requestId);

        // Thêm vào completed requests
        this.completedRequests.push(completedRequest);

        // Giới hạn số lượng requests lưu trữ
        if (this.completedRequests.length > this.maxStoredRequests) {
            this.completedRequests.shift(); // Xóa request cũ nhất
        }

        // Log kết quả
        const logData = {
            requestId,
            responseTime: completedRequest.responseTime,
            success: completedRequest.success,
            endpoint: completedRequest.metadata.endpoint
        };

        if (completedRequest.responseTime > 3000) {
            console.warn('🐌 Slow request detected:', logData);
        } else {
            console.log('✅ Request completed:', logData);
        }

        // Lưu vào localStorage (optional)
        this.saveToLocalStorage(completedRequest);

        return completedRequest;
    }

    /**
     * Lấy thống kê response time
     * @param {Object} filters - Bộ lọc
     */
    getStats(filters = {}) {
        let requests = this.completedRequests;

        // Apply filters
        if (filters.endpoint) {
            requests = requests.filter(req => req.metadata.endpoint.includes(filters.endpoint));
        }

        if (filters.sessionId) {
            requests = requests.filter(req => req.metadata.sessionId === filters.sessionId);
        }

        if (filters.timeRange) {
            const now = Date.now();
            const timeLimit = now - (filters.timeRange * 60 * 1000); // timeRange in minutes
            requests = requests.filter(req => req.timestamp.getTime() > timeLimit);
        }

        if (requests.length === 0) {
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

        // Calculate stats
        const responseTimes = requests.map(req => req.responseTime).sort((a, b) => a - b);
        const successfulRequests = requests.filter(req => req.success).length;

        // Percentiles
        const p50Index = Math.floor(responseTimes.length * 0.5);
        const p95Index = Math.floor(responseTimes.length * 0.95);
        const p99Index = Math.floor(responseTimes.length * 0.99);

        return {
            totalRequests: requests.length,
            successfulRequests,
            failedRequests: requests.length - successfulRequests,
            successRate: Math.round((successfulRequests / requests.length) * 10000) / 100,
            averageResponseTime: Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 100) / 100,
            minResponseTime: responseTimes[0] || 0,
            maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
            p50: responseTimes[p50Index] || 0,
            p95: responseTimes[p95Index] || 0,
            p99: responseTimes[p99Index] || 0,
            requests: requests.slice(-10) // Last 10 requests for debugging
        };
    }

    /**
     * Lấy trend response time theo thời gian
     * @param {number} intervalMinutes - Khoảng thời gian group (phút)
     */
    getTrend(intervalMinutes = 5) {
        const now = Date.now();
        const intervals = {};

        this.completedRequests.forEach(req => {
            const intervalStart = Math.floor(req.timestamp.getTime() / (intervalMinutes * 60 * 1000)) * (intervalMinutes * 60 * 1000);
            
            if (!intervals[intervalStart]) {
                intervals[intervalStart] = {
                    timestamp: new Date(intervalStart),
                    requests: [],
                    totalRequests: 0,
                    successfulRequests: 0
                };
            }

            intervals[intervalStart].requests.push(req.responseTime);
            intervals[intervalStart].totalRequests++;
            if (req.success) {
                intervals[intervalStart].successfulRequests++;
            }
        });

        // Convert to array and calculate averages
        return Object.values(intervals)
            .map(interval => ({
                timestamp: interval.timestamp,
                totalRequests: interval.totalRequests,
                successfulRequests: interval.successfulRequests,
                successRate: Math.round((interval.successfulRequests / interval.totalRequests) * 10000) / 100,
                averageResponseTime: interval.requests.length > 0 
                    ? Math.round((interval.requests.reduce((a, b) => a + b, 0) / interval.requests.length) * 100) / 100
                    : 0
            }))
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }

    /**
     * Lưu request vào localStorage
     */
    saveToLocalStorage(request) {
        try {
            const key = 'chatbot_response_times';
            const stored = JSON.parse(localStorage.getItem(key) || '[]');
            
            stored.push({
                requestId: request.requestId,
                responseTime: request.responseTime,
                success: request.success,
                timestamp: request.timestamp.toISOString(),
                endpoint: request.metadata.endpoint,
                sessionId: request.metadata.sessionId
            });

            // Giới hạn 100 requests trong localStorage
            if (stored.length > 100) {
                stored.splice(0, stored.length - 100);
            }

            localStorage.setItem(key, JSON.stringify(stored));
        } catch (error) {
            console.warn('Cannot save response time to localStorage:', error);
        }
    }

    /**
     * Load requests từ localStorage
     */
    loadFromLocalStorage() {
        try {
            const key = 'chatbot_response_times';
            const stored = JSON.parse(localStorage.getItem(key) || '[]');
            
            return stored.map(item => ({
                ...item,
                timestamp: new Date(item.timestamp)
            }));
        } catch (error) {
            console.warn('Cannot load response times from localStorage:', error);
            return [];
        }
    }

    /**
     * Clear all data
     */
    clear() {
        this.activeRequests.clear();
        this.completedRequests = [];
        
        try {
            localStorage.removeItem('chatbot_response_times');
        } catch (error) {
            console.warn('Cannot clear localStorage:', error);
        }
    }

    /**
     * Export data for analysis
     */
    exportData() {
        return {
            activeRequests: Array.from(this.activeRequests.values()),
            completedRequests: this.completedRequests,
            stats: this.getStats(),
            trend: this.getTrend()
        };
    }
}

// Singleton instance
const responseTimeTracker = new ResponseTimeTracker();

/**
 * Hook để track response time cho API calls
 */
export const useResponseTimeTracking = () => {
    const trackRequest = (requestId, metadata) => {
        return responseTimeTracker.startTracking(requestId, metadata);
    };

    const completeRequest = (requestId, result) => {
        return responseTimeTracker.endTracking(requestId, result);
    };

    const getStats = (filters) => {
        return responseTimeTracker.getStats(filters);
    };

    const getTrend = (intervalMinutes) => {
        return responseTimeTracker.getTrend(intervalMinutes);
    };

    const exportData = () => {
        return responseTimeTracker.exportData();
    };

    const clear = () => {
        return responseTimeTracker.clear();
    };

    return {
        trackRequest,
        completeRequest,
        getStats,
        getTrend,
        exportData,
        clear
    };
};

export default responseTimeTracker;
