const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

// Khởi tạo Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Service phân loại intent của khách hàng (Intent Classification)
 * Sử dụng Gemini AI để nhận diện ý định và hành động cần thiết
 */
class IntentClassificationService {
    constructor() {
        // Định nghĩa các intent types
        this.INTENT_TYPES = {
            // Core intents
            BOOKING: {
                name: 'BOOKING',
                description: 'Khách hàng muốn đặt tour',
                keywords: ['đặt', 'book', 'booking', 'đặt tour', 'đặt chỗ', 'mua'],
                priority: 'HIGH',
                requiresAction: true,
                actions: ['show_booking_form', 'provide_booking_link']
            },
            CONSULTATION: {
                name: 'CONSULTATION',
                description: 'Tư vấn, gợi ý tour',
                keywords: ['tư vấn', 'gợi ý', 'recommend', 'nên đi', 'tour nào'],
                priority: 'MEDIUM',
                requiresAction: true,
                actions: ['recommend_tours', 'ask_preferences']
            },
            ORDER_LOOKUP: {
                name: 'ORDER_LOOKUP',
                description: 'Tra cứu đơn hàng',
                keywords: ['tra cứu', 'đơn hàng', 'order', 'kiểm tra', 'xem đơn'],
                priority: 'HIGH',
                requiresAction: true,
                actions: ['request_order_id', 'lookup_order']
            },
            PAYMENT: {
                name: 'PAYMENT',
                description: 'Thanh toán, vấn đề thanh toán',
                keywords: ['thanh toán', 'payment', 'pay', 'chuyển khoản', 'tiền'],
                priority: 'HIGH',
                requiresAction: true,
                actions: ['check_payment_status', 'provide_payment_link']
            },
            SUPPORT: {
                name: 'SUPPORT',
                description: 'Hỗ trợ, khiếu nại, vấn đề',
                keywords: ['hỗ trợ', 'help', 'support', 'khiếu nại', 'vấn đề', 'lỗi'],
                priority: 'HIGH',
                requiresAction: true,
                actions: ['provide_support', 'escalate_to_human']
            },

            // Information intents
            TOUR_INFO: {
                name: 'TOUR_INFO',
                description: 'Hỏi thông tin tour cụ thể',
                keywords: ['thông tin', 'chi tiết', 'lịch trình', 'itinerary', 'bao gồm'],
                priority: 'MEDIUM',
                requiresAction: true,
                actions: ['provide_tour_details']
            },
            PRICE_INQUIRY: {
                name: 'PRICE_INQUIRY',
                description: 'Hỏi về giá',
                keywords: ['giá', 'price', 'chi phí', 'bao nhiêu', 'cost'],
                priority: 'MEDIUM',
                requiresAction: true,
                actions: ['provide_pricing']
            },
            SCHEDULE_INQUIRY: {
                name: 'SCHEDULE_INQUIRY',
                description: 'Hỏi về lịch khởi hành',
                keywords: ['lịch', 'schedule', 'ngày', 'khởi hành', 'departure', 'khi nào'],
                priority: 'MEDIUM',
                requiresAction: true,
                actions: ['provide_schedule']
            },
            AVAILABILITY: {
                name: 'AVAILABILITY',
                description: 'Hỏi còn chỗ không',
                keywords: ['còn chỗ', 'available', 'availability', 'còn không', 'hết chỗ'],
                priority: 'MEDIUM',
                requiresAction: true,
                actions: ['check_availability']
            },

            // Conversation intents
            GREETING: {
                name: 'GREETING',
                description: 'Chào hỏi',
                keywords: ['chào', 'hello', 'hi', 'xin chào', 'hey'],
                priority: 'LOW',
                requiresAction: false,
                actions: ['greet_back']
            },
            SMALL_TALK: {
                name: 'SMALL_TALK',
                description: 'Trò chuyện xã giao',
                keywords: ['thế nào', 'như thế nào', 'sao', 'thế'],
                priority: 'LOW',
                requiresAction: false,
                actions: ['respond_politely']
            },
            GRATITUDE: {
                name: 'GRATITUDE',
                description: 'Cảm ơn',
                keywords: ['cảm ơn', 'thank', 'thanks', 'cám ơn'],
                priority: 'LOW',
                requiresAction: false,
                actions: ['acknowledge_thanks']
            },
            FAREWELL: {
                name: 'FAREWELL',
                description: 'Tạm biệt',
                keywords: ['tạm biệt', 'bye', 'goodbye', 'chào', 'thôi'],
                priority: 'LOW',
                requiresAction: false,
                actions: ['say_goodbye']
            },

            // Comparison intent
            COMPARISON: {
                name: 'COMPARISON',
                description: 'So sánh tours',
                keywords: ['so sánh', 'compare', 'khác nhau', 'difference', 'tốt hơn'],
                priority: 'MEDIUM',
                requiresAction: true,
                actions: ['compare_tours']
            },

            // Unknown intent
            UNKNOWN: {
                name: 'UNKNOWN',
                description: 'Không xác định được intent',
                keywords: [],
                priority: 'LOW',
                requiresAction: false,
                actions: ['ask_clarification']
            }
        };

        // Cache
        this.cache = new Map();
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 phút
    }

