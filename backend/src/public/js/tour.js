// Tour Management JavaScript

// ==================== CSS STYLES FOR IMAGE RESIZE ====================
function injectImageResizeStyles() {
    if (document.getElementById('tour-image-resize-styles')) {
        return; // Already injected
    }

    const style = document.createElement('style');
    style.id = 'tour-image-resize-styles';
    style.textContent = `
        /* Resizable image wrapper styles */
        .resizable-image-wrapper {
            position: relative;
            display: inline-block;
            margin: 10px auto;
            max-width: 100%;
        }

        .resizable-image-wrapper img {
            display: block;
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .resize-handles {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
        }

        .resizable-image-wrapper.show-handles .resize-handles {
            opacity: 1;
            pointer-events: auto;
        }

        .resize-handle {
            position: absolute;
            width: 12px;
            height: 12px;
            background: #007bff;
            border: 2px solid white;
            border-radius: 50%;
            cursor: nw-resize;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .resize-handle-nw {
            top: -6px;
            left: -6px;
        }

        .resize-handle-ne {
            top: -6px;
            right: -6px;
            cursor: ne-resize;
        }

        .resize-handle-sw {
            bottom: -6px;
            left: -6px;
            cursor: sw-resize;
        }

        .resize-handle-se {
            bottom: -6px;
            right: -6px;
            cursor: se-resize;
        }

        .resizable-image-wrapper.resizing {
            outline: 2px dashed #007bff;
        }

        .size-indicator {
            position: fixed;
            background: rgba(0, 123, 255, 0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            display: none;
        }
    `;
    document.head.appendChild(style);
}

// Inject styles immediately
injectImageResizeStyles();

document.addEventListener("DOMContentLoaded", function () {
    // Setup delete handlers
    setupDeleteHandlers();
    
    // Setup edit form handler
    setupEditFormHandler();
    
    // Setup add form handler
    setupAddFormHandler();
    
    // Setup search functionality
    setupSearchHandler();
    
    // Setup pagination
    setupPaginationHandler();
    
    // Setup tour code validation
    setupTourCodeValidation();

    // Setup form validation
    setupFormValidation();

    // Initialize itinerary delete buttons
    initializeItineraryDeleteButtons();
    
    // Setup number formatting for inputs
    setupNumberFormatting();
    
    // Setup multiple images preview
    setupMultipleImagesPreview();
    
    // Initialize checkbox functionality
    initializeCheckboxes();
    updateDeleteButtonState();

    // Update itinerary delete buttons on page load (for edit forms with pre-filled data)
    updateItineraryDeleteButtons();

    // Initialize pricing rows
    initializePricingRows();

    // Initialize promotion functions
    initializePromotionFunctions();

    // Initialize tour list page functions (if on tour list page)
    if (document.getElementById('tourFilterForm')) {
        initializeTourListPage();
    }
});

function setupDeleteHandlers() {
    const deleteButtons = document.querySelectorAll(".tour__form--delete");

    deleteButtons.forEach((form, index) => {
        const button = form.querySelector('button[type="button"]');
        if (button) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const tourTitle = this.getAttribute('data-tour-title') || 'tour này';
                const row = this.closest('tr');
                if (row) {
                    showDeleteModal(tourTitle, form, row);
                }
            });
        }
    });
}

