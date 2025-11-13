const { GoogleGenerativeAI } = require('@google/generative-ai');
const TourDataService = require('./tourDataService');
const ChatHistory = require('../models/chatHistoryModel');
const { logger, updateMetrics } = require('./loggerService');
const ConversationContextService = require('./conversationContextService');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Validate required Gemini API key
if (!process.env.GEMINI_API_KEY) {
    console.error('FATAL ERROR: GEMINI_API_KEY is not defined. Chatbot will not function.');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

// Khởi tạo Gemini AI với API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper functions for sensitive and out-of-scope responses
function generateSensitiveResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Phát hiện câu hỏi về thông tin tài chính
    if (lowerMessage.includes('số tài khoản') || lowerMessage.includes('account number') ||
        lowerMessage.includes('thẻ tín dụng') || lowerMessage.includes('credit card') ||
        lowerMessage.includes('mật khẩu') || lowerMessage.includes('password') ||
        lowerMessage.includes('pin') || lowerMessage.includes('cvv') ||
        lowerMessage.includes('so tai khoan') || lowerMessage.includes('the tin dung') ||
        lowerMessage.includes('mat khau') || lowerMessage.includes('stk') ||
        lowerMessage.includes('mk') || lowerMessage.includes('otp')) {
        
        return `⚠️ **KHÔNG THỂ CUNG CẤP THÔNG TIN TÀI CHÍNH**:

Xin lỗi, tôi không thể cung cấp thông tin tài chính vì:
• Bảo vệ quyền riêng tư khách hàng
• Tuân thủ quy định bảo mật
• Ngăn chặn rủi ro bảo mật

💡 **Tôi có thể hỗ trợ bạn về**:
• Thông tin tour du lịch
• Giá cả và khuyến mãi
• Lịch trình và dịch vụ
• Đặt tour và thanh toán

📞 **Liên hệ hỗ trợ**: 0972 122 555`;
    }
    
    // Phát hiện câu hỏi về thông tin nội bộ
    if (lowerMessage.includes('thông tin nội bộ') || lowerMessage.includes('internal information') ||
        lowerMessage.includes('bí mật') || lowerMessage.includes('confidential') ||
        lowerMessage.includes('thông tin công ty') || lowerMessage.includes('dữ liệu nội bộ') ||
        lowerMessage.includes('thong tin noi bo') || lowerMessage.includes('bi mat') ||
        lowerMessage.includes('thong tin cong ty') || lowerMessage.includes('du lieu noi bo')) {
        
        return `🔒 **THÔNG TIN NỘI BỘ KHÔNG ĐƯỢC TIẾT LỘ**:

Xin lỗi, tôi không thể cung cấp thông tin nội bộ vì:
• Bảo vệ bí mật kinh doanh
• Tuân thủ quy định nội bộ
• Bảo vệ lợi ích công ty

💡 **Tôi có thể hỗ trợ bạn về**:
• Thông tin tour du lịch công khai
• Giá cả và khuyến mãi
• Lịch trình và dịch vụ
• Đặt tour và thanh toán

📞 **Liên hệ hỗ trợ**: 0972 122 555`;
    }
    
    // Phát hiện câu hỏi về hack/tấn công
    if (lowerMessage.includes('hack') || lowerMessage.includes('crack') ||
        lowerMessage.includes('virus') || lowerMessage.includes('malware') ||
        lowerMessage.includes('tấn công') || lowerMessage.includes('xâm nhập') ||
        lowerMessage.includes('tan cong') || lowerMessage.includes('xam nhap')) {
        
        return `🚫 **KHÔNG THỂ CUNG CẤP THÔNG TIN**:

Xin lỗi, tôi không thể cung cấp thông tin này vì:
• Bảo vệ hệ thống và dữ liệu
• Tuân thủ quy định bảo mật
• Ngăn chặn rủi ro bảo mật

💡 **Tôi có thể hỗ trợ bạn về**:
• Thông tin tour du lịch
• Giá cả và khuyến mãi
• Lịch trình và dịch vụ
• Đặt tour và thanh toán

📞 **Liên hệ hỗ trợ**: 0972 122 555`;
    }
    
    // Default sensitive response
    return `⚠️ **KHÔNG THỂ CUNG CẤP THÔNG TIN**:

Xin lỗi, tôi không thể cung cấp thông tin này vì:
• Bảo vệ quyền riêng tư
• Tuân thủ quy định bảo mật
• Ngăn chặn rủi ro bảo mật

💡 **Tôi có thể hỗ trợ bạn về**:
• Thông tin tour du lịch
• Giá cả và khuyến mãi
• Lịch trình và dịch vụ
• Đặt tour và thanh toán

📞 **Liên hệ hỗ trợ**: 0972 122 555`;
}

function generateOutOfScopeResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Phát hiện câu hỏi về lập trình
    if (lowerMessage.includes('lập trình') || lowerMessage.includes('programming') ||
        lowerMessage.includes('code') || lowerMessage.includes('javascript') ||
        lowerMessage.includes('python') || lowerMessage.includes('java') ||
        lowerMessage.includes('html') || lowerMessage.includes('css') ||
        lowerMessage.includes('lap trinh') || lowerMessage.includes('crypto') ||
        lowerMessage.includes('coin') || lowerMessage.includes('bitcoin')) {
        
        return `🤖 **TÔI CHỈ HỖ TRỢ VỀ DU LỊCH**:

Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi về du lịch và tour.

💡 **Tôi có thể hỗ trợ bạn về**:
• Tư vấn tour du lịch
• Giá cả và khuyến mãi
• Lịch trình và dịch vụ
• Đặt tour và thanh toán
• Thông tin điểm đến

📞 **Liên hệ hỗ trợ**: 0972 122 555`;
    }
    
    // Phát hiện câu hỏi về y tế
    if (lowerMessage.includes('bệnh') || lowerMessage.includes('sức khỏe') ||
        lowerMessage.includes('thuốc') || lowerMessage.includes('bác sĩ') ||
        lowerMessage.includes('y tế') || lowerMessage.includes('chẩn đoán') ||
        lowerMessage.includes('benh') || lowerMessage.includes('suc khoe') ||
        lowerMessage.includes('thuoc') || lowerMessage.includes('bac si') ||
        lowerMessage.includes('y te') || lowerMessage.includes('chan doan')) {
        
        return `🏥 **TÔI CHỈ HỖ TRỢ VỀ DU LỊCH**:

Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi về du lịch và tour.

💡 **Tôi có thể hỗ trợ bạn về**:
• Tư vấn tour du lịch
• Giá cả và khuyến mãi
• Lịch trình và dịch vụ
• Đặt tour và thanh toán
• Thông tin điểm đến

📞 **Liên hệ hỗ trợ**: 0972 122 555`;
    }
    
    // Phát hiện câu hỏi về giáo dục
    if (lowerMessage.includes('học') || lowerMessage.includes('giáo dục') ||
        lowerMessage.includes('trường') || lowerMessage.includes('sinh viên') ||
        lowerMessage.includes('bài tập') || lowerMessage.includes('thi cử') ||
        lowerMessage.includes('hoc') || lowerMessage.includes('giao duc') ||
        lowerMessage.includes('truong') || lowerMessage.includes('sinh vien') ||
        lowerMessage.includes('bai tap') || lowerMessage.includes('thi cu')) {
        
        return `🎓 **TÔI CHỈ HỖ TRỢ VỀ DU LỊCH**:

Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi về du lịch và tour.

💡 **Tôi có thể hỗ trợ bạn về**:
• Tư vấn tour du lịch
• Giá cả và khuyến mãi
• Lịch trình và dịch vụ
• Đặt tour và thanh toán
• Thông tin điểm đến

📞 **Liên hệ hỗ trợ**: 0972 122 555`;
    }
    
    // Phát hiện câu hỏi về đầu tư
    if (lowerMessage.includes('đầu tư') || lowerMessage.includes('chứng khoán') ||
        lowerMessage.includes('cổ phiếu') || lowerMessage.includes('trái phiếu') ||
        lowerMessage.includes('dau tu') || lowerMessage.includes('chung khoan') ||
        lowerMessage.includes('co phieu') || lowerMessage.includes('trai phieu')) {
        
        return `💰 **TÔI CHỈ HỖ TRỢ VỀ DU LỊCH**:

Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi về du lịch và tour.

💡 **Tôi có thể hỗ trợ bạn về**:
• Tư vấn tour du lịch
• Giá cả và khuyến mãi
• Lịch trình và dịch vụ
• Đặt tour và thanh toán
• Thông tin điểm đến

📞 **Liên hệ hỗ trợ**: 0972 122 555`;
    }
    
    // Phát hiện câu hỏi về chính trị
    if (lowerMessage.includes('chính trị') || lowerMessage.includes('politics') ||
        lowerMessage.includes('chính phủ') || lowerMessage.includes('government') ||
        lowerMessage.includes('bầu cử') || lowerMessage.includes('đảng phái') ||
        lowerMessage.includes('chinh tri') || lowerMessage.includes('chinh phu') ||
        lowerMessage.includes('bau cu') || lowerMessage.includes('dang phai')) {
        
        return `🏛️ **TÔI CHỈ HỖ TRỢ VỀ DU LỊCH**:

Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi về du lịch và tour.

💡 **Tôi có thể hỗ trợ bạn về**:
• Tư vấn tour du lịch
• Giá cả và khuyến mãi
• Lịch trình và dịch vụ
• Đặt tour và thanh toán
• Thông tin điểm đến

📞 **Liên hệ hỗ trợ**: 0972 122 555`;
    }
    
    // Default out of scope response
    return `🤖 **TÔI CHỈ HỖ TRỢ VỀ DU LỊCH**:

Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi về du lịch và tour.

💡 **Tôi có thể hỗ trợ bạn về**:
• Tư vấn tour du lịch
• Giá cả và khuyến mãi
• Lịch trình và dịch vụ
• Đặt tour và thanh toán
• Thông tin điểm đến

📞 **Liên hệ hỗ trợ**: 0972 122 555`;
}

// Lưu trữ lịch sử hội thoại trong memory (cho ứng dụng công khai)
const conversationHistory = new Map();

// Cache cho dữ liệu tour với caching strategy linh hoạt
let tourDataCache = null;
let lastCacheUpdate = null;
const CACHE_DURATION = 10 * 60 * 1000;

// Circuit breaker cho Gemini API
let consecutiveFailures = 0;
const MAX_FAILURES = 3;
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30s
let circuitOpenTime = null;

const isCircuitOpen = () => {
    if (consecutiveFailures >= MAX_FAILURES) {
        if (!circuitOpenTime) {
            circuitOpenTime = Date.now();
        }
        // Auto reset after timeout
        if (Date.now() - circuitOpenTime > CIRCUIT_BREAKER_TIMEOUT) {
            resetCircuit();
            return false;
        }
        return true;
    }
    return false;
};

const resetCircuit = () => {
    consecutiveFailures = 0;
    circuitOpenTime = null;
    logger.info('Circuit breaker reset - Gemini API available');
};

const recordFailure = () => {
    consecutiveFailures++;
    logger.warn(`Gemini API failure #${consecutiveFailures}/${MAX_FAILURES}`);
    if (consecutiveFailures >= MAX_FAILURES) {
        logger.error('Circuit breaker opened - Gemini API unavailable');
    }
};

const recordSuccess = () => {
    if (consecutiveFailures > 0) {
        logger.info('Gemini API recovered');
        resetCircuit();
    }
}; 

