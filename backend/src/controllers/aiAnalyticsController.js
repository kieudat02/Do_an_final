const SentimentAnalysisService = require('../services/sentimentAnalysisService');
const IntentClassificationService = require('../services/intentClassificationService');
const ChatHistory = require('../models/chatHistoryModel');

/**
 * Controller cho AI Analytics
 * Quản lý sentiment analysis, intent classification và metrics
 */

/**
 * Phân tích sentiment của một tin nhắn
 * POST /api/ai-analytics/sentiment
 */
exports.analyzeSentiment = async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Lấy conversation history nếu có sessionId
        let conversationHistory = [];
        if (sessionId) {
            const chatSession = await ChatHistory.findOne({
                sessionId,
                isActive: true
            });

            if (chatSession) {
                conversationHistory = chatSession.getRecentMessages(10);
            }
        }

        // Phân tích sentiment
        const analysis = await SentimentAnalysisService.analyzeSentiment(
            message,
            conversationHistory
        );

        // Kiểm tra escalation
        const escalation = SentimentAnalysisService.shouldEscalate(analysis);

        res.json({
            success: true,
            data: {
                analysis,
                escalation
            }
        });

    } catch (error) {
        console.error('Error in analyzeSentiment:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Phân loại intent của tin nhắn
 * POST /api/ai-analytics/intent
 */
exports.classifyIntent = async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Lấy conversation history
        let conversationHistory = [];
        if (sessionId) {
            const chatSession = await ChatHistory.findOne({
                sessionId,
                isActive: true
            });

            if (chatSession) {
                conversationHistory = chatSession.getRecentMessages(10);
            }
        }

        // Phân loại intent
        const classification = await IntentClassificationService.classifyIntent(
            message,
            conversationHistory
        );

        res.json({
            success: true,
            data: classification
        });

    } catch (error) {
        console.error('Error in classifyIntent:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Phân tích toàn diện (sentiment + intent)
 * POST /api/ai-analytics/analyze
 */
exports.comprehensiveAnalysis = async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Lấy conversation history
        let conversationHistory = [];
        if (sessionId) {
            const chatSession = await ChatHistory.findOne({
                sessionId,
                isActive: true
            });

            if (chatSession) {
                conversationHistory = chatSession.getRecentMessages(10);
            }
        }

        // Chạy song song cả 2 analyses
        const [sentimentAnalysis, intentClassification] = await Promise.all([
            SentimentAnalysisService.analyzeSentiment(message, conversationHistory),
            IntentClassificationService.classifyIntent(message, conversationHistory)
        ]);

        // Kiểm tra escalation
        const escalation = SentimentAnalysisService.shouldEscalate(sentimentAnalysis);

        // Kết hợp insights
        const insights = generateInsights(sentimentAnalysis, intentClassification, escalation);

        res.json({
            success: true,
            data: {
                sentiment: sentimentAnalysis,
                intent: intentClassification,
                escalation,
                insights
            }
        });

    } catch (error) {
        console.error('Error in comprehensiveAnalysis:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Lấy sentiment trend của một session
 * GET /api/ai-analytics/sentiment-trend/:sessionId
 */
exports.getSentimentTrend = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const chatSession = await ChatHistory.findOne({
            sessionId,
            isActive: true
        });

        if (!chatSession) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        // Lấy các tin nhắn có sentiment analysis
        const messages = chatSession.messages.filter(msg =>
            msg.metadata && msg.metadata.sentiment
        );

        if (messages.length === 0) {
            return res.json({
                success: true,
                data: {
                    trend: 'NO_DATA',
                    message: 'No sentiment data available for this session'
                }
            });
        }

        // Tính trend
        const sentimentHistory = messages.map(msg => ({
            sentimentScore: msg.metadata.sentiment.sentimentScore,
            timestamp: msg.timestamp
        }));

        const trend = SentimentAnalysisService.calculateSentimentTrend(sentimentHistory);

        res.json({
            success: true,
            data: {
                sessionId,
                trend,
                messageCount: messages.length,
                sentimentHistory
            }
        });

    } catch (error) {
        console.error('Error in getSentimentTrend:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Lấy intent flow của một session
 * GET /api/ai-analytics/intent-flow/:sessionId
 */
exports.getIntentFlow = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const chatSession = await ChatHistory.findOne({
            sessionId,
            isActive: true
        });

        if (!chatSession) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        // Lấy messages với intent data
        const messages = chatSession.messages.filter(msg =>
            msg.metadata && msg.metadata.intent
        );

        if (messages.length === 0) {
            return res.json({
                success: true,
                data: {
                    flow: 'NO_DATA',
                    message: 'No intent data available for this session'
                }
            });
        }

        // Tạo conversation history với intent
        const conversationHistory = messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            intent: msg.metadata.intent.primaryIntent,
            timestamp: msg.timestamp
        }));

        // Phân tích intent flow
        const flow = IntentClassificationService.analyzeIntentFlow(conversationHistory);

        res.json({
            success: true,
            data: {
                sessionId,
                flow,
                messageCount: messages.length
            }
        });

    } catch (error) {
        console.error('Error in getIntentFlow:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Lấy AI performance metrics
 * GET /api/ai-analytics/metrics
 */
exports.getMetrics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Query filters
        const filters = { isActive: true };
        if (startDate || endDate) {
            filters.createdAt = {};
            if (startDate) filters.createdAt.$gte = new Date(startDate);
            if (endDate) filters.createdAt.$lte = new Date(endDate);
        }

        // Lấy all sessions trong timeframe
        const sessions = await ChatHistory.find(filters);

        // Tính metrics
        const metrics = calculateMetrics(sessions);

        res.json({
            success: true,
            data: metrics
        });

    } catch (error) {
        console.error('Error in getMetrics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Batch analysis cho nhiều messages
 * POST /api/ai-analytics/batch-analyze
 */
exports.batchAnalyze = async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                error: 'Messages array is required'
            });
        }

        // Chạy batch analysis
        const [sentimentResults, intentResults] = await Promise.all([
            SentimentAnalysisService.analyzeBatch(messages),
            IntentClassificationService.classifyBatch(messages)
        ]);

        res.json({
            success: true,
            data: {
                sentimentResults,
                intentResults,
                totalAnalyzed: messages.length
            }
        });

    } catch (error) {
        console.error('Error in batchAnalyze:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Clear AI cache
 * POST /api/ai-analytics/clear-cache
 */
exports.clearCache = async (req, res) => {
    try {
        SentimentAnalysisService.clearCache();
        IntentClassificationService.clearCache();

        res.json({
            success: true,
            message: 'AI cache cleared successfully'
        });

    } catch (error) {
        console.error('Error in clearCache:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Helper: Generate insights từ sentiment + intent
 */
function generateInsights(sentiment, intent, escalation) {
    const insights = [];

    // Insight về sentiment
    if (sentiment.sentimentScore <= -0.8) {
        insights.push({
            type: 'CRITICAL',
            category: 'SENTIMENT',
            message: 'Khách hàng rất không hài lòng - cần xử lý ngay lập tức',
            action: 'Escalate to human support immediately'
        });
    } else if (sentiment.sentimentScore <= -0.4) {
        insights.push({
            type: 'WARNING',
            category: 'SENTIMENT',
            message: 'Khách hàng đang không hài lòng',
            action: 'Use empathetic tone and resolve issues quickly'
        });
    } else if (sentiment.sentimentScore >= 0.8) {
        insights.push({
            type: 'POSITIVE',
            category: 'SENTIMENT',
            message: 'Khách hàng rất hài lòng',
            action: 'Maintain excellent service and encourage booking'
        });
    }

    // Insight về intent
    if (intent.primaryIntent === 'BOOKING' && sentiment.sentimentScore > 0.4) {
        insights.push({
            type: 'OPPORTUNITY',
            category: 'INTENT',
            message: 'Khách hàng muốn đặt tour và có sentiment tích cực',
            action: 'Facilitate booking process smoothly'
        });
    }

    if (intent.primaryIntent === 'SUPPORT' || intent.primaryIntent === 'COMPLAINT') {
        insights.push({
            type: 'ATTENTION',
            category: 'INTENT',
            message: 'Khách hàng cần hỗ trợ hoặc khiếu nại',
            action: 'Prioritize resolution and show empathy'
        });
    }

    // Insight về escalation
    if (escalation.shouldEscalate) {
        insights.push({
            type: 'ACTION_REQUIRED',
            category: 'ESCALATION',
            message: `Cần escalate: ${escalation.reasons.join(', ')}`,
            action: 'Transfer to human agent',
            priority: escalation.priority
        });
    }

    // Insight về context
    if (intent.context.needsClarification) {
        insights.push({
            type: 'INFO',
            category: 'CONTEXT',
            message: 'Tin nhắn chưa rõ ràng, cần làm rõ',
            action: 'Ask clarifying questions'
        });
    }

    return insights;
}

/**
 * Helper: Calculate metrics từ sessions
 */
function calculateMetrics(sessions) {
    let totalMessages = 0;
    let totalSentimentScore = 0;
    let sentimentCount = 0;
    const intentCounts = {};
    const emotionCounts = {};
    let escalationCount = 0;

    sessions.forEach(session => {
        totalMessages += session.totalMessages;

        session.messages.forEach(msg => {
            // Sentiment metrics
            if (msg.metadata && msg.metadata.sentiment) {
                totalSentimentScore += msg.metadata.sentiment.sentimentScore;
                sentimentCount++;

                // Count emotions
                msg.metadata.sentiment.emotions?.forEach(emotion => {
                    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                });

                // Count escalations
                if (msg.metadata.sentiment.sentimentScore <= -0.8) {
                    escalationCount++;
                }
            }

            // Intent metrics
            if (msg.metadata && msg.metadata.intent) {
                const intent = msg.metadata.intent.primaryIntent;
                intentCounts[intent] = (intentCounts[intent] || 0) + 1;
            }
        });
    });

    // Top intents
    const topIntents = Object.entries(intentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([intent, count]) => ({ intent, count }));

    // Top emotions
    const topEmotions = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([emotion, count]) => ({ emotion, count }));

    return {
        period: {
            totalSessions: sessions.length,
            totalMessages
        },
        sentiment: {
            averageScore: sentimentCount > 0 ? (totalSentimentScore / sentimentCount).toFixed(2) : 0,
            totalAnalyzed: sentimentCount,
            escalationCount,
            escalationRate: sentimentCount > 0 ? ((escalationCount / sentimentCount) * 100).toFixed(2) : 0
        },
        intent: {
            totalClassified: Object.values(intentCounts).reduce((a, b) => a + b, 0),
            topIntents,
            uniqueIntents: Object.keys(intentCounts).length
        },
        emotions: {
            topEmotions,
            totalDetected: Object.values(emotionCounts).reduce((a, b) => a + b, 0)
        }
    };
}

module.exports = exports;