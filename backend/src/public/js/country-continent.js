// Hàm load quốc gia theo châu lục
async function loadCountriesByContinent(continent) {
    const countrySelect = document.getElementById('country');
    
    // Reset quốc gia
    countrySelect.innerHTML = '<option value="">-- Chọn quốc gia --</option>';
    
    if (!continent) {
        return;
    }
    
    try {
        const url = `/api/public/destinations/countries-by-continent?continent=${encodeURIComponent(continent)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.countries) {
            // Thêm các quốc gia vào select
            data.countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                countrySelect.appendChild(option);
            });
            
            // Nếu đang edit và có country được chọn trước đó, giữ lại selection
            const selectedCountry = countrySelect.dataset.selected || countrySelect.dataset.selectedCountry;
            if (selectedCountry) {
                countrySelect.value = selectedCountry;
                // Xóa data attributes sau khi sử dụng
                delete countrySelect.dataset.selected;
                delete countrySelect.dataset.selectedCountry;
            }
        }
    } catch (error) {
        console.error('Lỗi khi tải danh sách quốc gia:', error);
    }
}

// Khởi tạo khi DOM load xong
document.addEventListener('DOMContentLoaded', function() {
    const continentSelect = document.getElementById('continent');
    const countrySelect = document.getElementById('country');
    
    // Nếu đang edit và có sẵn continent và country
    if (continentSelect && continentSelect.value && countrySelect) {
        // Lưu country đã chọn vào data attribute nếu chưa có
        const selectedCountry = countrySelect.value || countrySelect.dataset.selected;
        if (selectedCountry) {
            countrySelect.dataset.selectedCountry = selectedCountry;
        }
        // Load lại quốc gia cho continent đã chọn
        loadCountriesByContinent(continentSelect.value);
    }
});
