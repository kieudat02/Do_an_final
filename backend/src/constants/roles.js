const ROLES = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    VIEWER: 'Viewer'
};

// Định nghĩa quyền hạn cho từng vai trò
const PERMISSIONS = {
    [ROLES.SUPER_ADMIN]: {
        // Toàn quyền trên tất cả
        roles: ['read', 'create', 'update', 'delete'],
        accounts: ['read', 'create', 'update', 'delete'],
        tours: ['read', 'create', 'update', 'delete'],
        categories: ['read', 'create', 'update', 'delete'],
        departures: ['read', 'create', 'update', 'delete'],
        destinations: ['read', 'create', 'update', 'delete'],
        transportation: ['read', 'create', 'update', 'delete'],
        orders: ['read', 'create', 'update', 'delete'],
        payments: ['read', 'create', 'update', 'delete']
    },
    [ROLES.ADMIN]: {
        // CRUD nội dung, chỉ xem vai trò
        roles: ['read'],
        accounts: ['read', 'create', 'update', 'delete'], // trừ Super Admin
        tours: ['read', 'create', 'update', 'delete'],
        categories: ['read', 'create', 'update', 'delete'],
        departures: ['read', 'create', 'update', 'delete'],
        destinations: ['read', 'create', 'update', 'delete'],
        transportation: ['read', 'create', 'update', 'delete'],
        orders: ['read', 'create', 'update', 'delete'],
        payments: ['read', 'create', 'update', 'delete']
    },
    [ROLES.MANAGER]: {
        // CRUD tour, đơn hàng, chỉ xem còn lại
        roles: ['read'],
        accounts: ['read'],
        tours: ['read', 'create', 'update', 'delete'],
        categories: ['read'],
        departures: ['read'],
        destinations: ['read'],
        transportation: ['read'],
        orders: ['read', 'create', 'update', 'delete'],
        payments: ['read']
    },
    [ROLES.VIEWER]: {
        // Chỉ xem tất cả
        roles: ['read'],
        accounts: ['read'],
        tours: ['read'],
        categories: ['read'],
        departures: ['read'],
        destinations: ['read'],
        transportation: ['read'],
        orders: ['read'],
        payments: ['read']
    }
};

// Hàm kiểm tra quyền
const hasPermission = (userRole, module, action) => {
    if (!userRole || !PERMISSIONS[userRole] || !PERMISSIONS[userRole][module]) {
        return false;
    }
    return PERMISSIONS[userRole][module].includes(action);
};

// Hàm kiểm tra có thể thao tác với vai trò khác
const canManageRole = (currentRole, targetRole) => {
    const roleHierarchy = [ROLES.VIEWER, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN];
    const currentLevel = roleHierarchy.indexOf(currentRole);
    const targetLevel = roleHierarchy.indexOf(targetRole);
    
    // Điều kiện đặc biệt: Super Admin không thể bị quản lý bởi ai khác
    if (targetRole === ROLES.SUPER_ADMIN && currentRole !== ROLES.SUPER_ADMIN) {
        return false;
    }
    
    // Chỉ có thể quản lý vai trò thấp hơn hoặc bằng level của mình
    return currentLevel >= targetLevel;
};

module.exports = {
    ...ROLES,
    PERMISSIONS,
    hasPermission,
    canManageRole
};