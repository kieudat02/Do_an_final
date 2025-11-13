const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

// Khởi tạo Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Service phân tích cảm xúc khách hàng (Sentiment Analysis)
 * Sử dụng Gemini AI để phát hiện cảm xúc và gợi ý tone phản hồi
 */
class SentimentAnalysisService {
    constructor() {
        // Sentiment thresholds
        this.THRESHOLDS = {
            VERY_NEGATIVE: -0.8,
            NEGATIVE: -0.4,
            NEUTRAL: 0.4,
            POSITIVE: 0.8
        };

        // Tone suggestions based on sentiment
        this.TONE_SUGGESTIONS = {
            VERY_NEGATIVE: {
                tone: 'empathetic_apologetic',
                description: 'Thấu hiểu, xin lỗi chân thành, giải quyết vấn đề ngay lập tức',
                keywords: ['xin lỗi', 'rất tiếc', 'thấu hiểu', 'ưu tiên giải quyết', 'hỗ trợ ngay'],
                escalate: true
            },
            NEGATIVE: {
                tone: 'understanding_helpful',
                description: 'Thấu hiểu, nhiệt tình hỗ trợ, tập trung giải quyết',
                keywords: ['hiểu được', 'hỗ trợ ngay', 'giúp bạn', 'giải quyết'],
                escalate: false
            },
            NEUTRAL: {
                tone: 'professional_friendly',
                description: 'Chuyên nghiệp, thân thiện, nhiệt tình',
                keywords: ['có thể', 'giúp bạn', 'tư vấn', 'thông tin'],
                escalate: false
            },
            POSITIVE: {
                tone: 'enthusiastic_warm',
                description: 'Nhiệt tình, ấm áp, khuyến khích',
                keywords: ['tuyệt vời', 'rất vui', 'hân hạnh', 'cảm ơn'],
                escalate: false
            },
            VERY_POSITIVE: {
                tone: 'celebratory_grateful',
                description: 'Vui mừng, biết ơn, tạo trải nghiệm tốt nhất',
                keywords: ['tuyệt vời', 'rất vui', 'cảm ơn', 'hân hạnh phục vụ'],
                escalate: false
            }
        };

        // Emotion categories
        this.EMOTIONS = {
            ANGRY: 'tức giận',
            FRUSTRATED: 'bực bội',
            DISAPPOINTED: 'thất vọng',
            WORRIED: 'lo lắng',
            NEUTRAL: 'trung tính',
            CURIOUS: 'tò mò',
            SATISFIED: 'hài lòng',
            HAPPY: 'vui vẻ',
            EXCITED: 'phấn khích'
        };

        // Cache để tránh phân tích lại tin nhắn giống nhau
        this.cache = new Map();
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 phút
    }

