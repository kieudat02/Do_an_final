const ChatHistory = require('../models/chatHistoryModel');
const UserPreference = require('../models/userPreferenceModel');

/**
 * Service quản lý ngữ cảnh và bộ nhớ hội thoại
 * Giúp AI hiểu ngữ cảnh tốt hơn qua nhiều tin nhắn
 * Tích hợp user preferences để personalize experience
 */
class ConversationContextService {
    constructor() {
        // Context window size - số tin nhắn để AI nhớ
        this.CONTEXT_WINDOW_SIZE = 20; // 20 tin nhắn gần nhất
        this.SHORT_TERM_MEMORY = 10;   // 10 tin nhắn cho context ngắn
        this.LONG_TERM_MEMORY = 50;    // 50 tin nhắn lưu trong DB
    }

    /**
     * Lấy context đầy đủ cho một session
     * @param {string} sessionId - Session ID
     * @param {string} userIdentifier - User identifier cho long-term preferences
     * @returns {Object} Context object với conversation history và metadata
     */
    async getConversationContext(sessionId, userIdentifier = null) {
        try {
            const chatSession = await ChatHistory.findOne({
                sessionId,
                isActive: true
            });

            if (!chatSession) {
                return {
                    sessionId,
                    conversationHistory: [],
                    userPreferences: {},
                    longTermPreferences: null,
                    contextSummary: null,
                    messageCount: 0,
                    isNewSession: true
                };
            }

            // Lấy tin nhắn gần nhất cho context window
            const recentMessages = chatSession.getRecentMessages(this.CONTEXT_WINDOW_SIZE);

            // Phân tích user preferences từ lịch sử SESSION hiện tại
            const sessionPreferences = this.extractUserPreferences(recentMessages);

            // Lấy long-term preferences từ database (nếu có userIdentifier)
            let longTermPreferences = null;
            if (userIdentifier) {
                try {
                    const userPref = await UserPreference.findOne({
                        userIdentifier,
                        isActive: true
                    });

                    if (userPref) {
                        longTermPreferences = userPref.getPreferenceSummary();
                    }
                } catch (prefError) {
                    console.error('Error fetching long-term preferences:', prefError);
                }
            }

            // Merge session preferences với long-term preferences
            const mergedPreferences = this.mergePreferences(sessionPreferences, longTermPreferences);

            // Tạo context summary (tóm tắt cuộc hội thoại)
            const contextSummary = this.generateContextSummary(recentMessages);

            return {
                sessionId: chatSession.sessionId,
                conversationHistory: recentMessages,
                userPreferences: mergedPreferences,
                longTermPreferences,
                contextSummary,
                messageCount: chatSession.totalMessages,
                lastActivity: chatSession.lastActivity,
                isNewSession: false,
                metadata: chatSession.metadata
            };

        } catch (error) {
            console.error('Error getting conversation context:', error);
            return {
                sessionId,
                conversationHistory: [],
                userPreferences: {},
                longTermPreferences: null,
                contextSummary: null,
                messageCount: 0,
                isNewSession: true
            };
        }
    }

    /**
     * Lấy short-term memory (bộ nhớ ngắn hạn) - dùng cho câu trả lời nhanh
     * @param {string} sessionId
     * @returns {Array} Recent messages
     */
    async getShortTermMemory(sessionId) {
        try {
            const chatSession = await ChatHistory.findOne({
                sessionId,
                isActive: true
            });

            if (!chatSession) {
                return [];
            }

            return chatSession.getRecentMessages(this.SHORT_TERM_MEMORY);
        } catch (error) {
            console.error('Error getting short-term memory:', error);
            return [];
        }
    }

