const emailUtils = require('../utils/emailUtils');

// Gửi email thông báo contact form cho nhân viên
const sendContactNotificationToStaff = async (contactData) => {
    try {
        const transporter = emailUtils.createTransporter();

        const {
            name,
            email,
            phone,
            content,
            staffEmail = process.env.STAFF_EMAIL || process.env.EMAIL_USER
        } = contactData;

        const mailOptions = {
            from: `"ND Travel Contact Form" <${process.env.EMAIL_USER}>`,
            to: staffEmail,
            subject: `[ND Travel] Câu hỏi mới từ ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #3498db, #2980b9); border-radius: 4px;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">CÂU HỎI MỚI</h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 14px;">Có khách hàng gửi câu hỏi qua website</p>
                    </div>

                    <!-- Customer Info -->
                    <div style="background-color: #fff; padding: 20px; margin-bottom: 20px; border-radius: 5px; border: 1px solid #e9ecef;">
                        <h3 style="color: #2c3e50; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #7f8c8d; padding-bottom: 8px;">
                            Thông tin khách hàng
                        </h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold; width: 30%;">Tên khách hàng:</td>
                                <td style="padding: 8px 0; color: #2c3e50; font-weight: bold;">${name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold;">Email:</td>
                                <td style="padding: 8px 0; color: #2c3e50;">
                                    <a href="mailto:${email}" style="color: #3498db; text-decoration: none;">${email}</a>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold;">Số điện thoại:</td>
                                <td style="padding: 8px 0; color: #2c3e50;">
                                    <a href="tel:${phone}" style="color: #3498db; text-decoration: none;">${phone}</a>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Question Content -->
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                        <h3 style="color: #2c3e50; margin: 0 0 15px 0; border-bottom: 1px solid #ccc; padding-bottom: 5px;">
                            Nội dung câu hỏi
                        </h3>
                        <div style="background-color: white; padding: 15px; border-radius: 4px; border-left: 4px solid #3498db;">
                            <p style="color: #2c3e50; margin: 0; line-height: 1.6; white-space: pre-wrap;">${content}</p>
                        </div>
                    </div>

                    <!-- Action Required -->
                    <div style="background-color: #e8f6f3; padding: 20px; margin-bottom: 20px; border-radius: 5px;">
                        <h3 style="color: #27ae60; margin-top: 0; margin-bottom: 15px;">Cần thực hiện</h3>
                        <ul style="color: #2c3e50; line-height: 1.6; margin: 0; padding-left: 20px;">
                            <li><strong>Liên hệ khách hàng trong vòng 24h</strong> để trả lời câu hỏi</li>
                            <li>Kiểm tra thông tin tour và dịch vụ liên quan</li>
                            <li>Chuẩn bị câu trả lời chi tiết và chính xác</li>
                            <li>Cập nhật hệ thống CRM nếu có</li>
                        </ul>
                    </div>

                    <!-- Quick Actions -->
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="mailto:${email}?subject=Re: Câu hỏi từ ND Travel&body=Xin chào ${name},%0D%0A%0D%0ACảm ơn bạn đã gửi câu hỏi đến ND Travel.%0D%0A%0D%0A" 
                           style="display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 0 10px;">
                            Trả lời email
                        </a>
                        <a href="tel:${phone}" 
                           style="display: inline-block; background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 0 10px;">
                            Gọi điện
                        </a>
                    </div>

                    <!-- Footer -->
                    <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center; color: #7f8c8d; font-size: 12px;">
                        <p style="margin: 0 0 8px 0;">Thời gian nhận câu hỏi: ${new Date().toLocaleString('vi-VN')}</p>
                        <p style="margin: 0;">Email tự động từ hệ thống ND Travel</p>
                    </div>
                </div>
            `
        };

        return await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending contact notification to staff:', error);
        throw error;
    }
};

