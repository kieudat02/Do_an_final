const mongoose = require('mongoose');

const mergeFilters = (homeSectionFilter = {}, queryParams = {}) => {
    const baseQuery = {
        deleted: false,
        status: true
    };

    // Các fields có thể override từ query parameters
    const overridableFields = [
        'departure', 'destination', 'category', 'highlight',
        'transportation', 'search'
    ];

    // Merge HomeSectionFilter trước
    Object.keys(homeSectionFilter).forEach(key => {
        const value = homeSectionFilter[key];

        switch (key) {
            case 'minPrice':
            case 'maxPrice':
                if (!baseQuery.price) baseQuery.price = {};
                if (key === 'minPrice') baseQuery.price.$gte = value;
                if (key === 'maxPrice') baseQuery.price.$lte = value;
                break;

            case 'tag':
            case 'tags':
                // Xử lý tag/tags đặc biệt
                if (Array.isArray(value)) {
                    baseQuery.tags = { $in: value };
                } else {
                    baseQuery.tags = value;
                }
                break;

            case 'keywords':
                // Xử lý keywords search trong title
                if (Array.isArray(value) && value.length > 0) {
                    const keywordRegex = value.map(keyword => ({
                        title: { $regex: keyword, $options: "i" }
                    }));
                    baseQuery.$or = keywordRegex;
                }
                break;

            case 'priceRange':
                // Xử lý price range categories
                if (!baseQuery.price) baseQuery.price = {};
                switch (value) {
                    case 'budget':
                        baseQuery.price.$lte = 5000000;
                        break;
                    case 'mid':
                        baseQuery.price.$gte = 5000000;
                        baseQuery.price.$lte = 10000000;
                        break;
                    case 'luxury':
                        baseQuery.price.$gte = 10000000;
                        break;
                }
                break;

            case 'highlight':
                baseQuery.highlight = value === true || value === 'true';
                break;

            case 'status':
                baseQuery.status = value === true || value === 'true';
                break;

            case 'country':
            case 'domestic':
            case 'scope':
            case 'region':
                break;

            default:
                // Xử lý các field khác
                if (Array.isArray(value)) {
                    baseQuery[key] = { $in: value };
                } else {
                    baseQuery[key] = value;
                }
                break;
        }
    });

    // Override với query parameters
    Object.keys(queryParams).forEach(key => {
        const value = queryParams[key];
        if (!value || value === '') return;

        switch (key) {
            case 'search':
                baseQuery.$or = [
                    { title: { $regex: value, $options: "i" } },
                    { description: { $regex: value, $options: "i" } },
                    { code: { $regex: value, $options: "i" } },
                ];
                break;

            case 'minPrice':
            case 'maxPrice':
                if (!baseQuery.price) baseQuery.price = {};
                const priceValue = parseInt(value);
                if (!isNaN(priceValue)) {
                    if (key === 'minPrice') baseQuery.price.$gte = priceValue;
                    if (key === 'maxPrice') baseQuery.price.$lte = priceValue;
                }
                break;

            case 'highlight':
                baseQuery.highlight = value === 'true';
                break;

            default:
                if (overridableFields.includes(key)) {
                    baseQuery[key] = value;
                }
                break;
        }
    });

    return baseQuery;
};

const mergeCategoriesFilter = (homeSectionCategories = [], searchQuery = {}) => {
    if (homeSectionCategories.length > 0) {
        const categoryIds = homeSectionCategories.map(cat => cat._id);
        
        if (searchQuery.category) {
            // Nếu đã có filter category, merge với categories của HomeSection
            if (searchQuery.category.$in) {
                searchQuery.category.$in = [...new Set([...searchQuery.category.$in, ...categoryIds])];
            } else {
                searchQuery.category = { $in: [searchQuery.category, ...categoryIds] };
            }
        } else {
            searchQuery.category = { $in: categoryIds };
        }
    }
    
    return searchQuery;
};

const convertToObjectIds = (query) => {
    const converted = { ...query };
    
    const objectIdFields = ['category', 'departure', 'destination', 'transportation'];
    
    objectIdFields.forEach(field => {
        if (converted[field]) {
            if (typeof converted[field] === 'string') {
                converted[field] = new mongoose.Types.ObjectId(converted[field]);
            } else if (converted[field].$in && Array.isArray(converted[field].$in)) {
                converted[field].$in = converted[field].$in.map(id => 
                    typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
                );
            }
        }
    });
    
    return converted;
};

const buildSortQuery = (queryParams = {}) => {
    let sortQuery = { createdAt: -1 }; // Default sort
    
    if (queryParams.sortBy) {
        const sortOrder = queryParams.sortOrder === 'asc' ? 1 : -1;
        
        switch (queryParams.sortBy) {
            case 'PRICE_ASC':
                sortQuery = { price: 1 };
                break;
            case 'PRICE_DESC':
                sortQuery = { price: -1 };
                break;
            case 'views':
                sortQuery = { views: sortOrder };
                break;
            case 'createdAt':
                sortQuery = { createdAt: sortOrder };
                break;
            case 'title':
                sortQuery = { title: sortOrder };
                break;
            case 'highlight':
                sortQuery = { highlight: sortOrder };
                break;
            default:
                sortQuery = { createdAt: -1 };
        }
    }
    
    return sortQuery;
};

const needsAggregation = (queryParams = {}) => {
    return queryParams.sortBy === 'DURATION_ASC' || 
           queryParams.sortBy === 'DURATION_DESC' || 
           queryParams.duration;
};

module.exports = {
    mergeFilters,
    mergeCategoriesFilter,
    convertToObjectIds,
    buildSortQuery,
    needsAggregation
};