    /**
     * Phân tích sentiment của một tin nhắn
     * @param {string} message - Tin nhắn cần phân tích
     * @param {Array} conversationHistory - Lịch sử hội thoại (optional)
     * @returns {Object} Sentiment analysis result
     */
    async analyzeSentiment(message, conversationHistory = []) {
        try {
            // Kiểm tra cache
            const cacheKey = this.generateCacheKey(message);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('[Sentiment] Using cached analysis');
                return cached;
            }

            // Tạo prompt cho Gemini AI
            const prompt = this.buildSentimentPrompt(message, conversationHistory);

            // Gọi Gemini AI
            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                generationConfig: {
                    temperature: 0.3, // Thấp để consistent
                    maxOutputTokens: 256
                }
            });

            const result = await model.generateContent(prompt);
            const response = result.response.text();

            // Parse JSON response
            const analysis = this.parseAnalysisResponse(response);

            // Thêm tone suggestion
            analysis.toneSuggestion = this.getToneSuggestion(analysis.sentimentScore);

            // Lưu vào cache
            this.saveToCache(cacheKey, analysis);

            return analysis;

        } catch (error) {
            console.error('[Sentiment] Error analyzing sentiment:', error);
            // Fallback sang rule-based analysis
            return this.fallbackAnalysis(message);
        }
    }

    /**
     * Xây dựng prompt cho sentiment analysis
     * @param {string} message - Tin nhắn
     * @param {Array} history - Lịch sử hội thoại
     * @returns {string}
     */
    buildSentimentPrompt(message, history = []) {
        let prompt = `Bạn là chuyên gia phân tích cảm xúc khách hàng trong lĩnh vực du lịch.

📝 TIN NHẮN CẦN PHÂN TÍCH:
"${message}"
`;

        // Thêm context nếu có
        if (history.length > 0) {
            const recentHistory = history.slice(-5); // 5 tin nhắn gần nhất
            prompt += `\n📜 LỊCH SỬ HỘI THOẠI (context):\n`;
            recentHistory.forEach(msg => {
                prompt += `${msg.role === 'user' ? '👤' : '🤖'}: ${msg.content}\n`;
            });
        }

        prompt += `
🎯 YÊU CẦU:
Phân tích tin nhắn và trả về JSON với cấu trúc sau:

{
  "sentimentScore": <số từ -1.0 đến 1.0>,
  "sentimentLabel": "<VERY_NEGATIVE|NEGATIVE|NEUTRAL|POSITIVE|VERY_POSITIVE>",
  "emotions": ["<cảm xúc 1>", "<cảm xúc 2>"],
  "confidence": <số từ 0 đến 1>,
  "indicators": {
    "positive": ["<từ/cụm tích cực>"],
    "negative": ["<từ/cụm tiêu cực>"],
    "neutral": ["<từ/cụm trung tính>"]
  },
  "urgency": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "reasoning": "<giải thích ngắn gọn>"
}

📊 HƯỚNG DẪN CHẤM ĐIỂM:
- **-1.0 đến -0.8**: VERY_NEGATIVE - Rất tức giận, khiếu nại nghiêm trọng
- **-0.8 đến -0.4**: NEGATIVE - Không hài lòng, phàn nàn
- **-0.4 đến 0.4**: NEUTRAL - Trung tính, hỏi thông tin
- **0.4 đến 0.8**: POSITIVE - Hài lòng, tích cực
- **0.8 đến 1.0**: VERY_POSITIVE - Rất hài lòng, khen ngợi

🎭 EMOTIONS có thể có:
angry, frustrated, disappointed, worried, neutral, curious, satisfied, happy, excited

⚠️ URGENCY levels:
- **CRITICAL**: Khiếu nại nghiêm trọng, cần xử lý ngay
- **HIGH**: Vấn đề cần giải quyết sớm
- **MEDIUM**: Câu hỏi thông thường
- **LOW**: Chào hỏi, chat thông thường

Chỉ trả về JSON, không có text thừa.`;

        return prompt;
    }

    /**
     * Parse response từ Gemini AI
     * @param {string} response - Response text
     * @returns {Object}
     */
    parseAnalysisResponse(response) {
        try {
            // Remove markdown code blocks nếu có
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n?/g, '');
            }

            const parsed = JSON.parse(cleanResponse);

            return {
                sentimentScore: parsed.sentimentScore || 0,
                sentimentLabel: parsed.sentimentLabel || 'NEUTRAL',
                emotions: parsed.emotions || ['neutral'],
                confidence: parsed.confidence || 0.5,
                indicators: parsed.indicators || { positive: [], negative: [], neutral: [] },
                urgency: parsed.urgency || 'MEDIUM',
                reasoning: parsed.reasoning || '',
                timestamp: new Date()
            };

        } catch (error) {
            console.error('[Sentiment] Error parsing response:', error);
            console.log('Response was:', response);
            throw error;
        }
    }

    /**
     * Fallback analysis khi Gemini AI lỗi (rule-based)
     * @param {string} message
     * @returns {Object}
     */
    fallbackAnalysis(message) {
        const lowerMessage = message.toLowerCase();

        // Từ khóa tiêu cực
        const negativeKeywords = [
            'tệ', 'kém', 'không tốt', 'thất vọng', 'tức', 'giận', 'bực', 'chán',
            'khiếu nại', 'phàn nàn', 'lừa đảo', 'lừa', 'không uy tín', 'kém chất lượng',
            'tồi tệ', 'quá đắt', 'mắc', 'không đáng', 'hủy', 'hoàn tiền'
        ];

        // Từ khóa tích cực
        const positiveKeywords = [
            'tốt', 'hay', 'tuyệt', 'ok', 'được', 'ổn', 'cảm ơn', 'thank',
            'hài lòng', 'vui', 'thích', 'tuyệt vời', 'xuất sắc', 'hoàn hảo',
            'đẹp', 'chất lượng', 'uy tín', 'chuyên nghiệp'
        ];

        let negativeCount = 0;
        let positiveCount = 0;

        negativeKeywords.forEach(keyword => {
            if (lowerMessage.includes(keyword)) negativeCount++;
        });

        positiveKeywords.forEach(keyword => {
            if (lowerMessage.includes(keyword)) positiveCount++;
        });

        // Tính sentiment score
        let sentimentScore = 0;
        let sentimentLabel = 'NEUTRAL';
        let urgency = 'MEDIUM';
        let emotions = ['neutral'];

        if (negativeCount > positiveCount) {
            sentimentScore = -0.5 - (negativeCount * 0.1);
            sentimentScore = Math.max(sentimentScore, -1.0);

            if (sentimentScore <= -0.8) {
                sentimentLabel = 'VERY_NEGATIVE';
                urgency = 'CRITICAL';
                emotions = ['angry', 'frustrated'];
            } else {
                sentimentLabel = 'NEGATIVE';
                urgency = 'HIGH';
                emotions = ['disappointed', 'worried'];
            }
        } else if (positiveCount > negativeCount) {
            sentimentScore = 0.5 + (positiveCount * 0.1);
            sentimentScore = Math.min(sentimentScore, 1.0);

            if (sentimentScore >= 0.8) {
                sentimentLabel = 'VERY_POSITIVE';
                emotions = ['excited', 'happy'];
            } else {
                sentimentLabel = 'POSITIVE';
                emotions = ['satisfied', 'happy'];
            }
            urgency = 'LOW';
        }

        // Get tone suggestion
        const toneSuggestion = this.getToneSuggestion(sentimentScore);

        return {
            sentimentScore,
            sentimentLabel,
            emotions,
            confidence: 0.6, // Lower confidence cho rule-based
            indicators: {
                positive: positiveKeywords.filter(k => lowerMessage.includes(k)),
                negative: negativeKeywords.filter(k => lowerMessage.includes(k)),
                neutral: []
            },
            urgency,
            reasoning: 'Rule-based fallback analysis',
            toneSuggestion, // Thêm tone suggestion
            timestamp: new Date(),
            isFallback: true
        };
    }

    /**
     * Lấy tone suggestion dựa trên sentiment score
     * @param {number} score - Sentiment score
     * @returns {Object}
     */
    getToneSuggestion(score) {
        if (score <= this.THRESHOLDS.VERY_NEGATIVE) {
            return this.TONE_SUGGESTIONS.VERY_NEGATIVE;
        } else if (score <= this.THRESHOLDS.NEGATIVE) {
            return this.TONE_SUGGESTIONS.NEGATIVE;
        } else if (score <= this.THRESHOLDS.NEUTRAL) {
            return this.TONE_SUGGESTIONS.NEUTRAL;
        } else if (score <= this.THRESHOLDS.POSITIVE) {
            return this.TONE_SUGGESTIONS.POSITIVE;
        } else {
            return this.TONE_SUGGESTIONS.VERY_POSITIVE;
        }
    }

    /**
     * Kiểm tra có cần escalate sang human không
     * @param {Object} analysis - Sentiment analysis result
     * @returns {Object}
     */
    shouldEscalate(analysis) {
        const reasons = [];

        // Sentiment rất tiêu cực
        if (analysis.sentimentScore <= this.THRESHOLDS.VERY_NEGATIVE) {
            reasons.push('Sentiment rất tiêu cực (score <= -0.8)');
        }

        // Urgency cao
        if (analysis.urgency === 'CRITICAL' || analysis.urgency === 'HIGH') {
            reasons.push(`Urgency level: ${analysis.urgency}`);
        }

        // Emotions tiêu cực mạnh
        const strongNegativeEmotions = ['angry', 'frustrated'];
        const hasStrongNegative = analysis.emotions.some(e =>
            strongNegativeEmotions.includes(e)
        );
        if (hasStrongNegative) {
            reasons.push('Cảm xúc tiêu cực mạnh: ' + analysis.emotions.join(', '));
        }

        // Từ khóa escalation
        const escalationKeywords = ['khiếu nại', 'lừa đảo', 'hoàn tiền', 'hủy tour', 'không uy tín'];
        const hasEscalationKeyword = analysis.indicators.negative.some(word =>
            escalationKeywords.some(keyword => word.includes(keyword))
        );
        if (hasEscalationKeyword) {
            reasons.push('Chứa từ khóa yêu cầu escalation');
        }

        return {
            shouldEscalate: reasons.length > 0,
            reasons,
            priority: analysis.urgency
        };
    }

    /**
     * Phân tích batch messages (nhiều tin nhắn cùng lúc)
     * @param {Array} messages - Danh sách tin nhắn
     * @returns {Array}
     */
    async analyzeBatch(messages) {
        const results = [];

        for (const message of messages) {
            try {
                const analysis = await this.analyzeSentiment(message.content, []);
                results.push({
                    messageId: message.id,
                    ...analysis
                });
            } catch (error) {
                console.error(`[Sentiment] Error analyzing message ${message.id}:`, error);
                results.push({
                    messageId: message.id,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Tính sentiment trend trong conversation
     * @param {Array} sentimentHistory - Lịch sử sentiment analysis
     * @returns {Object}
     */
    calculateSentimentTrend(sentimentHistory) {
        if (!sentimentHistory || sentimentHistory.length === 0) {
            return {
                trend: 'STABLE',
                direction: 'NEUTRAL',
                improvement: 0,
                averageScore: 0
            };
        }

        const scores = sentimentHistory.map(s => s.sentimentScore);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        // So sánh nửa đầu vs nửa sau
        const mid = Math.floor(scores.length / 2);
        const firstHalf = scores.slice(0, mid);
        const secondHalf = scores.slice(mid);

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        const improvement = secondAvg - firstAvg;

        let trend = 'STABLE';
        let direction = 'NEUTRAL';

        if (Math.abs(improvement) > 0.2) {
            trend = 'CHANGING';
            direction = improvement > 0 ? 'IMPROVING' : 'DECLINING';
        }

        return {
            trend,
            direction,
            improvement: improvement.toFixed(2),
            averageScore: averageScore.toFixed(2),
            firstHalfAvg: firstAvg.toFixed(2),
            secondHalfAvg: secondAvg.toFixed(2)
        };
    }

    /**
     * Cache helpers
     */
    generateCacheKey(message) {
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            const char = message.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `sentiment_${hash}`;
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > this.CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    saveToCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        // Cleanup old cache entries
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('[Sentiment] Cache cleared');
    }
}

module.exports = new SentimentAnalysisService();