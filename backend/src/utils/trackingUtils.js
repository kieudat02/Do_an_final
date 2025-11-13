// Lấy thông tin theo dõi cho việc tạo mới
function getCreateTrackingInfo(req) {
    const userName = req.session?.user?.fullName || 'System';
    return {
        createdBy: userName,
        updatedBy: userName
    };
}

// Lấy thông tin theo dõi cho việc cập nhật
function getUpdateTrackingInfo(req) {
    const userName = req.session?.user?.fullName || 'System';
    return {
        updatedBy: userName
    };
}

// Thêm trường theo dõi cho dữ liệu tạo mới
function addCreateTracking(data, req) {
    const trackingInfo = getCreateTrackingInfo(req);
    return {
        ...data,
        ...trackingInfo
    };
}

// Thêm trường theo dõi cho dữ liệu cập nhật
function addUpdateTracking(data, req) {
    const trackingInfo = getUpdateTrackingInfo(req);
    return {
        ...data,
        ...trackingInfo
    };
}

// Middleware tự động thêm thông tin theo dõi vào request body
function trackingMiddleware(operation = 'create') {
    return (req, res, next) => {
        if (operation === 'create') {
            const trackingInfo = getCreateTrackingInfo(req);
            req.body = { ...req.body, ...trackingInfo };
        } else if (operation === 'update') {
            const trackingInfo = getUpdateTrackingInfo(req);
            req.body = { ...req.body, ...trackingInfo };
        }
        next();
    };
}

module.exports = {
    getCreateTrackingInfo,
    getUpdateTrackingInfo,
    addCreateTracking,
    addUpdateTracking,
    trackingMiddleware
};
