import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../services/axiosInstance';
import './RetryPayment.scss';

/**
 * Component thanh toán lại cho đơn hàng thất bại
 */
const RetryPayment = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedBank, setSelectedBank] = useState('');

    // Danh sách ngân hàng cho VNPay
    const vnpayBanks = [
        { code: '', name: 'Cổng thanh toán VNPay' },
        { code: 'VIETCOMBANK', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam' },
        { code: 'VIETINBANK', name: 'Ngân hàng TMCP Công Thương Việt Nam' },
        { code: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
        { code: 'AGRIBANK', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam' },
        { code: 'TECHCOMBANK', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam' },
        { code: 'MBBANK', name: 'Ngân hàng TMCP Quân đội' },
        { code: 'VPBANK', name: 'Ngân hàng TMCP Việt Nam Thịnh vượng' },
        { code: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
        { code: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội' }
    ];

    // Lấy thông tin đơn hàng
    useEffect(() => {
        fetchOrderData();
    }, [orderId]);

    const fetchOrderData = async () => {
        try {
            const response = await axiosInstance.get(`/api/public/retry-payment/${orderId}`);
            if (response.data.success) {
                setOrderData(response.data.data);
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

    const handleMoMoPayment = async () => {
        setProcessing(true);
        
        try {
            const response = await axiosInstance.post(`/api/public/retry-payment/momo/${orderId}`);
            
            if (response.data.success && response.data.data.payUrl) {
                toast.success('Đang chuyển hướng đến MoMo...');
                window.location.href = response.data.data.payUrl;
            } else {
                throw new Error(response.data.message || 'Không thể tạo link thanh toán MoMo');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Lỗi khi tạo thanh toán MoMo');
        } finally {
            setProcessing(false);
        }
    };

    const handleVNPayPayment = async () => {
        setProcessing(true);
        
        try {
            const response = await axiosInstance.post(`/api/public/retry-payment/vnpay/${orderId}`, {
                bankCode: selectedBank
            });
            
            if (response.data.success && response.data.data.paymentUrl) {
                toast.success('Đang chuyển hướng đến VNPay...');
                window.location.href = response.data.data.paymentUrl;
            } else {
                throw new Error(response.data.message || 'Không thể tạo link thanh toán VNPay');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Lỗi khi tạo thanh toán VNPay');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="retry-payment-container">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    if (!orderData) {
        return (
            <div className="retry-payment-container">
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
        <div className="retry-payment-container">
            <div className="retry-payment-wrapper">
                <div className="payment-header">
                    <h1>Thanh Toán Lại</h1>
                    <p>Thanh toán trước đó đã thất bại. Vui lòng thử lại phương thức thanh toán.</p>
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
                                <span className="label">Số tiền thanh toán</span>
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
                                <span className="label">Phương thức trước:</span>
                                <span className="value">{orderData.paymentMethod}</span>
                            </div>
                        </div>
                    </div>

                    {/* Lý do thất bại */}
                    {orderData.failureReason && (
                        <div className="failure-info">
                            <div className="failure-header">
                                <span className="failure-icon">⚠️</span>
                                <span className="failure-title">Lý do thanh toán thất bại</span>
                            </div>
                            <div className="failure-reason">
                                {orderData.failureReason}
                            </div>
                        </div>
                    )}
                </div>

                {/* Chọn phương thức thanh toán */}
                <div className="payment-methods">
                    <h3>Chọn phương thức thanh toán</h3>
                    
                    {/* MoMo Payment */}
                    <div className="payment-method">
                        <div className="method-header">
                            <div className="payment-logo momo-logo">
                                <svg viewBox="0 0 100 100" className="logo-svg">
                                    <circle cx="50" cy="50" r="45" fill="#d82d8b"/>
                                    <text x="50" y="58" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">M</text>
                                </svg>
                            </div>
                            <div className="method-info">
                                <h4>Ví điện tử MoMo</h4>
                                <p>Thanh toán nhanh chóng và bảo mật với ví MoMo</p>
                            </div>
                        </div>
                        <button
                            onClick={handleMoMoPayment}
                            disabled={processing}
                            className="btn-payment momo"
                            type="button"
                        >
                            {processing ? (
                                <>
                                    <span className="spinner-small"></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                'Thanh toán với MoMo'
                            )}
                        </button>
                    </div>

                    {/* VNPay Payment */}
                    <div className="payment-method">
                        <div className="method-header">
                            <div className="payment-logo vnpay-logo">
                                <svg viewBox="0 0 100 100" className="logo-svg">
                                    <rect x="10" y="10" width="80" height="80" rx="8" fill="#1e88e5"/>
                                    <text x="50" y="45" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">VN</text>
                                    <text x="50" y="65" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">PAY</text>
                                </svg>
                            </div>
                            <div className="method-info">
                                <h4>Cổng thanh toán VNPay</h4>
                                <p>Thanh toán qua thẻ ATM, Internet Banking, Visa/MasterCard</p>
                            </div>
                        </div>
                        
                        <div className="bank-selection">
                            <label htmlFor="bankSelect">Chọn ngân hàng (tùy chọn):</label>
                            <select 
                                id="bankSelect"
                                value={selectedBank} 
                                onChange={(e) => setSelectedBank(e.target.value)}
                            >
                                {vnpayBanks.map(bank => (
                                    <option key={bank.code} value={bank.code}>
                                        {bank.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <button
                            onClick={handleVNPayPayment}
                            disabled={processing}
                            className="btn-payment vnpay"
                            type="button"
                        >
                            {processing ? (
                                <>
                                    <span className="spinner-small"></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                'Thanh toán với VNPay'
                            )}
                        </button>
                    </div>
                </div>

                {/* Lưu ý */}
                <div className="payment-note">
                    <h4>Lưu ý quan trọng:</h4>
                    <ul>
                        <li>Vui lòng kiểm tra kết nối internet ổn định trước khi thanh toán</li>
                        <li>Đảm bảo tài khoản/ví có đủ số dư để thực hiện giao dịch</li>
                        <li>Không đóng trình duyệt trong quá trình thanh toán</li>
                        <li>Nếu vẫn gặp lỗi, vui lòng liên hệ hotline: 0972 122 555</li>
                    </ul>
                </div>

                <div className="form-actions">
                    <button 
                        onClick={() => navigate('/')}
                        className="btn-secondary"
                    >
                        Về trang chủ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RetryPayment;
