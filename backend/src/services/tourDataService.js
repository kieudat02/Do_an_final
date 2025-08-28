const Tour = require('../models/tourModel');
const Category = require('../models/categoriesModel');
const Departure = require('../models/departureModel');
const Destination = require('../models/destinationModel');
const Transportation = require('../models/transportationModel');

/**
 * Service để cung cấp dữ liệu tour cho chatbot
 */
class TourDataService {
    /**
     * Lấy tất cả tours với thông tin đầy đủ
     */
    static async getAllToursForChatbot() {
        try {
            const tours = await Tour.find({ 
                status: true, 
                deleted: false 
            })
            .populate('category', 'name description')
            .populate('departure', 'name')
            .populate('destination', 'name')
            .populate('transportation', 'name')
            .select(`
                title code slug price minPrice maxPrice
                category departure destination transportation
                country tags startDate endDate
                attractions cuisine suitableTime suitableObject
                highlights overview.description
                averageRating totalReviews
                itinerary
            `)
            .sort({ createdAt: -1 })
            .lean();

            return tours;
        } catch (error) {
            console.error('Error getting tours for chatbot:', error);
            return [];
        }
    }

    /**
     * Lấy thông tin tóm tắt về tours theo danh mục
     */
    static async getToursByCategory() {
        try {
            const categories = await Category.find({ 
                status: 'Hoạt động' 
            }).select('name description pageTitle').lean();

            const result = {};

            for (const category of categories) {
                const tours = await Tour.find({
                    category: category._id,
                    status: true,
                    deleted: false
                })
                .select('title price minPrice maxPrice highlights averageRating')
                .limit(5) // Lấy tối đa 5 tour mỗi danh mục
                .lean();

                result[category.name] = {
                    description: category.description || category.pageTitle,
                    tours: tours.map(tour => ({
                        title: tour.title,
                        price: tour.price || tour.minPrice,
                        rating: tour.averageRating,
                        highlights: tour.highlights?.slice(0, 3) 
                    }))
                };
            }

            return result;
        } catch (error) {
            console.error('Error getting tours by category:', error);
            return {};
        }
    }

    /**
     * Lấy thông tin điểm đến phổ biến
     */
    static async getPopularDestinations() {
        try {
            const destinations = await Destination.find({})
                .select('name description')
                .lean();

            const result = [];

            for (const destination of destinations) {
                const tourCount = await Tour.countDocuments({
                    destination: destination._id,
                    status: true,
                    deleted: false
                });

                if (tourCount > 0) {
                    result.push({
                        name: destination.name,
                        description: destination.description,
                        tourCount: tourCount
                    });
                }
            }

            return result.sort((a, b) => b.tourCount - a.tourCount);
        } catch (error) {
            console.error('Error getting popular destinations:', error);
            return [];
        }
    }

    /**
     * Tìm kiếm tours theo từ khóa
     */
    static async searchTours(keyword) {
        try {
            const searchRegex = new RegExp(keyword, 'gi');
            
            const tours = await Tour.find({
                $and: [
                    { status: true, deleted: false },
                    {
                        $or: [
                            { title: searchRegex },
                            { attractions: searchRegex },
                            { cuisine: searchRegex },
                            { tags: { $in: [searchRegex] } },
                            { country: searchRegex },
                            { 'overview.description': searchRegex }
                        ]
                    }
                ]
            })
            .populate('category', 'name')
            .populate('departure', 'name')
            .populate('destination', 'name')
            .select(`
                title code price minPrice maxPrice
                category departure destination
                attractions cuisine highlights
                averageRating totalReviews
                startDate endDate
            `)
            .limit(10)
            .lean();

            return tours;
        } catch (error) {
            console.error('Error searching tours:', error);
            return [];
        }
    }

    /**
     * Lấy tours theo khoảng giá
     */
    static async getToursByPriceRange(minPrice, maxPrice) {
        try {
            const tours = await Tour.find({
                status: true,
                deleted: false,
                $or: [
                    { 
                        price: { 
                            $gte: minPrice, 
                            $lte: maxPrice 
                        } 
                    },
                    { 
                        minPrice: { 
                            $gte: minPrice, 
                            $lte: maxPrice 
                        } 
                    }
                ]
            })
            .populate('category', 'name')
            .populate('destination', 'name')
            .select('title price minPrice highlights averageRating')
            .limit(10)
            .lean();

            return tours;
        } catch (error) {
            console.error('Error getting tours by price range:', error);
            return [];
        }
    }