// Show delete confirmation modal
function showDeleteModal(tourTitle, form, row) {
    // Set tour title in modal
    document.getElementById('tourNameToDelete').textContent = tourTitle;
    
    // Get modal instance with proper backdrop configuration
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'), {
        backdrop: true, // Enable backdrop
        keyboard: true, // Allow ESC key to close
        focus: true     // Focus on modal when shown
    });
    
    // Show modal
    deleteModal.show();
    
    // Handle confirm delete button
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    // Remove existing listeners to avoid duplicates
    const newConfirmBtn = confirmDeleteBtn.cloneNode(true);
    confirmDeleteBtn.parentNode.replaceChild(newConfirmBtn, confirmDeleteBtn);
    
    // Add new listener for confirm delete
    newConfirmBtn.addEventListener('click', function() {
        // Add deleting class to row
        row.classList.add('tour-row--deleting');
        
        // Disable button and show loading
        newConfirmBtn.disabled = true;
        newConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xóa...';
        
        // Get tour ID from form action
        const formAction = form.getAttribute('action');
        const tourId = formAction.split('/').pop();
        
        // Get current URL parameters for pagination calculation
        const urlParams = new URLSearchParams(window.location.search);
        const queryString = urlParams.toString();
        
        // Use AJAX to delete instead of form submission
        fetch(`${formAction}?${queryString}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            // Hide modal
            deleteModal.hide();
            
            if (data.success) {
                // Show success toast
                showToastNotification(data.message || 'Xóa tour thành công!', 'success');
                
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
                // Show error toast
                showToastNotification(data.message || 'Có lỗi xảy ra khi xóa tour', 'error');
                
                // Remove deleting class
                row.classList.remove('tour-row--deleting');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Hide modal
            deleteModal.hide();
            
            // Show error toast
            showToastNotification('Có lỗi xảy ra khi xóa tour', 'error');
            
            // Remove deleting class
            row.classList.remove('tour-row--deleting');
        })
        .finally(() => {
            // Re-enable button
            newConfirmBtn.disabled = false;
            newConfirmBtn.innerHTML = '<i class="fas fa-trash me-2"></i>Xóa';
        });
    });
    
    // Ensure cancel buttons work properly
    const cancelButtons = document.querySelectorAll('#deleteModal [data-bs-dismiss="modal"]');
    cancelButtons.forEach(button => {
        button.addEventListener('click', function() {
            deleteModal.hide();
        });
    });
    
    // Handle backdrop click to close modal
    const deleteModalElement = document.getElementById('deleteModal');
    if (deleteModalElement) {
        deleteModalElement.addEventListener('click', function(event) {
            if (event.target === this) {
                deleteModal.hide();
            }
        });
    }
    
    // Handle ESC key to close modal
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && deleteModal._isShown) {
            deleteModal.hide();
        }
    });
}

// Toggle Status Function
function toggleStatus(button) {
    const tourId = button.getAttribute("data-id");
    const currentStatus = button.getAttribute("data-status") === "true";

    // Set fixed width to prevent table jumping
    if (!button.style.minWidth) {
        button.style.minWidth = button.offsetWidth + "px";
    }

    // Disable button during request
    button.disabled = true;
    button.style.opacity = "0.6";

    fetch(`/tour/toggle-status/${tourId}`, {
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
                const newStatus = !currentStatus;
                button.setAttribute("data-status", newStatus);
                
                // Update button appearance
                button.className = `btn btn-sm ${newStatus ? 'btn-success' : 'btn-secondary'} tour__status-toggle`;
                button.innerHTML = `${newStatus ? 'Hoạt động' : 'Tạm dừng'}`;
                
                showToastNotification(data.message, 'success');
            } else {
                showToastNotification(data.message || 'Có lỗi xảy ra khi cập nhật trạng thái', 'error');
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            showToastNotification('Có lỗi xảy ra khi cập nhật trạng thái', 'error');
        })
        .finally(() => {
            // Re-enable button
            button.disabled = false;
            button.style.opacity = "1";
        });
}

// Toggle Highlight Function
function toggleHighlight(button) {
    const tourId = button.getAttribute("data-id");
    const currentHighlight = button.getAttribute("data-highlight") === "true";

    // Set fixed width to prevent table jumping
    if (!button.style.minWidth) {
        button.style.minWidth = button.offsetWidth + "px";
    }

    // Disable button during request
    button.disabled = true;
    button.style.opacity = "0.6";

    fetch(`/tour/toggle-highlight/${tourId}`, {
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
                const newHighlight = !currentHighlight;
                button.setAttribute("data-highlight", newHighlight);
                
                // Update button appearance
                button.className = `btn btn-sm ${newHighlight ? 'btn-warning' : 'btn-outline-warning'} tour__highlight-toggle`;
                button.innerHTML = `${newHighlight ? 'Nổi bật' : 'Bình thường'}`;
                
                showToastNotification(data.message, 'success');
            } else {
                showToastNotification(data.message || 'Có lỗi xảy ra khi cập nhật nổi bật', 'error');
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            showToastNotification('Có lỗi xảy ra khi cập nhật nổi bật', 'error');
        })
        .finally(() => {
            // Re-enable button
            button.disabled = false;
            button.style.opacity = "1";
        });
}

// Setup edit form handler
function setupEditFormHandler() {
    const editForm = document.querySelector('form[action*="/tour/edit/"]');
    if (!editForm) return;

    editForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validate form before submission
        if (!validateTourForm(editForm)) {
            return;
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang cập nhật...';
        }
        
        // Prepare form data with cleaned number values
        const formData = prepareFormDataForSubmission(editForm);
        
        // Submit the form
        fetch(editForm.action, {
            method: 'POST',
            body: formData,
            redirect: 'manual' // Handle redirects manually
        })
        .then(response => {
            if (response.type === 'opaqueredirect' || response.status === 302) {
                // Success redirect - form was submitted successfully
                showToastNotification('Cập nhật tour thành công!', 'success');
                setTimeout(() => {
                    window.location.href = '/tour';
                }, 1500);
                return;
            }
            
            if (response.ok) {
                return response.text();
            }
            throw new Error('Network response was not ok');
        })
        .then(html => {
            if (!html) return; // Already handled redirect above
            
            // Parse the response to check for error messages (redirect to form with errors)
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Check for error messages
            const errorMessage = doc.querySelector('.modal-notify--error .modal-notify__message, .alert-danger');
            if (errorMessage) {
                showToastNotification(errorMessage.textContent, 'error');
            } else {
                showToastNotification('Có lỗi xảy ra, vui lòng thử lại!', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToastNotification('Có lỗi xảy ra khi cập nhật tour!', 'error');
        })
        .finally(() => {
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Lưu thay đổi';
            }
        });
    });
}

// Setup add form handler
function setupAddFormHandler() {
    const addForm = document.querySelector('form[action="/tour/add"]');
    if (!addForm) return;

    addForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validate form before submission
        if (!validateTourForm(addForm)) {
            return;
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang lưu...';
        }

        // Prepare form data with cleaned number values
        const formData = prepareFormDataForSubmission(addForm);
        
        // Submit the form
        fetch(addForm.action, {
            method: 'POST',
            body: formData,
            redirect: 'manual' // Handle redirects manually
        })
        .then(response => {
            if (response.type === 'opaqueredirect' || response.status === 302) {
                // Success redirect - form was submitted successfully
                showToastNotification('Thêm tour thành công!', 'success');
                setTimeout(() => {
                    window.location.href = '/tour';
                }, 1500);
                return;
            }
            
            if (response.ok) {
                return response.text();
            }
            throw new Error('Network response was not ok');
        })
        .then(html => {
            if (!html) return; // Already handled redirect above
            
            // Parse the response to check for error messages (redirect to form with errors)
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Check for error messages
            const errorMessage = doc.querySelector('.modal-notify--error .modal-notify__message, .alert-danger');
            if (errorMessage) {
                showToastNotification(errorMessage.textContent, 'error');
            } else {
                showToastNotification('Có lỗi xảy ra, vui lòng thử lại!', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToastNotification('Có lỗi xảy ra khi thêm tour!', 'error');
        })
        .finally(() => {
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Thêm tour';
            }
        });
    });
}

// Setup search functionality
function setupSearchHandler() {
    const searchForm = document.querySelector('.tour__search-form');
    const searchInput = searchForm?.querySelector('input[name="q"]');
    
    if (!searchForm || !searchInput) return;
    
    // Auto-submit search after user stops typing
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (this.value.length >= 2 || this.value.length === 0) {
                searchForm.submit();
            }
        }, 500);
    });
}

// Setup pagination functionality
function setupPaginationHandler() {
    const paginationLinks = document.querySelectorAll('.tour__pagination .page-link');
    
    paginationLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Add loading state
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });
    });
}

// Setup comprehensive form validation
function setupFormValidation() {
    const tourForm = document.getElementById('tourForm');
    if (!tourForm) return;

    // Add real-time validation for required select fields
    const requiredSelects = ['category', 'departure', 'destination', 'transportation'];
    requiredSelects.forEach(fieldName => {
        const select = document.getElementById(fieldName);
        if (select) {
            select.addEventListener('change', function() {
                validateRequiredSelect(this);
            });
        }
    });

    // Add validation for date fields
    setupDateValidation();

    // Add validation for price fields
    setupPriceValidation();

    // Add real-time validation for existing fields
    setupRealTimeValidation();
}

// Validate required select field
function validateRequiredSelect(selectElement) {
    const value = selectElement.value.trim();
    const fieldName = selectElement.getAttribute('name') || selectElement.id;

    if (!value) {
        selectElement.classList.add('is-invalid');
        selectElement.classList.remove('is-valid');
        showFieldError(selectElement, `Vui lòng chọn ${getFieldDisplayName(fieldName)}`);
        return false;
    } else {
        selectElement.classList.add('is-valid');
        selectElement.classList.remove('is-invalid');
        hideFieldError(selectElement);
        return true;
    }
}

// Get display name for field
function getFieldDisplayName(fieldName) {
    const displayNames = {
        'category': 'danh mục',
        'departure': 'điểm khởi hành',
        'destination': 'điểm đến',
        'transportation': 'phương tiện'
    };
    return displayNames[fieldName] || fieldName;
}

// Show field error
function showFieldError(element, message) {
    // Remove existing error message
    hideFieldError(element);

    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    errorDiv.setAttribute('data-field-error', element.id || element.name);

    // Insert after the element
    element.parentNode.insertBefore(errorDiv, element.nextSibling);
}

// Hide field error
function hideFieldError(element) {
    const fieldId = element.id || element.name;
    const existingError = document.querySelector(`[data-field-error="${fieldId}"]`);
    if (existingError) {
        existingError.remove();
    }
}

// Setup tour code validation
function setupTourCodeValidation() {
    const codeInput = document.getElementById('code');
    const titleInput = document.getElementById('title');
    const generateCodeBtn = document.getElementById('generateCodeBtn');
    const tourForm = document.getElementById('tourForm');
    
    if (!codeInput) return;
    
    // Lưu mã tour ban đầu để so sánh
    const originalCode = codeInput.value;
    
    // Kiểm tra mã tour khi nhập
    let codeCheckTimeout;
    codeInput.addEventListener('input', function() {
        clearTimeout(codeCheckTimeout);
        const code = this.value.trim();
        
        // Không kiểm tra nếu mã không thay đổi (trong trường hợp edit)
        if (code === originalCode) {
            clearCodeValidation();
            return;
        }
        
        if (code.length >= 3) {
            codeCheckTimeout = setTimeout(() => {
                checkTourCode(code);
            }, 500);
        } else {
            clearCodeValidation();
        }
    });
    
    // Tạo mã tự động
    if (generateCodeBtn) {
        generateCodeBtn.addEventListener('click', function() {
            const title = titleInput ? titleInput.value.trim() : '';
            if (!title) {
                showCodeMessage('Vui lòng nhập tên tour trước', 'error');
                return;
            }
            
            generateTourCode(title);
        });
    }
    
    // Kiểm tra mã tour trước khi submit form
    if (tourForm) {
        tourForm.addEventListener('submit', function(e) {
            const code = codeInput.value.trim();
            const messageDiv = document.getElementById('codeMessage');
            
            if (messageDiv && messageDiv.classList.contains('text-danger') && messageDiv.style.display !== 'none') {
                e.preventDefault();
                showCodeMessage('Vui lòng sửa mã tour trước khi lưu', 'error');
                codeInput.focus();
                return false;
            }
        });
    }
}

// Kiểm tra mã tour
function checkTourCode(code) {
    const codeInput = document.getElementById('code');
    if (!codeInput) {
        console.error('Code input not found');
        return;
    }
    showCodeMessage('Đang kiểm tra mã tour...', 'info');
    
    fetch('/tour/check-code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
    })
    .then(response => response.json())
    .then(data => {
        if (data.exists) {
            showCodeMessage(data.message, 'error');
            codeInput.classList.add('is-invalid');
            codeInput.classList.remove('is-valid');
        } else {
            showCodeMessage('Mã tour có thể sử dụng', 'success');
            codeInput.classList.add('is-valid');
            codeInput.classList.remove('is-invalid');
        }
    })
    .catch(error => {
        console.error('Error checking tour code:', error);
        showCodeMessage('Có lỗi xảy ra khi kiểm tra mã tour', 'error');
        codeInput.classList.remove('is-valid', 'is-invalid');
    });
}

// Tạo mã tour tự động
function generateTourCode(title) {
    const generateBtn = document.getElementById('generateCodeBtn');
    if (!generateBtn) {
        console.error('Generate code button not found');
        return;
    }

    const originalIcon = generateBtn.innerHTML;

    // Hiển thị loading
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    generateBtn.disabled = true;
    
    fetch('/tour/generate-code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const codeInput = document.getElementById('code');
            if (codeInput) {
                codeInput.value = data.code;
                codeInput.classList.add('is-valid');
                codeInput.classList.remove('is-invalid');
                showCodeMessage('Mã tour đã được tạo tự động', 'success');

                // Hiệu ứng highlight
                codeInput.style.backgroundColor = '#d4edda';
                setTimeout(() => {
                    codeInput.style.backgroundColor = '';
                }, 2000);
            }
        } else {
            showCodeMessage(data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error generating tour code:', error);
        showCodeMessage('Có lỗi xảy ra khi tạo mã tour', 'error');
    })
    .finally(() => {
        // Khôi phục button
        if (generateBtn) {
            generateBtn.innerHTML = originalIcon;
            generateBtn.disabled = false;
        }
    });
}

// Hiển thị thông báo mã tour
function showCodeMessage(message, type) {
    const messageDiv = document.getElementById('codeMessage');
    if (!messageDiv) return;
    
    let className = 'form-text ';
    switch(type) {
        case 'error':
            className += 'text-danger';
            break;
        case 'success':
            className += 'text-success';
            break;
        case 'info':
            className += 'text-info';
            break;
        default:
            className += 'text-muted';
    }
    
    messageDiv.className = className;
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    // Hiệu ứng fade in
    messageDiv.style.opacity = '0';
    setTimeout(() => {
        messageDiv.style.opacity = '1';
    }, 50);
}

// Xóa thông báo mã tour
function clearCodeValidation() {
    const messageDiv = document.getElementById('codeMessage');
    const codeInput = document.getElementById('code');

    if (messageDiv) {
        messageDiv.style.display = 'none';
    }

    if (codeInput) {
        codeInput.classList.remove('is-valid', 'is-invalid');
    }
}

// Comprehensive form validation
function validateTourForm(form) {
    let isValid = true;
    const errors = [];

    // 1. Validate required text fields
    const requiredTextFields = [
        { id: 'title', name: 'Tiêu đề tour' },
        { id: 'code', name: 'Mã tour' }
    ];

    requiredTextFields.forEach(field => {
        const element = form.querySelector(`#${field.id}`);
        if (element) {
            const value = element.value.trim();
            if (!value) {
                element.classList.add('is-invalid');
                showFieldError(element, `${field.name} là bắt buộc`);
                errors.push(`${field.name} là bắt buộc`);
                isValid = false;
            } else {
                element.classList.remove('is-invalid');
                hideFieldError(element);
            }
        }
    });

    // 2. Validate required select fields
    const requiredSelects = [
        { id: 'category', name: 'Danh mục' },
        { id: 'departure', name: 'Điểm khởi hành' },
        { id: 'destination', name: 'Điểm đến' },
        { id: 'transportation', name: 'Phương tiện' }
    ];

    requiredSelects.forEach(field => {
        const element = form.querySelector(`#${field.id}`);
        if (element) {
            const value = element.value.trim();
            if (!value) {
                element.classList.add('is-invalid');
                showFieldError(element, `Vui lòng chọn ${field.name.toLowerCase()}`);
                errors.push(`${field.name} là bắt buộc`);
                isValid = false;
            } else {
                element.classList.remove('is-invalid');
                hideFieldError(element);
            }
        }
    });

    // 3. Validate tour code format and availability
    const codeInput = form.querySelector('#code');
    if (codeInput) {
        const messageDiv = document.getElementById('codeMessage');
        if (messageDiv && messageDiv.classList.contains('text-danger') && messageDiv.style.display !== 'none') {
            errors.push('Mã tour không hợp lệ hoặc đã tồn tại');
            isValid = false;
        }
    }

    // 4. Validate itinerary
    const itineraryValidation = validateItinerary(form);
    if (!itineraryValidation.isValid) {
        errors.push(...itineraryValidation.errors);
        isValid = false;
    }

    // 5. Validate tour details
    const tourDetailsValidation = validateTourDetails(form);
    if (!tourDetailsValidation.isValid) {
        errors.push(...tourDetailsValidation.errors);
        isValid = false;
    }

    // Show errors if any
    if (!isValid) {
        const errorMessage = errors.length > 1
            ? `Có ${errors.length} lỗi cần sửa:\n• ${errors.join('\n• ')}`
            : errors[0];
        showToastNotification(errorMessage, 'error');

        // Focus on first invalid field
        const firstInvalidField = form.querySelector('.is-invalid');
        if (firstInvalidField) {
            firstInvalidField.focus();
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    return isValid;
}

// Validate itinerary section
function validateItinerary(form) {
    const itineraryContainer = form.querySelector('#itineraryContainer');
    if (!itineraryContainer) return { isValid: true, errors: [] };

    const itineraryItems = itineraryContainer.querySelectorAll('.itinerary-item');
    const errors = [];
    let isValid = true;

    // Check minimum itinerary items
    if (itineraryItems.length === 0) {
        errors.push('Cần có ít nhất 1 lịch trình tour');
        isValid = false;
    }

    // Validate each itinerary item
    itineraryItems.forEach((item, index) => {
        const dayNumber = index + 1;

        // Validate title
        const titleInput = item.querySelector('input[name*="[title]"]');
        if (titleInput) {
            const title = titleInput.value.trim();
            if (!title) {
                titleInput.classList.add('is-invalid');
                showFieldError(titleInput, `Tiêu đề ngày ${dayNumber} là bắt buộc`);
                errors.push(`Tiêu đề ngày ${dayNumber} là bắt buộc`);
                isValid = false;
            } else {
                titleInput.classList.remove('is-invalid');
                hideFieldError(titleInput);
            }
        }

        // Validate details
        const detailsTextarea = item.querySelector('textarea[name*="[details]"]');
        if (detailsTextarea) {
            const details = detailsTextarea.value.trim();
            if (!details) {
                detailsTextarea.classList.add('is-invalid');
                showFieldError(detailsTextarea, `Chi tiết ngày ${dayNumber} là bắt buộc`);
                errors.push(`Chi tiết ngày ${dayNumber} là bắt buộc`);
                isValid = false;
            } else {
                detailsTextarea.classList.remove('is-invalid');
                hideFieldError(detailsTextarea);
            }
        }
    });

    return { isValid, errors };
}

// Validate tour details section
function validateTourDetails(form) {
    const priceContainer = form.querySelector('#priceContainer');
    if (!priceContainer) return { isValid: true, errors: [] };

    const priceBlocks = priceContainer.querySelectorAll('.price-block');
    const errors = [];
    let isValid = true;

    // Check minimum tour details
    if (priceBlocks.length === 0) {
        errors.push('Cần có ít nhất 1 chi tiết tour (giá và lịch khởi hành)');
        isValid = false;
    }

    // Validate each price block
    priceBlocks.forEach((block, index) => {
        const blockNumber = index + 1;

        // Validate adult price (required)
        const adultPriceInput = block.querySelector('input[name*="[adultPrice]"]');
        if (adultPriceInput) {
            const adultPrice = parseFormattedNumber(adultPriceInput.value);
            if (!adultPrice || adultPrice <= 0) {
                adultPriceInput.classList.add('is-invalid');
                showFieldError(adultPriceInput, `Giá người lớn tour ${blockNumber} phải lớn hơn 0`);
                errors.push(`Giá người lớn tour ${blockNumber} phải lớn hơn 0`);
                isValid = false;
            } else {
                adultPriceInput.classList.remove('is-invalid');
                hideFieldError(adultPriceInput);
            }
        }

        // Validate stock (required)
        const stockInput = block.querySelector('input[name*="[stock]"]');
        if (stockInput) {
            const stock = parseFormattedNumber(stockInput.value);
            if (!stock || stock <= 0) {
                stockInput.classList.add('is-invalid');
                showFieldError(stockInput, `Số lượng tour ${blockNumber} phải lớn hơn 0`);
                errors.push(`Số lượng tour ${blockNumber} phải lớn hơn 0`);
                isValid = false;
            } else {
                stockInput.classList.remove('is-invalid');
                hideFieldError(stockInput);
            }
        }

        // Validate start date (required)
        const startDateInput = block.querySelector('input[name*="[dayStart]"]');
        if (startDateInput) {
            const startDate = startDateInput.value;
            if (!startDate) {
                startDateInput.classList.add('is-invalid');
                showFieldError(startDateInput, `Ngày khởi hành tour ${blockNumber} là bắt buộc`);
                errors.push(`Ngày khởi hành tour ${blockNumber} là bắt buộc`);
                isValid = false;
            } else {
                startDateInput.classList.remove('is-invalid');
                hideFieldError(startDateInput);
            }
        }

        // Validate return date (required)
        const returnDateInput = block.querySelector('input[name*="[dayReturn]"]');
        if (returnDateInput) {
            const returnDate = returnDateInput.value;
            if (!returnDate) {
                returnDateInput.classList.add('is-invalid');
                showFieldError(returnDateInput, `Ngày trở về tour ${blockNumber} là bắt buộc`);
                errors.push(`Ngày trở về tour ${blockNumber} là bắt buộc`);
                isValid = false;
            } else {
                returnDateInput.classList.remove('is-invalid');
                hideFieldError(returnDateInput);
            }
        }

        // Validate date logic (return date must be after start date)
        if (startDateInput && returnDateInput && startDateInput.value && returnDateInput.value) {
            const startDate = new Date(startDateInput.value);
            const returnDate = new Date(returnDateInput.value);

            if (returnDate <= startDate) {
                returnDateInput.classList.add('is-invalid');
                showFieldError(returnDateInput, `Ngày trở về tour ${blockNumber} phải sau ngày khởi hành`);
                errors.push(`Ngày trở về tour ${blockNumber} phải sau ngày khởi hành`);
                isValid = false;
            } else {
                returnDateInput.classList.remove('is-invalid');
                hideFieldError(returnDateInput);
            }
        }

        // Validate discount (if provided, must be 0-100)
        const discountInput = block.querySelector('input[name*="[discount]"]');
        if (discountInput && discountInput.value.trim()) {
            const discount = parseFormattedDiscount(discountInput.value);
            if (discount < 0 || discount > 100) {
                discountInput.classList.add('is-invalid');
                showFieldError(discountInput, `Giảm giá tour ${blockNumber} phải từ 0-100%`);
                errors.push(`Giảm giá tour ${blockNumber} phải từ 0-100%`);
                isValid = false;
            } else {
                discountInput.classList.remove('is-invalid');
                hideFieldError(discountInput);
            }
        }
    });

    return { isValid, errors };
}

// Setup date validation
function setupDateValidation() {
    // Add event listeners for date inputs to validate date logic
    document.addEventListener('change', function(e) {
        if (e.target.matches('input[name*="[dayStart]"], input[name*="[dayReturn]"]')) {
            validateDatePair(e.target);
        }
    });
}

// Setup price validation
function setupPriceValidation() {
    // Add event listeners for price inputs
    document.addEventListener('input', function(e) {
        if (e.target.matches('input[name*="[adultPrice]"], input[name*="[stock]"]')) {
            validatePriceField(e.target);
        }
        if (e.target.matches('input[name*="[discount]"]')) {
            validateDiscountField(e.target);
        }
    });
}

// Setup real-time validation
function setupRealTimeValidation() {
    // Add blur validation for required text fields
    document.addEventListener('blur', function(e) {
        if (e.target.matches('#title, #code')) {
            validateRequiredTextField(e.target);
        }
        if (e.target.matches('input[name*="[title]"], textarea[name*="[details]"]')) {
            validateItineraryField(e.target);
        }
    }, true);
}

// Validate required text field
function validateRequiredTextField(element) {
    const value = element.value.trim();
    const fieldName = element.getAttribute('placeholder') || element.id;

    if (!value) {
        element.classList.add('is-invalid');
        showFieldError(element, `${fieldName} là bắt buộc`);
        return false;
    } else {
        element.classList.remove('is-invalid');
        hideFieldError(element);
        return true;
    }
}

// Validate itinerary field
function validateItineraryField(element) {
    const value = element.value.trim();
    const isTitle = element.matches('input[name*="[title]"]');
    const fieldType = isTitle ? 'Tiêu đề' : 'Chi tiết';

    if (!value) {
        element.classList.add('is-invalid');
        showFieldError(element, `${fieldType} là bắt buộc`);
        return false;
    } else {
        element.classList.remove('is-invalid');
        hideFieldError(element);
        return true;
    }
}

// Validate date pair (start and return dates)
function validateDatePair(changedInput) {
    const block = changedInput.closest('.price-block');
    if (!block) return;

    const startDateInput = block.querySelector('input[name*="[dayStart]"]');
    const returnDateInput = block.querySelector('input[name*="[dayReturn]"]');

    if (!startDateInput || !returnDateInput) return;

    const startDate = startDateInput.value;
    const returnDate = returnDateInput.value;

    // Clear previous validation states
    returnDateInput.classList.remove('is-invalid');
    hideFieldError(returnDateInput);

    if (startDate && returnDate) {
        const start = new Date(startDate);
        const end = new Date(returnDate);

        if (end <= start) {
            returnDateInput.classList.add('is-invalid');
            showFieldError(returnDateInput, 'Ngày trở về phải sau ngày khởi hành');
            return false;
        }
    }

    return true;
}

// Validate price field
function validatePriceField(element) {
    const value = parseFormattedNumber(element.value);
    const fieldName = element.getAttribute('placeholder') || 'Giá';

    if (element.hasAttribute('required') || element.matches('input[name*="[adultPrice]"], input[name*="[stock]"]')) {
        if (!value || value <= 0) {
            element.classList.add('is-invalid');
            showFieldError(element, `${fieldName} phải lớn hơn 0`);
            return false;
        }
    }

    element.classList.remove('is-invalid');
    hideFieldError(element);
    return true;
}

// Validate discount field
function validateDiscountField(element) {
    const value = parseFormattedDiscount(element.value);

    if (element.value.trim() && (value < 0 || value > 100)) {
        element.classList.add('is-invalid');
        showFieldError(element, 'Giảm giá phải từ 0-100%');
        return false;
    }

    element.classList.remove('is-invalid');
    hideFieldError(element);
    return true;
}

// CSS Styles for row animation and notification container
const styles = `
    .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        pointer-events: none;
    }
    
    .notification-container .modal-notify {
        position: relative;
        margin-bottom: 10px;
        transform: translateX(100%);
        transition: all 0.3s ease;
        pointer-events: auto;
    }
    
    .notification-container .modal-notify--active {
        transform: translateX(0);
    }
    
    .tour-row--deleting {
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

// Auto-hide notifications on page load
document.addEventListener('DOMContentLoaded', function() {
    const notifications = document.querySelectorAll('.modal-notify--active');
    notifications.forEach(notification => {
        setTimeout(() => {
            hideToastNotification(notification);
        }, 5000);
    });
});

// Advanced Filter JavaScript
// Toggle advanced filter visibility
function toggleAdvancedFilter() {
    const content = document.getElementById('advancedFilterContent');
    const icon = document.getElementById('filterToggleIcon');
    if (!content || !icon) return;

    const toggleBtn = icon.closest('button');
    
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        content.classList.add('show');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        toggleBtn.classList.add('expanded');
        localStorage.setItem('filterExpanded', 'true');
    } else {
        content.classList.remove('show');
        setTimeout(() => {
            content.style.display = 'none';
        }, 300); 
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        toggleBtn.classList.remove('expanded');
        localStorage.setItem('filterExpanded', 'false');
    }
}

// Set quick filter values and submit
function setQuickFilter(type) {
    const form = document.getElementById('tourFilterForm');
    
    // Clear existing filters first
    clearAllFilters(false);
    
    switch(type) {
        case 'expiring':
            // Tours expiring within 30 days
            const expiringDate = new Date();
            expiringDate.setDate(expiringDate.getDate() + 30);
            form.querySelector('[name="startDate"]').value = expiringDate.toISOString().split('T')[0];
            form.querySelector('[name="status"]').value = 'true';
            break;
            
        case 'expired':
            // Tours that have already ended
            const today = new Date().toISOString().split('T')[0];
            form.querySelector('[name="endDate"]').value = today;
            form.querySelector('[name="expired"]').value = 'true';
            break;
            
        case 'featured':
            // Featured tours
            form.querySelector('[name="highlight"]').value = 'true';
            break;
            
        case 'active':
            // Active tours
            form.querySelector('[name="status"]').value = 'true';
            break;
    }
    
    form.submit();
}

// Clear all filters
function clearAllFilters(submit = true) {
    const form = document.getElementById('tourFilterForm');
    const inputs = form.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        if (input.type === 'text' || input.type === 'date') {
            input.value = '';
        } else if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        }
    });
    
    if (submit) {
        form.submit();
    }
}

// Apply filters with animation
function applyFilters() {
    const form = document.getElementById('tourFilterForm');
    const submitBtn = form.querySelector('[name="quickFilter"]');
    
    // Add loading animation
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Đang áp dụng...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        form.submit();
    }, 500);
}

// Initialize filter state on page load
document.addEventListener('DOMContentLoaded', function() {
    // Restore filter visibility state
    const filterExpanded = localStorage.getItem('filterExpanded');
    const content = document.getElementById('advancedFilterContent');
    const icon = document.getElementById('filterToggleIcon');

    if (!content || !icon) return;

    const toggleBtn = icon.closest('button');
    
    if (filterExpanded === null || filterExpanded === 'true') {
        content.style.display = 'block';
        content.classList.add('show');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        toggleBtn.classList.add('expanded');
    } else {
        content.style.display = 'none';
        content.classList.remove('show');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        toggleBtn.classList.remove('expanded');
    }

    // Add change listeners to all filter elements
    const form = document.getElementById('tourFilterForm');
    if (form) {
        const filterElements = form.querySelectorAll('select, input[type="date"]');

        filterElements.forEach(element => {
            element.addEventListener('change', function() {
                // Add visual feedback
                this.style.borderColor = '#007bff';
                setTimeout(() => {
                    this.style.borderColor = '';
                }, 1000);
            });
        });
    }

    // Add filter count indicator
    updateFilterCount();
});

// Update filter count
function updateFilterCount() {
    const form = document.getElementById('tourFilterForm');
    const inputs = form.querySelectorAll('input[value], select');
    let activeFilters = 0;

    inputs.forEach(input => {
        if (input.value && input.value !== '' && input.name !== 'q') {
            activeFilters++;
        }
    });

    // Add filter count badge to header
    const header = document.querySelector('.card-header h6');
    let badge = header.querySelector('.badge');
    
    if (activeFilters > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'badge bg-primary ms-2';
            header.appendChild(badge);
        }
        badge.textContent = activeFilters;
    } else if (badge) {
        badge.remove();
    }
}

// Auto-submit search after typing delay
let searchTimeout;
const searchInput = document.querySelector('input[name="q"]');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (this.value.length >= 2 || this.value.length === 0) {
                const form = document.getElementById('tourFilterForm');
                if (form) {
                    form.submit();
                }
            }
        }, 1000);
    });
}

// Tour Form Dynamic Functions
// Pricing Rows Management
function addPricingRow() {
    const container = document.getElementById('pricingRowsContainer');
    if (!container) return;

    const existingRows = container.querySelectorAll('.pricing-row');
    const newIndex = existingRows.length;

    const newRow = document.createElement('div');
    newRow.className = 'row mb-2 pricing-row';
    newRow.setAttribute('data-index', newIndex);
    newRow.innerHTML = `
        <div class="col-md-5">
            <input type="text" class="form-control pricing-date-input"
                   name="pricing_dateLabel[${newIndex}]"
                   placeholder="Ngày khởi hành"
                   data-index="${newIndex}" />
        </div>
        <div class="col-md-5">
            <input type="text" class="form-control pricing-price-input"
                   name="pricing_priceText[${newIndex}]"
                   placeholder="Giá tour"
                   data-index="${newIndex}" />
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-outline-danger btn-sm"
                    onclick="removePricingRow(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    container.appendChild(newRow);

    // Setup price formatting for new input
    const priceInput = newRow.querySelector('.pricing-price-input');
    if (priceInput) {
        setupPricingPriceInput(priceInput);
    }

    updatePricingRowsIndexes();
}

function removePricingRow(button) {
    const container = document.getElementById('pricingRowsContainer');
    const row = button.closest('.pricing-row');

    if (!container || !row) return;

    // Don't allow removal if only one row remains
    const rows = container.querySelectorAll('.pricing-row');
    if (rows.length <= 1) return;

    // Remove with animation
    row.style.opacity = '0.5';
    row.style.transform = 'scale(0.95)';

    setTimeout(() => {
        row.remove();
        updatePricingRowsIndexes();
    }, 200);
}

function updatePricingRowsIndexes() {
    const container = document.getElementById('pricingRowsContainer');
    if (!container) return;

    const rows = container.querySelectorAll('.pricing-row');

    rows.forEach((row, index) => {
        // Update row data-index
        row.setAttribute('data-index', index);

        // Update input names and data-index
        const dateInput = row.querySelector('.pricing-date-input');
        const priceInput = row.querySelector('.pricing-price-input');

        if (dateInput) {
            dateInput.name = `pricing_dateLabel[${index}]`;
            dateInput.setAttribute('data-index', index);
        }

        if (priceInput) {
            priceInput.name = `pricing_priceText[${index}]`;
            priceInput.setAttribute('data-index', index);
        }
    });
}

// Setup pricing price input with proper formatting
function setupPricingPriceInput(input) {
    if (!input) return;

    // Format on input
    input.addEventListener('input', function(e) {
        let value = e.target.value;

        // Remove all non-numeric characters
        value = value.replace(/[^\d]/g, '');

        if (value === '') {
            e.target.value = '';
            return;
        }

        // Add thousand separators and VNĐ suffix
        const formattedValue = formatNumberWithDots(value);
        e.target.value = formattedValue + ' VNĐ';

        // Set cursor position before " VNĐ"
        const cursorPosition = e.target.value.length - 4;
        setTimeout(() => {
            e.target.setSelectionRange(cursorPosition, cursorPosition);
        }, 0);
    });

    // Format on blur - only show if value > 0
    input.addEventListener('blur', function(e) {
        let value = e.target.value.replace(/[^\d]/g, '');
        const numValue = parseInt(value) || 0;

        if (numValue > 0) {
            e.target.value = formatNumberWithDots(value) + ' VNĐ';
        } else {
            e.target.value = ''; // Clear if 0 or empty
        }
    });

    // Format on focus - select number part only
    input.addEventListener('focus', function(e) {
        const value = e.target.value.replace(/[^\d]/g, '');
        if (value !== '' && parseInt(value) > 0) {
            e.target.value = formatNumberWithDots(value) + ' VNĐ';
            // Select the number part (before " VNĐ")
            setTimeout(() => {
                e.target.setSelectionRange(0, e.target.value.length - 4);
            }, 0);
        }
    });

    // Prevent invalid characters
    input.addEventListener('keypress', function(e) {
        if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
            e.preventDefault();
        }
    });

    // Format existing value on setup
    if (input.value && input.value !== '') {
        let value = input.value.replace(/[^\d]/g, '');
        const numValue = parseInt(value) || 0;
        if (numValue > 0) {
            input.value = formatNumberWithDots(value) + ' VNĐ';
        } else {
            input.value = ''; // Clear if 0 or invalid
        }
    }
}

