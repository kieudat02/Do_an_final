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

// transportation Management JavaScript - Simple Version
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
    const deleteButtons = document.querySelectorAll(".transportation__form--delete");

    deleteButtons.forEach((form, index) => {
        // Remove existing listeners to avoid duplicates
        if (form.hasAttribute("data-delete-setup")) {
            return;
        }
        form.setAttribute("data-delete-setup", "true");

        // Add event listener to form
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            // Get transportation name
            const row = form.closest("tr");
            const nameCell = row.querySelector("td:nth-child(2) strong");
            const transportationName = nameCell
                ? nameCell.textContent.trim()
                : "danh mục này";

            // Show modal instead of alert
            showDeleteModal(transportationName, form, row);
        });

        // Also add click handler to the button itself as backup
        const deleteBtn = form.querySelector('button[type="submit"]');
        if (deleteBtn) {
            deleteBtn.addEventListener("click", function (e) {
                // Let the form submit handler take over
            });
        }
    });
}

// Show delete confirmation modal
function showDeleteModal(transportationName, form, row) {
    // Set transportation name in modal
    document.getElementById('transportationNameToDelete').textContent = transportationName;
    
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
        row.classList.add("transportation-row--deleting");

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
                throw new Error(data.message || 'Xóa phương tiện thất bại');
            }
        })
        .catch(error => {
            showToastNotification(error.message || 'Có lỗi xảy ra khi xóa điểm khởi hành!', 'error');
            // Remove loading state
            row.classList.remove("transportation-row--deleting");
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
    const transportationId = button.getAttribute("data-id");
    const currentStatus = button.getAttribute("data-status") === "true";

    // Set fixed width to prevent table jumping
    if (!button.style.minWidth) {
        button.style.minWidth = button.offsetWidth + 'px';
    }

    // Disable button during request
    button.disabled = true;
    button.style.opacity = "0.6";

    fetch(`/transportation/toggle-status/${transportationId}`, {
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
                if (data.status === true) {
                    button.className =
                        "transportation__badge transportation__badge--toggle transportation__badge--success";
                    button.innerHTML = 'Hoạt động';
                } else {
                    button.className =
                        "transportation__badge transportation__badge--toggle transportation__badge--inactive";
                    button.innerHTML = 'Tạm dừng';
                }

                // Show success notification
                showToastNotification(data.message, "success");
            } else {
                showToastNotification(data.message, "error");
            }
        })
        .catch((error) => {
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
    const editForm = document.querySelector('form[action*="/transportation/edit/"]');
    if (!editForm) return;

    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        // Validate form client-side
        const titleInput = this.querySelector('input[name="title"]');
        if (!titleInput.value.trim()) {
            showToastNotification('Tên phương tiện không được để trống', 'error');
            titleInput.focus();
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
                    return { success: true, message: 'Cập nhật điểm khởi hành thành công!' };
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
        })
        .then(data => {
            if (data.success) {
                // Show success toast
                showToastNotification(data.message, 'success');
                // Redirect to transportation list after a short delay
                setTimeout(() => {
                    window.location.href = '/transportation';
                }, 1500);
            } else {
                throw new Error(data.message || 'Có lỗi xảy ra');
            }
        })
        .catch(error => {
            showToastNotification(error.message || 'Có lỗi xảy ra khi cập nhật điểm khởi hành!', 'error');
            // Reset button state
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        });
    });
}

