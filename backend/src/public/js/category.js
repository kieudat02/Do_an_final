// Global function to handle limit change
function handleLimitChange(selectElement) {
    
    // Get current URL params
    const urlParams = new URLSearchParams(window.location.search);
    
    // Update limit param
    urlParams.set('limit', selectElement.value);
    
    // Reset to page 1 when changing limit
    urlParams.set('page', '1');
    
    // Create new URL
    const newUrl = window.location.pathname + '?' + urlParams.toString();
    
    console.log('Redirecting to:', newUrl);
    
    // Redirect to new URL
    window.location.href = newUrl;
}

// Category Management JavaScript - Simple Version
document.addEventListener("DOMContentLoaded", function () {

    // Setup delete handlers
    setupDeleteHandlers();

    // Setup edit form handler
    setupEditFormHandler();

    // Setup add form handler
    setupAddFormHandler();


});

function setupDeleteHandlers() {
    const deleteButtons = document.querySelectorAll(".category__form--delete");

    deleteButtons.forEach((form, index) => {
        // Remove existing listeners to avoid duplicates
        if (form.hasAttribute("data-delete-setup")) {
            return;
        }
        form.setAttribute("data-delete-setup", "true");

        // Add event listener to form
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            // Get category name
            const row = form.closest("tr");
            const nameCell = row.querySelector("td:nth-child(2) strong");
            const categoryName = nameCell
                ? nameCell.textContent.trim()
                : "danh mục này";

            // Show modal instead of alert
            showDeleteModal(categoryName, form, row);
        });

        // Also add click handler to the button itself as backup
        const deleteBtn = form.querySelector('button[type="submit"]');
        if (deleteBtn) {
            deleteBtn.addEventListener("click", function (e) {
                console.log("Delete button clicked");
                // Let the form submit handler take over
            });
        }
    });
}

// Show delete confirmation modal
function showDeleteModal(categoryName, form, row) {
    // Set category name in modal
    document.getElementById('categoryNameToDelete').textContent = categoryName;
    
    // Get modal instance
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    
    // Show modal
    deleteModal.show();
    
    // Handle confirm delete button
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    // Remove existing listeners to avoid duplicates
    const newConfirmBtn = confirmDeleteBtn.cloneNode(true);
    confirmDeleteBtn.parentNode.replaceChild(newConfirmBtn, confirmDeleteBtn);
    
    // Add new listener
    newConfirmBtn.addEventListener('click', function() {
        console.log("User confirmed delete, submitting form...");
        
        // Hide modal
        deleteModal.hide();
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;
        }

        // Add loading class to row
        row.classList.add("category-row--deleting");

        // Submit via AJAX to show toast notification
        fetch(form.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            // Parse JSON response
            return response.json().then(data => {
                // If response is not ok, throw error with message
                if (!response.ok) {
                    throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
                }
                return data;
            });
        })
        .then(data => {
            if (data.success) {
                // Show success toast
                showToastNotification(data.message, 'success');

                // Handle pagination redirect if needed
                if (data.pagination && data.pagination.needsRedirect) {
                    // Get current URL parameters
                    const urlParams = new URLSearchParams(window.location.search);
                    // Update URL with correct page
                    urlParams.set('page', data.pagination.redirectPage);
                    const newUrl = window.location.pathname + '?' + urlParams.toString();

                    // Redirect to correct page after short delay
                    setTimeout(() => {
                        window.location.href = newUrl;
                    }, 1000);
                } else {
                    // Reload current page if no redirect needed
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            } else {
                throw new Error(data.message || 'Xóa danh mục thất bại');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            // Show error toast
            showToastNotification(error.message || 'Có lỗi xảy ra khi xóa danh mục', 'error');
            // Reset button state
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-trash"></i>';
                submitBtn.disabled = false;
            }
            row.classList.remove("category-row--deleting");
        });
    });
}