    /**
     * Trích xuất user preferences từ lịch sử hội thoại
     * @param {Array} messages - Conversation messages
     * @returns {Object} User preferences
     */
    extractUserPreferences(messages) {
        const preferences = {
            destinations: [],      // Điểm đến yêu thích
            budget: null,         // Ngân sách
            travelStyle: null,    // Phong cách du lịch (biển, núi, city tour...)
            duration: null,       // Thời gian ưa thích (ngắn ngày, dài ngày)
            topics: [],           // Chủ đề quan tâm
            lastIntent: null,     // Intent cuối cùng
            tourIdsViewed: []     // Danh sách tour đã xem/hỏi
        };

        // Phân tích tin nhắn từ user
        const userMessages = messages.filter(msg => msg.role === 'user');

        userMessages.forEach(msg => {
            const content = msg.content.toLowerCase();

            // Phát hiện điểm đến
            const destinationKeywords = ['đà nẵng', 'nha trang', 'phú quốc', 'hà nội', 'sài gòn', 'đà lạt', 'hội an', 'hạ long'];
            destinationKeywords.forEach(dest => {
                if (content.includes(dest) && !preferences.destinations.includes(dest)) {
                    preferences.destinations.push(dest);
                }
            });

            // Phát hiện ngân sách
            const budgetMatch = content.match(/(\d+)\s*(triệu|tr|k|nghìn|ngàn)/i);
            if (budgetMatch) {
                let amount = parseInt(budgetMatch[1]);
                const unit = budgetMatch[2].toLowerCase();

                if (unit.includes('triệu') || unit === 'tr') {
                    amount = amount * 1000000;
                } else if (unit === 'k' || unit.includes('nghìn') || unit.includes('ngàn')) {
                    amount = amount * 1000;
                }

                preferences.budget = amount;
            }

            // Phát hiện travel style
            if (content.includes('biển') || content.includes('beach')) {
                preferences.travelStyle = 'beach';
            } else if (content.includes('núi') || content.includes('mountain')) {
                preferences.travelStyle = 'mountain';
            } else if (content.includes('city') || content.includes('thành phố')) {
                preferences.travelStyle = 'city';
            }

            // Phát hiện thời gian
            const durationMatch = content.match(/(\d+)\s*(ngày|đêm|n|đ)/i);
            if (durationMatch) {
                preferences.duration = parseInt(durationMatch[1]);
            }

            // Phát hiện intent
            if (content.includes('đặt tour') || content.includes('book')) {
                preferences.lastIntent = 'BOOKING';
            } else if (content.includes('tra cứu') || content.includes('đơn hàng')) {
                preferences.lastIntent = 'ORDER_LOOKUP';
            } else if (content.includes('thanh toán')) {
                preferences.lastIntent = 'PAYMENT';
            } else if (content.includes('tư vấn') || content.includes('gợi ý')) {
                preferences.lastIntent = 'CONSULTATION';
            }
        });

        return preferences;
    }

    /**
     * Merge session preferences với long-term preferences
     * Priority: session preferences > long-term preferences
     * @param {Object} sessionPrefs - Preferences từ session hiện tại
     * @param {Object} longTermPrefs - Preferences từ database
     * @returns {Object} Merged preferences
     */
    mergePreferences(sessionPrefs, longTermPrefs) {
        if (!longTermPrefs) {
            return sessionPrefs;
        }

        return {
            // Destinations: kết hợp cả session và long-term
            destinations: [
                ...sessionPrefs.destinations,
                ...(longTermPrefs.destinations?.map(d => d.name) || [])
            ].filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates

            // Budget: ưu tiên session, fallback long-term
            budget: sessionPrefs.budget || longTermPrefs.budgetRange?.min || null,

            // Travel style: ưu tiên session
            travelStyle: sessionPrefs.travelStyle || longTermPrefs.travelStyle || null,

            // Duration: ưu tiên session
            duration: sessionPrefs.duration || null,

            // Topics: kết hợp
            topics: [
                ...sessionPrefs.topics,
                ...(longTermPrefs.topIntents || [])
            ].filter((v, i, a) => a.indexOf(v) === i),

            // Last intent: từ session
            lastIntent: sessionPrefs.lastIntent,

            // Tour IDs viewed: từ session
            tourIdsViewed: sessionPrefs.tourIdsViewed,

            // Long-term stats
            longTermStats: longTermPrefs ? {
                totalInteractions: longTermPrefs.totalInteractions,
                satisfactionScore: longTermPrefs.satisfactionScore
            } : null
        };
    }

    /**
     * Tạo context summary từ conversation history
     * @param {Array} messages - Conversation messages
     * @returns {Object} Context summary
     */
    generateContextSummary(messages) {
        if (!messages || messages.length === 0) {
            return null;
        }

        const userMessages = messages.filter(msg => msg.role === 'user');
        const assistantMessages = messages.filter(msg => msg.role === 'assistant');

        return {
            totalMessages: messages.length,
            userMessageCount: userMessages.length,
            assistantMessageCount: assistantMessages.length,
            conversationStartTime: messages[0]?.timestamp,
            lastMessageTime: messages[messages.length - 1]?.timestamp,
            hasGreeted: this.hasGreeting(assistantMessages),
            mainTopics: this.extractMainTopics(userMessages),
            conversationState: this.determineConversationState(messages)
        };
    }

    /**
     * Kiểm tra đã chào hỏi chưa
     * @param {Array} assistantMessages
     * @returns {boolean}
     */
    hasGreeting(assistantMessages) {
        const greetingPatterns = ['xin chào', 'chào bạn', 'hello', 'hi', 'chào mừng'];

        return assistantMessages.some(msg => {
            const content = msg.content.toLowerCase();
            return greetingPatterns.some(pattern => content.includes(pattern));
        });
    }

