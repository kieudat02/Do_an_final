// Quản lý phân quyền JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Thiết lập xử lý cập nhật quyền
    setupPermissionUpdateHandler();
});

// Thiết lập xử lý form cập nhật quyền
function setupPermissionUpdateHandler() {
    const form = document.querySelector('#permissionsForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        showPermissionUpdateModal();
    });
}

// Hiển thị modal xác nhận cập nhật quyền
function showPermissionUpdateModal() {
    const updateModal = new bootstrap.Modal(document.getElementById('permissionUpdateModal'));
    updateModal.show();
    
    // Xử lý nút xác nhận - thay thế để tránh trình nghe trùng lặp
    const confirmUpdateBtn = document.getElementById('confirmPermissionUpdateBtn');
    const newConfirmBtn = confirmUpdateBtn.cloneNode(true);
    confirmUpdateBtn.parentNode.replaceChild(newConfirmBtn, confirmUpdateBtn);
    
    newConfirmBtn.addEventListener('click', function() {
        updateModal.hide();
        performPermissionUpdate();
    });
}

function performPermissionUpdate() {
    const form = document.querySelector('#permissionsForm');
    const submitButton = document.querySelector('.permissions__btn--primary');
    const originalHTML = submitButton.innerHTML;
    
    // Vô hiệu hóa nút
    submitButton.disabled = true;
    
    // Chuyển FormData sang URLSearchParams để mã hóa form đúng
    const formData = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of formData) {
        params.append(key, value);
    }
    
    // Thêm CSRF token nếu có
    if (window.csrfToken) {
        params.append('_csrf', window.csrfToken);
    }
    

    fetch('/api/permissions/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': window.csrfToken || ''
        },
        body: params
    })
    .then(async response => {
        let data;
        const contentType = response.headers.get('content-type');
        
        try {
            const responseText = await response.text();
            
            // Cố gắng phân tích dưới dạng JSON
            if (contentType && contentType.includes('application/json') || 
                responseText.trim().startsWith('{') || 
                responseText.trim().startsWith('[')) {
                data = JSON.parse(responseText);
            } else {
                // Xử lý phản hồi HTML có thể chỉ ra chuyển hướng
                if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
                    if (responseText.includes('window.location') || responseText.includes('Redirecting')) {
                        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                    }
                    throw new Error('Server đang trả về trang web thay vì dữ liệu.');
                }
                
                throw new Error(`Server trả về dữ liệu không hợp lệ.`);
            }
        } catch (parseError) {
            if (parseError.message.includes('Server')) {
                throw parseError;
            }
            throw new Error('Không thể phân tích dữ liệu từ server.');
        }
        
        // Kiểm tra mã trạng thái
        if (!response.ok) {
            if (response.status === 401) {
                showToastNotification('Phiên đăng nhập đã hết hạn. Đang chuyển hướng...', 'warning');
                setTimeout(() => {
                    window.location.href = data?.redirectTo || '/login';
                }, 2000);
                return;
            } else if (response.status === 403) {
                throw new Error(data?.message || 'Bạn không có quyền thực hiện hành động này');
            } else {
                throw new Error(data?.message || `Lỗi ${response.status}: ${response.statusText}`);
            }
        }
        
        return data;
    })
    .then(data => {
        if (data && data.success) {
            // Hiển thị thông báo thành công
            showToastNotification(data.message, 'success');
            
            // Hiển thị chi tiết thay đổi vai trò nếu có
            if (data.changedRoles && Object.keys(data.changedRoles).length > 0) {
                const roleCount = Object.keys(data.changedRoles).length;
                
                // Hiển thị thay đổi vai trò chi tiết với thời gian so le
                Object.keys(data.changedRoles).forEach((roleName, index) => {
                    const roleDetail = data.changedRoles[roleName];
                    setTimeout(() => {
                        showToastNotification(
                            `${roleName}: ${roleDetail.message}`, 
                            roleDetail.success ? 'info' : 'warning'
                        );
                    }, 1000 + (index * 800));
                });
                
                // Tải lại trang sau khi hiển thị tất cả thông báo
                setTimeout(() => window.location.reload(), 1500 + (roleCount * 800));
            } else {
                // Không có thay đổi vai trò
                setTimeout(() => window.location.reload(), 2000);
            }
        } else if (data && data.totalChanged === 0) {
            showToastNotification(data.message || 'Không có thay đổi nào được thực hiện', 'info');
        } else {
            throw new Error(data?.message || 'Cập nhật phân quyền thất bại');
        }
    })
    .catch(error => {
        showToastNotification(
            error.message || 'Có lỗi xảy ra khi cập nhật phân quyền. Vui lòng thử lại!',
            'error'
        );
    })
    .finally(() => {
        // Kích hoạt lại nút
        submitButton.disabled = false;
        submitButton.innerHTML = originalHTML;
    });
}

// Làm nổi bật thay đổi khi checkbox thay đổi
document.addEventListener('change', function(e) {
    if (e.target.type === 'checkbox' && e.target.name.includes('permissions')) {
        const cell = e.target.closest('td');
        if (e.target.checked) {
            cell.style.backgroundColor = '#e3f2fd';
        } else {
            cell.style.backgroundColor = '';
        }
    }
});
