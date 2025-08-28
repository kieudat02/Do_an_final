// Select2 Configuration for Edit Forms
$(document).ready(function() {
    // Check if jQuery and Select2 are available
    if (typeof jQuery === 'undefined') {
        console.error('jQuery is not loaded!');
        return;
    }
    
    if (typeof jQuery.fn.select2 === 'undefined') {
        console.error('Select2 is not loaded!');
        return;
    }

    try {
        console.log('selectEdit.js: Starting initialization');
        
        // Dirty form detection - Define the function first
        function markFormAsDirty() {
            window.formIsDirty = true;
            console.log('markFormAsDirty called - form marked as dirty');
            // Add visual indicator that form has changes
            const form = $('form');
            if (form.length) {
                form.addClass('form-dirty');
                // Optional: Show unsaved changes warning
                if (!form.data('dirty-warning-added')) {
                    form.data('dirty-warning-added', true);
                    // Note: Removed automatic btn-warning class addition to maintain original button style
                }
            }
        }

        // Make markFormAsDirty available globally for this script
        window.markFormAsDirty = markFormAsDirty;
        window.formIsDirty = false;
        
        console.log('selectEdit.js: markFormAsDirty function defined and assigned to window');
        console.log('markFormAsDirty type:', typeof window.markFormAsDirty);

        // Initialize Select2 for edit forms
        $('.select2').each(function() {
            const $element = $(this);
            
            // Skip if already initialized
            if ($element.hasClass('select2-hidden-accessible')) {
                return;
            }

            // Get selected value from HTML (option with selected attribute)
            let selectedValue = $element.val();
            
            // If no value found, try to find selected option
            if (!selectedValue || selectedValue === '') {
                const selectedOption = $element.find('option[selected]');
                if (selectedOption.length > 0) {
                    selectedValue = selectedOption.val();
                }
            }

            // Store original value for reset functionality BEFORE initialization
            $element.data('original-value', selectedValue);

            const config = {
                placeholder: 'Chọn một tùy chọn...',
                allowClear: false,
                width: '100%',
                dropdownAutoWidth: false,
                language: {
                    noResults: function() {
                        return "Không tìm thấy kết quả";
                    },
                    searching: function() {
                        return "Đang tìm kiếm...";
                    },
                    loadingMore: function() {
                        return "Đang tải thêm...";
                    }
                }
            };

            // Special handling for different select types in edit mode
            if ($element.attr('name') === 'parent') {
                // For parent selection (like category parent)
                config.placeholder = '-- Chọn danh mục -- cha (tùy chọn)';
                config.allowClear = true; // Allow clear for optional parent selection
            } else if ($element.attr('name') === 'status') {
                // For status selection
                config.placeholder = '-- Chọn trạng thái --';
            } else if ($element.attr('name') === 'category') {
                // For category selection
                config.placeholder = '-- Chọn danh mục --';
            } else if ($element.attr('name') === 'departure') {
                // For departure selection
                config.placeholder = '-- Chọn điểm khởi hành --';
            } else if ($element.attr('name') === 'destination') {
                // For destination selection
                config.placeholder = '-- Chọn điểm đến --';
            } else if ($element.attr('name') === 'transportation') {
                // For transportation selection
                config.placeholder = '-- Chọn phương tiện --';
            } else if ($element.attr('name') === 'role') {
                // For role selection
                config.placeholder = '-- Chọn vai trò --';
            }

            // Set the value BEFORE initializing Select2
            if (selectedValue && selectedValue !== '') {
                $element.val(selectedValue);
            }

            // Initialize Select2
            $element.select2(config);

            // Double-check and ensure the selected value is preserved after Select2 initialization
            setTimeout(() => {
                if (selectedValue && selectedValue !== '' && $element.val() !== selectedValue) {
                    $element.val(selectedValue).trigger('change.select2');
                }
            }, 50);

            // Track changes for dirty form detection
            $element.on('select2:select', function() {
                console.log('select2:select triggered, calling markFormAsDirty');
                $(this).removeClass('is-invalid').addClass('is-valid');
                
                // Check if function exists before calling
                if (typeof markFormAsDirty === 'function') {
                    markFormAsDirty();
                } else if (typeof window.markFormAsDirty === 'function') {
                    window.markFormAsDirty();
                } else {
                    console.error('markFormAsDirty function not found');
                }
                
                // Remove any existing error messages
                $(this).closest('.form-group, .mb-3, .mb-4').find('.invalid-feedback').hide();
            });

            // Handle form validation
            $element.on('select2:close', function() {
                if ($(this).prop('required') && !$(this).val()) {
                    $(this).addClass('is-invalid');
                } else {
                    $(this).removeClass('is-invalid');
                }
            });
        });

        // Form submission enhancements for edit
        $('form').on('submit', function(e) {
            let hasErrors = false;
            
            // Validate all required select2 elements
            $(this).find('.select2[required]').each(function() {
                if (!$(this).val()) {
                    $(this).addClass('is-invalid');
                    hasErrors = true;
                }
            });

            if (hasErrors) {
                e.preventDefault();
                // Show first error
                const firstError = $(this).find('.select2.is-invalid').first();
                if (firstError.length) {
                    firstError.select2('open');
                    // Scroll to first error
                    $('html, body').animate({
                        scrollTop: firstError.offset().top - 100
                    }, 500);
                }
                return false;
            }

            // Add loading state to submit button
            const submitBtn = $(this).find('button[type="submit"]');
            const originalText = submitBtn.html();
            submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Đang cập nhật...');
            
            // Re-enable button after 5 seconds as fallback
            setTimeout(() => {
                submitBtn.prop('disabled', false).html(originalText);
            }, 5000);
        });

        // Warn user before leaving if form is dirty
        $(window).on('beforeunload', function(e) {
            if (formIsDirty) {
                const message = 'Bạn có thay đổi chưa được lưu. Bạn có chắc muốn rời khỏi trang?';
                e.returnValue = message;
                return message;
            }
        });

        // Reset dirty flag on successful submission
        $('form').on('submit', function() {
            formIsDirty = false;
            window.formIsDirty = false;
        });

        // Track changes in regular inputs and textareas
        $('input, textarea').each(function() {
            const $element = $(this);
            // Store original value for comparison
            $element.data('original-value', $element.val());
        });

        // Monitor changes in inputs and textareas
        $(document).on('input change', 'input, textarea', function() {
            const $element = $(this);
            const originalValue = $element.data('original-value') || '';
            const currentValue = $element.val();
            
            if (originalValue !== currentValue) {
                // Check if function exists before calling
                if (typeof markFormAsDirty === 'function') {
                    markFormAsDirty();
                } else if (typeof window.markFormAsDirty === 'function') {
                    window.markFormAsDirty();
                } else {
                    console.error('markFormAsDirty function not found in input change handler');
                }
            } else {
                // Check if any other fields have changes
                if (typeof window.checkFormChanges === 'function') {
                    window.checkFormChanges();
                }
            }
        });

        // Track file input changes
        $(document).on('change', 'input[type="file"]', function() {
            if (this.files && this.files.length > 0) {
                // Check if function exists before calling
                if (typeof markFormAsDirty === 'function') {
                    markFormAsDirty();
                } else if (typeof window.markFormAsDirty === 'function') {
                    window.markFormAsDirty();
                } else {
                    console.error('markFormAsDirty function not found in file input handler');
                }
            }
        });

        // Dynamic select2 initialization for dynamically added elements using MutationObserver
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const $newElement = $(node);
                                // Check if the added element itself is a select2 element
                                if ($newElement.hasClass('select2') && !$newElement.hasClass('select2-hidden-accessible')) {
                                    setTimeout(() => {
                                        initializeNewSelect2($newElement);
                                    }, 100);
                                }
                                // Check for select2 elements within the added element
                                $newElement.find('.select2').each(function() {
                                    const $select = $(this);
                                    if (!$select.hasClass('select2-hidden-accessible')) {
                                        setTimeout(() => {
                                            initializeNewSelect2($select);
                                        }, 100);
                                    }
                                });
                            }
                        });
                    }
                });
            });
            
            // Start observing
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
        } else {
            // Fallback for browsers that don't support MutationObserver
        }

        // Ensure all select2 elements have correct values after DOM is ready
        setTimeout(() => {
            $('.select2').each(function() {
                const $element = $(this);
                let originalValue = $element.data('original-value');
                
                // If no stored value, try to get from selected option
                if (!originalValue || originalValue === '') {
                    const selectedOption = $element.find('option[selected]');
                    if (selectedOption.length > 0) {
                        originalValue = selectedOption.val();
                        $element.data('original-value', originalValue);
                    }
                }
                
                // Force update if value doesn't match
                if (originalValue && originalValue !== '' && $element.val() !== originalValue) {
                    $element.val(originalValue).trigger('change.select2');
                }
            });
        }, 200); // Increased timeout to ensure DOM is fully loaded

        // Additional check for Select2 proper initialization after longer delay
        setTimeout(() => {
            forceUpdateSelect2Values();
        }, 500);

    } catch (error) {
        // Fallback: ensure markFormAsDirty function exists even if initialization fails
        if (typeof window.markFormAsDirty !== 'function') {
            window.markFormAsDirty = function() {
                window.formIsDirty = true;
            };
        }
    }
});

