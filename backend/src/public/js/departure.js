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
    
    // Redirect to new URL
    window.location.href = newUrl;
}

// departure Management JavaScript - Simple Version
document.addEventListener("DOMContentLoaded", function () {

    // Setup delete handlers
    setupDeleteHandlers();
    
    // Setup edit form handler
    setupEditFormHandler();
    
    // Setup add form handler
    setupAddFormHandler();
    
    // Setup search functionality
    setupSearchHandler();
    
    // Setup items per page functionality
    setupItemsPerPageHandler();
    
    // Setup pagination
    setupPaginationHandler();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
});

function setupDeleteHandlers() {
    const deleteButtons = document.querySelectorAll(".departure__form--delete");

    deleteButtons.forEach((form, index) => {
        // Remove existing listeners to avoid duplicates
        if (form.hasAttribute("data-delete-setup")) {
            return;
        }
        form.setAttribute("data-delete-setup", "true");

        // Add event listener to form
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            // Get departure name
            const row = form.closest("tr");
            const nameCell = row.querySelector("td:nth-child(2) strong");
            const departureName = nameCell
                ? nameCell.textContent.trim()
                : "danh mục này";

            // Show modal instead of alert
            showDeleteModal(departureName, form, row);
        });

        // Also add click handler to the button itself as backup
        const deleteBtn = form.querySelector('button[type="submit"]');
        if (deleteBtn) {
            deleteBtn.addEventListener("click", function (e) {
            });
        }
    });
}

// Show delete confirmation modal
function showDeleteModal(departureName, form, row) {
    // Set departure name in modal
    document.getElementById('departureNameToDelete').textContent = departureName;
    
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
        
        // Hide modal
        deleteModal.hide();
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;
        }

        // Add loading class to row
        row.classList.add("departure-row--deleting");

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
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json().then(data => {
                    if (!response.ok) {
                        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
                    }
                    return data;
                });
            } else {
                // If not JSON, treat as successful form submission
                if (response.ok) {
                    return { success: true, message: 'Xóa điểm khởi hành thành công!' };
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
        })
        .then(data => {
            if (data.success) {
                // Show success toast using unified system
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
                throw new Error(data.message || 'Xóa điểm khởi hành thất bại');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToastNotification(error.message || 'Có lỗi xảy ra khi xóa điểm khởi hành!', 'error');
            // Remove loading state
            row.classList.remove("departure-row--deleting");
            // Reset button state
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-trash"></i>';
                submitBtn.disabled = false;
            }
        });
    });
}

// Toggle Status Function
function toggleStatus(button) {
    const departureId = button.getAttribute("data-id");
    const currentStatus = button.getAttribute("data-status");

    // Set fixed width to prevent table jumping
    if (!button.style.minWidth) {
        button.style.minWidth = button.offsetWidth + 'px';
    }

    // Disable button during request
    button.disabled = true;
    button.style.opacity = "0.6";

    fetch(`/departure/toggle-status/${departureId}`, {
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
                        "departure__badge departure__badge--toggle departure__badge--success";
                    button.innerHTML = 'Hoạt động';
                } else {
                    button.className =
                        "departure__badge departure__badge--toggle departure__badge--inactive";
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
    const editForm = document.querySelector('form[action*="/departure/edit/"]');
    if (!editForm) return;

    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        // Validate form client-side
        const nameInput = this.querySelector('input[name="name"]');
        if (!nameInput.value.trim()) {
            showToastNotification('Tên điểm khởi hành không được để trống', 'error');
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
            return response.text().then(text => {
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    // Nếu không parse được JSON, có thể server trả về HTML (redirect)
                    if (response.ok) {
                        return { success: true, message: 'Cập nhật điểm khởi hành thành công!' };
                    } else {
                        throw new Error('Có lỗi xảy ra khi cập nhật điểm khởi hành');
                    }
                }
                
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
                // Redirect to departure list after a short delay
                setTimeout(() => {
                    window.location.href = '/departure';
                }, 1500);
            } else {
                throw new Error(data.message || 'Có lỗi xảy ra');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToastNotification(error.message || 'Có lỗi xảy ra khi cập nhật điểm khởi hành!', 'error');
            // Reset button state
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        });
    });
}

