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

// Role Management JavaScript
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM loaded, setting up role handlers...");

    // Setup delete handlers
    setupDeleteHandlers();
    
    // Setup edit form handler
    setupEditFormHandler();
    
    // Setup add form handler
    setupAddFormHandler();
});

function setupDeleteHandlers() {
    const deleteButtons = document.querySelectorAll(".category__form--delete");
    console.log("Found delete forms:", deleteButtons.length);

    deleteButtons.forEach((form, index) => {
        console.log(`Setting up handler for form ${index + 1}`);
        setupSingleDeleteHandler(form);
    });
}

// Show delete confirmation modal
function showDeleteModal(roleName, form, row) {
    // Set role name in modal
    document.getElementById('roleNameToDelete').textContent = roleName;
    
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
        console.log('Confirmed delete for role:', roleName);

        // Hide modal
        deleteModal.hide();

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;
        }

        // Add loading class to row
        if (row) {
            row.classList.add("category-row--deleting");
        }

        // Get current URL parameters for pagination calculation
        const urlParams = new URLSearchParams(window.location.search);
        const queryString = urlParams.toString();

        // Submit via AJAX to show toast notification
        fetch(`${form.action}?${queryString}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success toast
                showToastNotification(data.message, 'success');

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
                throw new Error(data.message || 'Xóa vai trò thất bại');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToastNotification('Có lỗi xảy ra khi xóa vai trò', 'error');

            // Remove loading class
            if (row) {
                row.classList.remove("category-row--deleting");
            }

            // Reset button state
            if (submitBtn) {
                submitBtn.innerHTML = 'Xóa';
                submitBtn.disabled = false;
            }
        });
    });
}

// Setup edit form handler
function setupEditFormHandler() {
    const editForm = document.querySelector('form[action*="/roles/edit/"]');
    if (!editForm) return;

    editForm.addEventListener('submit', function(e) {
        console.log('Edit form submitted');
        // Form validation can be added here if needed
    });
}

// Setup add form handler
function setupAddFormHandler() {
    const addForm = document.querySelector('form[action="/roles/add"]');
    if (!addForm) return;

    addForm.addEventListener('submit', function(e) {
        console.log('Add form submitted');
        // Form validation can be added here if needed
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
        const sttCell = row.querySelector('td:first-child');
        if (sttCell) {
            sttCell.textContent = index + 1;
        }
    });
}

function handleEmptyTable() {
    const tableBody = document.querySelector('.category__table tbody');
    if (!tableBody) return;
    
    // Check if there are any actual data rows (not empty message rows)
    const dataRows = tableBody.querySelectorAll('tr:not([data-empty])');
    
    if (dataRows.length === 0) {
        // Show empty message
        tableBody.innerHTML = '<tr data-empty><td colspan="6" class="category__table-empty">Chưa có vai trò nào.</td></tr>';
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
    
    const roleName = form.getAttribute('data-role-name') || 'Unknown';
    const row = form.closest('tr');
    
    console.log(`Setting up delete handler for role: ${roleName}`);
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log(`Delete clicked for role: ${roleName}`);
        showDeleteModal(roleName, form, row);
    });
}
