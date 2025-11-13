import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTours, getToursByDestination } from '../../../../services/tourService';
import { getDestinations } from '../../../../services/destinationService';
import './DropDownHeader.scss';

const DropDownHeader = ({ categories, activeCategory, onCategoryHover, onDropdownLeave, onCloseDropdown }) => {
    const navigate = useNavigate();

    const [domesticTours, setDomesticTours] = useState([]);
    const [internationalTours, setInternationalTours] = useState([]);
    const [featuredTours, setFeaturedTours] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastFetchedCategory, setLastFetchedCategory] = useState(null);
    const [currentSlide, setCurrentSlide] = useState(0);

    // States mới cho sidebar động
    const [destinations, setDestinations] = useState({});
    const [destinationsLoading, setDestinationsLoading] = useState(false);
    const [activeRegion, setActiveRegion] = useState(null);
    const [hoveredGroup, setHoveredGroup] = useState(null); 

    const [checkingTour, setCheckingTour] = useState(null);

    const dropdownRef = useRef(null);
    const hoverTimeoutRef = useRef(null);

    // Helper functions để nhóm dữ liệu điểm đến
    const groupDestinationsByRegion = (destinationsData) => {
        const grouped = {};

        if (!destinationsData || !Array.isArray(destinationsData)) {
            return grouped;
        }

        destinationsData.forEach(dest => {
            if (dest.type === 'Trong nước') {
                // Nhóm theo vùng miền cho tour trong nước
                const region = getRegionFromDestinationName(dest.name);
                if (!grouped[region]) {
                    grouped[region] = {};
                }

                // Nhóm theo tỉnh/thành phố (group level)
                const province = getProvinceFromDestinationName(dest.name);
                if (!grouped[region][province]) {
                    grouped[region][province] = [];
                }
                grouped[region][province].push(dest);
            }
        });

        // Sắp xếp các regions theo thứ tự mong muốn
        const regionOrder = ['Miền Bắc', 'Miền Trung', 'Miền Đông Nam Bộ', 'Miền Tây Nam Bộ', 'Khác'];
        const sortedGrouped = {};
        
        regionOrder.forEach(region => {
            if (grouped[region]) {
                sortedGrouped[region] = grouped[region];
            }
        });

        return sortedGrouped;
    };

    const groupDestinationsByContinent = (destinationsData) => {
        const grouped = {};

        if (!destinationsData || !Array.isArray(destinationsData)) {
            return grouped;
        }

        destinationsData.forEach(dest => {
            if (dest.type === 'Nước ngoài') {
                // Nhóm theo châu lục cho tour nước ngoài
                const continent = dest.continent || 'Khác';
                if (!grouped[continent]) {
                    grouped[continent] = {};
                }

                // Nhóm theo quốc gia (group level)
                const country = dest.country || 'Khác';
                if (!grouped[continent][country]) {
                    grouped[continent][country] = [];
                }
                grouped[continent][country].push(dest);
            }
        });

        // Sắp xếp các continents theo thứ tự mong muốn
        const continentOrder = ['Châu Á', 'Châu Âu', 'Châu Mỹ', 'Châu Úc', 'Châu Phi', 'Khác'];
        const sortedGrouped = {};
        
        continentOrder.forEach(continent => {
            if (grouped[continent]) {
                sortedGrouped[continent] = grouped[continent];
            }
        });

        return sortedGrouped;
    };

    // Helper function để xác định vùng miền từ tên điểm đến
    const getRegionFromDestinationName = (name) => {
        const nameLower = name.toLowerCase();

        if (nameLower.includes('hà nội') || nameLower.includes('hạ long') || nameLower.includes('sapa') ||
            nameLower.includes('ninh bình') || nameLower.includes('lào cai') || nameLower.includes('cao bằng') ||
            nameLower.includes('hải phòng') || nameLower.includes('quảng ninh') || nameLower.includes('thái nguyên') ||
            nameLower.includes('bắc giang') || nameLower.includes('hà giang') || nameLower.includes('điện biên')) {
            return 'Miền Bắc';
        } else if (nameLower.includes('huế') || nameLower.includes('đà nẵng') || nameLower.includes('hội an') ||
                   nameLower.includes('quảng nam') || nameLower.includes('nghệ an') || nameLower.includes('thanh hóa') ||
                   nameLower.includes('quảng bình') || nameLower.includes('quảng trị') || nameLower.includes('thừa thiên') ||
                   nameLower.includes('hà tĩnh') || nameLower.includes('quảng ngãi') || nameLower.includes('bình định') ||
                   nameLower.includes('phú yên') || nameLower.includes('khánh hòa') || nameLower.includes('nha trang')) {
            return 'Miền Trung';
        } else if (nameLower.includes('hồ chí minh') || nameLower.includes('sài gòn') || nameLower.includes('vũng tàu') ||
                   nameLower.includes('đà lạt') || nameLower.includes('bình dương') || nameLower.includes('đồng nai') ||
                   nameLower.includes('bà rịa') || nameLower.includes('tây ninh') || nameLower.includes('bình phước') ||
                   nameLower.includes('lâm đồng') || nameLower.includes('ninh thuận') || nameLower.includes('bình thuận')) {
            return 'Miền Đông Nam Bộ';
        } else if (nameLower.includes('cần thơ') || nameLower.includes('an giang') || nameLower.includes('đồng tháp') ||
                   nameLower.includes('tiền giang') || nameLower.includes('vĩnh long') || nameLower.includes('bến tre') ||
                   nameLower.includes('trà vinh') || nameLower.includes('sóc trăng') || nameLower.includes('bạc liêu') ||
                   nameLower.includes('cà mau') || nameLower.includes('kiên giang') || nameLower.includes('phú quốc')) {
            return 'Miền Tây Nam Bộ';
        }

        return 'Khác';
    };

    // Helper function để xác định tỉnh/thành phố từ tên điểm đến
    const getProvinceFromDestinationName = (name) => {
        const nameLower = name.toLowerCase();

        // Mapping các điểm đến phổ biến với tỉnh/thành phố
        const provinceMapping = {
            'hà nội': 'Hà Nội',
            'hạ long': 'Quảng Ninh',
            'sapa': 'Lào Cai',
            'ninh bình': 'Ninh Bình',
            'đà nẵng': 'Đà Nẵng',
            'hội an': 'Quảng Nam',
            'huế': 'Thừa Thiên Huế',
            'nha trang': 'Khánh Hòa',
            'đà lạt': 'Lâm Đồng',
            'hồ chí minh': 'TP.HCM',
            'sài gòn': 'TP.HCM',
            'vũng tàu': 'Bà Rịa - Vũng Tàu',
            'phú quốc': 'Kiên Giang',
            'cần thơ': 'Cần Thơ'
        };

        for (const [key, province] of Object.entries(provinceMapping)) {
            if (nameLower.includes(key)) {
                return province;
            }
        }

        return name; // Trả về tên gốc nếu không tìm thấy mapping
    };



    // Fetch tours khi hover vào dropdown
    useEffect(() => {
        const fetchTours = async () => {
            if (!activeCategory) return;

            const categorySlug = activeCategory.slug || activeCategory.fullSlug;
            const categoryName = activeCategory.name;

            // Fetch tour trong nước
            if ((categoryName === 'Tour Trong Nước' || categoryName === 'Tour trong nước' ||
                 categorySlug === 'tour-trong-nuoc' || categorySlug.includes('tour-trong-nuoc')) &&
                 lastFetchedCategory !== 'domestic') {
                setLoading(true);
                try {
                    const response = await getTours({
                        destinationType: 'Trong nước',
                        limit: 6,
                        highlight: true
                    });

                    if (response.data.success && response.data.data?.length > 0) {
                        setDomesticTours(response.data.data);
                    } else {
                        // Thử lấy tất cả tours và lọc tour trong nước
                        const fallbackResponse = await getTours({
                            limit: 20,
                            sort: '-createdAt'
                        });

                        if (fallbackResponse.data.success && fallbackResponse.data.data?.length > 0) {
                            // Lọc tour trong nước từ tất cả tours
                            const domesticToursFiltered = fallbackResponse.data.data.filter(tour =>
                                tour.destination?.type === 'Trong nước' ||
                                tour.destinationType === 'Trong nước' ||
                                (tour.destination?.name &&
                                 ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hạ Long', 'Sapa', 'Phú Quốc', 'Nha Trang', 'Hội An', 'Cần Thơ', 'Đà Lạt'].some(city =>
                                    tour.destination.name.includes(city) || tour.title?.includes(city)
                                 ))
                            );
                            setDomesticTours(domesticToursFiltered.slice(0, 6));
                        } else {
                            // Không có dữ liệu
                            setDomesticTours([]);
                        }
                    }
                    setLastFetchedCategory('domestic');
                } catch (error) {
                    console.error('Error fetching domestic tours:', error);
                    setDomesticTours([]);
                } finally {
                    setLoading(false);
                }
            }
            // Fetch tour nước ngoài
            else if ((categoryName === 'Tour Nước Ngoài' || categoryName === 'Tour nước ngoài' ||
                     categorySlug === 'tour-nuoc-ngoai' || categorySlug.includes('tour-nuoc-ngoai')) &&
                     lastFetchedCategory !== 'international') {
                setLoading(true);
                try {
                    const response = await getTours({
                        destinationType: 'Nước ngoài',
                        limit: 6,
                        highlight: true
                    });

                    if (response.data.success && response.data.data?.length > 0) {
                        setInternationalTours(response.data.data);
                    } else {
                        // Thử lấy tất cả tours và lọc tour nước ngoài
                        const fallbackResponse = await getTours({
                            limit: 20,
                            sort: '-createdAt'
                        });

                        if (fallbackResponse.data.success && fallbackResponse.data.data?.length > 0) {
                            // Lọc tour nước ngoài từ tất cả tours
                            const internationalToursFiltered = fallbackResponse.data.data.filter(tour =>
                                tour.destination?.type === 'Nước ngoài' ||
                                tour.destinationType === 'Nước ngoài' ||
                                (tour.destination?.name &&
                                 ['Trung Quốc', 'Hàn Quốc', 'Nhật Bản', 'Thái Lan', 'Singapore', 'Malaysia', 'Pháp', 'Đức', 'Ý', 'Mỹ', 'Canada'].some(country =>
                                    tour.destination.name.includes(country) || tour.title?.includes(country)
                                 ))
                            );
                            setInternationalTours(internationalToursFiltered.slice(0, 6));
                        } else {
                            // Không có dữ liệu
                            setInternationalTours([]);
                        }
                    }
                    setLastFetchedCategory('international');
                } catch (error) {
                    console.error('Error fetching international tours:', error);
                    setInternationalTours([]);
                } finally {
                    setLoading(false);
                }
            } else {
                // Reset lastFetchedCategory khi không phải tour category
                const categoryName = activeCategory.name;
                const categorySlug = activeCategory.slug || activeCategory.fullSlug;
                if (!(categoryName && categoryName.toLowerCase().includes('tour')) &&
                    !(categorySlug && categorySlug.includes('tour'))) {
                    setLastFetchedCategory(null);
                }
            }
        };

        fetchTours();
    }, [activeCategory]);

    // Reset currentSlide khi category thay đổi
    useEffect(() => {
        setCurrentSlide(0);
    }, [activeCategory]);

    // Function để kiểm tra destination có tour hay không
    const checkDestinationHasTours = async (destinationId) => {
        try {
            const response = await getToursByDestination(destinationId);
            return response.data.success && response.data.data && response.data.data.length > 0;
        } catch (error) {
            console.error(`Error checking tours for destination ${destinationId}:`, error);
            return false;
        }
    };

    // Function để lọc destinations có tour (song song để tối ưu hiệu suất)
    const filterDestinationsWithTours = async (destinationsData) => {
        if (!destinationsData || !Array.isArray(destinationsData)) {
            return [];
        }

        // Kiểm tra tất cả destinations song song
        const tourCheckPromises = destinationsData.map(async (destination) => {
            const hasTours = await checkDestinationHasTours(destination._id);
            return { destination, hasTours };
        });

        const results = await Promise.all(tourCheckPromises);

        // Chỉ trả về những destinations có tour
        return results
            .filter(result => result.hasTours)
            .map(result => result.destination);
    };

    // Fetch destinations data cho sidebar động
    const fetchDestinations = async (type) => {
        if (destinations[type] || destinationsLoading) {
            return;
        }

        setDestinationsLoading(true);
        try {
            const response = await getDestinations({ type });
            if (response.data.success && response.data.data) {
                // Lọc chỉ những destinations có tour
                const filteredData = await filterDestinationsWithTours(response.data.data);

                setDestinations(prev => ({
                    ...prev,
                    [type]: filteredData
                }));
            }
        } catch (error) {
            console.error(`Error fetching destinations for ${type}:`, error);
        } finally {
            setDestinationsLoading(false);
        }
    };

    // useEffect để fetch destinations khi activeCategory thay đổi
    useEffect(() => {
        if (!activeCategory) return;

        const categorySlug = activeCategory.slug || activeCategory.fullSlug;
        const categoryName = activeCategory.name;

        // Chỉ fetch cho Tour Trong Nước và Tour Nước Ngoài
        if (categoryName === 'Tour Trong Nước' || categoryName === 'Tour trong nước' ||
            categorySlug === 'tour-trong-nuoc' || categorySlug.includes('tour-trong-nuoc')) {
            fetchDestinations('Trong nước');
        } else if (categoryName === 'Tour Nước Ngoài' || categoryName === 'Tour nước ngoài' ||
                   categorySlug === 'tour-nuoc-ngoai' || categorySlug.includes('tour-nuoc-ngoai')) {
            fetchDestinations('Nước ngoài');
        }
    }, [activeCategory]);

    // Memoized grouped destinations để tránh tính toán lại không cần thiết
    const groupedDomesticDestinations = useMemo(() => {
        return groupDestinationsByRegion(destinations['Trong nước'] || []);
    }, [destinations]);

    const groupedInternationalDestinations = useMemo(() => {
        return groupDestinationsByContinent(destinations['Nước ngoài'] || []);
    }, [destinations]);

    // Debounced hover handlers để tối ưu hiệu suất
    const debouncedRegionHover = useCallback((region) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
            setActiveRegion(region);

            // Tự động chọn group đầu tiên trong region mới
            const categorySlug = activeCategory?.slug || activeCategory?.fullSlug;
            const categoryName = activeCategory?.name;
            const isDomestic = categoryName === 'Tour Trong Nước' ||
                              categoryName === 'Tour trong nước' ||
                              categorySlug === 'tour-trong-nuoc' ||
                              categorySlug?.includes('tour-trong-nuoc');

            const groupedDestinations = isDomestic
                ? groupedDomesticDestinations
                : groupedInternationalDestinations;

            // Reset hover state khi chuyển region
            setHoveredGroup(null);
        }, 150); // 150ms debounce
    }, [activeCategory, groupedDomesticDestinations, groupedInternationalDestinations]);

    const debouncedGroupHover = useCallback((group) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredGroup(group); // Chỉ set group được hover để hiển thị content
        }, 100); // 100ms debounce
    }, []);

    // Handler để reset hover state khi mouse leave
    const handleDropdownLeave = useCallback(() => {
        setHoveredGroup(null);
        if (onDropdownLeave) {
            onDropdownLeave();
        }
    }, [onDropdownLeave]);

    // Reset active states khi category thay đổi
    useEffect(() => {
        setActiveRegion(null);
        setHoveredGroup(null); // Reset hover state
    }, [activeCategory]);

    // Auto-select region và group đầu tiên ngay khi category thay đổi
    useEffect(() => {
        if (!activeCategory) return;

        const categorySlug = activeCategory.slug || activeCategory.fullSlug;
        const categoryName = activeCategory.name;
        const isDomestic = categoryName === 'Tour Trong Nước' ||
                          categoryName === 'Tour trong nước' ||
                          categorySlug === 'tour-trong-nuoc' ||
                          categorySlug.includes('tour-trong-nuoc');

        const groupedDestinations = isDomestic
            ? groupedDomesticDestinations
            : groupedInternationalDestinations;

        // Chỉ set region đầu tiên để sidebar có active state, không set group
        if (Object.keys(groupedDestinations).length > 0) {
            const firstRegion = Object.keys(groupedDestinations)[0];
            setActiveRegion(firstRegion);
            // Không set activeGroup nữa - chỉ set khi hover thực sự
        }
    }, [activeCategory, groupedDomesticDestinations, groupedInternationalDestinations]);

    // Memoized destination click handler
    const handleDestinationClick = useCallback(async (destination, event) => {
        event.preventDefault(); // Ngăn chặn navigation mặc định

        // Ngăn chặn multiple clicks
        if (checkingTour === destination._id) return;

        setCheckingTour(destination._id);

        try {
            // Kiểm tra xem điểm đến có tour hay không
            const response = await getToursByDestination(destination._id);

            if (response.data.success && response.data.data && response.data.data.length > 0) {
                // Có tour - điều hướng đến tour đầu tiên
                const firstTour = response.data.data[0];
                // Đóng dropdown trước khi navigate
                if (onCloseDropdown) {
                    onCloseDropdown();
                }
                navigate(`/tour/${firstTour.slug}`);
            } else {
                // Không có tour - điều hướng đến trang tìm kiếm tour
                if (onCloseDropdown) {
                    onCloseDropdown();
                }
                navigate(`/tours?destination=${destination._id}`);
            }
        } catch (error) {
            console.error('Error checking tours for destination:', error);
            // Đóng dropdown trước khi navigate
            if (onCloseDropdown) {
                onCloseDropdown();
            }
            navigate(`/tours?destination=${destination._id}`);
        } finally {
            setCheckingTour(null);
        }
    }, [navigate, checkingTour, onCloseDropdown]);

    // Memoized current groups và destinations dựa trên active states
    const currentGroups = useMemo(() => {
        if (!activeCategory) return {};

        const categorySlug = activeCategory.slug || activeCategory.fullSlug;
        const categoryName = activeCategory.name;
        const isDomestic = categoryName === 'Tour Trong Nước' ||
                          categoryName === 'Tour trong nước' ||
                          categorySlug === 'tour-trong-nuoc' ||
                          categorySlug.includes('tour-trong-nuoc');

        const groupedDestinations = isDomestic
            ? groupedDomesticDestinations
            : groupedInternationalDestinations;

        return activeRegion && groupedDestinations[activeRegion]
            ? groupedDestinations[activeRegion]
            : {};
    }, [activeCategory, activeRegion, groupedDomesticDestinations, groupedInternationalDestinations]);

    const currentDestinations = useMemo(() => {
        return hoveredGroup && currentGroups[hoveredGroup]
            ? currentGroups[hoveredGroup]
            : [];
    }, [hoveredGroup, currentGroups]);

    // Cleanup timeout khi component unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    // Lấy dữ liệu khi category thay đổi
    useEffect(() => {
        if (activeCategory) {
            fetchDropdownData();
        }
    }, [activeCategory]);

    const fetchDropdownData = async () => {
        if (!activeCategory) return;

        setLoading(true);
        try {
            // Kiểm tra loại dropdown dựa trên tên category
            const isSpecial = activeCategory.name.toLowerCase().includes('mùa thu') ||
                             activeCategory.name.toLowerCase().includes('lễ 2/9') ||
                             activeCategory.name.toLowerCase().includes('thu') ||
                             (categories.length > 0 && activeCategory._id === categories[0]._id);

            if (isSpecial) {
                // Lấy tours cho dropdown special theo category
                const [domesticResponse, internationalResponse] = await Promise.all([
                    // Tours trong nước
                    getTours({
                        limit: 10,
                        category: activeCategory._id,
                        destinationType: 'Trong nước'
                    }),
                    // Tours nước ngoài
                    getTours({
                        limit: 10,
                        category: activeCategory._id,
                        destinationType: 'Nước ngoài'
                    })
                ]);

                if (domesticResponse.data.success) {
                    setDomesticTours(domesticResponse.data.data || []);
                }
                if (internationalResponse.data.success) {
                    setInternationalTours(internationalResponse.data.data || []);
                }
            } else {
                // Lấy featured tours cho dropdown kiểu 2
                const toursResponse = await getTours({
                    limit: 8,
                    highlight: true,
                    category: activeCategory._id
                });
                if (toursResponse.data.success) {
                    setFeaturedTours(toursResponse.data.data || []);
                }
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu dropdown:', error);
            // Reset data khi có lỗi
            setDomesticTours([]);
            setInternationalTours([]);
            setFeaturedTours([]);
        } finally {
            setLoading(false);
        }
    };

    // Kiểm tra loại dropdown - linh hoạt hơn với các pattern khác nhau
    const isSpecialCategory = activeCategory && (
        activeCategory.name.toLowerCase().includes('mùa thu') ||
        activeCategory.name.toLowerCase().includes('lễ 2/9') ||
        activeCategory.name.toLowerCase().includes('le 2/9') ||
        activeCategory.name.toLowerCase().includes('mua thu') ||
        activeCategory.name.toLowerCase().includes('thu') ||
        activeCategory.slug?.includes('mua-thu') ||
        activeCategory.slug?.includes('le-2-9') ||
        activeCategory.slug?.includes('thu')
    );





    // Format giá tiền
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    };

    // State cho tab active trong dropdown special
    const [activeTab, setActiveTab] = useState('trong-nuoc');

    // Render dropdown kiểu 1: Sidebar cam với tabs + danh sách tour text
    const renderSpecialDropdown = () => (
        <div className="dropdown-header__content dropdown-header__content--special">
            <div className="dropdown-header__sidebar">
                <div className="dropdown-header__promo-box">
                    <h3 className="dropdown-header__promo-title">
                        {activeCategory?.name || 'Tour đặc biệt'}
                    </h3>

                    {/* Tabs Trong nước / Nước ngoài */}
                    <div className="dropdown-header__tabs">
                        <button
                            className={`dropdown-header__tab ${activeTab === 'trong-nuoc' ? 'dropdown-header__tab--active' : ''}`}
                            onClick={() => setActiveTab('trong-nuoc')}
                        >
                            Trong nước
                        </button>
                        <button
                            className={`dropdown-header__tab ${activeTab === 'nuoc-ngoai' ? 'dropdown-header__tab--active' : ''}`}
                            onClick={() => setActiveTab('nuoc-ngoai')}
                        >
                            Nước ngoài
                        </button>
                    </div>
                </div>
            </div>

            <div className="dropdown-header__tours-list">
                <div className="dropdown-header__section-title">
                    Khám phá các điểm đến
                </div>

                {loading ? (
                    <div className="dropdown-header__loading">Đang tải...</div>
                ) : (
                    <div className="dropdown-header__tour-links">
                        {activeTab === 'trong-nuoc' ? (
                            domesticTours.length > 0 ? (
                                // Các chuyến tham quan lặp lại theo tiêu đề để tránh hiển thị tên trùng lặp
                                domesticTours
                                    .filter((tour, index, self) => 
                                        index === self.findIndex(t => t.title === tour.title)
                                    )
                                    .map((tour) => (
                                        <Link
                                            key={tour._id}
                                            to={`/tour/${tour.slug}`}
                                            className="dropdown-header__tour-link"
                                        >
                                            {tour?.title || 'Tour không có tên'}
                                        </Link>
                                    ))
                            ) : (
                                <div className="dropdown-header__no-tours">
                                    Chưa có tour trong nước cho {activeCategory?.name || 'danh mục này'}
                                </div>
                            )
                        ) : (
                            internationalTours.length > 0 ? (
                                // Các chuyến tham quan lặp lại theo tiêu đề để tránh hiển thị tên trùng lặp
                                internationalTours
                                    .filter((tour, index, self) => 
                                        index === self.findIndex(t => t.title === tour.title)
                                    )
                                    .map((tour) => (
                                        <Link
                                            key={tour._id}
                                            to={`/tour/${tour.slug}`}
                                            className="dropdown-header__tour-link"
                                        >
                                            {tour?.title || 'Tour không có tên'}
                                        </Link>
                                    ))
                            ) : (
                                <div className="dropdown-header__no-tours">
                                    Chưa có tour nước ngoài cho {activeCategory?.name || 'danh mục này'}
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    // Render dropdown đơn giản cho tour trong nước/nước ngoài
    const renderSimpleTourDropdown = () => {
        const categorySlug = activeCategory.slug || activeCategory.fullSlug;
        const categoryName = activeCategory.name;
        const isDomestic = categoryName === 'Tour Trong Nước' ||
                          categoryName === 'Tour trong nước' ||
                          categorySlug === 'tour-trong-nuoc' ||
                          categorySlug.includes('tour-trong-nuoc');
        const tours = isDomestic ? domesticTours : internationalTours;

        // Subcategories theo ảnh
        const domesticSubcategories = [
            { name: 'Tour Miền Bắc', slug: 'mien-bac', locations: 'Hà Nội - Hải Phòng - Hạ Long' },
            { name: 'Tour Miền Trung', slug: 'mien-trung', locations: 'Đà Nẵng - Hội An - Nha Trang' },
            { name: 'Tour Miền Nam', slug: 'mien-nam', locations: 'Hồ Chí Minh - Phú Quốc - Cần Thơ' }
        ];

        const internationalSubcategories = [
            { name: 'Tour Châu Á', slug: 'chau-a', locations: 'Trung Quốc - Hàn Quốc - Nhật Bản' },
            { name: 'Tour Châu Âu', slug: 'chau-au', locations: 'Pháp - Đức - Ý - Tây Ban Nha' },
            { name: 'Tour Châu Úc, Mỹ, Phi', slug: 'chau-uc-my-phi', locations: 'Úc - Mỹ - Canada' }
        ];

        const subcategories = isDomestic ? domesticSubcategories : internationalSubcategories;

        return (
            <div className="dropdown-header__content dropdown-header__content--simple">
                <div className="dropdown-header__sidebar">
                    {/* Box Tour nổi bật - luôn hiển thị */}
                    <div className="dropdown-header__category-box dropdown-header__category-box--featured">
                        <h4 className="dropdown-header__category-title">Tour nổi bật</h4>
                        <p className="dropdown-header__category-description">
                            {isDomestic ? 'Khám phá vẻ đẹp Việt Nam' : 'Khám phá thế giới'}
                        </p>
                    </div>

                    {/* Các subcategories theo ảnh */}
                    {subcategories.map((subcat, index) => (
                        <Link
                            key={index}
                            to={`/danh-muc-tour/${isDomestic ? 'tour-trong-nuoc' : 'tour-nuoc-ngoai'}`}
                            className="dropdown-header__category-box"
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <h4 className="dropdown-header__category-title">{subcat.name}</h4>
                            <p className="dropdown-header__category-locations">{subcat.locations}</p>
                            <span className="dropdown-header__category-link">Khám phá →</span>
                        </Link>
                    ))}
                </div>

                {/* Tour carousel đơn giản */}
                <div className="dropdown-header__tour-carousel">
                    {loading ? (
                        <div className="dropdown-header__loading">
                            <div className="dropdown-header__spinner"></div>
                            <p>Đang tải tour...</p>
                        </div>
                    ) : tours.length > 0 ? (
                        <div className="dropdown-header__tour-carousel">
                            <div className="dropdown-header__tours-grid">
                                {tours
                                    .filter((tour, index, self) => 
                                        tour && tour.slug && index === self.findIndex(t => t.title === tour.title)
                                    )
                                    .slice(currentSlide * 3, (currentSlide * 3) + 3)
                                    .map((tour) => (
                                    <Link
                                        key={tour._id}
                                        to={tour.slug ? `/tour/${tour.slug}` : '#'}
                                        className="dropdown-header__tour-card"
                                        style={{ textDecoration: 'none', color: 'inherit' }}
                                    >
                                        <div className="dropdown-header__tour-image">
                                            <img
                                                src={tour.featuredImage || tour.images?.[0] || tour.image || '/images/placeholder-tour.jpg'}
                                                alt={tour?.title || 'Tour không có tên'}
                                                onError={(e) => {
                                                    e.target.src = '/images/placeholder-tour.jpg';
                                                }}
                                            />
                                            <div className="dropdown-header__tour-rating">
                                                <span className="star">★</span>
                                                <span>{tour.averageRating?.toFixed(1) || '4.9'}</span>
                                                <span>({tour.totalReviews || tour.bookings || 520})</span>
                                                <span className="review-text">| {tour.bookings || '1740'} đã đặt chỗ</span>
                                            </div>
                                        </div>
                                        <div className="dropdown-header__tour-info">
                                            <h5 className="dropdown-header__tour-title">
                                                {tour?.title || 'Tour không có tên'}
                                            </h5>
                                            <div className="dropdown-header__tour-meta">
                                                <div className="dropdown-header__tour-duration">
                                                    <span className="icon">🕒</span>
                                                    <span>{tour.calculatedDuration ? `${tour.calculatedDuration} ngày ${tour.calculatedDuration - 1} đêm` : '5 ngày 4 đêm'}</span>
                                                </div>
                                                <div className="dropdown-header__tour-group">
                                                    <span className="icon">👥</span>
                                                    <span>Điểm đi: {tour.departureLocation === '1' ? 'Hà Nội' : tour.departureLocation === '2' ? 'TP.HCM' : 'Điểm đi: 1'}</span>
                                                </div>
                                            </div>
                                            <div className="dropdown-header__tour-price">
                                                {tour.discountPrice && tour.discountPrice !== tour.originalPrice ? (
                                                    <>
                                                        <span className="original-price">{formatPrice(tour.originalPrice)}</span>
                                                        <span className="discount-price">{formatPrice(tour.discountPrice)}</span>
                                                        {tour.discountLabel && <span className="discount-label">{tour.discountLabel}</span>}
                                                    </>
                                                ) : (
                                                    <span className="current-price">{formatPrice(tour.price || tour.discountPrice)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {/* Navigation arrows */}
                            {(() => {
                                const uniqueTours = tours.filter((tour, index, self) => 
                                    tour && tour.slug && index === self.findIndex(t => t.title === tour.title)
                                );
                                return uniqueTours.length > 3 && (
                                    <>
                                        <button
                                            className="dropdown-header__nav-btn dropdown-header__nav-btn--prev"
                                            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                                            disabled={currentSlide === 0}
                                        >
                                            ‹
                                        </button>
                                        <button
                                            className="dropdown-header__nav-btn dropdown-header__nav-btn--next"
                                            onClick={() => setCurrentSlide(Math.min(Math.floor(uniqueTours.length / 3), currentSlide + 1))}
                                            disabled={currentSlide >= Math.floor(uniqueTours.length / 3)}
                                        >
                                            ›
                                        </button>
                                    </>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="dropdown-header__no-tours">
                            <div className="dropdown-header__no-tours-icon">🏖️</div>
                            <h4 className="dropdown-header__no-tours-title">Chưa có tour {isDomestic ? 'trong nước' : 'nước ngoài'}</h4>
                            <p className="dropdown-header__no-tours-text">
                                Chúng tôi đang cập nhật thêm nhiều tour {isDomestic ? 'trong nước' : 'nước ngoài'} hấp dẫn.
                                Vui lòng quay lại sau hoặc liên hệ để được tư vấn.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Render dropdown đơn giản cho tour trong nước/nước ngoài theo vùng miền
    const renderRegionalTourDropdown = () => {
        const categorySlug = activeCategory.slug || activeCategory.fullSlug;
        const categoryName = activeCategory.name;
        const isDomestic = categoryName === 'Tour Trong Nước' ||
                        categoryName === 'Tour trong nước' ||
                        categorySlug === 'tour-trong-nuoc' ||
                        categorySlug.includes('tour-trong-nuoc');

        // Sử dụng memoized grouped destinations
        const groupedDestinations = isDomestic
            ? groupedDomesticDestinations
            : groupedInternationalDestinations;

        return (
            <div className="dropdown-header__content dropdown-header__content--regional">
                {destinationsLoading ? (
                    <div className="dropdown-header__loading">Đang tải điểm đến...</div>
                ) : (
                    <div className="dropdown-header__regional-layout">
                        {/* Sidebar với các vùng miền */}
                        <div className="dropdown-header__regional-sidebar">
                            {Object.keys(groupedDestinations).map((region) => (
                                <div
                                    key={region}
                                    className={`dropdown-header__region-item ${activeRegion === region ? 'dropdown-header__region-item--active' : ''}`}
                                    onMouseEnter={() => setActiveRegion(region)}
                                >
                                    <span className="dropdown-header__region-name">
                                        {isDomestic ? `Tour ${region}` : `Tour ${region}`}
                                    </span>
                                    {isDomestic && (
                                        <div className="dropdown-header__region-destinations">
                                            {Object.keys(groupedDestinations[region]).slice(0, 3).map((group, index) => (
                                                <span key={group} className="dropdown-header__region-preview">
                                                    {group}{index < 2 && Object.keys(groupedDestinations[region]).length > index + 1 ? ', ' : ''}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Main content với header và danh sách điểm đến */}
                        <div className="dropdown-header__regional-content">
                            {/* Header trong content */}
                            <div className="dropdown-header__content-header">
                                <h3>Khám phá các điểm đến</h3>
                            </div>

                            {activeRegion && groupedDestinations[activeRegion] ? (
                                <div className="dropdown-header__destinations-by-region">
                                    {Object.entries(groupedDestinations[activeRegion]).map(([group, destinations]) => (
                                        <div key={group} className="dropdown-header__destination-group">
                                            <h4 className="dropdown-header__group-title">{group}</h4>
                                            <div className="dropdown-header__destinations-grid">
                                                {destinations.map((destination) => {
                                                    const isChecking = checkingTour === destination._id;
                                                    return (
                                                        <div
                                                            key={destination._id || destination.name}
                                                            className={`dropdown-header__destination-item ${isChecking ? 'dropdown-header__destination-item--loading' : ''}`}
                                                            onClick={(event) => !isChecking && handleDestinationClick(destination, event)}
                                                            role="button"
                                                            tabIndex={0}
                                                        >
                                                            <span className="dropdown-header__destination-name">
                                                                {destination.name}
                                                            </span>
                                                            {isChecking && (
                                                                <div className="dropdown-header__destination-spinner"></div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="dropdown-header__placeholder">
                                    <p>Chọn một vùng để xem các điểm đến</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Kiểm tra xem có phải "Ưu đãi mùa hè" không - không hiển thị dropdown
    const isSummerPromo = activeCategory && (
        activeCategory.name.toLowerCase().includes('ưu đãi mùa hè') ||
        activeCategory.name.toLowerCase().includes('mùa hè') ||
        activeCategory.name.toLowerCase().includes('uu dai mua he') ||
        activeCategory.name.toLowerCase().includes('summer') ||
        activeCategory.slug?.includes('uu-dai-mua-he') ||
        activeCategory.slug?.includes('mua-he') ||
        activeCategory.slug?.includes('summer')
    );

    // Không hiển thị dropdown cho "Ưu đãi mùa hè"
    if (!activeCategory || isSummerPromo) return null;

    return (
        <div
            ref={dropdownRef}
            className={`dropdown-header ${activeCategory ? 'dropdown-header--active' : ''}`}
            onMouseEnter={() => {
                // Hủy timeout khi chuột vào dropdown
                if (onCategoryHover) {
                    onCategoryHover(activeCategory);
                }
            }}
            onMouseLeave={handleDropdownLeave}
        >
            <div className="dropdown-header__container">
                {(() => {
                    const categorySlug = activeCategory.slug || activeCategory.fullSlug;
                    const categoryName = activeCategory.name;

                    // Kiểm tra loại dropdown - render carousel cho tất cả categories có "tour"
                    if (isSpecialCategory) {
                        return renderSpecialDropdown();
                    } else if (categoryName === 'Tour Trong Nước' || categoryName === 'Tour trong nước' ||
                               categoryName === 'Tour Nước Ngoài' || categoryName === 'Tour nước ngoài' ||
                               categorySlug === 'tour-trong-nuoc' || categorySlug === 'tour-nuoc-ngoai' ||
                               categorySlug.includes('tour-trong-nuoc') || categorySlug.includes('tour-nuoc-ngoai')) {
                        return renderRegionalTourDropdown();
                    } else if (categoryName && categoryName.toLowerCase().includes('tour')) {
                        return renderSimpleTourDropdown();
                    } else if (categorySlug && categorySlug.includes('tour')) {
                        return renderSimpleTourDropdown();
                    } else {
                        // Fallback cho các category khác
                        return (
                            <div className="dropdown-header__content">
                                <div className="dropdown-header__no-tours">
                                    <div className="dropdown-header__no-tours-icon">📍</div>
                                    <h4 className="dropdown-header__no-tours-title">Đang phát triển</h4>
                                    <p className="dropdown-header__no-tours-text">
                                        Tính năng này đang được phát triển. Vui lòng quay lại sau.
                                    </p>
                                </div>
                            </div>
                        );
                    }
                })()}
            </div>


        </div>
    );
};

// Component hiển thị danh sách các vùng trong sidebar
const SidebarRegionList = React.memo(({ regions, activeRegion, onRegionHover }) => {
    return (
        <div className="dropdown-header__sidebar">
            {Object.keys(regions).map((region) => (
                <div
                    key={region}
                    className={`dropdown-header__category-box ${
                        activeRegion === region ? 'dropdown-header__category-box--active' : ''
                    }`}
                    onMouseEnter={() => onRegionHover(region)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Vùng ${region}`}
                >
                    <h4 className="dropdown-header__category-title">{region}</h4>
                    <p className="dropdown-header__category-description">
                        {Object.keys(regions[region]).length} tỉnh/thành phố
                    </p>
                </div>
            ))}
        </div>
    );
});

// Component hiển thị danh sách các nhóm (tỉnh/thành phố hoặc quốc gia)
const GroupList = React.memo(({ groups, activeGroup, onGroupHover, title }) => {
    if (!groups || Object.keys(groups).length === 0) {
        return (
            <div className="dropdown-header__no-tours">
                <div className="dropdown-header__no-tours-icon">📍</div>
                <h4 className="dropdown-header__no-tours-title">Chưa có dữ liệu</h4>
                <p className="dropdown-header__no-tours-text">
                    Chưa có {title?.toLowerCase()} nào trong vùng này.
                </p>
            </div>
        );
    }

    return (
        <div className="dropdown-header__groups-list">
            <h3 className="dropdown-header__groups-title">{title}</h3>
            <div className="dropdown-header__groups-grid">
                {Object.keys(groups).map((group) => (
                    <div
                        key={group}
                        className={`dropdown-header__group-item ${
                            activeGroup === group ? 'dropdown-header__group-item--active' : ''
                        }`}
                        onMouseEnter={() => onGroupHover(group)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Nhóm ${group}`}
                    >
                        <span className="dropdown-header__group-name">{group}</span>
                        <span className="dropdown-header__group-count">
                            {groups[group].length} điểm đến
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
});

// Component hiển thị danh sách các điểm đến
const DestinationList = React.memo(({ destinations, onDestinationClick, title, checkingTour }) => {
    if (!destinations || destinations.length === 0) {
        return (
            <div className="dropdown-header__no-tours">
                <div className="dropdown-header__no-tours-icon">🏖️</div>
                <h4 className="dropdown-header__no-tours-title">Chưa có điểm đến</h4>
                <p className="dropdown-header__no-tours-text">
                    Chưa có điểm đến nào trong {title?.toLowerCase()}.
                </p>
            </div>
        );
    }

    return (
        <div className="dropdown-header__destinations-list">
            <h3 className="dropdown-header__destinations-title">{title}</h3>
            <div className="dropdown-header__destinations-grid">
                {destinations.map((destination) => {
                    const isChecking = checkingTour === destination._id;
                    return (
                        <div
                            key={destination._id || destination.name}
                            className={`dropdown-header__destination-item ${isChecking ? 'dropdown-header__destination-item--loading' : ''}`}
                            onClick={(event) => !isChecking && onDestinationClick && onDestinationClick(destination, event)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (!isChecking && (event.key === 'Enter' || event.key === ' ')) {
                                    onDestinationClick && onDestinationClick(destination, event);
                                }
                            }}
                            aria-label={`Điểm đến ${destination.name}`}
                            style={{ cursor: isChecking ? 'wait' : 'pointer' }}
                        >
                            <span className="dropdown-header__destination-name">
                                {destination.name}
                                {isChecking && <span className="dropdown-header__loading-spinner">⏳</span>}
                            </span>
                            {destination.info && (
                                <span className="dropdown-header__destination-info">
                                    {isChecking ? 'Đang kiểm tra tour...' : `${destination.info.substring(0, 50)}...`}
                                </span>
                            )}


                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default DropDownHeader;