// Cấu hình mặc định cho model
const MODEL_CONFIG = {
    model: "gemini-2.0-flash",
    generationConfig: {
        temperature: 0.4,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 512, // Giảm từ 1024 xuống 512 để tăng tốc
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

    // Lấy dữ liệu mới từ database với timeout ngắn
    try {
        console.log(`[Cache] ${forceRefresh ? 'Force refreshing' : 'Refreshing'} tour data cache...`);
        
        // Sử dụng Promise.race để timeout sau 5 giây
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cache timeout')), 5000)
        );
        
        const dataPromise = TourDataService.getChatbotContext();
        tourDataCache = await Promise.race([dataPromise, timeoutPromise]);
        
        lastCacheUpdate = now;
        console.log(`[Cache] Tour data cache updated successfully. Total tours: ${tourDataCache.statistics.totalTours}`);
        return buildSystemPrompt(tourDataCache, chatHistory);
    } catch (error) {
        console.error('Error getting tour data for chatbot:', error.message);
        // Nếu có cache cũ, sử dụng cache cũ thay vì fallback
        if (tourDataCache) {
            console.warn('[Cache] Using stale cache data due to database error');
            return buildSystemPrompt(tourDataCache, chatHistory);
        }
        // Fallback: tạo context đơn giản với dữ liệu cơ bản
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

    // Tối ưu: chỉ hiển thị top categories và tours nổi bật với SLUG thực
    const topCategories = Object.entries(tourData.toursByCategory).slice(0, 5);
    topCategories.forEach(([categoryName, categoryData]) => {
        prompt += `📍 ${categoryName}: `;
        if (categoryData.tours && categoryData.tours.length > 0) {
            const topTours = categoryData.tours.slice(0, 2); // Chỉ lấy 2 tour top
            const tourNames = topTours.map(tour =>
                `${tour.title} (${formatPrice(tour.price)}${tour.rating > 0 ? `, ${tour.rating}⭐` : ''}) [SLUG: ${tour.slug}]`
            );
            prompt += tourNames.join(', ') + '\n';
        } else {
            prompt += 'Đang cập nhật\n';
        }
    });

    prompt += `\n🌟 ĐIỂM ĐẾN PHỔ BIẾN: `;
    const topDestinations = tourData.popularDestinations.slice(0, 8);
    prompt += topDestinations.map(dest => `${dest.name} (${dest.tourCount})`).join(', ');

    // Thêm tour nổi bật
    if (tourData.featuredTours && tourData.featuredTours.length > 0) {
        prompt += `\n\n⭐ TOUR NỔI BẬT:\n`;
        const topFeaturedTours = tourData.featuredTours.slice(0, 5);
        topFeaturedTours.forEach(tour => {
            prompt += `• **${tour.title}** (${formatPrice(tour.price)}${tour.rating > 0 ? `, ${tour.rating}⭐` : ''}) [SLUG: ${tour.slug}]\n`;
        });
    }

    // Thêm tour theo sở thích phổ biến để AI dễ gợi ý
    prompt += `\n\n🏖️ TOUR THEO SỞ THÍCH:\n`;

    // Tour biển
    const beachTours = tourData.featuredTours?.filter(t =>
        t.title.toLowerCase().includes('phú quốc') ||
        t.title.toLowerCase().includes('nha trang') ||
        t.title.toLowerCase().includes('vũng tàu') ||
        t.title.toLowerCase().includes('đà nẵng') ||
        t.title.toLowerCase().includes('hội an')
    ).slice(0, 3);

    if (beachTours && beachTours.length > 0) {
        prompt += `🏖️ **BIỂN**: ${beachTours.map(t => `${t.title} (${formatPrice(t.price)}) [SLUG: ${t.slug}]`).join(', ')}\n`;
    }

    // Tour núi
    const mountainTours = tourData.featuredTours?.filter(t =>
        t.title.toLowerCase().includes('sapa') ||
        t.title.toLowerCase().includes('hạ long') ||
        t.title.toLowerCase().includes('đà lạt') ||
        t.title.toLowerCase().includes('mù cang chải')
    ).slice(0, 3);

    if (mountainTours && mountainTours.length > 0) {
        prompt += `⛰️ **NÚI/VÙNG CAO**: ${mountainTours.map(t => `${t.title} (${formatPrice(t.price)}) [SLUG: ${t.slug}]`).join(', ')}\n`;
    }

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

    prompt += `\n\n🎯 NHIỆM VỤ CHÍNH:
Tư vấn tour du lịch thông minh dựa trên ngân sách, sở thích và thời gian của khách hàng.

${hasGreeted ? '⚠️ ĐÃ CHÀO - KHÔNG chào lại! Đi thẳng vào vấn đề.' : '✅ Tin nhắn đầu - có thể chào ngắn gọn.'}

🚨 QUAN TRỌNG NHẤT - ĐỌC TRƯỚC KHI TRẢ LỜI:
⚠️ Trước khi trả lời BẤT KỲ câu hỏi nào, hãy:
1. ĐỌC KỸ LỊCH SỬ hội thoại phía dưới
2. NHẬN DIỆN tour đang được bàn luận (tour vừa được giới thiệu/nhắc đến)
3. NẾU câu hỏi về "ngày khởi hành", "lịch khởi hành", "khởi hành ngày nào" → CÂU TRẢ LỜI PHẢI VỀ TOUR VỪA NÓI ĐẾN
4. TUYỆT ĐỐI KHÔNG hỏi lại "tour nào?" khi đã biết tour đang được bàn

Ví dụ CỤ THỂ:
- Lịch sử: Bot vừa nói "Tour Phú Quốc 4N3Đ Lễ 2/9"
- User hỏi: "Biết ngày khởi hành nữa"
- ✅ ĐÚNG: Trả lời về lịch khởi hành Tour Phú Quốc
- ❌ SAI: "Bạn quan tâm tour nào?" ← SAI HOÀN TOÀN!

📋 LUỒNG TƯ VẤN TỐI ƯU:
1️⃣ **PHÁT HIỆN NHU CẦU**: Xác định điểm đến/sở thích (biển, núi, city...)
2️⃣ **XÁC NHẬN & GỢI Ý NGAY**: Khi khách xác nhận ("đúng", "vâng", "ok") → GỢI Ý TOUR CỤ THỂ ngay lập tức
3️⃣ **BỔ SUNG THÔNG TIN**: Hỏi ngân sách, thời gian nếu cần thiết
4️⃣ **PERSONALIZE**: Dựa vào context đã biết, đưa ra gợi ý phù hợp nhất
5️⃣ **HÀNH ĐỘNG**: Hướng dẫn đặt tour trên website

🚫 TUYỆT ĐỐI CẤM:
- Lặp lại thông tin khách đã cung cấp
- Hỏi lại câu hỏi đã biết câu trả lời
- Giới thiệu chung chung khi đã biết nhu cầu cụ thể
- Template responses không liên quan
- Tự ý đặt tour cho khách (chỉ hướng dẫn)

✅ LUÔN LUÔN LÀM:
- Đọc kỹ LỊCH SỬ HỘI THOẠI trước khi trả lời
- Sử dụng THÔNG TIN ĐÃ BIẾT để cá nhân hóa
- Gợi ý tour CỤ THỂ với tên, giá, link (không chung chung)
- Trả lời ĐÚNG TRỌNG TÂM câu hỏi
- Ngắn gọn, súc tích, hữu ích

🎯 NGUYÊN TẮC:
1. Ưu tiên tours có sẵn trong hệ thống
2. Thông tin giá chính xác từ dữ liệu thực
3. Phù hợp ngân sách khách hàng
4. Trả lời ngắn gọn, thân thiện bằng tiếng Việt
5. Khuyến khích đặt tour trên website
6. Khi khách hàng hỏi về liên hệ, LUÔN trả lời: "Bạn có thể liên hệ với chúng tôi qua website http://localhost:5173 hoặc gọi điện đến số hotline 0972 122 555. Chúng tôi hỗ trợ 24/7!"
7. Khi giới thiệu tour cụ thể, LUÔN cung cấp link chi tiết với SLUG thực: "Xem chi tiết và đặt tour tại: http://localhost:5173/tour/[SỬ_DỤNG_SLUG_THỰC_TỪ_DỮ_LIỆU]"
8. KHÔNG BAO GIỜ hiển thị ID tour trong câu trả lời cho khách hàng - chỉ sử dụng SLUG để tạo link
9. 🚫 **CẤM TỰ Ý ĐẶT TOUR**: TUYỆT ĐỐI KHÔNG được tự ý đặt tour cho khách hàng, không được hứa hẹn "tiến hành đặt tour", "hoàn tất booking" hay tương tự. Chỉ được hướng dẫn khách hàng truy cập website để tự đặt tour
10. **TRA CỨU ĐƠN HÀNG**: Khi khách hàng hỏi về đơn hàng, yêu cầu họ cung cấp mã đơn hàng và số điện thoại đã đặt
11. **THANH TOÁN**: Khi khách hàng hỏi về thanh toán, kiểm tra trạng thái và hướng dẫn thanh toán lại nếu cần
12. **HỖ TRỢ ĐƠN HÀNG**: Luôn sẵn sàng hỗ trợ tra cứu trạng thái đơn hàng, thanh toán và giải đáp thắc mắc về booking
13. **XỬ LÝ SO SÁNH**: Khi được yêu cầu so sánh tours, liệt kê rõ ràng ưu/nhược điểm, giá cả, thời gian, phù hợp với đối tượng nào
14. **TƯ VẤN THÔNG MINH**: Khi có [YÊU CẦU TƯ VẤN], phân tích nhu cầu và đưa ra gợi ý cụ thể với lý do
15. **THÔNG TIN MÙA VỤ**: Khi hỏi về thời tiết/mùa, cung cấp thông tin chi tiết về từng mùa và gợi ý thời điểm tốt nhất
16. **GIỜ KHỞI HÀNH**: Khi khách hỏi về giờ khởi hành, ưu tiên hiển thị giờ cụ thể từ database, nếu không có thì cung cấp thông tin giờ khởi hành thông thường (6:00-8:00 sáng cho tour trong ngày, 7:00-9:00 sáng cho tour nhiều ngày)
17. **KHUYẾN MÃI**: Khi hiển thị tour, luôn kiểm tra và hiển thị % giảm giá nếu có, tính toán giá sau giảm, thông báo chương trình khuyến mãi đặc biệt
18. **VẬN CHUYỂN**: Khi khách hỏi về phương tiện, hiển thị thông tin chi tiết về xe, tài xế, hướng dẫn viên, lịch trình di chuyển
19. **BẢO MẬT THÔNG TIN**: Khi khách hỏi về thông tin khách hàng, trả lời trực tiếp về chính sách bảo mật, không tránh né
20. **XỬ LÝ CÂU HỎI NHẠY CẢM**: Từ chối cung cấp thông tin cá nhân, tài chính, nội bộ một cách lịch sự

🗣️ XỬ LÝ CÂU HỎI THÔNG MINH:

📌 **CÂU HỎI CHUNG CHUNG** ("đi du lịch", "có tour nào"):
→ Hỏi cụ thể: "Bạn muốn đi **biển**, **núi** hay **city**?"

📌 **CÂU HỎI CỤ THỂ** ("đi biển", "đi Phú Quốc"):
→ GỢI Ý TOUR NGAY với giá và link cụ thể
→ Sau đó mới hỏi thêm ngân sách/thời gian

📌 **XÁC NHẬN** ("đúng rồi", "vâng", "ừ", "ok"):
→ NGAY LẬP TỨC show tour cụ thể, KHÔNG hỏi lại

📌 **HỎI NGÀY KHỞI HÀNH** ("ngày nào khởi hành", "lịch khởi hành"):
→ NẾU vừa giới thiệu tour cụ thể → GỌI API lấy lịch khởi hành của TOUR ĐÓ
→ HIỂN THỊ: Ngày khởi hành + giá + còn chỗ/hết chỗ
→ KHÔNG hỏi lại "tour nào"

📌 **HỎI LỊCH TRÌNH** ("lịch trình như thế nào", "đi những đâu"):
→ NẾU đang nói về tour cụ thể → HIỂN THỊ lịch trình CỦA TOUR ĐÓ
→ Format: Ngày 1: [...], Ngày 2: [...], Ngày 3: [...]

📌 **YÊU CẦU SO SÁNH** ("so sánh tour A vs B"):
→ Bảng so sánh chi tiết: giá, thời gian, ưu/nhược điểm

📌 **HỎI GIÁ** ("bao nhiêu tiền", "giá tour"):
→ Hiển thị giá rõ ràng + khuyến mãi (nếu có)

📌 **KẾT THÚC** ("cảm ơn", "tạm biệt"):
→ Cảm ơn lịch sự, KHÔNG hỏi thêm

🎯 NGUYÊN TẮC VÀNG:
1. ĐỌC KỸ lịch sử → Hiểu ngữ cảnh
2. NHẬN DIỆN TOUR đang bàn → NẾU vừa giới thiệu tour X, câu hỏi tiếp theo LÀ VỀ TOUR X
3. XÁC ĐỊNH intent → Trả lời đúng trọng tâm
4. SỬ DỤNG context đã biết → Cá nhân hóa
5. GỢI Ý CỤ THỂ → Không chung chung
6. HÀNH ĐỘNG RÕ RÀNG → Link + hướng dẫn

⚠️ QUAN TRỌNG VỀ NGÀY KHỞI HÀNH:
- NẾU lịch sử có giới thiệu tour cụ thể (VD: "Tour Phú Quốc...")
- VÀ khách hỏi "ngày khởi hành", "lịch khởi hành", "khởi hành ngày nào"
→ HIỂU NGAY: Khách hỏi về TOUR VỪA GIỚI THIỆU
→ TRẢ LỜI: Lịch khởi hành cụ thể của tour đó (từ data hoặc hướng dẫn xem)
→ KHÔNG hỏi lại: "Bạn quan tâm tour nào?"

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

📝 MẪU TRẢ LỜI ĐẶT TOUR:
Khi khách hàng muốn đặt tour, TUYỆT ĐỐI KHÔNG tự ý đặt mà hướng dẫn:
"Để đặt tour [TÊN_TOUR], bạn vui lòng:
📍 **Bước 1:** Truy cập link chi tiết: [LINK_TOUR]
🛒 **Bước 2:** Click 'Đặt Tour Ngay' trên trang
📝 **Bước 3:** Điền thông tin và chọn ngày khởi hành
💳 **Bước 4:** Hoàn tất thanh toán

Hoặc liên hệ hotline **0972 122 555** để được tư vấn trực tiếp!
Tôi không thể đặt tour trực tiếp qua chat này."

📋 MẪU TRẢ LỜI TRA CỨU ĐƠN HÀNG:
Khi khách hàng muốn tra cứu đơn hàng:
"Để tra cứu đơn hàng, bạn vui lòng cung cấp:
🎫 **Mã đơn hàng** (VD: ORD-20240101-001)
� **Email** hoặc �📱 **Số điện thoại** đã đặt tour

Sau khi có thông tin, tôi sẽ giúp bạn kiểm tra trạng thái đơn hàng ngay!"

📋 MẪU TRẢ LỜI THANH TOÁN:
Khi khách hàng hỏi về thanh toán:
"Tôi có thể giúp bạn:
💳 Kiểm tra **trạng thái thanh toán**
🔄 Tạo **link thanh toán lại** (nếu thanh toán thất bại)
📋 Tra cứu **thông tin đơn hàng**

Bạn vui lòng cung cấp mã đơn hàng và email hoặc số điện thoại để tôi hỗ trợ!"

📋 MẪU TRẢ LỜI TRA CỨU ĐƠN HÀNG:
Khi khách hàng muốn tra cứu đơn hàng:
"Để tra cứu đơn hàng một cách an toàn, bạn cần thực hiện 3 bước:

**Bước 1:** Cung cấp **mã đơn hàng** (VD: ORD-20240101-001)
**Bước 2:** Cung cấp **email hoặc số điện thoại** đã đặt tour  
**Bước 3:** Nhập **mã OTP** được gửi đến email/SĐT để xác thực

Điều này giúp bảo vệ thông tin cá nhân của bạn. Hãy bắt đầu bằng cách cho tôi biết mã đơn hàng!"

📋 MẪU XỬ LÝ KHI CÓ THÔNG TIN ĐƠN HÀNG:
Khi khách hàng cung cấp mã đơn hàng:
"Tôi đã nhận được mã đơn hàng: **[MÃ_ĐƠN_HÀNG]**

Bây giờ vui lòng cung cấp **email hoặc số điện thoại** mà bạn đã sử dụng khi đặt tour để tôi có thể gửi mã OTP xác thực."

Khi khách hàng cung cấp email/SĐT:
"Tôi sẽ gửi mã OTP đến [EMAIL/SĐT] để xác thực danh tính. Vui lòng chờ trong giây lát..."

Khi cần nhập OTP:
"Mã OTP đã được gửi! Vui lòng kiểm tra [email/tin nhắn] và nhập mã **6 số** vào đây."

📋 MẪU TRẢ LỜI SO SÁNH TOURS:
Khi được yêu cầu so sánh [YÊU CẦU SO SÁNH]:
"Tôi sẽ so sánh chi tiết các tour cho bạn:

**🏖️ Tour A vs 🏔️ Tour B**

**✅ Ưu điểm Tour A:**
- [Điểm mạnh cụ thể]
- [Phù hợp với đối tượng nào]

**❌ Nhược điểm Tour A:**
- [Hạn chế cụ thể]

**✅ Ưu điểm Tour B:**
- [Điểm mạnh cụ thể]

**💡 Kết luận:** Tôi khuyên bạn chọn [Tour phù hợp] vì [lý do cụ thể]."

📋 MẪU TRẢ LỜI TƯ VẤN:
Khi có [YÊU CẦU TƯ VẤN]:
"Dựa trên nhu cầu của bạn, tôi phân tích như sau:

**📊 Phân tích nhu cầu:**
- Ngân sách: [phân tích]
- Thời gian: [phân tích]
- Sở thích: [phân tích]

**💡 Gợi ý của tôi:**
1. **Tour được khuyên:** [Tên tour] - [Lý do]
2. **Thời điểm tốt nhất:** [Tháng/mùa] - [Lý do]
3. **Lưu ý đặc biệt:** [Ghi chú quan trọng]"

📋 MẪU TRẢ LỜI KHUYẾN MÃI:
Khi hiển thị tour có khuyến mãi:
"🎁 **KHUYẾN MÃI ĐẶC BIỆT**:
💰 **Giá gốc**: [Giá gốc]
🔥 **Giảm giá**: [%]% (Tiết kiệm [Số tiền])
✅ **Giá sau giảm**: [Giá cuối]
⏰ **Áp dụng đến**: [Ngày hết hạn]

📞 **Hotline**: 0972 122 555 để đặt ngay!"

📋 MẪU TRẢ LỜI VẬN CHUYỂN:
Khi khách hỏi về phương tiện:
"🚌 **PHƯƠNG TIỆN DI CHUYỂN**:
🚗 **Phương tiện**: [Loại xe/Phương tiện]
👨‍✈️ **Tài xế**: [Thông tin tài xế]
👩‍🏫 **Hướng dẫn viên**: [Thông tin HDV]
📍 **Lịch trình**: [Chi tiết di chuyển]

📞 **Hotline**: 0972 122 555 để biết thêm chi tiết!"

📋 MẪU TRẢ LỜI BẢO MẬT THÔNG TIN:
Khi khách hỏi về thông tin khách hàng:
"🔒 **BẢO MẬT THÔNG TIN KHÁCH HÀNG**:

Chúng tôi rất coi trọng việc bảo vệ thông tin cá nhân của khách hàng.

**📊 Thông tin chúng tôi thu thập:**
• Thông tin đặt tour (tên, SĐT, email)
• Thông tin thanh toán (được mã hóa an toàn)
• Lịch sử giao dịch

**🛡️ Cam kết bảo mật:**
• Không chia sẻ thông tin với bên thứ 3
• Mã hóa dữ liệu nhạy cảm
• Tuân thủ Luật An toàn thông tin

**📞 Liên hệ bảo mật:**
Hotline: 0972 122 555
Email: privacy@ndtravel.com

Bạn có thắc mắc gì về chính sách bảo mật không?"

📋 MẪU TRẢ LỜI CÂU HỎI NHẠY CẢM:
Khi khách hỏi thông tin không được phép:
"⚠️ **KHÔNG THỂ CUNG CẤP THÔNG TIN**:

Xin lỗi, tôi không thể cung cấp thông tin này vì:
• Bảo vệ quyền riêng tư khách hàng
• Tuân thủ chính sách bảo mật
• Đảm bảo an toàn thông tin

**💡 Tôi có thể giúp bạn:**
• Tư vấn tour phù hợp
• Hướng dẫn đặt tour
• Tra cứu đơn hàng của bạn

Bạn cần hỗ trợ gì khác không?"

🔗 TẠO LINK TOUR CỤ THỂ:
Khi giới thiệu tour cụ thể, hãy tạo link trực tiếp đến trang chi tiết tour:
- Format: http://localhost:5173/tour/[SLUG_TOUR_THỰC_TẾ]
- QUAN TRỌNG: Sử dụng SLUG thực từ dữ liệu tour trong dấu [SLUG: ...], KHÔNG dùng placeholder
- Ví dụ đúng: "Xem chi tiết tour tại: http://localhost:5173/tour/tour-phu-quoc-4n3d-le-29-dao-ngoc-thien-duong"
- Ví dụ SAI: "http://localhost:5173/tour/ID_TOUR_PHU_QUOC_LE_2_9_1"
- Trong dữ liệu tour có format: "Tên tour [SLUG: tour-phu-quoc-4n3d-le-29-dao-ngoc-thien-duong]" - hãy lấy SLUG từ đây

📋 VÍ DỤ 1: XỬ LÝ XÁC NHẬN

❌ SAI - Hỏi lại thông tin đã biết:
User: "Tôi muốn đi biển"
Bot: "Bạn muốn đi biển phải không ạ?"
User: "Đúng rồi ạ"
Bot: "Tôi hiểu bạn đang quan tâm đến tour du lịch! Bạn muốn tìm hiểu về tour nào?" ← SAI!

✅ ĐÚNG - Gợi ý tour ngay:
User: "Tôi muốn đi biển"
Bot: "Bạn muốn đi biển phải không ạ?"
User: "Đúng rồi ạ"
Bot: "Tuyệt! Chúng tôi có các tour biển nổi bật:

• **Tour Nha Trang 3N2Đ** - **4.500.000đ**
Xem chi tiết: http://localhost:5173/tour/tour-nha-trang-3n2d

• **Tour Phú Quốc 4N3Đ** - **6.200.000đ**
Xem chi tiết: http://localhost:5173/tour/tour-phu-quoc-4n3d

Bạn quan tâm tour nào?"

📋 VÍ DỤ 2: HỎI NGÀY KHỞI HÀNH

❌ SAI - Hỏi lại tour nào:
Bot: [Vừa giới thiệu Tour Phú Quốc 4N3Đ Lễ 2/9]
User: "Biết ngày khởi hành nữa"
Bot: "Bạn quan tâm đến tour nào để tôi cung cấp lịch khởi hành?" ← SAI! Đã biết tour rồi!

✅ ĐÚNG - Trả lời ngay về tour vừa giới thiệu:
Bot: [Vừa giới thiệu Tour Phú Quốc 4N3Đ Lễ 2/9]
User: "Biết ngày khởi hành nữa"
Bot: "📅 **Lịch khởi hành Tour Phú Quốc 4N3Đ Lễ 2/9:**

• 01/09/2025 - Còn chỗ - 6.200.000đ
• 02/09/2025 - Còn 3 chỗ - 6.200.000đ
• 08/09/2025 - Còn chỗ - 6.200.000đ

🔗 Đặt ngay: http://localhost:5173/tour/tour-phu-quoc-4n3d-le-29
📞 Hotline: 0972 122 555"

📋 VÍ DỤ CÁCH TRẢ LỜI TOUR:
Nếu trong dữ liệu có: "Tour Mù Cang Chải mùa lúa chín 3 ngày 2 đêm từ Hà Nội 2025 (8.500.000đ, 4.5⭐) [SLUG: tour-mu-cang-chai-mua-lua-chin-3-ngay-2-dem-tu-ha]"

Thì trả lời:
"Tour Mù Cang Chải mùa lúa chín 3 ngày 2 đêm từ Hà Nội 2025
💰 Giá: 8.500.000đ
⭐ Đánh giá: 4.5/5

🔗 Xem chi tiết và đặt tour tại: http://localhost:5173/tour/tour-mu-cang-chai-mua-lua-chin-3-ngay-2-dem-tu-ha"

🔄 KHI LIỆT KÊ NHIỀU TOUR, SỬ DỤNG FORMAT:
"Chúng tôi có 3 tour Phú Quốc như sau:

• Tour Phú Quốc 4N3Đ Lễ 2/9 - Đảo Ngọc Thiên Đường (4.500.000đ)

Xem chi tiết và đặt tour tại: http://localhost:5173/tour/tour-phu-quoc-4n3d-le-29-dao-ngoc-thien-duong

---

• Tour Phú Quốc 4N3Đ Lễ 2/9 - Đảo Ngọc Thiên Đường (6.293.000đ)

Xem chi tiết và đặt tour tại: http://localhost:5173/tour/tour-phu-quoc-le-29-dao-ngoc-thien-duong-1

---

• Tour Phú Quốc 4N3Đ Lễ 2/9 - Đảo Ngọc Thiên Đường (Liên hệ)

Xem chi tiết và đặt tour tại: http://localhost:5173/tour/tour-phu-quoc-4n3d-le-29-dao-ngoc-thien-duong

Bạn muốn xem thêm thông tin về tour nào?"

📝 NGUYÊN TẮC ĐỊNH DẠNG:
- Sử dụng xuống dòng giữa các đoạn để đảm bảo tách dòng đẹp
- Có thể dùng dấu --- hoặc chỉ cần 2 lần xuống dòng giữa mỗi tour
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
- Luôn sử dụng xuống dòng để tách đoạn văn
- Đặc biệt chú ý tách dòng giữa tên tour và link
- Giữa các tour phải có separator hoặc ít nhất 2 dòng trống
- Gemini sẽ tự động xử lý xuống dòng thành format đẹp

❌ KHÔNG BAO GIỜ viết như thế này:
"Tour Phú Quốc 4N3Đ (ID: 68b01a29195c0e0a5ba05a34)"
"Bạn muốn xem chi tiết tour nào? (ID: 68b01b11995e922f7982f4d6)"
"http://localhost:5173/tour/ID_TOUR_PHU_QUOC_LE_2_9_1"

✅ LUÔN viết như thế này:
"Tour Phú Quốc 4N3Đ - Đảo Ngọc Thiên Đường"
"Xem chi tiết tour tại: http://localhost:5173/tour/tour-phu-quoc-4n3d-le-29-dao-ngoc-thien-duong"

🌤️ THÔNG TIN THỜI TIẾT & MÙA VỤ:
**Miền Bắc:**
- Mùa xuân (T3-T5): Ấm áp, hoa nở, lý tưởng cho trekking và ngắm cảnh
- Mùa hè (T6-T8): Nóng ẩm, thích hợp cho tour biển miền Trung
- Mùa thu (T9-T11): Mát mẻ, đẹp nhất trong năm, hoàn hảo cho mọi tour
- Mùa đông (T12-T2): Lạnh khô, có thể có tuyết ở vùng cao

**Miền Trung:**
- Mùa khô (T1-T8): Nắng đẹp, biển êm, lý tưởng cho du lịch biển
- Mùa mưa (T9-T12): Mưa bão, nên tránh hoặc có kế hoạch dự phòng

**Miền Nam:**
- Mùa khô (T11-T4): Nắng ấm, ít mưa, thời điểm vàng cho du lịch
- Mùa mưa (T5-T10): Mưa chiều, không ảnh hưởng nhiều đến du lịch

🍜 THÔNG TIN ẨM THỰC ĐỊA PHƯƠNG:
- **Hà Nội:** Phở, bún chả, bánh mì, trà đá vỉa hè
- **Đà Nẵng:** Mì Quảng, bánh xèo, nem lụi, cơm gà Hội An
- **Nha Trang:** Hải sản tươi sống, bánh căn, nem nướng
- **Đà Lạt:** Bánh tráng nướng, nem nướng, rau dalat, cà phê
- **Phú Quốc:** Gỏi cá trích, bánh kẹp, hải sản nướng, rượu sim
- **TPHCM:** Bánh mì, phở, cơm tấm, chè, café sữa đá

🏛️ THÔNG TIN VĂN HÓA & LỊCH SỬ:
- **Hà Nội:** Thăng Long cổ, văn miếu, lăng Bác, phố cổ
- **Huế:** Cố đô, hoàng cung, chùa Thiên Mụ, âm nhạc cung đình
- **Hội An:** Phố cổ, đèn lồng, kiến trúc Pháp-Việt-Hoa
- **Sapa:** Văn hóa dân tộc, ruộng bậc thang, chợ tình
- **Mekong:** Văn hóa sông nước, chợ nổi, làng nghề truyền thống

💡 LƯU Ý QUAN TRỌNG:
- Luôn đề xuất thời điểm tốt nhất dựa trên thời tiết
- Giới thiệu đặc sản địa phương khi tư vấn tour
- Gợi ý hoạt động phù hợp với văn hóa địa phương
- Cảnh báo thời tiết xấu và đưa ra kế hoạch thay thế

Cập nhật: ${new Date(tourData.lastUpdated).toLocaleString('vi-VN')}`;

    return prompt;
};

// Helper function để format giá
const formatPrice = (price) => {
    if (!price || price === 0) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
};

// Chuẩn hóa tiếng Việt về dạng không dấu để so khớp từ khóa tốt hơn
function normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '') // bỏ dấu tiếng Việt
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
}

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
- **QUAN TRỌNG**: Khi khách hàng cảm ơn, nói "được rồi", "ok", "tạm biệt" hoặc tỏ ý hài lòng, hãy cảm ơn lại và kết thúc cuộc hội thoại một cách lịch sự. KHÔNG tiếp tục hỏi thêm câu hỏi nào nữa.

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
 * Lấy lịch sử hội thoại theo session ID từ database
 */