// Setup add form handler
function setupAddFormHandler() {
    const addForm = document.querySelector('form[action="/departure/add"]');
    if (!addForm) return;

    addForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data manually
        const nameInput = this.querySelector('input[name="name"]');
        const descriptionInput = this.querySelector('textarea[name="description"]');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const description = descriptionInput ? descriptionInput.value.trim() : '';
        
        // Client-side validation
        if (!name) {
            showToastNotification('Tên điểm khởi hành không được để trống', 'error');
            nameInput.focus();
            return;
        }
        
        if (name.length < 2) {
            showToastNotification('Tên điểm khởi hành phải có ít nhất 2 ký tự', 'error');
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
        .then(response => {
            return response.text().then(text => {
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    // Nếu không parse được JSON, có thể server trả về HTML (redirect)
                    if (response.ok) {
                        return { success: true, message: 'Thêm điểm khởi hành thành công!' };
                    } else {
                        throw new Error('Có lỗi xảy ra khi thêm điểm khởi hành');
                    }
                }
                
                if (!response.ok) {
                    throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
                }
                return data;
            });
        })
        .then(data => {
            if (data.success) {
                // Show success toast
                showToastNotification(data.message || 'Thêm điểm khởi hành thành công', 'success');
                // Reset form
                this.reset();
                // Redirect to departure list after a short delay
                setTimeout(() => {
                    window.location.href = '/departure';
                }, 1500);
            } else {
                throw new Error(data.message || 'Thêm điểm khởi hành thất bại');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            // Show error toast
            showToastNotification(error.message || 'Có lỗi xảy ra khi thêm điểm khởi hành', 'error');
            // Reset button state
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        });
    });
}

// Setup items per page functionality
function setupItemsPerPageHandler() {
    
    const itemsPerPageSelect = document.querySelector('#itemsPerPage');
    
    if (!itemsPerPageSelect) {
        console.log('Items per page select not found');
        return;
    }
    
    // Handle form submission when select changes
    itemsPerPageSelect.addEventListener('change', function() {
        
        // Get current URL params
        const urlParams = new URLSearchParams(window.location.search);
        
        // Update limit param
        urlParams.set('limit', this.value);
        
        // Reset to page 1 when changing limit
        urlParams.set('page', '1');
        
        // Create new URL
        const newUrl = window.location.pathname + '?' + urlParams.toString();
        
        // Redirect to new URL
        window.location.href = newUrl;
    });
}

// Setup search functionality
function setupSearchHandler() {
    const searchForm = document.querySelector('.departure__search-form');
    const searchInput = searchForm?.querySelector('input[name="search"]');
    
    if (!searchForm || !searchInput) return;
    
    // Auto-submit search after user stops typing
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (this.value.trim() !== this.getAttribute('data-original-value')) {
                searchForm.submit();
            }
        }, 500);
    });
    
    // Store original value
    searchInput.setAttribute('data-original-value', searchInput.value);
    
    // Handle search form submission
    searchForm.addEventListener('submit', function(e) {
        const searchValue = searchInput.value.trim();
        
        // If search is empty, redirect to main page
        if (!searchValue) {
            e.preventDefault();
            window.location.href = '/departure';
            return;
        }
        
        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tìm...';
            submitBtn.disabled = true;
            
            // Re-enable after a short delay in case of errors
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }, 3000);
        }
    });
}

// Setup pagination functionality
function setupPaginationHandler() {
    const paginationLinks = document.querySelectorAll('.departure__pagination .page-link');
    
    paginationLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Don't prevent default - let normal navigation happen
            // But add loading state
            const text = this.textContent;
            
            // Only add loading for actual page links, not disabled ones
            if (!this.closest('.page-item').classList.contains('disabled')) {
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                // Restore original text after navigation starts
                setTimeout(() => {
                    this.innerHTML = text;
                }, 100);
            }
        });
    });
    
    // Handle quick jump form
    const quickJumpForm = document.querySelector('.departure__quick-jump form');
    if (quickJumpForm) {
        quickJumpForm.addEventListener('submit', function(e) {
            const pageInput = this.querySelector('input[name="page"]');
            const pageValue = parseInt(pageInput.value);
            const maxPage = parseInt(pageInput.getAttribute('max'));
            
            // Validate page number
            if (isNaN(pageValue) || pageValue < 1 || pageValue > maxPage) {
                e.preventDefault();
                
                // Show error message
                showToastNotification(`Vui lòng nhập số trang từ 1 đến ${maxPage}`, 'error');
                
                // Focus and select the input
                pageInput.focus();
                pageInput.select();
                return;
            }
            
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                const originalHTML = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                submitBtn.disabled = true;
                
                // Restore after a delay in case of errors
                setTimeout(() => {
                    submitBtn.innerHTML = originalHTML;
                    submitBtn.disabled = false;
                }, 3000);
            }
        });
        
        // Handle Enter key in page input
        const pageInput = quickJumpForm.querySelector('input[name="page"]');
        if (pageInput) {
            pageInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    quickJumpForm.dispatchEvent(new Event('submit'));
                }
            });
            
            // Auto-select text when focused
            pageInput.addEventListener('focus', function() {
                this.select();
            });
        }
    }
}