// Toggle Status Function
function toggleStatus(button) {
    const categoryId = button.getAttribute("data-id");
    const currentStatus = button.getAttribute("data-status");

    // Set fixed width to prevent table jumping
    if (!button.style.minWidth) {
        button.style.minWidth = button.offsetWidth + 'px';
    }

    // Disable button during request
    button.disabled = true;
    button.style.opacity = "0.6";

    fetch(`/category/toggle-status/${categoryId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": window.csrfToken
        },
        body: JSON.stringify({
            _csrf: window.csrfToken
        })
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                // Update button attributes
                button.setAttribute("data-status", data.status);

                // Update button classes and text with shorter labels
                if (data.status === "Hoạt động") {
                    button.className =
                        "category__badge category__badge--toggle category__badge--success";
                    button.innerHTML = 'Hoạt động';
                } else {
                    button.className =
                        "category__badge category__badge--toggle category__badge--inactive";
                    button.innerHTML = 'Tạm dừng';
                }

                // Show success notification
                showToastNotification(data.message, "success");
            } else {
                showToastNotification(data.message, "error");
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            showToastNotification("Có lỗi xảy ra khi thay đổi trạng thái", "error");
        })
        .finally(() => {
            // Re-enable button
            button.disabled = false;
            button.style.opacity = "1";
        });
}

// Setup edit form handler
function setupEditFormHandler() {
    const editForm = document.querySelector('form[action*="/category/edit/"]');
    if (!editForm) return;

    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        // Validate form client-side
        const nameInput = this.querySelector('input[name="name"]');
        if (!nameInput.value.trim()) {
            showToastNotification('Tên danh mục không được để trống', 'error');
            nameInput.focus();
            return;
        }
        
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang cập nhật...';
        submitBtn.disabled = true;
        
        // Convert FormData to URLSearchParams for proper form encoding
        const params = new URLSearchParams();
        for (const [key, value] of formData) {
            params.append(key, value);
        }


        
        // Submit via AJAX
        fetch(this.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: params
        })
        .then(response => {
            // Parse JSON response
            return response.json().then(data => {
                // If response is not ok, throw error with message
                if (!response.ok) {
                    throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
                }
                return data;
            });
        })
        .then(data => {
            if (data.success) {
                // Show success toast
                showToastNotification(data.message, 'success');
                // Redirect to category list after a short delay
                setTimeout(() => {
                    window.location.href = '/category';
                }, 1500);
            } else {
                throw new Error(data.message || 'Cập nhật danh mục thất bại');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            // Show error toast
            showToastNotification(error.message || 'Có lỗi xảy ra khi cập nhật danh mục', 'error');
            // Reset button state
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        });
    });
}

// Setup add form handler
function setupAddFormHandler() {
    const addForm = document.querySelector('form[action="/category/add"]');
    if (!addForm) return;

    addForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data manually
        const nameInput = this.querySelector('input[name="name"]');
        const descriptionInput = this.querySelector('textarea[name="description"]');
        const pageTitleInput = this.querySelector('input[name="pageTitle"]');
        const pageSubtitleInput = this.querySelector('textarea[name="pageSubtitle"]');

        const name = nameInput ? nameInput.value.trim() : '';
        const description = descriptionInput ? descriptionInput.value.trim() : '';
        const pageTitle = pageTitleInput ? pageTitleInput.value.trim() : '';
        const pageSubtitle = pageSubtitleInput ? pageSubtitleInput.value.trim() : '';


        
        // Client-side validation
        if (!name) {
            showToastNotification('Tên danh mục không được để trống', 'error');
            nameInput.focus();
            return;
        }
        
        if (name.length < 2) {
            showToastNotification('Tên danh mục phải có ít nhất 2 ký tự', 'error');
            nameInput.focus();
            return;
        }
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang thêm...';
        submitBtn.disabled = true;
        
        // Create URL encoded form data
        const formData = new URLSearchParams();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('pageTitle', pageTitle);
        formData.append('pageSubtitle', pageSubtitle);


        
        // Submit via AJAX
        fetch(this.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData.toString()
        })
        .then(async response => {
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                throw new Error('Server không trả về dữ liệu hợp lệ');
            }
            
            if (!response.ok) {
                // Server returned error status
                throw new Error(data.message || `Lỗi HTTP ${response.status}`);
            }
            
            return data;
        })
        .then(data => {
            if (data.success) {
                // Show success toast
                showToastNotification(data.message || 'Thêm danh mục thành công', 'success');
                // Reset form
                this.reset();
                // Redirect to category list after a short delay
                setTimeout(() => {
                    window.location.href = '/category';
                }, 1500);
            } else {
                throw new Error(data.message || 'Thêm danh mục thất bại');
            }
        })
        .catch(error => {
            // Show error toast
            showToastNotification(error.message || 'Có lỗi xảy ra khi thêm danh mục', 'error');
            // Reset button state
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        });
    });
}











// CSS Styles for row animation
const styles = `
    .category-row--deleting {
        background: #ffe6e6 !important;
        animation: rowFadeOut 0.5s ease-in-out;
    }
    
    @keyframes rowFadeOut {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.98); }
        100% { opacity: 1; transform: scale(1); }
    }
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Helper functions for STT and table management
function updateRowNumbers() {
    const tableBody = document.querySelector('.category__table tbody');
    if (!tableBody) return;
    
    // Get all data rows (exclude empty rows)
    const dataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    
    // Update STT based on current position in table (index + 1)
    dataRows.forEach((row, index) => {
        const firstCell = row.querySelector('td:first-child');
        // Only update if this is a STT cell (not checkbox or other)
        if (firstCell && !firstCell.querySelector('input[type="checkbox"]')) {
            firstCell.textContent = index + 1;
        }
    });
}

