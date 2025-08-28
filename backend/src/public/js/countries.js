// File xử lý quốc gia theo châu lục

// Hàm load quốc gia theo châu lục từ API
function loadCountriesByContinent(continentValue) {
    const countrySelect = document.getElementById('country');
    
    // Xóa tất cả options hiện tại trừ option đầu tiên
    countrySelect.innerHTML = '<option value="">-- Chọn quốc gia --</option>';
    
    if (continentValue) {
        // Gọi API để lấy danh sách quốc gia
        fetch(`/destination/api/countries/${encodeURIComponent(continentValue)}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data) {
                    data.data.forEach(country => {
                        const option = document.createElement('option');
                        option.value = country;
                        option.textContent = country;
                        countrySelect.appendChild(option);
                    });
                }
            })
            .catch(error => {
                console.error('Error loading countries:', error);
            });
    }
}

// Tự động load quốc gia khi trang được tải (cho form edit)
document.addEventListener('DOMContentLoaded', function() {
    const continentSelect = document.getElementById('continent');
    if (continentSelect && continentSelect.value) {
        loadCountriesByContinent(continentSelect.value);
        
        // Sau khi load xong, set lại giá trị đã chọn của country
        setTimeout(() => {
            const countrySelect = document.getElementById('country');
            const selectedCountry = countrySelect.getAttribute('data-selected');
            if (selectedCountry) {
                countrySelect.value = selectedCountry;
            }
        }, 500); // Tăng timeout để đảm bảo API call hoàn thành
    }
});