async function getConversationHistory(sessionId) {
    try {
        logger.database('findOne', 'ChatHistory', { sessionId, isActive: true });
        
        const chatSession = await ChatHistory.findOne({ 
            sessionId, 
            isActive: true 
        });
        
        if (!chatSession) {
            logger.chatbot('No chat session found', { sessionId: sessionId?.substring(0, 20) + '...' });
            return [];
        }
        
        const messages = chatSession.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
        }));
        
        logger.chatbot('Retrieved conversation history', { 
            sessionId: sessionId?.substring(0, 20) + '...',
            messageCount: messages.length 
        });
        
        return messages;
    } catch (error) {
        logger.error('Error getting conversation history from database', error);
        // Fallback to memory if database fails
        if (!conversationHistory.has(sessionId)) {
            conversationHistory.set(sessionId, []);
        }
        return conversationHistory.get(sessionId);
    }
}

/**
 * Lưu tin nhắn vào lịch sử hội thoại - sử dụng database
 */
async function saveMessageToHistory(sessionId, role, content, userInfo = {}) {
    try {
        // Cắt ngắn content nếu quá dài để tiết kiệm memory và token
        const maxContentLength = 800;
        const trimmedContent = content.length > maxContentLength
            ? content.substring(0, maxContentLength) + '...'
            : content;

        // Tìm hoặc tạo session trong database
        const chatSession = await ChatHistory.findOrCreateSession(sessionId, userInfo);
        
        // Thêm message vào database
        await chatSession.addMessage(role, trimmedContent, {
            originalLength: content.length,
            trimmed: content.length > maxContentLength
        });

        // Làm sạch messages cũ nếu quá nhiều
        await chatSession.clearOldMessages(100);

    } catch (error) {
        console.error('Error saving message to database:', error);
        // Fallback to memory if database fails
        const history = getConversationHistorySync(sessionId);
        const maxContentLength = 800;
        const trimmedContent = content.length > maxContentLength
            ? content.substring(0, maxContentLength) + '...'
            : content;

        history.push({
            role,
            content: trimmedContent,
            timestamp: new Date().toISOString()
        });

        if (history.length > 50) {
            history.splice(0, history.length - 50);
        }
    }
}

/**
 * Fallback function for synchronous memory access
 */
function getConversationHistorySync(sessionId) {
    if (!conversationHistory.has(sessionId)) {
        conversationHistory.set(sessionId, []);
    }
    return conversationHistory.get(sessionId);
}

/**
 * Xây dựng context cho cuộc hội thoại với dữ liệu tour động - tối ưu token
 * SỬ DỤNG ConversationContextService cho enhanced context awareness
 */
async function buildConversationContext(sessionId, newMessage) {
    try {
        // Lấy full conversation context từ ConversationContextService
        const conversationContext = await ConversationContextService.getConversationContext(sessionId);

        // Lấy system context với tour data
        const history = conversationContext.conversationHistory || [];
        const systemContext = await getSystemContext(false, history);

        // Build enhanced context với user preferences và conversation summary
        const contextualPrompt = ConversationContextService.buildContextualPrompt(newMessage, conversationContext);

        // Kết hợp system context và contextual prompt
        let fullContext = systemContext + "\n\n" + contextualPrompt;

        // Hướng dẫn sử dụng context
        fullContext += `\n🔍 HƯỚNG DẪN XỬ LÝ:
- ĐỌC KỸ lịch sử và thông tin khách hàng phía trên
- SỬ DỤNG user preferences để đưa ra gợi ý phù hợp
- KHÔNG hỏi lại thông tin đã biết (điểm đến, ngân sách, thời gian)
- NẾU đã chào - KHÔNG chào lại
- Sử dụng dữ liệu tour thực từ hệ thống
- KHÔNG hiển thị ID tour trong câu trả lời
- Sử dụng SLUG để tạo link: http://localhost:5173/tour/[SLUG]
- **QUAN TRỌNG**: Nếu khách hàng cảm ơn, nói "được rồi", "ok", "tạm biệt" hoặc tỏ ý hài lòng, hãy cảm ơn lại và kết thúc cuộc hội thoại. KHÔNG hỏi thêm câu hỏi nào nữa.

🤖 TRẢ LỜI:`;

        return fullContext;

    } catch (error) {
        // Fallback to old context building if ConversationContextService fails
        console.error('Error building enhanced context, falling back to basic context:', error);

        const history = await getConversationHistory(sessionId);
        const systemContext = await getSystemContext(false, history);

        let context = systemContext + "\n\n=== HỘI THOẠI ===\n";

        const recentHistory = history.slice(-10);
        recentHistory.forEach(msg => {
            const role = msg.role === 'user' ? '👤' : '🤖';
            const content = msg.content.length > 400 ? msg.content.substring(0, 400) + '...' : msg.content;
            context += `${role}: ${content}\n`;
        });

        context += `\n👤: ${newMessage}\n\n🤖:`;

        return context;
    }
}

/**
 * Gửi tin nhắn đến Gemini AI với error handling mạnh mẽ
 */
async function askGemini(message, sessionId = null) {
    const startTime = Date.now();
    try {
        logger.chatbot('Processing message', { 
            messageLength: message?.length, 
            sessionId: sessionId?.substring(0, 20) + '...',
            hasMessage: !!message 
        });

        // Validate input
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            logger.warn('Invalid message input', { message, sessionId });
            return {
                success: false,
                error: 'Tin nhắn không hợp lệ',
                sessionId: sessionId || generateSessionId(),
                timestamp: new Date().toISOString()
            };
        }

        // Kiểm tra tin nhắn quá dài
        if (message.length > 500) {
            logger.warn('Message too long', { messageLength: message.length, sessionId });
            return {
                success: false,
                error: 'Tin nhắn quá dài. Vui lòng giới hạn trong 500 ký tự.',
                sessionId: sessionId || generateSessionId(),
                timestamp: new Date().toISOString()
            };
        }

        // Kiểm tra câu hỏi nhạy cảm và ngoài phạm vi TRƯỚC KHI gọi Gemini API
        const normalized = normalizeText(message);
        const containsAny = (text, patterns) => patterns.some(p => text.includes(p));
        
        // Patterns nhạy cảm
        const sensitivePatterns = [
            'số tài khoản','account number','thẻ tín dụng','credit card','mật khẩu','password','pin','cvv',
            'số thẻ','mã bảo mật','mã xác thực','thông tin thanh toán','tài khoản ngân hàng',
            'stk','mk','otp','bank','so the','ma bao mat','ma xac thuc','thong tin thanh toan',
            'tai khoan ngan hang','so tai khoan ngan hang','the tin dung','mat khau',
            'khách hàng khác','other customer','thông tin người khác','dữ liệu khách hàng khác',
            'thông tin cá nhân người khác','khach hang khac','thong tin nguoi khac',
            'du lieu khach hang khac','thong tin ca nhan nguoi khac',
            'thông tin nội bộ','internal information','bí mật','confidential','thông tin công ty',
            'dữ liệu nội bộ','bí mật kinh doanh','thong tin noi bo','thong tin cong ty',
            'du lieu noi bo','bi mat kinh doanh','bi mat',
            'hack','crack','virus','malware','tấn công','xâm nhập','spam','abuse',
            'hack hệ thống','hack he thong','hack website','hack database',
            'hack server','hack mạng','hack mang','hack wifi',
            'hack facebook','hack instagram','hack tiktok','hack zalo',
            'tan cong','xam nhap','tan cong he thong','xam nhap he thong',
            'tan cong website','xam nhap website','tan cong database','xam nhap database',
            'tan cong server','xam nhap server','tan cong mang','xam nhap mang',
            'tan cong wifi','xam nhap wifi','tan cong facebook','xam nhap facebook',
            'tan cong instagram','xam nhap instagram','tan cong tiktok','xam nhap tiktok',
            'tan cong zalo','xam nhap zalo'
        ];
        
        // Patterns ngoài phạm vi
        const outOfScopePatterns = [
            'lập trình','programming','code','javascript','python','java','html','css',
            'crypto','coin','bitcoin','blockchain','chứng khoán','đầu tư','casino','cược',
            'gambling','AI code','machine learning','lap trinh','crypto','coin','bitcoin',
            'chung khoan','dau tu','casino','cuoc','gambling','ai code','machine learning',
            'bệnh','sức khỏe','thuốc','bác sĩ','y tế','chẩn đoán','benh','suc khoe',
            'thuoc','bac si','y te','chan doan','bị bệnh','bi benh','cần uống thuốc',
            'can uong thuoc','uống thuốc gì','uong thuoc gi','bệnh gì','benh gi',
            'cần uống','can uong','thuốc gì','thuoc gi','bác sĩ khám','bac si kham',
            'khám bệnh','kham benh','chữa bệnh','chua benh','điều trị','dieu tri',
            'phòng khám','phong kham','bệnh viện','benh vien','sức khỏe','suc khoe',
            'khỏe mạnh','khoe manh','bệnh tật','benh tat','triệu chứng','trieu chung',
            'cách chữa','cach chua','phương pháp điều trị','phuong phap dieu tri',
            'học','giáo dục','trường','sinh viên','bài tập','thi cử','hoc','giao duc',
            'truong','sinh vien','bai tap','thi cu','cách học','cach hoc','học tiếng anh',
            'hoc tieng anh','học tiếng','hoc tieng','tiếng anh','tieng anh','học hiệu quả',
            'hoc hieu qua','cách học hiệu quả','cach hoc hieu qua','học tập','hoc tap',
            'giáo dục','giao duc','trường học','truong hoc','sinh viên','sinh vien',
            'học sinh','hoc sinh','giáo viên','giao vien','thầy cô','thay co',
            'bài tập','bai tap','thi cử','thi cu','kiểm tra','kiem tra','đề thi','de thi',
            'học phí','hoc phi','tuyển sinh','tuyen sinh','đại học','dai hoc',
            'cao đẳng','cao dang','trung học','trung hoc','tiểu học','tieu hoc',
            'đầu tư','dau tu','chứng khoán','chung khoan','cổ phiếu','co phieu',
            'trái phiếu','trai phieu','quỹ đầu tư','quy dau tu','cách đầu tư',
            'cach dau tu','đầu tư chứng khoán','dau tu chung khoan','đầu tư cổ phiếu',
            'dau tu co phieu','đầu tư trái phiếu','dau tu trai phieu','đầu tư quỹ',
            'dau tu quy','đầu tư bất động sản','dau tu bat dong san','đầu tư vàng',
            'dau tu vang','đầu tư ngoại tệ','dau tu ngoai te','đầu tư tiền điện tử',
            'dau tu tien dien tu','đầu tư crypto','dau tu crypto','đầu tư bitcoin',
            'dau tu bitcoin','đầu tư ethereum','dau tu ethereum','đầu tư altcoin',
            'dau tu altcoin','đầu tư forex','dau tu forex','đầu tư hàng hóa',
            'dau tu hang hoa','đầu tư năng lượng','dau tu nang luong','đầu tư công nghệ',
            'dau tu cong nghe','đầu tư y tế','dau tu y te','đầu tư giáo dục',
            'dau tu giao duc','đầu tư du lịch','dau tu du lich','đầu tư bán lẻ',
            'dau tu ban le','đầu tư sản xuất','dau tu san xuat','đầu tư dịch vụ',
            'dau tu dich vu','đầu tư tài chính','dau tu tai chinh','đầu tư ngân hàng',
            'dau tu ngan hang','đầu tư bảo hiểm','dau tu bao hiem','đầu tư bất động sản',
            'dau tu bat dong san','đầu tư thương mại','dau tu thuong mai','đầu tư công nghiệp',
            'dau tu cong nghiep','đầu tư nông nghiệp','dau tu nong nghiep','đầu tư lâm nghiệp',
            'dau tu lam nghiep','đầu tư thủy sản','dau tu thuy san','đầu tư chăn nuôi',
            'dau tu chan nuoi','đầu tư trồng trọt','dau tu trong trot','đầu tư chế biến',
            'dau tu che bien','đầu tư xuất khẩu','dau tu xuat khau','đầu tư nhập khẩu',
            'dau tu nhap khau','đầu tư thương mại','dau tu thuong mai','đầu tư dịch vụ',
            'dau tu dich vu','đầu tư vận tải','dau tu van tai','đầu tư logistics',
            'dau tu logistics','đầu tư kho bãi','dau tu kho bai','đầu tư cảng biển',
            'dau tu cang bien','đầu tư sân bay','dau tu san bay','đầu tư đường bộ',
            'dau tu duong bo','đầu tư đường sắt','dau tu duong sat','đầu tư đường thủy',
            'dau tu duong thuy','đầu tư đường hàng không','dau tu duong hang khong',
            'đầu tư viễn thông','dau tu vien thong','đầu tư internet','dau tu internet',
            'đầu tư di động','dau tu di dong','đầu tư cố định','dau tu co dinh',
            'chính trị','politics','chính phủ','government','bầu cử','đảng phái',
            'chinh tri','chinh phu','bau cu','dang phai'
        ];
        
        // Kiểm tra nhạy cảm
        if (containsAny(message, sensitivePatterns) || containsAny(normalized, sensitivePatterns)) {
            updateMetrics(true, 0, 'sensitive');
            const sensitiveResponse = generateSensitiveResponse(message);
            await saveMessageToHistory(sessionId, 'user', message.trim());
            await saveMessageToHistory(sessionId, 'assistant', sensitiveResponse);
            return {
                success: true,
                reply: sensitiveResponse,
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                isSensitiveResponse: true
            };
        }
        
        // Kiểm tra ngoài phạm vi
        if (containsAny(message, outOfScopePatterns) || containsAny(normalized, outOfScopePatterns)) {
            updateMetrics(true, 0, 'outOfScope');
            const outOfScopeResponse = generateOutOfScopeResponse(message);
            await saveMessageToHistory(sessionId, 'user', message.trim());
            await saveMessageToHistory(sessionId, 'assistant', outOfScopeResponse);
            return {
                success: true,
                reply: outOfScopeResponse,
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                isOutOfScopeResponse: true
            };
        }

        // Kiểm tra API key
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY không được cấu hình');
        }

        // Kiểm tra circuit breaker
        if (isCircuitOpen()) {
            logger.warn('Circuit breaker open - using fallback response');
            const fallbackResponse = generateFallbackResponse(new Error('Circuit breaker open'));
            await saveMessageToHistory(sessionId, 'user', message.trim());
            await saveMessageToHistory(sessionId, 'assistant', fallbackResponse);
            return {
                success: true,
                reply: fallbackResponse,
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                isCircuitBreakerResponse: true
            };
        }

        // Tạo session ID nếu chưa có
        if (!sessionId) {
            sessionId = generateSessionId();
        }

        // Kiểm tra xem có phải tin nhắn cảm ơn hoặc kết thúc cuộc hội thoại không
        const userMessage = message.trim().toLowerCase();
        const normalizedMessage = normalizeText(userMessage);
        
        // Phát hiện tin nhắn cảm ơn và kết thúc cuộc hội thoại
        if (isThankYouOrGoodbyeMessage(userMessage)) {
            const thankYouResponse = generateThankYouResponse();
            
            // Lưu vào history
            await saveMessageToHistory(sessionId, 'user', message.trim());
            await saveMessageToHistory(sessionId, 'assistant', thankYouResponse);
            
            return {
                success: true,
                reply: thankYouResponse,
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                isThankYouResponse: true
            };
        }
        
        // Kiểm tra xem có phải câu hỏi về lịch trình không - nếu có thì ưu tiên lấy dữ liệu thật
        if (userMessage.includes('ngày') || userMessage.includes('lịch') || userMessage.includes('thời gian') || 
            userMessage.includes('khởi hành') || userMessage.includes('kết thúc') || userMessage.includes('bao lâu') ||
            userMessage.includes('khi nào') || userMessage.includes('mấy ngày') || userMessage.includes('lịch trình') ||
            userMessage.includes('giờ khởi hành') || userMessage.includes('mấy giờ') || userMessage.includes('xuất phát') ||
            userMessage.includes('giờ bắt đầu') || userMessage.includes('thời điểm khởi hành') ||
            userMessage.includes('khuyến mãi') || userMessage.includes('giảm giá') || userMessage.includes('promotion') ||
            userMessage.includes('vận chuyển') || userMessage.includes('phương tiện') || userMessage.includes('xe') ||
            userMessage.includes('tài xế') || userMessage.includes('hướng dẫn viên') || userMessage.includes('hdv') ||
            userMessage.includes('thông tin khách hàng') || userMessage.includes('bảo mật') || userMessage.includes('privacy') ||
            userMessage.includes('dữ liệu cá nhân') || userMessage.includes('thông tin cá nhân') || userMessage.includes('personal data') ||
            // Nhạy cảm & ngoài phạm vi (không dấu)
            normalizedMessage.includes('so tai khoan') || normalizedMessage.includes('mat khau') || normalizedMessage.includes('the tin dung') ||
            normalizedMessage.includes('thong tin noi bo') || normalizedMessage.includes('khach hang khac') || normalizedMessage.includes('cvv') || normalizedMessage.includes('pin') ||
            normalizedMessage.includes('lap trinh') || normalizedMessage.includes('javascript') || normalizedMessage.includes('python') || normalizedMessage.includes('java') ||
            normalizedMessage.includes('suc khoe') || normalizedMessage.includes('y te') || normalizedMessage.includes('giao duc') ||
            normalizedMessage.includes('chinh tri') || normalizedMessage.includes('chinh phu')) {
            
            try {
                // Thử lấy dữ liệu thật trước
                const smartResponse = await generateSmartTourResponse(userMessage, sessionId);
                if (smartResponse && typeof smartResponse === 'string' && smartResponse.length > 100) {
                    // Lưu vào history
                    await saveMessageToHistory(sessionId, 'user', message.trim());
                    await saveMessageToHistory(sessionId, 'assistant', smartResponse);

                    return {
                        success: true,
                        reply: smartResponse,
                        sessionId: sessionId,
                        timestamp: new Date().toISOString(),
                        isRealData: true
                    };
                }
                // Nếu smartResponse = null hoặc quá ngắn → tiếp tục gọi Gemini
            } catch (error) {
                console.log('Smart response failed, falling back to Gemini:', error.message);
                // Tiếp tục gọi Gemini
            }
        }

        // Xây dựng context với lịch sử hội thoại và dữ liệu tour
        const contextualMessage = await buildConversationContext(sessionId, message.trim());

        // Khởi tạo model với timeout
        const model = genAI.getGenerativeModel(MODEL_CONFIG);

        // Gửi request đến Gemini với timeout
        const result = await Promise.race([
            model.generateContent(contextualMessage),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 15000) // 15s timeout
            )
        ]);
        
        const response = await result.response;
        const aiReply = response.text();

        // Validate response
        if (!aiReply || aiReply.trim().length === 0) {
            throw new Error('Gemini trả về response rỗng');
        }

        // Lưu tin nhắn vào lịch sử
        await saveMessageToHistory(sessionId, 'user', message.trim());
        await saveMessageToHistory(sessionId, 'assistant', aiReply);

        // Record success for circuit breaker
        recordSuccess();

        const duration = Date.now() - startTime;
        logger.performance('askGemini - Gemini API', duration, {
            messageLength: message.length,
            replyLength: aiReply.length,
            sessionId: sessionId?.substring(0, 20) + '...'
        });

        // Update metrics
        updateMetrics(true, duration);

        return {
            success: true,
            reply: aiReply,
            sessionId: sessionId,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Gemini API error', error);
        logger.performance('askGemini - Error', duration, {
            messageLength: message?.length,
            sessionId: sessionId?.substring(0, 20) + '...',
            errorType: error.name
        });

        // Record failure for circuit breaker
        recordFailure();
        
        // Update metrics
        updateMetrics(false, duration);

        // Tạo session ID nếu chưa có (trong trường hợp lỗi)
        if (!sessionId) {
            sessionId = generateSessionId();
        }

        // Tạo chatbot backup thông minh khi Gemini API gặp lỗi
        const userMessage = message.trim().toLowerCase();
        let smartResponse;
        
        try {
            smartResponse = await generateSmartTourResponse(userMessage, sessionId);
        } catch (backupError) {
            console.error('Backup response error:', backupError);
            smartResponse = generateFallbackResponse(error);
        }

        // Lưu vào history để duy trì cuộc trò chuyện
        await saveMessageToHistory(sessionId, 'user', message.trim());
        await saveMessageToHistory(sessionId, 'assistant', smartResponse);

        return {
            success: true,
            reply: smartResponse,
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
            isBackupResponse: true,
            originalError: error.message
        };
    }
}

