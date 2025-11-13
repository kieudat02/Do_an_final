// JavaScript Quản lý Đơn hàng
document.addEventListener("DOMContentLoaded", function () {

    // Thiết lập xử lý tab trạng thái
    setupStatusTabs();

    // Thiết lập chức năng tìm kiếm
    setupSearchHandler();

    // Tải danh sách đơn hàng (lần đầu)
    loadOrders();

    // Thiết lập xử lý cập nhật trạng thái
    setupStatusUpdateHandler();

    // Thiết lập xử lý xóa
    setupDeleteHandler();

    // Thiết lập dropdown tùy chỉnh
    setupCustomDropdowns();
});

// Trạng thái hiện tại
const orderState = {
    currentPage: 1,
    itemsPerPage: 10,
    currentStatus: 'all',
    searchQuery: '',
    totalPages: 0
};

// Thiết lập xử lý tab trạng thái
function setupStatusTabs() {
    const statusSelect = document.getElementById('statusFilter');

    statusSelect.addEventListener('change', function() {
        // Cập nhật trạng thái hiện tại
        orderState.currentStatus = this.value;

        // Reset về trang 1
        orderState.currentPage = 1;

        // Tải đơn hàng với trạng thái mới
        loadOrders();
    });
}

// Thiết lập xử lý tìm kiếm
function setupSearchHandler() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const clearButton = document.getElementById('clearSearch');

    // Hiển thị/ẩn nút xóa dựa trên nội dung input
    searchInput.addEventListener('input', function() {
        clearButton.style.display = this.value.trim() !== '' ? 'block' : 'none';
    });

    // Xóa tìm kiếm khi nhấn nút xóa
    clearButton.addEventListener('click', function() {
        searchInput.value = '';
        clearButton.style.display = 'none';
        if (orderState.searchQuery !== '') {
            orderState.searchQuery = '';
            orderState.currentPage = 1;
            loadOrders();
        }
    });

    // Tìm kiếm khi nhấn nút
    searchButton.addEventListener('click', function() {
        orderState.searchQuery = searchInput.value.trim();
        orderState.currentPage = 1;
        loadOrders();
    });

    // Tìm kiếm khi nhấn Enter
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            orderState.searchQuery = searchInput.value.trim();
            orderState.currentPage = 1;
            loadOrders();
        }
    });
}

