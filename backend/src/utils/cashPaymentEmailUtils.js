const { createTransporter, generateContactInfo, generateEmailFooter, generateEmailSubject, generateOrderLookupSection } = require('./emailUtils');
const { generateCompletedTemplate } = require('./onlinePaymentEmailUtils');

// Tạo template email chờ xác nhận (pending)
const generatePendingTemplate = (orderData) => {
    const {
        customerName,
        orderId,
        tourName,
        departureDate,
        returnDate,
        totalPeople,
        adults,
        children,
        babies = 0,
        singleRooms = 0,
        totalAmount,
        paymentMethod,
        notes,
        hotline = "0972 122 555"
    } = orderData;

    return {
        subject: generateEmailSubject(orderId, tourName, "Đã nhận yêu cầu đặt tour – Đang chờ xác nhận"),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: #ffaf2f; border-radius: 4px;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">⏳ Chờ xác nhận</p>
                </div>

                <!-- Greeting -->
                <div style="margin-bottom: 20px;">
                    <h2 style="color: #ffaf2f; margin: 0 0 15px 0;">Xin chào ${customerName}!</h2>
                    <p style="margin: 0; line-height: 1.6;">
                        Cảm ơn bạn đã đặt tour tại ND Travel. Chúng tôi đã nhận được yêu cầu đặt tour của bạn và đang trong quá trình xử lý.
                    </p>
                </div>

                <!-- Thông tin đơn hàng -->
                <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #495057; margin: 0 0 15px 0;">📋 Thông tin đơn hàng</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Mã đơn hàng:</td>
                            <td style="padding: 8px 0; color: #495057;">${orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Tour:</td>
                            <td style="padding: 8px 0; color: #495057;">${tourName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Ngày khởi hành:</td>
                            <td style="padding: 8px 0; color: #495057;">${new Date(departureDate).toLocaleDateString('vi-VN')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Ngày về:</td>
                            <td style="padding: 8px 0; color: #495057;">${new Date(returnDate).toLocaleDateString('vi-VN')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Số người:</td>
                            <td style="padding: 8px 0; color: #495057;">${totalPeople} người (${adults} người lớn${children > 0 ? `, ${children} trẻ em` : ''}${babies > 0 ? `, ${babies} em bé` : ''}${singleRooms > 0 ? `<small style="color:#856404; font-style:italic;">+ Phụ thu phòng đơn: ${singleRooms} phòng</small>` : ''})</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Tổng tiền:</td>
                            <td style="padding: 8px 0; color: #495057; font-size: 18px; font-weight: bold;">${totalAmount?.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Thanh toán:</td>
                            <td style="padding: 8px 0; color: #495057;">${paymentMethod}</td>
                        </tr>
                        ${notes ? `
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Ghi chú:</td>
                            <td style="padding: 8px 0; color: #495057;">${notes}</td>
                        </tr>
                        ` : ''}
                    </table>
                </div>

                <!-- Thông tin quan trọng -->
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Thông tin quan trọng</h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px;">
                        <li>Đơn đặt tour của bạn đang được xem xét và xác nhận</li>
                        <li>Chúng tôi sẽ liên hệ với bạn trong vòng 24 giờ</li>
                        <li>Vui lòng giữ máy để nhận cuộc gọi xác nhận</li>
                        <li>Thanh toán bằng tiền mặt khi nhận xác nhận từ nhân viên</li>
                        <li>Có thể hủy đơn miễn phí trước khi xác nhận</li>
                    </ul>
                </div>

                ${generateOrderLookupSection(orderId)}
                ${generateContactInfo(hotline)}
                ${generateEmailFooter()}
            </div>
        `
    };
};

// Tạo template email đã xác nhận VÀ đã thanh toán (confirmed + paid cùng lúc)
const generateConfirmedAndPaidTemplate = (orderData) => {
    const {
        customerName,
        orderId,
        tourName,
        departureDate,
        returnDate,
        totalPeople,
        adults,
        children,
        babies = 0,
        singleRooms = 0,
        totalAmount,
        paymentMethod,
        hotline = "0972 122 555"
    } = orderData;

    return {
        subject: generateEmailSubject(orderId, tourName, "Xác nhận đơn hàng & Thanh toán thành công"),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #27ae60, #2ecc71); border-radius: 4px;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">✅ Xác nhận & Thanh toán thành công</p>
                </div>

                <!-- Greeting -->
                <div style="margin-bottom: 20px;">
                    <h2 style="color: #27ae60; margin: 0 0 15px 0;">Xin chào ${customerName}!</h2>
                    <p style="margin: 0; line-height: 1.6;">
                        Chúc mừng! Đơn đặt tour của bạn đã được <strong>xác nhận thành công</strong> và chúng tôi đã nhận được thanh toán bằng <strong>tiền mặt</strong>.
                    </p>
                </div>

                <!-- Thông báo kép -->
                <div style="background-color: #d4edda; border: 2px solid #28a745; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <h3 style="color: #155724; margin: 0 0 10px 0;">✅ ĐƠN HÀNG ĐÃ XÁC NHẬN</h3>
                        <h3 style="color: #155724; margin: 0;">💰 THANH TOÁN HOÀN TẤT</h3>
                    </div>
                    <p style="color: #155724; margin: 10px 0 0 0; font-size: 18px; font-weight: bold; text-align: center;">
                        ${totalAmount?.toLocaleString('vi-VN')} VNĐ
                    </p>
                    <p style="color: #155724; margin: 10px 0 0 0; font-size: 14px; text-align: center;">
                        Phương thức: <strong>Tiền mặt</strong>
                    </p>
                </div>

                <!-- Thông tin đơn hàng -->
                <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #495057; margin: 0 0 15px 0;">📋 Thông tin đơn hàng</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Mã đơn hàng:</td>
                            <td style="padding: 8px 0; color: #495057;">${orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Tour:</td>
                            <td style="padding: 8px 0; color: #495057;">${tourName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Ngày khởi hành:</td>
                            <td style="padding: 8px 0; color: #495057;">${new Date(departureDate).toLocaleDateString('vi-VN')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Ngày về:</td>
                            <td style="padding: 8px 0; color: #495057;">${new Date(returnDate).toLocaleDateString('vi-VN')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Số người:</td>
                            <td style="padding: 8px 0; color: #495057;">${totalPeople} người (${adults} người lớn${children > 0 ? `, ${children} trẻ em` : ''}${babies > 0 ? `, ${babies} em bé` : ''}${singleRooms > 0 ? `<small style="color:#856404; font-style:italic;">+ Phụ thu phòng đơn: ${singleRooms} phòng</small>` : ''})</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Tổng tiền:</td>
                            <td style="padding: 8px 0; color: #495057; font-size: 18px; font-weight: bold;">${totalAmount?.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Trạng thái:</td>
                            <td style="padding: 8px 0; color: #27ae60; font-weight: bold;">✅ Đã xác nhận & Đã thanh toán</td>
                        </tr>
                    </table>
                </div>

                <!-- Hướng dẫn tiếp theo -->
                <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #0c5460; margin: 0 0 10px 0;">🎉 Chúc mừng! Các bước tiếp theo:</h4>
                    <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
                        <li>Đơn hàng và thanh toán đều đã hoàn tất</li>
                        <li>Vui lòng chuẩn bị giấy tờ tùy thân cho chuyến đi</li>
                        <li>Nhân viên sẽ liên hệ trước ngày khởi hành 2-3 ngày</li>
                        <li>Đọc kỹ điều khoản và lưu ý về tour</li>
                        <li>Chúc bạn có chuyến đi vui vẻ và an toàn!</li>
                    </ul>
                </div>

                ${generateOrderLookupSection(orderId)}
                ${generateContactInfo(hotline)}
                ${generateEmailFooter()}
            </div>
        `
    };
};

// Tạo template email đã xác nhận (confirmed)
const generateConfirmedTemplate = (orderData) => {
    const {
        customerName,
        orderId,
        tourName,
        departureDate,
        returnDate,
        totalPeople,
        adults,
        children,
        babies = 0,
        singleRooms = 0,
        totalAmount,
        paymentMethod,
        hotline = "0972 122 555"
    } = orderData;

    return {
        subject: generateEmailSubject(orderId, tourName, "Đơn đặt tour đã được xác nhận"),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #27ae60, #2ecc71); border-radius: 4px;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">✅ Xác nhận thành công</p>
                </div>

                <!-- Greeting -->
                <div style="margin-bottom: 20px;">
                    <h2 style="color: #27ae60; margin: 0 0 15px 0;">Xin chào ${customerName}!</h2>
                    <p style="margin: 0; line-height: 1.6;">
                        Chúc mừng! Đơn đặt tour của bạn đã được xác nhận thành công. Hãy chuẩn bị cho chuyến đi tuyệt vời sắp tới!
                    </p>
                </div>

                <!-- Thông tin đơn hàng -->
                <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #495057; margin: 0 0 15px 0;">📋 Thông tin đơn hàng</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Mã đơn hàng:</td>
                            <td style="padding: 8px 0; color: #495057;">${orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Tour:</td>
                            <td style="padding: 8px 0; color: #495057;">${tourName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Ngày khởi hành:</td>
                            <td style="padding: 8px 0; color: #495057;">${new Date(departureDate).toLocaleDateString('vi-VN')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Ngày về:</td>
                            <td style="padding: 8px 0; color: #495057;">${new Date(returnDate).toLocaleDateString('vi-VN')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Số người:</td>
                            <td style="padding: 8px 0; color: #495057;">${totalPeople} người (${adults} người lớn${children > 0 ? `, ${children} trẻ em` : ''}${babies > 0 ? `, ${babies} em bé` : ''}${singleRooms > 0 ? `<small style="color:#856404; font-style:italic;">+ Phụ thu phòng đơn: ${singleRooms} phòng</small>` : ''})</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Tổng tiền:</td>
                            <td style="padding: 8px 0; color: #495057; font-size: 18px; font-weight: bold;">${totalAmount?.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Thanh toán:</td>
                            <td style="padding: 8px 0; color: #495057;">${paymentMethod}</td>
                        </tr>
                    </table>
                </div>

                <!-- Chúc mừng -->
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #155724; margin: 0 0 10px 0;">🎉 Chúc mừng bạn!</h4>
                    <ul style="color: #155724; margin: 0; padding-left: 20px;">
                        <li>Đơn đặt tour đã được xác nhận và xử lý thành công</li>
                        <li>Vui lòng thanh toán theo phương thức đã chọn: <strong>${paymentMethod}</strong></li>
                        <li>Nhân viên sẽ liên hệ với bạn để hướng dẫn chi tiết</li>
                        <li>Chuẩn bị giấy tờ tùy thân cho chuyến đi</li>
                        <li>Đọc kỹ điều khoản và điều kiện tour</li>
                    </ul>
                </div>

                ${generateOrderLookupSection(orderId)}
                ${generateContactInfo(hotline)}
                ${generateEmailFooter()}
            </div>
        `
    };
};

// Tạo template email đã hủy (cancelled)
const generateCancelledTemplate = (orderData) => {
    const {
        customerName,
        orderId,
        tourName,
        totalAmount,
        cancellationReason,
        hotline = "0972 122 555"
    } = orderData;

    return {
        subject: generateEmailSubject(orderId, tourName, "Đơn đặt tour đã bị hủy"),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #e74c3c, #c0392b); border-radius: 4px;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">❌ Đơn bị hủy</p>
                </div>

                <!-- Greeting -->
                <div style="margin-bottom: 20px;">
                    <h2 style="color: #e74c3c; margin: 0 0 15px 0;">Xin chào ${customerName}!</h2>
                    <p style="margin: 0; line-height: 1.6;">
                        Rất tiếc, đơn đặt tour của bạn đã bị hủy. Chúng tôi xin lỗi vì sự bất tiện này.
                    </p>
                </div>

                <!-- Thông tin đơn hàng -->
                <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #495057; margin: 0 0 15px 0;">📋 Thông tin đơn hàng</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Mã đơn hàng:</td>
                            <td style="padding: 8px 0; color: #495057;">${orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Tour:</td>
                            <td style="padding: 8px 0; color: #495057;">${tourName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Tổng tiền:</td>
                            <td style="padding: 8px 0; color: #495057; font-size: 18px; font-weight: bold;">${totalAmount?.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                    </table>
                </div>

                <!-- Thông tin hủy tour -->
                <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #721c24; margin: 0 0 10px 0;">📝 Thông tin hủy tour</h4>
                    <ul style="color: #721c24; margin: 0; padding-left: 20px;">
                        <li><strong>Lý do hủy:</strong> ${cancellationReason || "Sẽ được thông báo qua điện thoại"}</li>
                        <li>Nếu bạn đã thanh toán, chúng tôi sẽ hoàn tiền theo quy định</li>
                        <li>Nhân viên sẽ liên hệ để giải thích chi tiết và hỗ trợ</li>
                        <li>Bạn có thể đặt tour khác hoặc liên hệ hotline: ${hotline}</li>
                    </ul>
                </div>

                ${generateOrderLookupSection(orderId)}
                ${generateContactInfo(hotline)}
                ${generateEmailFooter()}
            </div>
        `
    };
};

// Sử dụng generateCompletedTemplate từ onlinePaymentEmailUtils (tránh trùng lặp)

// Gửi email chờ xác nhận
const sendPendingEmail = async (orderData) => {
    try {
        const transporter = createTransporter();

        const template = generatePendingTemplate(orderData);

        let finalHTML = template.html;

        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: orderData.customerEmail,
            subject: template.subject,
            html: finalHTML
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, data: result };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Tạo template email đã thanh toán tiền mặt thành công (payment confirmed)
const generatePaymentConfirmedTemplate = (orderData) => {
    const {
        customerName,
        orderId,
        tourName,
        departureDate,
        returnDate,
        totalPeople,
        adults,
        children,
        babies = 0,
        singleRooms = 0,
        totalAmount,
        paymentMethod,
        hotline = "0972 122 555"
    } = orderData;

    return {
        subject: generateEmailSubject(orderId, tourName, "Đã thanh toán thành công - Tiền mặt"),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #27ae60, #2ecc71); border-radius: 4px;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">💰 Đã thanh toán</p>
                </div>

                <!-- Greeting -->
                <div style="margin-bottom: 20px;">
                    <h2 style="color: #27ae60; margin: 0 0 15px 0;">Xin chào ${customerName}!</h2>
                    <p style="margin: 0; line-height: 1.6;">
                        Cảm ơn bạn! Chúng tôi đã nhận được thanh toán bằng <strong>tiền mặt</strong> cho đơn đặt tour của bạn.
                    </p>
                </div>

                <!-- Thông báo thanh toán thành công -->
                <div style="background-color: #d4edda; border: 2px solid #28a745; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <h3 style="color: #155724; margin: 0 0 10px 0;">✅ THANH TOÁN THÀNH CÔNG</h3>
                    <p style="color: #155724; margin: 0; font-size: 18px; font-weight: bold;">
                        ${totalAmount?.toLocaleString('vi-VN')} VNĐ
                    </p>
                    <p style="color: #155724; margin: 10px 0 0 0; font-size: 14px;">
                        Phương thức: <strong>Tiền mặt</strong>
                    </p>
                </div>

                <!-- Thông tin đơn hàng -->
                <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #495057; margin: 0 0 15px 0;">📋 Thông tin đơn hàng</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Mã đơn hàng:</td>
                            <td style="padding: 8px 0; color: #495057;">${orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Tour:</td>
                            <td style="padding: 8px 0; color: #495057;">${tourName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Ngày khởi hành:</td>
                            <td style="padding: 8px 0; color: #495057;">${new Date(departureDate).toLocaleDateString('vi-VN')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Ngày về:</td>
                            <td style="padding: 8px 0; color: #495057;">${new Date(returnDate).toLocaleDateString('vi-VN')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Số người:</td>
                            <td style="padding: 8px 0; color: #495057;">${totalPeople} người (${adults} người lớn${children > 0 ? `, ${children} trẻ em` : ''}${babies > 0 ? `, ${babies} em bé` : ''}${singleRooms > 0 ? `<small style="color:#856404; font-style:italic;">+ Phụ thu phòng đơn: ${singleRooms} phòng</small>` : ''})</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Tổng tiền:</td>
                            <td style="padding: 8px 0; color: #495057; font-size: 18px; font-weight: bold;">${totalAmount?.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #495057; font-weight: bold;">Thanh toán:</td>
                            <td style="padding: 8px 0; color: #27ae60; font-weight: bold;">✅ Đã thanh toán (${paymentMethod})</td>
                        </tr>
                    </table>
                </div>

                <!-- Hướng dẫn tiếp theo -->
                <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #0c5460; margin: 0 0 10px 0;">📌 Bước tiếp theo</h4>
                    <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
                        <li>Thanh toán đã hoàn tất, bạn không cần thực hiện thêm thao tác nào</li>
                        <li>Vui lòng chuẩn bị giấy tờ tùy thân cho chuyến đi</li>
                        <li>Nhân viên sẽ liên hệ trước ngày khởi hành 2-3 ngày</li>
                        <li>Đọc kỹ điều khoản và lưu ý về tour</li>
                        <li>Chúc bạn có chuyến đi vui vẻ và an toàn!</li>
                    </ul>
                </div>

                ${generateOrderLookupSection(orderId)}
                ${generateContactInfo(hotline)}
                ${generateEmailFooter()}
            </div>
        `
    };
};

// Gửi email đã xác nhận (khi status = confirmed)
const sendConfirmedEmail = async (orderData) => {
    try {
        const transporter = createTransporter();

        const template = generateConfirmedTemplate(orderData);

        let finalHTML = template.html;

        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: orderData.customerEmail,
            subject: template.subject,
            html: finalHTML
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, data: result };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Gửi email đã xác nhận VÀ đã thanh toán (confirmed + paid cùng lúc)
const sendConfirmedAndPaidEmail = async (orderData) => {
    try {
        const transporter = createTransporter();

        const template = generateConfirmedAndPaidTemplate(orderData);

        let finalHTML = template.html;

        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: orderData.customerEmail,
            subject: template.subject,
            html: finalHTML
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, data: result };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Gửi email đã thanh toán tiền mặt (khi payment status = completed)
const sendPaymentConfirmedEmail = async (orderData) => {
    try {
        const transporter = createTransporter();

        const template = generatePaymentConfirmedTemplate(orderData);

        let finalHTML = template.html;

        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: orderData.customerEmail,
            subject: template.subject,
            html: finalHTML
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, data: result };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Gửi email đã hủy
const sendCancelledEmail = async (orderData) => {
    try {
        const transporter = createTransporter();

        const template = generateCancelledTemplate(orderData);

        let finalHTML = template.html;

        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: orderData.customerEmail,
            subject: template.subject,
            html: finalHTML
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, data: result };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Gửi email đã hoàn thành
const sendCompletedEmail = async (orderData) => {
    try {
        const transporter = createTransporter();

        const template = generateCompletedTemplate(orderData);

        let finalHTML = template.html;

        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: orderData.customerEmail,
            subject: template.subject,
            html: finalHTML
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, data: result };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

module.exports = {
    generatePendingTemplate,
    generateConfirmedTemplate,
    generateConfirmedAndPaidTemplate,
    generatePaymentConfirmedTemplate,
    generateCancelledTemplate,
    generateCompletedTemplate,
    sendPendingEmail,
    sendConfirmedEmail,
    sendConfirmedAndPaidEmail,
    sendPaymentConfirmedEmail,
    sendCancelledEmail,
    sendCompletedEmail
};
