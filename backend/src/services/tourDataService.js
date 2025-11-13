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
                .select('_id title slug price minPrice maxPrice highlights averageRating')
                .limit(5) // Lấy tối đa 5 tour mỗi danh mục
                .lean();

                result[category.name] = {
                    description: category.description || category.pageTitle,
                    tours: tours.map(tour => ({
                        _id: tour._id,
                        title: tour.title,
                        slug: tour.slug,
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
     * Lấy tour nổi bật (highlight = true)
     */
    static async getFeaturedTours() {
        try {
            const tours = await Tour.find({
                status: true,
                deleted: false,
                highlight: true
            })
            .populate('category', 'name')
            .populate('departure', 'name')
            .populate('destination', 'name')
            .select('_id title slug price minPrice maxPrice highlights averageRating totalReviews')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

            return tours.map(tour => ({
                _id: tour._id,
                title: tour.title,
                slug: tour.slug,
                price: tour.price || tour.minPrice,
                rating: tour.averageRating,
                totalReviews: tour.totalReviews,
                highlights: tour.highlights?.slice(0, 3)
            }));
        } catch (error) {
            console.error('Error getting featured tours:', error);
            return [];
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
                featuredTours,
                statistics
            ] = await Promise.all([
                this.getToursByCategory(),
                this.getPopularDestinations(),
                this.getFeaturedTours(),
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
                featuredTours: featuredTours || [],
                statistics: validatedStatistics,
                lastUpdated: new Date().toISOString(),
                dataIntegrity: {
                    categoriesCount: Object.keys(toursByCategory || {}).length,
                    destinationsCount: (popularDestinations || []).length,
                    featuredToursCount: (featuredTours || []).length,
                    hasValidPriceRange: validatedStatistics.priceRange.maxPrice > validatedStatistics.priceRange.minPrice
                }
            };
        } catch (error) {
            console.error('Error getting chatbot context:', error);
            return {
                toursByCategory: {},
                popularDestinations: [],
                featuredTours: [],
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
                    featuredToursCount: 0,
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

    /**
     * Lấy lịch trình và ngày khởi hành của tour theo ID
     */
    static async getTourSchedule(tourId, options = {}) {
        try {
            const { limit = 10, upcoming = true } = options;
            const TourDetail = require('../models/tourDetailModel');

            // Tìm tour trước
            const tour = await Tour.findById(tourId)
                .populate('departure', 'name')
                .populate('destination', 'name')
                .lean();

            if (!tour) {
                return null;
            }

            // Xây dựng query cho tour details
            let query = { tourId: tourId };
            
            if (upcoming) {
                // Chỉ lấy các tour sắp khởi hành (từ hôm nay trở đi)
                query.dayStart = { $gte: new Date() };
            }

            // Lấy tour details với sắp xếp theo ngày khởi hành
            const tourDetails = await TourDetail.find(query)
                .sort({ dayStart: 1 })
                .limit(limit)
                .lean();

            // Tính toán thông tin bổ sung
            const scheduleData = {
                tour: {
                    _id: tour._id,
                    title: tour.title,
                    slug: tour.slug,
                    departure: tour.departure,
                    destination: tour.destination,
                    itinerary: tour.itinerary || []
                },
                schedules: tourDetails.map(detail => {
                    // Tính giá sau giảm
                    let finalAdultPrice = detail.adultPrice;
                    let finalChildrenPrice = detail.childrenPrice;
                    let finalChildPrice = detail.childPrice;
                    let finalBabyPrice = detail.babyPrice;

                    if (detail.discountAdultPercent) {
                        finalAdultPrice = detail.adultPrice * (1 - detail.discountAdultPercent / 100);
                    } else if (detail.discount) {
                        finalAdultPrice = detail.adultPrice * (1 - detail.discount / 100);
                    }

                    if (detail.discountChildrenPercent) {
                        finalChildrenPrice = detail.childrenPrice * (1 - detail.discountChildrenPercent / 100);
                    } else if (detail.discount) {
                        finalChildrenPrice = detail.childrenPrice * (1 - detail.discount / 100);
                    }

                    if (detail.discountChildPercent) {
                        finalChildPrice = detail.childPrice * (1 - detail.discountChildPercent / 100);
                    } else if (detail.discount) {
                        finalChildPrice = detail.childPrice * (1 - detail.discount / 100);
                    }

                    if (detail.discountBabyPercent) {
                        finalBabyPrice = detail.babyPrice * (1 - detail.discountBabyPercent / 100);
                    } else if (detail.discount) {
                        finalBabyPrice = detail.babyPrice * (1 - detail.discount / 100);
                    }

                    return {
                        _id: detail._id,
                        dayStart: detail.dayStart,
                        dayReturn: detail.dayReturn,
                        duration: this.calculateDuration(detail.dayStart, detail.dayReturn),
                        stock: detail.stock,
                        originalPrices: {
                            adult: detail.adultPrice,
                            children: detail.childrenPrice,
                            child: detail.childPrice,
                            baby: detail.babyPrice
                        },
                        finalPrices: {
                            adult: Math.round(finalAdultPrice / 1000) * 1000,
                            children: Math.round(finalChildrenPrice / 1000) * 1000,
                            child: Math.round(finalChildPrice / 1000) * 1000,
                            baby: Math.round(finalBabyPrice / 1000) * 1000
                        },
                        discounts: {
                            general: detail.discount,
                            adult: detail.discountAdultPercent,
                            children: detail.discountChildrenPercent,
                            child: detail.discountChildPercent,
                            baby: detail.discountBabyPercent
                        },
                        singleRoomSupplement: detail.singleRoomSupplementPrice
                    };
                }),
                totalSchedules: await TourDetail.countDocuments({ tourId: tourId }),
                upcomingSchedules: await TourDetail.countDocuments({ 
                    tourId: tourId, 
                    dayStart: { $gte: new Date() } 
                })
            };

            return scheduleData;
        } catch (error) {
            console.error('Error getting tour schedule:', error);
            throw error;
        }
    }

    /**
     * Lấy lịch trình tour theo slug
     */
    static async getTourScheduleBySlug(slug, options = {}) {
        try {
            // Tìm tour theo slug trước
            const tour = await Tour.findOne({ slug: slug })
                .populate('departure', 'name')
                .populate('destination', 'name')
                .lean();

            if (!tour) {
                return null;
            }

            // Sử dụng method getTourSchedule với tourId
            return await this.getTourSchedule(tour._id, options);
        } catch (error) {
            console.error('Error getting tour schedule by slug:', error);
            throw error;
        }
    }

    /**
     * Tính số ngày đêm của tour
     */
    static calculateDuration(startDate, endDate) {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const nights = Math.max(0, diffDays - 1);
            return `${diffDays}N${nights}Đ`;
        } catch (error) {
            console.error('Error calculating duration:', error);
            return 'N/A';
        }
    }
}

module.exports = TourDataService;
