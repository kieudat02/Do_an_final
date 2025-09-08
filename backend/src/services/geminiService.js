const { GoogleGenerativeAI } = require('@google/generative-ai');
const TourDataService = require('./tourDataService');
const dotenv = require('dotenv');
dotenv.config();

// Khởi tạo Gemini AI với API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Lưu trữ lịch sử hội thoại trong memory (cho ứng dụng công khai)
const conversationHistory = new Map();

// Cache cho dữ liệu tour với caching strategy linh hoạt
let tourDataCache = null;
let lastCacheUpdate = null;
const CACHE_DURATION = 10 * 60 * 1000; // Giảm xuống 10 phút để data realtime hơn

// Cấu hình mặc định cho model
const MODEL_CONFIG = {
    model: "gemini-1.5-flash",
    generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
    },
    safetySettings: [
        {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
    ],
};

// Context hệ thống cho chatbot du lịch với dữ liệu thực
const getSystemContext = async (forceRefresh = false, chatHistory = []) => {
    const now = Date.now();

    // Kiểm tra cache - sử dụng cache nếu còn hiệu lực và không force refresh
    if (!forceRefresh && tourDataCache && lastCacheUpdate && (now - lastCacheUpdate) < CACHE_DURATION) {
        return buildSystemPrompt(tourDataCache, chatHistory);
    }

    // Lấy dữ liệu mới từ database
    try {
        console.log(`[Cache] ${forceRefresh ? 'Force refreshing' : 'Refreshing'} tour data cache...`);
        tourDataCache = await TourDataService.getChatbotContext();
        lastCacheUpdate = now;
        console.log(`[Cache] Tour data cache updated successfully. Total tours: ${tourDataCache.statistics.totalTours}`);
        return buildSystemPrompt(tourDataCache, chatHistory);
    } catch (error) {
        console.error('Error getting tour data for chatbot:', error);
        // Nếu có cache cũ, sử dụng cache cũ thay vì fallback
        if (tourDataCache) {
            console.warn('[Cache] Using stale cache data due to database error');
            return buildSystemPrompt(tourDataCache, chatHistory);
        }
        return getBasicSystemContext();
    }
};

/**
 * Invalidate cache - sử dụng khi cần force refresh data
 */
const invalidateCache = () => {
    tourDataCache = null;
    lastCacheUpdate = null;
    console.log('[Cache] Tour data cache invalidated');
};

/**
 * Get cache status
 */
const getCacheStatus = () => {
    const now = Date.now();
    return {
        hasCache: !!tourDataCache,
        lastUpdate: lastCacheUpdate ? new Date(lastCacheUpdate).toISOString() : null,
        isExpired: lastCacheUpdate ? (now - lastCacheUpdate) > CACHE_DURATION : true,
        ageInMinutes: lastCacheUpdate ? Math.floor((now - lastCacheUpdate) / (60 * 1000)) : null
    };
};