    /**
     * Trích xuất chủ đề chính từ user messages
     * @param {Array} userMessages
     * @returns {Array}
     */
    extractMainTopics(userMessages) {
        const topicKeywords = {
            'tour_search': ['tour', 'du lịch', 'đi chơi', 'tìm'],
            'booking': ['đặt', 'book', 'booking', 'đặt tour'],
            'order_lookup': ['tra cứu', 'đơn hàng', 'kiểm tra', 'order'],
            'payment': ['thanh toán', 'payment', 'pay', 'tiền'],
            'consultation': ['tư vấn', 'gợi ý', 'recommend', 'khuyên'],
            'price_inquiry': ['giá', 'price', 'chi phí', 'bao nhiêu'],
            'schedule': ['lịch trình', 'schedule', 'thời gian', 'ngày']
        };

        const topics = [];
        const content = userMessages.map(msg => msg.content.toLowerCase()).join(' ');

        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            if (keywords.some(keyword => content.includes(keyword))) {
                topics.push(topic);
            }
        }

        return [...new Set(topics)]; // Remove duplicates
    }

    /**
     * Xác định trạng thái cuộc hội thoại
     * @param {Array} messages
     * @returns {string}
     */
    determineConversationState(messages) {
        if (messages.length === 0) return 'NEW';
        if (messages.length <= 2) return 'GREETING';

        const lastMessages = messages.slice(-3);
        const lastUserMessage = lastMessages.filter(msg => msg.role === 'user').pop();

        if (!lastUserMessage) return 'ACTIVE';

        const content = lastUserMessage.content.toLowerCase();

        // Phát hiện kết thúc hội thoại
        const endPatterns = ['cảm ơn', 'thank', 'tạm biệt', 'bye', 'ok', 'được rồi', 'xong'];
        if (endPatterns.some(pattern => content.includes(pattern))) {
            return 'ENDING';
        }

        // Phát hiện đang chờ thông tin
        if (content.includes('?') || content.length < 50) {
            return 'WAITING_INFO';
        }

        return 'ACTIVE';
    }

    /**
     * Build enhanced prompt với conversation context
     * @param {string} currentMessage - Tin nhắn hiện tại
     * @param {Object} context - Context object
     * @returns {string} Enhanced prompt
     */
    buildContextualPrompt(currentMessage, context) {
        let prompt = `NGÀY GIỜ HIỆN TẠI: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n\n`;

        // Thêm conversation history
        if (context.conversationHistory && context.conversationHistory.length > 0) {
            prompt += `📜 LỊCH SỬ HỘI THOẠI (${context.conversationHistory.length} tin nhắn gần nhất):\n`;

            context.conversationHistory.forEach((msg, index) => {
                const role = msg.role === 'user' ? '👤 Khách hàng' : '🤖 AI';
                const time = new Date(msg.timestamp).toLocaleTimeString('vi-VN');
                prompt += `${index + 1}. [${time}] ${role}: ${msg.content}\n`;
            });

            prompt += `\n`;
        }

        // Thêm user preferences
        if (context.userPreferences && Object.keys(context.userPreferences).length > 0) {
            const prefs = context.userPreferences;
            prompt += `🎯 THÔNG TIN KHÁCH HÀNG ĐÃ BIẾT:\n`;

            if (prefs.destinations && prefs.destinations.length > 0) {
                prompt += `- Điểm đến quan tâm: ${prefs.destinations.join(', ')}\n`;
            }

            if (prefs.budget) {
                prompt += `- Ngân sách: ${prefs.budget.toLocaleString('vi-VN')}đ\n`;
            }

            if (prefs.travelStyle) {
                prompt += `- Phong cách: ${prefs.travelStyle}\n`;
            }

            if (prefs.duration) {
                prompt += `- Thời gian: ${prefs.duration} ngày\n`;
            }

            if (prefs.lastIntent) {
                prompt += `- Mục đích cuối: ${prefs.lastIntent}\n`;
            }

            prompt += `\n`;
        }

        // Thêm context summary
        if (context.contextSummary) {
            const summary = context.contextSummary;
            prompt += `📊 TÓM TẮT CUỘC HỘI THOẠI:\n`;
            prompt += `- Tổng số tin nhắn: ${summary.totalMessages}\n`;
            prompt += `- Trạng thái: ${summary.conversationState}\n`;

            if (summary.mainTopics && summary.mainTopics.length > 0) {
                prompt += `- Chủ đề: ${summary.mainTopics.join(', ')}\n`;
            }

            if (summary.hasGreeted) {
                prompt += `- ⚠️ ĐÃ CHÀO - KHÔNG chào lại!\n`;
            }

            prompt += `\n`;
        }

        // Thêm tin nhắn hiện tại
        prompt += `💬 TIN NHẮN HIỆN TẠI:\n"${currentMessage}"\n\n`;

        // Hướng dẫn xử lý context
        prompt += `🧠 HƯỚNG DẪN SỬ DỤNG CONTEXT:\n`;
        prompt += `1. ĐỌC KỸ lịch sử hội thoại để hiểu ngữ cảnh\n`;
        prompt += `2. SỬ DỤNG thông tin khách hàng đã biết - KHÔNG hỏi lại\n`;
        prompt += `3. TIẾP TỤC cuộc hội thoại một cách tự nhiên\n`;
        prompt += `4. NẾU đã chào - KHÔNG chào lại, đi thẳng vào vấn đề\n`;
        prompt += `5. GHI NHỚ preferences để đưa ra gợi ý phù hợp\n`;
        prompt += `6. NẾU hội thoại đang ENDING - cảm ơn và kết thúc lịch sự\n\n`;

        return prompt;
    }

    /**
     * Lưu message vào conversation history và update user preferences
     * @param {string} sessionId
     * @param {string} role - 'user' or 'assistant'
     * @param {string} content
     * @param {Object} metadata
     * @param {string} userIdentifier - Optional user identifier để update long-term prefs
     */
    async saveMessage(sessionId, role, content, metadata = {}, userIdentifier = null) {
        try {
            const chatSession = await ChatHistory.findOne({
                sessionId,
                isActive: true
            });

            if (!chatSession) {
                console.warn(`Session ${sessionId} not found for saving message`);
                return;
            }

            await chatSession.addMessage(role, content, metadata);

            // Auto cleanup old messages nếu vượt quá long-term memory
            if (chatSession.totalMessages > this.LONG_TERM_MEMORY) {
                await chatSession.clearOldMessages(this.LONG_TERM_MEMORY);
            }

            // Update user preferences nếu là user message và có userIdentifier
            if (role === 'user' && userIdentifier) {
                await this.updateUserPreferences(userIdentifier, content, metadata);
            }

        } catch (error) {
            console.error('Error saving message:', error);
        }
    }

    /**
     * Update user preferences dựa trên message content
     * @param {string} userIdentifier
     * @param {string} messageContent
     * @param {Object} metadata
     */
    async updateUserPreferences(userIdentifier, messageContent, metadata = {}) {
        try {
            const userPref = await UserPreference.findOrCreate(userIdentifier);

            // Increment message count
            await userPref.incrementMessageCount();

            // Extract và update preferences từ message
            const prefs = this.extractUserPreferences([{
                role: 'user',
                content: messageContent,
                timestamp: new Date()
            }]);

            // Update destinations
            if (prefs.destinations && prefs.destinations.length > 0) {
                for (const dest of prefs.destinations) {
                    await userPref.updateDestinationPreference(dest);
                }
            }

            // Update budget
            if (prefs.budget) {
                await userPref.updateBudgetRange(prefs.budget, prefs.budget * 2);
            }

            // Update travel style
            if (prefs.travelStyle) {
                await userPref.updateTravelStyle(prefs.travelStyle);
            }

            // Record intent
            if (prefs.lastIntent) {
                await userPref.recordIntent(prefs.lastIntent);
            }

        } catch (error) {
            console.error('Error updating user preferences:', error);
        }
    }

    /**
     * Tạo hoặc lấy session với user info
     * @param {string} sessionId
     * @param {Object} userInfo
     */
    async getOrCreateSession(sessionId, userInfo = {}) {
        try {
            return await ChatHistory.findOrCreateSession(sessionId, userInfo);
        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    }

    /**
     * Xóa conversation context (khi user muốn bắt đầu lại)
     * @param {string} sessionId
     */
    async clearContext(sessionId) {
        try {
            await ChatHistory.updateOne(
                { sessionId, isActive: true },
                {
                    isActive: false,
                    messages: []
                }
            );

            return { success: true, message: 'Context cleared' };
        } catch (error) {
            console.error('Error clearing context:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Lấy session statistics
     * @param {string} sessionId
     */
    async getSessionStats(sessionId) {
        try {
            const chatSession = await ChatHistory.findOne({
                sessionId,
                isActive: true
            });

            if (!chatSession) {
                return null;
            }

            const context = await this.getConversationContext(sessionId);

            return {
                sessionId,
                totalMessages: chatSession.totalMessages,
                userMessageCount: context.contextSummary?.userMessageCount || 0,
                assistantMessageCount: context.contextSummary?.assistantMessageCount || 0,
                createdAt: chatSession.createdAt,
                lastActivity: chatSession.lastActivity,
                conversationState: context.contextSummary?.conversationState || 'UNKNOWN',
                userPreferences: context.userPreferences
            };

        } catch (error) {
            console.error('Error getting session stats:', error);
            return null;
        }
    }
}

module.exports = new ConversationContextService();