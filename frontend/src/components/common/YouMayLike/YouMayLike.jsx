import React from 'react';
import './YouMayLike.scss';

const YouMayLike = () => {
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
    <section className="YouMayLike">
      <div className="YouMayLike__container">
        <div className="YouMayLike__header">
          <h2 className="YouMayLike__title">Có thể bạn sẽ thích</h2>
        </div>
        
        <div className="YouMayLike__scroll-wrapper">
          <div className="YouMayLike__grid">
            {destination.map((destination) => (
              <a
                key={destination.id}
                href={destination.href}
                className={`YouMayLike__item ${destination.className}`}
              >
                <img
                  src={destination.image}
                  alt={destination.name}
                  className="YouMayLike__image"
                  loading="lazy"
                />
                <span className="YouMayLike__label">
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

export default YouMayLike;