// Ensure markFormAsDirty is always available as a fallback
if (typeof window.markFormAsDirty !== 'function') {
    window.markFormAsDirty = function() {
        window.formIsDirty = true;
    };
}

// Additional initialization when window is fully loaded
$(window).on('load', function() {
    setTimeout(() => {
        forceUpdateSelect2Values();
    }, 300);
});

// Function to initialize Select2 for new elements
function initializeNewSelect2($element) {
    try {
        // Store original value BEFORE initialization
        const originalValue = $element.val();
        $element.data('original-value', originalValue);
        
        $element.select2({
            placeholder: 'Chọn một tùy chọn...',
            allowClear: false,
            width: '100%',
            dropdownAutoWidth: false,
            language: {
                noResults: function() {
                    return "Không tìm thấy kết quả";
                },
                searching: function() {
                    return "Đang tìm kiếm...";
                }
            }
        });

        // Preserve selected value after initialization
        if (originalValue && originalValue !== '') {
            $element.val(originalValue).trigger('change.select2');
        }

        // Add change tracking
        $element.on('select2:select', function() {
            window.markFormAsDirty();
        });
    } catch (error) {
        // Error initializing new Select2 element
    }
}

// Global function to reset form to original values
window.resetSelect2Form = function() {
    $('.select2').each(function() {
        const originalValue = $(this).data('original-value');
        $(this).val(originalValue).trigger('change').removeClass('is-valid is-invalid');
    });
    // Remove dirty indicator
    $('.dirty-indicator').remove();
    window.formIsDirty = false;
};

