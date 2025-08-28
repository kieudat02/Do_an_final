let currentHomeSectionId = null;
let currentHomeSectionTitle = null;
let currentStatus = null;

function showToast(message, type = 'success') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.modal-notify');
    existingToasts.forEach(toast => toast.remove());

    // Create new toast
    const toast = document.createElement('div');
    toast.className = `modal-notify modal-notify--active modal-notify--${type}`;
    toast.innerHTML = `
        <div class="modal-notify__content">
            <span class="modal-notify__message">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>${message}
            </span>
            <button class="modal-notify__close" onclick="hideToastNotification(this.closest('.modal-notify'))">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Add to page
    document.body.appendChild(toast);

    // Auto hide after 5 seconds
    setTimeout(() => {
        hideToastNotification(toast);
    }, 5000);
}

function hideToastNotification(toast) {
    if (toast) {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

// Hiển thị modal xác nhận thay đổi trạng thái
function toggleStatusModal(button) {
    currentHomeSectionId = button.dataset.id;
    currentHomeSectionTitle = button.dataset.title;
    currentStatus = button.dataset.status;
    
    // Set modal content
    document.getElementById('homeSectionNameForStatus').textContent = currentHomeSectionTitle;
    
    // Show modal
    const statusModal = new bootstrap.Modal(document.getElementById('statusModal'));
    statusModal.show();
}

// Hiển thị modal xác nhận xóa
function deleteHomeSectionModal(button) {
    currentHomeSectionId = button.dataset.id;
    currentHomeSectionTitle = button.dataset.title;
    
    // Set modal content
    document.getElementById('homeSectionNameToDelete').textContent = currentHomeSectionTitle;
    
    // Show modal
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    deleteModal.show();
}


// Thực hiện thay đổi trạng thái
function executeStatusChange() {
    if (!currentHomeSectionId) return;

    const confirmBtn = document.getElementById('confirmStatusBtn');
    
    // Close modal first
    const statusModal = bootstrap.Modal.getInstance(document.getElementById('statusModal'));
    statusModal.hide();

    // Show loading state
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
    confirmBtn.disabled = true;

    fetch(`/homeSection/toggle-status/${currentHomeSectionId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Thay đổi trạng thái thành công!', 'success');
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Có lỗi xảy ra khi thay đổi trạng thái', 'error');
    })
    .finally(() => {
        // Reset button state
        confirmBtn.innerHTML = '<i class="fas fa-toggle-on me-2"></i>Thay đổi';
        confirmBtn.disabled = false;
    });
}


// Thực hiện xóa home section
function executeDelete() {
    if (!currentHomeSectionId) return;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    // Close modal first
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    deleteModal.hide();

    // Show loading state
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xóa...';
    confirmBtn.disabled = true;

    fetch(`/homeSection/delete/${currentHomeSectionId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Add fade out animation
            const row = document.querySelector(`tr[data-id="${currentHomeSectionId}"]`);
            if (row) {
                row.style.transition = 'opacity 0.3s ease';
                row.style.opacity = '0';
                setTimeout(() => {
                    showToast('Xóa khu vực trang chủ thành công!', 'success');
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                }, 300);
            } else {
                showToast('Xóa khu vực trang chủ thành công!', 'success');
                setTimeout(() => {
                    location.reload();
                }, 1000);
            }
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Có lỗi xảy ra khi xóa khu vực trang chủ', 'error');
    })
    .finally(() => {
        // Reset button state
        confirmBtn.innerHTML = '<i class="fas fa-trash me-2"></i>Xóa';
        confirmBtn.disabled = false;
    });
}


//Reset modal data khi modal bị ẩn
function resetModalData() {
    currentHomeSectionId = null;
    currentHomeSectionTitle = null;
    currentStatus = null;
}


// Khởi tạo các event listeners khi DOM đã load
document.addEventListener('DOMContentLoaded', function() {
    // Handle status change confirmation
    const confirmStatusBtn = document.getElementById('confirmStatusBtn');
    if (confirmStatusBtn) {
        confirmStatusBtn.addEventListener('click', executeStatusChange);
    }

    // Handle delete confirmation
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', executeDelete);
    }

    // Reset modal data when status modal is hidden
    const statusModal = document.getElementById('statusModal');
    if (statusModal) {
        statusModal.addEventListener('hidden.bs.modal', resetModalData);
    }

    // Reset modal data when delete modal is hidden
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) {
        deleteModal.addEventListener('hidden.bs.modal', resetModalData);
    }
});

// Export functions to global scope for onclick handlers
window.toggleStatusModal = toggleStatusModal;
window.deleteHomeSectionModal = deleteHomeSectionModal;
window.showToast = showToast;
window.hideToastNotification = hideToastNotification;
