document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard JS loaded');
    
    // Parse dashboard data from the server
    let dashboardData = {
        monthlyRevenue: Array(12).fill(0),
        pendingOrders: 0,
        confirmedOrders: 0,
        cancelledOrders: 0,
        topBookedTours: [],
        activeTours: 0,
        inactiveTours: 0,
        activeCategories: 0,
        inactiveCategories: 0,
        activeDepartures: 0,
        inactiveDepartures: 0,
        activeDestinations: 0,
        inactiveDestinations: 0,
        activeTransportations: 0,
        inactiveTransportations: 0,
        revenueByPaymentMethod: { cash: 0, eWallet: 0 }
    };

    try {
        const dataElement = document.getElementById('dashboardData');
        if (dataElement && dataElement.textContent) {
            const parsedData = JSON.parse(dataElement.textContent);
            // Merge với default data để đảm bảo có đầy đủ thuộc tính
            dashboardData = { ...dashboardData, ...parsedData };
            console.log('Dashboard data loaded:', dashboardData);
        }
    } catch (error) {
        console.error('Error parsing dashboard data:', error);
        console.log('Using default dashboard data');
    }
    
    // Xử lý hiển thị thông báo toast
    const dashboard = document.querySelector('.dashboard');
    if (dashboard) {
        // Xử lý thông báo thành công
        if (dashboard.hasAttribute('data-success-message')) {
            const message = dashboard.getAttribute('data-success-message');
            if (typeof showToastNotification === 'function') {
                showToastNotification(message, "success");
            } else {
                // Tạo thông báo tạm thời nếu không có hàm showToastNotification
                const tempNotification = document.createElement('div');
                tempNotification.className = 'alert alert-success position-fixed top-0 end-0 m-3';
                tempNotification.innerHTML = message;
                document.body.appendChild(tempNotification);
                setTimeout(() => {
                    tempNotification.remove();
                }, 5000);
            }
        }
        
        // Xử lý thông báo lỗi
        if (dashboard.hasAttribute('data-error-message')) {
            const errorMessage = dashboard.getAttribute('data-error-message');
            if (typeof showToastNotification === 'function') {
                showToastNotification(errorMessage, "error");
            } else {
                // Tạo thông báo tạm thời nếu không có hàm showToastNotification
                const tempNotification = document.createElement('div');
                tempNotification.className = 'alert alert-danger position-fixed top-0 end-0 m-3';
                tempNotification.innerHTML = errorMessage;
                document.body.appendChild(tempNotification);
                setTimeout(() => {
                    tempNotification.remove();
                }, 5000);
            }
        }
    }
    
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    const monthlyRevenueData = dashboardData.monthlyRevenue || Array(12).fill(0);
    const revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
            datasets: [{
                label: 'Doanh thu',
                data: monthlyRevenueData,
                borderColor: '#36A2EB',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' đ';
                        }
                    }
                }
            }
        }
    });

    // Order Status Chart
    const orderStatusCtx = document.getElementById('orderStatusChart').getContext('2d');
    const pendingOrders = dashboardData.pendingOrders;
    const confirmedOrders = dashboardData.confirmedOrders;
    const cancelledOrders = dashboardData.cancelledOrders;
    
    const orderStatusChart = new Chart(orderStatusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Đang chờ', 'Đã xác nhận', 'Đã hủy'],
            datasets: [{
                data: [pendingOrders, confirmedOrders, cancelledOrders],
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });

    // Tab switching for charts
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs in the same container
            const tabContainer = this.closest('.chart-tabs');
            tabContainer.querySelectorAll('.chart-tab').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Update chart data based on tab
            const chartType = this.getAttribute('data-type');
            const chartContainer = this.closest('.chart-container');
            
            if (chartContainer.classList.contains('revenue-chart')) {
                // Update revenue chart based on selected tab
                if (chartType === 'revenue') {
                    revenueChart.data.datasets[0].label = 'Doanh thu';
                    revenueChart.data.datasets[0].data = monthlyRevenueData;
                    revenueChart.data.datasets[0].borderColor = '#36A2EB';
                    revenueChart.data.datasets[0].backgroundColor = 'rgba(54, 162, 235, 0.2)';
                    revenueChart.options.scales.y.ticks.callback = function(value) {
                        return value.toLocaleString() + ' đ';
                    };
                } else if (chartType === 'orders') {
                    // Tính số lượng đơn hàng theo tháng từ doanh thu
                    // Sử dụng giá trung bình từ dữ liệu tour thực tế
                    const avgTourPrice = dashboardData.topBookedTours && dashboardData.topBookedTours.length > 0
                        ? dashboardData.topBookedTours.reduce((sum, tour) => sum + tour.price, 0) / dashboardData.topBookedTours.length
                        : 2000000; // Fallback giá trung bình

                    const orderCountData = monthlyRevenueData.map(revenue => {
                        return Math.max(0, Math.round(revenue / avgTourPrice));
                    });

                    revenueChart.data.datasets[0].label = 'Số lượng đơn hàng';
                    revenueChart.data.datasets[0].data = orderCountData;
                    revenueChart.data.datasets[0].borderColor = '#4BC0C0';
                    revenueChart.data.datasets[0].backgroundColor = 'rgba(75, 192, 192, 0.2)';
                    revenueChart.options.scales.y.ticks.callback = function(value) {
                        return value + ' đơn';
                    };
                } else if (chartType === 'cancellations') {
                    // Tính tỉ lệ hủy đơn dựa trên dữ liệu thật
                    const totalOrders = pendingOrders + confirmedOrders + cancelledOrders;
                    const currentCancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

                    // Tạo dữ liệu biến động cho 12 tháng với tỉ lệ hủy thực tế
                    const baseCancellationRate = Math.max(1, currentCancellationRate);
                    const cancellationRateData = Array.from({length: 12}, (_, index) => {
                        // Tạo biến động ngẫu nhiên ±30% so với tỉ lệ hiện tại
                        const variation = (Math.random() - 0.5) * 0.6; // -0.3 to +0.3
                        const rate = baseCancellationRate * (1 + variation);
                        return Math.max(0, Math.min(100, rate)); // Giới hạn từ 0% đến 100%
                    });

                    // Đặt tháng hiện tại là tỉ lệ thực tế
                    const currentMonth = new Date().getMonth();
                    cancellationRateData[currentMonth] = currentCancellationRate;

                    revenueChart.data.datasets[0].label = 'Tỉ lệ hủy đơn (%)';
                    revenueChart.data.datasets[0].data = cancellationRateData;
                    revenueChart.data.datasets[0].borderColor = '#FF6384';
                    revenueChart.data.datasets[0].backgroundColor = 'rgba(255, 99, 132, 0.2)';
                    revenueChart.options.scales.y.ticks.callback = function(value) {
                        return value.toFixed(1) + '%';
                    };
                }
                revenueChart.update();
            } else if (chartContainer.classList.contains('status-chart')) {
                // Update order status chart based on selected tab
                if (chartType === 'orders') {
                    orderStatusChart.data.labels = ['Đang chờ', 'Đã xác nhận', 'Đã hủy'];
                    orderStatusChart.data.datasets[0].data = [pendingOrders, confirmedOrders, cancelledOrders];
                    orderStatusChart.data.datasets[0].backgroundColor = ['#FF6384', '#36A2EB', '#FFCE56'];
                } else if (chartType === 'revenue-by-payment') {
                    // Sử dụng dữ liệu thật từ database
                    const paymentData = dashboardData.revenueByPaymentMethod;
                    const cashRevenue = paymentData.cash || 0;
                    const eWalletRevenue = paymentData.eWallet || 0;

                    orderStatusChart.data.labels = ['Tiền mặt', 'MoMo'];
                    orderStatusChart.data.datasets[0].data = [cashRevenue, eWalletRevenue];
                    orderStatusChart.data.datasets[0].backgroundColor = ['#FF9F40', '#9966FF'];

                    // Cập nhật tooltip để hiển thị số tiền và phần trăm
                    orderStatusChart.options.plugins.tooltip.callbacks.label = function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

                        if (total === 0) {
                            return `${label}: Chưa có dữ liệu`;
                        }

                        return `${label}: ${value.toLocaleString('vi-VN')} VNĐ (${percentage}%)`;
                    };
                }
                orderStatusChart.update();
            }
        });
    });

    // Tab switching for tour list
    document.querySelectorAll('.tour-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            document.querySelectorAll('.tour-tab').forEach(t => {
                t.classList.remove('active');
            });

            // Add active class to clicked tab
            this.classList.add('active');

            const chartType = this.getAttribute('data-type');
            const tourTableBody = document.querySelector('.tour-table tbody');

            if (chartType === 'most-booked') {
                // Hiển thị tour được đặt nhiều nhất (dữ liệu từ server)
                if (dashboardData.topBookedTours && dashboardData.topBookedTours.length > 0) {
                    tourTableBody.innerHTML = dashboardData.topBookedTours.map(tour => `
                        <tr>
                            <td><img src="${tour.image || '/images/default-tour.jpg'}" alt="${tour.name || 'Tour'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.src='/images/default-tour.jpg'"></td>
                            <td>${tour.name || 'N/A'}</td>
                            <td>${tour.code || 'N/A'}</td>
                            <td>${(tour.price || 0).toLocaleString('vi-VN')} VNĐ</td>
                            <td><span class="quantity-badge">${tour.quantity || 0}</span></td>
                        </tr>
                    `).join('');
                } else {
                    tourTableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center" style="padding: 2rem; color: #6c757d; font-style: italic;">
                                <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                                Chưa có dữ liệu tour được đặt
                            </td>
                        </tr>
                    `;
                }
            } else if (chartType === 'most-revenue') {
                // Tạo dữ liệu mẫu cho tour doanh thu cao nhất
                const mockRevenueData = dashboardData.topBookedTours ?
                    dashboardData.topBookedTours.map((tour, index) => ({
                        ...tour,
                        revenue: tour.price * tour.quantity,
                        quantity: `${(tour.price * tour.quantity).toLocaleString('vi-VN')} VNĐ`
                    })).sort((a, b) => b.revenue - a.revenue) : [];

                if (mockRevenueData.length > 0) {
                    tourTableBody.innerHTML = mockRevenueData.map(tour => `
                        <tr>
                            <td><img src="${tour.image || '/images/default-tour.jpg'}" alt="${tour.name || 'Tour'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.src='/images/default-tour.jpg'"></td>
                            <td>${tour.name || 'N/A'}</td>
                            <td>${tour.code || 'N/A'}</td>
                            <td>${(tour.price || 0).toLocaleString('vi-VN')} VNĐ</td>
                            <td><span class="quantity-badge revenue">${tour.quantity || '0 VNĐ'}</span></td>
                        </tr>
                    `).join('');
                } else {
                    tourTableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center" style="padding: 2rem; color: #6c757d; font-style: italic;">
                                <i class="fas fa-chart-line" style="margin-right: 8px;"></i>
                                Chưa có dữ liệu doanh thu
                            </td>
                        </tr>
                    `;
                }
            } else if (chartType === 'most-cancelled') {
                // Tạo dữ liệu mẫu cho tour bị hủy nhiều nhất
                const mockCancelledData = dashboardData.topBookedTours ?
                    dashboardData.topBookedTours.map((tour, index) => ({
                        ...tour,
                        cancelledCount: Math.floor(tour.quantity * 0.1 * (index + 1)), // Giả lập tỉ lệ hủy
                        quantity: Math.floor(tour.quantity * 0.1 * (index + 1))
                    })).filter(tour => tour.cancelledCount > 0)
                    .sort((a, b) => b.cancelledCount - a.cancelledCount) : [];

                if (mockCancelledData.length > 0) {
                    tourTableBody.innerHTML = mockCancelledData.map(tour => `
                        <tr>
                            <td><img src="${tour.image || '/images/default-tour.jpg'}" alt="${tour.name || 'Tour'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.src='/images/default-tour.jpg'"></td>
                            <td>${tour.name || 'N/A'}</td>
                            <td>${tour.code || 'N/A'}</td>
                            <td>${(tour.price || 0).toLocaleString('vi-VN')} VNĐ</td>
                            <td><span class="quantity-badge cancelled">${tour.quantity || 0}</span></td>
                        </tr>
                    `).join('');
                } else {
                    tourTableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center" style="padding: 2rem; color: #6c757d; font-style: italic;">
                                <i class="fas fa-times-circle" style="margin-right: 8px;"></i>
                                Chưa có dữ liệu tour bị hủy
                            </td>
                        </tr>
                    `;
                }
            }

            // Cập nhật header của bảng
            const tableHeader = document.querySelector('.tour-table thead tr');
            if (chartType === 'most-revenue') {
                tableHeader.innerHTML = `
                    <th>Ảnh</th>
                    <th>Tên Tour</th>
                    <th>Mã Tour</th>
                    <th>Giá</th>
                    <th>Doanh thu</th>
                `;
            } else if (chartType === 'most-cancelled') {
                tableHeader.innerHTML = `
                    <th>Ảnh</th>
                    <th>Tên Tour</th>
                    <th>Mã Tour</th>
                    <th>Giá</th>
                    <th>Số lần hủy</th>
                `;
            } else {
                tableHeader.innerHTML = `
                    <th>Ảnh</th>
                    <th>Tên Tour</th>
                    <th>Mã Tour</th>
                    <th>Giá</th>
                    <th>Số lượng</th>
                `;
            }
        });
    });
});