// Global function to check if form has changes
window.hasFormChanges = function() {
    return window.formIsDirty || false;
};

// Global function to refresh Select2 selected values
window.refreshSelect2Values = function() {
    $('.select2').each(function() {
        const $element = $(this);
        const currentValue = $element.val();
        if (currentValue && currentValue !== '') {
            // Re-trigger change to ensure UI is updated
            $element.trigger('change.select2');
        }
    });
};

// Functions for dirty form management
window.resetFormDirtyState = function() {
    window.formIsDirty = false;
    const form = $('form');
    if (form.length) {
        form.removeClass('form-dirty');
        form.removeData('dirty-warning-added');
        // Note: Removed automatic button class manipulation to maintain original styling
    }
};

window.checkFormChanges = function() {
    let hasChanges = false;
    $('.select2').each(function() {
        const $element = $(this);
        const originalValue = $element.data('original-value');
        const currentValue = $element.val();
        if (originalValue !== currentValue) {
            hasChanges = true;
            return false; // Break the loop
        }
    });
    
    // Check regular inputs
    $('input, textarea').each(function() {
        const $element = $(this);
        const originalValue = $element.data('original-value') || $element.attr('data-original-value');
        const currentValue = $element.val();
        if (originalValue !== currentValue) {
            hasChanges = true;
            return false; // Break the loop
        }
    });
    
    if (hasChanges && !window.formIsDirty) {
        window.markFormAsDirty();
    } else if (!hasChanges && window.formIsDirty) {
        window.resetFormDirtyState();
    }
    
    return hasChanges;
};

