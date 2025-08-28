import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaPhone, FaUser, FaBars, FaTimes } from "react-icons/fa";
import Cookies from "js-cookie";
import moment from 'moment';
import 'moment/locale/vi';

// Thiết lập ngôn ngữ tiếng Việt cho moment
moment.locale('vi');

import "./Header.scss";
import { getCategories } from "../../../services/CategoriesService";
import ImgLogo from "../../../assets/images/Logo.svg";
import DropDownHeader from "./DropDownHeader/DropDownHeader";

const Header = ({ noShadow, noSticky }) => {
    // State quản lý trạng thái mobile menu và dropdown
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [dropdownTimeout, setDropdownTimeout] = useState(null);
    const navigate = useNavigate();

    /**
     * Xử lý toggle mobile menu
     */
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    /**
     * Đóng mobile menu khi click vào link
     */
    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };



    /**
     * Xử lý hover vào category để hiển thị dropdown
     */
    const handleCategoryHover = (category) => {
        if (dropdownTimeout) {
            clearTimeout(dropdownTimeout);
            setDropdownTimeout(null);
        }
        setActiveCategory(category);
    };

    /**
     * Xử lý rời khỏi dropdown
     */
    const handleDropdownLeave = () => {
        const timeout = setTimeout(() => {
            setActiveCategory(null);
        }, 300); // Tăng delay để có thời gian di chuyển chuột
        setDropdownTimeout(timeout);
    };

    /**
     * Đóng dropdown ngay lập tức
     */
    const handleCloseDropdown = () => {
        if (dropdownTimeout) {
            clearTimeout(dropdownTimeout);
        }
        setActiveCategory(null);
    };

    /**
     * Xử lý rời khỏi category menu item
     */
    const handleCategoryLeave = () => {
        const timeout = setTimeout(() => {
            setActiveCategory(null);
        }, 300); // Tăng delay để có thời gian di chuyển chuột
        setDropdownTimeout(timeout);
    };

    useEffect(() => {
        // Tải danh sách danh mục để render menu động
        const fetchCategories = async () => {
            try {
                const res = await getCategories({ limit: 50 });
                const list = Array.isArray(res?.data?.data) ? res.data.data : [];
                // chỉ lấy danh mục hoạt động nếu có trường status
                const active = list.filter(c => !c.status || c.status === 'Hoạt động');
                setCategories(active);
            } catch (err) {
                console.error('Failed to load categories for header:', err);
                setCategories([]);
            }
        };
        fetchCategories();
    }, []);

    return (
        <header className={`header ${noShadow ? "header--no-shadow" : ""} ${noSticky ? "header--no-sticky" : ""}`}>
            <div className="header__container">
                {/* Logo Section */}
                <div
                    className="header__logo"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.replace('/');
                    }}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="logo">
                        <div className="logo__image">
                            <img src={ImgLogo} alt="Logo" />
                        </div>
                    </div>
                </div>

                {/* Navigation Menu - Desktop */}
                <nav className="header__nav">
                    <div
                        className="nav-dropdown-wrapper"
                        onMouseLeave={handleDropdownLeave}
                    >
                        <ul className="nav-menu">
                            {categories.slice(0, 5).map((cat) => {
                                // Kiểm tra xem có phải "Ưu đãi mùa hè" không
                                const isSummerPromo = cat.name.toLowerCase().includes('ưu đãi mùa hè') ||
                                                     cat.name.toLowerCase().includes('mùa hè') ||
                                                     cat.name.toLowerCase().includes('uu dai mua he') ||
                                                     cat.name.toLowerCase().includes('summer') ||
                                                     cat.slug?.includes('uu-dai-mua-he') ||
                                                     cat.slug?.includes('mua-he') ||
                                                     cat.slug?.includes('summer');

                                return (
                                    <li
                                        key={cat._id}
                                        className={`nav-menu__item ${activeCategory?._id === cat._id ? 'nav-menu__item--active' : ''}`}
                                        onMouseEnter={() => !isSummerPromo && handleCategoryHover(cat)}
                                    >
                                        <span
                                            className="nav-menu__link"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const path = `/danh-muc-tour/${cat.slug || cat.fullSlug}`;
                                                window.location.replace(path);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {cat.name}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Dropdown Header */}
                        <DropDownHeader
                            categories={categories}
                            activeCategory={activeCategory}
                            onCategoryHover={handleCategoryHover}
                            onDropdownLeave={handleDropdownLeave}
                            onCloseDropdown={handleCloseDropdown}
                        />
                    </div>
                </nav>

                {/* Contact & User Actions Section */}
                <div className="header__actions">
                    {/* Link tra cứu đơn hàng */}
                    <span
                        className="lookup-link"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.location.replace('/tra-cuu-don-hang');
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="10.7" cy="10" r="6.3" stroke="#8F8F8F" strokeWidth="1.5" strokeLinecap="round"/>
                            <path d="m15.7 15 6 6" stroke="#8F8F8F" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span className="lookup-link__text">Tra cứu đơn hàng</span>
                    </span>

                    {/* Thông tin liên hệ hotline */}
                    <a href="tel:19003440" className="contact-info">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3.14 6.30c.37 3.43 1.76 6.78 4.20 9.57 2.44 2.79 5.58 4.61 8.93 5.43.05.01-.07-.02.15.00 1.54.20 3.62-.99 4.21-2.43.09-.21.12-.31.18-.52.06-.19.09-.29.11-.38.13-.70-.12-1.42-.66-1.89a8.7 8.7 0 0 0-1.31-.93l-2.41-1.74c-.77-.56-1.84-.44-2.47.27-.74.83-2.05.82-2.78-.03l-2.79-3.19c-.73-.84-.56-2.14.36-2.76.79-.54 1.05-1.58.60-2.41l-1.40-2.62c-.09-.16-.13-.24-.19-.34-.39-.60-1.07-.94-1.78-.90a4 4 0 0 0-.38.05c-.22.03-.33.05-.54.11C4.63 2.70 3.16 4.60 3.15 6.15c0 .23-.01.10-.01.15z" stroke="#242424" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span className="contact-info__text">
                        0972 122 555</span>
                    </a>
                    
                    {/* Khu vực người dùng
                    <div className="user-section">
                        <div className="user-section__avatar">
                            <FaUser className="avatar__icon" />
                        </div>
                    </div> */}

                    {/* Mobile Menu Toggle Button */}
                    <button 
                        className="mobile-menu-toggle"
                        onClick={toggleMobileMenu}
                        aria-label="Toggle mobile menu"
                    >
                        {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Menu */}
            <div className={`mobile-nav ${isMobileMenuOpen ? 'mobile-nav--open' : ''}`}>
                <ul className="mobile-nav__menu">
                    {categories.map((cat) => (
                        <li key={cat._id} className="mobile-nav__item">
                            <span
                                className="mobile-nav__link"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    closeMobileMenu();
                                    const path = `/danh-muc-tour/${cat.slug || cat.fullSlug}`;
                                    window.location.replace(path);
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                {cat.name}
                            </span>
                        </li>
                    ))}
                    <li className="mobile-nav__item">
                        <span
                            className="mobile-nav__link mobile-nav__link--special"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                closeMobileMenu();
                                window.location.replace('/tra-cuu-don-hang');
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                                <path d="m21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Tra cứu đơn hàng
                        </span>
                    </li>
                </ul>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="mobile-nav__overlay"
                    onClick={closeMobileMenu}
                />
            )}
        </header>
    );
};

export default Header;