    /**
     * Phân loại intent của một tin nhắn
     * @param {string} message - Tin nhắn cần phân loại
     * @param {Array} conversationHistory - Lịch sử hội thoại
     * @returns {Object} Intent classification result
     */
    async classifyIntent(message, conversationHistory = []) {
        try {
            // Kiểm tra cache
            const cacheKey = this.generateCacheKey(message);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('[Intent] Using cached classification');
                return cached;
            }

            // Tạo prompt cho Gemini AI
            const prompt = this.buildClassificationPrompt(message, conversationHistory);

            // Gọi Gemini AI
            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                generationConfig: {
                    temperature: 0.2, // Rất thấp để consistent
                    maxOutputTokens: 512
                }
            });

            const result = await model.generateContent(prompt);
            const response = result.response.text();

            // Parse JSON response
            const classification = this.parseClassificationResponse(response);

            // Enrich với intent metadata
            classification.metadata = this.getIntentMetadata(classification.primaryIntent);

            // Lưu vào cache
            this.saveToCache(cacheKey, classification);

            return classification;

        } catch (error) {
            console.error('[Intent] Error classifying intent:', error);
            // Fallback sang rule-based classification
            return this.fallbackClassification(message);
        }
    }

    /**
     * Xây dựng prompt cho intent classification
     * @param {string} message - Tin nhắn
     * @param {Array} history - Lịch sử
     * @returns {string}
     */
    buildClassificationPrompt(message, history = []) {
        let prompt = `Bạn là chuyên gia phân loại ý định (intent) của khách hàng trong lĩnh vực du lịch.

📝 TIN NHẮN CẦN PHÂN LOẠI:
"${message}"
`;

        // Thêm context
        if (history.length > 0) {
            const recentHistory = history.slice(-5);
            prompt += `\n📜 LỊCH SỬ HỘI THOẠI (context):\n`;
            recentHistory.forEach(msg => {
                prompt += `${msg.role === 'user' ? '👤' : '🤖'}: ${msg.content}\n`;
            });
        }

        prompt += `
🎯 CÁC INTENT TYPES CÓ THỂ:

**Core Intents (Priority: HIGH):**
1. BOOKING - Đặt tour, đặt chỗ, mua tour
2. ORDER_LOOKUP - Tra cứu đơn hàng, kiểm tra booking
3. PAYMENT - Thanh toán, vấn đề về tiền
4. SUPPORT - Hỗ trợ, khiếu nại, vấn đề cần giải quyết

**Information Intents (Priority: MEDIUM):**
5. CONSULTATION - Tư vấn, gợi ý tour phù hợp
6. TOUR_INFO - Hỏi thông tin chi tiết tour
7. PRICE_INQUIRY - Hỏi về giá tour
8. SCHEDULE_INQUIRY - Hỏi lịch khởi hành
9. AVAILABILITY - Hỏi còn chỗ không
10. COMPARISON - So sánh các tour

**Conversation Intents (Priority: LOW):**
11. GREETING - Chào hỏi
12. SMALL_TALK - Trò chuyện xã giao
13. GRATITUDE - Cảm ơn
14. FAREWELL - Tạm biệt

**Other:**
15. UNKNOWN - Không xác định được

📊 YÊU CẦU:
Phân tích tin nhắn và trả về JSON với cấu trúc sau:

{
  "primaryIntent": "<INTENT_NAME>",
  "secondaryIntents": ["<INTENT_NAME>"],
  "confidence": <số từ 0 đến 1>,
  "entities": {
    "destination": "<tên địa điểm nếu có>",
    "budget": "<ngân sách nếu có>",
    "duration": "<thời gian nếu có>",
    "tourType": "<loại tour nếu có>",
    "orderId": "<mã đơn hàng nếu có>",
    "phone": "<số điện thoại nếu có>",
    "email": "<email nếu có>"
  },
  "context": {
    "isFollowUp": <true/false>,
    "refersToPreviousTopic": <true/false>,
    "needsClarification": <true/false>
  },
  "suggestedActions": ["<action 1>", "<action 2>"],
  "reasoning": "<giải thích ngắn gọn>"
}

💡 HƯỚNG DẪN:
- **primaryIntent**: Intent chính, rõ ràng nhất
- **secondaryIntents**: Các intent phụ (nếu có nhiều intent trong 1 câu)
- **confidence**: Độ tin cậy (0-1), cao = rõ ràng, thấp = mơ hồ
- **entities**: Trích xuất thông tin quan trọng từ tin nhắn
- **isFollowUp**: Có phải câu hỏi tiếp theo không?
- **refersToPreviousTopic**: Có liên quan đến topic trước không?
- **needsClarification**: Cần làm rõ thêm không?
- **suggestedActions**: Hành động nên thực hiện

Chỉ trả về JSON, không có text thừa.`;

        return prompt;
    }

    /**
     * Parse response từ Gemini AI
     * @param {string} response
     * @returns {Object}
     */
    parseClassificationResponse(response) {
        try {
            // Remove markdown code blocks
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n?/g, '');
            }

            const parsed = JSON.parse(cleanResponse);

            return {
                primaryIntent: parsed.primaryIntent || 'UNKNOWN',
                secondaryIntents: parsed.secondaryIntents || [],
                confidence: parsed.confidence || 0.5,
                entities: parsed.entities || {},
                context: parsed.context || {
                    isFollowUp: false,
                    refersToPreviousTopic: false,
                    needsClarification: false
                },
                suggestedActions: parsed.suggestedActions || [],
                reasoning: parsed.reasoning || '',
                timestamp: new Date()
            };

        } catch (error) {
            console.error('[Intent] Error parsing response:', error);
            console.log('Response was:', response);
            throw error;
        }
    }

    /**
     * Fallback classification khi Gemini lỗi (rule-based)
     * @param {string} message
     * @returns {Object}
     */
    fallbackClassification(message) {
        const lowerMessage = message.toLowerCase();
        let primaryIntent = 'UNKNOWN';
        let confidence = 0.6;
        const secondaryIntents = [];

        // Kiểm tra từng intent type
        for (const [intentName, intentData] of Object.entries(this.INTENT_TYPES)) {
            const matchCount = intentData.keywords.filter(keyword =>
                lowerMessage.includes(keyword)
            ).length;

            if (matchCount > 0) {
                if (primaryIntent === 'UNKNOWN') {
                    primaryIntent = intentName;
                    confidence = Math.min(0.8, 0.5 + (matchCount * 0.1));
                } else {
                    secondaryIntents.push(intentName);
                }
            }
        }

        // Extract entities (simple regex-based)
        const entities = this.extractEntitiesSimple(message);

        // Get metadata cho intent
        const metadata = this.getIntentMetadata(primaryIntent);

        return {
            primaryIntent,
            secondaryIntents,
            confidence,
            entities,
            context: {
                isFollowUp: false,
                refersToPreviousTopic: false,
                needsClarification: confidence < 0.7
            },
            suggestedActions: metadata.actions || [],
            reasoning: 'Rule-based fallback classification',
            metadata, // Thêm metadata vào response
            timestamp: new Date(),
            isFallback: true
        };
    }

    /**
     * Extract entities đơn giản (rule-based)
     * @param {string} message
     * @returns {Object}
     */
    extractEntitiesSimple(message) {
        const entities = {};
        const lowerMessage = message.toLowerCase();

        // Destinations
        const destinations = ['đà nẵng', 'nha trang', 'phú quốc', 'hà nội', 'sài gòn', 'đà lạt', 'hội an', 'hạ long', 'sapa'];
        for (const dest of destinations) {
            if (lowerMessage.includes(dest)) {
                entities.destination = dest;
                break;
            }
        }

        // Budget
        const budgetMatch = message.match(/(\d+)\s*(triệu|tr|k|nghìn)/i);
        if (budgetMatch) {
            entities.budget = budgetMatch[0];
        }

        // Duration
        const durationMatch = message.match(/(\d+)\s*(ngày|đêm|n|đ)/i);
        if (durationMatch) {
            entities.duration = durationMatch[0];
        }

        // Order ID
        const orderIdMatch = message.match(/ORD-\d{8}-\d{3}/i);
        if (orderIdMatch) {
            entities.orderId = orderIdMatch[0];
        }

        // Phone
        const phoneMatch = message.match(/0\d{9,10}/);
        if (phoneMatch) {
            entities.phone = phoneMatch[0];
        }

        // Email
        const emailMatch = message.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
        if (emailMatch) {
            entities.email = emailMatch[0];
        }

        return entities;
    }

    /**
     * Lấy metadata của intent
     * @param {string} intentName
     * @returns {Object}
     */
    getIntentMetadata(intentName) {
        return this.INTENT_TYPES[intentName] || this.INTENT_TYPES.UNKNOWN;
    }

    /**
     * Phân loại multi-intent (nhiều intent trong 1 câu)
     * @param {string} message
     * @param {Array} history
     * @returns {Object}
     */
    async classifyMultiIntent(message, history = []) {
        const classification = await this.classifyIntent(message, history);

        // Phân tích các intent phụ chi tiết hơn
        const allIntents = [classification.primaryIntent, ...classification.secondaryIntents];

        const intentDetails = allIntents.map(intentName => {
            const metadata = this.getIntentMetadata(intentName);
            return {
                intent: intentName,
                priority: metadata.priority,
                requiresAction: metadata.requiresAction,
                suggestedActions: metadata.actions
            };
        });

        // Sắp xếp theo priority
        intentDetails.sort((a, b) => {
            const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        return {
            ...classification,
            intentDetails,
            hasMultipleIntents: allIntents.length > 1
        };
    }

    /**
     * Phân tích intent flow trong conversation
     * @param {Array} conversationHistory
     * @returns {Object}
     */
    analyzeIntentFlow(conversationHistory) {
        if (!conversationHistory || conversationHistory.length === 0) {
            return {
                currentState: 'NEW',
                intentSequence: [],
                commonIntents: [],
                conversationProgress: 0
            };
        }

        const intentSequence = conversationHistory
            .filter(msg => msg.intent)
            .map(msg => msg.intent);

        // Tìm intent phổ biến nhất
        const intentCounts = {};
        intentSequence.forEach(intent => {
            intentCounts[intent] = (intentCounts[intent] || 0) + 1;
        });

        const commonIntents = Object.entries(intentCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([intent, count]) => ({ intent, count }));

        // Xác định conversation state
        const lastIntent = intentSequence[intentSequence.length - 1];
        let currentState = 'ACTIVE';

        if (lastIntent === 'GREETING') {
            currentState = 'STARTED';
        } else if (lastIntent === 'FAREWELL') {
            currentState = 'ENDING';
        } else if (['BOOKING', 'PAYMENT', 'ORDER_LOOKUP'].includes(lastIntent)) {
            currentState = 'TRANSACTION';
        } else if (lastIntent === 'CONSULTATION') {
            currentState = 'EXPLORING';
        }

        // Tính conversation progress (0-100)
        const progressStages = {
            GREETING: 10,
            CONSULTATION: 30,
            TOUR_INFO: 50,
            PRICE_INQUIRY: 60,
            SCHEDULE_INQUIRY: 70,
            BOOKING: 90,
            FAREWELL: 100
        };

        const progress = Math.max(...intentSequence.map(i => progressStages[i] || 40));

        return {
            currentState,
            intentSequence,
            commonIntents,
            conversationProgress: progress,
            totalMessages: conversationHistory.length
        };
    }

    /**
     * Batch classification
     * @param {Array} messages
     * @returns {Array}
     */
    async classifyBatch(messages) {
        const results = [];

        for (const message of messages) {
            try {
                const classification = await this.classifyIntent(message.content, []);
                results.push({
                    messageId: message.id,
                    ...classification
                });
            } catch (error) {
                console.error(`[Intent] Error classifying message ${message.id}:`, error);
                results.push({
                    messageId: message.id,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Cache helpers
     */
    generateCacheKey(message) {
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            const char = message.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `intent_${hash}`;
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

        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    clearCache() {
        this.cache.clear();
        console.log('[Intent] Cache cleared');
    }
}

module.exports = new IntentClassificationService();