// Initialize pricing rows on page load
function initializePricingRows() {
    const container = document.getElementById('pricingRowsContainer');
    if (!container) return;

    // Add pricing-row class to existing rows if not present
    const rows = container.querySelectorAll('.row.mb-2');
    rows.forEach((row, index) => {
        if (!row.classList.contains('pricing-row')) {
            row.classList.add('pricing-row');
            row.setAttribute('data-index', index);

            // Update input names and add data-index
            const dateInput = row.querySelector('input[name*="pricing_dateLabel"]');
            const priceInput = row.querySelector('input[name*="pricing_priceText"]');

            if (dateInput) {
                dateInput.name = `pricing_dateLabel[${index}]`;
                dateInput.classList.add('pricing-date-input');
                dateInput.setAttribute('data-index', index);
            }

            if (priceInput) {
                priceInput.name = `pricing_priceText[${index}]`;
                priceInput.classList.add('pricing-price-input');
                priceInput.setAttribute('data-index', index);

                // Clear empty or zero values before setup
                if (priceInput.value === '' || priceInput.value === '0' || priceInput.value === '0 VNĐ') {
                    priceInput.value = '';
                }

                setupPricingPriceInput(priceInput);
            }
        }
    });
}

// Add/Remove Itinerary Functions
function addItinerary() {
    const container = document.getElementById('itineraryContainer');
    const items = container.querySelectorAll('.itinerary-item');
    const newIndex = items.length;
    const newDay = newIndex + 1;
    
    const newItem = document.createElement('div');
    newItem.className = 'itinerary-item border rounded p-3 mb-3 position-relative';
    newItem.innerHTML = `
        <button type="button" class="btn btn-sm btn-outline-danger itinerary-delete-btn" onclick="removeItinerary(this)" style="position: absolute; top: 10px; right: 10px; width:24px; height: 23px; border: 1px solid #3498db; padding:0; border-radius: 6px; ">
            <i class="fas fa-trash"></i>
        </button>
        
        <div class="row">
            <div class="col-md-3">
                <div class="mb-3">
                    <label class="form-label">Ngày <span class="text-danger">*</span></label>
                    <input type="number" class="form-control" name="itinerary[${newIndex}][day]" value="${newDay}" min="1" required disabled>
                </div>
            </div>
            <div class="col-md-9">
                <div class="mb-3">
                    <label class="form-label">Tiêu đề <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" name="itinerary[${newIndex}][title]" placeholder="Ví dụ: Khởi hành từ Hà Nội" required>
                </div>
            </div>
        </div>
        <div class="mb-3">
            <label class="form-label">Thông tin chi tiết <span class="text-danger">*</span></label>
            <textarea class="form-control ckeditor-itinerary" name="itinerary[${newIndex}][details]" rows="4" placeholder="Nhập thông tin chi tiết cho ngày này: địa điểm tham quan, hoạt động, bữa ăn..." required></textarea>
        </div>
    `;
    
    container.appendChild(newItem);
    reindexItinerary();
    updateItineraryDeleteButtons();

    // Add validation event listeners to new fields
    const titleInput = newItem.querySelector('input[name*="[title]"]');
    const detailsTextarea = newItem.querySelector('textarea[name*="[details]"]');

    if (titleInput) {
        titleInput.addEventListener('blur', function() {
            validateItineraryField(this);
        });
    }

    if (detailsTextarea) {
        detailsTextarea.addEventListener('blur', function() {
            validateItineraryField(this);
        });
    }
}