// Xây dựng system prompt với dữ liệu thực - tối ưu để tránh token limit
const buildSystemPrompt = (tourData, chatHistory = []) => {
    let prompt = `Bạn là NDTravel Assistant - trợ lý AI chuyên tư vấn tour du lịch.

🎯 THÔNG TIN CÔNG TY:
NDTravel - Tổ chức tour du lịch trong nước và quốc tế
Slogan: "Khám phá thế giới cùng NDTravel"

📞 THÔNG TIN LIÊN HỆ:
- Hotline: 0972 122 555
- Website: http://localhost:5173
- Hỗ trợ 24/7 cho khách hàng

📊 THỐNG KÊ:
- ${tourData.statistics.totalTours} tour, ${tourData.statistics.totalCategories} danh mục, ${tourData.statistics.totalDestinations} điểm đến
- Đánh giá TB: ${tourData.statistics.averageRating.toFixed(1)}/5⭐
- Giá: ${formatPrice(tourData.statistics.priceRange.minPrice)} - ${formatPrice(tourData.statistics.priceRange.maxPrice)}

🗺️ DANH MỤC TOUR:\n`;

    // Tối ưu: chỉ hiển thị top categories và tours nổi bật với ID thực
    const topCategories = Object.entries(tourData.toursByCategory).slice(0, 5);
    topCategories.forEach(([categoryName, categoryData]) => {
        prompt += `📍 ${categoryName}: `;
        if (categoryData.tours && categoryData.tours.length > 0) {
            const topTours = categoryData.tours.slice(0, 2); // Chỉ lấy 2 tour top
            const tourNames = topTours.map(tour =>
                `${tour.title} (${formatPrice(tour.price)}${tour.rating > 0 ? `, ${tour.rating}⭐` : ''}) [ID: ${tour._id}]`
            );
            prompt += tourNames.join(', ') + '\n';
        } else {
            prompt += 'Đang cập nhật\n';
        }
    });

    prompt += `\n🌟 ĐIỂM ĐẾN PHỔ BIẾN: `;
    const topDestinations = tourData.popularDestinations.slice(0, 8);
    prompt += topDestinations.map(dest => `${dest.name} (${dest.tourCount})`).join(', ');

    // Kiểm tra lịch sử cuộc trò chuyện để phát hiện lời chào
    const conversationHistory = chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    // Cải thiện logic phát hiện lời chào - kiểm tra cả assistant và user messages
    const greetingPatterns = [
        'Xin chào', 'xin chào', 'Chào bạn', 'chào bạn', 'Chào mừng', 'chào mừng',
        'Hello', 'Hi', 'Tôi là', 'trợ lý ảo', 'ND Travel AI', 'Chào!', 'chào!',
        'Tôi có thể giúp bạn', 'Bạn đang muốn tìm hiểu', 'Hôm nay bạn muốn đi đâu'
    ];

    const hasGreeted = greetingPatterns.some(pattern => conversationHistory.includes(pattern)) ||
                      chatHistory.length > 0; // Nếu đã có lịch sử thì coi như đã chào

    prompt += `\n\n💼 NHIỆM VỤ:
- Tư vấn tour phù hợp ngân sách & sở thích
- Cung cấp thông tin chính xác về giá, lịch trình
- Hỗ trợ so sánh tours
- Hướng dẫn đặt tour trên website
- Cung cấp thông tin liên hệ khi khách hàng cần hỗ trợ

${hasGreeted ? '🚫 QUAN TRỌNG: ĐÃ CHÀO RỒI - TUYỆT ĐỐI KHÔNG chào lại! Chỉ trả lời câu hỏi hoặc tiếp tục hỗ trợ theo ngữ cảnh cuộc hội thoại.' : '✅ Đây là tin nhắn đầu tiên - có thể chào hỏi ngắn gọn.'}

🎯 NGUYÊN TẮC:
1. Ưu tiên tours có sẵn trong hệ thống
2. Thông tin giá chính xác từ dữ liệu thực
3. Phù hợp ngân sách khách hàng
4. Trả lời ngắn gọn, thân thiện bằng tiếng Việt
5. Khuyến khích đặt tour trên website
6. Khi khách hàng hỏi về liên hệ, LUÔN trả lời: "Bạn có thể liên hệ với chúng tôi qua website http://localhost:5173 hoặc gọi điện đến số hotline 0972 122 555. Chúng tôi hỗ trợ 24/7!"
7. Khi giới thiệu tour cụ thể, LUÔN cung cấp link chi tiết với ID thực: "Xem chi tiết và đặt tour tại: http://localhost:5173/tour/[SỬ_DỤNG_ID_THỰC_TỪ_DỮ_LIỆU]"
8. KHÔNG BAO GIỜ hiển thị ID tour trong câu trả lời cho khách hàng - chỉ sử dụng ID để tạo link

🗣️ LUỒNG HỘI THOẠI:
- TUYỆT ĐỐI KHÔNG lặp lại lời chào nếu đã chào rồi
- Tiếp tục cuộc hội thoại một cách tự nhiên theo ngữ cảnh
- Hỏi từng thông tin một cách tuần tự: điểm đến → ngân sách → thời gian → số người
- KHÔNG lặp lại thông tin đã biết
- Đi thẳng vào vấn đề, tránh dài dòng

📝 ĐỊNH DẠNG VĂN BẢN:
- **In đậm TIẾT KIỆM** - chỉ 1-2 từ khóa quan trọng nhất
- **In đậm tên tour và giá** để dễ nhận diện
- KHÔNG in đậm nhiều từ trong một câu
- KHÔNG in đậm cả câu hỏi
- KHÔNG in đậm phần giải thích

VÍ DỤ ĐÚNG:
- "Bạn muốn đi **biển** hay **núi**?"
- "**Ngân sách** khoảng bao nhiêu?"
- "**Tour Đà Nẵng 3N2Đ** - **2.500.000đ**"

VÍ DỤ SAI:
- "**Bạn muốn đi biển hay núi?**" (in đậm cả câu)
- "Bạn muốn đi **biển** hay **núi** **không**?" (quá nhiều từ in đậm)
- "**Tour này rất phù hợp**" (in đậm phần giải thích)

📝 MẪU TRẢ LỜI LIÊN HỆ:
Khi khách hàng hỏi cách liên hệ, đặt tour, hoặc cần hỗ trợ, hãy trả lời:
"Bạn có thể liên hệ với chúng tôi qua:
📞 Hotline: 0972 122 555
🌐 Website: http://localhost:5173
Chúng tôi hỗ trợ 24/7 để tư vấn và đặt tour cho bạn!"

🔗 TẠO LINK TOUR CỤ THỂ:
Khi giới thiệu tour cụ thể, hãy tạo link trực tiếp đến trang chi tiết tour:
- Format: http://localhost:5173/tour/[ID_TOUR_THỰC_TẾ]
- QUAN TRỌNG: Sử dụng ID thực từ dữ liệu tour trong dấu [ID: ...], KHÔNG dùng placeholder
- Ví dụ đúng: "Xem chi tiết tour tại: http://localhost:5173/tour/68af50ee3c401ee2dbe6c8b0"
- Ví dụ SAI: "http://localhost:5173/tour/ID_TOUR_PHU_QUOC_LE_2_9_1"
- Trong dữ liệu tour có format: "Tên tour [ID: 68af50ee3c401ee2dbe6c8b0]" - hãy lấy ID từ đây

📋 VÍ DỤ CÁCH TRẢ LỜI TOUR:
Nếu trong dữ liệu có: "Tour Mù Cang Chải mùa lúa chín 3 ngày 2 đêm từ Hà Nội 2025 (8.500.000đ, 4.5⭐) [ID: 68a3795194426a6c39b18961]"

Thì trả lời:
"Tour Mù Cang Chải mùa lúa chín 3 ngày 2 đêm từ Hà Nội 2025
💰 Giá: 8.500.000đ
⭐ Đánh giá: 4.5/5

🔗 Xem chi tiết và đặt tour tại: http://localhost:5173/tour/68a3795194426a6c39b18961"

🔄 KHI LIỆT KÊ NHIỀU TOUR, SỬ DỤNG FORMAT:
"Chúng tôi có 3 tour Phú Quốc như sau:

• Tour Phú Quốc 4N3Đ Lễ 2/9 - Đảo Ngọc Thiên Đường (4.500.000đ)

Xem chi tiết và đặt tour tại: http://localhost:5173/tour/68b01a29195c0e0a5ba05a34

---

• Tour Phú Quốc 4N3Đ Lễ 2/9 - Đảo Ngọc Thiên Đường (6.293.000đ)

Xem chi tiết và đặt tour tại: http://localhost:5173/tour/68b01b11995e922f7982f4d6

---

• Tour Phú Quốc 4N3Đ Lễ 2/9 - Đảo Ngọc Thiên Đường (Liên hệ)

Xem chi tiết và đặt tour tại: http://localhost:5173/tour/68b01953c0da512e6d38dd93

Bạn muốn xem thêm thông tin về tour nào?"

📝 NGUYÊN TẮC ĐỊNH DẠNG:
- Sử dụng \\n\\n giữa các đoạn để đảm bảo tách dòng đẹp
- Có thể dùng dấu --- hoặc chỉ cần 2 lần \\n giữa mỗi tour
- Link nên để cuối mỗi tour, không nên để liền sát giá (cho dễ bấm)
- Không nên viết các thông tin quá dài trong 1 dòng
- Sử dụng bullet point (•) cho danh sách tour
- Để trống 1 dòng giữa tên tour và link để dễ đọc

📌 CẤU TRÚC TIN NHẮN CHUẨN:
1. Câu mở đầu (nếu cần)
2. Danh sách tour với format:
   • Tên tour (giá)
   
   Link chi tiết
   
   --- (separator giữa các tour)
3. Câu hỏi cuối để tương tác

💡 VÍ DỤ HOÀN CHỈNH:
"Chúng tôi có 3 tour Phú Quốc như sau:

• Tour Phú Quốc 4N3Đ Lễ 2/9 - Đảo Ngọc Thiên Đường (4.500.000đ)

Xem chi tiết và đặt tour tại: http://localhost:5173/tour/68b01a29195c0e0a5ba05a34

---

• Tour Phú Quốc 4N3Đ Lễ 2/9 - Đảo Ngọc Thiên Đường (6.293.000đ)

Xem chi tiết và đặt tour tại: http://localhost:5173/tour/68b01b11995e922f7982f4d6

---

• Tour Phú Quốc 4N3Đ Lễ 2/9 - Đảo Ngọc Thiên Đường (Liên hệ)

Xem chi tiết và đặt tour tại: http://localhost:5173/tour/68b01953c0da512e6d38dd93

Bạn muốn xem thêm thông tin về tour nào?"

⚠️ LƯU Ý QUAN TRỌNG VỀ XUỐNG DÒNG:
- Luôn sử dụng \\n\\n để tách đoạn văn
- Đặc biệt chú ý tách dòng giữa tên tour và link
- Giữa các tour phải có separator hoặc ít nhất 2 dòng trống
- Gemini sẽ tự động xử lý \\n\\n thành xuống dòng đẹp

❌ KHÔNG BAO GIỜ viết như thế này:
"Tour Phú Quốc 4N3Đ (ID: 68b01a29195c0e0a5ba05a34)"
"Bạn muốn xem chi tiết tour nào? (ID: 68b01b11995e922f7982f4d6)"
"http://localhost:5173/tour/ID_TOUR_PHU_QUOC_LE_2_9_1"

✅ LUÔN viết như thế này:
"Tour Phú Quốc 4N3Đ - Đảo Ngọc Thiên Đường"
"Xem chi tiết tour tại: http://localhost:5173/tour/68b01a29195c0e0a5ba05a34"

Cập nhật: ${new Date(tourData.lastUpdated).toLocaleString('vi-VN')}`;

    return prompt;
};

