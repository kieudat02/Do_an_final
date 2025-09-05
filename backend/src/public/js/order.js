// Order Management JavaScript
document.addEventListener("DOMContentLoaded", function () {

    // Set up status tab handlers
    setupStatusTabs();
    
    // Setup search functionality
    setupSearchHandler();
    
    // Load orders (initial load)
    loadOrders();
    
    // Setup status update handler
    setupStatusUpdateHandler();
    
    // Setup delete handlers
    setupDeleteHandler();
});

// Current state
const orderState = {
    currentPage: 1,
    itemsPerPage: 10,
    currentStatus: 'all',
    searchQuery: '',
    totalPages: 0
};

// Setup status tab handlers
function setupStatusTabs() {
    const statusSelect = document.getElementById('statusFilter');
    
    statusSelect.addEventListener('change', function() {
        // Update current status
        orderState.currentStatus = this.value;
        
        // Reset to page 1
        orderState.currentPage = 1;
        
        // Load orders with new status
        loadOrders();
    });
}

// Setup search handler
function setupSearchHandler() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const clearButton = document.getElementById('clearSearch');
    
    // Show/hide clear button based on input content
    searchInput.addEventListener('input', function() {
        clearButton.style.display = this.value.trim() !== '' ? 'block' : 'none';
    });
    
    // Clear search when clear button is clicked
    clearButton.addEventListener('click', function() {
        searchInput.value = '';
        clearButton.style.display = 'none';
        if (orderState.searchQuery !== '') {
            orderState.searchQuery = '';
            orderState.currentPage = 1;
            loadOrders();
        }
    });
    
    // Search when button is clicked
    searchButton.addEventListener('click', function() {
        orderState.searchQuery = searchInput.value.trim();
        orderState.currentPage = 1;
        loadOrders();
    });
    
    // Search when Enter is pressed
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            orderState.searchQuery = searchInput.value.trim();
            orderState.currentPage = 1;
            loadOrders();
        }
    });
}

