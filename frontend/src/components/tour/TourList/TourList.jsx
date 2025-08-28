import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronDown, Home, Clock, Calendar, Filter, Phone } from 'lucide-react';
import { getTours, getToursBySlug } from '../../../services/TourService';
import { getDepartures } from '../../../services/DepartureService';
import { getCategories } from '../../../services/CategoriesService';
import { useDebounce } from '../../../hooks/useDebounce';
import Loading from '../../common/Loading/Loading';
import { PLACEHOLDER_IMAGES } from '../../../utils/placeholderImage';
import { createFrontendSlug } from '../../../utils/slugUtils';
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
  const navigate = useNavigate();
  const { slug } = useParams();
  const { setBreadcrumbData } = useBreadcrumb();
  //Bộ lọc hiển thị trên thiết bị di động
  const [filterVisible, setFilterVisible] = useState(false);
  //Các tham số bộ lọc
  const [sortBy, setSortBy] = useState('RECOMMENDED');
  const [whereFrom, setWhereFrom] = useState('0');
  const [numDay, setNumDay] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [phone, setPhone] = useState('');
  //Dữ liệu API
  const [tours, setTours] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreTours, setHasMoreTours] = useState(true);
  const [totalTours, setTotalTours] = useState(0);
  const [currentCategory, setCurrentCategory] = useState(null);

  
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
        if (isCategoryFilter && !loadingCategory) {
          // Chỉ set loading nếu chưa được set trước đó
          setLoadingCategory(true);
        } else if (!isCategoryFilter) {
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
      setTotalTours(pagination.totalItems);
      setHasMoreTours(pagination.hasNext || false);
      setCurrentCategory(categoryInfo || category || null);
    } catch (err) {
      console.error('Error fetching tours:', err);
      setError('Không thể tải danh sách tour. Vui lòng thử lại sau.');
      if (!isLoadMore) {
        setTours([]);
        setTotalTours(0);
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
    fetchTours(1, false);
    fetchDepartures();
    // Nếu API cung cấp danh mục tour, gọi để lấy danh sách
    async function fetchCategoriesList() {
      try {
        const response = await getCategories();
        const data = response.data.data;
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setCategories([]);
      }
    }
    fetchCategoriesList();
  }, [slug]);

  //Cập nhật tour khi bộ lọc thay đổi (sau debounce)
  useEffect(() => {
    if (!loading && !slug) {
      fetchTours(1, false, true);
    }
  }, [selectedCategory]);

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
  }, [currentCategory, slug]);

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

  const handleViewTourDetail = (tour) => {
    if (tour?._id) {
      navigate(`/tour/${tour._id}`);
    }
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1); 

    // Hiển thị loading và scroll đồng thời
    setLoadingCategory(true);
  };

  const handleClearCategory = () => {
    setSelectedCategory('');
    setCurrentPage(1);

    // Hiển thị loading và scroll đồng thời
    setLoadingCategory(true);
  };

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
    // Làm tròn về nghìn để khớp backend (nếu muốn tuyệt đối đồng nhất)
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
    <div className="tour-listing">
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
                  <p>Không tìm thấy tour nào phù hợp với tiêu chí tìm kiếm.</p>
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
                {/* Tùy chọn "Tất cả" để xóa bộ lọc category */}
                {!slug && (
                  <div
                    className={`categories__item ${!selectedCategory ? 'categories__item--active' : ''}`}
                    onClick={handleClearCategory}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="categories__link">
                      Tất cả danh mục
                    </span>
                  </div>
                )}

                {categories.map((category) => (
                  slug ? (
                    // Khi đang ở trang danh mục theo slug, hiển thị link điều hướng sang slug khác
                    <div key={category._id} className={`categories__item ${currentCategory && currentCategory.slug === category.slug ? 'categories__item--active' : ''}`}>
                      <Link className="categories__link" to={`/danh-muc-tour/${category.slug || category.fullSlug}`}>
                        {category.name}
                      </Link>
                    </div>
                  ) : (
                    <div
                      key={category._id}
                      className={`categories__item ${selectedCategory === category._id ? 'categories__item--active' : ''}`}
                      onClick={() => handleCategoryClick(category._id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="categories__link">
                        {category.name}
                      </span>
                      <button className="categories__arrow">
                        <svg className="categories__arrow-icon" width="12" height="12" viewBox="0 0 192 512" fill="currentColor">
                          <path d="M0 384.662V127.338c0-17.818 21.543-26.741 34.142-14.142l128.662 128.662c7.81 7.81 7.81 20.474 0 28.284L34.142 398.804C21.543 411.404 0 402.48 0 384.662z"/>
                        </svg>
                      </button>
                    </div>
                  )
                ))}
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