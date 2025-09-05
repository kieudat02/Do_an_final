const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

// Helper function: Extract tour information
const extractTourInfo = (tourInfo, tourDetails) => {
    return {
        tourCode: tourInfo?.code || '',
        tourCategory: tourInfo?.category?.name || '',
        tourDeparture: tourInfo?.departure?.name || '',
        tourDestination: tourInfo?.destination?.name || '',
        tourDuration: tourDetails ?
            Math.ceil((new Date(tourDetails.dayReturn) - new Date(tourDetails.dayStart)) / (1000 * 60 * 60 * 24)) + 1 :
            null,
        tourStock: tourDetails?.stock || 'Không xác định'
    };
};

// Helper function: Generate common email footer
const generateEmailFooter = () => {
    return `
        <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center; color: #7f8c8d; font-size: 12px;">
            <p style="margin: 0 0 8px 0;">Thời gian gửi: ${new Date().toLocaleString('vi-VN')}</p>
            <p style="margin: 0;">Email tự động từ hệ thống ND Travel</p>
            <p style="margin: 8px 0 0 0;">Cảm ơn bạn đã tin tưởng và lựa chọn dịch vụ của chúng tôi!</p>
        </div>
    `;
};

// Helper function: Generate contact info section
const generateContactInfo = (hotline) => {
    return `
        <div style="background-color: #e8f4fd; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #0056b3; margin: 0 0 15px 0;">Thông tin liên hệ</h3>
            <div style="color: #0056b3;">
                <p style="margin: 5px 0;"><strong>Hotline:</strong> ${hotline}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${process.env.EMAIL_USER}</p>
                <p style="margin: 5px 0;"><strong>Website:</strong> www.ndtravel.com</p>
            </div>
        </div>
    `;
};