// Load orders with current filters
function loadOrders() {
    // Show loading state
    document.getElementById('ordersList').innerHTML = `
        <tr>
            <td colspan="11" class="order__table-empty">
                <i class="fas fa-spinner fa-spin me-2"></i> Đang tải dữ liệu...
            </td>
        </tr>
    `;
    
    // Build query string
    const queryParams = new URLSearchParams({
        page: orderState.currentPage,
        limit: orderState.itemsPerPage,
        status: orderState.currentStatus,
        search: orderState.searchQuery
    });
    
    // Fetch orders
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
            // Update total pages
            orderState.totalPages = data.totalPages || 1;
            
            // Render orders
            renderOrders(data.orders);
            
            // Render pagination
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
    .catch(error => {
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

// Render orders to table
function renderOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    
    // Clear existing content
    ordersList.innerHTML = '';
    
    // Check if there are any orders
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
    
    // Calculate starting index for this page
    const startIndex = (orderState.currentPage - 1) * orderState.itemsPerPage + 1;
    
    // Render each order
    orders.forEach((order, index) => {
        const row = document.createElement('tr');
        
        // Format date
        const orderDate = new Date(order.createdAt);
        const formattedDate = formatDate(orderDate);
        
        // Format currency
        const formattedTotal = formatCurrency(order.totalAmount);
        
        // Status badges
        const orderStatusBadge = getStatusBadge(order.status);
        const paymentStatusBadge = getPaymentStatusBadge(order.paymentStatus);
        
        // Truncate long text
        const truncatedAddress = truncateText(order.address || '-', 30);
        const truncatedEmail = truncateText(order.email, 25);
        const truncatedCustomer = truncateText(order.customer, 15);
        
        // Row content
        row.innerHTML = `
            <td title="${startIndex + index}">${startIndex + index}</td>
            <td title="${order.orderId || '-'}"><strong>${order.orderId || '-'}</strong></td>
            <td title="${order.customer}">${truncatedCustomer}</td>
            <td title="${order.email}">${truncatedEmail}</td>
            <td title="${order.phone || '-'}">${order.phone || '-'}</td>
            <td title="${order.address || '-'}">${truncatedAddress}</td>
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

// Format date in a more compact way
function formatDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Format currency in a more compact way
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'decimal',
        maximumFractionDigits: 0
    }).format(amount) + ' VNĐ';
}

// Truncate text with ellipsis
function truncateText(text, maxLength) {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Get payment method text
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

// Get HTML for status badge
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

// Get HTML for payment status badge
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

// Render pagination
function renderPagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    // Don't show pagination if only one page
    if (orderState.totalPages <= 1) return;
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${orderState.currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Previous" ${orderState.currentPage === 1 ? '' : 'onclick="goToPage(' + (orderState.currentPage - 1) + ')"'}>
            <span aria-hidden="true">&laquo;</span>
        </a>
    `;
    pagination.appendChild(prevLi);
    
    // Page numbers
    let startPage = Math.max(1, orderState.currentPage - 2);
    let endPage = Math.min(orderState.totalPages, startPage + 4);
    
    // Adjust if we're near the end
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
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${orderState.currentPage === orderState.totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Next" ${orderState.currentPage === orderState.totalPages ? '' : 'onclick="goToPage(' + (orderState.currentPage + 1) + ')"'}>
            <span aria-hidden="true">&raquo;</span>
        </a>
    `;
    pagination.appendChild(nextLi);
}

// Go to specific page
function goToPage(page) {
    orderState.currentPage = page;
    loadOrders();
    // Scroll to top of table
    document.querySelector('.order__table--wrapper').scrollIntoView({ behavior: 'smooth' });
}

// Show order details modal
function showOrderDetails(orderId) {
    // Get modal
    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    
    // Show loading state
    document.getElementById('orderDetailsContent').innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
            <p>Đang tải thông tin đơn hàng...</p>
        </div>
    `;
    
    // Show modal
    modal.show();
    
    // Fetch order details
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

// Render order details in modal
function renderOrderDetails(order) {
    // Format date
    const orderDate = new Date(order.createdAt);
    const formattedDate = formatDate(orderDate);
    
    // Format currency
    const formattedTotal = formatCurrency(order.totalAmount);
    
    // Status badges
    const orderStatusBadge = getStatusBadge(order.status);
    const paymentStatusBadge = getPaymentStatusBadge(order.paymentStatus);
    
    // Create HTML content
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
    
    // Check if there are order items
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
        
        // Add each item
        order.items.forEach(item => {
            const itemPrice = formatCurrency(item.price);
            
            const itemTotal = formatCurrency(item.price * item.quantity);
            
            html += `
                <tr>
                    <td>${item.name}</td>
                    <td>${itemPrice}</td>
                    <td>${item.quantity}</td>
                    <td>${itemTotal}</td>
                </tr>
            `;
        });
        
        // Add total row
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
    
    // Add notes if available
    html += `
            </div>
            
            <div class="order__details-section mt-3">
                <h5>Ghi chú</h5>
                <p>${order.notes || 'Không có ghi chú'}</p>
            </div>
        </div>
    `;
    
    // Update modal content
    document.getElementById('orderDetailsContent').innerHTML = html;
}

// Show status update modal
function showStatusUpdateModal(orderId, currentStatus, currentPaymentStatus) {
    // Set order ID in modal
    document.getElementById('updateOrderId').value = orderId;
    
    // Set current status values
    document.getElementById('orderStatus').value = currentStatus;
    document.getElementById('paymentStatus').value = currentPaymentStatus;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('statusUpdateModal'));
    modal.show();
}

// Setup status update handler
function setupStatusUpdateHandler() {
    const saveButton = document.getElementById('saveStatusButton');
    
    saveButton.addEventListener('click', function() {
        const orderId = document.getElementById('updateOrderId').value;
        const newStatus = document.getElementById('orderStatus').value;
        const newPaymentStatus = document.getElementById('paymentStatus').value;
        
        // Show loading state
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang lưu...';
        saveButton.disabled = true;
        
        // Send update request
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
                // Hide modal
                bootstrap.Modal.getInstance(document.getElementById('statusUpdateModal')).hide();
                
                // Show success notification
                showToastNotification('Cập nhật trạng thái đơn hàng thành công', 'success');
                
                // Reload orders to reflect changes
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
            // Reset button state
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
        });
    });
}

// Show delete confirmation modal
function showDeleteModal(orderId) {
    // This function is kept for compatibility but won't be used in the UI
    // Set order ID in modal
    document.getElementById('deleteOrderId').value = orderId;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    modal.show();
}

// Setup delete handler
function setupDeleteHandler() {
    // This function is kept for compatibility but won't be used in the UI
    const confirmDeleteButton = document.getElementById('confirmDeleteButton');
    
    if (!confirmDeleteButton) return;
    
    confirmDeleteButton.addEventListener('click', function() {
        const orderId = document.getElementById('deleteOrderId').value;
        
        // Show loading state
        const originalText = confirmDeleteButton.innerHTML;
        confirmDeleteButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xóa...';
        confirmDeleteButton.disabled = true;
        
        // Send delete request
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
                // Hide modal
                bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
                
                // Show success notification
                showToastNotification('Xóa đơn hàng thành công', 'success');
                
                // Reload orders to reflect changes
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
            // Reset button state
            confirmDeleteButton.innerHTML = originalText;
            confirmDeleteButton.disabled = false;
        });
    });
}

// Show toast notification
function showToastNotification(message, type) {
    // Create toast element
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
    
    // Add to document
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('modal-notify--active');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}