function removeItinerary(button) {
    const container = document.getElementById('itineraryContainer');
    const item = button.closest('.itinerary-item');

    if (!container || !item) return;

    // Don't allow removal if only one item remains
    if (container.children.length <= 1) return;
    
    // Remove with animation
    item.style.opacity = '0.5';
    item.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        item.remove();
        reindexItinerary();
        updateItineraryDeleteButtons();
    }, 200);
}

function reindexItinerary() {
    const container = document.getElementById('itineraryContainer');
    const items = container.querySelectorAll('.itinerary-item');
    
    items.forEach((item, index) => {
        // Update form fields with proper names and values
        const dayInput = item.querySelector('input[name*="[day]"]');
        const titleInput = item.querySelector('input[name*="[title]"]');
        const detailsTextarea = item.querySelector('textarea[name*="[details]"]');
        
        if (dayInput) {
            dayInput.name = `itinerary[${index}][day]`;
            dayInput.value = index + 1;
        }
        if (titleInput) titleInput.name = `itinerary[${index}][title]`;
        if (detailsTextarea) detailsTextarea.name = `itinerary[${index}][details]`;
    });
}

// Update delete button visibility for itinerary items
function updateItineraryDeleteButtons() {
    const container = document.getElementById('itineraryContainer');
    if (!container) return;
    
    const items = container.querySelectorAll('.itinerary-item');
    const itemCount = items.length;
    
    items.forEach((item) => {
        const deleteBtn = item.querySelector('.itinerary-delete-btn');
        if (deleteBtn) {
            if (itemCount > 1) {
                deleteBtn.style.display = 'inline-block';
                deleteBtn.style.visibility = 'visible';
            } else {
                deleteBtn.style.display = 'none';
                deleteBtn.style.visibility = 'hidden';
            }
        }
    });
}

// Initialize itinerary delete buttons on page load
function initializeItineraryDeleteButtons() {
    updateItineraryDeleteButtons();
}

