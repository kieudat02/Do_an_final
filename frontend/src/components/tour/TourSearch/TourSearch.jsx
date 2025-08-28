import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTours } from '../../../services/TourService';
import { getCategories } from '../../../services/CategoriesService';
import { formatPrice } from '../../../utils/formatPrice';
import { replacePlaceholderUrl, PLACEHOLDER_IMAGES } from '../../../utils/placeholderImage';
import './TourSearch.scss';
import ImgLogo from "../../../assets/images/Logo.svg";


const TourSearch = () => {
  const [searchValue, setSearchValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [popularTours, setPopularTours] = useState([]);
  const [featuredTours, setFeaturedTours] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [quickFilters, setQuickFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [isSticky, setIsSticky] = useState(false);
  const stickyRef = useRef(null); 

  // Search function with debounce
  const searchTours = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    try {
      setSearching(true);
      const response = await getTours({
        search: query.trim(),
        limit: 8,
        page: 1
      });

      if (response.data.success) {
        setSearchResults(response.data.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching tours:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle search input change with debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);

    // Open dropdown when user starts typing
    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchTours(value);
    }, 300); // 300ms debounce
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  // Handle clear search
  // const handleClearSearch = () => {
  //   setSearchValue('');
  //   setSearchResults([]);
  //   if (searchTimeoutRef.current) {
  //     clearTimeout(searchTimeoutRef.current);
  //   }
  // };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setSearchValue('');
      setSearchResults([]);
    } else if (e.key === 'Enter' && searchValue.trim()) {
      e.preventDefault();
      // Navigate to search results page
      navigate(`/tours?search=${encodeURIComponent(searchValue.trim())}`);
      setIsDropdownOpen(false);
    }
  };

   // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Cleanup search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isDropdownOpen]);

  // Fetch tours data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel
        const [popularResponse, featuredResponse, categoriesResponse] = await Promise.all([
          // Fetch popular tours for suggestions (sorted by views)
          getTours({
            limit: 5,
            sortBy: 'views',
            sortOrder: 'desc',
            page: 1
          }),
          // Fetch featured tours (tours with highlight = true)
          getTours({
            limit: 5,
            highlight: true,
            page: 1
          }),
          // Fetch categories for quick filters
          getCategories({ limit: 10 })
        ]);

        if (popularResponse.data.success) {
          setPopularTours(popularResponse.data.data);
        }

        if (featuredResponse.data.success) {
          setFeaturedTours(featuredResponse.data.data);
        }

        if (categoriesResponse.data.success) {
          const activeCategories = categoriesResponse.data.data
            .filter(cat => cat.status === 'Hoạt động')
            .slice(0, 5)
            .map(cat => ({
              name: cat.name,
              link: `/danh-muc-tour/${cat.slug || cat.fullSlug}`
            }));
          setQuickFilters(activeCategories);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      // Navigate to tours page with search query
      navigate(`/tours?search=${encodeURIComponent(searchValue.trim())}`);
      setIsDropdownOpen(false);
    }
  };
  
  // Detect sticky
  useEffect(() => {
    const ref = stickyRef.current;
    if (!ref) return;
    // Observer để detect sticky bằng IntersectionObserver
    const observer = new window.IntersectionObserver(
      ([e]) => setIsSticky(!e.isIntersecting),
      { threshold: [1], rootMargin: "-1px 0px 0px 0px" }
    );
    observer.observe(ref);
    return () => observer.disconnect();
  }, []);

  // Helper function to calculate duration text
  const getDurationText = (tour) => {
    if (tour.durationDays && tour.durationNights) {
      return `${tour.durationDays} ngày ${tour.durationNights} đêm`;
    }
    if (tour.startDate && tour.endDate) {
      const start = new Date(tour.startDate);
      const end = new Date(tour.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const nights = Math.max(0, days - 1);
      return `${days} ngày ${nights} đêm`;
    }
    return 'Liên hệ';
  };

  // Component for tour suggestion item (list style)
  const TourSuggestionItem = ({ tour }) => {
    const tourLink = `/tour/${tour._id}`;
    const tourImage = replacePlaceholderUrl(tour.image || tour.images?.[0] || PLACEHOLDER_IMAGES.TOUR_CARD);
    const duration = getDurationText(tour);
    const price = tour.discountPrice || tour.price || 0;

    const handleClick = () => {
      setIsDropdownOpen(false);
    };

    return (
      <Link to={tourLink} className="tour-suggestion" onClick={handleClick}>
        <div className="tour-suggestion__image">
          <img
            src={tourImage}
            alt={tour.title}
            loading="lazy"
          />
        </div>
        <div className="tour-suggestion__content">
          <h4 className="tour-suggestion__title">
            {tour.title}
          </h4>
          <div className="tour-suggestion__meta">
            <span className="tour-suggestion__duration">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.99984 14.6667C10.9454 14.6667 13.3332 12.2789 13.3332 9.33333C13.3332 6.38781 10.9454 4 7.99984 4C5.05432 4 2.6665 6.38781 2.6665 9.33333C2.6665 12.2789 5.05432 14.6667 7.99984 14.6667Z" stroke="#1F50EA" strokeWidth="1.5"/>
                <path d="M9.33317 1.33334H6.6665" stroke="#1F50EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 1.33334V4.00001" stroke="#1F50EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.6665 5.33334L12.6665 4.33334" stroke="#1F50EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 9.33334V7.33334" stroke="#1F50EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 9.33334H6" stroke="#1F50EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {duration}
            </span>
            <span className="tour-suggestion__price">
              Chỉ từ <strong>{formatPrice(price)}</strong>
            </span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <>
    {/* Ref để detect sticky */}
    <div ref={stickyRef}></div>
    <div className={`search-form${isSticky ? " is-sticky" : ""}`}>
      {/* Sticky header mini (logo + sdt), chỉ hiện khi sticky */}
      {isSticky && (
        <div className="search-form__sticky-mini">
          <img src={ImgLogo} alt="Logo" className="search-form__sticky-mini-logo" />
          <a href="tel:19003440" className="search-form__sticky-mini-phone">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.14 6.30c.37 3.43 1.76 6.78 4.20 9.57 2.44 2.79 5.58 4.61 8.93 5.43.05.01-.07-.02.15.00 1.54.20 3.62-.99 4.21-2.43.09-.21.12-.31.18-.52.06-.19.09-.29.11-.38.13-.70-.12-1.42-.66-1.89a8.7 8.7 0 0 0-1.31-.93l-2.41-1.74c-.77-.56-1.84-.44-2.47.27-.74.83-2.05.82-2.78-.03l-2.79-3.19c-.73-.84-.56-2.14.36-2.76.79-.54 1.05-1.58.60-2.41l-1.40-2.62c-.09-.16-.13-.24-.19-.34-.39-.60-1.07-.94-1.78-.90a4 4 0 0 0-.38.05c-.22.03-.33.05-.54.11C4.63 2.70 3.16 4.60 3.15 6.15c0 .23-.01.10-.01.15z" stroke="#242424" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            0972 122 555
          </a>
        </div>
      )}
      {/* Search form container */}
      <div className="search-form__container"  ref={dropdownRef}>
        <form className="search-form__form" onSubmit={handleSubmit}>  
          <div className="search-form__input-group">
            <div className="search-form__icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" stroke="currentColor" className="search-form__location-icon">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.333 6.788c0 2.432-1.752 4.664-3.248 6.127-.847.828-1.27 1.242-2.085 1.242-.816 0-1.239-.414-2.085-1.242-1.496-1.463-3.248-3.695-3.248-6.127 0-1.447.561-2.834 1.562-3.857a5.274 5.274 0 0 1 3.77-1.598c1.415 0 2.772.575 3.772 1.598a5.518 5.518 0 0 1 1.562 3.857Z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 8.606c.982 0 1.778-.814 1.778-1.818S8.982 4.97 8 4.97s-1.778.814-1.778 1.818S7.018 8.606 8 8.606Z"></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Bạn muốn đi đâu?"
              className="search-form__input"
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              name="location_end"
              autoComplete='off'
            />
            {/* {searchValue && (
              <button
                type="button"
                className="search-form__clear-btn"
                onClick={handleClearSearch}
                aria-label="Xóa tìm kiếm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )} */}
          </div>
          <button type="submit" className="search-form__button">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="search-form__search-icon">
              <path stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"></path>
            </svg>
            Tìm tour
          </button>
        </form>

        {/* Dropdown Menu */}
        <div className={`search-form__dropdown ${isDropdownOpen ? 'search-form__dropdown--open' : ''}`}>
          {loading ? (
            <div className="search-form__loading">
              <div className="search-form__loading-text">Đang tải...</div>
            </div>
          ) : (
            <>
              {/* Quick Filters - always show */}
              <div className="search-form__filters">
                <div className="search-form__filters-scroll">
                  <div className="search-form__filters-list">
                    {quickFilters.map((filter, index) => (
                      <div key={index} className="search-form__filter-item">
                        <Link to={filter.link} className="search-form__filter-link">
                          {filter.name}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tour Results */}
              {searchValue.trim() ? (
                // Show search results when searching
                <div className="search-form__suggestions">
                  <h3 className="search-form__suggestions-title">Gợi ý Tour</h3>
                  <div className="search-form__suggestions-list">
                    {searching ? (
                      <div className="search-form__loading">
                        <div className="search-form__loading-text">Đang tìm kiếm...</div>
                      </div>
                    ) : (
                      searchResults.length > 0 ? (
                        searchResults.map((tour) => (
                          <TourSuggestionItem
                            key={tour._id}
                            tour={tour}
                          />
                        ))
                      ) : (
                        // Show empty state when no search results - just empty space
                        <div className="search-form__no-results"></div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                // Show popular tours and featured destinations when not searching
                <div className="search-form__content">
                  <div className="search-form__content-row">
                    {/* Popular Tours */}
                    <div className="search-form__content-col">
                      <h3 className="search-form__content-title">Tour được tìm nhiều nhất</h3>
                      <div className="search-form__content-list">
                        {popularTours.length > 0 ? (
                          popularTours.slice(0, 3).map((tour) => (
                            <TourSuggestionItem key={tour._id} tour={tour} />
                          ))
                        ) : (
                          <div className="search-form__empty">Không có tour nào</div>
                        )}
                      </div>
                    </div>

                    {/* Featured Destinations */}
                    <div className="search-form__content-col">
                      <h3 className="search-form__content-title">Điểm đến nổi bật</h3>
                      <div className="search-form__content-list">
                        {featuredTours.length > 0 ? (
                          featuredTours.slice(0, 3).map((tour) => (
                            <TourSuggestionItem key={tour._id} tour={tour} />
                          ))
                        ) : (
                          <div className="search-form__empty">Không có điểm đến nổi bật</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default TourSearch;