// Helper function để format giá
const formatPrice = (price) => {
    if (!price || price === 0) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
};

// Fallback system context khi không lấy được dữ liệu
const getBasicSystemContext = () => {
    return `Bạn là NDTravel Assistant - một trợ lý AI thông minh chuyên về du lịch và tư vấn tour cho công ty NDTravel.

📞 THÔNG TIN LIÊN HỆ:
- Hotline: 0972 122 555
- Website: http://localhost:5173
- Hỗ trợ 24/7 cho khách hàng

Bạn có thể:
- Tư vấn về các điểm đến du lịch
- Gợi ý lịch trình và hoạt động
- Cung cấp thông tin về văn hóa, ẩm thực địa phương
- Hỗ trợ lập kế hoạch du lịch
- Trả lời các câu hỏi về dịch vụ tour
- Cung cấp thông tin liên hệ khi khách hàng cần hỗ trợ

Hãy trả lời một cách thân thiện, hữu ích và chính xác. Sử dụng tiếng Việt để giao tiếp.
Khi khách hàng hỏi về tour cụ thể, hãy khuyến khích họ truy cập website để xem thông tin chi tiết và đặt tour.

🗣️ LUỒNG HỘI THOẠI:
- CHỈ chào lần đầu tiên trong phiên
- Sau đó KHÔNG chào lại, chỉ hỏi câu tiếp theo bám sát luồng
- Hỏi từng thông tin một cách tuần tự: điểm đến → ngân sách → thời gian → số người
- KHÔNG lặp lại thông tin đã biết
- Đi thẳng vào vấn đề, tránh dài dòng

📝 ĐỊNH DẠNG VĂN BẢN:
- **In đậm TIẾT KIỆM** - chỉ 1-2 từ khóa quan trọng nhất
- **In đậm tên tour và giá** để dễ nhận diện
- KHÔNG in đậm nhiều từ trong một câu
- KHÔNG in đậm cả câu hỏi
- KHÔNG in đậm phần giải thích

VÍ DỤ ĐÚNG:
- "Bạn muốn đi **biển** hay **núi**?"
- "**Ngân sách** khoảng bao nhiêu?"
- "**Tour Đà Nẵng 3N2Đ** - **2.500.000đ**"

VÍ DỤ SAI:
- "**Bạn muốn đi biển hay núi?**" (in đậm cả câu)
- "Bạn muốn đi **biển** hay **núi** **không**?" (quá nhiều từ in đậm)
- "**Tour này rất phù hợp**" (in đậm phần giải thích)

Khi khách hàng hỏi về liên hệ, LUÔN trả lời:
"Bạn có thể liên hệ với chúng tôi qua:
📞 Hotline: 0972 122 555
🌐 Website: http://localhost:5173
Chúng tôi hỗ trợ 24/7 để tư vấn và đặt tour cho bạn!"

Khi giới thiệu tour cụ thể, hãy cung cấp link chi tiết tour nếu có ID.`;
};