// Dynamic Price Block Management
function addPriceBlock() {
    const container = document.getElementById('priceContainer');
    const blocks = container.querySelectorAll('.price-block');
    const newIndex = blocks.length;
    
    const newBlock = document.createElement('div');
    newBlock.className = 'price-block border rounded p-4 mb-4';
    newBlock.innerHTML = `
        <div class="price-block-header">
            <h5 class="price-block-title">Ngày ${newIndex + 1}</h5>
            <button type="button" class="btn btn-sm btn-outline-danger price-block-delete" onclick="removePriceBlock(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        
        <div class="row">
            <div class="col-md-3">
                <div class="mb-3">
                    <label class="form-label">Giá người lớn <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" name="tourDetails[${newIndex}][adultPrice]" placeholder="0 đ" required>
                </div>
            </div>
            <div class="col-md-3">
                <div class="mb-3">
                    <label class="form-label">Giá trẻ em</label>
                    <input type="text" class="form-control" name="tourDetails[${newIndex}][childrenPrice]" placeholder="0 đ">
                </div>
            </div>
            <div class="col-md-3">
                <div class="mb-3">
                    <label class="form-label">Giá trẻ nhỏ</label>
                    <input type="text" class="form-control" name="tourDetails[${newIndex}][childPrice]" placeholder="0 đ">
                </div>
            </div>
            <div class="col-md-3">
                <div class="mb-3">
                    <label class="form-label">Giá trẻ sơ sinh</label>
                    <input type="text" class="form-control" name="tourDetails[${newIndex}][babyPrice]" placeholder="0 đ">
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-3">
                <div class="mb-3">
                    <label class="form-label">Phụ thu phòng đơn</label>
                    <input type="text" class="form-control" name="tourDetails[${newIndex}][singleRoomSupplementPrice]" placeholder="0 đ">
                </div>
            </div>
            <div class="col-md-3">
                <div class="mb-3">
                    <label class="form-label">Giảm giá (%)</label>
                    <input type="text" class="form-control" name="tourDetails[${newIndex}][discount]" placeholder="0%">
                </div>
            </div>
            <div class="col-md-3">
                <div class="mb-3">
                    <label class="form-label">Stock <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" name="tourDetails[${newIndex}][stock]" placeholder="0" required>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="mb-3">
                    <label class="form-label">Ngày đi <span class="text-danger">*</span></label>
                    <input type="date" class="form-control" name="tourDetails[${newIndex}][dayStart]" required min="${new Date().toISOString().split('T')[0]}">
                </div>
            </div>
            <div class="col-md-6">
                <div class="mb-3">
                    <label class="form-label">Ngày về <span class="text-danger">*</span></label>
                    <input type="date" class="form-control" name="tourDetails[${newIndex}][dayReturn]" required min="${new Date().toISOString().split('T')[0]}">
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(newBlock);
    
    // Apply formatting to the new inputs
    const priceInputs = newBlock.querySelectorAll('input[name*="Price"], input[name*="price"]');
    priceInputs.forEach(input => formatPriceInput(input));
    
    const discountInput = newBlock.querySelector('input[name*="discount"]');
    if (discountInput) formatDiscountInput(discountInput);
    
    const stockInput = newBlock.querySelector('input[name*="stock"]');
    if (stockInput) formatStockInput(stockInput);

    // Add validation event listeners to new fields
    const adultPriceInput = newBlock.querySelector('input[name*="[adultPrice]"]');
    const stockInputValidation = newBlock.querySelector('input[name*="[stock]"]');
    const discountInputValidation = newBlock.querySelector('input[name*="[discount]"]');
    const startDateInput = newBlock.querySelector('input[name*="[dayStart]"]');
    const returnDateInput = newBlock.querySelector('input[name*="[dayReturn]"]');

    if (adultPriceInput) {
        adultPriceInput.addEventListener('input', function() {
            validatePriceField(this);
        });
    }

    if (stockInputValidation) {
        stockInputValidation.addEventListener('input', function() {
            validatePriceField(this);
        });
    }

    if (discountInputValidation) {
        discountInputValidation.addEventListener('input', function() {
            validateDiscountField(this);
        });
    }

    if (startDateInput || returnDateInput) {
        [startDateInput, returnDateInput].forEach(input => {
            if (input) {
                input.addEventListener('change', function() {
                    validateDatePair(this);
                });
            }
        });
    }

    updatePriceBlockButtons();
}

function removePriceBlock(button) {
    const block = button.closest('.price-block');
    const container = document.getElementById('priceContainer');

    if (!block || !container) return;

    if (container.children.length > 1) {
        // Thêm class animation trước khi xóa
        block.style.opacity = '0';
        block.style.transform = 'translateX(-20px)';
        block.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        setTimeout(() => {
            block.remove();
            updatePriceBlockIndexes();
            updatePriceBlockButtons();
        }, 300);
    } else {
        // Hiển thị thông báo nếu cố gắng xóa block cuối cùng
        alert('Không thể xóa block cuối cùng!');
    }
}

function updatePriceBlockIndexes() {
    const container = document.getElementById('priceContainer');
    const blocks = container.querySelectorAll('.price-block');
    
    blocks.forEach((block, index) => {
        // Update heading
        const heading = block.querySelector('.price-block-title');
        if (heading) {
            heading.textContent = `Ngày ${index + 1}`;
        }
        
        // Update input names
        const inputs = block.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.name.includes('tourDetails[')) {
                const fieldName = input.name.split('][')[1];
                input.name = `tourDetails[${index}][${fieldName}`;
            }
        });
    });
}

function updatePriceBlockButtons() {
    const container = document.getElementById('priceContainer');
    if (!container) return;
    
    const blocks = container.querySelectorAll('.price-block');
    const totalBlocks = blocks.length;
    
    blocks.forEach((block, index) => {
        const deleteBtn = block.querySelector('.price-block-delete');
        if (deleteBtn) {
            // Chỉ hiển thị nút xóa khi có từ 2 block trở lên
            if (totalBlocks > 1) {
                // Hiển thị nút với animation
                deleteBtn.style.display = 'inline-block';
                deleteBtn.style.opacity = '1';
                deleteBtn.style.visibility = 'visible';
            } else {
                // Ẩn nút với animation
                deleteBtn.style.opacity = '0';
                deleteBtn.style.visibility = 'hidden';
            }
        }
        
        // Cập nhật tiêu đề block
        const heading = block.querySelector('.price-block-title');
        if (heading) {
            heading.textContent = `Ngày ${index + 1}`;
        }
    });
    
    // Thêm/xóa thông báo cho block duy nhất
    updateSingleBlockMessage(totalBlocks === 1);
}

// Multiple Images Preview Functionality
function setupMultipleImagesPreview() {
    const imagesInput = document.getElementById('images');
    
    if (!imagesInput) {
        return;
    }
    
    imagesInput.addEventListener('change', function(e) {
        handleImagePreview(e.target.files);
    });
}

function handleImagePreview(files) {
    const imagesPreview = document.getElementById('imagesPreview');
    const previewContainer = document.getElementById('previewContainer');
    
    // Clear previous previews
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
    
    if (files.length === 0) {
        if (imagesPreview) {
            imagesPreview.style.display = 'none';
        }
        return;
    }
    
    // Show preview container
    if (imagesPreview) {
        imagesPreview.style.display = 'block';
    }
    
    // Process each file
    Array.from(files).forEach((file, index) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert(`File "${file.name}" không phải là ảnh!`);
            return;
        }
        
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert(`File "${file.name}" quá lớn! Kích thước tối đa: 5MB`);
            return;
        }
        
        // Create preview
        const reader = new FileReader();
        reader.onload = function(e) {
            createImagePreviewItem(e.target.result, file, index);
        };
        reader.readAsDataURL(file);
    });
}

// function createImagePreviewItem(imageSrc, file, index) {
//     const previewContainer = document.getElementById('previewContainer');
//     if (!previewContainer) {
//         return;
//     }
    
//     const previewItem = document.createElement('div');
//     previewItem.className = 'col-md-3 col-sm-4 col-6 mb-3';
    
//     const sizeInMB = (file.size / 1024 / 1024).toFixed(2);
    
//     previewItem.innerHTML = `
//         <div class="image-preview-item border rounded p-2 bg-light">
//             <img src="${imageSrc}" alt="Preview ${index + 1}" class="img-fluid w-100" style="height: 120px; object-fit: cover; border-radius: 4px;">
//             <div class="mt-2">
//                 <small class="text-muted d-block text-truncate" title="${file.name}">${file.name}</small>
//                 <small class="text-muted">${sizeInMB} MB</small>
//             </div>
//         </div>
//     `;
    
//     previewContainer.appendChild(previewItem);
// }

// Enable disabled day inputs before form submission
document.addEventListener('DOMContentLoaded', function() {
    // Handle form submission to enable day inputs
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            // Enable all disabled day inputs before submission
            const dayInputs = form.querySelectorAll('input[name*="[day]"][disabled]');
            dayInputs.forEach(input => {
                input.disabled = false;
            });
        });
    });
});

// Number formatting functions
function setupNumberFormatting() {
    // Format price inputs
    document.querySelectorAll('input[name*="Price"], input[name*="price"]').forEach(input => {
        formatPriceInput(input);
    });
    
    // Format discount inputs
    document.querySelectorAll('input[name*="discount"]').forEach(input => {
        formatDiscountInput(input);
    });
    
    // Format stock inputs
    document.querySelectorAll('input[name*="stock"]').forEach(input => {
        formatStockInput(input);
    });
}

// Format price input with thousand separators and "đ" suffix
function formatPriceInput(input) {
    if (!input) return;
    
    // Change input type to text
    input.type = 'text';
    
    // Format on input
    input.addEventListener('input', function(e) {
        let value = e.target.value;
        
        // Remove all non-numeric characters except dots
        value = value.replace(/[^\d]/g, '');
        
        if (value === '') {
            e.target.value = '';
            return;
        }
        
        // Add thousand separators
        const formattedValue = formatNumberWithDots(value);
        e.target.value = formattedValue + ' VNĐ';

        // Set cursor position
        const cursorPosition = e.target.value.length - 4; 
        setTimeout(() => {
            e.target.setSelectionRange(cursorPosition, cursorPosition);
        }, 0);
    });
    
    // Format on blur
    input.addEventListener('blur', function(e) {
        let value = e.target.value.replace(/[^\d]/g, '');
        if (value !== '') {
            e.target.value = formatNumberWithDots(value) + ' VNĐ';
        }
    });
    
    // Format on focus - select number part only
    input.addEventListener('focus', function(e) {
        const value = e.target.value.replace(/[^\d]/g, '');
        if (value !== '') {
            e.target.value = formatNumberWithDots(value) + ' VNĐ';
            // Select the number part (before " VNĐ")
            setTimeout(() => {
                e.target.setSelectionRange(0, e.target.value.length - 4);
            }, 0);
        }
    });
    
    // Prevent invalid characters
    input.addEventListener('keypress', function(e) {
        // Allow only numbers, backspace, delete, arrow keys
        if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
            e.preventDefault();
        }
    });
    
    // Format existing value on page load
    if (input.value && input.value !== '') {
        let value = input.value.replace(/[^\d]/g, '');
        if (value !== '') {
            input.value = formatNumberWithDots(value) + ' VNĐ';
        }
    }
}

// Format discount input with "%" suffix
function formatDiscountInput(input) {
    if (!input) return;
    
    // Change input type to text
    input.type = 'text';
    
    // Format on input
    input.addEventListener('input', function(e) {
        let value = e.target.value;
        
        // Remove all non-numeric characters except dots
        value = value.replace(/[^\d.]/g, '');
        
        // Ensure only one decimal point
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Limit to 2 decimal places
        if (parts[1] && parts[1].length > 2) {
            value = parts[0] + '.' + parts[1].substring(0, 2);
        }
        
        if (value === '') {
            e.target.value = '';
            return;
        }
        
        // Ensure discount doesn't exceed 100
        const numValue = parseFloat(value);
        if (numValue > 100) {
            value = '100';
        }
        
        e.target.value = value + '%';
        
        // Set cursor position
        const cursorPosition = e.target.value.length - 1; // Before "%"
        setTimeout(() => {
            e.target.setSelectionRange(cursorPosition, cursorPosition);
        }, 0);
    });
    
    // Format on blur
    input.addEventListener('blur', function(e) {
        let value = e.target.value.replace(/[^\d.]/g, '');
        if (value !== '') {
            const numValue = parseFloat(value);
            if (numValue > 100) {
                value = '100';
            }
            e.target.value = value + '%';
        }
    });
    
    // Format on focus - select number part only
    input.addEventListener('focus', function(e) {
        const value = e.target.value.replace(/[^\d.]/g, '');
        if (value !== '') {
            e.target.value = value + '%';
            // Select the number part (before "%")
            setTimeout(() => {
                e.target.setSelectionRange(0, e.target.value.length - 1);
            }, 0);
        }
    });
    
    // Prevent invalid characters
    input.addEventListener('keypress', function(e) {
        // Allow only numbers, decimal point, backspace, delete, arrow keys
        if (!/[\d.]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
            e.preventDefault();
        }
    });
    
    // Format existing value on page load
    if (input.value && input.value !== '') {
        let value = input.value.replace(/[^\d.]/g, '');
        if (value !== '') {
            const numValue = parseFloat(value);
            if (numValue > 100) {
                value = '100';
            }
            input.value = value + '%';
        }
    }
}

// Format stock input (numbers only)
function formatStockInput(input) {
    if (!input) return;
    
    // Change input type to text
    input.type = 'text';
    
    // Format on input
    input.addEventListener('input', function(e) {
        let value = e.target.value;
        
        // Remove all non-numeric characters
        value = value.replace(/[^\d]/g, '');
        
        e.target.value = value;
    });
    
    // Prevent invalid characters
    input.addEventListener('keypress', function(e) {
        // Allow only numbers, backspace, delete, arrow keys
        if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
            e.preventDefault();
        }
    });
    
    // Format existing value on page load
    if (input.value && input.value !== '') {
        let value = input.value.replace(/[^\d]/g, '');
        input.value = value;
    }
}