// Tải danh sách đơn hàng với bộ lọc hiện tại
function loadOrders() {
    // Hiển thị trạng thái đang tải
    document.getElementById('ordersList').innerHTML = `
        <tr>
            <td colspan="11" class="order__table-empty">
                <i class="fas fa-spinner fa-spin me-2"></i> Đang tải dữ liệu...
            </td>
        </tr>
    `;

    // Xây dựng chuỗi query
    const queryParams = new URLSearchParams({
        page: orderState.currentPage,
        limit: orderState.itemsPerPage,
        status: orderState.currentStatus,
        search: orderState.searchQuery
    });

    // Gọi API lấy danh sách đơn hàng
    fetch(`/api/orders?${queryParams}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': window.csrfToken
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Cập nhật tổng số trang
            orderState.totalPages = data.totalPages || 1;

            // Render danh sách đơn hàng
            renderOrders(data.orders);

            // Render phân trang
            renderPagination();
        } else {
            showToastNotification(data.message || 'Không thể tải danh sách đơn hàng', 'error');
            document.getElementById('ordersList').innerHTML = `
                <tr>
                    <td colspan="11" class="order__table-empty">
                        <i class="fas fa-exclamation-triangle me-2"></i> Có lỗi xảy ra khi tải dữ liệu
                    </td>
                </tr>
            `;
        }
    })
    .catch(() => {
        showToastNotification('Có lỗi xảy ra khi tải danh sách đơn hàng', 'error');
        document.getElementById('ordersList').innerHTML = `
            <tr>
                <td colspan="11" class="order__table-empty">
                    <i class="fas fa-exclamation-triangle me-2"></i> Có lỗi xảy ra khi tải dữ liệu
                </td>
            </tr>
        `;
    });
}

// Render danh sách đơn hàng ra bảng
function renderOrders(orders) {
    const ordersList = document.getElementById('ordersList');

    // Xóa nội dung cũ
    ordersList.innerHTML = '';

    // Kiểm tra có đơn hàng nào không
    if (!orders || orders.length === 0) {
        ordersList.innerHTML = `
            <tr>
                <td colspan="12" class="order__table-empty">
                    Không tìm thấy đơn hàng nào
                </td>
            </tr>
        `;
        return;
    }

    // Tính chỉ số bắt đầu cho trang hiện tại
    const startIndex = (orderState.currentPage - 1) * orderState.itemsPerPage + 1;

    // Render từng đơn hàng
    orders.forEach((order, index) => {
        const row = document.createElement('tr');

        // Định dạng ngày
        const orderDate = new Date(order.createdAt);
        const formattedDate = formatDate(orderDate);

        // Định dạng tiền tệ
        const formattedTotal = formatCurrency(order.totalAmount);

        // Badge trạng thái
        const orderStatusBadge = getStatusBadge(order.status);
        const paymentStatusBadge = getPaymentStatusBadge(order.paymentStatus);

        // Cắt ngắn văn bản dài
        const truncatedNotes = truncateText(order.notes || '-', 30);
        const truncatedEmail = truncateText(order.email, 25);
        const truncatedCustomer = truncateText(order.customer, 15);

        // Nội dung hàng
        row.innerHTML = `
            <td title="${startIndex + index}">${startIndex + index}</td>
            <td title="${order.orderId || '-'}"><strong>${order.orderId || '-'}</strong></td>
            <td title="${order.customer}">${truncatedCustomer}</td>
            <td title="${order.email}">${truncatedEmail}</td>
            <td title="${order.phone || '-'}">${order.phone || '-'}</td>
            <td title="${order.notes || '-'}">${truncatedNotes}</td>
            <td>${orderStatusBadge}</td>
            <td title="${formattedTotal}">${formattedTotal}</td>
            <td title="${getPaymentMethodText(order.paymentMethod)}">${getPaymentMethodText(order.paymentMethod)}</td>
            <td>${paymentStatusBadge}</td>
            <td title="${formattedDate}">${formattedDate}</td>
            <td>
                <div class="d-flex gap-1 justify-content-center">
                    <a
                        href="/orders/${order._id}"
                        class="order__btn order__btn--primary order__btn--sm"
                        title="Xem chi tiết"
                    >
                        <i class="fas fa-eye"></i>
                    </a>
                    <button
                        class="order__btn order__btn--warning order__btn--sm"
                        onclick="showStatusUpdateModal('${order._id}', '${order.status}', '${order.paymentStatus}')"
                        title="Cập nhật trạng thái"
                    >
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;

        ordersList.appendChild(row);
    });
}

// Định dạng ngày giờ
function formatDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'decimal',
        maximumFractionDigits: 0
    }).format(amount) + ' VNĐ';
}

