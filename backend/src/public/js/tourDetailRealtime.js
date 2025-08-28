// Real-time Updates for Tour Detail Page
class TourDetailRealtime {
    constructor(tourId) {
        this.tourId = tourId;
        this.isPolling = false;
        this.pollingInterval = null;
        this.lastUpdate = Date.now();
        
        this.init();
    }
    
    init() {
        // Bắt đầu polling để kiểm tra cập nhật
        this.startPolling();
        
        // Lắng nghe sự kiện khi người dùng rời khỏi trang
        window.addEventListener('beforeunload', () => {
            this.stopPolling();
        });
        
        // Lắng nghe sự kiện khi tab được focus/blur
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.startPolling();
            } else {
                this.stopPolling();
            }
        });
    }
    
    startPolling() {
        if (this.isPolling) return;
        
        this.isPolling = true;
        this.pollingInterval = setInterval(() => {
            this.checkForUpdates();
        }, 30000); // Kiểm tra mỗi 30 giây
    }
    
    stopPolling() {
        if (!this.isPolling) return;
        
        this.isPolling = false;
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
    
    async checkForUpdates() {
        try {
            const response = await fetch(`/api/v1/tour/${this.tourId}/details`);
            const data = await response.json();
            
            if (data.success) {
                // Kiểm tra xem có thay đổi nào không
                const currentDetails = this.getCurrentTableData();
                const newDetails = data.data;
                
                if (this.hasDataChanged(currentDetails, newDetails)) {
                    this.showUpdateNotification();
                }
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }
    
    getCurrentTableData() {
        const rows = document.querySelectorAll('#tourDetailTableBody tr');
        return Array.from(rows).map(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 9) return null;
            
            return {
                id: row.id.replace('tourDetail_', ''),
                adultPrice: this.extractPrice(cells[1].textContent),
                childrenPrice: this.extractPrice(cells[2].textContent),
                childPrice: this.extractPrice(cells[3].textContent),
                babyPrice: this.extractPrice(cells[4].textContent),
                singleRoomSupplementPrice: this.extractPrice(cells[5].textContent),
                stock: parseInt(cells[6].textContent),
                dayStart: cells[7].textContent,
                dayReturn: cells[8].textContent
            };
        }).filter(item => item !== null);
    }
    
    extractPrice(priceText) {
        return parseInt(priceText.replace(/[^\d]/g, '')) || 0;
    }
    
    hasDataChanged(currentData, newData) {
        if (currentData.length !== newData.length) {
            return true;
        }
        
        // Kiểm tra từng item
        for (let i = 0; i < currentData.length; i++) {
            const current = currentData[i];
            const newItem = newData.find(item => item._id === current.id);
            
            if (!newItem) return true;
            
            // So sánh các trường quan trọng
            if (
                current.adultPrice !== newItem.adultPrice ||
                current.stock !== newItem.stock ||
                new Date(current.dayStart).getTime() !== new Date(newItem.dayStart).getTime() ||
                new Date(current.dayReturn).getTime() !== new Date(newItem.dayReturn).getTime()
            ) {
                return true;
            }
        }
        
        return false;
    }
    
    showUpdateNotification() {
        // Tạo notification cho người dùng
        const notification = document.createElement('div');
        notification.className = 'alert alert-info alert-dismissible fade show position-fixed tour-detail-alert';
        notification.style.cssText = 'top: 80px; right: 20px; z-index: 9999; min-width: 350px;';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-info-circle me-2"></i>
                <div class="flex-grow-1">
                    <strong>Cập nhật mới!</strong><br>
                    Chi tiết tour đã được cập nhật. 
                </div>
                <button type="button" class="btn btn-sm btn-outline-primary ms-2" onclick="location.reload()">
                    Tải lại
                </button>
                <button type="button" class="btn-close ms-2" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Tự động ẩn sau 10 giây
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
        
        console.log('Chi tiết tour đã được cập nhật');
    }
}

// Khởi tạo real-time updates khi DOM ready
document.addEventListener('DOMContentLoaded', function() {
    const tourIdElement = document.getElementById('tourId');
    if (tourIdElement) {
        const tourId = tourIdElement.value;
        if (tourId) {
            window.tourDetailRealtime = new TourDetailRealtime(tourId);
        }
    }
});

// Export cho global access
window.TourDetailRealtime = TourDetailRealtime;
