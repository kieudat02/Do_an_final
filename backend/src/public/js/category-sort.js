// Script để quản lý thứ tự sắp xếp danh mục
document.addEventListener('DOMContentLoaded', function() {
    // Tạo nút "Sắp xếp thứ tự" nếu có quyền UPDATE_CATEGORY
    const hasUpdatePermission = document.querySelector('[data-has-update-permission]');
    if (hasUpdatePermission && hasUpdatePermission.dataset.hasUpdatePermission === 'true') {
        createSortOrderButton();
    }
});

function createSortOrderButton() {
    // Tìm vị trí để thêm nút
    const header = document.querySelector('.category__header');
    if (!header) return;

    // Tạo nút sắp xếp thứ tự
    // const sortButton = document.createElement('button');
    // sortButton.className = 'category__btn category__btn--info category__btn--sort';
    // sortButton.innerHTML = '<i class="fas fa-sort me-2"></i>Sắp xếp thứ tự';
    // sortButton.onclick = openSortModal;

    // Thêm nút vào header
    const addButton = header.querySelector('.category__btn--add');
    if (addButton) {
        addButton.parentNode.insertBefore(sortButton, addButton);
    } else {
        header.appendChild(sortButton);
    }
}

function openSortModal() {
    // Lấy danh sách categories từ bảng
    const rows = document.querySelectorAll('.category__table tbody tr');
    const categories = [];
    
    rows.forEach((row, index) => {
        const nameCell = row.querySelector('td:nth-child(2) strong');
        const sortOrderCell = row.querySelector('.category__sort-order');
        
        if (nameCell && sortOrderCell) {
            const categoryId = row.querySelector('[data-id]')?.dataset.id;
            if (categoryId) {
                categories.push({
                    id: categoryId,
                    name: nameCell.textContent.trim(),
                    sortOrder: parseInt(sortOrderCell.textContent.trim()) || 999
                });
            }
        }
    });

    // Tạo modal
    const modal = createSortModal(categories);
    document.body.appendChild(modal);
    
    // Hiển thị modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

function createSortModal(categories) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'sortOrderModal';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-sort me-2"></i>Sắp xếp thứ tự danh mục
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted mb-3">
                        Kéo thả để sắp xếp thứ tự hiển thị trong header. Số càng nhỏ càng hiển thị trước.
                    </p>
                    <div id="sortable-categories" class="list-group">
                        ${categories.map((cat, index) => `
                            <div class="list-group-item d-flex justify-content-between align-items-center sortable-item" 
                                 data-id="${cat.id}" data-sort-order="${cat.sortOrder}">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-grip-vertical me-3 text-muted" style="cursor: move;"></i>
                                    <div>
                                        <strong>${cat.name}</strong>
                                        <br>
                                        <small class="text-muted">Kéo thả để sắp xếp thứ tự</small>
                                    </div>
                                </div>
                                <div class="d-flex align-items-center">
                                    <span class="badge bg-primary">${index + 1}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        <i class="fas fa-times me-2"></i>Hủy
                    </button>
                    <button type="button" class="btn btn-primary" onclick="saveSortOrder()">
                        <i class="fas fa-save me-2"></i>Lưu thứ tự
                    </button>
                </div>
            </div>
        </div>
    `;

        // Khởi tạo sortOrder values
        updateSortOrderValues();

        // Thêm SortableJS để kéo thả
        if (typeof Sortable !== 'undefined') {
            new Sortable(document.getElementById('sortable-categories'), {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: function(evt) {
                    updateSortOrderNumbers();
                    updateSortOrderValues();
                }
            });
        }

    return modal;
}


function updateSortOrderNumbers() {
    const items = document.querySelectorAll('.sortable-item');
    items.forEach((item, index) => {
        const badge = item.querySelector('.badge');
        if (badge) {
            badge.textContent = index + 1;
        }
    });
}

function updateSortOrderValues() {
    const items = document.querySelectorAll('.sortable-item');
    items.forEach((item, index) => {
        const newSortOrder = (index + 1) * 10; // Tạo khoảng cách 10 giữa các items
        item.dataset.sortOrder = newSortOrder;
    });
}

async function saveSortOrder() {
    const items = document.querySelectorAll('.sortable-item');
    const categories = Array.from(items).map((item, index) => ({
        id: item.dataset.id,
        sortOrder: parseInt(item.dataset.sortOrder) || ((index + 1) * 10)
    }));

    try {
        const response = await fetch('/category/update-sort-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-Token': window.csrfToken || ''
            },
            credentials: 'include',
            body: JSON.stringify({ categories })
        });

        const result = await response.json();

        if (result.success) {
            // Hiển thị thông báo thành công
            showNotification('Cập nhật thứ tự sắp xếp thành công!', 'success');
            
            // Đóng modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('sortOrderModal'));
            modal.hide();
            
            // Reload trang để cập nhật thứ tự
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showNotification('Có lỗi xảy ra khi cập nhật thứ tự: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating sort order:', error);
        showNotification('Có lỗi xảy ra khi cập nhật thứ tự', 'error');
    }
}

function showNotification(message, type) {
    // Tạo thông báo
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Tự động ẩn sau 3 giây
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}
