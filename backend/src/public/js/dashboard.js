document.addEventListener('DOMContentLoaded', function() {
    // Parse dashboard data from the server
    let dashboardData = {
        monthlyRevenue: Array(12).fill(0),
        pendingOrders: 0,
        confirmedOrders: 0,
        completedOrders: 0,
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
        revenueByPaymentMethod: { cash: 0, momo: 0, vnpay: 0 },
        csatData: { averageScore: 0, totalRatings: 0, trend: [] },
        paymentSuccessRates: { momo: 0, vnpay: 0 },
        performanceData: { avgResponseTime: 0, p95: 0, p99: 0, expiredOrders: 0 }
    };

    try {
        const dataElement = document.getElementById('dashboardData');
        if (dataElement && dataElement.textContent) {
            const parsedData = JSON.parse(dataElement.textContent);
            dashboardData = { ...dashboardData, ...parsedData };
        }
    } catch (error) {
        console.error('Error parsing dashboard data:', error);
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
    let monthlyRevenueData = dashboardData.monthlyRevenue || Array(12).fill(0);
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
    const completedOrders = dashboardData.completedOrders;
    const cancelledOrders = dashboardData.cancelledOrders;
    
    const orderStatusChart = new Chart(orderStatusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Đang chờ', 'Đã xác nhận', 'Hoàn thành', 'Đã hủy'],
            datasets: [{
                data: [pendingOrders, confirmedOrders, completedOrders, cancelledOrders],
                backgroundColor: ['#FF6384', '#36A2EB', '#28a745', '#FFCE56'],
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
        tab.addEventListener('click', async function() {
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

            console.log('Tab clicked:', chartType);
            console.log('Chart container:', chartContainer);
            
            if (chartContainer.classList.contains('revenue-chart')) {
                // Update revenue chart based on selected tab
                if (chartType === 'revenue') {
                    // Realtime: fetch monthly revenue
                    try {
                        const resp = await fetch('/api/dashboard/monthly-revenue');
                        if (resp.ok) {
                            const json = await resp.json();
                            if (json.success && Array.isArray(json.data)) {
                                monthlyRevenueData = json.data;
                            }
                        } else {
                            showRealtimeError('Không tải được doanh thu theo tháng');
                        }
                    } catch (e) { showRealtimeError('Lỗi tải doanh thu theo tháng'); }
                    revenueChart.data.datasets[0].label = 'Doanh thu';
                    revenueChart.data.datasets[0].data = monthlyRevenueData;
                    revenueChart.data.datasets[0].borderColor = '#36A2EB';
                    revenueChart.data.datasets[0].backgroundColor = 'rgba(54, 162, 235, 0.2)';
                    revenueChart.options.scales.y.ticks.callback = function(value) {
                        return value.toLocaleString() + ' đ';
                    };
                } else if (chartType === 'orders') {
                    // Lấy dữ liệu số đơn hàng thật từ API
                    try {
                        const response = await fetch('/orders/api/monthly-stats');
                        let orderCountData = Array(12).fill(0);
                        
                        if (response.ok) {
                            const data = await response.json();
                            if (data.success && data.data) {
                                orderCountData = data.data.monthlyOrders || Array(12).fill(0);
                            }
                        } else {
                            // Fallback: sử dụng dữ liệu từ dashboardData
                            const totalValidOrders = dashboardData.confirmedOrders + dashboardData.completedOrders;
                            const avgOrdersPerMonth = totalValidOrders / 12;
                            orderCountData = Array(12).fill(Math.round(avgOrdersPerMonth));
                        }

                        revenueChart.data.datasets[0].label = 'Số lượng đơn hàng';
                        revenueChart.data.datasets[0].data = orderCountData;
                        revenueChart.data.datasets[0].borderColor = '#4BC0C0';
                        revenueChart.data.datasets[0].backgroundColor = 'rgba(75, 192, 192, 0.2)';
                        revenueChart.options.scales.y.ticks.callback = function(value) {
                            return value + ' đơn';
                        };
                    } catch (error) {
                        console.error('Error loading order data:', error);
                        // Fallback với dữ liệu thật từ dashboardData
                        const totalValidOrders = dashboardData.confirmedOrders + dashboardData.completedOrders;
                        const avgOrdersPerMonth = totalValidOrders / 12;
                        const fallbackData = Array(12).fill(Math.round(avgOrdersPerMonth));
                        
                        revenueChart.data.datasets[0].label = 'Số lượng đơn hàng';
                        revenueChart.data.datasets[0].data = fallbackData;
                        revenueChart.data.datasets[0].borderColor = '#4BC0C0';
                        revenueChart.data.datasets[0].backgroundColor = 'rgba(75, 192, 192, 0.2)';
                        revenueChart.options.scales.y.ticks.callback = function(value) {
                            return value + ' đơn';
                        };
                    }
                } else if (chartType === 'cancellations') {
                    // Lấy dữ liệu tỉ lệ hủy đơn thật từ API
                    try {
                        const response = await fetch('/orders/api/cancellation-rate');
                        let cancellationRateData = Array(12).fill(0);
                        
                        if (response.ok) {
                            const data = await response.json();
                            if (data.success && data.data) {
                                cancellationRateData = data.data.monthlyCancellationRates || Array(12).fill(0);
                            }
                        } else {
                            // Fallback: tính từ dữ liệu hiện tại
                            const totalOrders = dashboardData.pendingOrders + dashboardData.confirmedOrders +
                                              dashboardData.completedOrders + dashboardData.cancelledOrders;
                            const currentCancellationRate = totalOrders > 0 ? (dashboardData.cancelledOrders / totalOrders) * 100 : 0;
                            cancellationRateData.fill(currentCancellationRate);
                        }

                        revenueChart.data.datasets[0].label = 'Tỉ lệ hủy đơn (%)';
                        revenueChart.data.datasets[0].data = cancellationRateData;
                        revenueChart.data.datasets[0].borderColor = '#FF6384';
                        revenueChart.data.datasets[0].backgroundColor = 'rgba(255, 99, 132, 0.2)';
                        revenueChart.options.scales.y.ticks.callback = function(value) {
                            return value.toFixed(1) + '%';
                        };
                    } catch (error) {
                        console.error('Error loading cancellation data:', error);
                        // Fallback với dữ liệu hiện tại
                        const totalOrders = dashboardData.pendingOrders + dashboardData.confirmedOrders +
                                          dashboardData.completedOrders + dashboardData.cancelledOrders;
                        const currentCancellationRate = totalOrders > 0 ? (dashboardData.cancelledOrders / totalOrders) * 100 : 0;
                        const cancellationRateData = Array(12).fill(currentCancellationRate);

                        revenueChart.data.datasets[0].label = 'Tỉ lệ hủy đơn (%)';
                        revenueChart.data.datasets[0].data = cancellationRateData;
                        revenueChart.data.datasets[0].borderColor = '#FF6384';
                        revenueChart.data.datasets[0].backgroundColor = 'rgba(255, 99, 132, 0.2)';
                        revenueChart.options.scales.y.ticks.callback = function(value) {
                            return value.toFixed(1) + '%';
                        };
                    }
                } else if (chartType === 'cancelled-orders') {
                    console.log('Switching to cancelled orders chart');
                    try {
                        await showCancelledOrdersChart();
                    } catch (error) {
                        console.error('Error calling showCancelledOrdersChart:', error);
                    }
                    return; // Exit early since showCancelledOrdersChart handles the update
                } else if (chartType === 'csat') {
                    console.log('Switching to CSAT chart');
                    try {
                        showCSATChart();
                    } catch (error) {
                        console.error('Error calling showCSATChart:', error);
                    }
                    return; // Exit early since showCSATChart handles the update
                } else if (chartType === 'performance') {
                    console.log('Switching to performance chart');
                    try {
                        showPerformanceChart();
                    } catch (error) {
                        console.error('Error calling showPerformanceChart:', error);
                    }
                    return; // Exit early since showPerformanceChart handles the update
                }
                revenueChart.update();
            } else if (chartContainer.classList.contains('status-chart')) {
                // Update order status chart based on selected tab
                if (chartType === 'orders') {
                    orderStatusChart.data.labels = ['Đang chờ', 'Đã xác nhận', 'Hoàn thành', 'Đã hủy'];
                    orderStatusChart.data.datasets[0].data = [dashboardData.pendingOrders, dashboardData.confirmedOrders, dashboardData.completedOrders, dashboardData.cancelledOrders];
                    orderStatusChart.data.datasets[0].backgroundColor = ['#FF6384', '#36A2EB', '#28a745', '#FFCE56'];
                } else if (chartType === 'revenue-by-payment') {
                    // Realtime từ API
                    let paymentData = dashboardData.revenueByPaymentMethod || {};
                    try {
                        const resp = await fetch('/api/dashboard/revenue-by-payment');
                        if (resp.ok) {
                            const json = await resp.json();
                            if (json.success && json.data) paymentData = json.data;
                        } else {
                            showRealtimeError('Không tải được doanh thu theo PTTT');
                        }
                    } catch (e) { showRealtimeError('Lỗi tải doanh thu theo PTTT'); }
                    const cashRevenue = paymentData.cash || 0;
                    const momoRevenue = paymentData.momo || 0;
                    const vnpayRevenue = paymentData.vnpay || 0;

                    orderStatusChart.data.labels = ['Tiền mặt', 'MoMo', 'VNPay'];
                    orderStatusChart.data.datasets[0].data = [cashRevenue, momoRevenue, vnpayRevenue];
                    orderStatusChart.data.datasets[0].backgroundColor = ['#FF9F40', '#9966FF', '#4BC0C0'];

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
        tab.addEventListener('click', async function() {
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
                let list = dashboardData.topBookedTours || [];
                try {
                    const resp = await fetch('/api/dashboard/top-tours?type=booked');
                    const json = await resp.json();
                    if (resp.ok && json.success && Array.isArray(json.data)) list = json.data;
                    else showRealtimeError('Không tải được Top tour được đặt');
                } catch (e) { showRealtimeError('Lỗi tải Top tour được đặt'); }
                if (list && list.length > 0) {
                    tourTableBody.innerHTML = list.map(tour => `
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
                // Sử dụng dữ liệu thật từ server - topRevenueTours
                let revenueData = dashboardData.topRevenueTours ?
                    dashboardData.topRevenueTours.map((tour) => ({
                        ...tour,
                        revenueDisplay: `${(tour.revenue || 0).toLocaleString('vi-VN')} VNĐ`
                    })) : [];
                try {
                    const resp = await fetch('/api/dashboard/top-tours?type=revenue');
                    const json = await resp.json();
                    if (resp.ok && json.success && Array.isArray(json.data)) {
                        revenueData = json.data.map((tour) => ({
                            ...tour,
                            revenueDisplay: `${(tour.revenue || 0).toLocaleString('vi-VN')} VNĐ`
                        }));
                    } else {
                        showRealtimeError('Không tải được Top tour doanh thu');
                    }
                } catch (e) { showRealtimeError('Lỗi tải Top tour doanh thu'); }

                if (revenueData.length > 0) {
                    tourTableBody.innerHTML = revenueData.map(tour => `
                        <tr>
                            <td><img src="${tour.image || '/images/default-tour.jpg'}" alt="${tour.name || 'Tour'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.src='/images/default-tour.jpg'"></td>
                            <td>${tour.name || 'N/A'}</td>
                            <td>${tour.code || 'N/A'}</td>
                            <td>${(tour.price || 0).toLocaleString('vi-VN')} VNĐ</td>
                            <td><span class="quantity-badge revenue">${tour.revenueDisplay || '0 VNĐ'}</span></td>
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
                // Sử dụng dữ liệu thật từ server
                let cancelledData = dashboardData.topCancelledTours || [];
                try {
                    const resp = await fetch('/api/dashboard/top-tours?type=cancelled');
                    const json = await resp.json();
                    if (resp.ok && json.success && Array.isArray(json.data)) cancelledData = json.data;
                    else showRealtimeError('Không tải được Top tour bị hủy');
                } catch (e) { showRealtimeError('Lỗi tải Top tour bị hủy'); }

                if (cancelledData.length > 0) {
                    tourTableBody.innerHTML = cancelledData.map(tour => `
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

    // Initialize new features
    initializeNewStatsCards();

    // Cập nhật realtime các stats từ API khi trang load
    loadPerformanceData();
    loadCSATData();
    loadPaymentSuccessRates();

    // Initialize chart tab handlers (placeholder for future features)
    // initializeChartTabHandlers();

    // Thiết lập cập nhật định kỳ mỗi 60s cho các thẻ realtime
    setInterval(() => {
        try { loadPerformanceData(); } catch (e) { console.warn('reload performance failed', e); }
        try { loadCSATData(); } catch (e) { console.warn('reload csat failed', e); }
        try { loadPaymentSuccessRates(); } catch (e) { console.warn('reload payment rates failed', e); }

        // Auto refresh cho biểu đồ theo tab đang chọn
        try {
            const activeRevenueTab = document.querySelector('.revenue-chart .chart-tab.active');
            if (activeRevenueTab) {
                const type = activeRevenueTab.getAttribute('data-type');
                activeRevenueTab.click(); // kích hoạt lại handler để fetch mới
            }
        } catch (e) { console.warn('auto refresh revenue chart failed', e); }

        try {
            const activeTourTab = document.querySelector('.top-tours .tour-tab.active');
            if (activeTourTab) {
                activeTourTab.click(); // kích hoạt lại handler để fetch mới
            }
        } catch (e) { console.warn('auto refresh top tours failed', e); }
    }, 60000);

    // Function to show cancelled orders chart
    async function showCancelledOrdersChart() {
        try {
            console.log('showCancelledOrdersChart called');
            
            // Lấy dữ liệu thật từ API
                        const response = await fetch('/orders/api/cancelled-stats');
            let cancelledOrdersData = Array(12).fill(0);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    // Sử dụng dữ liệu thật từ API
                    cancelledOrdersData = data.data.monthlyCancelled || Array(12).fill(0);
                }
            } else {
                // Fallback: sử dụng dữ liệu từ dashboardData
                const currentMonth = new Date().getMonth();
                cancelledOrdersData[currentMonth] = dashboardData.cancelledOrders || 0;
            }

            console.log('cancelledOrdersData:', cancelledOrdersData);

            revenueChart.data.datasets[0].label = 'Số đơn bị hủy';
            revenueChart.data.datasets[0].data = cancelledOrdersData;
            revenueChart.data.datasets[0].borderColor = '#FF6B6B';
            revenueChart.data.datasets[0].backgroundColor = 'rgba(255, 107, 107, 0.2)';
            revenueChart.options.scales.y.ticks.callback = function(value) {
                return value + ' đơn';
            };
            revenueChart.update();
            console.log('Chart updated successfully');
        } catch (error) {
            console.error('Error showing cancelled orders chart:', error);
            // Fallback với dữ liệu hiện tại
            const currentMonth = new Date().getMonth();
            const cancelledData = Array(12).fill(0);
            cancelledData[currentMonth] = dashboardData.cancelledOrders || 0;
            
            revenueChart.data.datasets[0].label = 'Số đơn bị hủy';
            revenueChart.data.datasets[0].data = cancelledData;
            revenueChart.data.datasets[0].borderColor = '#FF6B6B';
            revenueChart.data.datasets[0].backgroundColor = 'rgba(255, 107, 107, 0.2)';
            revenueChart.options.scales.y.ticks.callback = function(value) {
                return value + ' đơn';
            };
            revenueChart.update();
        }
    }

    // Function to show CSAT chart
    function showCSATChart() {
        try {
            console.log('showCSATChart called');

            // Sử dụng dữ liệu CSAT từ backend (đã load sẵn)
            const currentScore = dashboardData.csatData?.averageScore || 4.0;
            const totalRatings = dashboardData.csatData?.totalRatings || 0;
            
            // Tạo dữ liệu CSAT cho 12 tháng dựa trên dữ liệu hiện tại
            const csatData = Array(12).fill(currentScore);
            
            // Sử dụng dữ liệu CSAT thật từ backend

            console.log('csatData:', csatData);
            console.log('Current CSAT score:', currentScore);
            console.log('Total ratings:', totalRatings);

            revenueChart.data.datasets[0].label = 'Điểm CSAT';
            revenueChart.data.datasets[0].data = csatData;
            revenueChart.data.datasets[0].borderColor = '#FFD93D';
            revenueChart.data.datasets[0].backgroundColor = 'rgba(255, 217, 61, 0.2)';
            revenueChart.options.scales.y.ticks.callback = function(value) {
                return value.toFixed(1) + '/5';
            };
            revenueChart.update();
            console.log('CSAT Chart updated successfully');
        } catch (error) {
            console.error('Error showing CSAT chart:', error);
            // Fallback với dữ liệu hiện tại
            const currentScore = dashboardData.csatData?.averageScore || 4.0;
            const csatData = Array(12).fill(currentScore);
            
            revenueChart.data.datasets[0].label = 'Điểm CSAT';
            revenueChart.data.datasets[0].data = csatData;
            revenueChart.data.datasets[0].borderColor = '#FFD93D';
            revenueChart.data.datasets[0].backgroundColor = 'rgba(255, 217, 61, 0.2)';
            revenueChart.options.scales.y.ticks.callback = function(value) {
                return value.toFixed(1) + '/5';
            };
            revenueChart.update();
        }
    }

    // Function to show performance chart
    async function showPerformanceChart() {
        try {
            console.log('showPerformanceChart called');

            // Ưu tiên dữ liệu thật từ API để đồng nhất với thẻ hiệu năng
            let avgFromApi = null;
            try {
                const resp = await fetch('/api/chat/response-time/stats');
                if (resp.ok) {
                    const json = await resp.json();
                    if (json.success && json.data && json.data.stats) {
                        avgFromApi = Math.round((json.data.stats.averageResponseTime || json.data.stats.average || 0));
                    }
                }
            } catch (apiErr) {
                console.warn('Performance API unavailable, using fallback', apiErr);
            }

            // Fallback: lấy số trên thẻ nếu có, sau đó mới tới server-side data
            const cardEl = document.getElementById('avgResponseTime');
            const avgFromCard = cardEl ? parseInt(cardEl.textContent) || null : null;
            const avgFromServerRender = dashboardData.performanceData?.avgResponseTime || null;

            const currentAvg = (avgFromApi && avgFromApi > 0)
                ? avgFromApi
                : (avgFromCard && avgFromCard > 0)
                    ? avgFromCard
                    : (avgFromServerRender || 0);

            const series = Array(12).fill(currentAvg);

            revenueChart.data.datasets[0].label = 'Thời gian phản hồi (ms)';
            revenueChart.data.datasets[0].data = series;
            revenueChart.data.datasets[0].borderColor = '#9C27B0';
            revenueChart.data.datasets[0].backgroundColor = 'rgba(156, 39, 176, 0.2)';
            revenueChart.options.scales.y.ticks.callback = function(value) {
                return value.toFixed(0) + 'ms';
            };
            revenueChart.update();
            console.log('Performance Chart updated successfully');
        } catch (error) {
            console.error('Error showing performance chart:', error);
            const fallbackAvg = dashboardData.performanceData?.avgResponseTime || 0;
            const series = Array(12).fill(fallbackAvg);
            revenueChart.data.datasets[0].label = 'Thời gian phản hồi (ms)';
            revenueChart.data.datasets[0].data = series;
            revenueChart.data.datasets[0].borderColor = '#9C27B0';
            revenueChart.data.datasets[0].backgroundColor = 'rgba(156, 39, 176, 0.2)';
            revenueChart.options.scales.y.ticks.callback = function(value) {
                return value.toFixed(0) + 'ms';
            };
            revenueChart.update();
        }
    }
});

// Initialize new stats cards
function initializeNewStatsCards() {
    // Chỉ cập nhật màu sắc sau 1 giây để đảm bảo dữ liệu đã render
    setTimeout(() => {
        updateColorsOnly();
    }, 1000);
}

// Chỉ cập nhật màu sắc, không thay đổi nội dung
function updateColorsOnly() {
    try {
        // CSAT colors
        const csatScore = document.getElementById('csatScore');
        if (csatScore) {
            const score = parseFloat(csatScore.textContent) || 0;
            if (score >= 4.5) {
                csatScore.style.color = '#28a745';
            } else if (score >= 3.5) {
                csatScore.style.color = '#ffc107';
            } else {
                csatScore.style.color = '#dc3545';
            }
        }

        // Payment colors
        const momoElement = document.getElementById('momoSuccessRate');
        const vnpayElement = document.getElementById('vnpaySuccessRate');
        if (momoElement) {
            const momoRate = parseInt(momoElement.textContent) || 0;
            momoElement.style.color = momoRate >= 95 ? '#28a745' : momoRate >= 90 ? '#ffc107' : '#dc3545';
        }
        if (vnpayElement) {
            const vnpayRate = parseInt(vnpayElement.textContent) || 0;
            vnpayElement.style.color = vnpayRate >= 95 ? '#28a745' : vnpayRate >= 90 ? '#ffc107' : '#dc3545';
        }

        // Performance colors
        const timeElement = document.getElementById('avgResponseTime');
        if (timeElement) {
            const avgTime = parseInt(timeElement.textContent) || 0;
            if (avgTime <= 2000) {
                timeElement.style.color = '#28a745';
            } else if (avgTime <= 3000) {
                timeElement.style.color = '#ffc107';
            } else {
                timeElement.style.color = '#dc3545';
            }
        }

    } catch (error) {
        console.error('Error updating colors:', error);
    }
}

// Toast helper cho realtime error
function showRealtimeError(message) {
    try {
        if (typeof showToastNotification === 'function') {
            showToastNotification(message, 'error');
        } else {
            const temp = document.createElement('div');
            temp.className = 'alert alert-danger position-fixed top-0 end-0 m-3';
            temp.innerHTML = message;
            document.body.appendChild(temp);
            setTimeout(() => temp.remove(), 4000);
        }
    } catch (_) {
        console.warn('Toast error:', message);
    }
}

// Update CSAT display with server data
function updateCSATDisplay() {
    try {
        const scoreElement = document.getElementById('csatScore');
        const countElement = document.getElementById('csatCount');

        if (!scoreElement || !countElement) {
            console.warn('CSAT display elements not found');
            return;
        }

        // Lấy giá trị hiện tại từ HTML (đã được render từ server)
        const score = parseFloat(scoreElement.textContent) || 0;
        const count = parseInt(countElement.textContent) || 0;

        // Chỉ cập nhật màu sắc dựa trên giá trị hiện tại
        if (score >= 4.5) {
            scoreElement.style.color = '#28a745';
        } else if (score >= 3.5) {
            scoreElement.style.color = '#ffc107';
        } else {
            scoreElement.style.color = '#dc3545';
        }


    } catch (error) {
        console.error('Error updating CSAT display:', error);
    }
}

// Update payment success rates display with server data
function updatePaymentSuccessRatesDisplay() {
    try {
        const momoElement = document.getElementById('momoSuccessRate');
        const vnpayElement = document.getElementById('vnpaySuccessRate');

        if (!momoElement || !vnpayElement) {
            console.warn('Payment rate display elements not found');
            return;
        }

        // Lấy giá trị hiện tại từ HTML (đã được render từ server)
        const momoRate = parseInt(momoElement.textContent) || 0;
        const vnpayRate = parseInt(vnpayElement.textContent) || 0;

        // Chỉ cập nhật màu sắc dựa trên giá trị hiện tại
        momoElement.style.color = momoRate >= 95 ? '#28a745' : momoRate >= 90 ? '#ffc107' : '#dc3545';
        vnpayElement.style.color = vnpayRate >= 95 ? '#28a745' : vnpayRate >= 90 ? '#ffc107' : '#dc3545';


    } catch (error) {
        console.error('Error updating payment success rates display:', error);
    }
}

// Update performance display with server data
function updatePerformanceDisplay() {
    try {
        const timeElement = document.getElementById('avgResponseTime');
        const expiredElement = document.getElementById('expiredOrders');

        if (!timeElement || !expiredElement) {
            console.warn('Performance display elements not found');
            return;
        }

        // Lấy giá trị hiện tại từ HTML (đã được render từ server)
        const avgTime = parseInt(timeElement.textContent) || 0;
        const expiredCount = parseInt(expiredElement.textContent) || 0;

        // Chỉ cập nhật màu sắc dựa trên giá trị hiện tại
        if (avgTime <= 2000) {
            timeElement.style.color = '#28a745';
        } else if (avgTime <= 3000) {
            timeElement.style.color = '#ffc107';
        } else {
            timeElement.style.color = '#dc3545';
        }


    } catch (error) {
        console.error('Error updating performance display:', error);
    }
}

// Load CSAT data
async function loadCSATData() {
    try {
        // Sử dụng session-rating API thay vì rating API
        const response = await fetch('/api/chat/session-rating/stats');
        const data = await response.json();

        if (data.success) {
            const stats = data.data;
            // SessionRating API trả về avgRating thay vì averageRating
            const avgRating = stats.avgRating || 0;
            const totalRatings = stats.totalRatings || 0;

            document.getElementById('csatScore').textContent = avgRating.toFixed(1);
            document.getElementById('csatCount').textContent = totalRatings;

            // Update color based on score
            const scoreElement = document.getElementById('csatScore');
            if (avgRating >= 4.5) {
                scoreElement.style.color = '#28a745';
            } else if (avgRating >= 3.5) {
                scoreElement.style.color = '#ffc107';
            } else {
                scoreElement.style.color = '#dc3545';
            }

            console.log('✅ CSAT data loaded:', { avgRating, totalRatings });
        }
    } catch (error) {
        console.error('Error loading CSAT data:', error);
        document.getElementById('csatScore').textContent = 'N/A';
        document.getElementById('csatCount').textContent = '0';
    }
}

// Load payment success rates
async function loadPaymentSuccessRates() {
    try {
        // Ưu tiên lấy data realtime từ API
        let momoRate = 0;
        let vnpayRate = 0;

        try {
            const resp = await fetch('/api/dashboard/payment-success-rates');
            if (resp.ok) {
                const json = await resp.json();
                if (json.success && json.data) {
                    momoRate = Math.round(json.data.momo || 0);
                    vnpayRate = Math.round(json.data.vnpay || 0);
                }
            }
        } catch (e) {
            console.warn('payment success rates api failed, fallback to server snapshot', e);
        }

        // Fallback đến snapshot nếu API không có
        if (momoRate === 0 && vnpayRate === 0 && dashboardData && dashboardData.paymentSuccessRates) {
            momoRate = Math.round(dashboardData.paymentSuccessRates.momo || 0);
            vnpayRate = Math.round(dashboardData.paymentSuccessRates.vnpay || 0);
        }

        document.getElementById('momoSuccessRate').textContent = momoRate;
        document.getElementById('vnpaySuccessRate').textContent = vnpayRate;

        // Update colors based on rates
        const momoElement = document.getElementById('momoSuccessRate');
        const vnpayElement = document.getElementById('vnpaySuccessRate');

        momoElement.style.color = momoRate >= 95 ? '#28a745' : momoRate >= 90 ? '#ffc107' : '#dc3545';
        vnpayElement.style.color = vnpayRate >= 95 ? '#28a745' : vnpayRate >= 90 ? '#ffc107' : '#dc3545';
    } catch (error) {
        console.error('Error loading payment success rates:', error);
        document.getElementById('momoSuccessRate').textContent = 'N/A';
        document.getElementById('vnpaySuccessRate').textContent = 'N/A';
    }
}

// Load performance data
async function loadPerformanceData() {
    try {
        const response = await fetch('/api/chat/response-time/stats');
        const data = await response.json();

        if (data.success) {
            const stats = data.data.stats;
            const avgTime = Math.round((stats.averageResponseTime || stats.average || 0));

            document.getElementById('avgResponseTime').textContent = avgTime;

            // Update color based on response time
            const timeElement = document.getElementById('avgResponseTime');
            if (avgTime <= 2000) {
                timeElement.style.color = '#28a745';
            } else if (avgTime <= 3000) {
                timeElement.style.color = '#ffc107';
            } else {
                timeElement.style.color = '#dc3545';
            }
        }

        // Load expired orders count
        const expiredCount = await loadExpiredOrdersCount();
        document.getElementById('expiredOrders').textContent = expiredCount;

    } catch (error) {
        console.error('Error loading performance data:', error);
        document.getElementById('avgResponseTime').textContent = 'N/A';
        document.getElementById('expiredOrders').textContent = 'N/A';
    }
}

// Load expired orders count
async function loadExpiredOrdersCount() {
    try {
        const response = await fetch('/api/cleanup/stats');
        const data = await response.json();

        if (data.success) {
            return data.data.stats.totalCleaned || 0;
        }
        return 0;
    } catch (error) {
        console.error('Error loading expired orders count:', error);
        return 0;
    }
}















// Show CSAT trend chart in main chart area
async function showCSATTrendChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    // Destroy existing chart
    if (window.mainChart && typeof window.mainChart.destroy === 'function') {
        window.mainChart.destroy();
    }

    // Lấy CSAT trend data thật
    const labels = [];
    const data = [];

    try {
        // Thử lấy từ API CSAT trend (sử dụng session-rating)
        const response = await fetch('/api/chat/session-rating/trend?months=12');
        const responseData = await response.json();

        if (responseData.success && responseData.data.trend) {
            responseData.data.trend.forEach(point => {
                labels.push(new Date(point.month).toLocaleDateString('vi-VN', { month: 'short' }));
                data.push(point.averageRating || 0);
            });
        } else {
            throw new Error('No CSAT trend data available');
        }
    } catch (error) {
        console.log('Using current CSAT data as flat trend');
        const currentScore = dashboardData.csatData?.averageScore || 0;
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            labels.push(date.toLocaleDateString('vi-VN', { month: 'short' }));
            data.push(Number(currentScore).toFixed(1));
        }
    }

    window.mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'CSAT Score',
                data: data,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 5,
                    title: {
                        display: true,
                        text: 'Điểm CSAT (1-5)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Xu hướng CSAT theo tháng'
                }
            }
        }
    });
}

// Show performance trend chart in main chart area
async function showPerformanceTrendChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    // Destroy existing chart
    if (window.mainChart && typeof window.mainChart.destroy === 'function') {
        window.mainChart.destroy();
    }

    // Lấy performance data thật
    const labels = [];
    const avgData = [];
    const p95Data = [];

    try {
        // Thử lấy từ API response time trend
        const response = await fetch('/api/chat/response-time/stats');
        const responseData = await response.json();

        if (responseData.success && responseData.data.monthlyTrend) {
            responseData.data.monthlyTrend.forEach(point => {
                labels.push(new Date(point.month).toLocaleDateString('vi-VN', { month: 'short' }));
                avgData.push(point.averageResponseTime || point.avgResponseTime || 0);
                p95Data.push(point.p95 || 0);
            });
        } else {
            throw new Error('No performance trend data available');
        }
    } catch (error) {
        console.log('Using flat performance trend based on current values');
        const currentAvg = dashboardData.performanceData?.avgResponseTime || 0;
        const currentP95 = dashboardData.performanceData?.p95 || 0;

        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            labels.push(date.toLocaleDateString('vi-VN', { month: 'short' }));
            avgData.push(currentAvg);
            p95Data.push(currentP95);
        }
    }

    window.mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Thời gian TB (ms)',
                data: avgData,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                tension: 0.4
            }, {
                label: 'P95 (ms)',
                data: p95Data,
                borderColor: '#ffc107',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Thời gian (ms)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Hiệu năng Chatbot theo tháng'
                }
            }
        }
    });
}