// Gửi email xác nhận cho khách hàng
const sendContactConfirmationToCustomer = async (contactData) => {
    try {
        const transporter = emailUtils.createTransporter();

        const {
            name,
            email,
            content,
            hotline = "0972 122 555"
        } = contactData;

        const mailOptions = {
            from: `"ND Travel" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `[ND Travel] Cảm ơn bạn đã gửi câu hỏi`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #ff6b35, #f7931e); border-radius: 4px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">ND Travel</h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Cảm ơn bạn đã liên hệ</p>
                    </div>

                    <!-- Greeting -->
                    <div style="margin-bottom: 25px;">
                        <h2 style="color: #2c3e50; margin: 0 0 15px 0;">Xin chào ${name},</h2>
                        <p style="color: #34495e; line-height: 1.6; margin: 0;">Cảm ơn bạn đã gửi câu hỏi đến ND Travel. Chúng tôi đã nhận được thông tin của bạn và sẽ phản hồi trong thời gian sớm nhất.</p>
                    </div>

                    <!-- Question Summary -->
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 25px;">
                        <h3 style="color: #2c3e50; margin: 0 0 15px 0; border-bottom: 2px solid #3498db; padding-bottom: 5px;">📋 Tóm tắt câu hỏi của bạn</h3>
                        <div style="background-color: white; padding: 15px; border-radius: 4px; border-left: 4px solid #3498db;">
                            <p style="color: #2c3e50; margin: 0; line-height: 1.6; white-space: pre-wrap;">${content}</p>
                        </div>
                    </div>

                    <!-- Next Steps -->
                    <div style="background-color: #e8f4fd; padding: 20px; border-radius: 5px; margin-bottom: 25px;">
                        <h3 style="color: #0056b3; margin: 0 0 15px 0;">Bước tiếp theo</h3>
                        <ul style="color: #0056b3; margin: 0; padding-left: 20px;">
                            <li>Chúng tôi sẽ xem xét câu hỏi của bạn một cách cẩn thận</li>
                            <li>Nhân viên tư vấn sẽ liên hệ với bạn trong vòng 24 giờ</li>
                            <li>Chúng tôi sẽ cung cấp thông tin chi tiết và chính xác nhất</li>
                            <li>Nếu cần hỗ trợ khẩn cấp, vui lòng gọi hotline: ${hotline}</li>
                        </ul>
                    </div>

                    <!-- Contact Info -->
                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin-bottom: 25px;">
                        <h3 style="color: #856404; margin: 0 0 15px 0;">Thông tin liên hệ</h3>
                        <div style="color: #856404;">
                            <p style="margin: 5px 0;"><strong>Hotline:</strong> ${hotline}</p>
                            <p style="margin: 5px 0;"><strong>Email:</strong> contact@ndtravel.com</p>
                            <p style="margin: 5px 0;"><strong>Website:</strong> www.ndtravel.com</p>
                            <p style="margin: 5px 0;"><strong>Hỗ trợ:</strong> 24/7</p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center; color: #7f8c8d; font-size: 12px;">
                        <p style="margin: 0 0 8px 0;">Thời gian gửi: ${new Date().toLocaleString('vi-VN')}</p>
                        <p style="margin: 0;">Email tự động từ hệ thống ND Travel</p>
                        <p style="margin: 8px 0 0 0;">Cảm ơn bạn đã tin tưởng và lựa chọn dịch vụ của chúng tôi!</p>
                    </div>
                </div>
            `
        };

        return await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending contact confirmation to customer:', error);
        throw error;
    }
};

// Xử lý gửi contact form
const submitContactForm = async (req, res) => {
    try {
        const { name, email, phone, content } = req.body;

        // Validate required fields
        const validationErrors = {};
        
        if (!name || name.trim() === '') {
            validationErrors.name = "Tên không được để trống";
        }
        
        if (!email || email.trim() === '') {
            validationErrors.email = "Email không được để trống";
        } else if (email !== 'no-email@ndtravel.com' && !emailUtils.validateEmail(email)) {
            validationErrors.email = "Email không hợp lệ";
        }
        
        if (!phone || phone.trim() === '') {
            validationErrors.phone = "Số điện thoại không được để trống";
        } else {
            // Vietnamese phone number validation
            const cleanPhone = phone.replace(/[\s\-()]/g, '');
            if (!/^(0[3|5|7|8|9])+([0-9]{8})$/.test(cleanPhone)) {
                validationErrors.phone = "Số điện thoại phải có 10 chữ số";
            }
        }
        
        if (!content || content.trim() === '') {
            validationErrors.content = "Nội dung câu hỏi không được để trống";
        }

        // Check if there are validation errors
        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({
                success: false,
                message: "Dữ liệu không hợp lệ",
                errors: validationErrors
            });
        }

        // Prepare contact data
        const contactData = {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            content: content.trim()
        };

        // Send notification to staff
        await sendContactNotificationToStaff(contactData);

        // Send confirmation to customer only if email is valid
        if (email !== 'no-email@ndtravel.com') {
            await sendContactConfirmationToCustomer(contactData);
        }

        res.status(200).json({
            success: true,
            message: "Câu hỏi đã được gửi thành công. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất."
        });

    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi gửi câu hỏi. Vui lòng thử lại sau."
        });
    }
};

module.exports = {
    submitContactForm,
    sendContactNotificationToStaff,
    sendContactConfirmationToCustomer
};
