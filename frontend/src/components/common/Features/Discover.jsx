import React from 'react';
import './Discover.scss';

const Discover = () => {
  const destinations = [
    {
      id: 1,
      name: 'Hà Giang',
      href: '/',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736218129645.jpg',
      className: 'col-span-5 h-36 lg:h-60'
    },
    {
      id: 2,
      name: 'Đà Nẵng',
      href: '/',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736218414879.jpg',
      className: 'col-span-4 row-span-2 h-full'
    },
    {
      id: 3,
      name: 'Ninh Thuận',
      href: '/',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736218466845.jpg',
      className: 'col-span-3 h-36 lg:h-60'
    },
    {
      id: 4,
      name: 'Hạ Long',
      href: '/',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736218289275.jpg',
      className: 'col-span-2 h-36 lg:h-60'
    },
    {
      id: 5,
      name: 'Hồ Ba Bể - Thác Bản Giốc',
      href: '/',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736218213838.jpg',
      className: 'col-span-3 h-36 lg:h-60'
    },
    {
      id: 6,
      name: 'Miền Tây',
      href: '/',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736218516012.jpg',
      className: 'col-span-3 h-36 lg:h-60'
    }
  ];

  const destination = [
    {
      id: 1,
      name: 'Hàn Quốc',
      href: 'http://localhost:5173/danh-muc-tour/tour-du-lich-han-quoc',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1746500895122.jpg',
      className: 'col-span-3 h-36 lg:h-60'
    },
    {
      id: 2,
      name: 'Trung Quốc',
      href: 'http://localhost:5173/danh-muc-tour/tour-du-lich-trung-quoc',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736220113443.jpg',
      className: 'col-span-4 row-span-2 h-full'
    },
    {
      id: 3,
      name: 'Nhật Bản',
      href: 'http://localhost:5173/danh-muc-tour/tour-du-lich-nhat-ban',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1746501101651.jpg',
      className: 'col-span-5 h-36 lg:h-60'
    },
    {
      id: 4,
      name: 'Ấn Độ',
      href: '/',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736219062718.jpg',
      className: 'col-span-3 h-36 lg:h-60'
    },
    {
      id: 5,
      name: 'Bali - Indonesia',
      href: '/',
      image: 'https://objectstorage.omzcloud.vn/pys-object-storage/dev/recommended-location/1736219250263.jpg',
      className: 'col-span-2 h-36 lg:h-60'
    },
    {
      id: 6,
      name: 'Thái Lan',
      href: '/',
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