/**
 * Tạo session ID mới cho hội thoại
 */
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Lấy lịch sử hội thoại theo session ID
 */
function getConversationHistory(sessionId) {
    if (!conversationHistory.has(sessionId)) {
        conversationHistory.set(sessionId, []);
    }
    return conversationHistory.get(sessionId);
}

/**
 * Lưu tin nhắn vào lịch sử hội thoại - tối ưu để tránh token limit
 */
function saveMessageToHistory(sessionId, role, content) {
    const history = getConversationHistory(sessionId);

    // Cắt ngắn content nếu quá dài để tiết kiệm memory và token
    const maxContentLength = 500;
    const trimmedContent = content.length > maxContentLength
        ? content.substring(0, maxContentLength) + '...'
        : content;

    history.push({
        role,
        content: trimmedContent,
        timestamp: new Date().toISOString()
    });

    // Giảm giới hạn lịch sử xuống 30 tin nhắn để tối ưu token usage
    if (history.length > 30) {
        history.splice(0, history.length - 30);
    }
}

/**
 * Xây dựng context cho cuộc hội thoại với dữ liệu tour động - tối ưu token
 */
async function buildConversationContext(sessionId, newMessage) {
    const history = getConversationHistory(sessionId);
    const systemContext = await getSystemContext(false, history);

    // Tối ưu: giảm độ dài context
    let context = systemContext + "\n\n=== HỘI THOẠI ===\n";

    // Chỉ lấy 6 tin nhắn gần nhất để tiết kiệm token
    const recentHistory = history.slice(-6);
    recentHistory.forEach(msg => {
        const role = msg.role === 'user' ? '👤' : '🤖';
        // Cắt ngắn tin nhắn dài để tiết kiệm token
        const content = msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content;
        context += `${role}: ${content}\n`;
    });

    context += `\n👤: ${newMessage}\n\n`;

    // Hướng dẫn ngắn gọn
    context += `🔍 HƯỚNG DẪN:
- Sử dụng dữ liệu tour thực từ hệ thống
- Trả lời ngắn gọn, chính xác
- Đề xuất tour phù hợp
- KHÔNG hiển thị ID tour trong câu trả lời
- Chỉ sử dụng ID để tạo link: http://localhost:5173/tour/[ID]
- Kết thúc bằng câu hỏi hỗ trợ

🤖:`;

    return context;
}