// Global function to force update all Select2 selections
window.updateSelect2Selections = function() {
    $('.select2').each(function() {
        const $element = $(this);
        
        // Check for selected option in HTML
        const selectedOption = $element.find('option[selected]');
        let valueToSelect = null;
        
        if (selectedOption.length && selectedOption.val() !== '') {
            valueToSelect = selectedOption.val();
        } else if ($element.val() && $element.val() !== '') {
            valueToSelect = $element.val();
        }
        
        if (valueToSelect) {
            // Force update the Select2 display
            $element.val(valueToSelect).trigger('change.select2');
        }
    });
};

// Function to initialize a new Select2 element dynamically
function initializeNewSelect2($element) {
    console.log('Initializing new Select2 element:', $element);
    
    // Skip if already initialized
    if ($element.hasClass('select2-hidden-accessible')) {
        return;
    }

    // Get selected value from HTML (option with selected attribute)
    let selectedValue = $element.val();
    
    // If no value found, try to find selected option
    if (!selectedValue || selectedValue === '') {
        const selectedOption = $element.find('option[selected]');
        if (selectedOption.length > 0) {
            selectedValue = selectedOption.val();
        }
    }

    // Store original value for reset functionality BEFORE initialization
    $element.data('original-value', selectedValue);

    const config = {
        placeholder: 'Chọn một tùy chọn...',
        allowClear: false,
        width: '100%',
        dropdownAutoWidth: false,
        language: {
            noResults: function() {
                return "Không tìm thấy kết quả";
            },
            searching: function() {
                return "Đang tìm kiếm...";
            },
            loadingMore: function() {
                return "Đang tải thêm...";
            }
        }
    };

    try {
        $element.select2(config);
        
        // Set the selected value after initialization
        if (selectedValue && selectedValue !== '') {
            setTimeout(() => {
                if ($element.val() !== selectedValue) {
                    $element.val(selectedValue).trigger('change.select2');
                }
            }, 50);
        }

        // Track changes for dirty form detection
        $element.on('select2:select', function() {
            console.log('select2:select triggered on dynamic element');
            $(this).removeClass('is-invalid').addClass('is-valid');
            
            // Check if function exists before calling
            if (typeof markFormAsDirty === 'function') {
                markFormAsDirty();
            } else if (typeof window.markFormAsDirty === 'function') {
                window.markFormAsDirty();
            } else {
                console.error('markFormAsDirty function not found for dynamic element');
            }
        });

        // Handle form validation
        $element.on('select2:close', function() {
            if ($(this).prop('required') && !$(this).val()) {
                $(this).addClass('is-invalid');
            } else {
                $(this).removeClass('is-invalid');
            }
        });
        
        console.log('New Select2 element initialized successfully');
        
    } catch (error) {
        console.error('Error initializing new Select2 element:', error);
    }
}



// Function to force update Select2 values (internal use)
function forceUpdateSelect2Values() {
    $('.select2').each(function() {
        const $element = $(this);
        
        // Multiple ways to find the correct selected value
        let valueToSelect = null;
        
        // 1. Check for option with selected attribute
        const selectedOption = $element.find('option[selected]');
        if (selectedOption.length && selectedOption.val() !== '') {
            valueToSelect = selectedOption.val();
        }
        
        // 2. Check stored original value
        if (!valueToSelect) {
            const originalValue = $element.data('original-value');
            if (originalValue && originalValue !== '') {
                valueToSelect = originalValue;
            }
        }
        
        // 3. Check current value
        if (!valueToSelect) {
            const currentValue = $element.val();
            if (currentValue && currentValue !== '') {
                valueToSelect = currentValue;
            }
        }
        
        // Apply the value if found
        if (valueToSelect && $element.val() !== valueToSelect) {
            $element.val(valueToSelect).trigger('change.select2');
            
            // Update original value if not set
            if (!$element.data('original-value')) {
                $element.data('original-value', valueToSelect);
            }
        }
    });
}