// Helper function to format number with dots as thousand separators
function formatNumberWithDots(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Helper function to parse formatted number back to integer
function parseFormattedNumber(formattedValue) {
    return parseInt(formattedValue.replace(/[^\d]/g, '')) || 0;
}

// Helper function to parse formatted discount back to number
function parseFormattedDiscount(formattedValue) {
    return parseFloat(formattedValue.replace(/[^\d.]/g, '')) || 0;
}

// Function to prepare form data before submission
function prepareFormDataForSubmission(form) {
    const formData = new FormData(form);

    // Process price inputs
    form.querySelectorAll('input[name*="Price"], input[name*="price"]').forEach(input => {
        if (input.value) {
            const cleanValue = parseFormattedNumber(input.value);
            formData.set(input.name, cleanValue.toString());
        }
    });

    // Process pricing price inputs (for pricing table)
    form.querySelectorAll('.pricing-price-input').forEach(input => {
        if (input.value && input.value.trim() !== '') {
            // Only process if value is not empty and not just "VNĐ"
            const cleanValue = input.value.replace(/[^\d]/g, '');
            const numValue = parseInt(cleanValue) || 0;
            if (numValue > 0) {
                // Format as "X.XXX.XXX VNĐ" for backend storage
                const formattedValue = formatNumberWithDots(cleanValue) + ' VNĐ';
                formData.set(input.name, formattedValue);
            } else {
                // Set empty string for zero values
                formData.set(input.name, '');
            }
        } else {
            // Set empty string for empty values
            formData.set(input.name, '');
        }
    });

    // Process discount inputs
    form.querySelectorAll('input[name*="discount"]').forEach(input => {
        if (input.value) {
            const cleanValue = parseFormattedDiscount(input.value);
            formData.set(input.name, cleanValue.toString());
        }
    });

    // Process stock inputs
    form.querySelectorAll('input[name*="stock"]').forEach(input => {
        if (input.value) {
            const cleanValue = parseFormattedNumber(input.value);
            formData.set(input.name, cleanValue.toString());
        }
    });

    return formData;
}

// Show notification function
function showToastNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.modal-notify');
    existingNotifications.forEach(notification => {
        notification.classList.remove('modal-notify--active');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `modal-notify modal-notify--${type}`;
    notification.style.zIndex = '9999'; // Ensure high z-index
    notification.style.opacity = '0'; // Start hidden
    notification.innerHTML = `
        <div class="modal-notify__content">
            <span class="modal-notify__message">${message}</span>
            <button class="modal-notify__close" onclick="hideToastNotification(this.closest('.modal-notify'))">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Force styles to ensure visibility
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.background = 'white';
    notification.style.zIndex = '9999';
    
    // Show notification with animation
    setTimeout(() => {
        notification.classList.add('modal-notify--active');
        notification.style.opacity = '1'; // Force full opacity
    }, 10);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        hideToastNotification(notification);
    }, 3000);
}

// Function to hide toast notification
function hideToastNotification(notification) {
    if (notification && notification.classList.contains('modal-notify--active')) {
        notification.classList.remove('modal-notify--active');
        notification.style.opacity = '0'; // Fade out
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

// Make the hide function globally available
window.hideToastNotification = hideToastNotification;

// Make formatting functions available globally
window.formatPriceInput = formatPriceInput;
window.formatDiscountInput = formatDiscountInput;
window.formatStockInput = formatStockInput;
window.formatNumberWithDots = formatNumberWithDots;
window.parseFormattedNumber = parseFormattedNumber;
window.parseFormattedDiscount = parseFormattedDiscount;
window.prepareFormDataForSubmission = prepareFormDataForSubmission;

// Initialize checkbox functionality
function initializeCheckboxes() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const tourCheckboxes = document.querySelectorAll('.tour-checkbox');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    
    // Select all checkbox handler
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            tourCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            updateDeleteButtonState();
        });
    }
    
    // Individual checkbox handlers
    tourCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateSelectAllState();
            updateDeleteButtonState();
        });
    });
    
    // Delete selected button handler
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', function() {
            const selectedTours = getSelectedTours();
            if (selectedTours.length === 0) {
                showToastNotification('Vui lòng chọn ít nhất một tour để xóa', 'error');
                return;
            }
            
            showDeleteMultipleModal(selectedTours);
        });
    }
}

// Update select all checkbox state based on individual checkboxes
function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const tourCheckboxes = document.querySelectorAll('.tour-checkbox');
    
    if (!selectAllCheckbox || tourCheckboxes.length === 0) return;
    
    const checkedCount = document.querySelectorAll('.tour-checkbox:checked').length;
    const totalCount = tourCheckboxes.length;
    
    if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === totalCount) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

// Update delete button state based on selections
function updateDeleteButtonState() {
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const selectedCount = document.querySelectorAll('.tour-checkbox:checked').length;
    
    if (deleteSelectedBtn) {
        if (selectedCount > 0) {
            deleteSelectedBtn.disabled = false;
            deleteSelectedBtn.innerHTML = `<i class="fas fa-trash"></i> Xóa (${selectedCount})`;
        } else {
            deleteSelectedBtn.disabled = true;
            deleteSelectedBtn.innerHTML = '<i class="fas fa-trash"></i> Xóa';
        }
    }
}

// Get selected tour IDs and titles
function getSelectedTours() {
    const selectedTours = [];
    const checkedBoxes = document.querySelectorAll('.tour-checkbox:checked');
    
    checkedBoxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        const tourId = checkbox.getAttribute('data-id');
        const tourTitle = row.querySelector('.tour-title')?.textContent || 'Không có tiêu đề';
        
        selectedTours.push({
            id: tourId,
            title: tourTitle
        });
    });
    
    return selectedTours;
}

// Show delete multiple modal
function showDeleteMultipleModal(selectedTours) {
    const modal = document.getElementById('deleteMultipleModal');
    const modalBody = modal.querySelector('.modal-body');
    const confirmBtn = modal.querySelector('#confirmDeleteMultiple');
    
    // Update modal content
    modalBody.innerHTML = `
        <p>Bạn có chắc chắn muốn xóa <strong>${selectedTours.length}</strong> tour sau:</p>
        <ul class="list-unstyled">
            ${selectedTours.map(tour => `<li>• ${tour.title}</li>`).join('')}
        </ul>
        <p class="text-danger"><strong>Hành động này không thể hoàn tác!</strong></p>
    `;
    
    // Update confirm button handler
    confirmBtn.onclick = function() {
        deleteMultipleTours(selectedTours.map(tour => tour.id));
    };
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Delete multiple tours
async function deleteMultipleTours(tourIds) {
    try {
        // Get current URL parameters for pagination calculation
        const urlParams = new URLSearchParams(window.location.search);
        const queryString = urlParams.toString();
        
        const response = await fetch(`/tour/delete-multiple?${queryString}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: tourIds })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToastNotification(result.message, 'success');
            
            // Close modal immediately
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteMultipleModal'));
            if (modal) {
                modal.hide();
            }
            
            // Handle pagination redirect if needed
            if (result.pagination && result.pagination.needsRedirect) {
                // Update URL with correct page
                urlParams.set('page', result.pagination.redirectPage);
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
            showToastNotification(result.message || 'Có lỗi xảy ra khi xóa tour', 'error');
        }
    } catch (error) {
        console.error('Error deleting tours:', error);
        showToastNotification('Có lỗi xảy ra khi xóa tour', 'error');
    } finally {
        // Ensure modal is properly closed on any outcome
        try {
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteMultipleModal'));
            if (modal) {
                modal.hide();
            }
        } catch (e) {
            console.warn('Modal already hidden');
        }
    }
}

// Update row numbers after deletion
function updateRowNumbers() {
    const tableBody = document.querySelector('.tour__table tbody');
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
    const tableBody = document.querySelector('.tour__table tbody');
    if (!tableBody) return;
    
    // Check if there are any actual data rows (not empty message rows)
    const dataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    
    if (dataRows.length === 0) {
        // Clear all existing rows and show empty message
        const colspan = tableBody.closest('table').querySelector('thead tr').children.length;
        tableBody.innerHTML = `
            <tr data-empty="true">
                <td colspan="${colspan}" class="tour__table-empty text-center py-4">
                    <i class="fas fa-map text-muted mb-2" style="font-size: 3rem;"></i>
                    <p class="text-muted mb-0">Chưa có tour nào.</p>
                    <p class="text-muted small">Thêm tour đầu tiên của bạn!</p>
                </td>
            </tr>
        `;
        
        // Hide pagination if exists
        const pagination = document.querySelector('.tour__pagination');
        if (pagination) {
            pagination.style.display = 'none';
        }
    } else {
        // Show pagination if hidden and there's data
        const pagination = document.querySelector('.tour__pagination');
        if (pagination) {
            pagination.style.display = '';
        }
    }
}

function addNewRowToTable(tourData) {
    const tableBody = document.querySelector('.tour__table tbody');
    if (!tableBody) return;
    
    const emptyRow = tableBody.querySelector('td.tour__table-empty');
    
    // Remove empty message if exists
    if (emptyRow) {
        emptyRow.closest('tr').remove();
    }
    
    // Get current number of data rows (excluding empty rows)
    const currentDataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    const newSTT = currentDataRows.length + 1; // New record will be at the end
    
    // Create new row HTML (simplified version - actual implementation would be more complex)
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${newSTT}</td>
        <td class="tour__name-cell">
            <div class="tour__name-wrapper">
                <div class="tour__image-wrapper">
                    <img src="${tourData.image || '/images/no-image.jpg'}" alt="${tourData.name}" class="tour__image">
                </div>
                <div class="tour__name-info">
                    <strong class="tour__name">${tourData.name}</strong>
                    <span class="tour__code">${tourData.code || ''}</span>
                </div>
            </div>
        </td>
        <td>
            <span class="tour__price">${tourData.price || 0} VNĐ</span>
        </td>
        <td>
            <button
                class="tour__badge tour__badge--toggle ${tourData.status === 'Hoạt động' ? 'tour__badge--success' : 'tour__badge--inactive'}"
                data-id="${tourData.id}"
                data-status="${tourData.status}"
                onclick="toggleTourStatus(this)"
                title="Nhấn để thay đổi trạng thái"
            >
                ${tourData.status === 'Hoạt động' ? 'Hoạt động' : 'Tạm dừng'}
            </button>
        </td>
        <td>
            <div class="d-flex gap-1 justify-content-center">
                <a href="/tour/edit/${tourData.id}" class="tour__btn tour__btn--warning tour__btn--sm" title="Chỉnh sửa tour">
                    <i class="fas fa-edit"></i>
                </a>
                <a href="/tour/${tourData.id}" class="tour__btn tour__btn--info tour__btn--sm" title="Xem chi tiết">
                    <i class="fas fa-eye"></i>
                </a>
                <form class="tour__form tour__form--delete" action="/tour/delete/${tourData.id}" method="POST">
                    <button type="submit" class="tour__btn tour__btn--danger tour__btn--sm" title="Xóa tour">
                        <i class="fas fa-trash"></i>
                    </button>
                </form>
            </div>
        </td>
    `;
    
    // IMPORTANT: Add to END of table (using appendChild, not insertBefore)
    tableBody.appendChild(newRow);
    
    // Setup delete handler for new row
    const deleteForm = newRow.querySelector('.tour__form--delete');
    setupSingleDeleteHandler(deleteForm);
    
    // Show pagination if hidden
    const pagination = document.querySelector('.tour__pagination');
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
        const nameCell = row.querySelector(".tour__name");
        const tourName = nameCell ? nameCell.textContent.trim() : "tour này";

        showDeleteModal(tourName, form, row);
    });
}

// Promotion Functions
function addPromotion() {
    const container = document.getElementById('promotionsContainer');
    if (!container) return;

    const newRow = document.createElement('div');
    newRow.className = 'row mb-2';
    newRow.innerHTML = `
        <div class="col-md-4">
            <input type="text" class="form-control" name="promo_label[]"
                   placeholder="Nhãn khuyến mãi" />
        </div>
        <div class="col-md-6">
            <input type="text" class="form-control" name="promo_desc[]"
                   placeholder="Mô tả khuyến mãi" />
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-outline-danger btn-sm"
                    onclick="removePromotion(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(newRow);
}

function removePromotion(button) {
    const row = button.closest('.row');
    if (row) {
        row.remove();
    }
}

// Promotion functions for additional info section
function addPromotionRow() {
    const container = document.getElementById('promotionContainer');
    if (!container) return;

    const existingRows = container.querySelectorAll('.row').length;
    const newRow = document.createElement('div');
    newRow.className = 'row mb-2';
    newRow.innerHTML = `
        <div class="col-md-6">
            <input type="text" class="form-control" name="promotions[${existingRows * 2}][label]"
                   placeholder="Ưu đãi ${existingRows * 2 + 1}" />
        </div>
        <div class="col-md-6">
            <input type="text" class="form-control" name="promotions[${existingRows * 2 + 1}][label]"
                   placeholder="Ưu đãi ${existingRows * 2 + 2}" />
        </div>
    `;
    container.appendChild(newRow);
}

function removePromotionRow(button) {
    const container = document.getElementById('promotionContainer');
    const rows = container.querySelectorAll('.row');
    if (rows.length > 1) {
        button.closest('.row').remove();
    }
}

// Initialize promotion functions
function initializePromotionFunctions() {
    // Make functions globally available
    window.addPromotion = addPromotion;
    window.removePromotion = removePromotion;
    window.addPromotionRow = addPromotionRow;
    window.removePromotionRow = removePromotionRow;
    window.addPricingRow = addPricingRow;
    window.removePricingRow = removePricingRow;
}