const sendOTPEmail = async (email, otp) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Mã xác thực tra cứu mã đơn',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #3498db;">Xác thực địa chỉ email</h2>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <p>Xin chào,</p>
                        <p>Cảm ơn bạn đã đăng ký tài khoản tại ND Travel. Để hoàn tất quá trình tra cứu đơn hàng, vui lòng sử dụng mã xác thực sau:</p>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; margin-bottom: 20px;">
                        <h1 style="font-size: 32px; letter-spacing: 5px; margin: 0; color: #3498db;">${otp}</h1>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <p>Mã xác thực này sẽ hết hạn sau 5 phút.</p>
                        <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
                    </div>
                    <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
                        <p>© ${new Date().getFullYear()} ND Travel. Tất cả các quyền được bảo lưu.</p>
                        <p>Đây là email tự động, vui lòng không trả lời email này.</p>
                    </div>
                </div>
            `
        };
        
        return await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw error;
    }
};


const generateOTP = (length = 6) => {
    // Generate a random number with specified length
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
};


const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
};

const sendBookingConfirmationEmail = async (bookingData) => {
    try {
        const transporter = createTransporter();

        const {
            customerEmail,
            customerName,
            hotline = "0972 122 555"
        } = bookingData;



        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            subject: "Đã nhận yêu cầu đặt tour của bạn – Đang chờ xác nhận",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: #ffaf2f; border-radius: 4px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Chờ xác nhận</p>
                    </div>

                    <!-- Greeting -->
                    <div style="margin-bottom: 25px;">
                        <h2 style="color: #2c3e50; margin: 0 0 15px 0;">Xin chào ${customerName},</h2>
                        <p style="color: #34495e; line-height: 1.6; margin: 0;">Cảm ơn bạn đã đặt tour tại ND Travel. Chúng tôi đã nhận được yêu cầu đặt tour của bạn và đang trong quá trình xử lý.</p>
                    </div>

                    <!-- Additional Info -->
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                        <h4 style="color: #856404; margin: 0 0 10px 0;">Thông tin quan trọng</h4>
                        <ul style="color: #856404; margin: 0; padding-left: 20px;">
                            <li>Đơn đặt tour của bạn đang được xem xét và xác nhận</li>
                            <li>Chúng tôi sẽ liên hệ với bạn trong vòng 24 giờ</li>
                            <li>Vui lòng giữ máy để nhận cuộc gọi xác nhận từ nhân viên</li>
                            <li>Nếu có thắc mắc, vui lòng liên hệ hotline: ${hotline}</li>
                        </ul>
                    </div>

                    <!-- Booking Details -->
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 25px;">
                        <h3 style="color: #2c3e50; margin: 0 0 15px 0; border-bottom: 2px solid #3498db; padding-bottom: 5px;">📋 Thông tin đặt tour</h3>

                        <div style="display: grid; gap: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e9ecef; min-height: 40px; line-height: 1.4;">
                                <span style="font-weight: bold; color: #495057; font-size: 14px;">Mã đơn hàng:</span>
                                <span style="color: #007bff; font-weight: bold; font-size: 14px;">${bookingData.orderId}</span>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e9ecef; min-height: 40px; line-height: 1.4;">
                                <span style="font-weight: bold; color: #495057; font-size: 14px;">Tên tour:</span>
                                <span style="color: #495057; font-size: 14px;">${bookingData.tourName}</span>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e9ecef; min-height: 40px; line-height: 1.4;">
                                <span style="font-weight: bold; color: #495057; font-size: 14px;">Ngày khởi hành:</span>
                                <span style="color: #495057; font-size: 14px;">${new Date(bookingData.departureDate).toLocaleDateString('vi-VN')}</span>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e9ecef; min-height: 40px; line-height: 1.4;">
                                <span style="font-weight: bold; color: #495057; font-size: 14px;">Ngày về:</span>
                                <span style="color: #495057; font-size: 14px;">${new Date(bookingData.returnDate).toLocaleDateString('vi-VN')}</span>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e9ecef; min-height: 40px; line-height: 1.4;">
                                <span style="font-weight: bold; color: #495057; font-size: 14px;">Số người:</span>
                                <span style="color: #495057; font-size: 14px;">${bookingData.totalPeople} người (${bookingData.adults} người lớn${bookingData.children > 0 ? `, ${bookingData.children} trẻ em` : ''})</span>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e9ecef; min-height: 40px; line-height: 1.4;">
                                <span style="font-weight: bold; color: #495057; font-size: 14px;">Phương thức thanh toán:</span>
                                <span style="color: #495057; font-size: 14px;">${bookingData.paymentMethod}</span>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background-color: #e8f4fd; margin-top: 10px; border-radius: 4px; min-height: 50px; line-height: 1.4;">
                                <span style="font-weight: bold; color: #0056b3; font-size: 16px;">Tổng tiền:</span>
                                <span style="color: #0056b3; font-weight: bold; font-size: 18px;">${bookingData.totalAmount?.toLocaleString('vi-VN')} VNĐ</span>
                            </div>

                            ${bookingData.notes ? `
                            <div style="margin-top: 15px; padding: 10px; background-color: #fff3cd; border-radius: 4px;">
                                <span style="font-weight: bold; color: #856404;">Ghi chú:</span>
                                <p style="color: #856404; margin: 5px 0 0 0;">${bookingData.notes}</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    ${generateContactInfo(hotline)}
                    ${generateEmailFooter()}
                </div>
            `
        };

        return await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending booking confirmation email:', error);
        throw error;
    }
};


// Check if OTP requests for an email should be rate limited

const isRateLimited = (attempts = [], maxAttempts = 3, timeWindow = 1) => {
    if (!attempts.length) return false;

    // Filter attempts within the time window
    const now = Date.now();
    const windowStart = now - (timeWindow * 60 * 60 * 1000); // Convert hours to milliseconds
    const recentAttempts = attempts.filter(timestamp => timestamp > windowStart);

    return recentAttempts.length >= maxAttempts;
};

// Gửi email thông báo booking mới cho nhân viên
const sendBookingNotificationToStaff = async (bookingData) => {
    try {
        const transporter = createTransporter();

        const {
            customerEmail,
            customerName,
            customerPhone,
            orderId,
            tourName,
            departureDate,
            returnDate,
            totalPeople,
            adults,
            children,
            babies = 0,
            totalAmount,
            paymentMethod,
            notes,
            staffEmail = process.env.STAFF_EMAIL || process.env.EMAIL_USER,
            tourInfo,
            tourDetails
        } = bookingData;

        // Lấy thông tin bổ sung từ tour cho email nhân viên
        const { tourCode, tourCategory, tourDeparture, tourDestination, tourDuration, tourStock } = extractTourInfo(tourInfo, tourDetails);

        const mailOptions = {
            from: `"ND Travel System" <${process.env.EMAIL_USER}>`,
            to: staffEmail,
            subject: `Booking mới - ${orderId} - ${customerName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #e74c3c, #c0392b); border-radius: 4px;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">BOOKING MỚI</h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 14px;">Có khách hàng mới đặt tour</p>
                    </div>

                    <!-- Customer Info -->
                    <div style="background-color: #fff; padding: 20px;">
                        <h3 style="color: #2c3e50; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #7f8c8d; padding-bottom: 8px;">
                            Thông tin khách hàng
                        </h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 6px 0; color: #7f8c8d; font-weight: bold; width: 35%;">Tên khách hàng:</td>
                                <td style="padding: 6px 0; color: #2c3e50; font-weight: bold;">${customerName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #7f8c8d; font-weight: bold;">Email:</td>
                                <td style="padding: 6px 0; color: #2c3e50;">${customerEmail}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #7f8c8d; font-weight: bold;">Số điện thoại:</td>
                                <td style="padding: 6px 0; color: #2c3e50;">${customerPhone || 'Chưa cung cấp'}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Booking Details -->
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                        <h3 style="color: #2c3e50; margin: 0 0 15px 0; border-bottom: 1px solid #ccc; padding-bottom: 5px;">
                            Chi tiết booking
                        </h3>

                        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; background: #fff; border-radius: 4px; overflow: hidden;">
                            <tr>
                                <td style="font-weight: bold; color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef; background-color: #f8f9fa; width: 35%;">
                                    Mã đơn hàng:
                                </td>
                                <td style="color: #007bff; font-weight: bold; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef;">
                                    ${orderId}
                                </td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef; background-color: #f8f9fa;">
                                    Tên tour:
                                </td>
                                <td style="color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef;">
                                    ${tourName}${tourCode ? ` (${tourCode})` : ''}
                                </td>
                            </tr>
                            ${tourCategory ? `
                            <tr>
                                <td style="font-weight: bold; color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef; background-color: #f8f9fa;">
                                    Loại tour:
                                </td>
                                <td style="color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef;">
                                    ${tourCategory}
                                </td>
                            </tr>
                            ` : ''}
                            ${tourDeparture ? `
                            <tr>
                                <td style="font-weight: bold; color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef; background-color: #f8f9fa;">
                                    Điểm khởi hành:
                                </td>
                                <td style="color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef;">
                                    ${tourDeparture}
                                </td>
                            </tr>
                            ` : ''}
                            ${tourDestination ? `
                            <tr>
                                <td style="font-weight: bold; color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef; background-color: #f8f9fa;">
                                    Điểm đến:
                                </td>
                                <td style="color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef;">
                                    ${tourDestination}
                                </td>
                            </tr>
                            ` : ''}
                            ${tourDuration ? `
                            <tr>
                                <td style="font-weight: bold; color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef; background-color: #f8f9fa;">
                                    Thời gian:
                                </td>
                                <td style="color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef;">
                                    ${tourDuration} ngày ${tourDuration - 1} đêm
                                </td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="font-weight: bold; color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef; background-color: #f8f9fa;">
                                    Số chỗ còn lại:
                                </td>
                                <td style="color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef;">
                                    ${tourStock}
                                </td>
                            </tr>
                            ${departureDate ? `
                            <tr>
                                <td style="font-weight: bold; color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef; background-color: #f8f9fa;">
                                    Ngày khởi hành:
                                </td>
                                <td style="color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef;">
                                    ${new Date(departureDate).toLocaleDateString('vi-VN')}
                                </td>
                            </tr>
                            ` : ''}
                            ${returnDate ? `
                            <tr>
                                <td style="font-weight: bold; color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef; background-color: #f8f9fa;">
                                    Ngày trở về:
                                </td>
                                <td style="color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef;">
                                    ${new Date(returnDate).toLocaleDateString('vi-VN')}
                                </td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="font-weight: bold; color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef; background-color: #f8f9fa;">
                                    Số người:
                                </td>
                                <td style="color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef;">
                                    ${totalPeople} người (${adults} người lớn${children > 0 ? `, ${children} trẻ em` : ''}${babies > 0 ? `, ${babies} trẻ nhỏ` : ''})
                                </td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef; background-color: #f8f9fa;">
                                    Phương thức thanh toán:
                                </td>
                                <td style="color: #495057; font-size: 14px; padding: 12px 15px; border-bottom: 1px solid #e9ecef;">
                                    ${paymentMethod}
                                </td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #0056b3; font-size: 16px; padding: 15px; background-color: #e8f4fd;">
                                    Tổng tiền:
                                </td>
                                <td style="color: #0056b3; font-weight: bold; font-size: 18px; padding: 15px; background-color: #e8f4fd;">
                                    ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}
                                </td>
                            </tr>
                        </table>

                        ${notes ? `
                        <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #7f8c8d">
                            <p style="color: #7f8c8d; font-weight: bold; margin: 0 0 6px 0;">Ghi chú từ khách hàng:</p>
                            <p style="color: #2c3e50; margin: 0; font-style: italic; background-color: white; padding: 10px; border-radius: 4px;">${notes}</p>
                        </div>
                        ` : ''}
                    </div>

                    <!-- Action Required -->
                    <div style="background-color: #e8f6f3; padding: 20px; margin-bottom: 20px;">
                        <h3 style="color: #27ae60; margin-top: 0; margin-bottom: 15px;">Cần thực hiện</h3>
                        <ul style="color: #2c3e50; line-height: 1.6; margin: 0; padding-left: 20px;">
                            <li><strong>Liên hệ khách hàng trong vòng 24h</strong> để xác nhận thông tin</li>
                            <li>Kiểm tra tình trạng tour và số chỗ còn lại</li>
                            <li>Gửi hướng dẫn thanh toán và chuẩn bị giấy tờ</li>
                            <li>Cập nhật trạng thái booking trong hệ thống</li>
                        </ul>
                    </div>

                    <!-- Footer -->
                    <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center; color: #7f8c8d; font-size: 12px;">
                        <p style="margin: 0 0 8px 0;">Thời gian nhận booking: ${new Date().toLocaleString('vi-VN')}</p>
                        <p style="margin: 0;">Email tự động từ hệ thống ND Travel</p>
                    </div>
                </div>
            `
        };

        return await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending booking notification to staff:', error);
        throw error;
    }
};

// Tạo template email động dựa trên trạng thái đơn đặt tour
const generateEmailTemplate = (status, bookingData) => {
    const {
        customerName,
        hotline = "1900 1234",
        cancellationReason = ""
    } = bookingData;

    // Extract all needed variables from bookingData
    const {
        orderId, tourName, departureDate, returnDate, totalPeople,
        adults, children, totalAmount, paymentMethod, notes,
        tourInfo, tourDetails
    } = bookingData;

    // Lấy thông tin bổ sung từ tour cho email khách hàng (giống như email nhân viên)
    const { tourCode, tourCategory, tourDeparture, tourDestination, tourDuration, tourStock } = extractTourInfo(tourInfo, tourDetails);



    // Cấu hình nội dung theo trạng thái
    const statusConfig = {
        pending: {
            subject: "Đã nhận yêu cầu đặt tour của bạn – Đang chờ xác nhận",
            headerTitle: "Chờ xác nhận",
            headerColor: "#ffaf2f",
            statusText: "Đang chờ xác nhận",
            mainMessage: "Cảm ơn bạn đã đặt tour tại ND Travel. Chúng tôi đã nhận được yêu cầu đặt tour của bạn và đang trong quá trình xử lý.",
            additionalInfo: `
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #856404; margin: 0 0 10px 0;">Thông tin quan trọng</h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px;">
                        <li>Đơn đặt tour của bạn đang được xem xét và xác nhận</li>
                        <li>Chúng tôi sẽ liên hệ với bạn trong vòng 24 giờ</li>
                        <li>Vui lòng giữ máy để nhận cuộc gọi xác nhận từ nhân viên</li>
                        <li>Nếu có thắc mắc, vui lòng liên hệ hotline: ${hotline}</li>
                    </ul>
                </div>
            `
        },
        confirmed: {
            subject: "Đơn đặt tour của bạn đã được xác nhận",
            headerTitle: "Xác nhận thành công",
            headerColor: "#27ae60", 
            statusText: "Đã xác nhận",
            mainMessage: "Chúc mừng! Đơn đặt tour của bạn đã được xác nhận thành công. Hãy chuẩn bị cho chuyến đi tuyệt vời sắp tới!",
            additionalInfo: `
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #155724; margin: 0 0 10px 0;">🎉 Chúc mừng bạn!</h4>
                    <ul style="color: #155724; margin: 0; padding-left: 20px;">
                        <li>Đơn đặt tour đã được xác nhận và xử lý thành công</li>
                        <li>Vui lòng thanh toán theo phương thức đã chọn: <strong>${paymentMethod}</strong></li>
                        <li>Nhân viên sẽ liên hệ với bạn để hướng dẫn chi tiết</li>
                        <li>Hãy chuẩn bị giấy tờ tùy thân và hành lý cho chuyến đi</li>
                        <li>Hotline hỗ trợ 24/7: ${hotline}</li>
                    </ul>
                </div>
            `
        },
        cancelled: {
            subject: "Đơn đặt tour của bạn đã bị hủy",
            headerTitle: "Đơn bị hủy",
            headerColor: "#e74c3c",
            statusText: "Đã hủy",
            mainMessage: "Rất tiếc, đơn đặt tour của bạn đã bị hủy. Chúng tôi xin lỗi vì sự bất tiện này.",
            additionalInfo: `
                <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #721c24; margin: 0 0 10px 0;">Thông tin hủy tour</h4>
                    <ul style="color: #721c24; margin: 0; padding-left: 20px;">
                        <li><strong>Lý do hủy:</strong> ${cancellationReason || "Sẽ được thông báo qua điện thoại"}</li>
                        <li>Nếu bạn đã thanh toán, chúng tôi sẽ hoàn tiền theo quy định</li>
                        <li>Nhân viên sẽ liên hệ để giải thích chi tiết và hỗ trợ</li>
                        <li>Bạn có thể đặt tour khác hoặc liên hệ hotline: ${hotline}</li>
                    </ul>
                </div>
            `
        }
    };

    const config = statusConfig[status];
    if (!config) {
        throw new Error(`Trạng thái không hợp lệ: ${status}`);
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, ${config.headerColor}, ${config.headerColor}dd); border-radius: 4px;">
                <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">${config.headerTitle}</p>
            </div>

            <!-- Greeting -->
            <div style="margin-bottom: 25px;">
                <h2 style="color: #2c3e50; margin: 0 0 15px 0;">Xin chào ${customerName},</h2>
                <p style="color: #34495e; line-height: 1.6; margin: 0;">${config.mainMessage}</p>
            </div>

            <!-- Additional Info -->
            ${config.additionalInfo}

            <!-- Booking Details -->
            <div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 25px;">
                <h3 style="color: #2c3e50; margin: 0 0 15px 0; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Thông tin đặt tour</h3>

                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#fff;">
                    <tr>
                        <td style="font-weight:bold; color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef; min-width:140px;">
                        Mã đơn hàng:
                        </td>
                        <td style="color:#007bff; font-weight:bold; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        ${bookingData.orderId}
                        </td>
                    </tr>
                    <tr>
                        <td style="font-weight:bold; color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        Tên tour:
                        </td>
                        <td style="color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        ${bookingData.tourName}${tourCode ? ` (${tourCode})` : ''}
                        </td>
                    </tr>
                    ${tourCategory ? `
                    <tr>
                        <td style="font-weight:bold; color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        Loại tour:
                        </td>
                        <td style="color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        ${tourCategory}
                        </td>
                    </tr>
                    ` : ''}
                    ${tourDeparture ? `
                    <tr>
                        <td style="font-weight:bold; color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        Điểm khởi hành:
                        </td>
                        <td style="color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        ${tourDeparture}
                        </td>
                    </tr>
                    ` : ''}
                    ${tourDestination ? `
                    <tr>
                        <td style="font-weight:bold; color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        Điểm đến:
                        </td>
                        <td style="color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        ${tourDestination}
                        </td>
                    </tr>
                    ` : ''}
                    ${tourDuration ? `
                    <tr>
                        <td style="font-weight:bold; color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        Thời gian tour:
                        </td>
                        <td style="color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        ${tourDuration} ngày ${tourDuration - 1} đêm
                        </td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td style="font-weight:bold; color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        Ngày khởi hành:
                        </td>
                        <td style="color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        ${new Date(bookingData.departureDate).toLocaleDateString('vi-VN')}
                        </td>
                    </tr>
                    <tr>
                        <td style="font-weight:bold; color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        Ngày về:
                        </td>
                        <td style="color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        ${new Date(bookingData.returnDate).toLocaleDateString('vi-VN')}
                        </td>
                    </tr>
                    <tr>
                        <td style="font-weight:bold; color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        Số người:
                        </td>
                        <td style="color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        ${bookingData.totalPeople} người (${bookingData.adults} người lớn${bookingData.children > 0 ? `, ${bookingData.children} trẻ em` : ''}${bookingData.babies > 0 ? `, ${bookingData.babies} trẻ nhỏ` : ''})
                        </td>
                    </tr>
                    <tr>
                        <td style="font-weight:bold; color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef; white-space: nowrap;">
                        Phương thức thanh toán:
                        </td>
                        <td style="color:#495057; font-size:14px; padding:12px 0; border-bottom:1px solid #e9ecef;">
                        ${bookingData.paymentMethod}
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding:0; border:none;">
                        <table width="100%">
                            <tr>
                            <td style="font-weight:bold; color:#0056b3; font-size:16px; padding:15px 0 15px 0;">
                                Tổng tiền:
                            </td>
                            <td style="color:#0056b3; font-weight:bold; font-size:18px; text-align:right; padding:15px 15px 15px 0;">
                                ${bookingData.totalAmount?.toLocaleString('vi-VN')} VNĐ
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                    ${bookingData.notes ? `
                    <tr>
                        <td colspan="2" style="padding:0; border:none;">
                        <div style="margin-top: 15px; padding: 10px 15px; background-color: #fff3cd; border-radius: 4px;">
                            <span style="font-weight: bold; color: #856404;">Ghi chú:</span>
                            <p style="color: #856404; margin: 5px 0 0 0;">${bookingData.notes}</p>
                        </div>
                        </td>
                    </tr>
                    ` : ''}
                    </table>
                </div>
                ${generateContactInfo(hotline)}
                ${generateEmailFooter()}
            </div>
        </div>
    `;

    return {
        subject: config.subject,
        html: htmlContent
    };
};

// Gửi email thông báo trạng thái đặt tour
const sendBookingStatusEmail = async (status, bookingData) => {
    try {
        const transporter = createTransporter();

        if (!bookingData.customerEmail) {
            throw new Error('Email khách hàng là bắt buộc');
        }

        // Tạo template email động
        const emailTemplate = generateEmailTemplate(status, bookingData);

        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: bookingData.customerEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        };

        const result = await transporter.sendMail(mailOptions);
        return result;

    } catch (error) {
        console.error(`❌ Lỗi gửi email ${status}:`, error);
        throw error;
    }
};

// Gửi email mời đánh giá tour
const sendReviewInvitationEmail = async (bookingData) => {
    try {
        const transporter = createTransporter();

        const {
            customerEmail,
            customerName,
            orderId,
            tourName,
            reviewUrl,
            hotline = "0972 122 555"
        } = bookingData;

        if (!customerEmail) {
            throw new Error('Email khách hàng là bắt buộc');
        }

        if (!reviewUrl) {
            throw new Error('Review URL là bắt buộc');
        }

        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            subject: `Chia sẻ trải nghiệm tour của bạn - ${orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #4CAF50, #45a049); border-radius: 4px;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">CHIA SẺ TRẢI NGHIỆM</h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 14px;">Hãy cho chúng tôi biết cảm nhận của bạn về chuyến đi</p>
                    </div>

                    <!-- Main Content -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="color: #333; margin-bottom: 20px;">Xin chào ${customerName}!</h2>

                        <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                            Cảm ơn bạn đã tin tưởng và lựa chọn ND Travel cho chuyến đi <strong>${tourName}</strong>.
                            Chúng tôi hy vọng bạn đã có những trải nghiệm tuyệt vời và đáng nhớ.
                        </p>

                        <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                            Để giúp chúng tôi cải thiện chất lượng dịch vụ và hỗ trợ những khách hàng khác đưa ra quyết định,
                            bạn có thể dành vài phút chia sẻ đánh giá về chuyến đi này không?
                        </p>

                        <!-- Review Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${reviewUrl}"
                               style="display: inline-block; background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                ĐÁNH GIÁ NGAY
                            </a>
                        </div>

                        <!-- Benefits -->
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #4CAF50; margin: 0 0 15px 0;">Tại sao nên đánh giá?</h3>
                            <ul style="color: #555; margin: 0; padding-left: 20px;">
                                <li>Giúp những du khách khác có thêm thông tin tham khảo</li>
                                <li>Góp phần cải thiện chất lượng dịch vụ của ND Travel</li>
                                <li>Chia sẻ những kỷ niệm đẹp từ chuyến đi</li>
                                <li>Chỉ mất 2-3 phút để hoàn thành</li>
                            </ul>
                        </div>

                        <!-- Order Info -->
                        <div style="background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h4 style="color: #0056b3; margin: 0 0 10px 0;">Thông tin chuyến đi</h4>
                            <p style="color: #0056b3; margin: 5px 0;"><strong>Mã đơn:</strong> ${orderId}</p>
                            <p style="color: #0056b3; margin: 5px 0;"><strong>Tour:</strong> ${tourName}</p>
                        </div>

                        <p style="color: #777; font-size: 14px; margin-top: 20px;">
                            <em>Lưu ý: Link đánh giá này có hiệu lực trong 7 ngày và chỉ có thể sử dụng một lần duy nhất.</em>
                        </p>
                    </div>

                    ${generateContactInfo(hotline)}

                    <!-- Footer -->
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #888; font-size: 12px; margin: 0;">
                            Email này được gửi tự động từ hệ thống ND Travel.<br>
                            Vui lòng không trả lời email này.
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        return result;

    } catch (error) {
        console.error(`❌ Lỗi gửi email mời đánh giá:`, error);
        throw error;
    }
};

module.exports = {
    sendOTPEmail,
    sendBookingConfirmationEmail,
    sendBookingNotificationToStaff,
    generateEmailTemplate,
    sendBookingStatusEmail,
    sendReviewInvitationEmail,
    generateOTP,
    validateEmail,
    isRateLimited
};