    /**
     * Lấy thống kê tổng quan
     */
    static async getTourStatistics() {
        try {
            const totalTours = await Tour.countDocuments({ 
                status: true, 
                deleted: false 
            });

            const categories = await Category.countDocuments({ 
                status: 'Hoạt động' 
            });

            const destinations = await Destination.countDocuments();

            const avgRating = await Tour.aggregate([
                { 
                    $match: { 
                        status: true, 
                        deleted: false,
                        averageRating: { $gt: 0 }
                    } 
                },
                { 
                    $group: { 
                        _id: null, 
                        avgRating: { $avg: '$averageRating' } 
                    } 
                }
            ]);

            // Lấy khoảng giá
            const priceRange = await Tour.aggregate([
                { 
                    $match: { 
                        status: true, 
                        deleted: false 
                    } 
                },
                {
                    $group: {
                        _id: null,
                        minPrice: { $min: { $ifNull: ['$minPrice', '$price'] } },
                        maxPrice: { $max: { $ifNull: ['$maxPrice', '$price'] } }
                    }
                }
            ]);

            return {
                totalTours,
                totalCategories: categories,
                totalDestinations: destinations,
                averageRating: avgRating[0]?.avgRating || 0,
                priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 }
            };
        } catch (error) {
            console.error('Error getting tour statistics:', error);
            return {
                totalTours: 0,
                totalCategories: 0,
                totalDestinations: 0,
                averageRating: 0,
                priceRange: { minPrice: 0, maxPrice: 0 }
            };
        }
    }

    /**
     * Tạo context data cho chatbot - với data consistency checks
     */
    static async getChatbotContext() {
        try {
            const [
                toursByCategory,
                popularDestinations,
                statistics
            ] = await Promise.all([
                this.getToursByCategory(),
                this.getPopularDestinations(),
                this.getTourStatistics()
            ]);

            // Data consistency validation
            const validatedStatistics = {
                totalTours: Math.max(0, statistics.totalTours || 0),
                totalCategories: Math.max(0, statistics.totalCategories || 0),
                totalDestinations: Math.max(0, statistics.totalDestinations || 0),
                averageRating: Math.max(0, Math.min(5, statistics.averageRating || 0)),
                priceRange: {
                    minPrice: Math.max(0, statistics.priceRange?.minPrice || 0),
                    maxPrice: Math.max(0, statistics.priceRange?.maxPrice || 0)
                }
            };

            return {
                toursByCategory: toursByCategory || {},
                popularDestinations: (popularDestinations || []).slice(0, 10),
                statistics: validatedStatistics,
                lastUpdated: new Date().toISOString(),
                dataIntegrity: {
                    categoriesCount: Object.keys(toursByCategory || {}).length,
                    destinationsCount: (popularDestinations || []).length,
                    hasValidPriceRange: validatedStatistics.priceRange.maxPrice > validatedStatistics.priceRange.minPrice
                }
            };
        } catch (error) {
            console.error('Error getting chatbot context:', error);
            return {
                toursByCategory: {},
                popularDestinations: [],
                statistics: {
                    totalTours: 0,
                    totalCategories: 0,
                    totalDestinations: 0,
                    averageRating: 0,
                    priceRange: { minPrice: 0, maxPrice: 0 }
                },
                lastUpdated: new Date().toISOString(),
                dataIntegrity: {
                    categoriesCount: 0,
                    destinationsCount: 0,
                    hasValidPriceRange: false,
                    error: error.message
                }
            };
        }
    }

    /**
     * Lấy thông tin chi tiết một tour cụ thể
     */
    static async getTourDetails(tourId) {
        try {
            if (!tourId) {
                throw new Error('Tour ID không hợp lệ');
            }

            const tour = await Tour.findById(tourId)
                .populate('category', 'name description')
                .populate('departure', 'name')
                .populate('destination', 'name description')
                .populate('transportation', 'name')
                .lean();

            if (!tour) {
                return null;
            }

            return tour;
        } catch (error) {
            console.error('Error getting tour details:', error);
            throw error; // Re-throw để controller có thể handle
        }
    }
}

module.exports = TourDataService;
