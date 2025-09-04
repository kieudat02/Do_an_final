import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronDown, Home, Clock, Calendar, Filter, Phone } from 'lucide-react';
import { getTours, getToursBySlug } from '../../../services/TourService';
import { getDepartures } from '../../../services/DepartureService';
import { getDestinations } from '../../../services/DestinationService';
import { useDebounce } from '../../../hooks/useDebounce';
import Loading from '../../common/Loading/Loading';
import { PLACEHOLDER_IMAGES } from '../../../utils/placeholderImage';
import { useBreadcrumb } from '../../../contexts/BreadcrumbContext';
import './TourList.scss';
import WhyChooseNDTravel from '../../common/WhyChooseNDTravel/WhyChooseNDTravel';

//Component để xử lý text truncation với show more/less
const TruncatedText = ({ text, maxLength = 150, className = "", element = "p" }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const Element = element;
  if (text.length <= maxLength) {
    return <Element className={className}>{text}</Element>;
  }
  const truncatedText = text.slice(0, maxLength);
  return (
    <Element className={className}>
      {isExpanded ? text : `${truncatedText}...`}
      <button
        className="text-toggle-btn"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? 'Thu gọn' : 'Xem thêm'}
      </button>
    </Element>
  );
};

const TourList = () => {
  const { slug } = useParams();
  const { setBreadcrumbData } = useBreadcrumb();
  const topRef = useRef(null);

  // Utility function để cuộn lên đầu trang
  const scrollToTop = (immediate = false) => {
    const scrollToTopAction = () => {
      // Method 1: Scroll bằng ref
      if (topRef.current) {
        topRef.current.scrollIntoView({
          behavior: immediate ? 'auto' : 'smooth',
          block: 'start'
        });
      }

      // Method 2: Window scroll
      if (immediate) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    // Execute immediately
    scrollToTopAction();

    // Execute with requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      scrollToTopAction();
    });

    // Final fallback
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, immediate ? 50 : 500);
  };
  //Bộ lọc hiển thị trên thiết bị di động
  const [filterVisible, setFilterVisible] = useState(false);
  //Các tham số bộ lọc
  const [sortBy, setSortBy] = useState('RECOMMENDED');
  const [whereFrom, setWhereFrom] = useState('0');
  const [numDay, setNumDay] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDestination, setSelectedDestination] = useState(''); // Có thể là string (single ID) hoặc array (multiple IDs)
  const [selectedDestinationType, setSelectedDestinationType] = useState('');
  const [phone, setPhone] = useState('');
  //Dữ liệu API
  const [tours, setTours] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreTours, setHasMoreTours] = useState(true);
  const [currentCategory, setCurrentCategory] = useState(null);

  // State cho dropdown menu châu lục và miền
  const [expandedContinent, setExpandedContinent] = useState(null);
  const [domesticDestinations, setDomesticDestinations] = useState([]);
  const [internationalDestinations, setInternationalDestinations] = useState([]);

  
  const TOURS_PER_PAGE = 5;

  const parseNumber = (value) => {
  if (!value) return undefined;
  // Loại bỏ kí tự không phải số (như dấu chấm)
  const numeric = value.toString().replace(/\D+/g, '');
  const num = parseInt(numeric, 10);
  return isNaN(num) ? undefined : num;
  };

  const debouncedNumDay = useDebounce(numDay, 500);
  const debouncedMinPrice = useDebounce(minPrice, 500);
  const debouncedMaxPrice = useDebounce(maxPrice, 500);



  //Xây dựng object tham số truy vấn dựa vào bộ lọc và trang hiện tại.
  const buildParams = (page) => {
    const params = {
      page,
      limit: TOURS_PER_PAGE,
      sortBy: sortBy !== 'RECOMMENDED' ? sortBy : undefined,
      departure: whereFrom !== '0' ? whereFrom : undefined,
      duration: parseNumber(debouncedNumDay),
      minPrice: parseNumber(debouncedMinPrice),
      maxPrice: parseNumber(debouncedMaxPrice),
      category: slug ? undefined : (selectedCategory || undefined),
      // Xử lý destination: nếu là array thì join bằng dấu phẩy, nếu không thì giữ nguyên
      destination: selectedDestination ?
        (Array.isArray(selectedDestination) ? selectedDestination.join(',') : selectedDestination) :
        undefined,
      destinationType: selectedDestinationType || undefined,
    };
    // Xóa các khoá có giá trị undefined để không gửi thừa param
    Object.keys(params).forEach((key) => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });
    return params;
  };

  //Tìm nạp các tour du lịch từ API
  const fetchTours = async (page = 1, isLoadMore = false, isCategoryFilter = false) => {
    try {
      if (!isLoadMore) {
        if (isCategoryFilter) {
          // Set loading cho category filter
          setLoadingCategory(true);
        } else {
          setLoading(true);
        }
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const params = buildParams(page);
      let apiCall;

      if (slug) {
        // Chuẩn hóa slug legacy: bỏ .html và tiền tố số
        const normalizedSlug = (slug || '')
          .toString()
          .toLowerCase()
          .replace(/\.html$/i, '')
          .replace(/^category-/, '')
          .replace(/^\d+-/, '');
        apiCall = getToursBySlug(normalizedSlug, params);
      } else {
        apiCall = getTours(params);
      }

      //Thêm thời gian tải tối thiểu để tránh nhấp nháy
      const promises = [apiCall];
      if (!isLoadMore && !isCategoryFilter) {
        promises.push(new Promise(resolve => setTimeout(resolve, 500)));
      }

      const [response] = await Promise.all(promises);
      const { tours: data, pagination, category, categoryInfo } = response.data;

      // Cập nhật danh sách tour
      setTours((prevTours) => (isLoadMore ? [...prevTours, ...data] : data));
      setCurrentPage(page);
      setHasMoreTours(pagination.hasNext || false);
      setCurrentCategory(categoryInfo || category || null);
    } catch (err) {
      console.error('Error fetching tours:', err);
      setError('Không thể tải danh sách tour. Vui lòng thử lại sau.');
      if (!isLoadMore) {
        setTours([]);
        setHasMoreTours(false);
        setCurrentCategory(null);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setLoadingCategory(false);
    }
  };

  //Lấy danh sách điểm xuất phát cho dropdown lọc.
  const fetchDepartures = async () => {
    try {
      const response = await getDepartures();
      setDepartures(response.data.data); 
    } catch (err) {
      console.error('Error fetching departures:', err);
      setDepartures([]);
    }
  };

  //Tải dữ liệu ban đầu khi component mount
  useEffect(() => {
    // Cuộn lên đầu trang khi component mount
    scrollToTop(true);

    fetchTours(1, false);
    fetchDepartures();

    // Lấy danh sách destinations để tạo menu châu lục và miền
    async function fetchDestinationsList() {
      try {
        // Fetch destinations cho tour trong nước
        const domesticResponse = await getDestinations({ type: 'Trong nước' });
        const domesticData = domesticResponse.data.data;
        setDomesticDestinations(Array.isArray(domesticData) ? domesticData : []);

        // Fetch destinations cho tour nước ngoài
        const internationalResponse = await getDestinations({ type: 'Nước ngoài' });
        const internationalData = internationalResponse.data.data;
        setInternationalDestinations(Array.isArray(internationalData) ? internationalData : []);
      } catch (err) {
        console.error('Error fetching destinations:', err);
        setDomesticDestinations([]);
        setInternationalDestinations([]);
      }
    }
    fetchDestinationsList();
  }, [slug]);

  //Cập nhật tour khi bộ lọc thay đổi (sau debounce)
  useEffect(() => {
    if (!loading) {
      // Fetch tours khi có thay đổi filter, bất kể có slug hay không
      if (!slug) {
        // Trang tổng hợp tours
        fetchTours(1, false, true);
      } else {
        // Trang category có slug - luôn fetch khi có thay đổi filter (bao gồm cả seasonal tours)
        fetchTours(1, false, true);
      }
    }
  }, [selectedCategory, selectedDestination, selectedDestinationType]);

  // Cuộn lên đầu trang khi tours được load xong (sau khi filter)
  useEffect(() => {
    if (!loadingCategory && !loading && tours.length > 0) {
      // Đảm bảo cuộn lên đầu trang sau khi tours được render
      scrollToTop();
    }
  }, [tours, loadingCategory, loading]);

  // Cuộn lên đầu trang khi slug thay đổi (chuyển category)
  useEffect(() => {
    if (slug) {
      scrollToTop();
    }
  }, [slug]);

  // Cập nhật breadcrumb khi currentCategory thay đổi (chỉ khi có slug)
  useEffect(() => {
    if (slug) {
      if (currentCategory) {
        setBreadcrumbData({
          categoryName: currentCategory.name || currentCategory.pageTitle,
          categorySlug: currentCategory.slug || currentCategory.fullSlug,
          tourTitle: null,
          customItems: null
        });
      } else {
        // Fallback khi có slug nhưng chưa load được category
        setBreadcrumbData({
          categoryName: 'Danh mục tour',
          categorySlug: slug,
          tourTitle: null,
          customItems: null
        });
      }
    }
    // Không set breadcrumb khi không có slug - để Tours page handle
  }, [currentCategory, slug, setBreadcrumbData]);

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  //Định dạng ngày thành dd/mm/yyyy theo locale vi-VN.
  const formatDate = (date) => new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  //Tính số ngày và đêm của tour từ startDate và endDate.
  const computeDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} ngày ${diffDays - 1} đêm`;
  };


  const handleSubmitFilter = (e) => {
    e.preventDefault();
    fetchTours(1, false);
  };

  const handleSubmitPhone = async () => {
      try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      // Có thể reset phone hoặc hiển thị thông báo thành công
      setPhone('');
      alert('Đã gửi thông tin tư vấn, chúng tôi sẽ liên hệ sớm!');
    } catch (err) {
      console.error('Error submitting phone:', err);
      alert('Gửi thất bại, vui lòng thử lại sau.');
    }
  };

  const handleLoadMore = () => {
    if (hasMoreTours && !loadingMore) {
      fetchTours(currentPage + 1, true);
    }
  };





  // Handler cho seasonal tours
  const handleDestinationTypeFilter = (destinationType) => {
    setSelectedDestinationType(destinationType);
    setSelectedDestination(''); // Reset về empty string
    setCurrentPage(1);

    // Cuộn lên đầu trang khi chọn danh mục
    scrollToTop();

    // Không gọi fetchTours trực tiếp ở đây, để useEffect xử lý
    // useEffect sẽ tự động trigger khi selectedDestinationType thay đổi
  };



  // Helper functions để nhóm dữ liệu điểm đến (tương tự dropdown header)
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

    return grouped;
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

    return grouped;
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
               nameLower.includes('nha trang') || nameLower.includes('khánh hòa') || nameLower.includes('đà lạt') ||
               nameLower.includes('lâm đồng') || nameLower.includes('quy nhon') || nameLower.includes('bình định')) {
      return 'Miền Trung';
    } else if (nameLower.includes('hồ chí minh') || nameLower.includes('sài gòn') || nameLower.includes('vũng tàu') ||
               nameLower.includes('phú quốc') || nameLower.includes('cần thơ') || nameLower.includes('an giang') ||
               nameLower.includes('đồng tháp') || nameLower.includes('tiền giang') || nameLower.includes('bến tre') ||
               nameLower.includes('cà mau') || nameLower.includes('kiên giang') || nameLower.includes('long an')) {
      return 'Miền Nam';
    }

    return 'Miền Bắc'; // Mặc định
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

  // Logic xác định loại menu dựa trên slug và category
  const determineMenuType = (slug, currentCategory) => {
    if (!slug) return 'full'; // Trang tổng hợp tours

    // Kiểm tra slug cho các loại tour cụ thể
    if (slug.includes('trong-nuoc')) return 'domestic-only';
    if (slug.includes('nuoc-ngoai')) return 'international-only';

    // Kiểm tra seasonal tours - mở rộng các pattern cho tour mùa thu và lễ 2/9
    const seasonalPatterns = [
      'mua-thu', 'le-2-9', 'le-30-4', 'le-1-5', 'tet', 'noel', 'giang-sinh',
      'summer', 'winter', 'spring', 'autumn', 'festival', 'holiday',
      'quoc-khanh', 'doc-lap', 'thong-nhat', 'phu-nu', 'lao-dong'
    ];

    const isSeasonalSlug = seasonalPatterns.some(pattern => slug.includes(pattern));
    const isSeasonalCategory = currentCategory?.name && (
      currentCategory.name.toLowerCase().includes('mùa') ||
      currentCategory.name.toLowerCase().includes('lễ') ||
      currentCategory.name.toLowerCase().includes('tết') ||
      currentCategory.name.toLowerCase().includes('festival') ||
      currentCategory.name.toLowerCase().includes('holiday') ||
      currentCategory.name.toLowerCase().includes('quốc khánh') ||
      currentCategory.name.toLowerCase().includes('độc lập') ||
      currentCategory.name.toLowerCase().includes('2/9') ||
      currentCategory.name.toLowerCase().includes('30/4') ||
      currentCategory.name.toLowerCase().includes('1/5')
    );

    if (isSeasonalSlug || isSeasonalCategory) return 'seasonal';

    return 'full'; // fallback
  };

  const menuType = useMemo(() => {
    return determineMenuType(slug, currentCategory);
  }, [slug, currentCategory]);

  // Memoized grouped destinations để tránh tính toán lại không cần thiết
  const groupedDomesticDestinations = useMemo(() => {
    return groupDestinationsByRegion(domesticDestinations);
  }, [domesticDestinations]);

  const groupedInternationalDestinations = useMemo(() => {
    return groupDestinationsByContinent(internationalDestinations);
  }, [internationalDestinations]);

  // Xử lý click vào châu lục/miền để toggle dropdown
  const handleContinentClick = (continent) => {
    setExpandedContinent(expandedContinent === continent ? null : continent);
  };

  // Xử lý filter theo destination (quốc gia/tỉnh thành) - lấy tất cả destinations của tỉnh
  const handleDestinationFilter = (destinations) => {
    // Lấy tất cả destination IDs của tỉnh/quốc gia này
    const destinationIds = destinations.map(dest => dest._id);
    setSelectedDestination(destinationIds); // Lưu array thay vì single ID
    setSelectedCategory(''); // Clear category filter khi chọn destination
    setSelectedDestinationType(''); // Clear destination type filter (cho seasonal tours)
    setCurrentPage(1);

    // Cuộn lên đầu trang khi chọn danh mục
    scrollToTop();

    // Không gọi fetchTours trực tiếp ở đây, để useEffect xử lý
    // useEffect sẽ tự động trigger khi selectedDestination thay đổi
  };

  // Helper function để kiểm tra xem tỉnh có được chọn không
  const isProvinceSelected = (destinations) => {
    if (!selectedDestination || !Array.isArray(selectedDestination)) {
      return false;
    }
    const destinationIds = destinations.map(dest => dest._id);
    return destinationIds.some(id => selectedDestination.includes(id));
  };

  // Render functions cho từng loại menu
  const renderDomesticOnlyMenu = () => (
    <>
      {Object.entries(groupedDomesticDestinations).map(([region, provinces]) => (
        <div key={region} className="categories__item categories__item--expandable">
          <div
            className="categories__link categories__link--expandable"
            onClick={() => handleContinentClick(region)}
            style={{ cursor: 'pointer' }}
          >
            <span>{region}</span>
            <ChevronDown
              className={`categories__chevron ${expandedContinent === region ? 'categories__chevron--expanded' : ''}`}
            />
          </div>

          {expandedContinent === region && (
            <div className="categories__submenu">
              {Object.entries(provinces).map(([province, destinations]) => {
                return (
                  <div key={province} className="categories__submenu-item">
                    <div
                      className={`categories__submenu-link ${isProvinceSelected(destinations) ? 'categories__submenu-link--active' : ''}`}
                      onClick={() => handleDestinationFilter(destinations)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span>{province}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </>
  );

  const renderInternationalOnlyMenu = () => (
    <>
      {Object.entries(groupedInternationalDestinations).map(([continent, countries]) => (
        <div key={continent} className="categories__item categories__item--expandable">
          <div
            className="categories__link categories__link--expandable"
            onClick={() => handleContinentClick(continent)}
            style={{ cursor: 'pointer' }}
          >
            <span>{continent}</span>
            <ChevronDown
              className={`categories__chevron ${expandedContinent === continent ? 'categories__chevron--expanded' : ''}`}
            />
          </div>

          {expandedContinent === continent && (
            <div className="categories__submenu">
              {Object.entries(countries).map(([country, destinations]) => {
                return (
                  <div key={country} className="categories__submenu-item">
                    <div
                      className={`categories__submenu-link ${isProvinceSelected(destinations) ? 'categories__submenu-link--active' : ''}`}
                      onClick={() => handleDestinationFilter(destinations)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span>{country}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </>
  );

  const renderSeasonalMenu = () => {
    // Lấy tên seasonal từ category hoặc từ slug
    let seasonName = '';

    if (currentCategory?.name) {
      // Xử lý tên category để lấy phần seasonal
      seasonName = currentCategory.name
        .replace(/^Tour\s+/i, '')
        .replace(/^tour\s+/i, '')
        .trim();
    } else if (slug) {
      // Fallback từ slug nếu không có category name - mở rộng cho tour mùa thu và lễ 2/9
      const seasonalMappings = {
        'mua-thu': 'Mùa thu',
        'le-2-9': 'Lễ 2/9',
        'le-30-4': 'Lễ 30/4',
        'le-1-5': 'Lễ 1/5',
        'tet': 'Tết',
        'noel': 'Noel',
        'giang-sinh': 'Giáng sinh',
        'summer': 'Mùa hè',
        'winter': 'Mùa đông',
        'spring': 'Mùa xuân',
        'autumn': 'Mùa thu',
        'quoc-khanh': 'Quốc khánh',
        'doc-lap': 'Độc lập',
        'thong-nhat': 'Thống nhất',
        'phu-nu': 'Phụ nữ',
        'lao-dong': 'Lao động'
      };

      // Tìm mapping phù hợp từ slug
      for (const [key, value] of Object.entries(seasonalMappings)) {
        if (slug.includes(key)) {
          seasonName = value;
          break;
        }
      }

      // Nếu không tìm thấy mapping, sử dụng slug làm fallback
      if (!seasonName) {
        seasonName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    }

    // Fallback cuối cùng
    if (!seasonName) {
      seasonName = 'Tour đặc biệt';
    }

    return (
      <>
        <div
          className={`categories__item ${selectedDestinationType === 'Trong nước' ? 'categories__item--active' : ''}`}
          onClick={() => handleDestinationTypeFilter('Trong nước')}
          style={{ cursor: 'pointer' }}
        >
          <span className="categories__link">{seasonName} trong nước</span>
        </div>

        <div
          className={`categories__item ${selectedDestinationType === 'Nước ngoài' ? 'categories__item--active' : ''}`}
          onClick={() => handleDestinationTypeFilter('Nước ngoài')}
          style={{ cursor: 'pointer' }}
        >
          <span className="categories__link">{seasonName} nước ngoài</span>
        </div>
      </>
    );
  };

  const renderFullMenu = () => (
    <>
      {/* Tour trong nước với dropdown miền */}
      <div className="categories__item categories__item--expandable">
        <div
          className="categories__link categories__link--expandable"
          onClick={() => handleContinentClick('domestic')}
          style={{ cursor: 'pointer' }}
        >
          <span>Tour trong nước</span>
          <ChevronDown
            className={`categories__chevron ${expandedContinent === 'domestic' ? 'categories__chevron--expanded' : ''}`}
          />
        </div>

        {expandedContinent === 'domestic' && (
          <div className="categories__submenu">
            {Object.entries(groupedDomesticDestinations).map(([region, provinces]) => (
              <div key={region} className="categories__submenu-item">
                <div
                  className="categories__submenu-link"
                  onClick={() => handleContinentClick(region)}
                  style={{ cursor: 'pointer' }}
                >
                  <span>{region}</span>
                  <ChevronDown
                    className={`categories__chevron ${expandedContinent === region ? 'categories__chevron--expanded' : ''}`}
                  />
                </div>

                {expandedContinent === region && (
                  <div className="categories__submenu-countries">
                    {Object.entries(provinces).map(([province, destinations]) => {
                      return (
                        <div key={province} className="categories__province-group">
                          <div
                            className={`categories__province-title ${isProvinceSelected(destinations) ? 'categories__province-title--active' : ''}`}
                            onClick={() => handleDestinationFilter(destinations)}
                            style={{ cursor: 'pointer' }}
                          >
                            {province}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tour nước ngoài với dropdown châu lục */}
      <div className="categories__item categories__item--expandable">
        <div
          className="categories__link categories__link--expandable"
          onClick={() => handleContinentClick('international')}
          style={{ cursor: 'pointer' }}
        >
          <span>Tour nước ngoài</span>
          <ChevronDown
            className={`categories__chevron ${expandedContinent === 'international' ? 'categories__chevron--expanded' : ''}`}
          />
        </div>

        {expandedContinent === 'international' && (
          <div className="categories__submenu">
            {Object.entries(groupedInternationalDestinations).map(([continent, countries]) => (
              <div key={continent} className="categories__submenu-item">
                <div
                  className="categories__submenu-link"
                  onClick={() => handleContinentClick(continent)}
                  style={{ cursor: 'pointer' }}
                >
                  <span>{continent}</span>
                  <ChevronDown
                    className={`categories__chevron ${expandedContinent === continent ? 'categories__chevron--expanded' : ''}`}
                  />
                </div>

                {expandedContinent === continent && (
                  <div className="categories__submenu-countries">
                    {Object.entries(countries).map(([country, destinations]) => {
                      return (
                        <div key={country} className="categories__province-group">
                          <div
                            className={`categories__province-title ${isProvinceSelected(destinations) ? 'categories__province-title--active' : ''}`}
                            onClick={() => handleDestinationFilter(destinations)}
                            style={{ cursor: 'pointer' }}
                          >
                            {country}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  // Tính giá gốc/giá sau giảm từ tourDetails
  const computeDiscountFromDetails = (details) => {
    if (!Array.isArray(details) || details.length === 0) return null;
    let bestFinal = Number.POSITIVE_INFINITY;
    let bestBase = 0;
    for (const d of details) {
      const prices = [d?.adultPrice || 0, d?.childrenPrice || 0, d?.childPrice || 0, d?.babyPrice || 0].filter((p) => p > 0);
      if (prices.length === 0) continue;
      const base = (d?.adultPrice && d.adultPrice > 0) ? d.adultPrice : Math.min(...prices);
      let final = base;
      if (d?.discount && d.discount > 0) {
        final = base - (base * d.discount / 100);
      }
      if (final < bestFinal) {
        bestFinal = final;
        bestBase = base;
      }
    }
    if (!isFinite(bestFinal) || bestFinal <= 0) return null;
    const roundThousand = (v) => Math.round((v || 0) / 1000) * 1000;
    const roundedBase = roundThousand(bestBase);
    const roundedFinal = roundThousand(bestFinal);
    const percent = roundedBase > roundedFinal ? Math.round(((roundedBase - roundedFinal) / roundedBase) * 100) : 0;
    return { original: roundedBase, final: roundedFinal, percent };
  };

  //Đang tải trạng thái
  if (loading) {
    return (
      <div className="tour-listing">
        {/* Header Skeleton */}
        <div className="tour-listing__header">
          <div className="tour-listing__skeleton tour-listing__skeleton--title"></div>
          <div className="tour-listing__skeleton tour-listing__skeleton--description"></div>
        </div>

        <div className="tour-listing__container">
          <div className="tour-listing__content">
            {/* Main Content Skeleton */}
            <main className="tour-listing__main">
              {/* Mobile Filter Skeleton */}
              <div className="tour-listing__skeleton tour-listing__skeleton--mobile-filter"></div>

              {/* Tour Cards Skeleton */}
              <section className="tour-listing__tours">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="tour-listing__skeleton tour-listing__skeleton--tour-card">
                    <div className="tour-listing__skeleton tour-listing__skeleton--tour-image"></div>
                    <div className="tour-listing__skeleton-content">
                      <div className="tour-listing__skeleton tour-listing__skeleton--tour-title"></div>
                      <div className="tour-listing__skeleton tour-listing__skeleton--tour-info"></div>
                      <div className="tour-listing__skeleton tour-listing__skeleton--tour-info"></div>
                      <div className="tour-listing__skeleton tour-listing__skeleton--tour-info"></div>
                      <div className="tour-listing__skeleton tour-listing__skeleton--tour-price"></div>
                      <div className="tour-listing__skeleton tour-listing__skeleton--tour-button"></div>
                    </div>
                  </div>
                ))}
              </section>
            </main>

            {/* Sidebar Skeleton */}
            <aside className="tour-listing__sidebar">
              <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-section">
                <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-title"></div>
                <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-content"></div>
                <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-content"></div>
                <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-content"></div>
              </div>
              <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-section">
                <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-title"></div>
                <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-content"></div>
                <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-content"></div>
              </div>
              <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-section">
                <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-title"></div>
                <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-content"></div>
                <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-content"></div>
                <div className="tour-listing__skeleton tour-listing__skeleton--sidebar-content"></div>
              </div>
            </aside>
          </div>
        </div>

        {/* Loading Overlay */}
        <Loading
          overlay={true}
          size="large"
          text="Đang tải danh sách tour..."
        />
      </div>
    );
  }

  // Error state
  if (error && tours.length === 0 && !loading) {
    return (
      <div className="tour-listing">
        <div className="tour-listing__error">
          <div className="tour-listing__error-content">
            <svg className="tour-listing__error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h2 className="tour-listing__error-title">Không thể tải danh sách tour</h2>
            <p className="tour-listing__error-message">{error}</p>
            <button
              className="tour-listing__error-retry"
              onClick={() => fetchTours(1, false)}
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tour-listing" ref={topRef}>
      <div className="tour-listing__container">
        {/* Header */}
          <header className="tour-listing__header">
              <div className="tour-listing__title-wrapper">
                <h1 className="tour-listing__title">{(currentCategory?.pageTitle && currentCategory.pageTitle.trim()) || currentCategory?.name || 'Danh sách tour'}</h1>
                <div className="tour-listing__title-underline"></div>
              </div>
              <TruncatedText
              text={(currentCategory?.pageSubtitle && currentCategory.pageSubtitle.trim()) || currentCategory?.description || 'Khám phá các hành trình hấp dẫn được ND Travel tuyển chọn dành riêng cho bạn.'}
              maxLength={160}
              className="tour-listing__description"
          />
        </header>

        <div className="tour-listing__content">
          {/* Main Content */}
          <main className="tour-listing__main">
            {/* Mobile Filter Button */}
            <div className="tour-listing__mobile-filter">
              <button
                className="tour-listing__filter-toggle"
                onClick={() => setFilterVisible(!filterVisible)}
              >
                <Filter className="tour-listing__filter-icon" />
                Lọc
              </button>
            </div>

            {/* Tour List */}
            <section className="tour-listing__tours">
              {/* Loading overlay khi filter theo category */}
              {loadingCategory && (
                <div className="tour-listing__category-loading">
                  <Loading
                    size="medium"
                    text="Đang lọc..."
                    variant="spinner"
                  />
                </div>
              )}

              {tours.length === 0 && !loadingCategory ? (
                <div className="tour-listing__no-results">
                  <p>
                    {(selectedDestination && (Array.isArray(selectedDestination) ? selectedDestination.length > 0 : selectedDestination))
                      ? 'Không tìm thấy tour nào cho điểm đến này.'
                      : selectedDestinationType
                        ? `Không tìm thấy tour ${selectedDestinationType.toLowerCase()} nào cho ${currentCategory?.name || 'danh mục này'}.`
                        : 'Không tìm thấy tour nào phù hợp với tiêu chí tìm kiếm.'
                    }
                  </p>
                  {error && (
                    <button
                      className="tour-listing__retry-btn"
                      onClick={() => fetchTours(1, false)}
                    >
                      Thử lại
                    </button>
                  )}
                </div>
              ) : (
                <>                
                  {tours.map((tour) => {
                    const duration = computeDuration(tour.startDate, tour.endDate);
                    const imageUrl = tour.images && tour.images.length > 0 ? tour.images[0] : PLACEHOLDER_IMAGES.TOUR_CARD;
                    // Ưu tiên dùng giá từ API; chỉ fallback tính toán khi API thiếu
                    const hasApiPricing = Number.isFinite(tour?.discountPrice) || Number.isFinite(tour?.originalPrice);
                    const computed = hasApiPricing ? null : computeDiscountFromDetails(tour.tourDetails);
                    const pickNumber = (v, fallback) => (Number.isFinite(v) ? v : fallback);
                    const originalPrice = pickNumber(
                      tour?.originalPrice,
                      pickNumber(computed?.original, pickNumber(tour?.maxPrice, pickNumber(tour?.price, tour?.minPrice)))
                    ) || 0;
                    const discountPrice = pickNumber(
                      tour?.discountPrice ?? tour?.price,
                      pickNumber(computed?.final, pickNumber(tour?.price, tour?.minPrice))
                    ) || 0;
                    const discountPercent = pickNumber(
                      tour?.discountPercent,
                      (computed?.percent ?? (originalPrice > 0 && originalPrice > discountPrice
                        ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
                        : 0))
                    );
                    return (
                      <article key={tour._id} className="tour-item">
                        <div className="tour-item__image">
                          <img className="tour-item__img" src={imageUrl} alt={tour.title} />
                        </div>

                        <div className="tour-item__content">
                          <Link to={`/tour/${tour._id}`} state={{ categorySlug: currentCategory?.slug }} className="tour-item__title">
                            {tour.title}
                          </Link>
                          <div className="tour-item__details">
                            <div className="tour-item__info">
                              <ul className="tour-item__info-list">
                                <li className="tour-item__info-item">
                                  <Home className="tour-item__info-icon" />
                                  <span className="tour-item__info-text">
                                    Điểm khởi hành: {tour.departure?.name || 'Chưa xác định'}
                                  </span>
                                </li>
                                <li className="tour-item__info-item">
                                  <Clock className="tour-item__info-icon" />
                                  <span className="tour-item__info-text">Thời gian: {duration}</span>
                                </li>
                                <li className="tour-item__info-item">
                                  <Calendar className="tour-item__info-icon" />
                                  <span className="tour-item__info-text">
                                    Khởi hành: {formatDate(tour.startDate)} - {formatDate(tour.endDate)}
                                  </span>
                                </li>
                              </ul>
                              <hr className="tour-item__divider" />
                            </div>

                            <div className="tour-item__pricing">
                              <div className="tour-item__price tour-item__price--current">
                                {formatPrice(discountPrice)}
                              </div>
                              {discountPercent > 0 && (
                                <div className="tour-item__price tour-item__price--original">
                                  {formatPrice(originalPrice)}
                                </div>
                              )}
                              <Link
                                className="tour-item__btn"
                                to={`/tour/${tour._id}`}
                                state={{ categorySlug: currentCategory?.slug }}
                              >
                                Xem chi tiết
                              </Link>
                            </div>
                          </div>

                          {/* Hiển thị promotions */}
                          {((tour.promotions && tour.promotions.length > 0) || tour.promotion) && (
                            <ul className="tour-item__promotions">
                              {/* Ưu tiên hiển thị promotions mới */}
                              {tour.promotions && tour.promotions.length > 0 ? (
                                tour.promotions.map((promo, index) => (
                                  <li key={index} className="tour-item__promotion">
                                    {promo.label}
                                  </li>
                                ))
                              ) : (
                                tour.promotion && (
                                  <li className="tour-item__promotion">{tour.promotion}</li>
                                )
                              )}
                            </ul>
                          )}
                        </div>
                      </article>
                    );
                  })}

                  {hasMoreTours && (
                    <div className="tour-listing__load-more">
                      <button
                        className="tour-listing__load-btn"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <>
                            <div className="tour-listing__load-spinner"></div>
                            Đang tải...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="tour-listing__load-icon" />
                            Xem thêm
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </main>

          {/* Sidebar */}
          <aside className="tour-listing__sidebar">
            {/* Filter Section */}
            <div className="filter">
              <div className="filter__header">
                <h3 className="filter__title">Lọc và sắp xếp</h3>
                <div className="filter__title-underline"></div>
              </div>

              <form className="filter__form" onSubmit={handleSubmitFilter}>
                <div className="filter__group">
                  <label className="filter__label">Điểm xuất phát</label>
                  <select
                    className="filter__select"
                    value={whereFrom}
                    onChange={(e) => setWhereFrom(e.target.value)}
                  >
                    <option value="0">Tất cả</option>
                    {departures.map((departure) => (
                      <option key={departure._id} value={departure._id}>
                        {departure.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter__group">
                  <label className="filter__label">Thời gian tour (ngày)</label>
                  <input
                    className="filter__input"
                    type="text"
                    placeholder="Nhập số ngày"
                    value={numDay}
                    onChange={(e) => setNumDay(e.target.value)}
                  />
                </div>

                <div className="filter__group">
                  <label className="filter__label">Mức giá</label>
                  <input
                    className="filter__input filter__input--price"
                    type="text"
                    placeholder="Từ giá, ví dụ: 3.000.000"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <span className="filter__price-separator">đến</span>
                  <input
                    className="filter__input filter__input--price"
                    type="text"
                    placeholder="Đến giá, ví dụ 10.000.000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>

                <div className="filter__group">
                  <label className="filter__label">Sắp xếp theo</label>
                  <select
                    className="filter__select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="RECOMMENDED">ND Travel gợi ý</option>
                    <option value="PRICE_ASC">Giá tăng dần</option>
                    <option value="PRICE_DESC">Giá giảm dần</option>
                    <option value="DURATION_ASC">Thời lượng tour tăng dần</option>
                    <option value="DURATION_DESC">Thời lượng tour giảm dần</option>
                  </select>
                </div>

                <button
                  className="filter__btn"
                  type="submit"
                  disabled={loading || loadingMore || loadingCategory}
                >
                  {(loading || loadingCategory) ? (
                    <>
                      <div className="filter__btn-spinner"></div>
                      Đang lọc...
                    </>
                  ) : (
                    'Áp dụng'
                  )}
                </button>
              </form>
            </div>

            {/* Categories Section */}
            <div className="categories">
              <div className="categories__header">
                <h3 className="categories__title">Danh mục</h3>
                <div className="categories__title-underline"></div>
              </div>

              <div className="categories__list">
                {menuType === 'domestic-only' && renderDomesticOnlyMenu()}
                {menuType === 'international-only' && renderInternationalOnlyMenu()}
                {menuType === 'seasonal' && renderSeasonalMenu()}
                {menuType === 'full' && renderFullMenu()}
              </div>
            </div>

            {/* Contact Section */}
            <div className="contact">
              <div className="contact__header">
                <h3 className="contact__title">Gọi ngay để được tư vấn</h3>
              </div>

              <div className="contact__content">
                <div className="contact__hotline">
                  <div className="contact__hotline-icon">
                    <Phone className="contact__phone-icon" />
                  </div>
                  <div className="contact__hotline-info">
                    <div className="contact__hotline-label">Hotline</div>
                    <div className="contact__hotline-number">0972 122 555</div>
                  </div>
                </div>

                <div className="contact__form" onSubmit={handleSubmitPhone}>
                  <div className="contact__form-note">Hoặc gửi yêu cầu tư vấn</div>
                  <div className="contact__form-wrapper">
                    <input
                      className="contact__input"
                      type="tel"
                      placeholder="SĐT của tôi"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      pattern="^(0|\+84)[0-9]{9}$"
                    />
                    <button
                      className="contact__btn"
                      onClick={handleSubmitPhone}
                    >
                      Gửi
                    </button>
                  </div>
                  <div className="contact__note">ND Travel sẽ liên hệ với bạn</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
        <WhyChooseNDTravel/>
      </div>
    </div>
  );
};

export default TourList;