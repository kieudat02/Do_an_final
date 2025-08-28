// Select2 Configuration for Add Forms
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
        // Initialize Select2 for add forms
        $('.select2').each(function() {
            const $element = $(this);
            
            // Skip if already initialized
            if ($element.hasClass('select2-hidden-accessible')) {
                return;
            }

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

            // Special handling for different select types
            if ($element.attr('name') === 'parent') {
                // For parent selection (like category parent)
                config.placeholder = '-- Chọn danh mục cha (tùy chọn) --';
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

            $element.select2(config);

            // Add validation styling on change
            $element.on('select2:select', function() {
                $(this).removeClass('is-invalid').addClass('is-valid');
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

        // Form submission enhancements
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
            submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...');
            
            // Re-enable button after 5 seconds as fallback
            setTimeout(() => {
                submitBtn.prop('disabled', false).html(originalText);
            }, 5000);
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

    } catch (error) {
        // Error initializing Select2 for add form
    }
});

// Function to initialize Select2 for new elements
function initializeNewSelect2($element) {
    try {
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
    } catch (error) {
        console.error('Error initializing new Select2 element:', error);
    }
}

// Global function to reset form
window.resetSelect2Form = function() {
    $('.select2').each(function() {
        $(this).val(null).trigger('change').removeClass('is-valid is-invalid');
    });
};