// Functions from tour.ejs
function toggleAdvancedFilter() {
    const content = document.getElementById('advancedFilterContent');
    const icon = document.getElementById('filterToggleIcon');

    if (content.style.display === 'none' || content.style.display === '' || content.classList.contains('d-none')) {
        // Show filter content with animation
        // Remove all hiding styles
        content.style.removeProperty('display');
        content.style.removeProperty('visibility');
        content.style.removeProperty('height');
        content.style.removeProperty('overflow');
        content.classList.remove('d-none');

        // Set up for animation
        content.style.display = 'block';
        content.style.opacity = '0';
        content.style.transform = 'translateY(-10px)';
        content.style.transition = 'all 0.3s ease-in-out';

        // Animate in
        setTimeout(() => {
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 10);

        // Change icon to chevron-up
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');

        // Save state for current session only
        sessionStorage.setItem('filterExpanded', 'true');
    } else {
        // Hide filter content with animation
        content.style.transition = 'all 0.3s ease-in-out';
        content.style.opacity = '0';
        content.style.transform = 'translateY(-10px)';

        setTimeout(() => {
            // Apply strong hiding styles
            content.style.setProperty('display', 'none', 'important');
            content.style.visibility = 'hidden';
            content.style.height = '0';
            content.style.overflow = 'hidden';
            content.classList.add('d-none');

            // Clean up animation styles
            content.style.removeProperty('opacity');
            content.style.removeProperty('transform');
            content.style.removeProperty('transition');
        }, 300);

        // Change icon to chevron-down
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');

        // Save state for current session only
        sessionStorage.setItem('filterExpanded', 'false');
    }
}

function setQuickFilter(type) {
    const form = document.getElementById('tourFilterForm');

    // Clear existing filters first
    clearAllFilters(false);

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    switch(type) {
        case 'expiring':
            // Tours expiring within 30 days
            form.querySelector('[name="quickFilter"]').value = 'expiring';
            form.querySelector('[name="status"]').value = 'true';
            break;

        case 'expired':
            // Tours that have already ended
            form.querySelector('[name="quickFilter"]').value = 'expired';
            break;

        case 'featured':
            // Featured tours
            form.querySelector('[name="highlight"]').value = 'true';
            break;

        case 'active':
            // Active tours
            form.querySelector('[name="status"]').value = 'true';
            break;
    }

    form.submit();
}

function clearAllFilters(submit = true) {
    const form = document.getElementById('tourFilterForm');
    const inputs = form.querySelectorAll('input, select');

    inputs.forEach(input => {
        if (input.type === 'text' || input.type === 'date') {
            input.value = '';
        } else if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        }
    });

    if (submit) {
        form.submit();
    }
}

function applyFilters() {
    const form = document.getElementById('tourFilterForm');
    const submitBtn = form.querySelector('[name="quickFilter"]');

    // Add loading animation
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Đang áp dụng...';
    submitBtn.disabled = true;

    setTimeout(() => {
        form.submit();
    }, 500);
}

function updateFilterCount() {
    const form = document.getElementById('tourFilterForm');
    if (!form) return;

    const inputs = form.querySelectorAll('input[value], select');
    let activeFilters = 0;

    inputs.forEach(input => {
        if (input.value && input.value !== '' && input.name !== 'quickFilter') {
            activeFilters++;
        }
    });

    // Update filter count badge
    const badge = document.getElementById('filterCountBadge');
    if (badge) {
        if (activeFilters > 0) {
            badge.textContent = activeFilters;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function changeItemsPerPage() {
    const select = document.getElementById('itemsPerPage');
    const selectedValue = select.value;

    // Get current URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Update limit parameter
    urlParams.set('limit', selectedValue);

    // Reset to first page when changing items per page
    urlParams.set('page', '1');

    // Redirect with new parameters
    window.location.href = window.location.pathname + '?' + urlParams.toString();
}

// Initialize tour list page functions
function initializeTourListPage() {
    // Initialize filter state on page load
    const content = document.getElementById('advancedFilterContent');
    const icon = document.getElementById('filterToggleIcon');

    // Multiple methods to ensure filter is hidden
    if (content) {
        content.style.setProperty('display', 'none', 'important');
        content.style.visibility = 'hidden';
        content.style.height = '0';
        content.style.overflow = 'hidden';
        content.style.opacity = '0';
        content.classList.add('d-none'); // Bootstrap utility class
    }

    // Reset icon to down arrow
    if (icon) {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }

    // Clear ALL storage to prevent auto-opening
    localStorage.removeItem('filterExpanded');
    sessionStorage.removeItem('filterExpanded');

    // Add change listeners to all filter elements
    const form = document.getElementById('tourFilterForm');
    if (form) {
        const filterElements = form.querySelectorAll('select, input[type="date"]');

        filterElements.forEach(element => {
            element.addEventListener('change', function() {
                // Add visual feedback
                this.style.borderColor = '#007bff';
                setTimeout(() => {
                    this.style.borderColor = '';
                }, 1000);
            });
        });
    }

    // Update filter count indicator
    updateFilterCount();

    // Auto-submit search after typing delay
    const searchInput = document.querySelector('input[name="q"]');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(window.searchTimeout);
            window.searchTimeout = setTimeout(() => {
                if (this.value.length >= 2 || this.value.length === 0) {
                    document.getElementById('tourFilterForm').submit();
                }
            }, 1000);
        });
    }

    // Initialize toast notifications
    const toasts = document.querySelectorAll('.modal-notify.modal-notify--active');

    toasts.forEach(toast => {
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (typeof hideToastNotification === 'function') {
                hideToastNotification(toast);
            } else {
                // Fallback if function not available
                toast.classList.remove('modal-notify--active');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, 3000);
    });
}

// ==================== CKEDITOR FUNCTIONALITY ====================

