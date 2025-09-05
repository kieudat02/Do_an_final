import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../services/axiosInstance';
import './RefundForm.scss';

/**
 * Component form hoàn tiền cho thanh toán trực tuyến
 */
const RefundForm = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        customerPhone: '',
        notes: ''
    });

    // Danh sách ngân hàng phổ biến
    const popularBanks = [
        'Vietcombank',
        'VietinBank',
        'BIDV',
        'Agribank',
        'Techcombank',
        'MBBank',
        'VPBank',
        'ACB',
        'SHB',
        'Sacombank',
        'TPBank',
        'HDBank',
        'VIB',
        'LienVietPostBank',
        'OCB',
        'Khác'
    ];

    // Lấy thông tin đơn hàng
    useEffect(() => {
        fetchOrderData();
    }, [orderId]);

    const fetchOrderData = async () => {
        try {
            const response = await axiosInstance.get(`/api/public/refund/form/${orderId}`);
            if (response.data.success) {
                setOrderData(response.data.data);
                // Pre-fill customer name và phone nếu có
                setFormData(prev => ({
                    ...prev,
                    accountHolderName: response.data.data.customerName,
                    customerPhone: response.data.data.customerPhone || ''
                }));
            } else {
                toast.error(response.data.message);
                navigate('/');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể lấy thông tin đơn hàng');
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate form
        if (!formData.bankName || !formData.accountNumber || !formData.accountHolderName) {
            toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        // Validate account number
        if (!/^\d{8,20}$/.test(formData.accountNumber)) {
            toast.error('Số tài khoản phải từ 8-20 chữ số');
            return;
        }

        setSubmitting(true);
        
        try {
            const response = await axiosInstance.post(`/api/public/refund/submit/${orderId}`, formData);
            
            if (response.data.success) {
                toast.success('Đã gửi thông tin hoàn tiền thành công!');
                // Chuyển đến trang xác nhận
                navigate(`/refund-success/${orderId}`);
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi thông tin');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="refund-form-container">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    if (!orderData) {
        return (
            <div className="refund-form-container">
                <div className="error">
                    <h2>Không tìm thấy thông tin đơn hàng</h2>
                    <button onClick={() => navigate('/')} className="btn-primary">
                        Về trang chủ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="refund-form-container">
            <div className="refund-form-wrapper">
                <div className="form-header">
                    <h1>🏦 Form Hoàn Tiền</h1>
                    <p>Vui lòng điền thông tin tài khoản ngân hàng để nhận hoàn tiền</p>
                </div>

                {/* Thông tin đơn hàng */}
                <div className="order-info">
                    <h3>Thông tin đơn hàng</h3>

                    {/* Thông tin chính */}
                    <div className="order-main-info">
                        <div className="order-header">
                            <div className="order-id">
                                <span className="label">Mã đơn hàng</span>
                                <span className="value">{orderData.orderId}</span>
                            </div>
                            <div className="order-amount">
                                <span className="label">Số tiền hoàn</span>
                                <span className="amount">{orderData.totalAmount?.toLocaleString('vi-VN')} VNĐ</span>
                            </div>
                        </div>

                        <div className="order-details">
                            <div className="detail-item">
                                <span className="label">Tên tour:</span>
                                <span className="value">{orderData.tourName}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Khách hàng:</span>
                                <span className="value">{orderData.customerName}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Phương thức thanh toán:</span>
                                <span className="value">{orderData.paymentMethod}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form nhập thông tin ngân hàng */}
                <form onSubmit={handleSubmit} className="refund-form">
                    <h3>🏦 Thông tin tài khoản ngân hàng</h3>
                    
                    <div className="form-group">
                        <label htmlFor="bankName">Ngân hàng <span className="required">*</span></label>
                        <select
                            id="bankName"
                            name="bankName"
                            value={formData.bankName}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">-- Chọn ngân hàng --</option>
                            {popularBanks.map(bank => (
                                <option key={bank} value={bank}>{bank}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="accountNumber">Số tài khoản <span className="required">*</span></label>
                        <input
                            type="text"
                            id="accountNumber"
                            name="accountNumber"
                            value={formData.accountNumber}
                            onChange={handleInputChange}
                            placeholder="Nhập số tài khoản (8-20 chữ số)"
                            pattern="[0-9]{8,20}"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="accountHolderName">Tên chủ tài khoản <span className="required">*</span></label>
                        <input
                            type="text"
                            id="accountHolderName"
                            name="accountHolderName"
                            value={formData.accountHolderName}
                            onChange={handleInputChange}
                            placeholder="Nhập tên chủ tài khoản (theo CMND/CCCD)"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="customerPhone">Số điện thoại liên hệ</label>
                        <input
                            type="tel"
                            id="customerPhone"
                            name="customerPhone"
                            value={formData.customerPhone}
                            onChange={handleInputChange}
                            placeholder="Nhập số điện thoại để liên hệ"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="notes">Ghi chú</label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            placeholder="Ghi chú thêm (nếu có)"
                            rows="3"
                        />
                    </div>

                    <div className="form-actions">
                        <button 
                            type="button" 
                            onClick={() => navigate('/')}
                            className="btn-secondary"
                        >
                            Hủy
                        </button>
                        <button 
                            type="submit" 
                            disabled={submitting}
                            className="btn-primary"
                        >
                            {submitting ? 'Đang gửi...' : 'Gửi thông tin hoàn tiền'}
                        </button>
                    </div>
                </form>

                <div className="form-note">
                    <h4>📝 Lưu ý quan trọng:</h4>
                    <ul>
                        <li>Vui lòng kiểm tra kỹ thông tin tài khoản trước khi gửi</li>
                        <li>Tên chủ tài khoản phải trùng với tên trong CMND/CCCD</li>
                        <li>Thời gian hoàn tiền: 3-7 ngày làm việc</li>
                        <li>Chúng tôi sẽ liên hệ qua số điện thoại nếu cần thiết</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default RefundForm;
