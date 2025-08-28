const {
    askGemini,
    getChatHistory,
    clearChatHistory,
    createNewSession,
    invalidateCache,
    getCacheStatus
} = require('../services/geminiService');

const TourDataService = require('../services/tourDataService');

/**
 * Gửi tin nhắn đến chatbot
 */
exports.sendMessage = async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        // Validate input
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Tin nhắn không được để trống'
            });
        }

        // Kiểm tra độ dài tin nhắn
        if (message.trim().length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Tin nhắn quá dài. Vui lòng nhập tối đa 1000 ký tự.'
            });
        }

        // Gửi tin nhắn đến Gemini AI
        const result = await askGemini(message.trim(), sessionId);

        if (result.success) {
            return res.status(200).json({
                success: true,
                data: {
                    reply: result.reply,
                    sessionId: result.sessionId,
                    timestamp: result.timestamp
                }
            });
        } else {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('ChatBot Controller Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi xử lý tin nhắn. Vui lòng thử lại sau.'
        });
    }
};

/**
 * Lấy lịch sử hội thoại
 */
exports.getHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Session ID không hợp lệ'
            });
        }

        const result = await getChatHistory(sessionId);

        if (result.success) {
            return res.status(200).json({
                success: true,
                data: {
                    history: result.history,
                    sessionId: result.sessionId
                }
            });
        } else {
            return res.status(404).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Get History Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể lấy lịch sử hội thoại'
        });
    }
};

/**
 * Xóa lịch sử hội thoại
 */
exports.clearHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Session ID không hợp lệ'
            });
        }

        const result = await clearChatHistory(sessionId);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } else {
            return res.status(400).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Clear History Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể xóa lịch sử hội thoại'
        });
    }
};

/**
 * Tạo session hội thoại mới
 */
exports.createSession = async (req, res) => {
    try {
        const result = await createNewSession();

        return res.status(201).json({
            success: true,
            data: {
                sessionId: result.sessionId,
                message: result.message
            }
        });

    } catch (error) {
        console.error('Create Session Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể tạo phiên hội thoại mới'
        });
    }
};

/**
 * Tìm kiếm tour theo từ khóa
 */
exports.searchTours = async (req, res) => {
    try {
        const { keyword } = req.query;

        if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Từ khóa tìm kiếm không được để trống'
            });
        }

        if (keyword.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự'
            });
        }

        const tours = await TourDataService.searchTours(keyword.trim());

        return res.status(200).json({
            success: true,
            data: {
                keyword: keyword.trim(),
                totalResults: tours.length,
                tours: tours
            }
        });

    } catch (error) {
        console.error('Search Tours Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi tìm kiếm tour'
        });
    }
};

/**
 * Lấy tours theo khoảng giá
 */
exports.getToursByPriceRange = async (req, res) => {
    try {
        const { minPrice, maxPrice } = req.query;

        const min = parseInt(minPrice) || 0;
        const max = parseInt(maxPrice) || 999999999;

        if (min < 0 || max < 0) {
            return res.status(400).json({
                success: false,
                error: 'Giá không được âm'
            });
        }

        if (min > max) {
            return res.status(400).json({
                success: false,
                error: 'Giá tối thiểu không được lớn hơn giá tối đa'
            });
        }

        const tours = await TourDataService.getToursByPriceRange(min, max);

        return res.status(200).json({
            success: true,
            data: {
                priceRange: { minPrice: min, maxPrice: max },
                totalResults: tours.length,
                tours: tours
            }
        });

    } catch (error) {
        console.error('Get Tours By Price Range Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi lấy tour theo giá'
        });
    }
};

/**
 * Lấy thông tin context cho chatbot
 */
exports.getChatbotContext = async (req, res) => {
    try {
        const context = await TourDataService.getChatbotContext();

        return res.status(200).json({
            success: true,
            data: context
        });

    } catch (error) {
        console.error('Get Chatbot Context Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể lấy thông tin context'
        });
    }
};

/**
 * Lấy chi tiết tour
 */
exports.getTourDetails = async (req, res) => {
    try {
        const { tourId } = req.params;

        if (!tourId) {
            return res.status(400).json({
                success: false,
                error: 'ID tour không hợp lệ'
            });
        }

        const tour = await TourDataService.getTourDetails(tourId);

        if (!tour) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy tour'
            });
        }

        return res.status(200).json({
            success: true,
            data: tour
        });

    } catch (error) {
        console.error('Get Tour Details Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể lấy thông tin chi tiết tour'
        });
    }
};

/**
 * Kiểm tra trạng thái chatbot
 */
exports.getStatus = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            data: {
                status: 'online',
                message: 'Chatbot đang hoạt động bình thường',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Get Status Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể kiểm tra trạng thái chatbot'
        });
    }
};

/**
 * Invalidate cache - force refresh data
 */
exports.invalidateCache = async (req, res) => {
    try {
        invalidateCache();
        return res.status(200).json({
            success: true,
            message: 'Cache đã được xóa thành công'
        });
    } catch (error) {
        console.error('Invalidate Cache Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể xóa cache'
        });
    }
};

/**
 * Get cache status
 */
exports.getCacheStatus = async (req, res) => {
    try {
        const status = getCacheStatus();
        return res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Get Cache Status Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Không thể lấy trạng thái cache'
        });
    }
};

/**
 * Health check endpoint - kiểm tra toàn bộ hệ thống
 */
exports.healthCheck = async (req, res) => {
    try {
        const [cacheStatus, contextData] = await Promise.all([
            Promise.resolve(getCacheStatus()),
            TourDataService.getChatbotContext()
        ]);

        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            cache: cacheStatus,
            database: {
                connected: true,
                totalTours: contextData.statistics.totalTours,
                totalCategories: contextData.statistics.totalCategories,
                totalDestinations: contextData.statistics.totalDestinations,
                dataIntegrity: contextData.dataIntegrity
            },
            services: {
                geminiAI: !!process.env.GEMINI_API_KEY,
                tourDataService: true
            }
        };

        return res.status(200).json({
            success: true,
            data: healthStatus
        });
    } catch (error) {
        console.error('Health Check Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Hệ thống gặp sự cố',
            details: error.message
        });
    }
};

// Backward compatibility - giữ lại method cũ
exports.askBot = exports.sendMessage;