// Initialize CKEditor for tour forms
function initializeCKEditor() {
    // Only run if CKEditor is available
    if (typeof ClassicEditor === 'undefined') {
        return;
    }

    // Function to get editor data with images
    function getEditorDataWithImages(editor) {
        let data = '';
        try {
            data = editor.getData();
        } catch (error) {
            console.warn('Error getting editor data:', error);
            const sourceElement = editor.sourceElement;
            if (sourceElement) {
                data = sourceElement.value || sourceElement.innerHTML || '';
            }
        }
        return data;
    }

    // CKEditor configuration for travel content
    const editorConfig = {
        toolbar: [
            'heading', '|',
            'bold', 'italic', '|',
            'bulletedList', 'numberedList', '|',
            'link', 'blockQuote', '|',
            'undo', 'redo'
        ],
        heading: {
            options: [
                { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
            ]
        },
        language: 'vi',
        placeholder: 'Nhập nội dung...',
        removePlugins: ['MediaEmbed', 'Table', 'TableToolbar'],
        link: {
            decorators: {
                openInNewTab: {
                    mode: 'manual',
                    label: 'Mở trong tab mới',
                    attributes: {
                        target: '_blank',
                        rel: 'noopener noreferrer'
                    }
                }
            }
        }
    };

    // Function to add custom image insert button
    function addImageInsertButton(editor, container) {
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'mb-2';

        // URL button
        const urlButton = document.createElement('button');
        urlButton.type = 'button';
        urlButton.className = 'btn btn-sm btn-outline-primary me-2';
        urlButton.innerHTML = '<i class="fas fa-link"></i> Ảnh từ URL';
        urlButton.title = 'Chèn ảnh từ URL';

        // Upload button
        const uploadButton = document.createElement('button');
        uploadButton.type = 'button';
        uploadButton.className = 'btn btn-sm btn-outline-success me-2';
        uploadButton.innerHTML = '<i class="fas fa-upload"></i> Upload ảnh';
        uploadButton.title = 'Upload ảnh từ máy tính';

        // File input (hidden)
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        // URL button event
        urlButton.addEventListener('click', function() {
            editor.editing.view.focus();
            const imageUrl = prompt('Nhập URL ảnh:', 'https://');
            if (imageUrl && imageUrl.trim() && imageUrl !== 'https://') {
                const selection = editor.model.document.selection;
                const position = selection.getFirstPosition();
                showImageSizeDialog(imageUrl.trim(), editor, position);
            }
        });

        // Upload button event
        uploadButton.addEventListener('click', function() {
            editor.editing.view.focus();
            fileInput.click();
        });

        // File input change event
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                uploadImageToCloudinary(file, editor);
            }
            fileInput.value = '';
        });

        buttonGroup.appendChild(urlButton);
        buttonGroup.appendChild(uploadButton);
        buttonGroup.appendChild(fileInput);

        // Insert button group before the editor
        container.parentNode.insertBefore(buttonGroup, container);
    }

    // Function to upload image to Cloudinary
    function uploadImageToCloudinary(file, editor) {
        const formData = new FormData();
        formData.append('upload', file);

        const selection = editor.model.document.selection;
        const position = selection.getFirstPosition();

        fetch('/ckeditor/upload-image', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.url) {
                showImageSizeDialog(data.url, editor, position);
                if (typeof window.showToast === 'function') {
                    window.showToast('Ảnh đã được upload thành công!', 'success');
                }
            } else {
                console.error('Upload failed:', data.error?.message || 'Unknown error');
                if (typeof window.showToast === 'function') {
                    window.showToast('Upload thất bại: ' + (data.error?.message || 'Unknown error'), 'error');
                }
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Upload thất bại: ' + error.message, 'error');
            }
        });
    }

    // Function to show image size selection dialog
    function showImageSizeDialog(imageUrl, editor, position) {
        try {
            insertImageWithSize(imageUrl, 75, editor, position);
        } catch (error) {
            console.error('Error inserting image:', error);
            insertImageFallback(imageUrl, editor);
        }
    }

    // Store editor arrays globally for form submission
    window.tourEditors = {
        overview: [],
        includes: [],
        highlights: [],
        itinerary: []
    };

    // Initialize CKEditor for overview fields
    document.querySelectorAll('.ckeditor-overview').forEach(function(element) {
        ClassicEditor
            .create(element, editorConfig)
            .then(editor => {
                window.tourEditors.overview.push(editor);
                addImageInsertButton(editor, element.nextElementSibling);
                addImageResizeHandler(editor);

                editor.model.document.on('change:data', () => {
                    if (window.markFormAsDirty) {
                        window.markFormAsDirty();
                    }
                });
            })
            .catch(error => {
                console.error('Error initializing CKEditor for overview:', error);
            });
    });

    // Initialize CKEditor for includes fields
    document.querySelectorAll('.ckeditor-includes').forEach(function(element) {
        ClassicEditor
            .create(element, editorConfig)
            .then(editor => {
                window.tourEditors.includes.push(editor);
                addImageInsertButton(editor, element.nextElementSibling);
                addImageResizeHandler(editor);

                editor.model.document.on('change:data', () => {
                    if (window.markFormAsDirty) {
                        window.markFormAsDirty();
                    }
                });
            })
            .catch(error => {
                console.error('Error initializing CKEditor for includes:', error);
            });
    });

    // Initialize CKEditor for highlights field
    const highlightsElement = document.querySelector('.ckeditor-highlights');
    if (highlightsElement) {
        ClassicEditor
            .create(highlightsElement, editorConfig)
            .then(editor => {
                window.tourEditors.highlights.push(editor);
                addImageInsertButton(editor, highlightsElement.nextElementSibling);
                addImageResizeHandler(editor);

                editor.model.document.on('change:data', () => {
                    if (window.markFormAsDirty) {
                        window.markFormAsDirty();
                    }
                });
            })
            .catch(error => {
                console.error('Error initializing CKEditor for highlights:', error);
            });
    }

    // Initialize CKEditor for itinerary fields
    function initializeItineraryEditors() {
        document.querySelectorAll('.ckeditor-itinerary').forEach(function(element) {
            if (element.dataset.ckeditorInitialized) return;

            element.dataset.ckeditorInitialized = 'true';
            ClassicEditor
                .create(element, editorConfig)
                .then(editor => {
                    window.tourEditors.itinerary.push(editor);
                    addImageInsertButton(editor, element.nextElementSibling);
                    addImageResizeHandler(editor);

                    editor.model.document.on('change:data', () => {
                        if (window.markFormAsDirty) {
                            window.markFormAsDirty();
                        }
                    });
                })
                .catch(error => {
                    console.error('Error initializing CKEditor for itinerary:', error);
                });
        });
    }

    // Initialize existing itinerary editors
    initializeItineraryEditors();

    // Override addItinerary function to initialize CKEditor for new items
    const originalAddItinerary = window.addItinerary;
    window.addItinerary = function() {
        if (originalAddItinerary) {
            originalAddItinerary();
            setTimeout(initializeItineraryEditors, 100);
        }
    };

    // Form submission handler
    const form = document.getElementById('tourForm');
    if (form) {
        const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
        submitButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                updateAllEditorsBeforeSubmit();
            });
        });

        form.addEventListener('submit', function(e) {
            updateAllEditorsBeforeSubmit();
        });
    }

    // Function to update all editors before submit
    function updateAllEditorsBeforeSubmit() {
        // Update overview editors
        window.tourEditors.overview.forEach(editor => {
            if (editor.sourceElement) {
                editor.sourceElement.value = getEditorDataWithImages(editor);
            }
        });

        // Update includes editors
        window.tourEditors.includes.forEach(editor => {
            if (editor.sourceElement) {
                editor.sourceElement.value = getEditorDataWithImages(editor);
            }
        });

        // Update highlights editors
        window.tourEditors.highlights.forEach(editor => {
            if (editor.sourceElement) {
                editor.sourceElement.value = getEditorDataWithImages(editor);
            }
        });

        // Update itinerary editors
        window.tourEditors.itinerary.forEach(editor => {
            if (editor.sourceElement) {
                editor.sourceElement.value = getEditorDataWithImages(editor);
            }
        });
    }

    // ==================== IMAGE FUNCTIONALITY ====================

    // Fallback function for simple image insertion
    function insertImageFallback(imageUrl, editor) {
        const editorElement = editor.ui.getEditableElement();
        const existingImg = editorElement.querySelector(`img[src="${imageUrl}"]`);
        if (existingImg) {
            return;
        }

        const imageId = 'img_fallback_' + Date.now();
        const imageHtml = `<p><img src="${imageUrl}" alt="Ảnh tour" data-image-id="${imageId}" data-size="75" style="width: 75%; height: auto; display: block; margin: 10px auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></p>`;

        const currentData = editor.getData();
        const newData = currentData + imageHtml;
        editor.setData(newData);

        if (typeof window.markFormAsDirty === 'function') {
            window.markFormAsDirty();
        }

        setTimeout(() => {
            const editorElement = editor.ui.getEditableElement();
            const img = editorElement.querySelector(`img[data-image-id="${imageId}"]`);
            if (img) {
                addResizeHandlesToImage(imageId, editor);
            }
        }, 500);
    }

    // Function to insert image with specific size
    function insertImageWithSize(imageUrl, size, editor, position) {
        try {
            const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

            if (window.processingImages && window.processingImages.has(imageUrl)) {
                return;
            }

            if (!window.processingImages) {
                window.processingImages = new Set();
            }
            window.processingImages.add(imageUrl);

            const imageHtml = `<p><img src="${imageUrl}" alt="Ảnh tour" data-size="${size}" data-image-id="${imageId}" style="width: ${size}%; height: auto; display: block; margin: 10px auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></p>`;

            const currentData = editor.getData();
            const newData = currentData + imageHtml;
            editor.setData(newData);

            setTimeout(() => {
                const editorElement = editor.ui.getEditableElement();
                const insertedImg = editorElement.querySelector(`img[data-image-id="${imageId}"]`);

                if (insertedImg) {
                    addResizeHandlesToImage(imageId, editor);
                    if (window.processingImages) {
                        window.processingImages.delete(imageUrl);
                    }
                } else {
                    setTimeout(() => {
                        const retryImg = editorElement.querySelector(`img[data-image-id="${imageId}"]`);
                        if (retryImg) {
                            addResizeHandlesToImage(imageId, editor);
                        }
                        if (window.processingImages) {
                            window.processingImages.delete(imageUrl);
                        }
                    }, 500);
                }

                if (typeof window.markFormAsDirty === 'function') {
                    window.markFormAsDirty();
                }
            }, 200);

        } catch (error) {
            console.error('Error inserting image with size:', error);
            insertImageFallback(imageUrl, editor);
        }
    }

    // Function to add resize handles to image
    function addResizeHandlesToImage(imageId, editor) {
        try {
            const editorElement = editor.ui.getEditableElement();
            const img = editorElement.querySelector(`img[data-image-id="${imageId}"]`);

            if (!img) {
                return;
            }

            if (img.parentNode.classList.contains('resizable-image-wrapper')) {
                return;
            }

            if (!img.complete) {
                img.onload = () => addResizeHandlesToImage(imageId, editor);
                return;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'resizable-image-wrapper';
            wrapper.setAttribute('data-image-id', imageId);

            const handlesContainer = document.createElement('div');
            handlesContainer.className = 'resize-handles';

            const handlePositions = ['nw', 'ne', 'sw', 'se'];
            handlePositions.forEach(pos => {
                const handle = document.createElement('div');
                handle.className = `resize-handle resize-handle-${pos}`;
                handlesContainer.appendChild(handle);
            });

            const parent = img.parentNode;
            parent.insertBefore(wrapper, img);
            wrapper.appendChild(img);
            wrapper.appendChild(handlesContainer);

            addResizeEventListeners(wrapper, img);

        } catch (error) {
            console.error('Error adding resize handles:', error);
        }
    }

    // Function to add resize event listeners
    function addResizeEventListeners(wrapper, img) {
        let isResizing = false;
        let startX, startWidth;

        wrapper.addEventListener('mouseenter', () => {
            wrapper.classList.add('show-handles');
        });

        wrapper.addEventListener('mouseleave', () => {
            if (!isResizing) {
                wrapper.classList.remove('show-handles');
            }
        });

        const handles = wrapper.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();

                isResizing = true;
                startX = e.clientX;
                startWidth = img.offsetWidth;

                wrapper.classList.add('resizing');
                document.body.style.cursor = 'nw-resize';

                const handleMouseMove = (e) => {
                    if (!isResizing) return;

                    const deltaX = e.clientX - startX;
                    let newWidth = startWidth;

                    if (handle.classList.contains('resize-handle-se') || handle.classList.contains('resize-handle-ne')) {
                        newWidth = startWidth + deltaX;
                    } else {
                        newWidth = startWidth - deltaX;
                    }

                    const containerWidth = wrapper.parentElement.offsetWidth;
                    newWidth = Math.max(100, Math.min(newWidth, containerWidth));
                    const percentage = Math.round((newWidth / containerWidth) * 100);

                    img.style.width = percentage + '%';
                    img.setAttribute('data-size', percentage);

                    updateSizeIndicator(wrapper, percentage);
                };

                const handleMouseUp = () => {
                    isResizing = false;
                    wrapper.classList.remove('resizing');
                    wrapper.classList.remove('show-handles');
                    document.body.style.cursor = '';

                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);

                    hideSizeIndicator();

                    if (typeof window.markFormAsDirty === 'function') {
                        window.markFormAsDirty();
                    }
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });
        });
    }

    // Function to show size indicator
    function updateSizeIndicator(wrapper, percentage) {
        let indicator = document.querySelector('.size-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'size-indicator';
            document.body.appendChild(indicator);
        }

        indicator.textContent = percentage + '%';
        indicator.style.display = 'block';

        const rect = wrapper.getBoundingClientRect();
        indicator.style.left = (rect.left + rect.width / 2 - 25) + 'px';
        indicator.style.top = (rect.top - 40) + 'px';
    }

    // Function to hide size indicator
    function hideSizeIndicator() {
        const indicator = document.querySelector('.size-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Function to add image resize handler
    function addImageResizeHandler(editor) {
        let debounceTimer;

        editor.model.document.on('change:data', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                addResizeHandlesToExistingImages(editor);
            }, 300);
        });

        setTimeout(() => {
            addResizeHandlesToExistingImages(editor);
        }, 500);
    }

    // Function to add resize handles to existing images
    function addResizeHandlesToExistingImages(editor) {
        try {
            const editorElement = editor.ui.getEditableElement();
            if (!editorElement) return;

            const images = editorElement.querySelectorAll('img:not(.resizable-image-wrapper img)');

            images.forEach((img, index) => {
                if (!img.getAttribute('data-image-id') && img.src && !img.closest('.resizable-image-wrapper')) {
                    const imageId = 'img_existing_' + Date.now() + '_' + index;
                    img.setAttribute('data-image-id', imageId);

                    setTimeout(() => {
                        addResizeHandlesToImage(imageId, editor);
                    }, 100 * (index + 1));
                }
            });
        } catch (error) {
            console.error('Error adding resize handles to existing images:', error);
        }
    }

    // Make functions available globally
    window.updateAllEditorsBeforeSubmit = updateAllEditorsBeforeSubmit;
    window.initializeItineraryEditors = initializeItineraryEditors;
}

// ==================== IMAGE PREVIEW & MODAL FUNCTIONALITY ====================

// Image preview functionality for file inputs
function setupImagePreview() {
    const imageInput = document.getElementById('images');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const previewContainer = document.getElementById('imagesPreview');
            const previewContent = document.getElementById('previewContainer');

            if (e.target.files.length > 0) {
                previewContainer.style.display = 'block';
                previewContent.innerHTML = '';

                Array.from(e.target.files).forEach((file, index) => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const imagePreview = document.createElement('div');
                        imagePreview.className = 'col-md-3';
                        imagePreview.innerHTML = `
                            <div class="image-preview-item border rounded overflow-hidden">
                                <img src="${e.target.result}" alt="Preview ${index + 1}" class="img-fluid w-100" style="height: 150px; object-fit: cover;">
                            </div>
                        `;
                        previewContent.appendChild(imagePreview);
                    };
                    reader.readAsDataURL(file);
                });
            } else {
                previewContainer.style.display = 'none';
            }
        });
    }
}

// Function to show image modal
function showImageModal(imageSrc, imageAlt) {
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    document.getElementById('modalImage').src = imageSrc;
    document.getElementById('modalImage').alt = imageAlt;
    modal.show();
}

// Auto-hide notifications
function setupNotificationAutoHide() {
    document.querySelectorAll('.modal-notify__close').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal-notify').remove();
        });
    });

    // Auto-hide after 5 seconds
    setTimeout(() => {
        document.querySelectorAll('.modal-notify').forEach(notify => {
            notify.remove();
        });
    }, 5000);
}

// Initialize delete button visibility for edit forms
function initializeEditFormButtons() {
    // Update delete button visibility for itinerary items
    const itineraryItems = document.querySelectorAll('.itinerary-item');
    itineraryItems.forEach(item => {
        const deleteBtn = item.querySelector('.itinerary-delete-btn');
        if (deleteBtn && itineraryItems.length > 1) {
            deleteBtn.style.display = 'block';
        }
    });

    // Update delete button visibility for price blocks
    const priceBlocks = document.querySelectorAll('.price-block');
    priceBlocks.forEach(block => {
        const deleteBtn = block.querySelector('.price-block-delete');
        if (deleteBtn && priceBlocks.length > 1) {
            deleteBtn.style.opacity = '1';
            deleteBtn.style.visibility = 'visible';
        }
    });
}

// ==================== INITIALIZATION ====================

// Initialize all tour form functionality
function initializeTourFormFunctionality() {
    // Initialize CKEditor if available
    if (typeof ClassicEditor !== 'undefined') {
        initializeCKEditor();
    }

    // Setup image preview
    setupImagePreview();

    // Setup notification auto-hide
    setupNotificationAutoHide();

    // Initialize edit form buttons (for edit forms)
    initializeEditFormButtons();
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add a small delay to ensure all scripts are loaded
    setTimeout(initializeTourFormFunctionality, 100);
});

// Make functions available globally
window.showImageModal = showImageModal;
window.initializeTourFormFunctionality = initializeTourFormFunctionality;

// Make functions globally available
window.toggleStatus = toggleStatus;
window.toggleHighlight = toggleHighlight;
window.addItinerary = addItinerary;
window.removeItinerary = removeItinerary;
window.addPriceBlock = addPriceBlock;
window.removePriceBlock = removePriceBlock;
window.toggleAdvancedFilter = toggleAdvancedFilter;
window.setQuickFilter = setQuickFilter;
window.clearAllFilters = clearAllFilters;
window.applyFilters = applyFilters;
window.changeItemsPerPage = changeItemsPerPage;
window.initializeCKEditor = initializeCKEditor;