// Setup keyboard shortcuts for pagination
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Only work if no input is focused
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.isContentEditable) {
            return;
        }
        
        const pagination = document.querySelector('.departure__pagination');
        if (!pagination) return;
        
        const prevLink = pagination.querySelector('.page-item:not(.disabled) .page-link[aria-label="Trang trước"]');
        const nextLink = pagination.querySelector('.page-item:not(.disabled) .page-link[aria-label="Trang sau"]');
        
        // Arrow keys for navigation
        if (e.key === 'ArrowLeft' && prevLink) {
            e.preventDefault();
            prevLink.click();
        } else if (e.key === 'ArrowRight' && nextLink) {
            e.preventDefault();
            nextLink.click();
        }
        
        // Focus search with / key
        if (e.key === '/' || e.key === 'Control+f') {
            e.preventDefault();
            const searchInput = document.querySelector('input[name="search"]');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    });
}

// CSS Styles for row animation
const styles = `
    .departure-row--deleting {
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

document.addEventListener('DOMContentLoaded', function() {
  // Cuộn lên đầu bảng khi click phân trang
  const paginationLinks = document.querySelectorAll('.departure__pagination-item a');
  paginationLinks.forEach(link => {
    link.addEventListener('click', function() {
      // Sau khi chuyển trang, trình duyệt sẽ reload, nên chỉ cần cuộn lên nếu dùng AJAX
      // Nếu muốn cuộn lên khi reload, có thể dùng:
      // window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
});

// Seed sample data function
function seedData() {
    if (confirm('Bạn có muốn thêm 15 điểm khởi hành mẫu? Điều này sẽ xóa toàn bộ dữ liệu hiện tại.')) {
        fetch('/departure/seed')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToastNotification(data.message, 'success');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showToastNotification(data.message, 'error');
                }
            })
            .catch(error => {
                showToastNotification('Có lỗi xảy ra khi thêm dữ liệu mẫu', 'error');
            });
    }
}

// Multiple deletion functionality
function toggleSelectAll(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.departure-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    toggleDeleteButton();
}

function toggleDeleteButton() {
    const checkboxes = document.querySelectorAll('.departure-checkbox:checked');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    
    if (checkboxes.length > 0) {
        deleteBtn.style.display = 'inline-flex';
        deleteBtn.innerHTML = `<i class="fas fa-trash"></i> Xóa đã chọn (${checkboxes.length})`;
    } else {
        deleteBtn.style.display = 'none';
    }
    
    // Update select all checkbox state
    const allCheckboxes = document.querySelectorAll('.departure-checkbox');
    const selectAllCheckbox = document.getElementById('selectAll');
    
    if (checkboxes.length === allCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (checkboxes.length > 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
}

function deleteSelected() {
    const checkboxes = document.querySelectorAll('.departure-checkbox:checked');
    
    if (checkboxes.length === 0) {
        alert('Vui lòng chọn ít nhất một điểm khởi hành để xóa!');
        return;
    }
    
    // Update modal content
    document.getElementById('selectedCount').textContent = checkboxes.length;
    
    // Show modal
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteMultipleModal'));
    deleteModal.show();
    
    // Handle confirm delete
    const confirmBtn = document.getElementById('confirmDeleteMultipleBtn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', function() {
        // Collect selected IDs
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);
        
        // Show loading state
        newConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xóa...';
        newConfirmBtn.disabled = true;
        
        // Get current URL parameters for pagination calculation
        const urlParams = new URLSearchParams(window.location.search);
        const queryString = urlParams.toString();

        // Send delete request
        fetch(`/departure/delete-multiple?${queryString}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: selectedIds })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Hide modal immediately
                deleteModal.hide();

                // Show success message
                showToastNotification('Đã xóa thành công ' + selectedIds.length + ' điểm khởi hành!', 'success');

                // Handle pagination redirect if needed
                if (data.pagination && data.pagination.needsRedirect) {
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
                throw new Error(data.message || 'Có lỗi xảy ra khi xóa điểm khởi hành');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToastNotification('Có lỗi xảy ra: ' + error.message, 'error');
            
            // Reset button state
            newConfirmBtn.innerHTML = '<i class="fas fa-trash me-2"></i>Xóa tất cả';
            newConfirmBtn.disabled = false;
        })
        .finally(() => {
            // Ensure modal is properly hidden and button is reset on any outcome
            try {
                deleteModal.hide();
            } catch (e) {
                // Modal already hidden
            }
        });
    });
}