function handleEmptyTable() {
    const tableBody = document.querySelector('.category__table tbody');
    if (!tableBody) return;
    
    // Check if there are any actual data rows (not empty message rows)
    const dataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    
    if (dataRows.length === 0) {
        // Clear all existing rows and show empty message
        const colspan = tableBody.closest('table').querySelector('thead tr').children.length;
        tableBody.innerHTML = `
            <tr data-empty="true">
                <td colspan="${colspan}" class="category__table-empty text-center py-4">
                    <i class="fas fa-list text-muted mb-2" style="font-size: 3rem;"></i>
                    <p class="text-muted mb-0">Chưa có danh mục nào.</p>
                    <p class="text-muted small">Thêm danh mục đầu tiên của bạn!</p>
                </td>
            </tr>
        `;
        
        // Hide pagination if exists
        const pagination = document.querySelector('.category__pagination');
        if (pagination) {
            pagination.style.display = 'none';
        }
    } else {
        // Show pagination if hidden and there's data
        const pagination = document.querySelector('.category__pagination');
        if (pagination) {
            pagination.style.display = '';
        }
    }
}

function addNewRowToTable(categoryData) {
    const tableBody = document.querySelector('.category__table tbody');
    if (!tableBody) return;
    
    const emptyRow = tableBody.querySelector('td.category__table-empty');
    
    // Remove empty message if exists
    if (emptyRow) {
        emptyRow.closest('tr').remove();
    }
    
    // Get current number of data rows (excluding empty rows)
    const currentDataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    const newSTT = currentDataRows.length + 1; // New record will be at the end
    
    // Create new row
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${newSTT}</td>
        <td>
            <strong>${categoryData.name}</strong>
        </td>
        <td>
            ${categoryData.description || 'Không có mô tả'}
        </td>
        <td>
            <button
                class="category__badge category__badge--toggle ${categoryData.status === 'Hoạt động' ? 'category__badge--success' : 'category__badge--inactive'}"
                data-id="${categoryData.id}"
                data-status="${categoryData.status}"
                onclick="toggleStatus(this)"
                title="Nhấn để thay đổi trạng thái"
            >
                ${categoryData.status === 'Hoạt động' ? 'Hoạt động' : 'Tạm dừng'}
            </button>
        </td>
        <td>
            <div class="d-flex gap-1 justify-content-center">
                <a
                    href="/category/edit/${categoryData.id}"
                    class="category__btn category__btn--warning category__btn--sm"
                    title="Chỉnh sửa danh mục"
                >
                    <i class="fas fa-edit"></i>
                </a>
                <form
                    class="category__form category__form--delete"
                    action="/category/delete/${categoryData.id}"
                    method="POST"
                    data-category-name="${categoryData.name}"
                >
                    <button
                        type="submit"
                        class="category__btn category__btn--danger category__btn--sm"
                        title="Xóa danh mục"
                    >
                        <i class="fas fa-trash"></i>
                    </button>
                </form>
            </div>
        </td>
    `;
    
    // IMPORTANT: Add to END of table (using appendChild, not insertBefore)
    tableBody.appendChild(newRow);
    
    // Setup delete handler for new row
    const deleteForm = newRow.querySelector('.category__form--delete');
    setupSingleDeleteHandler(deleteForm);
    
    // Show pagination if hidden
    const pagination = document.querySelector('.category__pagination');
    if (pagination) {
        pagination.style.display = '';
    }
}

function setupSingleDeleteHandler(form) {
    if (!form || form.hasAttribute("data-delete-setup")) {
        return;
    }
    form.setAttribute("data-delete-setup", "true");

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        
        const row = form.closest("tr");
        const nameCell = row.querySelector("td:nth-child(2) strong");
        const categoryName = nameCell ? nameCell.textContent.trim() : "danh mục này";
        
        showDeleteModal(categoryName, form, row);
    });
}