/**
 * Gửi tin nhắn đến Gemini AI
 */
async function askGemini(message, sessionId = null) {
    try {
        // Validate input
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            throw new Error('Tin nhắn không hợp lệ');
        }

        // Kiểm tra API key
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY không được cấu hình');
        }

        // Tạo session ID nếu chưa có
        if (!sessionId) {
            sessionId = generateSessionId();
        }

        // Xây dựng context với lịch sử hội thoại và dữ liệu tour
        const contextualMessage = await buildConversationContext(sessionId, message.trim());

        // Khởi tạo model
        const model = genAI.getGenerativeModel(MODEL_CONFIG);

        // Gửi request đến Gemini
        const result = await model.generateContent(contextualMessage);
        const response = await result.response;
        const aiReply = response.text();

        // Lưu tin nhắn vào lịch sử
        saveMessageToHistory(sessionId, 'user', message.trim());
        saveMessageToHistory(sessionId, 'assistant', aiReply);

        return {
            success: true,
            reply: aiReply,
            sessionId: sessionId,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Gemini API error:', error);

        // Xử lý các loại lỗi khác nhau
        let errorMessage = 'Xin lỗi, tôi không thể trả lời lúc này. Vui lòng thử lại sau.';

        if (error.message?.includes('API_KEY')) {
            errorMessage = 'Lỗi cấu hình hệ thống. Vui lòng liên hệ quản trị viên.';
        } else if (error.message?.includes('QUOTA_EXCEEDED')) {
            errorMessage = 'Hệ thống đang quá tải. Vui lòng thử lại sau ít phút.';
        } else if (error.message?.includes('RATE_LIMIT')) {
            errorMessage = 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng chờ một chút.';
        } else if (error.message?.includes('SAFETY')) {
            errorMessage = 'Tin nhắn của bạn vi phạm chính sách an toàn. Vui lòng thử lại với nội dung khác.';
        }

        return {
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
        };
    }
}





/**
 * Tạo session mới
 */
async function createNewSession() {
    try {
        const sessionId = generateSessionId();
        return {
            success: true,
            sessionId: sessionId,
            message: 'Đã tạo phiên hội thoại mới'
        };
    } catch (error) {
        console.error('Error creating new session:', error);
        return {
            success: false,
            error: 'Không thể tạo phiên hội thoại mới'
        };
    }
}

module.exports = {
    askGemini,
    createNewSession,
    generateSessionId,
    invalidateCache,
    getCacheStatus
};