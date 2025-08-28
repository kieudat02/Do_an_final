// Global function to handle limit change
function handleLimitChange(selectElement) {
    console.log('Limit changed to:', selectElement.value);
    
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

// Global function to toggle user status
function toggleUserStatus(userId, buttonElement) {
    // Disable button temporarily
    buttonElement.disabled = true;
    buttonElement.classList.add('status-changing');
    
    // Store original content for error recovery
    const originalContent = buttonElement.innerHTML;
    
    fetch(`/account/toggle-status/${userId}`, {
        method: 'POST',
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
            // Update button appearance and content
            const newStatus = data.newStatus;
            const isActive = newStatus === 'Hoạt động';
            
            // Update classes
            buttonElement.className = `destination__badge destination__badge--${isActive ? 'success' : 'inactive'} destination__badge--toggle`;
            
            // Update content without icons
            buttonElement.innerHTML = newStatus;
            
            // Update data attributes
            buttonElement.setAttribute('data-current-status', newStatus);
            
            // Show success message
            showToastMessage('success', data.message);
            
        } else {
            // Restore original content on error
            buttonElement.innerHTML = originalContent;
            showToastMessage('error', data.message || 'Có lỗi xảy ra khi thay đổi trạng thái');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Restore original content on error
        buttonElement.innerHTML = originalContent;
        showToastMessage('error', 'Có lỗi xảy ra khi thay đổi trạng thái');
    })
    .finally(() => {
        // Re-enable button
        buttonElement.disabled = false;
        buttonElement.classList.remove('status-changing');
    });
}

// Function to show toast messages
function showToastMessage(type, message) {
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
            </button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        if (toast && toast.parentNode) {
            hideToastNotification(toast);
        }
    }, 5000);
}

// Function to hide toast notifications
function hideToastNotification(element) {
    if (element) {
        element.classList.remove('modal-notify--active');
        setTimeout(() => {
            if (element && element.parentNode) {
                element.remove();
            }
        }, 300);
    }
}

// Account Management JavaScript
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM loaded, setting up account handlers...");

    // Setup delete handlers
    setupDeleteHandlers();
    
    // Setup edit form handler
    setupEditFormHandler();
    
    // Setup add form handler
    setupAddFormHandler();
    
    // Setup search functionality
    setupSearchHandler();
});

function setupDeleteHandlers() {
    const deleteButtons = document.querySelectorAll(".destination__form--delete");
    console.log("Found delete forms:", deleteButtons.length);

    deleteButtons.forEach((form, index) => {
        console.log(`Setting up handler for form ${index + 1}`);
        setupSingleDeleteHandler(form);
    });
}

// Show delete confirmation modal
function showDeleteModal(userName, form, row) {
    // Set user name in modal
    document.getElementById('userNameToDelete').textContent = userName;
    
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
        console.log('Confirmed delete for user:', userName);
        
        // Add animation to row
        if (row) {
            row.classList.add('user-row--deleting');
        }
        
        // Submit the form
        form.submit();
        
        // Hide modal
        deleteModal.hide();
    });
}

// Setup edit form handler
function setupEditFormHandler() {
    const editForm = document.querySelector('form[action*="/account/edit/"]');
    if (!editForm) return;

    editForm.addEventListener('submit', function(e) {
        console.log('Edit form submitted');
        // Form validation can be added here if needed
    });
}

// Setup add form handler
function setupAddFormHandler() {
    const addForm = document.querySelector('form[action="/account/add"]');
    if (!addForm) return;

    addForm.addEventListener('submit', function(e) {
        console.log('Add form submitted');
        // Form validation can be added here if needed
        
        // Basic email validation
        const emailInput = addForm.querySelector('input[name="email"]');
        const email = emailInput.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
            e.preventDefault();
            alert('Vui lòng nhập email hợp lệ');
            emailInput.focus();
            return false;
        }
    });
}

// Setup search functionality
function setupSearchHandler() {
    const searchForm = document.querySelector('.destination__search-form');
    const searchInput = searchForm?.querySelector('input[name="search"]');
    
    if (!searchForm || !searchInput) return;
    
    // Auto-submit search after user stops typing
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (searchInput.value !== searchInput.getAttribute('data-original-value')) {
                searchForm.submit();
            }
        }, 800); // Wait 800ms after user stops typing
    });
    
    // Store original value
    searchInput.setAttribute('data-original-value', searchInput.value);
    
    // Handle search form submission
    searchForm.addEventListener('submit', function(e) {
        // Let the form submit naturally
        console.log('Search form submitted with query:', searchInput.value);
    });
}

// CSS Styles for row animation
const styles = `
    .user-row--deleting {
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
    const tableBody = document.querySelector('.destination__table tbody');
    if (!tableBody) return;
    
    // Get all data rows (exclude empty rows)
    const dataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    
    // Update STT based on current position in table (index + 1)
    dataRows.forEach((row, index) => {
        const sttCell = row.querySelector('td:first-child');
        if (sttCell) {
            sttCell.textContent = index + 1;
        }
    });
}

function handleEmptyTable() {
    const tableBody = document.querySelector('.destination__table tbody');
    if (!tableBody) return;
    
    // Check if there are any actual data rows (not empty message rows)
    const dataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    
    if (dataRows.length === 0) {
        // Show empty message
        tableBody.innerHTML = '<tr data-empty><td colspan="8" class="destination__table-empty">Chưa có tài khoản nào.</td></tr>';
    } else {
        // Remove empty message if it exists
        const emptyRow = tableBody.querySelector('[data-empty]');
        if (emptyRow) {
            emptyRow.remove();
        }
    }
}

function setupSingleDeleteHandler(form) {
    if (!form) return;
    
    const userName = form.getAttribute('data-user-name') || 'Unknown';
    const row = form.closest('tr');
    
    console.log(`Setting up delete handler for user: ${userName}`);
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log(`Delete clicked for user: ${userName}`);
        showDeleteModal(userName, form, row);
    });
}
