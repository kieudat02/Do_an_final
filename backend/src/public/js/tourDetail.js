// Tour Detail Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('Tour Detail page loaded');
    
    // Kiểm tra quyền người dùng
    const userPermissions = window.userPermissions || [];
    
    // Khởi tạo các event listener
    initEventListeners();
    
    // Tải chi tiết tour nếu có tourId
    const tourId = document.getElementById('tourId')?.value;
    if (tourId) {
        loadTourDetails(tourId);
    }
});

function initEventListeners() {
    // Event listener cho form thêm/sửa chi tiết tour
    const tourDetailForm = document.getElementById('tourDetailForm');
    if (tourDetailForm) {
        tourDetailForm.addEventListener('submit', handleTourDetailSubmit);
    }
    
    // Event listener cho các nút hành động
    document.addEventListener('click', function(e) {
        if (e.target.matches('.btn-edit-detail')) {
            const detailId = e.target.getAttribute('data-id');
            editTourDetail(detailId);
        }
        
        if (e.target.matches('.btn-delete-detail')) {
            const detailId = e.target.getAttribute('data-id');
            deleteTourDetail(detailId);
        }
        
        if (e.target.matches('.btn-add-detail')) {
            const tourId = e.target.getAttribute('data-tour-id');
            showAddTourDetailModal(tourId);
        }
    });
}

// Tải danh sách chi tiết tour
async function loadTourDetails(tourId) {
    try {
        const response = await fetch(`/api/v1/tour/${tourId}/details`);
        const data = await response.json();
        
        if (data.success) {
            updateTourDetailTable(data.data);
        } else {
            console.error('Error loading tour details:', data.message);
        }
    } catch (error) {
        console.error('Error loading tour details:', error);
    }
}