// Helper functions for STT and table management
// Update STT for all rows - IMPORTANT: STT = position in array (index + 1)
// NOT related to checkbox, NOT related to database ID, ONLY display order
function updateRowNumbers() {
    const tableBody = document.querySelector('.departure__table tbody');
    if (!tableBody) return;
    
    // Get all data rows (exclude empty rows)
    const dataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    
    // Update STT based on current position in table (index + 1)
    dataRows.forEach((row, index) => {
        const firstCell = row.querySelector('td:first-child');
        // Only update if this is a STT cell (not checkbox or other)
        if (firstCell && !firstCell.querySelector('input[type="checkbox"]')) {
            firstCell.textContent = index + 1; // STT = current position + 1
        }
    });
}

function handleEmptyTable() {
    const tableBody = document.querySelector('.departure__table tbody');
    if (!tableBody) return;
    
    // Check if there are any actual data rows (not empty message rows)
    const dataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    
    if (dataRows.length === 0) {
        // Clear all existing rows and show empty message
        const thead = tableBody.closest('table').querySelector('thead tr');
        const colspan = thead ? thead.children.length : 8;
        tableBody.innerHTML = `
            <tr data-empty="true">
                <td colspan="${colspan}" class="departure__table-empty text-center py-4">
                    <i class="fas fa-map-marker-alt text-muted mb-2" style="font-size: 3rem;"></i>
                    <p class="text-muted mb-0">Chưa có điểm khởi hành nào.</p>
                    <p class="text-muted small">Thêm điểm khởi hành đầu tiên của bạn!</p>
                </td>
            </tr>
        `;
        
        // Hide pagination if exists
        const pagination = document.querySelector('.departure__pagination');
        if (pagination) {
            pagination.style.display = 'none';
        }
        
        // Hide items per page selector when no data
        const itemsPerPageForm = document.querySelector('.departure__items-per-page-form');
        if (itemsPerPageForm) {
            itemsPerPageForm.style.display = 'none';
        }
    } else {
        // Show pagination and items per page selector if hidden and there's data
        const pagination = document.querySelector('.departure__pagination');
        if (pagination) {
            pagination.style.display = '';
        }
        
        const itemsPerPageForm = document.querySelector('.departure__items-per-page-form');
        if (itemsPerPageForm) {
            itemsPerPageForm.style.display = '';
        }
    }
}

// Add new record to END of table - NEVER use unshift or insertBefore
// ALWAYS use appendChild to add to end, then update all STT
function addNewRowToTable(departureData) {
    const tableBody = document.querySelector('.departure__table tbody');
    if (!tableBody) return;
    
    const emptyRow = tableBody.querySelector('td.departure__table-empty');
    
    // Remove empty message if exists
    if (emptyRow) {
        emptyRow.closest('tr').remove();
    }
    
    // Get current number of data rows (excluding empty rows)
    const currentDataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    const newSTT = currentDataRows.length + 1; // New record will be at the end
    
    // Create new row HTML
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${newSTT}</td>
        <td>
            <strong>${departureData.name}</strong>
        </td>
        <td>
            ${departureData.description || 'Không có mô tả'}
        </td>
        <td>
            <button
                class="departure__badge departure__badge--toggle ${departureData.status === 'Hoạt động' ? 'departure__badge--success' : 'departure__badge--inactive'}"
                data-id="${departureData.id}"
                data-status="${departureData.status}"
                onclick="toggleStatus(this)"
                title="Nhấn để thay đổi trạng thái"
            >
                ${departureData.status === 'Hoạt động' ? 'Hoạt động' : 'Tạm dừng'}
            </button>
        </td>
        <td>
            <span class="departure__user-info">
                <i class="fas fa-user me-1"></i>
                Admin
            </span>
        </td>
        <td>
            <span class="departure__user-info">
                <i class="fas fa-user-edit me-1"></i>
                Admin
            </span>
        </td>
        <td>
            <div class="d-flex gap-1 justify-content-center">
                <a
                    href="/departure/edit/${departureData.id}"
                    class="departure__btn departure__btn--warning departure__btn--sm"
                    title="Chỉnh sửa điểm khởi hành"
                >
                    <i class="fas fa-edit"></i>
                </a>
                <form
                    class="departure__form departure__form--delete"
                    action="/departure/delete/${departureData.id}"
                    method="POST"
                    data-departure-name="${departureData.name}"
                >
                    <button
                        type="submit"
                        class="departure__btn departure__btn--danger departure__btn--sm"
                        title="Xóa điểm khởi hành"
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
    const deleteForm = newRow.querySelector('.departure__form--delete');
    setupSingleDeleteHandler(deleteForm);
    
    // Show pagination if hidden
    const pagination = document.querySelector('.departure__pagination');
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
        const departureName = nameCell ? nameCell.textContent.trim() : "điểm khởi hành này";
        
        showDeleteModal(departureName, form, row);
    });
}