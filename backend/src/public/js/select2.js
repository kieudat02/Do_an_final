// Select2 Global Configuration and Initialization
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
        // Initialize Select2 for all elements with select2 class
        $('.select2').each(function(index, element) {
            const $element = $(element);
            const hasAutoSubmit = $element.closest('form').length > 0 && !$element.data('no-auto-submit');
            
            $element.select2({
                placeholder: $element.find('option:first').text() || 'Chọn một tùy chọn...',
                allowClear: false, // Disable clear button
                width: '100%',
                dropdownAutoWidth: false, // Use element width instead of auto
                language: {
                    noResults: function() {
                        return "Không tìm thấy kết quả";
                    },
                    searching: function() {
                        return "Đang tìm kiếm...";
                    },
                    loadingMore: function() {
                        return "Đang tải thêm...";
                    },
                    inputTooShort: function(args) {
                        return "Vui lòng nhập ít nhất " + args.minimum + " ký tự";
                    },
                    inputTooLong: function(args) {
                        return "Vui lòng xóa bớt " + (args.input.length - args.maximum) + " ký tự";
                    }
                }
            });

            // Auto-submit functionality for filter forms (remove clear event since we disabled clear)
            if (hasAutoSubmit) {
                $element.on('select2:select', function (e) {
                    setTimeout(() => {
                        if (this.form) {
                            this.form.submit();
                        }
                    }, 100);
                });
            }
        });

        // Reinitialize Select2 when new elements are added dynamically using MutationObserver
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const $newElement = $(node);
                                // Check if the added element itself is a select2 element
                                if ($newElement.hasClass('select2') && !$newElement.hasClass('select2-hidden-accessible')) {
                                    initializeSelect2($newElement);
                                }
                                // Check for select2 elements within the added element
                                $newElement.find('.select2').each(function() {
                                    const $select = $(this);
                                    if (!$select.hasClass('select2-hidden-accessible')) {
                                        initializeSelect2($select);
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
        // Error initializing Select2
    }
});

// Function to initialize Select2 for a specific element
function initializeSelect2($element) {
    try {
        if ($element.hasClass('select2-hidden-accessible')) {
            return; // Already initialized
        }

        const hasAutoSubmit = $element.closest('form').length > 0 && !$element.data('no-auto-submit');
        
        $element.select2({
            placeholder: $element.find('option:first').text() || 'Chọn một tùy chọn...',
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
        });

        if (hasAutoSubmit) {
            $element.on('select2:select', function (e) {
                setTimeout(() => {
                    if (this.form) {
                        this.form.submit();
                    }
                }, 100);
            });
        }
    } catch (error) {
        console.error('Error initializing Select2 for element:', error);
    }
}

// Global function to reinitialize all Select2 elements
window.reinitializeSelect2 = function() {
    $('.select2').each(function() {
        const $element = $(this);
        if ($element.hasClass('select2-hidden-accessible')) {
            $element.select2('destroy');
        }
        initializeSelect2($element);
    });
};

// Global function to add new Select2 element
window.addSelect2 = function(selector) {
    $(selector).addClass('select2');
    initializeSelect2($(selector));
};