// Cập nhật bảng chi tiết tour
function updateTourDetailTable(tourDetails) {
    const tableBody = document.getElementById('tourDetailTableBody');
    if (!tableBody) return;
    
    if (tourDetails.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">Chưa có chi tiết tour</td></tr>';
        return;
    }
    
    const rows = tourDetails.map((detail, index) => {
        const startDate = new Date(detail.dayStart).toLocaleDateString('vi-VN');
        const returnDate = new Date(detail.dayReturn).toLocaleDateString('vi-VN');
        
        return `
            <tr id="tourDetail_${detail._id}">
                <td>${index + 1}</td>
                <td><strong>${formatCurrency(detail.adultPrice)} VNĐ</strong></td>
                <td>${formatCurrency(detail.childrenPrice)} VNĐ</td>
                <td>${formatCurrency(detail.childPrice)} VNĐ</td>
                <td>${formatCurrency(detail.babyPrice)} VNĐ</td>
                <td>${formatCurrency(detail.singleRoomSupplementPrice)} VNĐ</td>
                <td><span class="badge bg-info">${detail.stock}</span></td>
                <td>${startDate}</td>
                <td>${returnDate}</td>
                <td>
                    <div class="d-flex gap-1 justify-content-center">
                        <button class="tour-detail__btn tour-detail__btn--warning tour-detail__btn--sm" onclick="editTourDetail('${detail._id}')" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="tour-detail__btn tour-detail__btn--danger tour-detail__btn--sm" onclick="deleteTourDetail('${detail._id}')" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = rows;
}

// Hiển thị modal thêm chi tiết tour
function showAddTourDetailModal(tourId) {
    const modal = document.getElementById('tourDetailModal');
    const modalTitle = document.getElementById('tourDetailModalLabel');
    const form = document.getElementById('tourDetailForm');
    
    if (!modal || !form) return;
    
    // Reset form và thiết lập cho thêm mới
    form.reset();
    modalTitle.textContent = 'Thêm chi tiết tour';
    document.getElementById('tourDetailId').value = '';
    document.getElementById('tourId').value = tourId;
    
    // Hiển thị modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Chỉnh sửa chi tiết tour
async function editTourDetail(detailId) {
    try {
        const response = await fetch(`/api/v1/details/${detailId}`);
        const data = await response.json();
        
        if (data.success) {
            const detail = data.data;
            
            // Điền dữ liệu vào form
            document.getElementById('tourDetailModalLabel').textContent = 'Chỉnh sửa chi tiết tour';
            document.getElementById('tourDetailId').value = detail._id;
            document.getElementById('adultPrice').value = detail.adultPrice;
            document.getElementById('childrenPrice').value = detail.childrenPrice;
            document.getElementById('childPrice').value = detail.childPrice;
            document.getElementById('babyPrice').value = detail.babyPrice;
            document.getElementById('singleRoomSupplementPrice').value = detail.singleRoomSupplementPrice;
            document.getElementById('stock').value = detail.stock;
            document.getElementById('dayStart').value = formatDateForInput(detail.dayStart);
            document.getElementById('dayReturn').value = formatDateForInput(detail.dayReturn);
            document.getElementById('discount').value = detail.discount || 0;
            
            // Hiển thị modal
            const modal = new bootstrap.Modal(document.getElementById('tourDetailModal'));
            modal.show();
        } else {
            showAlert('error', data.message || 'Không thể tải thông tin chi tiết tour');
        }
    } catch (error) {
        console.error('Error loading tour detail:', error);
        showAlert('error', 'Có lỗi xảy ra khi tải thông tin chi tiết tour');
    }
}

// Xóa chi tiết tour
async function deleteTourDetail(detailId) {
    if (!confirm('Bạn có chắc chắn muốn xóa chi tiết tour này?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/v1/details/${detailId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Xóa hàng khỏi bảng
            const row = document.getElementById(`tourDetail_${detailId}`);
            if (row) {
                row.remove();
            }
            
            showAlert('success', 'Xóa chi tiết tour thành công');
            
            // Tải lại trang để cập nhật giá tour
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            showAlert('error', data.message || 'Có lỗi xảy ra khi xóa chi tiết tour');
        }
    } catch (error) {
        console.error('Error deleting tour detail:', error);
        showAlert('error', 'Có lỗi xảy ra khi xóa chi tiết tour');
    }
}

// Xử lý submit form chi tiết tour
async function handleTourDetailSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    const detailId = data.tourDetailId;
    const tourId = data.tourId;
    
    // Validate dữ liệu
    if (!validateTourDetailData(data)) {
        return;
    }
    
    const url = detailId ? `/api/v1/details/${detailId}` : `/api/v1/tour/${tourId}/details`;
    const method = detailId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('success', result.message);
            
            // Đóng modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('tourDetailModal'));
            if (modal) {
                modal.hide();
            }
            
            // Tải lại trang để cập nhật danh sách và giá tour
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            showAlert('error', result.message || 'Có lỗi xảy ra khi lưu chi tiết tour');
        }
    } catch (error) {
        console.error('Error saving tour detail:', error);
        showAlert('error', 'Có lỗi xảy ra khi lưu chi tiết tour');
    }
}

// Validate dữ liệu chi tiết tour
function validateTourDetailData(data) {
    // Kiểm tra các trường bắt buộc
    if (!data.adultPrice || parseFloat(data.adultPrice) <= 0) {
        showAlert('error', 'Giá người lớn phải lớn hơn 0');
        return false;
    }
    
    if (!data.stock || parseInt(data.stock) <= 0) {
        showAlert('error', 'Số lượng chỗ phải lớn hơn 0');
        return false;
    }
    
    if (!data.dayStart) {
        showAlert('error', 'Vui lòng chọn ngày khởi hành');
        return false;
    }
    
    if (!data.dayReturn) {
        showAlert('error', 'Vui lòng chọn ngày trở lại');
        return false;
    }
    
    // Kiểm tra ngày trở lại phải sau ngày khởi hành
    const startDate = new Date(data.dayStart);
    const returnDate = new Date(data.dayReturn);
    
    if (returnDate <= startDate) {
        showAlert('error', 'Ngày trở lại phải sau ngày khởi hành');
        return false;
    }
    
    return true;
}

// Hiển thị modal xem ảnh
function showImageModal(imageSrc, imageAlt) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalLabel = document.getElementById('imageModalLabel');
    
    if (modal && modalImage && modalLabel) {
        modalImage.src = imageSrc;
        modalImage.alt = imageAlt;
        modalLabel.textContent = imageAlt;
        
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

// Utility functions
function formatCurrency(amount) {
    if (!amount || amount === 0) return '';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
}

function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

function showAlert(type, message) {
    // Tạo alert động
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show position-fixed tour-detail-alert`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Export functions for global access
window.showAddTourDetailModal = showAddTourDetailModal;
window.editTourDetail = editTourDetail;
window.deleteTourDetail = deleteTourDetail;
window.showImageModal = showImageModal;