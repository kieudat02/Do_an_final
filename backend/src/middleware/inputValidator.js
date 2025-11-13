/**
 * Middleware để validate input cho chatbot
 */

// Validate message input
const validateMessage = (req, res, next) => {
    try {
        const { message, sessionId } = req.body;

        // Kiểm tra message
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Tin nhắn không hợp lệ'
            });
        }

        // Kiểm tra độ dài message
        if (message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Tin nhắn không được để trống'
            });
        }

        if (message.length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Tin nhắn quá dài (tối đa 1000 ký tự)'
            });
        }

        // Kiểm tra sessionId nếu có
        if (sessionId && typeof sessionId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Session ID không hợp lệ'
            });
        }

        // Sanitize message - loại bỏ các ký tự nguy hiểm
        const sanitizedMessage = message
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .trim();

        // Cập nhật message đã sanitize
        req.body.message = sanitizedMessage;

        next();
    } catch (error) {
        console.error('Error in validateMessage:', error);
        return res.status(500).json({
            success: false,
            error: 'Lỗi xử lý dữ liệu đầu vào'
        });
    }
};

// Validate sync history input
const validateSyncHistory = (req, res, next) => {
    try {
        const { sessionId, messages } = req.body;

        // Kiểm tra sessionId
        if (!sessionId || typeof sessionId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Session ID không hợp lệ'
            });
        }

        // Kiểm tra messages
        if (!Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                error: 'Messages phải là một mảng'
            });
        }

        // Kiểm tra số lượng messages
        if (messages.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Quá nhiều tin nhắn (tối đa 100 tin nhắn)'
            });
        }

        // Validate từng message
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            
            if (!msg.role || !msg.content) {
                return res.status(400).json({
                    success: false,
                    error: `Message ${i + 1} thiếu role hoặc content`
                });
            }

            if (!['user', 'assistant'].includes(msg.role)) {
                return res.status(400).json({
                    success: false,
                    error: `Message ${i + 1} có role không hợp lệ`
                });
            }

            if (typeof msg.content !== 'string' || msg.content.length > 2000) {
                return res.status(400).json({
                    success: false,
                    error: `Message ${i + 1} có content không hợp lệ`
                });
            }
        }

        next();
    } catch (error) {
        console.error('Error in validateSyncHistory:', error);
        return res.status(500).json({
            success: false,
            error: 'Lỗi xử lý dữ liệu đầu vào'
        });
    }
};

// Validate session ID parameter
const validateSessionId = (req, res, next) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId || typeof sessionId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Session ID không hợp lệ'
            });
        }

        // Kiểm tra format session ID
        if (!sessionId.startsWith('session_') || sessionId.length < 20) {
            return res.status(400).json({
                success: false,
                error: 'Session ID không đúng định dạng'
            });
        }

        next();
    } catch (error) {
        console.error('Error in validateSessionId:', error);
        return res.status(500).json({
            success: false,
            error: 'Lỗi xử lý dữ liệu đầu vào'
        });
    }
};

module.exports = {
    validateMessage,
    validateSyncHistory,
    validateSessionId
};