/**
 * Tạo phản hồi thông minh với dữ liệu tour thực từ database
 */
async function generateSmartTourResponse(userMessage, sessionId) {
    const startTime = Date.now();
    const message = userMessage.toLowerCase().trim();
    const normalized = normalizeText(message);
    const containsAny = (text, patterns) => patterns.some(p => text.includes(p));
    
    try {
        logger.chatbot('Generating smart tour response', {
            messageLength: message.length,
            sessionId: sessionId?.substring(0, 20) + '...'
        });

        // Import models để truy vấn dữ liệu thực
        const Tour = require('../models/tourModel');
        const TourDetail = require('../models/tourDetailModel');
        
        // Set mongoose timeout ngắn để tránh blocking
        const mongoose = require('mongoose');
        // Không set timeout ở đây vì có thể gây lỗi
        
        // Kiểm tra câu hỏi nhạy cảm trước (có dấu và không dấu)
        const sensitivePatterns = [
            // Tài chính
            'số tài khoản','account number','thẻ tín dụng','credit card','mật khẩu','password','pin','cvv',
            'số thẻ','mã bảo mật','mã xác thực','thông tin thanh toán','tài khoản ngân hàng',
            'stk','mk','otp','bank','so the','ma bao mat','ma xac thuc','thong tin thanh toan',
            'tai khoan ngan hang','so tai khoan ngan hang','the tin dung','mat khau',
            
            // Khách hàng khác
            'khách hàng khác','other customer','thông tin người khác','dữ liệu khách hàng khác',
            'thông tin cá nhân người khác','khach hang khac','thong tin nguoi khac',
            'du lieu khach hang khac','thong tin ca nhan nguoi khac',
            
            // Nội bộ
            'thông tin nội bộ','internal information','bí mật','confidential','thông tin công ty',
            'dữ liệu nội bộ','bí mật kinh doanh','thong tin noi bo','thong tin cong ty',
            'du lieu noi bo','bi mat kinh doanh','bi mat',
            
            // Bảo mật - Mở rộng
            'hack','crack','virus','malware','tấn công','xâm nhập','spam','abuse',
            'hack hệ thống','hack he thong','hack website','hack website','hack database',
            'hack server','hack server','hack mạng','hack mang','hack wifi',
            'hack facebook','hack facebook','hack instagram','hack instagram',
            'hack tiktok','hack tiktok','hack zalo','hack zalo',
            'tan cong','xam nhap','tan cong he thong','xam nhap he thong',
            'tan cong website','xam nhap website','tan cong database','xam nhap database',
            'tan cong server','xam nhap server','tan cong mang','xam nhap mang',
            'tan cong wifi','xam nhap wifi','tan cong facebook','xam nhap facebook',
            'tan cong instagram','xam nhap instagram','tan cong tiktok','xam nhap tiktok',
            'tan cong zalo','xam nhap zalo'
        ];
        
        if (containsAny(message, sensitivePatterns) || containsAny(normalized, sensitivePatterns)) {
            updateMetrics(true, 0, 'sensitive');
            return await handleSensitiveQuestion(message, sessionId);
        }
        
        // Kiểm tra câu hỏi ngoài phạm vi (có dấu và không dấu)
        const outOfScopePatterns = [
            // Công nghệ
            'lập trình','programming','code','javascript','python','java','html','css',
            'crypto','coin','bitcoin','blockchain','chứng khoán','đầu tư','casino','cược',
            'gambling','AI code','machine learning','lap trinh','crypto','coin','bitcoin',
            'chung khoan','dau tu','casino','cuoc','gambling','ai code','machine learning',
            
            // Y tế - Mở rộng
            'bệnh','sức khỏe','thuốc','bác sĩ','y tế','chẩn đoán','benh','suc khoe',
            'thuoc','bac si','y te','chan doan','bị bệnh','bi benh','cần uống thuốc',
            'can uong thuoc','uống thuốc gì','uong thuoc gi','bệnh gì','benh gi',
            'cần uống','can uong','thuốc gì','thuoc gi','bác sĩ khám','bac si kham',
            'khám bệnh','kham benh','chữa bệnh','chua benh','điều trị','dieu tri',
            'phòng khám','phong kham','bệnh viện','benh vien','sức khỏe','suc khoe',
            'khỏe mạnh','khoe manh','bệnh tật','benh tat','triệu chứng','trieu chung',
            'cách chữa','cach chua','phương pháp điều trị','phuong phap dieu tri',
            
            // Giáo dục - Mở rộng
            'học','giáo dục','trường','sinh viên','bài tập','thi cử','hoc','giao duc',
            'truong','sinh vien','bai tap','thi cu','cách học','cach hoc','học tiếng anh',
            'hoc tieng anh','học tiếng','hoc tieng','tiếng anh','tieng anh','học hiệu quả',
            'hoc hieu qua','cách học hiệu quả','cach hoc hieu qua','học tập','hoc tap',
            'giáo dục','giao duc','trường học','truong hoc','sinh viên','sinh vien',
            'học sinh','hoc sinh','giáo viên','giao vien','thầy cô','thay co',
            'bài tập','bai tap','thi cử','thi cu','kiểm tra','kiem tra','đề thi','de thi',
            'học phí','hoc phi','tuyển sinh','tuyen sinh','đại học','dai hoc',
            'cao đẳng','cao dang','trung học','trung hoc','tiểu học','tieu hoc',
            
            // Tài chính - Mở rộng
            'đầu tư','dau tu','chứng khoán','chung khoan','cổ phiếu','co phieu',
            'trái phiếu','trai phieu','quỹ đầu tư','quy dau tu','cách đầu tư',
            'cach dau tu','đầu tư chứng khoán','dau tu chung khoan','đầu tư cổ phiếu',
            'dau tu co phieu','đầu tư trái phiếu','dau tu trai phieu','đầu tư quỹ',
            'dau tu quy','đầu tư bất động sản','dau tu bat dong san','đầu tư vàng',
            'dau tu vang','đầu tư ngoại tệ','dau tu ngoai te','đầu tư tiền điện tử',
            'dau tu tien dien tu','đầu tư crypto','dau tu crypto','đầu tư bitcoin',
            'dau tu bitcoin','đầu tư ethereum','dau tu ethereum','đầu tư altcoin',
            'dau tu altcoin','đầu tư forex','dau tu forex','đầu tư hàng hóa',
            'dau tu hang hoa','đầu tư năng lượng','dau tu nang luong','đầu tư công nghệ',
            'dau tu cong nghe','đầu tư y tế','dau tu y te','đầu tư giáo dục',
            'dau tu giao duc','đầu tư du lịch','dau tu du lich','đầu tư bán lẻ',
            'dau tu ban le','đầu tư sản xuất','dau tu san xuat','đầu tư dịch vụ',
            'dau tu dich vu','đầu tư tài chính','dau tu tai chinh','đầu tư ngân hàng',
            'dau tu ngan hang','đầu tư bảo hiểm','dau tu bao hiem','đầu tư bất động sản',
            'dau tu bat dong san','đầu tư thương mại','dau tu thuong mai','đầu tư công nghiệp',
            'dau tu cong nghiep','đầu tư nông nghiệp','dau tu nong nghiep','đầu tư lâm nghiệp',
            'dau tu lam nghiep','đầu tư thủy sản','dau tu thuy san','đầu tư chăn nuôi',
            'dau tu chan nuoi','đầu tư trồng trọt','dau tu trong trot','đầu tư chế biến',
            'dau tu che bien','đầu tư xuất khẩu','dau tu xuat khau','đầu tư nhập khẩu',
            'dau tu nhap khau','đầu tư thương mại','dau tu thuong mai','đầu tư dịch vụ',
            'dau tu dich vu','đầu tư vận tải','dau tu van tai','đầu tư logistics',
            'dau tu logistics','đầu tư kho bãi','dau tu kho bai','đầu tư cảng biển',
            'dau tu cang bien','đầu tư sân bay','dau tu san bay','đầu tư đường bộ',
            'dau tu duong bo','đầu tư đường sắt','dau tu duong sat','đầu tư đường thủy',
            'dau tu duong thuy','đầu tư đường hàng không','dau tu duong hang khong',
            'đầu tư viễn thông','dau tu vien thong','đầu tư internet','dau tu internet',
            'đầu tư di động','dau tu di dong','đầu tư cố định','dau tu co dinh',
            'đầu tư di động','dau tu di dong','đầu tư cố định','dau tu co dinh',
            
            // Chính trị
            'chính trị','politics','chính phủ','government','bầu cử','đảng phái',
            'chinh tri','chinh phu','bau cu','dang phai'
        ];
        
        // Kiểm tra ngữ cảnh du lịch TRƯỚC KHI reject out-of-scope
        const travelContext = [
            'tour', 'đặt tour', 'dat tour', 'book', 'booking', 'đặt', 'dat',
            'xem tour', 'tham khảo tour', 'tham khao tour', 'quan tâm tour', 'quan tam tour',
            'muốn đi', 'muon di', 'du lịch', 'du lich', 'phú quốc', 'phu quoc',
            'nha trang', 'sapa', 'hạ long', 'ha long', 'đà nẵng', 'da nang',
            'giá tour', 'gia tour', 'ngày khởi hành', 'ngay khoi hanh', 'lịch trình', 'lich trinh'
        ];

        const hasTravelContext = travelContext.some(keyword =>
            message.toLowerCase().includes(keyword.toLowerCase()) ||
            normalized.includes(keyword.toLowerCase())
        );

        // Chỉ reject nếu KHÔNG có ngữ cảnh du lịch
        if (!hasTravelContext && (containsAny(message, outOfScopePatterns) || containsAny(normalized, outOfScopePatterns))) {
            updateMetrics(true, 0, 'outOfScope');
            return await handleOutOfScopeQuestion(message, sessionId);
        }

        // 🎯 XỬ LÝ CÂU HỎI VỀ NGÀY KHỞI HÀNH (ƯU TIÊN CAO NHẤT)
        const departurePatterns = [
            'ngày khởi hành', 'ngay khoi hanh', 'khởi hành ngày', 'khoi hanh ngay',
            'ngày nào khởi hành', 'ngay nao khoi hanh', 'khởi hành bao giờ', 'khoi hanh bao gio',
            'lịch khởi hành', 'lich khoi hanh', 'bao giờ khởi hành', 'bao gio khoi hanh',
            'khi nào khởi hành', 'khi nao khoi hanh', 'khởi hành khi nào', 'khoi hanh khi nao'
        ];

        const isAskingDeparture = departurePatterns.some(pattern =>
            message.toLowerCase().includes(pattern.toLowerCase())
        );

        if (isAskingDeparture) {
            const result = await handleDepartureScheduleQuestion(message, sessionId);
            if (result && result.reply) {
                await saveMessageToHistory(sessionId, 'user', message.trim());
                await saveMessageToHistory(sessionId, 'assistant', result.reply);
                return result;
            }
        }

        // 🎯 XỬ LÝ CÂU HỎI VỀ TOUR CỤ THỂ (tham khảo, xem chi tiết, muốn đi tour này...)
        const tourInterestPatterns = [
            'tham khảo tour', 'tham khao tour', 'xem tour', 'cho tôi tham khảo',
            'cho toi tham khao', 'muốn xem tour', 'muon xem tour', 'quan tâm tour',
            'quan tam tour', 'tour này', 'tour nay', 'tour đó', 'tour do',
            'tôi muốn tour', 'toi muon tour', 'cho tôi tour', 'cho toi tour'
        ];

        const isAskingAboutTour = tourInterestPatterns.some(pattern =>
            message.toLowerCase().includes(pattern.toLowerCase())
        );

        if (isAskingAboutTour) {
            // Tìm tour từ lịch sử hội thoại
            const history = await getConversationHistory(sessionId);
            let tourSlug = null;
            let tourName = null;

            // Tìm tour gần nhất trong lịch sử
            for (let i = history.length - 1; i >= Math.max(0, history.length - 5); i--) {
                const msg = history[i];

                // Tìm slug trong URL
                if (msg.content.includes('localhost:5173/tour/')) {
                    const slugMatch = msg.content.match(/localhost:5173\/tour\/([\w-]+)/);
                    if (slugMatch) {
                        tourSlug = slugMatch[1];
                        break;
                    }
                }

                // Tìm tên tour
                const tourMatch = msg.content.match(/Tour\s+([^(]+?)(?:\s+\(|$)/i);
                if (tourMatch) {
                    tourName = tourMatch[1].trim();
                }
            }

            if (tourSlug) {
                const Tour = require('../models/tourModel');
                const tour = await Tour.findOne({ slug: tourSlug }).lean();

                if (tour) {
                    let response = `📍 **${tour.title}**\n\n`;
                    response += `💰 **Giá**: ${formatPrice(tour.price)}\n`;
                    response += `⏱️ **Thời gian**: ${tour.numberOfDay} ngày ${tour.numberOfDay - 1} đêm\n`;
                    if (tour.rating > 0) {
                        response += `⭐ **Đánh giá**: ${tour.rating}/5 (${tour.reviews || 0} đánh giá)\n`;
                    }
                    response += `\n📋 **Điểm nổi bật**:\n`;
                    if (tour.itinerary && tour.itinerary.length > 0) {
                        tour.itinerary.slice(0, 3).forEach((day, index) => {
                            response += `• Ngày ${day.day}: ${day.title}\n`;
                        });
                        if (tour.itinerary.length > 3) {
                            response += `• Và ${tour.itinerary.length - 3} ngày khác...\n`;
                        }
                    }
                    response += `\n🔗 **Xem chi tiết & Đặt tour**: http://localhost:5173/tour/${tour.slug}\n`;
                    response += `📞 **Hotline tư vấn**: 0972 122 555\n\n`;
                    response += `Bạn muốn biết thêm về lịch khởi hành, giá chi tiết hay có thắc mắc gì không?`;

                    return { success: true, reply: response, sessionId, timestamp: new Date().toISOString() };
                }
            }
        }

        // 🎯 XỬ LÝ TỪ KHÓA SỞ THÍCH TRƯỚC (BIỂN, NÚI, CITY) - ƯU TIÊN CAO
        // Khi khách nói "đi biển", "đi núi" → Gợi ý tour NGAY, không hỏi lại
        if (message.includes('biển') || message.includes('bien') || message.includes('beach')) {
            const Tour = require('../models/tourModel');
            const beachTours = await Tour.find({
                $or: [
                    { title: /phú quốc|nha trang|vũng tàu|đà nẵng|hội an|côn đảo|phú yên/i },
                    { attractions: /biển|beach|bãi tắm|đảo/i }
                ],
                status: true,
                deleted: false
            }).populate('departure destination').limit(5).lean();

            if (beachTours.length > 0) {
                let response = `🏖️ **Chúng tôi có ${beachTours.length} tour biển tuyệt vời cho bạn**:\n\n`;

                beachTours.forEach((tour, index) => {
                    response += `**${index + 1}. ${tour.title}**\n`;
                    response += `💰 **Giá**: ${formatPrice(tour.price)}\n`;
                    response += `⏱️ **Thời gian**: ${tour.numberOfDay} ngày ${tour.numberOfDay - 1} đêm\n`;
                    if (tour.rating > 0) {
                        response += `⭐ **Đánh giá**: ${tour.rating}/5\n`;
                    }
                    response += `🔗 **Xem chi tiết**: http://localhost:5173/tour/${tour.slug}\n\n`;
                });

                response += `📞 **Hotline tư vấn**: 0972 122 555\n`;
                response += `Bạn quan tâm tour nào nhất? Hoặc cho tôi biết ngân sách của bạn để tư vấn phù hợp hơn.`;

                return { success: true, reply: response, sessionId, timestamp: new Date().toISOString() };
            }
        }

        if (message.includes('núi') || message.includes('nui') || message.includes('mountain') ||
            message.includes('leo núi') || message.includes('trekking')) {
            const Tour = require('../models/tourModel');
            const mountainTours = await Tour.find({
                $or: [
                    { title: /sapa|hà giang|mù cang chải|fansipan|tam đảo|ba vì|đà lạt|cao nguyên/i },
                    { attractions: /núi|mountain|leo núi|đỉnh|trekking|thác/i }
                ],
                status: true,
                deleted: false
            }).populate('departure destination').limit(5).lean();

            if (mountainTours.length > 0) {
                let response = `⛰️ **Chúng tôi có ${mountainTours.length} tour núi phù hợp cho bạn**:\n\n`;

                mountainTours.forEach((tour, index) => {
                    response += `**${index + 1}. ${tour.title}**\n`;
                    response += `💰 **Giá**: ${formatPrice(tour.price)}\n`;
                    response += `⏱️ **Thời gian**: ${tour.numberOfDay} ngày ${tour.numberOfDay - 1} đêm\n`;
                    if (tour.rating > 0) {
                        response += `⭐ **Đánh giá**: ${tour.rating}/5\n`;
                    }
                    response += `🔗 **Xem chi tiết**: http://localhost:5173/tour/${tour.slug}\n\n`;
                });

                response += `📞 **Hotline tư vấn**: 0972 122 555\n`;
                response += `Bạn thích tour nào? Hoặc cho tôi biết ngân sách để tư vấn chi tiết hơn.`;

                return { success: true, reply: response, sessionId, timestamp: new Date().toISOString() };
            }
        }

        if (message.includes('city') || message.includes('thành phố') || message.includes('thanh pho') ||
            message.includes('phố cổ') || message.includes('pho co')) {
            const Tour = require('../models/tourModel');
            const cityTours = await Tour.find({
                $or: [
                    { title: /hà nội|sài gòn|đà nẵng|huế|hội an|seoul|tokyo|bangkok|singapore/i },
                    { attractions: /phố cổ|chùa|đền|museum|công viên|khu phố|shopping/i }
                ],
                status: true,
                deleted: false
            }).populate('departure destination').limit(5).lean();

            if (cityTours.length > 0) {
                let response = `🏙️ **Chúng tôi có ${cityTours.length} tour thành phố cho bạn**:\n\n`;

                cityTours.forEach((tour, index) => {
                    response += `**${index + 1}. ${tour.title}**\n`;
                    response += `💰 **Giá**: ${formatPrice(tour.price)}\n`;
                    response += `⏱️ **Thời gian**: ${tour.numberOfDay} ngày ${tour.numberOfDay - 1} đêm\n`;
                    if (tour.rating > 0) {
                        response += `⭐ **Đánh giá**: ${tour.rating}/5\n`;
                    }
                    response += `🔗 **Xem chi tiết**: http://localhost:5173/tour/${tour.slug}\n\n`;
                });

                response += `📞 **Hotline tư vấn**: 0972 122 555\n`;
                response += `Tour nào bạn thích? Hoặc cho biết thêm về ngân sách nhé.`;

                return { success: true, reply: response, sessionId, timestamp: new Date().toISOString() };
            }
        }

        // Phân loại câu hỏi cụ thể
        if (message.includes('ngày') || message.includes('lịch') || message.includes('thời gian') || 
            message.includes('khởi hành') || message.includes('kết thúc') || message.includes('bao lâu') ||
            message.includes('khi nào') || message.includes('mấy ngày') || message.includes('lịch trình') ||
            message.includes('giờ khởi hành') || message.includes('mấy giờ') || message.includes('xuất phát') ||
            message.includes('giờ bắt đầu') || message.includes('thời điểm khởi hành') ||
            message.includes('khuyến mãi') || message.includes('giảm giá') || message.includes('promotion') ||
            message.includes('vận chuyển') || message.includes('phương tiện') || message.includes('xe') ||
            message.includes('tài xế') || message.includes('hướng dẫn viên') || message.includes('hdv') ||
            message.includes('thông tin khách hàng') || message.includes('bảo mật') || message.includes('privacy') ||
            message.includes('dữ liệu cá nhân') || message.includes('thông tin cá nhân') || message.includes('personal data')) {
            
            // Phân biệt loại câu hỏi
            if (message.includes('thông tin khách hàng') || message.includes('bảo mật') || message.includes('privacy') ||
                message.includes('dữ liệu cá nhân') || message.includes('thông tin cá nhân') || message.includes('personal data')) {
                // Câu hỏi về bảo mật thông tin
                return await handlePrivacyQuestion(message, sessionId);
            } else if (message.includes('khuyến mãi') || message.includes('giảm giá') || message.includes('promotion')) {
                // Câu hỏi về khuyến mãi
                return await handlePromotionQuestion(message, sessionId);
            } else if (message.includes('vận chuyển') || message.includes('phương tiện') || message.includes('xe') ||
                message.includes('tài xế') || message.includes('hướng dẫn viên') || message.includes('hdv')) {
                // Câu hỏi về vận chuyển
                return await handleTransportationQuestion(message, sessionId);
            } else if (message.includes('giờ khởi hành') || message.includes('mấy giờ') || message.includes('xuất phát') ||
                message.includes('giờ bắt đầu') || message.includes('thời điểm khởi hành')) {
                // Câu hỏi về giờ khởi hành cụ thể
                return await handleDepartureTimeQuestion(message, sessionId);
            } else if (message.includes('khởi hành') || message.includes('khi nào') || message.includes('ngày')) {
                // Câu hỏi về lịch khởi hành - chỉ trả lời ngày khởi hành
                return await handleDepartureScheduleQuestion(message, sessionId);
            } else if (message.includes('lịch trình') || message.includes('bao lâu') || message.includes('mấy ngày')) {
                // Câu hỏi về lịch trình chi tiết - chỉ trả lời lịch trình
                return await handleItineraryQuestion(message, sessionId);
            } else {
                // Câu hỏi chung về thời gian
                return await handleGeneralScheduleQuestion(message, sessionId);
            }
        }
        
        // Phát hiện điểm đến Phú Quốc
        if (message.includes('phú quốc') || message.includes('phu quoc')) {
            const phuQuocTours = await Tour.find({
                $or: [
                    { title: /phú quốc/i },
                    { attractions: /phú quốc/i }
                ],
                status: true,
                deleted: false
            }).populate('departure destination').limit(3).lean();
            
            return await generateDestinationResponse('Phú Quốc', phuQuocTours, '🏝️');
        }
        
        // Phát hiện Hạ Long
        if (message.includes('hạ long') || message.includes('ha long')) {
            const haLongTours = await Tour.find({
                $or: [
                    { title: /hạ long/i },
                    { attractions: /hạ long/i }
                ],
                status: true,
                deleted: false
            }).populate('departure destination').limit(3).lean();
            
            return await generateDestinationResponse('Hạ Long', haLongTours, '🚢');
        }
        
        // Phát hiện Sapa
        if (message.includes('sapa') || message.includes('sa pa')) {
            const sapaTours = await Tour.find({
                $or: [
                    { title: /sapa/i },
                    { attractions: /sapa/i }
                ],
                status: true,
                deleted: false
            }).populate('departure destination').limit(3).lean();
            
            return await generateDestinationResponse('Sapa', sapaTours, '🏔️');
        }
        
        // Phát hiện câu hỏi về giá/chi phí
        if (message.includes('giá') || message.includes('bao nhiêu tiền') || message.includes('chi phí')) {
        // Tìm tour từ conversation 
        const history = await getConversationHistory(sessionId);
            for (let i = history.length - 1; i >= 0; i--) {
                const msg = history[i];
                if (msg.content.includes('tour-')) {
                    const slugMatch = msg.content.match(/tour-([\w-]+)/);
                    if (slugMatch) {
                        const tour = await Tour.findOne({ slug: slugMatch[0] })
                            .populate('departure destination')
                            .lean();
                        if (tour) {
                            return await generatePriceDetailResponse(tour);
                        }
                    }
                }
            }
        }
        
        // Phát hiện ngân sách
        if (message.includes('triệu') || message.includes('tr ') || message.includes('ngân sách')) {
            const budget = extractBudget(message);
            if (budget) {
                const toursInBudget = await Tour.find({
                    $or: [
                        { price: { $lte: budget * 1000000 } },
                        { minPrice: { $lte: budget * 1000000 } }
                    ],
                    status: true,
                    deleted: false
                }).populate('departure destination').limit(5).lean();
                
                return generateBudgetResponse(budget, toursInBudget);
            }
        }
        
        // Phát hiện câu hỏi về tour nổi bật
        if (message.includes('nổi bật') || message.includes('featured') || message.includes('hot') || 
            message.includes('bán chạy') || message.includes('được yêu thích') || message.includes('khuyến nghị')) {
            const featuredTours = await Tour.find({
                status: true,
                deleted: false,
                highlight: true
            }).sort({ createdAt: -1 })
              .limit(5)
              .populate('departure destination')
              .lean();
            
            return generateFeaturedToursResponse(featuredTours);
        }
        
        // Phát hiện câu hỏi về review/đánh giá
        if (message.includes('đánh giá') || message.includes('review') || message.includes('nhận xét')) {
            const Review = require('../models/reviewModel');
            const topRatedTours = await Tour.find({
                status: true,
                deleted: false,
                averageRating: { $gte: 4 }
            }).sort({ averageRating: -1, totalReviews: -1 })
              .limit(3)
              .populate('departure destination')
              .lean();
            
            return generateReviewResponse(topRatedTours);
        }
        
        // Phát hiện câu hỏi về ẩm thực
        if (message.includes('ăn gì') || message.includes('ẩm thực') || message.includes('món ăn')) {
            const foodTours = await Tour.find({
                cuisine: { $exists: true, $ne: '' },
                status: true,
                deleted: false
            }).limit(3).populate('departure destination').lean();
            
            return generateFoodResponse(foodTours);
        }
        
        // Không match case nào → Trả về null để askGemini gọi Gemini API
        const duration = Date.now() - startTime;
        logger.performance('generateSmartTourResponse - No match, use Gemini', duration, {
            messageLength: message.length,
            sessionId: sessionId?.substring(0, 20) + '...'
        });
        return null; // Để flow tiếp tục gọi Gemini API xử lý
        
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Error in generateSmartTourResponse', error);
        logger.performance('generateSmartTourResponse - Error', duration, {
            messageLength: message.length,
            sessionId: sessionId?.substring(0, 20) + '...',
            errorType: error.name
        });
        return null; // Để flow tiếp tục gọi Gemini API xử lý
    }
}

/**
 * Tạo response cho lịch trình tour cụ thể với dữ liệu thật
 */
function generateDetailedScheduleResponse(scheduleData) {
    const { tour, schedules } = scheduleData;
    
    let response = `📅 **Lịch trình ${tour.title}**:

🚀 **Khởi hành**: ${tour.departure?.name || 'Theo yêu cầu'}
🎯 **Điểm đến**: ${tour.destination?.name || tour.title}
📊 **Tổng lịch**: ${scheduleData.totalSchedules} lịch, ${scheduleData.upcomingSchedules} lịch sắp tới

`;

    // Lịch khởi hành chi tiết
    if (schedules && schedules.length > 0) {
        response += `📋 **Lịch khởi hành sắp tới**:\n\n`;
        schedules.forEach((schedule, index) => {
            const startDate = new Date(schedule.dayStart);
            const endDate = new Date(schedule.dayReturn);
            const options = { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'numeric', 
                day: 'numeric' 
            };
            
            response += `**${index + 1}. ${startDate.toLocaleDateString('vi-VN', options)}** → **${endDate.toLocaleDateString('vi-VN', options)}**\n`;
            response += `⏱️ **Thời gian**: ${schedule.duration}\n`;
            response += `💵 **Giá người lớn**: ${schedule.finalPrices.adult.toLocaleString('vi-VN')}đ`;
            
            // Hiển thị giảm giá nếu có
            if (schedule.discounts.adult || schedule.discounts.general) {
                const discount = schedule.discounts.adult || schedule.discounts.general;
                response += ` (giảm ${discount}%)`;
            }
            
            response += `\n📊 **Còn ${schedule.stock} chỗ**\n`;
            
            // Hiển thị giá trẻ em nếu khác 0
            if (schedule.finalPrices.children > 0) {
                response += `👶 **Giá trẻ em**: ${schedule.finalPrices.children.toLocaleString('vi-VN')}đ\n`;
            }
            
            response += `\n`;
        });
        
        if (schedules.length < scheduleData.upcomingSchedules) {
            response += `• Và ${scheduleData.upcomingSchedules - schedules.length} lịch khác...\n\n`;
        }
    } else {
        response += `⚠️ **Hiện tại chưa có lịch khởi hành sắp tới**\n\n`;
    }
    
    // Thêm lịch trình chi tiết nếu có
    if (tour.itinerary && tour.itinerary.length > 0) {
        response += `🗓️ **Lịch trình chi tiết**:\n`;
        tour.itinerary.slice(0, 3).forEach((day, index) => {
            response += `**Ngày ${day.day}**: ${day.title}\n`;
            if (day.details) {
                // Strip HTML tags và format lại
                const cleanDetails = stripHtmlTags(day.details);
                const formattedDetails = formatItineraryDetails(cleanDetails);
                response += formattedDetails;
            }
        });
        
        if (tour.itinerary.length > 3) {
            response += `• Và ${tour.itinerary.length - 3} ngày khác...\n`;
        }
        response += `\n`;
    }
    
    response += `**Xem chi tiết & Đặt tour**: 
http://localhost:5173/tour/${tour.slug}

📞 **Hotline tư vấn**: 0972 122 555

Bạn muốn đặt tour **ngày nào** hoặc cần tư vấn thêm?`;

    return response;
}

/**
 * Xử lý câu hỏi về lịch khởi hành - chỉ trả lời ngày khởi hành
 */
async function handleDepartureScheduleQuestion(message, sessionId) {
    try {
        const Tour = require('../models/tourModel');
        const TourDetail = require('../models/tourDetailModel');

        // Tìm tour từ câu hỏi hoặc context
        const tour = await findTourFromMessage(message, sessionId);
        
        if (tour) {
            // Lấy lịch khởi hành của tour
            const tourDetails = await TourDetail.find({
                tourId: tour._id,
                dayStart: { $gte: new Date() }
            })
            .sort({ dayStart: 1 })
            .limit(5)
            .lean();

            if (tourDetails.length > 0) {
                let response = `📅 **Lịch khởi hành ${tour.title}**:

`;
                
                tourDetails.forEach((detail, index) => {
                    const startDate = new Date(detail.dayStart);
                    const endDate = new Date(detail.dayReturn);
                    const options = {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric'
                    };

                    // Tính giá sau giảm (nếu có)
                    let finalPrice = detail.adultPrice;
                    let discountPercent = detail.discountAdultPercent || detail.discount || 0;
                    if (discountPercent > 0) {
                        finalPrice = detail.adultPrice * (1 - discountPercent / 100);
                    }

                    response += `**${index + 1}. ${startDate.toLocaleDateString('vi-VN', options)}** → **${endDate.toLocaleDateString('vi-VN', options)}**\n`;
                    if (detail.startTime) {
                        response += `🕐 **Giờ khởi hành**: ${detail.startTime}\n`;
                    }
                    response += `⏱️ **Thời gian**: ${calculateDuration(detail.dayStart, detail.dayReturn)}\n`;
                    response += `💰 **Giá**: ${formatPrice(finalPrice)}`;
                    if (discountPercent > 0) {
                        response += ` (giảm ${discountPercent}% từ ${formatPrice(detail.adultPrice)})`;
                    }
                    response += `\n`;
                    response += `📊 **Còn ${detail.stock} chỗ**\n\n`;
                });
                
                response += `📞 **Hotline**: 0972 122 555 để đặt tour
🌐 **Xem chi tiết**: http://localhost:5173/tour/${tour.slug}`;

                return {
                    success: true,
                    reply: response,
                    sessionId,
                    timestamp: new Date().toISOString()
                };
            }
        }

        // Fallback: Không tìm thấy tour → Gợi ý tour phổ biến có lịch khởi hành
        // Tour và TourDetail đã được require ở trên

        // Tìm các tour có lịch khởi hành sắp tới
        const upcomingSchedules = await TourDetail.find({
            dayStart: { $gte: new Date() }
        })
        .sort({ dayStart: 1 })
        .limit(10)
        .lean();

        if (upcomingSchedules.length > 0) {
            // Nhóm theo tourId
            const tourIds = [...new Set(upcomingSchedules.map(s => s.tourId.toString()))].slice(0, 3);
            const tours = await Tour.find({ _id: { $in: tourIds } }).lean();

            let response = `📅 **Lịch khởi hành tour sắp tới**:\n\n`;

            for (const tour of tours) {
                const tourSchedules = upcomingSchedules.filter(s => s.tourId.toString() === tour._id.toString()).slice(0, 2);

                response += `🌟 **${tour.title}**\n`;
                tourSchedules.forEach((schedule, idx) => {
                    const startDate = new Date(schedule.dayStart);
                    response += `• ${startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${formatPrice(schedule.adultPrice)} - Còn ${schedule.stock} chỗ\n`;
                });
                response += `🔗 http://localhost:5173/tour/${tour.slug}\n\n`;
            }

            response += `📞 **Hotline**: 0972 122 555\nBạn quan tâm tour nào?`;

            return {
                success: true,
                reply: response,
                sessionId,
                timestamp: new Date().toISOString()
            };
        }

        // Fallback cuối: Không có lịch khởi hành
        const fallbackResponse = `📅 **Lịch khởi hành tour NDTravel**:

Để biết lịch khởi hành chi tiết, bạn có thể:
• Xem danh sách tour tại: http://localhost:5173
• Gọi hotline: 0972 122 555
• Hoặc cho tôi biết bạn muốn đi đâu (biển, núi, city...)?`;

        return {
            success: true,
            reply: fallbackResponse,
            sessionId,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error handling departure schedule question:', error);
        return generateFallbackResponse(error);
    }
}

/**
 * Xử lý câu hỏi về giờ khởi hành cụ thể
 */
async function handleDepartureTimeQuestion(message, sessionId) {
    try {
        const Tour = require('../models/tourModel');
        const TourDetail = require('../models/tourDetailModel');
        
        // Tìm tour từ câu hỏi hoặc context
        const tour = await findTourFromMessage(message, sessionId);
        
        if (tour) {
            // Lấy lịch khởi hành với giờ cụ thể
            const tourDetails = await TourDetail.find({
                tourId: tour._id,
                dayStart: { $gte: new Date() },
                startTime: { $exists: true, $ne: null, $ne: '' }
            })
            .sort({ dayStart: 1 })
            .limit(5)
            .lean();
            
            if (tourDetails.length > 0) {
                let response = `🕐 **Giờ khởi hành ${tour.title}**:

`;
                
                tourDetails.forEach((detail, index) => {
                    const startDate = new Date(detail.dayStart);
                    const options = { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'numeric', 
                        day: 'numeric' 
                    };
                    
                    response += `**${index + 1}. ${startDate.toLocaleDateString('vi-VN', options)}**\n`;
                    response += `🕐 **Giờ khởi hành**: ${detail.startTime}\n`;
                    response += `⏱️ **Thời gian**: ${calculateDuration(detail.dayStart, detail.dayReturn)}\n`;
                    response += `📊 **Còn ${detail.stock} chỗ**\n\n`;
                });
                
                response += `📞 **Hotline**: 0972 122 555 để đặt tour
🌐 **Xem chi tiết**: http://localhost:5173/tour/${tour.slug}`;
                
                return response;
            } else {
                // Nếu không có giờ khởi hành cụ thể, trả về thông tin chung
                return `🕐 **Giờ khởi hành ${tour.title}**:

Hiện tại chưa có thông tin giờ khởi hành cụ thể cho tour này. Thông thường các tour sẽ khởi hành vào:
• **Sáng**: 6:00 - 8:00
• **Chiều**: 13:00 - 15:00

📞 **Hotline**: 0972 122 555 để được thông báo giờ khởi hành chính xác
🌐 **Xem chi tiết**: http://localhost:5173/tour/${tour.slug}`;
            }
        }
        
        // Fallback nếu không tìm thấy tour cụ thể
        return `🕐 **Giờ khởi hành tour NDTravel**:

Thông thường các tour sẽ khởi hành vào:
• **Tour trong ngày**: 6:00 - 8:00 sáng
• **Tour nhiều ngày**: 7:00 - 9:00 sáng
• **Tour quốc tế**: Theo lịch máy bay

📞 **Hotline**: 0972 122 555 để được thông báo giờ khởi hành chính xác
🌐 **Website**: http://localhost:5173

Bạn quan tâm đến **tour nào** cụ thể để tôi cung cấp giờ khởi hành chính xác?`;
        
    } catch (error) {
        console.error('Error handling departure time question:', error);
        return generateFallbackResponse(error);
    }
}

/**
 * Xử lý câu hỏi về khuyến mãi và giảm giá
 */
async function handlePromotionQuestion(message, sessionId) {
    try {
        const Tour = require('../models/tourModel');
        const TourDetail = require('../models/tourDetailModel');
        
        // Tìm tour từ câu hỏi hoặc context
        const tour = await findTourFromMessage(message, sessionId);
        
        if (tour) {
            // Lấy thông tin khuyến mãi từ tour details
            const tourDetails = await TourDetail.find({
                tourId: tour._id,
                dayStart: { $gte: new Date() },
                $or: [
                    { discount: { $gt: 0 } },
                    { discountAdultPercent: { $gt: 0 } },
                    { discountChildrenPercent: { $gt: 0 } },
                    { discountChildPercent: { $gt: 0 } },
                    { discountBabyPercent: { $gt: 0 } }
                ]
            })
            .sort({ dayStart: 1 })
            .limit(3)
            .lean();
            
            if (tourDetails.length > 0) {
                let response = `🎁 **KHUYẾN MÃI ${tour.title}**:

`;
                
                tourDetails.forEach((detail, index) => {
                    const startDate = new Date(detail.dayStart);
                    const options = { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'numeric', 
                        day: 'numeric' 
                    };
                    
                    response += `**${index + 1}. ${startDate.toLocaleDateString('vi-VN', options)}**
`;
                    
                    // Tính toán giảm giá
                    const discount = detail.discount || 0;
                    const originalPrice = detail.adultPrice;
                    const discountAmount = Math.round((originalPrice * discount / 100) / 1000) * 1000;
                    const finalPrice = originalPrice - discountAmount;
                    
                    if (discount > 0) {
                        response += `💰 **Giá gốc**: ${formatPrice(originalPrice)}
`;
                        response += `🔥 **Giảm giá**: ${discount}% (Tiết kiệm ${formatPrice(discountAmount)})
`;
                        response += `✅ **Giá sau giảm**: ${formatPrice(finalPrice)}
`;
                    }
                    
                    response += `📊 **Còn ${detail.stock} chỗ**

`;
                });
                
                response += `📞 **Hotline**: 0972 122 555 để đặt ngay!
🌐 **Xem chi tiết**: http://localhost:5173/tour/${tour.slug}`;
                
                return response;
            } else {
                // Nếu không có khuyến mãi cụ thể
                return `🎁 **KHUYẾN MÃI ${tour.title}**:

Hiện tại tour này chưa có chương trình khuyến mãi đặc biệt. Tuy nhiên, chúng tôi thường có:
• **Giảm giá sớm** cho khách đặt trước
• **Ưu đãi nhóm** từ 10 người trở lên
• **Khuyến mãi mùa** theo từng thời điểm

📞 **Hotline**: 0972 122 555 để được tư vấn ưu đãi tốt nhất
🌐 **Xem chi tiết**: http://localhost:5173/tour/${tour.slug}`;
            }
        }
        
        // Fallback nếu không tìm thấy tour cụ thể
        return `🎁 **KHUYẾN MÃI TOUR NDTravel**:

Chúng tôi thường có các chương trình khuyến mãi:
• **Giảm giá sớm**: Đặt trước 30 ngày - giảm 5-10%
• **Ưu đãi nhóm**: Từ 10 người - giảm 15-20%
• **Khuyến mãi mùa**: Theo từng thời điểm trong năm
• **Combo tour**: Ghép nhiều tour - giảm 10-15%

📞 **Hotline**: 0972 122 555 để được tư vấn ưu đãi tốt nhất
🌐 **Website**: http://localhost:5173

Bạn quan tâm đến **tour nào** cụ thể để tôi kiểm tra khuyến mãi hiện tại?`;
        
    } catch (error) {
        console.error('Error handling promotion question:', error);
        return generateFallbackResponse(error);
    }
}

/**
 * Xử lý câu hỏi về vận chuyển
 */
async function handleTransportationQuestion(message, sessionId) {
    try {
        const Tour = require('../models/tourModel');
        const Transportation = require('../models/transportationModel');
        
        // Tìm tour từ câu hỏi hoặc context
        const tour = await findTourFromMessage(message, sessionId);
        
        if (tour) {
            // Populate phương tiện vận chuyển
            const tourWithTransport = await Tour.findById(tour._id)
                .populate('transportation')
                .lean();
            
            let response = `🚌 **PHƯƠNG TIỆN DI CHUYỂN ${tour.title}**:

`;
            
            if (tourWithTransport.transportation) {
                response += `🚗 **Phương tiện**: ${tourWithTransport.transportation.title}
`;
                if (tourWithTransport.transportation.information) {
                    response += `📋 **Chi tiết**: ${tourWithTransport.transportation.information}
`;
                }
            }
            
            if (tour.vehicleInfo) {
                response += `🚙 **Thông tin xe**: ${tour.vehicleInfo}
`;
            }
            
            // Thông tin mặc định về tài xế và HDV
            response += `👨‍✈️ **Tài xế**: Tài xế chuyên nghiệp, có kinh nghiệm
`;
            response += `👩‍🏫 **Hướng dẫn viên**: HDV tiếng Việt, am hiểu địa phương
`;
            response += `📍 **Lịch trình**: Di chuyển theo lịch trình tour đã định

`;
            
            response += `📞 **Hotline**: 0972 122 555 để biết thêm chi tiết
🌐 **Xem chi tiết**: http://localhost:5173/tour/${tour.slug}`;
            
            return response;
        }
        
        // Fallback nếu không tìm thấy tour cụ thể
        return `🚌 **PHƯƠNG TIỆN DI CHUYỂN TOUR NDTravel**:

Chúng tôi sử dụng:
• **Xe du lịch**: Xe 16-45 chỗ, đời mới, máy lạnh
• **Tài xế**: Chuyên nghiệp, có kinh nghiệm, an toàn
• **Hướng dẫn viên**: HDV tiếng Việt, am hiểu địa phương
• **Bảo hiểm**: Bảo hiểm du lịch đầy đủ

📞 **Hotline**: 0972 122 555 để biết thêm chi tiết
🌐 **Website**: http://localhost:5173

Bạn quan tâm đến **tour nào** cụ thể để tôi cung cấp phương tiện vận chuyển chi tiết?`;
        
    } catch (error) {
        console.error('Error handling transportation question:', error);
        return generateFallbackResponse(error);
    }
}

/**
 * Xử lý câu hỏi về bảo mật và quyền riêng tư
 */
async function handlePrivacyQuestion(message, sessionId) {
    try {
        const lowerMessage = message.toLowerCase();
        
        // Phát hiện loại câu hỏi bảo mật
        if (lowerMessage.includes('thông tin khách hàng') || lowerMessage.includes('dữ liệu khách hàng') ||
            lowerMessage.includes('thông tin cá nhân') || lowerMessage.includes('personal data')) {
            
            return `🔒 **BẢO MẬT THÔNG TIN KHÁCH HÀNG**:

Chúng tôi rất coi trọng việc bảo vệ thông tin cá nhân của khách hàng.

**📊 Thông tin chúng tôi thu thập:**
• Thông tin đặt tour (tên, SĐT, email)
• Thông tin thanh toán (được mã hóa an toàn)
• Lịch sử giao dịch

**🛡️ Cam kết bảo mật:**
• Không chia sẻ thông tin với bên thứ 3
• Mã hóa dữ liệu nhạy cảm
• Tuân thủ Luật An toàn thông tin
• Chỉ sử dụng cho mục đích phục vụ khách hàng

**📞 Liên hệ bảo mật:**
Hotline: 0972 122 555
Email: privacy@ndtravel.com

Bạn có thắc mắc gì về chính sách bảo mật không?`;
        }
        
        // Phát hiện câu hỏi về chính sách bảo mật
        if (lowerMessage.includes('chính sách bảo mật') || lowerMessage.includes('privacy policy') ||
            lowerMessage.includes('bảo vệ dữ liệu') || lowerMessage.includes('data protection')) {
            
            return `🛡️ **CHÍNH SÁCH BẢO MẬT NDTravel**:

**📋 Nguyên tắc bảo mật:**
• Thu thập tối thiểu thông tin cần thiết
• Mã hóa dữ liệu nhạy cảm
• Không bán thông tin khách hàng
• Tuân thủ quy định pháp luật

**🔐 Biện pháp bảo vệ:**
• SSL/TLS mã hóa kết nối
• Firewall bảo vệ server
• Backup dữ liệu định kỳ
• Kiểm tra bảo mật thường xuyên

**📞 Liên hệ bảo mật:**
Hotline: 0972 122 555
Email: privacy@ndtravel.com

Bạn cần hỗ trợ gì về bảo mật không?`;
        }
        
        // Phát hiện câu hỏi về xóa dữ liệu
        if (lowerMessage.includes('xóa dữ liệu') || lowerMessage.includes('delete data') ||
            lowerMessage.includes('xóa thông tin') || lowerMessage.includes('remove data')) {
            
            return `🗑️ **XÓA DỮ LIỆU CÁ NHÂN**:

Bạn có quyền yêu cầu xóa thông tin cá nhân theo quy định pháp luật.

**📝 Quy trình xóa dữ liệu:**
• Gửi yêu cầu qua email: privacy@ndtravel.com
• Cung cấp thông tin xác thực danh tính
• Xử lý trong vòng 30 ngày làm việc
• Xác nhận hoàn tất xóa dữ liệu

**⚠️ Lưu ý:**
• Một số dữ liệu cần lưu trữ theo quy định pháp luật
• Thông tin đã thanh toán có thể cần lưu trữ cho kế toán

**📞 Hỗ trợ:**
Hotline: 0972 122 555
Email: privacy@ndtravel.com

Bạn cần hỗ trợ gì khác không?`;
        }
        
        // Phát hiện câu hỏi về chia sẻ thông tin
        if (lowerMessage.includes('chia sẻ thông tin') || lowerMessage.includes('share data') ||
            lowerMessage.includes('bán thông tin') || lowerMessage.includes('sell data')) {
            
            return `🚫 **KHÔNG CHIA SẺ THÔNG TIN KHÁCH HÀNG**:

**❌ Chúng tôi KHÔNG BAO GIỜ:**
• Bán thông tin khách hàng
• Chia sẻ với bên thứ 3 vì mục đích thương mại
• Sử dụng thông tin cho mục đích khác ngoài phục vụ tour

**✅ Chỉ chia sẻ khi:**
• Có sự đồng ý của khách hàng
• Yêu cầu của cơ quan pháp luật
• Cần thiết để thực hiện dịch vụ tour

**🛡️ Cam kết:**
• Bảo vệ thông tin khách hàng tuyệt đối
• Tuân thủ quy định pháp luật
• Minh bạch trong việc sử dụng dữ liệu

**📞 Liên hệ:**
Hotline: 0972 122 555
Email: privacy@ndtravel.com

Bạn có thắc mắc gì khác không?`;
        }
        
        // Fallback cho các câu hỏi bảo mật khác
        return `🔒 **BẢO MẬT THÔNG TIN**:

Chúng tôi cam kết bảo vệ thông tin cá nhân của khách hàng.

**💡 Tôi có thể giúp bạn:**
• Giải thích chính sách bảo mật
• Hướng dẫn bảo vệ thông tin cá nhân
• Hỗ trợ các vấn đề về quyền riêng tư

**📞 Liên hệ bảo mật:**
Hotline: 0972 122 555
Email: privacy@ndtravel.com

Bạn cần hỗ trợ gì về bảo mật không?`;
        
    } catch (error) {
        console.error('Error handling privacy question:', error);
        return generateFallbackResponse(error);
    }
}

/**
 * Xử lý câu hỏi nhạy cảm và ngoài phạm vi
 */
async function handleSensitiveQuestion(message, sessionId) {
    try {
        const lowerMessage = message.toLowerCase();
        
        // Phát hiện câu hỏi về thông tin tài chính
        if (lowerMessage.includes('số tài khoản') || lowerMessage.includes('account number') ||
            lowerMessage.includes('thẻ tín dụng') || lowerMessage.includes('credit card') ||
            lowerMessage.includes('mật khẩu') || lowerMessage.includes('password') ||
            lowerMessage.includes('pin') || lowerMessage.includes('cvv')) {
            
            return `⚠️ **KHÔNG THỂ CUNG CẤP THÔNG TIN TÀI CHÍNH**:

Xin lỗi, tôi không thể cung cấp thông tin tài chính vì:
• Bảo vệ an toàn tài khoản khách hàng
• Tuân thủ quy định bảo mật ngân hàng
• Đảm bảo an toàn giao dịch

**💡 Tôi có thể giúp bạn:**
• Hướng dẫn thanh toán an toàn
• Kiểm tra trạng thái thanh toán
• Hỗ trợ các vấn đề về tour

**📞 Hỗ trợ tài chính:**
Hotline: 0972 122 555
Email: support@ndtravel.com

Bạn cần hỗ trợ gì khác không?`;
        }
        
        // Phát hiện câu hỏi về thông tin khách hàng khác
        if (lowerMessage.includes('khách hàng khác') || lowerMessage.includes('other customer') ||
            lowerMessage.includes('thông tin người khác') || lowerMessage.includes('someone else')) {
            
            return `🚫 **KHÔNG THỂ CUNG CẤP THÔNG TIN KHÁCH HÀNG KHÁC**:

Xin lỗi, tôi không thể cung cấp thông tin khách hàng khác vì:
• Bảo vệ quyền riêng tư cá nhân
• Tuân thủ chính sách bảo mật
• Đảm bảo an toàn thông tin

**💡 Tôi có thể giúp bạn:**
• Tra cứu đơn hàng của chính bạn
• Tư vấn tour phù hợp
• Hỗ trợ đặt tour mới

**📞 Hỗ trợ:**
Hotline: 0972 122 555

Bạn cần hỗ trợ gì khác không?`;
        }
        
        // Phát hiện câu hỏi về thông tin nội bộ công ty
        if (lowerMessage.includes('thông tin nội bộ') || lowerMessage.includes('internal information') ||
            lowerMessage.includes('thông tin công ty') || lowerMessage.includes('company information') ||
            lowerMessage.includes('bí mật') || lowerMessage.includes('confidential')) {
            
            return `🔒 **THÔNG TIN NỘI BỘ KHÔNG ĐƯỢC TIẾT LỘ**:

Xin lỗi, tôi không thể cung cấp thông tin nội bộ vì:
• Bảo vệ bí mật kinh doanh
• Tuân thủ quy định nội bộ
• Đảm bảo an toàn thông tin

**💡 Tôi có thể giúp bạn:**
• Tư vấn tour và dịch vụ
• Hỗ trợ đặt tour
• Giải đáp thắc mắc về tour

**📞 Liên hệ:**
Hotline: 0972 122 555

Bạn cần hỗ trợ gì khác không?`;
        }
        
        // Phát hiện câu hỏi spam/abuse
        if (lowerMessage.includes('spam') || lowerMessage.includes('abuse') ||
            lowerMessage.includes('hack') || lowerMessage.includes('crack') ||
            lowerMessage.includes('virus') || lowerMessage.includes('malware')) {
            
            return `🚫 **KHÔNG HỖ TRỢ HOẠT ĐỘNG BẤT HỢP PHÁP**:

Xin lỗi, tôi không thể hỗ trợ các hoạt động bất hợp pháp.

**💡 Tôi có thể giúp bạn:**
• Tư vấn tour du lịch
• Hỗ trợ đặt tour
• Giải đáp thắc mắc về dịch vụ

**📞 Liên hệ:**
Hotline: 0972 122 555

Bạn cần hỗ trợ gì khác không?`;
        }
        
        // Fallback cho các câu hỏi nhạy cảm khác
        return `⚠️ **KHÔNG THỂ CUNG CẤP THÔNG TIN**:

Xin lỗi, tôi không thể cung cấp thông tin này vì:
• Bảo vệ quyền riêng tư khách hàng
• Tuân thủ chính sách bảo mật
• Đảm bảo an toàn thông tin

**💡 Tôi có thể giúp bạn:**
• Tư vấn tour phù hợp
• Hướng dẫn đặt tour
• Tra cứu đơn hàng của bạn

**📞 Hỗ trợ:**
Hotline: 0972 122 555

Bạn cần hỗ trợ gì khác không?`;
        
    } catch (error) {
        console.error('Error handling sensitive question:', error);
        return generateFallbackResponse(error);
    }
}

/**
 * Xử lý câu hỏi ngoài phạm vi du lịch
 */
async function handleOutOfScopeQuestion(message, sessionId) {
    try {
        const lowerMessage = message.toLowerCase();
        
        // Phát hiện câu hỏi về công nghệ/lập trình
        if (lowerMessage.includes('lập trình') || lowerMessage.includes('programming') ||
            lowerMessage.includes('code') || lowerMessage.includes('javascript') ||
            lowerMessage.includes('python') || lowerMessage.includes('java') ||
            lowerMessage.includes('html') || lowerMessage.includes('css')) {
            
            return `🤖 **TÔI CHỈ HỖ TRỢ VỀ DU LỊCH**:

Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi về du lịch và tour.

**💡 Tôi có thể giúp bạn:**
• Tư vấn tour du lịch
• Thông tin điểm đến
• Đặt tour và thanh toán
• Tra cứu đơn hàng

**📞 Hỗ trợ:**
Hotline: 0972 122 555

Bạn cần tư vấn tour nào không?`;
        }
        
        // Phát hiện câu hỏi về y tế/sức khỏe
        if (lowerMessage.includes('bệnh') || lowerMessage.includes('sức khỏe') ||
            lowerMessage.includes('thuốc') || lowerMessage.includes('bác sĩ') ||
            lowerMessage.includes('y tế') || lowerMessage.includes('medical')) {
            
            return `🏥 **TÔI CHỈ HỖ TRỢ VỀ DU LỊCH**:

Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi về du lịch và tour.

**💡 Tôi có thể giúp bạn:**
• Tư vấn tour phù hợp
• Thông tin điểm đến
• Hướng dẫn đặt tour
• Tra cứu đơn hàng

**📞 Hỗ trợ:**
Hotline: 0972 122 555

Bạn cần tư vấn tour nào không?`;
        }
        
        // Phát hiện câu hỏi về giáo dục/học tập
        if (lowerMessage.includes('học') || lowerMessage.includes('giáo dục') ||
            lowerMessage.includes('trường') || lowerMessage.includes('sinh viên') ||
            lowerMessage.includes('education') || lowerMessage.includes('school')) {
            
            return `🎓 **TÔI CHỈ HỖ TRỢ VỀ DU LỊCH**:

Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi về du lịch và tour.

**💡 Tôi có thể giúp bạn:**
• Tư vấn tour du lịch
• Thông tin điểm đến
• Đặt tour và thanh toán
• Tra cứu đơn hàng

**📞 Hỗ trợ:**
Hotline: 0972 122 555

Bạn cần tư vấn tour nào không?`;
        }
        
        // Phát hiện câu hỏi về chính trị
        if (lowerMessage.includes('chính trị') || lowerMessage.includes('politics') ||
            lowerMessage.includes('chính phủ') || lowerMessage.includes('government') ||
            lowerMessage.includes('bầu cử') || lowerMessage.includes('election')) {
            
            return `🏛️ **TÔI CHỈ HỖ TRỢ VỀ DU LỊCH**:

Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi về du lịch và tour.

**💡 Tôi có thể giúp bạn:**
• Tư vấn tour du lịch
• Thông tin điểm đến
• Đặt tour và thanh toán
• Tra cứu đơn hàng

**📞 Hỗ trợ:**
Hotline: 0972 122 555

Bạn cần tư vấn tour nào không?`;
        }
        
        // Fallback cho các câu hỏi ngoài phạm vi khác
        return `🤖 **TÔI CHỈ HỖ TRỢ VỀ DU LỊCH**:

Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi về:
• Tư vấn tour du lịch
• Thông tin điểm đến
• Đặt tour và thanh toán
• Tra cứu đơn hàng
• Hỗ trợ khách hàng

**💡 Bạn cần tư vấn tour nào không?**

**📞 Hỗ trợ:**
Hotline: 0972 122 555`;
        
    } catch (error) {
        console.error('Error handling out of scope question:', error);
        return generateFallbackResponse(error);
    }
}

/**
 * Xử lý câu hỏi về lịch trình chi tiết - chỉ trả lời lịch trình
 */
async function handleItineraryQuestion(message, sessionId) {
    try {
        const Tour = require('../models/tourModel');
        
        // Tìm tour từ câu hỏi hoặc context
        const tour = await findTourFromMessage(message, sessionId);
        
        if (tour && tour.itinerary && tour.itinerary.length > 0) {
            let response = `🗓️ **Lịch trình chi tiết ${tour.title}**:

`;
            
            tour.itinerary.slice(0, 5).forEach((day, index) => {
                response += `**Ngày ${day.day}**: ${day.title}\n`;
                if (day.details) {
                    // Strip HTML tags và format lại
                    const cleanDetails = stripHtmlTags(day.details);
                    const formattedDetails = formatItineraryDetails(cleanDetails);
                    response += formattedDetails;
                }
                response += `\n`;
            });
            
            if (tour.itinerary.length > 5) {
                response += `• Và ${tour.itinerary.length - 5} ngày khác...\n\n`;
            }
            
            response += `📞 **Hotline**: 0972 122 555 để tư vấn chi tiết
🌐 **Xem đầy đủ**: http://localhost:5173/tour/${tour.slug}`;
            
            return response;
        }

        // Fallback: Gợi ý tour phổ biến
        // Tour đã được require ở trên
        const popularTours = await Tour.find({ status: true, deleted: false })
            .sort({ rating: -1, reviews: -1 })
            .limit(3)
            .lean();

        if (popularTours.length > 0) {
            let response = `🗓️ **Lịch trình tour phổ biến**:\n\n`;

            popularTours.forEach((tour, idx) => {
                response += `**${idx + 1}. ${tour.title}**\n`;
                response += `⏱️ ${tour.numberOfDay} ngày ${tour.numberOfDay - 1} đêm - ${formatPrice(tour.price)}\n`;
                response += `🔗 Xem chi tiết: http://localhost:5173/tour/${tour.slug}\n\n`;
            });

            response += `📞 **Hotline**: 0972 122 555\nBạn muốn xem lịch trình tour nào?`;
            return response;
        }

        return `🗓️ **Lịch trình tour**:

Để biết lịch trình chi tiết, bạn có thể:
• Xem danh sách tour: http://localhost:5173
• Gọi hotline: 0972 122 555
• Hoặc cho tôi biết sở thích của bạn (biển, núi, city...)?`;
        
    } catch (error) {
        console.error('Error handling itinerary question:', error);
        return generateFallbackResponse(error);
    }
}

/**
 * Xử lý câu hỏi chung về thời gian
 */
async function handleGeneralScheduleQuestion(message, sessionId) {
    try {
        return await generateGeneralScheduleResponse();
    } catch (error) {
        console.error('Error handling general schedule question:', error);
        return generateFallbackResponse(error);
    }
}

/**
 * Tìm tour từ câu hỏi hoặc context conversation
 */
async function findTourFromMessage(message, sessionId) {
    try {
        const Tour = require('../models/tourModel');
        
        // Tìm tour theo từ khóa địa điểm trong câu hỏi trước (nhanh hơn)
        const locationKeywords = ['phú quốc', 'hạ long', 'sapa', 'đà nẵng', 'hội an', 'nha trang', 'hàn quốc', 'nhật bản', 'thái lan', 'singapore', 'mù cang chải'];
        
        for (const keyword of locationKeywords) {
            if (message.includes(keyword)) {
                try {
                    // Sử dụng Promise.race để timeout sau 3 giây
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Query timeout')), 3000)
                    );
                    
                    const queryPromise = Tour.find({
                        $or: [
                            { title: new RegExp(keyword, 'i') },
                            { attractions: new RegExp(keyword, 'i') }
                        ],
                        status: true,
                        deleted: false
                    }).limit(1).lean();
                    
                    const tours = await Promise.race([queryPromise, timeoutPromise]);
                    if (tours.length > 0) return tours[0];
                } catch (error) {
                    console.log(`Timeout finding tour by keyword: ${keyword}`);
                    continue;
                }
            }
        }
        
        // Tìm tour từ context conversation (nếu không tìm thấy theo keyword)
        const history = await getConversationHistory(sessionId);
        let tourSlug = null;
        let tourName = null;

        // Tìm tour từ lịch sử hội thoại (bắt đầu từ tin nhắn gần nhất)
        // Ưu tiên tin nhắn của bot (assistant) vì đó là nơi chứa thông tin tour
        for (let i = history.length - 1; i >= Math.max(0, history.length - 10); i--) {
            const msg = history[i];

            // Tìm slug trong URL (ưu tiên cao nhất)
            if (msg.content.includes('localhost:5173/tour/')) {
                const slugMatch = msg.content.match(/localhost:5173\/tour\/([\w-]+)/);
                if (slugMatch) {
                    tourSlug = slugMatch[1];
                    break; // Tìm thấy slug là đủ, không cần tìm name nữa
                }
            }

            // Fallback: Tìm slug pattern chung
            if (!tourSlug && msg.content.includes('tour-')) {
                const slugMatch = msg.content.match(/tour-([\w-]+)/);
                if (slugMatch) {
                    tourSlug = slugMatch[0];
                    break;
                }
            }
        }

        // Nếu không tìm thấy slug, mới tìm theo tên tour
        if (!tourSlug) {
            for (let i = history.length - 1; i >= Math.max(0, history.length - 10); i--) {
                const msg = history[i];

                // Tìm tên tour trong tin nhắn (cải thiện regex)
                // Ưu tiên khớp tour có địa điểm cụ thể
                const tourPatterns = [
                    /\*\*Tour\s+([^*]+?)\s+\d+N\d+Đ[^*]*\*\*/i,  // **Tour Phú Quốc 4N3Đ Lễ 2/9**
                    /Tour\s+(Phú Quốc[^(\n]*?)\s+\d+N\d+Đ/i, // Tour Phú Quốc 4N3Đ
                    /Tour\s+(Nha Trang[^(\n]*?)\s+\d+N\d+Đ/i,
                    /Tour\s+(Hạ Long[^(\n]*?)\s+\d+N\d+Đ/i,
                    /Tour\s+(Sapa[^(\n]*?)\s+\d+N\d+Đ/i,
                    /Tour\s+(Đà Nẵng[^(\n]*?)\s+\d+N\d+Đ/i,
                    /Tour\s+(Phú Quốc)/i, // Fallback: chỉ địa điểm
                    /Tour\s+(Nha Trang)/i,
                    /Tour\s+(Hạ Long)/i,
                    /Tour\s+(Sapa)/i
                ];

                for (const pattern of tourPatterns) {
                    const tourMatch = msg.content.match(pattern);
                    if (tourMatch) {
                        tourName = tourMatch[1].trim();
                        break;
                    }
                }

                if (tourName) break;
            }
        }
        
        // Tìm tour theo slug
        if (tourSlug) {
            try {
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Query timeout')), 3000)
                );
                
                const queryPromise = Tour.findOne({ slug: tourSlug }).lean();
                const tour = await Promise.race([queryPromise, timeoutPromise]);
                if (tour) return tour;
            } catch (error) {
                console.log(`Timeout finding tour by slug: ${tourSlug}`);
            }
        }
        
        // Tìm tour theo tên
        if (tourName) {
            try {
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Query timeout')), 3000)
                );
                
                const queryPromise = Tour.find({
                    $or: [
                        { title: new RegExp(tourName, 'i') },
                        { attractions: new RegExp(tourName, 'i') }
                    ],
                    status: true,
                    deleted: false
                }).limit(1).lean();
                
                const tours = await Promise.race([queryPromise, timeoutPromise]);
                if (tours.length > 0) return tours[0];
            } catch (error) {
                console.log(`Timeout finding tour by name: ${tourName}`);
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error finding tour from message:', error);
        return null;
    }
}

/**
 * Tính số ngày đêm của tour
 */
function calculateDuration(startDate, endDate) {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const nights = Math.max(0, diffDays - 1);
        return `${diffDays}N${nights}Đ`;
    } catch (error) {
        return 'N/A';
    }
}

/**
 * Tạo response cho lịch trình chung với dữ liệu thật
 */
async function generateGeneralScheduleResponse() {
    try {
        // Lấy một số tour có lịch trình sắp tới
        const Tour = require('../models/tourModel');
        const TourDetail = require('../models/tourDetailModel');
        
        // Lấy 3 tour có lịch trình sắp tới
        const upcomingTours = await TourDetail.find({
            dayStart: { $gte: new Date() }
        })
        .populate('tourId', 'title slug')
        .sort({ dayStart: 1 })
        .limit(6)
        .lean();
        
        if (upcomingTours.length > 0) {
            let response = `📅 **Lịch khởi hành tour NDTravel sắp tới**:

`;
            
            // Nhóm theo tour
            const tourGroups = {};
            upcomingTours.forEach(detail => {
                const tourTitle = detail.tourId?.title || 'Tour không xác định';
                if (!tourGroups[tourTitle]) {
                    tourGroups[tourTitle] = [];
                }
                tourGroups[tourTitle].push(detail);
            });
            
            // Hiển thị tối đa 3 tour
            const tourTitles = Object.keys(tourGroups).slice(0, 3);
            tourTitles.forEach((tourTitle, index) => {
                const details = tourGroups[tourTitle];
                const firstDetail = details[0];
                const startDate = new Date(firstDetail.dayStart);
                const endDate = new Date(firstDetail.dayReturn);
                
                response += `**${index + 1}. ${tourTitle}**\n`;
                response += `• **${startDate.toLocaleDateString('vi-VN')}** → **${endDate.toLocaleDateString('vi-VN')}**\n`;
                response += `• 💵 Giá: ${firstDetail.adultPrice.toLocaleString('vi-VN')}đ`;
                if (firstDetail.discount) {
                    response += ` (giảm ${firstDetail.discount}%)`;
                }
                response += `\n• 📊 Còn ${firstDetail.stock} chỗ\n\n`;
            });
            
            response += `📞 **Hotline**: 0972 122 555 để check lịch cụ thể
🌐 **Website**: http://localhost:5173

Bạn muốn biết lịch **tour nào** cụ thể?`;
            
            return response;
        }
    } catch (error) {
        console.error('Error generating general schedule response:', error);
    }
    
    // Fallback nếu không lấy được dữ liệu
    return `📅 **Lịch khởi hành tour NDTravel**:

🗓️ **Tour Phú Quốc**: Khởi hành hàng ngày
• Lễ 2/9: 30/8 - 2/9/2025 (4N3Đ)
• Thường ngày: Linh hoạt theo yêu cầu

🚢 **Tour Hạ Long**: Khởi hành thứ 6, chủ nhật
• 2N1Đ: Thứ 6-CN hàng tuần
• 3N2Đ: Thứ 6-T2, CN-T3

🏔️ **Tour Sapa**: Khởi hành thứ 6, thứ 7
• 2N3Đ: T6-CN, T7-T2
• 3N2Đ: T6-T2, CN-T3

📞 **Hotline**: 0972 122 555 để check lịch cụ thể
🌐 **Website**: http://localhost:5173

Bạn muốn biết lịch **tour nào** cụ thể?`;
}

/**
 * Tạo response cho lịch trình tour cụ thể (legacy - giữ lại để tương thích)
 */
function generateTourScheduleResponse(tour, tourDetails) {
    // Tính số ngày đêm
    let duration = '';
    if (tour.itinerary && tour.itinerary.length > 0) {
        const days = tour.itinerary.length;
        const nights = days > 1 ? days - 1 : 0;
        duration = `${days}N${nights}Đ`;
    }
    
    let response = `📅 **Lịch trình ${tour.title}**:

🚀 **Khởi hành**: ${tour.departure?.name || 'Theo yêu cầu'}
🎯 **Điểm đến**: ${tour.destination?.name || tour.title}
⏱️ **Thời gian**: ${duration}
🚌 **Phương tiện**: ${tour.vehicleInfo || 'Máy bay + Xe du lịch'}
💰 **Giá từ**: ${(tour.minPrice || tour.price || 0).toLocaleString('vi-VN')}đ

`;

    // Thêm thông tin điểm tham quan
    if (tour.attractions) {
        response += `🏛️ **Điểm tham quan**: ${tour.attractions}\n\n`;
    }

    // Lịch khởi hành chi tiết
    if (tourDetails && tourDetails.length > 0) {
        response += `📋 **Lịch khởi hành sắp tới**:\n`;
        tourDetails.slice(0, 5).forEach((detail, index) => {
            const startDate = new Date(detail.dayStart);
            const endDate = new Date(detail.dayReturn);
            const options = { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' };
            
            // Tính giá sau giảm
            let finalPrice = detail.adultPrice;
            if (detail.discountAdultPercent) {
                finalPrice = detail.adultPrice * (1 - detail.discountAdultPercent / 100);
            } else if (detail.discount) {
                finalPrice = detail.adultPrice * (1 - detail.discount / 100);
            }
            
            response += `• **${startDate.toLocaleDateString('vi-VN', options)}** → **${endDate.toLocaleDateString('vi-VN', options)}**\n`;
            response += `  💵 Người lớn: ${finalPrice.toLocaleString('vi-VN')}đ`;
            
            if (detail.discount || detail.discountAdultPercent) {
                response += ` (giảm ${detail.discountAdultPercent || detail.discount}%)`;
            }
            
            response += `\n  📊 Còn ${detail.stock} chỗ\n\n`;
        });
        
        if (tourDetails.length > 5) {
            response += `• Và ${tourDetails.length - 5} lịch khác...\n`;
        }
    }
    
    // Thêm lịch trình chi tiết nếu có (với HTML stripping)
    if (tour.itinerary && tour.itinerary.length > 0) {
        response += `🗓️ **Lịch trình chi tiết**:\n`;
        tour.itinerary.slice(0, 3).forEach((day, index) => {
            response += `**Ngày ${day.day}**: ${day.title}\n`;
            if (day.details) {
                // Strip HTML tags và format lại
                const cleanDetails = stripHtmlTags(day.details);
                const formattedDetails = formatItineraryDetails(cleanDetails);
                response += formattedDetails;
            }
        });
        
        if (tour.itinerary.length > 3) {
            response += `• Và ${tour.itinerary.length - 3} ngày khác...\n`;
        }
        response += `\n`;
    }
    
    // Thêm thông tin khuyến mãi nếu có
    if (tour.promotions && tour.promotions.length > 0) {
        response += `\n🎁 **Khuyến mãi**:\n`;
        tour.promotions.slice(0, 3).forEach(promo => {
            response += `• ${promo.label}\n`;
        });
    }
    
    response += `

**Xem chi tiết & Đặt tour**: 
http://localhost:5173/tour/${tour.slug}

📞 **Hotline tư vấn**: 0972 122 555

Bạn muốn đặt tour **ngày nào** hoặc cần tư vấn thêm?`;

    return response;
}

/**
 * Tạo response cho điểm đến
 */
async function generateDestinationResponse(destination, tours, emoji) {
    let response = `${emoji} **Tour ${destination}** - Điểm đến tuyệt vời!

`;

    if (tours && tours.length > 0) {
        response += `🎯 **Các tour hiện có**:\n`;
        
        // Kiểm tra khuyến mãi cho từng tour
        const TourDetail = require('../models/tourDetailModel');
        
        for (const tour of tours) {
            const tourDetails = await TourDetail.find({
                tourId: tour._id,
                dayStart: { $gte: new Date() },
                discount: { $gt: 0 }
            }).limit(1).lean();
            
            if (tourDetails.length > 0) {
                const detail = tourDetails[0];
                const discount = detail.discount;
                const originalPrice = detail.adultPrice;
                const discountAmount = Math.round((originalPrice * discount / 100) / 1000) * 1000;
                const finalPrice = originalPrice - discountAmount;
                
                response += `• **${tour.title}**\n`;
                response += `  🎁 **Giảm ${discount}%**: ${formatPrice(originalPrice)} → ${formatPrice(finalPrice)}\n`;
                response += `  Xem chi tiết: http://localhost:5173/tour/${tour.slug}\n\n`;
            } else {
                response += `• **${tour.title}** - ${formatPrice(tour.price || 0)}\n`;
                response += `  Xem chi tiết: http://localhost:5173/tour/${tour.slug}\n\n`;
            }
        }
    }
    
    response += `📞 **Hotline**: 0972 122 555
🌐 **Website**: http://localhost:5173

Bạn muốn biết **lịch khởi hành** hay **chi tiết tour** nào?`;

    return response;
}

/**
 * Tạo response cho ngân sách
 */
function generateBudgetResponse(budget, tours) {
    let response = `💰 **Ngân sách ${budget} triệu** - Các tour phù hợp:

`;

    if (tours && tours.length > 0) {
        tours.slice(0, 3).forEach(tour => {
            response += `• **${tour.title}** - ${(tour.price || 0).toLocaleString('vi-VN')}đ\n`;
            response += `  📍 ${tour.destination?.name || 'Đa dạng điểm đến'}\n`;
            response += `  Xem chi tiết: http://localhost:5173/tour/${tour.slug}\n\n`;
        });
    } else {
        response += `Hiện tại chưa có tour phù hợp ngân sách ${budget} triệu.
Tuy nhiên, chúng tôi có thể tư vấn các tour gần với ngân sách này:

`;
    }
    
    response += `📞 **Hotline**: 0972 122 555 để tư vấn chi tiết
🌐 **Website**: http://localhost:5173

Bạn muốn xem **lịch khởi hành** tour nào?`;

    return response;
}

/**
 * Trích xuất ngân sách từ tin nhắn
 */
function extractBudget(message) {
    const budgetRegex = /(\d+)\s*(triệu|tr)/i;
    const match = message.match(budgetRegex);
    return match ? parseInt(match[1]) : null;
}

/**
 * Tạo response cho chi tiết giá
 */
async function generatePriceDetailResponse(tour) {
    let response = `💰 **Chi tiết giá ${tour.title}**:

`;
    
    // Kiểm tra khuyến mãi từ tour details
    const TourDetail = require('../models/tourDetailModel');
    const tourDetails = await TourDetail.find({
        tourId: tour._id,
        dayStart: { $gte: new Date() },
        $or: [
            { discount: { $gt: 0 } },
            { discountAdultPercent: { $gt: 0 } },
            { discountChildrenPercent: { $gt: 0 } },
            { discountChildPercent: { $gt: 0 } },
            { discountBabyPercent: { $gt: 0 } }
        ]
    }).limit(1).lean();
    
    if (tourDetails.length > 0) {
        const detail = tourDetails[0];
        const discount = detail.discount || 0;
        const originalPrice = detail.adultPrice;
        const discountAmount = Math.round((originalPrice * discount / 100) / 1000) * 1000;
        const finalPrice = originalPrice - discountAmount;
        
        response += `🎁 **KHUYẾN MÃI ĐẶC BIỆT**:
`;
        response += `💰 **Giá gốc**: ${formatPrice(originalPrice)}
`;
        response += `🔥 **Giảm giá**: ${discount}% (Tiết kiệm ${formatPrice(discountAmount)})
`;
        response += `✅ **Giá sau giảm**: ${formatPrice(finalPrice)}

`;
    } else {
        if (tour.minPrice && tour.maxPrice) {
            response += `💵 **Giá dao động**: ${formatPrice(tour.minPrice)} - ${formatPrice(tour.maxPrice)}
`;
        } else {
            response += `💵 **Giá cơ bản**: ${formatPrice(tour.price || 0)}
`;
        }
    }
    
    response += `
📝 **Giá bao gồm**:
• Vé máy bay khứ hồi (nếu có)
• Khách sạn theo tiêu chuẩn
• Các bữa ăn theo chương trình
• Xe đưa đón và tham quan
• Hướng dẫn viên suốt tuyến
• Bảo hiểm du lịch

❌ **Chưa bao gồm**:
• Chi phí cá nhân
• Đồ uống trong bữa ăn
• Tips cho HDV và tài xế

💡 **Lưu ý**: Giá có thể thay đổi theo ngày khởi hành và số lượng khách

**Xem chi tiết**: http://localhost:5173/tour/${tour.slug}

📞 **Hotline**: 0972 122 555

Bạn muốn biết thêm thông tin gì?`;
    
    return response;
}

/**
 * Tạo response cho tour nổi bật
 */
function generateFeaturedToursResponse(tours) {
    let response = `⭐ **Tour nổi bật NDTravel**:

`;
    
    if (tours && tours.length > 0) {
        tours.forEach((tour, index) => {
            response += `**${index + 1}. ${tour.title}**\n`;
            response += `💰 **Giá**: ${(tour.minPrice || tour.price || 0).toLocaleString('vi-VN')}đ\n`;
            if (tour.averageRating > 0) {
                response += `⭐ **Đánh giá**: ${tour.averageRating}/5 (${tour.totalReviews || 0} đánh giá)\n`;
            }
            if (tour.highlights && tour.highlights.length > 0) {
                response += `🎯 **Điểm nổi bật**: ${tour.highlights.slice(0, 2).join(', ')}\n`;
            }
            response += `🔗 **Xem chi tiết**: http://localhost:5173/tour/${tour.slug}\n\n`;
        });
    } else {
        response += `Hiện tại chưa có tour nổi bật nào được đánh dấu.
Tuy nhiên, chúng tôi có nhiều tour chất lượng cao khác:

`;
    }
    
    response += `📞 **Hotline tư vấn**: 0972 122 555
🌐 **Website**: http://localhost:5173

Bạn quan tâm tour nào nhất?`;
    
    return response;
}

/**
 * Tạo response cho tour được đánh giá cao
 */
function generateReviewResponse(tours) {
    let response = `⭐ **Tour được đánh giá cao nhất**:

`;
    
    if (tours && tours.length > 0) {
        tours.forEach((tour, index) => {
            response += `${index + 1}. **${tour.title}**\n`;
            response += `   ⭐ ${tour.averageRating}/5 (${tour.totalReviews} đánh giá)\n`;
            response += `   💰 Giá từ: ${(tour.minPrice || tour.price || 0).toLocaleString('vi-VN')}đ\n`;
            response += `   Xem chi tiết: http://localhost:5173/tour/${tour.slug}\n\n`;
        });
    }
    
    response += `📞 **Hotline tư vấn**: 0972 122 555
🌐 **Website**: http://localhost:5173

Bạn quan tâm tour nào nhất?`;
    
    return response;
}

/**
 * Tạo response cho câu hỏi về ẩm thực
 */
function generateFoodResponse(tours) {
    let response = `🍜 **Tour ẩm thực đặc sắc**:

`;
    
    if (tours && tours.length > 0) {
        tours.forEach(tour => {
            response += `• **${tour.title}**\n`;
            if (tour.cuisine) {
                response += `  🍴 ${tour.cuisine}\n`;
            }
            response += `  💰 ${(tour.price || 0).toLocaleString('vi-VN')}đ\n`;
            response += `  Xem chi tiết: http://localhost:5173/tour/${tour.slug}\n\n`;
        });
    }
    
    response += `🎯 **Trải nghiệm ẩm thực**:
• Phú Quốc: Hải sản tươi sống, bánh tét mật cật
• Hạ Long: Chả mực, sam biển, ngán
• Sapa: Thắng cố, cá hồi, rau rừng

📞 **Đặt tour**: 0972 122 555
🌐 **Website**: http://localhost:5173

Bạn thích ẩm thực vùng nào?`;
    
    return response;
}

/**
 * Tạo response mặc định
 */
function generateDefaultResponse() {
    return `Tôi hiểu bạn đang quan tâm đến tour du lịch! 😊

🎯 **Tôi có thể hỗ trợ bạn**:
📍 **Điểm đến**: Phú Quốc, Hạ Long, Sapa, Nhật Bản...
💰 **Ngân sách**: Tour phù hợp với túi tiền
📅 **Lịch khởi hành**: Ngày cụ thể cho từng tour
🗓️ **Lịch trình**: Chi tiết từng ngày
⭐ **Đánh giá**: Tour được yêu thích nhất
🍜 **Ẩm thực**: Đặc sản vùng miền

📞 **Hotline**: 0972 122 555 (24/7)
🌐 **Website**: http://localhost:5173

Bạn muốn tìm hiểu về **tour nào** và **thông tin gì**?`;
}

/**
 * Tạo response fallback khi có lỗi nghiêm trọng
 */
function generateFallbackResponse(error) {
    const errorType = error?.message || 'Unknown error';
    
    return `Xin lỗi, tôi đang gặp một chút khó khăn kỹ thuật! 😅

Nhưng đừng lo, tôi vẫn có thể hỗ trợ bạn:

🎯 **Dịch vụ của NDTravel**:
📍 **Tour trong nước**: Phú Quốc, Hạ Long, Sapa, Đà Nẵng...
🌍 **Tour quốc tế**: Nhật Bản, Hàn Quốc, Thái Lan...
💰 **Giá cả**: Từ 2-15 triệu đồng
📅 **Lịch khởi hành**: Hàng ngày, linh hoạt

📞 **Liên hệ trực tiếp**:
• **Hotline**: 0972 122 555 (24/7)
• **Website**: http://localhost:5173
• **Email**: info@ndtravel.com

💡 **Gợi ý**: Bạn có thể truy cập website để xem tour chi tiết hoặc gọi hotline để được tư vấn trực tiếp!

Bạn quan tâm đến **điểm đến nào**?`;
}

/**
 * Strip HTML tags từ text
 */
function stripHtmlTags(html) {
    if (!html || typeof html !== 'string') return '';
    
    return html
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .replace(/&amp;/g, '&') // Replace &amp; with &
        .replace(/&lt;/g, '<') // Replace &lt; with <
        .replace(/&gt;/g, '>') // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .replace(/&#39;/g, "'") // Replace &#39; with '
        .replace(/([a-zA-ZÀ-ỹ])(\d)/g, '$1 $2') // Add space between letter and digit
        .replace(/(\d)([a-zA-ZÀ-ỹ])/g, '$1 $2') // Add space between digit and letter
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
}

/**
 * Format lịch trình chi tiết cho chatbot
 */
function formatItineraryDetails(details) {
    if (!details || typeof details !== 'string') return '';
    
    // Giới hạn độ dài để tránh response quá dài
    const maxLength = 200;
    let formattedDetails = details;
    
    if (formattedDetails.length > maxLength) {
        formattedDetails = formattedDetails.substring(0, maxLength) + '...';
    }
    
    // Tách thành các dòng và format
    const lines = formattedDetails.split('\n').filter(line => line.trim());
    let result = '';
    
    lines.slice(0, 3).forEach((line, index) => {
        const cleanLine = line.trim();
        if (cleanLine) {
            // Nếu dòng bắt đầu bằng thời gian (HH:MM hoặc HH:MM+1), format đặc biệt
            if (/^\d{1,2}:\d{2}(\+\d+)?:/.test(cleanLine)) {
                const timeMatch = cleanLine.match(/^(\d{1,2}:\d{2}(?:\+\d+)?):/);
                const time = timeMatch ? timeMatch[1] : '';
                const activity = cleanLine.replace(/^\d{1,2}:\d{2}(?:\+\d+)?:\s*/, '').trim();
                result += `• **${time}**: ${activity}\n`;
            } else {
                result += `• ${cleanLine}\n`;
            }
        }
    });
    
    if (lines.length > 3) {
        result += `• Và ${lines.length - 3} hoạt động khác...\n`;
    }
    
    return result;
}

/**
 * Phát hiện tin nhắn cảm ơn hoặc kết thúc cuộc hội thoại
 */
function isThankYouOrGoodbyeMessage(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Các pattern cảm ơn rõ ràng
    const thankYouPatterns = [
        'cảm ơn', 'cám ơn', 'thank you', 'thanks', 'thank',
        'tạm biệt', 'goodbye', 'bye', 'chào tạm biệt',
        'hẹn gặp lại', 'see you', 'hẹn gặp', 'gặp lại'
    ];
    
    // Các pattern kết thúc cuộc hội thoại rõ ràng
    const goodbyePatterns = [
        'được rồi', 'ok rồi', 'hài lòng', 'tốt rồi', 'đủ rồi', 'thôi',
        'không cần nữa', 'không cần', 'không cần hỏi nữa',
        'đã hiểu', 'hiểu rồi', 'biết rồi', 'đã biết',
        'xong rồi', 'xong', 'hoàn thành', 'kết thúc'
    ];
    
    // Các pattern câu hỏi - KHÔNG được coi là cảm ơn
    const questionPatterns = [
        'cho tôi', 'cho em', 'cho mình', 'được không', 'được chưa',
        'có thể', 'có được', 'làm sao', 'như thế nào', 'thế nào',
        'gì', 'sao', 'tại sao', 'ở đâu', 'khi nào', 'bao giờ',
        'bao nhiêu', 'mấy', 'có không', 'có chưa', 'có được không',
        'tìm hiểu', 'hỏi', 'thắc mắc', 'giải thích', 'hướng dẫn'
    ];
    
    // Kiểm tra có phải câu hỏi không
    const isQuestion = questionPatterns.some(pattern => lowerMessage.includes(pattern));
    
    // Nếu là câu hỏi thì KHÔNG phải cảm ơn
    if (isQuestion) {
        return false;
    }
    
    // Kiểm tra pattern cảm ơn
    const hasThankYou = thankYouPatterns.some(pattern => lowerMessage.includes(pattern));
    
    // Kiểm tra pattern kết thúc (chỉ khi không có dấu ?)
    const hasGoodbye = !lowerMessage.includes('?') && 
                      goodbyePatterns.some(pattern => lowerMessage.includes(pattern));
    
    return hasThankYou || hasGoodbye;
}

/**
 * Tạo phản hồi cảm ơn và kết thúc cuộc hội thoại
 */
function generateThankYouResponse() {
    const responses = [
        `Cảm ơn bạn đã tin tưởng NDTravel! 😊

🎯 **Chúng tôi luôn sẵn sàng hỗ trợ bạn**:
📞 **Hotline**: 0972 122 555 (24/7)
🌐 **Website**: http://localhost:5173
📧 **Email**: info@ndtravel.com

Chúc bạn có những chuyến du lịch tuyệt vời! ✈️🌍`,

        `Rất vui được hỗ trợ bạn! 😊

💝 **NDTravel cam kết mang đến**:
⭐ Dịch vụ tour chất lượng cao
🏨 Khách sạn tiêu chuẩn
🍽️ Ẩm thực đặc sắc
👨‍💼 Hướng dẫn viên chuyên nghiệp

📞 **Liên hệ**: 0972 122 555
🌐 **Website**: http://localhost:5173

Hẹn gặp lại bạn trong những chuyến du lịch tiếp theo! ✈️`,

        `Cảm ơn bạn đã quan tâm đến dịch vụ của NDTravel! 🙏

🎁 **Ưu đãi đặc biệt dành cho bạn**:
• Giảm giá 5% cho lần đặt tour đầu tiên
• Tặng bảo hiểm du lịch miễn phí
• Hỗ trợ 24/7 trong suốt chuyến đi

📞 **Đặt tour ngay**: 0972 122 555
🌐 **Xem tour**: http://localhost:5173

Chúc bạn một ngày tốt lành! 🌟`,

        `Xin chân thành cảm ơn bạn! 😊

🌟 **NDTravel - Đồng hành cùng bạn khám phá thế giới**:
📍 Tour trong nước: Phú Quốc, Hạ Long, Sapa...
🌍 Tour quốc tế: Nhật Bản, Hàn Quốc, Thái Lan...
💰 Giá cả hợp lý, chất lượng đảm bảo

📞 **Hotline tư vấn**: 0972 122 555
🌐 **Website**: http://localhost:5173

Hẹn gặp lại bạn sớm! ✈️🌺`,

        `Cảm ơn bạn đã dành thời gian tìm hiểu về NDTravel! 🙏

🎯 **Chúng tôi luôn sẵn sàng**:
• Tư vấn tour phù hợp
• Hỗ trợ đặt tour 24/7
• Chăm sóc khách hàng tận tình
• Đảm bảo chất lượng dịch vụ

📞 **Liên hệ**: 0972 122 555
🌐 **Website**: http://localhost:5173

Chúc bạn có những trải nghiệm du lịch tuyệt vời! 🌟✈️`
    ];
    
    // Chọn ngẫu nhiên một phản hồi
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
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
    getCacheStatus,
    generateSmartTourResponse
};