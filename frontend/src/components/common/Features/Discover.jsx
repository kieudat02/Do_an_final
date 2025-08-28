import React from 'react';
import './Discover.scss';

const Discover = () => {
  const destinations = [
    {
      id: 1,
      name: 'Hà Giang',
      href: 'https://pystravel.vn/danh-muc-tour/3-tour-ha-giang.html',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736218129645.jpg',
      className: 'col-span-5 h-36 lg:h-60'
    },
    {
      id: 2,
      name: 'Đà Nẵng',
      href: 'https://pystravel.vn/danh-muc-tour/219-da-nang.html',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736218414879.jpg',
      className: 'col-span-4 row-span-2 h-full'
    },
    {
      id: 3,
      name: 'Ninh Thuận',
      href: 'https://pystravel.vn/danh-muc-tour/44-ninh-thuan.html',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736218466845.jpg',
      className: 'col-span-3 h-36 lg:h-60'
    },
    {
      id: 4,
      name: 'Hạ Long',
      href: 'https://pystravel.vn/danh-muc-tour/14-tour-ha-long.html',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736218289275.jpg',
      className: 'col-span-2 h-36 lg:h-60'
    },
    {
      id: 5,
      name: 'Hồ Ba Bể - Thác Bản Giốc',
      href: 'https://pystravel.vn/danh-muc-tour/8-tour-ba-be-ban-gioc.html',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736218213838.jpg',
      className: 'col-span-3 h-36 lg:h-60'
    },
    {
      id: 6,
      name: 'Miền Tây',
      href: 'https://pystravel.vn/danh-muc-tour/25-mien-tay.html',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736218516012.jpg',
      className: 'col-span-3 h-36 lg:h-60'
    }
  ];

  const destination = [
    {
      id: 1,
      name: 'Hàn Quốc',
      href: 'https://pystravel.vn/danh-muc-tour/37-han-quoc.html',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1746500895122.jpg',
      className: 'col-span-3 h-36 lg:h-60'
    },
    {
      id: 2,
      name: 'Trung Quốc',
      href: 'https://pystravel.vn/danh-muc-tour/43-trung-quoc.html',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736220113443.jpg',
      className: 'col-span-4 row-span-2 h-full'
    },
    {
      id: 3,
      name: 'Nhật Bản',
      href: 'https://pystravel.vn/danh-muc-tour/59-nhat-ban.html',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1746501101651.jpg',
      className: 'col-span-5 h-36 lg:h-60'
    },
    {
      id: 4,
      name: 'Ấn Độ',
      href: 'https://pystravel.vn/danh-muc-tour/259-an-do.html',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736219062718.jpg',
      className: 'col-span-3 h-36 lg:h-60'
    },
    {
      id: 5,
      name: 'Bali - Indonesia',
      href: 'https://pystravel.vn/danh-muc-tour/256-bali.html',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736219250263.jpg',
      className: 'col-span-2 h-36 lg:h-60'
    },
    {
      id: 6,
      name: 'Thái Lan',
      href: 'https://pystravel.vn/danh-muc-tour/23-thai-lan.html',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736219143319.jpg',
      className: 'col-span-3 h-36 lg:h-60'
    }
  ];

  return (
    <section className="discover">

      <div className="discover__container">
        <div className="discover__header">
          <h2 className="discover__title">Khám phá Việt Nam</h2>
        </div>
        
        <div className="discover__scroll-wrapper">
          <div className="discover__grid">
            {destinations.map((destination) => (
              <a
                key={destination.id}
                href={destination.href}
                className={`discover__item ${destination.className}`}
              >
                <img
                  src={destination.image}
                  alt={destination.name}
                  className="discover__image"
                  loading="lazy"
                />
                <span className="discover__label">
                  {destination.name}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="discover__container">
        <div className="discover__header">
          <h2 className="discover__title">Vi vu nước ngoài</h2>
        </div>
        
        <div className="discover__scroll-wrapper">
          <div className="discover__grid">
            {destination.map((destination) => (
              <a
                key={destination.id}
                href={destination.href}
                className={`discover__item ${destination.className}`}
              >
                <img
                  src={destination.image}
                  alt={destination.name}
                  className="discover__image"
                  loading="lazy"
                />
                <span className="discover__label">
                  {destination.name}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Discover;