// Cắt ngắn văn bản với dấu ba chấm
function truncateText(text, maxLength) {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Lấy text phương thức thanh toán
function getPaymentMethodText(method) {
    switch(method) {
        case 'cash':
            return 'Tiền mặt';
        case 'bank_transfer':
            return 'Chuyển khoản';
        case 'credit_card':
            return 'Thẻ tín dụng';
        case 'momo':
            return 'MoMo';
        case 'zalo_pay':
            return 'ZaloPay';
        default:
            return method || 'Chưa chọn';
    }
}

// Lấy HTML badge trạng thái đơn hàng
function getStatusBadge(status) {
    switch (status) {
        case 'pending':
            return '<span class="order__badge order__badge--pending">Đang chờ</span>';
        case 'confirmed':
            return '<span class="order__badge order__badge--confirmed">Đã xác nhận</span>';
        case 'completed':
            return '<span class="order__badge order__badge--completed">Hoàn thành</span>';
        case 'cancelled':
            return '<span class="order__badge order__badge--cancelled">Đã hủy</span>';
        default:
            return '<span class="order__badge">Không xác định</span>';
    }
}

// Lấy HTML badge trạng thái thanh toán
function getPaymentStatusBadge(status) {
    switch (status) {
        case 'pending':
            return '<span class="order__badge order__badge--unpaid">Chưa thanh toán</span>';
        case 'completed':
            return '<span class="order__badge order__badge--completed">Đã thanh toán</span>';
        case 'failed':
            return '<span class="order__badge order__badge--cancelled">Thanh toán thất bại</span>';
        case 'refund':
            return '<span class="order__badge order__badge--refund">Hoàn tiền</span>';
        default:
            return '<span class="order__badge">Không xác định</span>';
    }
}

// Render phân trang
function renderPagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    // Không hiển thị phân trang nếu chỉ có 1 trang
    if (orderState.totalPages <= 1) return;

    // Nút trang trước
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${orderState.currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Previous" ${orderState.currentPage === 1 ? '' : 'onclick="goToPage(' + (orderState.currentPage - 1) + ')"'}>
            <span aria-hidden="true">&laquo;</span>
        </a>
    `;
    pagination.appendChild(prevLi);

    // Số trang
    let startPage = Math.max(1, orderState.currentPage - 2);
    let endPage = Math.min(orderState.totalPages, startPage + 4);

    // Điều chỉnh nếu gần cuối
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === orderState.currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `
            <a class="page-link" href="#" onclick="goToPage(${i})">${i}</a>
        `;
        pagination.appendChild(pageLi);
    }

    // Nút trang sau
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${orderState.currentPage === orderState.totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Next" ${orderState.currentPage === orderState.totalPages ? '' : 'onclick="goToPage(' + (orderState.currentPage + 1) + ')"'}>
            <span aria-hidden="true">&raquo;</span>
        </a>
    `;
    pagination.appendChild(nextLi);
}

// Chuyển đến trang cụ thể
function goToPage(page) {
    orderState.currentPage = page;
    loadOrders();
    // Cuộn lên đầu bảng
    document.querySelector('.order__table--wrapper').scrollIntoView({ behavior: 'smooth' });
}

// Hiển thị modal chi tiết đơn hàng
function showOrderDetails(orderId) {
    // Lấy modal
    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));

    // Hiển thị trạng thái đang tải
    document.getElementById('orderDetailsContent').innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
            <p>Đang tải thông tin đơn hàng...</p>
        </div>
    `;

    // Hiển thị modal
    modal.show();

    // Gọi API lấy chi tiết đơn hàng
    fetch(`/api/orders/${orderId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': window.csrfToken
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderOrderDetails(data.order);
        } else {
            document.getElementById('orderDetailsContent').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i> ${data.message || 'Không thể tải thông tin đơn hàng'}
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('orderDetailsContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i> Có lỗi xảy ra khi tải thông tin đơn hàng
            </div>
        `;
    });
}

// Render chi tiết đơn hàng trong modal
function renderOrderDetails(order) {
    // Định dạng ngày
    const orderDate = new Date(order.createdAt);
    const formattedDate = formatDate(orderDate);

    // Định dạng tiền tệ
    const formattedTotal = formatCurrency(order.totalAmount);

    // Badge trạng thái
    const orderStatusBadge = getStatusBadge(order.status);
    const paymentStatusBadge = getPaymentStatusBadge(order.paymentStatus);

    // Tạo nội dung HTML
    let html = `
        <div class="order__details">
            <div class="order__details-header">
                <h4 class="order__details-title">Đơn hàng #${order.orderId || order._id.substring(0, 8)}</h4>
                <div>${orderStatusBadge} ${paymentStatusBadge}</div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="order__details-section">
                        <h5>Thông tin khách hàng</h5>
                        <div class="mb-2">
                            <div class="order__details-label">Họ tên:</div>
                            <div class="order__details-value">${order.customer}</div>
                        </div>
                        <div class="mb-2">
                            <div class="order__details-label">Email:</div>
                            <div class="order__details-value">${order.email}</div>
                        </div>
                        <div class="mb-2">
                            <div class="order__details-label">Số điện thoại:</div>
                            <div class="order__details-value">${order.phone || 'Không có'}</div>
                        </div>
                        <div class="mb-2">
                            <div class="order__details-label">Địa chỉ:</div>
                            <div class="order__details-value">${order.address || 'Không có'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="order__details-section">
                        <h5>Thông tin đơn hàng</h5>
                        <div class="mb-2">
                            <div class="order__details-label">Mã đơn hàng:</div>
                            <div class="order__details-value">${order.orderId || order._id}</div>
                        </div>
                        <div class="mb-2">
                            <div class="order__details-label">Ngày đặt:</div>
                            <div class="order__details-value">${formattedDate}</div>
                        </div>
                        <div class="mb-2">
                            <div class="order__details-label">Phương thức thanh toán:</div>
                            <div class="order__details-value">${getPaymentMethodText(order.paymentMethod)}</div>
                        </div>
                        <div class="mb-2">
                            <div class="order__details-label">Tổng tiền:</div>
                            <div class="order__details-value"><strong>${formattedTotal}</strong></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="order__details-section mt-3">
                <h5>Chi tiết sản phẩm</h5>
    `;

    // Kiểm tra có sản phẩm nào không
    if (order.items && order.items.length > 0) {
        html += `
            <table class="order__details-table">
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th>Đơn giá</th>
                        <th>Số lượng</th>
                        <th>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Thêm từng sản phẩm
        order.items.forEach(item => {
            const itemPrice = formatCurrency(item.price);
            const itemTotal = formatCurrency(item.price * item.quantity);

            // Xây dựng thông tin khách
            let guestInfo = '';
            if (item.adults) guestInfo += `${item.adults} người lớn`;
            if (item.children && item.children > 0) guestInfo += `, ${item.children} trẻ em`;
            if (item.babies && item.babies > 0) guestInfo += `, ${item.babies} em bé`;
            if (item.singleRooms && item.singleRooms > 0) {
                guestInfo += `<br><small style="color:#856404; font-style:italic;">+ Phụ thu phòng đơn: ${item.singleRooms} phòng</small>`;
            }

            html += `
                <tr>
                    <td>
                        <div>${item.name}</div>
                        ${guestInfo ? `<small class="text-muted">${guestInfo}</small>` : ''}
                    </td>
                    <td>${itemPrice}</td>
                    <td>${item.quantity}</td>
                    <td>${itemTotal}</td>
                </tr>
            `;
        });

        // Thêm dòng tổng cộng
        html += `
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="order__details-table-total">Tổng cộng:</td>
                        <td class="order__details-table-total">${formattedTotal}</td>
                    </tr>
                </tfoot>
            </table>
        `;
    } else {
        html += `<p class="text-muted">Không có thông tin chi tiết sản phẩm</p>`;
    }

    // Thêm ghi chú nếu có
    html += `
            </div>

            <div class="order__details-section mt-3">
                <h5>Ghi chú</h5>
                <p>${order.notes || 'Không có ghi chú'}</p>
            </div>
        </div>
    `;

    // Cập nhật nội dung modal
    document.getElementById('orderDetailsContent').innerHTML = html;
}

// Thiết lập xử lý cập nhật trạng thái
function setupStatusUpdateHandler() {
    const saveButton = document.getElementById('saveStatusButton');

    saveButton.addEventListener('click', function() {
        const orderId = document.getElementById('updateOrderId').value;
        const newStatus = document.getElementById('orderStatus').value;
        const newPaymentStatus = document.getElementById('paymentStatus').value;

        // Hiển thị trạng thái đang lưu
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang lưu...';
        saveButton.disabled = true;

        // Gửi request cập nhật
        fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': window.csrfToken
            },
            body: JSON.stringify({
                status: newStatus,
                paymentStatus: newPaymentStatus,
                _csrf: window.csrfToken
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Ẩn modal
                bootstrap.Modal.getInstance(document.getElementById('statusUpdateModal')).hide();

                // Hiển thị thông báo thành công
                showToastNotification('Cập nhật trạng thái đơn hàng thành công', 'success');

                // Tải lại danh sách đơn hàng
                loadOrders();
            } else {
                showToastNotification(data.message || 'Không thể cập nhật trạng thái đơn hàng', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToastNotification('Có lỗi xảy ra khi cập nhật trạng thái đơn hàng', 'error');
        })
        .finally(() => {
            // Reset trạng thái nút
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
        });
    });
}

// Hiển thị modal xác nhận xóa
function showDeleteModal(orderId) {
    // Hàm này được giữ lại để tương thích nhưng không sử dụng trong UI
    // Thiết lập ID đơn hàng trong modal
    document.getElementById('deleteOrderId').value = orderId;

    // Hiển thị modal
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    modal.show();
}

// Thiết lập xử lý xóa
function setupDeleteHandler() {
    // Hàm này được giữ lại để tương thích nhưng không sử dụng trong UI
    const confirmDeleteButton = document.getElementById('confirmDeleteButton');

    if (!confirmDeleteButton) return;

    confirmDeleteButton.addEventListener('click', function() {
        const orderId = document.getElementById('deleteOrderId').value;

        // Hiển thị trạng thái đang xóa
        const originalText = confirmDeleteButton.innerHTML;
        confirmDeleteButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xóa...';
        confirmDeleteButton.disabled = true;

        // Gửi request xóa
        fetch(`/api/orders/${orderId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': window.csrfToken
            },
            body: JSON.stringify({
                _csrf: window.csrfToken
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Ẩn modal
                bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();

                // Hiển thị thông báo thành công
                showToastNotification('Xóa đơn hàng thành công', 'success');

                // Tải lại danh sách đơn hàng
                loadOrders();
            } else {
                showToastNotification(data.message || 'Không thể xóa đơn hàng', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToastNotification('Có lỗi xảy ra khi xóa đơn hàng', 'error');
        })
        .finally(() => {
            // Reset trạng thái nút
            confirmDeleteButton.innerHTML = originalText;
            confirmDeleteButton.disabled = false;
        });
    });
}

// Hiển thị thông báo toast
function showToastNotification(message, type) {
    // Tạo element toast
    const toast = document.createElement('div');
    toast.className = `modal-notify modal-notify--active modal-notify--${type}`;
    toast.innerHTML = `
        <div class="modal-notify__content">
            <span class="modal-notify__message">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>${message}
            </span>
            <button class="modal-notify__close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Thêm vào document
    document.body.appendChild(toast);

    // Tự động xóa sau 5 giây
    setTimeout(() => {
        toast.classList.remove('modal-notify--active');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

// Thiết lập dropdown tùy chỉnh
function setupCustomDropdowns() {
    const customSelects = document.querySelectorAll('.order__custom-select');

    customSelects.forEach(selectEl => {
        const trigger = selectEl.querySelector('.order__custom-select-trigger');
        const dropdown = selectEl.querySelector('.order__custom-select-dropdown');
        const textEl = selectEl.querySelector('.order__custom-select-text');
        const items = selectEl.querySelectorAll('.order__custom-select-item');
        const hiddenInput = selectEl.querySelector('input[type="hidden"]');

        // Bật/tắt dropdown
        trigger.addEventListener('click', function(e) {
            e.stopPropagation();

            // Đóng tất cả dropdown khác
            document.querySelectorAll('.order__custom-select-dropdown.active').forEach(dd => {
                if (dd !== dropdown) {
                    dd.classList.remove('active');
                    dd.parentElement.querySelector('.order__custom-select-trigger').classList.remove('active');
                }
            });

            // Bật/tắt dropdown hiện tại
            dropdown.classList.toggle('active');
            trigger.classList.toggle('active');
        });

        // Xử lý chọn item
        items.forEach(item => {
            item.addEventListener('click', function(e) {
                e.stopPropagation();

                // Xóa class selected khỏi tất cả items
                items.forEach(i => i.classList.remove('selected'));

                // Thêm class selected vào item được chọn
                this.classList.add('selected');

                // Cập nhật text và giá trị hidden input
                textEl.textContent = this.textContent;
                hiddenInput.value = this.dataset.value;

                // Đóng dropdown
                dropdown.classList.remove('active');
                trigger.classList.remove('active');
            });
        });
    });

    // Đóng dropdown khi click bên ngoài
    document.addEventListener('click', function() {
        document.querySelectorAll('.order__custom-select-dropdown.active').forEach(dropdown => {
            dropdown.classList.remove('active');
            dropdown.parentElement.querySelector('.order__custom-select-trigger').classList.remove('active');
        });
    });
}

// Hiển thị modal cập nhật trạng thái và thiết lập giá trị được chọn
function showStatusUpdateModal(orderId, currentStatus, currentPaymentStatus) {
    // Thiết lập ID đơn hàng trong modal
    document.getElementById('updateOrderId').value = orderId;

    // Cập nhật dropdown trạng thái đơn hàng
    const orderStatusSelect = document.getElementById('orderStatusSelect');
    const orderStatusItems = orderStatusSelect.querySelectorAll('.order__custom-select-item');
    const orderStatusText = orderStatusSelect.querySelector('.order__custom-select-text');
    const orderStatusHidden = document.getElementById('orderStatus');

    orderStatusItems.forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.value === currentStatus) {
            item.classList.add('selected');
            orderStatusText.textContent = item.textContent;
            orderStatusHidden.value = currentStatus;
        }
    });

    // Cập nhật dropdown trạng thái thanh toán
    const paymentStatusSelect = document.getElementById('paymentStatusSelect');
    const paymentStatusItems = paymentStatusSelect.querySelectorAll('.order__custom-select-item');
    const paymentStatusText = paymentStatusSelect.querySelector('.order__custom-select-text');
    const paymentStatusHidden = document.getElementById('paymentStatus');

    paymentStatusItems.forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.value === currentPaymentStatus) {
            item.classList.add('selected');
            paymentStatusText.textContent = item.textContent;
            paymentStatusHidden.value = currentPaymentStatus;
        }
    });

    // Hiển thị modal
    const modal = new bootstrap.Modal(document.getElementById('statusUpdateModal'));
    modal.show();
}
