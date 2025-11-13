const { createTransporter, generateContactInfo, generateEmailFooter, generateEmailSubject, generateOrderLookupSection } = require('./emailUtils');

// Tạo template email thanh toán thành công
const generateSuccessPaymentTemplate = (orderData) => {
    const {
        customerName,
        orderId,
        tourName,
        totalAmount,
        paymentMethod,
        transactionId,
        paidAt,
        adults = 0,
        children = 0,
        babies = 0,
        singleRooms = 0,
        hotline = "0972 122 555"
    } = orderData;

    return {
        subject: generateEmailSubject(orderId, tourName, "Thanh toán thành công"),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #27ae60, #2ecc71); border-radius: 4px;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">✅ Thanh toán thành công</p>
                </div>

                <!-- Greeting -->
                <div style="margin-bottom: 20px;">
                    <h2 style="color: #27ae60; margin: 0 0 15px 0;">Xin chào ${customerName}!</h2>
                    <p style="margin: 0; line-height: 1.6;">
                        Cảm ơn bạn đã thanh toán thành công cho đơn hàng tại ND Travel. 
                        Chúng tôi đã nhận được thanh toán của bạn và đang xử lý đơn hàng.
                    </p>
                </div>

                <!-- Thông tin thanh toán -->
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #155724; margin: 0 0 15px 0;">🎉 Thông tin thanh toán</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Mã đơn hàng:</td>
                            <td style="padding: 8px 0; color: #155724;">${orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Tour:</td>
                            <td style="padding: 8px 0; color: #155724;">${tourName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Số tiền:</td>
                            <td style="padding: 8px 0; color: #155724; font-size: 18px; font-weight: bold;">${totalAmount?.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Phương thức:</td>
                            <td style="padding: 8px 0; color: #155724;">${paymentMethod}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Mã giao dịch:</td>
                            <td style="padding: 8px 0; color: #155724;">${transactionId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Thời gian:</td>
                            <td style="padding: 8px 0; color: #155724;">${new Date(paidAt).toLocaleString('vi-VN')}</td>
                        </tr>
                        ${adults > 0 ? `
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Số khách:</td>
                            <td style="padding: 8px 0; color: #155724;">
                                ${adults} người lớn${children > 0 ? `, ${children} trẻ em` : ''}${babies > 0 ? `, ${babies} em bé` : ''}
                                ${singleRooms > 0 ? `<small style="color:#856404; font-style:italic;">+ Phụ thu phòng đơn: ${singleRooms} phòng</small>` : ''}
                            </td>
                        </tr>
                        ` : ''}
                    </table>
                </div>

                <!-- Bước tiếp theo -->
                <div style="background-color: #e8f4fd; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #0c5460; margin: 0 0 10px 0;">📋 Bước tiếp theo</h4>
                    <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
                        <li>Đơn hàng của bạn đã được xác nhận và đang được xử lý</li>
                        <li>Nhân viên sẽ liên hệ với bạn trong vòng 24 giờ để xác nhận thông tin</li>
                        <li>Vui lòng chuẩn bị giấy tờ tùy thân cho chuyến đi</li>
                        <li>Theo dõi email để nhận thông tin cập nhật về tour</li>
                    </ul>
                </div>

                ${generateOrderLookupSection(orderId)}
                ${generateContactInfo(hotline)}
                ${generateEmailFooter()}
            </div>
        `
    };
};

// Tạo template email thanh toán thất bại
const generateFailedPaymentTemplate = (orderData) => {
    const {
        customerName,
        orderId,
        tourName,
        totalAmount,
        paymentMethod,
        failureReason,
        retryPaymentUrl,
        hotline = "0972 122 555"
    } = orderData;

    return {
        subject: generateEmailSubject(orderId, tourName, "Thanh toán thất bại"),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #e74c3c, #c0392b); border-radius: 4px;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">❌ Thanh toán thất bại</p>
                </div>

                <!-- Greeting -->
                <div style="margin-bottom: 20px;">
                    <h2 style="color: #e74c3c; margin: 0 0 15px 0;">Xin chào ${customerName}!</h2>
                    <p style="margin: 0; line-height: 1.6;">
                        Rất tiếc, thanh toán cho đơn hàng của bạn đã thất bại. 
                        Vui lòng thử lại hoặc liên hệ với chúng tôi để được hỗ trợ.
                    </p>
                </div>

                <!-- Thông tin đơn hàng -->
                <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #721c24; margin: 0 0 15px 0;">📋 Thông tin đơn hàng</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #721c24; font-weight: bold;">Mã đơn hàng:</td>
                            <td style="padding: 8px 0; color: #721c24;">${orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #721c24; font-weight: bold;">Tour:</td>
                            <td style="padding: 8px 0; color: #721c24;">${tourName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #721c24; font-weight: bold;">Số tiền:</td>
                            <td style="padding: 8px 0; color: #721c24; font-size: 18px; font-weight: bold;">${totalAmount?.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #721c24; font-weight: bold;">Phương thức:</td>
                            <td style="padding: 8px 0; color: #721c24;">${paymentMethod}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #721c24; font-weight: bold;">Lý do thất bại:</td>
                            <td style="padding: 8px 0; color: #721c24;">${failureReason || 'Không xác định'}</td>
                        </tr>
                    </table>
                </div>

                <!-- Nút thanh toán lại -->
                ${retryPaymentUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${retryPaymentUrl}" 
                       style="display: inline-block; background-color: #e74c3c; color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                        🔄 Thanh toán lại
                    </a>
                    <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
                        Nhấn vào nút trên để thử thanh toán lại
                    </p>
                </div>
                ` : ''}

                <!-- Hướng dẫn -->
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #856404; margin: 0 0 10px 0;">💡 Hướng dẫn xử lý</h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px;">
                        <li>Kiểm tra lại thông tin thẻ/tài khoản ngân hàng</li>
                        <li>Đảm bảo tài khoản có đủ số dư</li>
                        <li>Thử lại sau vài phút</li>
                        <li>Liên hệ ngân hàng nếu vấn đề vẫn tiếp tục</li>
                        <li>Gọi hotline ${hotline} để được hỗ trợ trực tiếp</li>
                    </ul>
                </div>

                ${generateOrderLookupSection(orderId)}
                ${generateContactInfo(hotline)}
                ${generateEmailFooter()}
            </div>
        `
    };
};

// Gửi email thanh toán thành công
const sendSuccessPaymentEmail = async (orderData) => {
    try {
        const transporter = createTransporter();

        const template = generateSuccessPaymentTemplate(orderData);

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

// Gửi email thanh toán thất bại
const sendFailedPaymentEmail = async (orderData) => {
    try {
        const transporter = createTransporter();

        const template = generateFailedPaymentTemplate(orderData);

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

// Tạo template email hoàn tiền
const generateRefundTemplate = (orderData) => {
    const {
        customerName,
        orderId,
        tourName,
        refundAmount,
        refundReason,
        hotline = "0972 122 555"
    } = orderData;

    return {
        subject: generateEmailSubject(orderId, tourName, "Thông báo hoàn tiền"),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f39c12, #e67e22); border-radius: 4px;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">💰 Thông báo hoàn tiền</p>
                </div>

                <!-- Greeting -->
                <div style="margin-bottom: 20px;">
                    <h2 style="color: #f39c12; margin: 0 0 15px 0;">Xin chào ${customerName}!</h2>
                    <p style="margin: 0; line-height: 1.6;">
                        Chúng tôi xin thông báo về việc hoàn tiền cho đơn hàng của bạn.
                        Nhân viên sẽ liên hệ với bạn để thực hiện hoàn tiền.
                    </p>
                </div>

                <!-- Thông tin hoàn tiền -->
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #856404; margin: 0 0 15px 0;">💰 Thông tin hoàn tiền</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #856404; font-weight: bold;">Mã đơn hàng:</td>
                            <td style="padding: 8px 0; color: #856404;">${orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #856404; font-weight: bold;">Tour:</td>
                            <td style="padding: 8px 0; color: #856404;">${tourName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #856404; font-weight: bold;">Số tiền hoàn:</td>
                            <td style="padding: 8px 0; color: #856404; font-size: 18px; font-weight: bold;">${refundAmount?.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #856404; font-weight: bold;">Lý do hoàn tiền:</td>
                            <td style="padding: 8px 0; color: #856404;">${refundReason || 'Theo yêu cầu khách hàng'}</td>
                        </tr>
                    </table>
                </div>

                <!-- Hướng dẫn -->
                <div style="background-color: #e8f4fd; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #0c5460; margin: 0 0 10px 0;">📋 Hướng dẫn hoàn tiền</h4>
                    <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
                        <li>Nhân viên sẽ liên hệ với bạn để xác nhận thông tin hoàn tiền</li>
                        <li>Chuẩn bị thông tin tài khoản ngân hàng (số tài khoản, tên chủ tài khoản, ngân hàng)</li>
                        <li>Thời gian hoàn tiền: 3-7 ngày làm việc</li>
                        <li>Liên hệ hotline ${hotline} nếu cần hỗ trợ</li>
                    </ul>
                </div>

                ${generateOrderLookupSection(orderId)}
                ${generateContactInfo(hotline)}
                ${generateEmailFooter()}
            </div>
        `
    };
};

// Tạo template email hoàn thành (có thể dùng chung với tiền mặt)
const generateCompletedTemplate = (orderData) => {
    const {
        customerName,
        orderId,
        tourName,
        completedDate,
        reviewUrl,
        hotline = "0972 122 555"
    } = orderData;

    return {
        subject: generateEmailSubject(orderId, tourName, "Tour đã hoàn thành"),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #9b59b6, #8e44ad); border-radius: 4px;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">🎉 Tour đã hoàn thành</p>
                </div>

                <!-- Greeting -->
                <div style="margin-bottom: 20px;">
                    <h2 style="color: #9b59b6; margin: 0 0 15px 0;">Xin chào ${customerName}!</h2>
                    <p style="margin: 0; line-height: 1.6;">
                        Cảm ơn bạn đã tham gia tour cùng ND Travel!
                        Chúng tôi hy vọng bạn đã có những trải nghiệm tuyệt vời trong chuyến đi.
                    </p>
                </div>

                <!-- Thông tin tour -->
                <div style="background-color: #f4f1fb; border: 1px solid #d1c4e9; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #6a1b9a; margin: 0 0 15px 0;">🎯 Thông tin tour</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #6a1b9a; font-weight: bold;">Mã đơn hàng:</td>
                            <td style="padding: 8px 0; color: #6a1b9a;">${orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6a1b9a; font-weight: bold;">Tour:</td>
                            <td style="padding: 8px 0; color: #6a1b9a;">${tourName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6a1b9a; font-weight: bold;">Ngày hoàn thành:</td>
                            <td style="padding: 8px 0; color: #6a1b9a;">${new Date(completedDate).toLocaleDateString('vi-VN')}</td>
                        </tr>
                    </table>
                </div>

                <!-- Nút đánh giá -->
                ${reviewUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${reviewUrl}"
                       style="display: inline-block; background-color: #9b59b6; color: white; padding: 15px 30px;
                              text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                        ⭐ Đánh giá tour của bạn
                    </a>
                    <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
                        Chia sẻ trải nghiệm của bạn để giúp chúng tôi cải thiện dịch vụ
                    </p>
                </div>
                ` : ''}

                <!-- Cảm ơn -->
                <div style="background-color: #e8f5e8; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #155724; margin: 0 0 10px 0;">💝 Cảm ơn bạn!</h4>
                    <ul style="color: #155724; margin: 0; padding-left: 20px;">
                        <li>Cảm ơn bạn đã tin tưởng và lựa chọn ND Travel</li>
                        <li>Hy vọng bạn đã có những kỷ niệm đẹp trong chuyến đi</li>
                        <li>Hãy chia sẻ đánh giá để giúp chúng tôi phục vụ tốt hơn</li>
                        <li>Chúng tôi mong được đồng hành cùng bạn trong những chuyến đi tiếp theo</li>
                    </ul>
                </div>

                ${generateContactInfo(hotline)}
                ${generateEmailFooter()}
            </div>
        `
    };
};

// Gửi email hoàn tiền
const sendRefundEmail = async (orderData) => {
    try {
        const transporter = createTransporter();

        const template = generateRefundTemplate(orderData);

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

// Gửi email hoàn thành
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

// Tạo template email thông báo hủy tour với hoàn tiền tự động
const generateCancelledAutoRefundTemplate = (orderData) => {
    const {
        customerName,
        orderId,
        tourName,
        totalAmount,
        paymentMethod,
        cancellationReason,
        hotline = "0972 122 555"
    } = orderData;

    return {
        subject: generateEmailSubject(orderId, tourName, "Đơn hàng đã được hủy - Hoàn tiền tự động"),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f39c12, #e67e22); border-radius: 4px;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">🔄 Đang xử lý hoàn tiền</p>
                </div>

                <!-- Greeting -->
                <div style="margin-bottom: 20px;">
                    <h2 style="color: #f39c12; margin: 0 0 15px 0;">Xin chào ${customerName}!</h2>
                    <p style="margin: 0; line-height: 1.6;">
                        Đơn hàng <strong>${orderId}</strong> của bạn đã được hủy. 
                        Chúng tôi đang xử lý hoàn tiền tự động về ${paymentMethod === 'VNPay' ? 'tài khoản ngân hàng' : 'ví MoMo'} gốc của bạn.
                    </p>
                </div>

                <!-- Thông tin đơn hàng -->
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #856404; margin: 0 0 15px 0;">📋 Thông tin đơn hàng</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #856404; font-weight: bold;">Mã đơn hàng:</td>
                            <td style="padding: 8px 0; color: #856404;">${orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #856404; font-weight: bold;">Tour:</td>
                            <td style="padding: 8px 0; color: #856404;">${tourName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #856404; font-weight: bold;">Số tiền hoàn:</td>
                            <td style="padding: 8px 0; color: #856404; font-size: 18px; font-weight: bold;">${totalAmount?.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #856404; font-weight: bold;">Phương thức thanh toán:</td>
                            <td style="padding: 8px 0; color: #856404;">${paymentMethod}</td>
                        </tr>
                        ${cancellationReason ? `
                        <tr>
                            <td style="padding: 8px 0; color: #856404; font-weight: bold;">Lý do hủy:</td>
                            <td style="padding: 8px 0; color: #856404;">${cancellationReason}</td>
                        </tr>
                        ` : ''}
                    </table>
                </div>

                <!-- Thông tin hoàn tiền -->
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #155724; margin: 0 0 10px 0;">💰 Hoàn tiền tự động</h4>
                    <ul style="color: #155724; margin: 0; padding-left: 20px;">
                        <li>Hệ thống đang tự động xử lý hoàn tiền qua ${paymentMethod}</li>
                        <li>Tiền sẽ được hoàn về ${paymentMethod === 'VNPay' ? 'tài khoản ngân hàng' : 'ví MoMo'} gốc</li>
                        <li>Thời gian hoàn tiền: 1-3 ngày làm việc</li>
                        <li>Bạn sẽ nhận được email xác nhận khi hoàn tiền thành công</li>
                    </ul>
                </div>

                ${generateContactInfo(hotline)}
                ${generateEmailFooter()}
            </div>
        `
    };
};

// Tạo template email hoàn tiền tự động thành công
const generateAutoRefundSuccessTemplate = (orderData) => {
    const {
        customerName,
        orderId,
        tourName,
        refundAmount,
        paymentMethod,
        refundedAt,
        requestId,
        cancellationReason,
        hotline = "0972 122 555"
    } = orderData;

    return {
        subject: generateEmailSubject(orderId, tourName, "Hoàn tiền thành công"),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #27ae60, #2ecc71); border-radius: 4px;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">✅ Hoàn tiền thành công</p>
                </div>

                <!-- Greeting -->
                <div style="margin-bottom: 20px;">
                    <h2 style="color: #27ae60; margin: 0 0 15px 0;">Xin chào ${customerName}!</h2>
                    <p style="margin: 0; line-height: 1.6;">
                        Chúng tôi đã hoàn tiền thành công cho đơn hàng <strong>${orderId}</strong>. 
                        Số tiền đã được chuyển về ${paymentMethod === 'VNPay' ? 'tài khoản ngân hàng' : 'ví MoMo'} gốc của bạn.
                    </p>
                </div>

                <!-- Thông tin hoàn tiền -->
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #155724; margin: 0 0 15px 0;">💰 Chi tiết hoàn tiền</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Mã đơn hàng:</td>
                            <td style="padding: 8px 0; color: #155724;">${orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Tour:</td>
                            <td style="padding: 8px 0; color: #155724;">${tourName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Số tiền hoàn:</td>
                            <td style="padding: 8px 0; color: #155724; font-size: 18px; font-weight: bold;">${refundAmount?.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Phương thức:</td>
                            <td style="padding: 8px 0; color: #155724;">${paymentMethod}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Thời gian hoàn:</td>
                            <td style="padding: 8px 0; color: #155724;">${new Date(refundedAt).toLocaleString('vi-VN')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Mã giao dịch:</td>
                            <td style="padding: 8px 0; color: #155724;">${requestId}</td>
                        </tr>
                        ${cancellationReason ? `
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-weight: bold;">Lý do hủy:</td>
                            <td style="padding: 8px 0; color: #155724;">${cancellationReason}</td>
                        </tr>
                        ` : ''}
                    </table>
                </div>

                <!-- Thông báo quan trọng -->
                <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #0c5460; margin: 0 0 10px 0;">ℹ️ Lưu ý quan trọng</h4>
                    <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
                        <li>Tiền đã được hoàn về ${paymentMethod === 'VNPay' ? 'tài khoản ngân hàng' : 'ví MoMo'} gốc của bạn</li>
                        <li>Vui lòng kiểm tra ${paymentMethod === 'VNPay' ? 'tài khoản ngân hàng' : 'ví MoMo'} trong vòng 24 giờ</li>
                        <li>Nếu có thắc mắc, vui lòng liên hệ với chúng tôi</li>
                        <li>Cảm ơn bạn đã sử dụng dịch vụ của ND Travel</li>
                    </ul>
                </div>

                ${generateContactInfo(hotline)}
                ${generateEmailFooter()}
            </div>
        `
    };
};

// Tạo template email hoàn tiền tự động thất bại
const generateAutoRefundFailedTemplate = (orderData) => {
    const {
        customerName,
        orderId,
        tourName,
        totalAmount,
        paymentMethod,
        errorMessage,
        cancellationReason,
        hotline = "0972 122 555"
    } = orderData;

    return {
        subject: generateEmailSubject(orderId, tourName, "Hoàn tiền cần xử lý thủ công"),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #e74c3c, #c0392b); border-radius: 4px;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">⚠️ Cần xử lý thủ công</p>
                </div>

                <!-- Greeting -->
                <div style="margin-bottom: 20px;">
                    <h2 style="color: #e74c3c; margin: 0 0 15px 0;">Xin chào ${customerName}!</h2>
                    <p style="margin: 0; line-height: 1.6;">
                        Đơn hàng <strong>${orderId}</strong> của bạn đã được hủy nhưng hoàn tiền tự động gặp sự cố. 
                        Chúng tôi sẽ xử lý hoàn tiền thủ công và liên hệ với bạn trong thời gian sớm nhất.
                    </p>
                </div>

                <!-- Thông tin đơn hàng -->
                <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #721c24; margin: 0 0 15px 0;">📋 Thông tin đơn hàng</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #721c24; font-weight: bold;">Mã đơn hàng:</td>
                            <td style="padding: 8px 0; color: #721c24;">${orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #721c24; font-weight: bold;">Tour:</td>
                            <td style="padding: 8px 0; color: #721c24;">${tourName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #721c24; font-weight: bold;">Số tiền cần hoàn:</td>
                            <td style="padding: 8px 0; color: #721c24; font-size: 18px; font-weight: bold;">${totalAmount?.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #721c24; font-weight: bold;">Phương thức:</td>
                            <td style="padding: 8px 0; color: #721c24;">${paymentMethod}</td>
                        </tr>
                        ${cancellationReason ? `
                        <tr>
                            <td style="padding: 8px 0; color: #721c24; font-weight: bold;">Lý do hủy:</td>
                            <td style="padding: 8px 0; color: #721c24;">${cancellationReason}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td style="padding: 8px 0; color: #721c24; font-weight: bold;">Lý do lỗi:</td>
                            <td style="padding: 8px 0; color: #721c24;">${errorMessage}</td>
                        </tr>
                    </table>
                </div>

                <!-- Hướng dẫn xử lý -->
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #856404; margin: 0 0 10px 0;">🔧 Chúng tôi sẽ làm gì</h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px;">
                        <li>Xử lý hoàn tiền thủ công trong vòng 1-3 ngày làm việc</li>
                        <li>Liên hệ với bạn để xác nhận thông tin hoàn tiền</li>
                        <li>Đảm bảo bạn nhận được đầy đủ số tiền đã thanh toán</li>
                        <li>Gửi xác nhận khi hoàn tiền hoàn tất</li>
                    </ul>
                </div>

                <!-- Liên hệ hỗ trợ -->
                <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h4 style="color: #0c5460; margin: 0 0 10px 0;">📞 Cần hỗ trợ ngay?</h4>
                    <p style="color: #0c5460; margin: 0;">
                        Vui lòng liên hệ hotline <strong>${hotline}</strong> 
                        để được hỗ trợ nhanh chóng về hoàn tiền đơn hàng <strong>${orderId}</strong>
                    </p>
                </div>

                ${generateContactInfo(hotline)}
                ${generateEmailFooter()}
            </div>
        `
    };
};

// Gửi email thông báo hủy tour với hoàn tiền tự động
const sendCancelledAutoRefundEmail = async (orderData) => {
    try {
        const transporter = createTransporter();
        const template = generateCancelledAutoRefundTemplate(orderData);

        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: orderData.customerEmail,
            subject: template.subject,
            html: template.html
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, data: result };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Gửi email hoàn tiền tự động thành công
const sendAutoRefundSuccessEmail = async (orderData) => {
    try {
        const transporter = createTransporter();
        const template = generateAutoRefundSuccessTemplate(orderData);

        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: orderData.customerEmail,
            subject: template.subject,
            html: template.html
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, data: result };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Gửi email hoàn tiền tự động thất bại
const sendAutoRefundFailedEmail = async (orderData) => {
    try {
        const transporter = createTransporter();
        const template = generateAutoRefundFailedTemplate(orderData);

        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: orderData.customerEmail,
            subject: template.subject,
            html: template.html
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, data: result };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Gửi email xác nhận đơn hàng (admin confirm order)
 * @param {Object} orderData - Thông tin đơn hàng
 * @returns {Promise<Object>} - Kết quả gửi email
 */
const sendOrderConfirmationEmail = async (orderData) => {
    try {
        const {
            customerEmail,
            customerName,
            orderId,
            tourName,
            totalAmount,
            paymentMethod,
            transactionId,
            paidAt,
            adults = 0,
            children = 0,
            babies = 0,
            singleRooms = 0,
            hotline = "0972 122 555"
        } = orderData;

        const emailTemplate = {
            subject: generateEmailSubject(orderId, tourName, "Xác nhận đơn hàng"),
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #3498db, #2980b9); border-radius: 4px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">✅ Đơn hàng đã được xác nhận</p>
                    </div>

                    <!-- Greeting -->
                    <div style="margin-bottom: 20px;">
                        <h2 style="color: #3498db; margin: 0 0 15px 0;">Xin chào ${customerName}!</h2>
                        <p style="margin: 0; line-height: 1.6;">
                            Đơn hàng của bạn đã được xác nhận thành công! 🎉<br>
                            Chúng tôi đã xử lý thanh toán và xác nhận đặt chỗ tour cho bạn.
                        </p>
                    </div>

                    <!-- Thông tin xác nhận -->
                    <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 5px; padding: 20px; margin: 20px 0;">
                        <h3 style="color: #1976d2; margin: 0 0 15px 0;">📋 Thông tin đơn hàng</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #1976d2; font-weight: bold;">Mã đơn hàng:</td>
                                <td style="padding: 8px 0; color: #424242;">${orderId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #1976d2; font-weight: bold;">Tên tour:</td>
                                <td style="padding: 8px 0; color: #424242;">${tourName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #1976d2; font-weight: bold;">Tổng tiền:</td>
                                <td style="padding: 8px 0; color: #424242; font-weight: bold;">${totalAmount?.toLocaleString('vi-VN')} VNĐ</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #1976d2; font-weight: bold;">Phương thức TT:</td>
                                <td style="padding: 8px 0; color: #424242;">${paymentMethod}</td>
                            </tr>
                            ${transactionId ? `
                            <tr>
                                <td style="padding: 8px 0; color: #1976d2; font-weight: bold;">Mã giao dịch:</td>
                                <td style="padding: 8px 0; color: #424242;">${transactionId}</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="padding: 8px 0; color: #1976d2; font-weight: bold;">Số khách:</td>
                                <td style="padding: 8px 0; color: #424242;">
                                    ${adults} người lớn${children > 0 ? `, ${children} trẻ em` : ''}${babies > 0 ? `, ${babies} trẻ nhỏ` : ''}${singleRooms > 0 ? `, ${singleRooms} phòng đơn` : ''}
                                </td>
                            </tr>
                            ${paidAt ? `
                            <tr>
                                <td style="padding: 8px 0; color: #1976d2; font-weight: bold;">Thời gian TT:</td>
                                <td style="padding: 8px 0; color: #424242;">${new Date(paidAt).toLocaleString('vi-VN')}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>

                    <!-- Thông báo quan trọng -->
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                        <h4 style="color: #856404; margin: 0 0 10px 0;">📞 Thông tin quan trọng:</h4>
                        <ul style="color: #856404; margin: 0; padding-left: 20px;">
                            <li>Đơn hàng của bạn đã được xác nhận và đặt chỗ thành công</li>
                            <li>Chúng tôi sẽ liên hệ với bạn trước ngày khởi hành để xác nhận thông tin</li>
                            <li>Vui lòng giữ liên lạc qua số điện thoại đã đăng ký</li>
                            <li>Mọi thắc mắc xin liên hệ: <strong>${hotline}</strong></li>
                        </ul>
                    </div>

                    ${generateOrderLookupSection(orderId)}
                    ${generateContactInfo(hotline)}
                    ${generateEmailFooter()}
                </div>
            `
        };

        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: orderData.customerEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendSuccessPaymentEmail,
    sendFailedPaymentEmail,
    sendRefundEmail,
    sendCompletedEmail,
    sendCancelledAutoRefundEmail,
    sendAutoRefundSuccessEmail,
    sendAutoRefundFailedEmail,
    sendOrderConfirmationEmail,
    generateSuccessPaymentTemplate,
    generateFailedPaymentTemplate,
    generateRefundTemplate,
    generateCompletedTemplate,
    generateCancelledAutoRefundTemplate,
    generateAutoRefundSuccessTemplate,
    generateAutoRefundFailedTemplate
};