// Setup add form handler
function setupAddFormHandler() {
    const addForm = document.querySelector('form[action="/transportation/add"]');
    if (!addForm) return;

    addForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data manually
        const titleInput = this.querySelector('input[name="title"]');
        const informationInput = this.querySelector('textarea[name="information"]');
        
        const title = titleInput ? titleInput.value.trim() : '';
        const information = informationInput ? informationInput.value.trim() : '';
        
        // Client-side validation
        if (!title) {
            showToastNotification('Tên phương tiện không được để trống', 'error');
            titleInput.focus();
            return;
        }
        
        if (title.length < 2) {
            showToastNotification('Tên phương tiện phải có ít nhất 2 ký tự', 'error');
            titleInput.focus();
            return;
        }
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang thêm...';
        submitBtn.disabled = true;
        
        // Create URL encoded form data
        const formData = new URLSearchParams();
        formData.append('title', title);
        formData.append('information', information);
        
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
                    return { success: true, message: 'Thêm điểm khởi hành thành công!' };
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
        })
        .then(data => {
            if (data.success) {
                // Show success toast
                showToastNotification(data.message || 'Thêm điểm khởi hành thành công', 'success');
                // Reset form
                this.reset();
                // Redirect to transportation list after a short delay
                setTimeout(() => {
                    window.location.href = '/transportation';
                }, 1500);
            } else {
                throw new Error(data.message || 'Thêm điểm khởi hành thất bại');
            }
        })
        .catch(error => {
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
    const searchForm = document.querySelector('.transportation__search-form');
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
            window.location.href = '/transportation';
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
    const paginationLinks = document.querySelectorAll('.transportation__pagination .page-link');
    
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
    const quickJumpForm = document.querySelector('.transportation__quick-jump form');
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
        
        const pagination = document.querySelector('.transportation__pagination');
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
    .transportation-row--deleting {
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
  const paginationLinks = document.querySelectorAll('.transportation__pagination-item a');
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
        fetch('/transportation/seed')
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
    const checkboxes = document.querySelectorAll('.transportation-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    toggleDeleteButton();
}

function toggleDeleteButton() {
    const checkboxes = document.querySelectorAll('.transportation-checkbox:checked');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    
    if (checkboxes.length > 0) {
        deleteBtn.style.display = 'inline-flex';
        deleteBtn.innerHTML = `<i class="fas fa-trash"></i> Xóa đã chọn (${checkboxes.length})`;
    } else {
        deleteBtn.style.display = 'none';
    }
    
    // Update select all checkbox state
    const allCheckboxes = document.querySelectorAll('.transportation-checkbox');
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
    const checkboxes = document.querySelectorAll('.transportation-checkbox:checked');
    
    if (checkboxes.length === 0) {
        alert('Vui lòng chọn ít nhất một phương tiện để xóa!');
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
    
    newConfirmBtn.addEventListener('click', async function() {
        // Collect selected IDs
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);
        
        // Show loading state
        newConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xóa...';
        newConfirmBtn.disabled = true;
        
        try {
            // Get current URL parameters for pagination calculation
            const urlParams = new URLSearchParams(window.location.search);
            const queryString = urlParams.toString();

            // Send delete request
            const response = await fetch(`/transportation/delete-multiple?${queryString}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: selectedIds })
            });

            const data = await response.json();

            if (data.success) {
                // Hide modal immediately
                deleteModal.hide();

                // Show success message
                showToastNotification('Đã xóa thành công ' + selectedIds.length + ' phương tiện!', 'success');

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
                throw new Error(data.message || 'Có lỗi xảy ra khi xóa phương tiện');
            }
        } catch (error) {
            showToastNotification('Có lỗi xảy ra: ' + error.message, 'error');
            
            // Reset button state
            newConfirmBtn.innerHTML = '<i class="fas fa-trash me-2"></i>Xóa tất cả';
            newConfirmBtn.disabled = false;
        } finally {
            // Ensure modal is properly hidden on any outcome
            try {
                deleteModal.hide();
            } catch (e) {
                // Modal already hidden
            }
        }
    });
}

// Helper functions for STT and table management
function updateRowNumbers() {
    const tableBody = document.querySelector('.transportation__table tbody');
    if (!tableBody) return;
    
    // Get all data rows (exclude empty rows)
    const dataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    
    // Get pagination info from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = parseInt(urlParams.get('page')) || 1;
    const limit = parseInt(urlParams.get('limit')) || 5;
    
    // Update STT based on pagination and current position
    dataRows.forEach((row, index) => {
        const sttCell = row.querySelector('td:nth-child(2)'); // STT is 2nd column (after checkbox)
        if (sttCell) {
            const sttValue = (currentPage - 1) * limit + index + 1;
            sttCell.textContent = sttValue;
        }
    });
}

// Function to completely re-render table rows with correct STT
function rerenderTableWithCorrectSTT() {
    const tableBody = document.querySelector('.transportation__table tbody');
    if (!tableBody) return;
    
    // Get all data rows (exclude empty message rows)
    const dataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    
    // Update STT for each row based on current position
    dataRows.forEach((row, index) => {
        const sttCell = row.querySelector('td:nth-child(2)'); // STT is 2nd column (after checkbox)
        if (sttCell) {
            // Calculate STT based on current pagination and position
            const urlParams = new URLSearchParams(window.location.search);
            const currentPage = parseInt(urlParams.get('page')) || 1;
            const limit = parseInt(urlParams.get('limit')) || 5;
            const sttValue = (currentPage - 1) * limit + index + 1;
            sttCell.textContent = sttValue;
        }
    });
}

function handleEmptyTable() {
    const tableBody = document.querySelector('.transportation__table tbody');
    if (!tableBody) return;
    
    // Check if there are any actual data rows (not empty message rows)
    const dataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    
    if (dataRows.length === 0) {
        // Clear all existing rows and show empty message
        const colspan = tableBody.closest('table').querySelector('thead tr').children.length;
        tableBody.innerHTML = `
            <tr data-empty="true">
                <td colspan="${colspan}" class="transportation__table-empty text-center py-4">
                    <i class="fas fa-car text-muted mb-2" style="font-size: 3rem;"></i>
                    <p class="text-muted mb-0">Chưa có phương tiện di chuyển nào.</p>
                    <p class="text-muted small">Thêm phương tiện đầu tiên của bạn!</p>
                </td>
            </tr>
        `;
        
        // Hide pagination if exists
        const pagination = document.querySelector('.transportation__pagination');
        if (pagination) {
            pagination.style.display = 'none';
        }
    } else {
        // Show pagination if hidden and there's data
        const pagination = document.querySelector('.transportation__pagination');
        if (pagination) {
            pagination.style.display = '';
        }
    }
}

function addNewRowToTable(transportationData) {
    const tableBody = document.querySelector('.transportation__table tbody');
    if (!tableBody) return;
    
    const emptyRow = tableBody.querySelector('td.transportation__table-empty');
    
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
            <strong>${transportationData.name}</strong>
        </td>
        <td>
            ${transportationData.description || 'Không có mô tả'}
        </td>
        <td>
            <button
                class="transportation__badge transportation__badge--toggle ${transportationData.status === 'Hoạt động' ? 'transportation__badge--success' : 'transportation__badge--inactive'}"
                data-id="${transportationData.id}"
                data-status="${transportationData.status}"
                onclick="toggleStatus(this)"
                title="Nhấn để thay đổi trạng thái"
            >
                ${transportationData.status === 'Hoạt động' ? 'Hoạt động' : 'Tạm dừng'}
            </button>
        </td>
        <td>
            <span class="transportation__user-info">
                <i class="fas fa-user me-1"></i>
                Admin
            </span>
        </td>
        <td>
            <span class="transportation__user-info">
                <i class="fas fa-user-edit me-1"></i>
                Admin
            </span>
        </td>
        <td>
            <div class="d-flex gap-1 justify-content-center">
                <a
                    href="/transportation/edit/${transportationData.id}"
                    class="transportation__btn transportation__btn--warning transportation__btn--sm"
                    title="Chỉnh sửa phương tiện"
                >
                    <i class="fas fa-edit"></i>
                </a>
                <form
                    class="transportation__form transportation__form--delete"
                    action="/transportation/delete/${transportationData.id}"
                    method="POST"
                    data-transportation-name="${transportationData.name}"
                >
                    <button
                        type="submit"
                        class="transportation__btn transportation__btn--danger transportation__btn--sm"
                        title="Xóa phương tiện"
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
    const deleteForm = newRow.querySelector('.transportation__form--delete');
    setupSingleDeleteHandler(deleteForm);
    
    // Show pagination if hidden
    const pagination = document.querySelector('.transportation__pagination');
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
        const transportationName = nameCell ? nameCell.textContent.trim() : "phương tiện này";
        
        showDeleteModal(transportationName, form, row);
    });
}
