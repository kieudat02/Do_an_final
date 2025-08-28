import React from 'react';
import './WhyChooseNDTravel.scss';
import businessIcon from '../../../assets/icons/business.jpg';
import goalIcon from '../../../assets/icons/goal.jpg';
import moneyIcon from '../../../assets/icons/money.jpg';
import qualityIcon from '../../../assets/icons/quality.jpg';
import supportIcon from '../../../assets/icons/support.jpg';

const WhyChooseNDTravel = () => {
  const reasons = [
    {
      id: 1,
      icon: goalIcon,
      title: "15 Năm Kinh Nghiệm",
      description: "Chúng tôi tự hào phục vụ hơn 100.000+ lượt khách mỗi năm"
    },
    {
      id: 2,
      icon: businessIcon,
      title: "Hành Trình Đa Dạng",
      description: "Cam kết những trải nghiệm tuyệt vời thông qua mỗi hành trình với sự đa dạng và phong phú trong các tuyến điểm du lịch"
    },
    {
      id: 3,
      icon: moneyIcon,
      title: "Tối Ưu Chi Phí",
      description: "Các tour trọn gói từ A-Z, không phát sinh chi phí thêm, giúp khách hàng yên tâm về chi phí và tập trung tận hưởng chuyến đi"
    },
    {
      id: 4,
      icon: qualityIcon,
      title: "Đảm Bảo Chất Lượng",
      description: "Bồi hoàn nếu chất lượng tour không đúng như cam kết, đảm bảo sự hài lòng và tin tưởng của khách hàng"
    },
    {
      id: 5,
      icon: supportIcon,
      title: "Hỗ Trợ Tận Tâm 24/7",
      description: "Chúng tôi luôn đồng hành và hỗ trợ Quý khách 24/7, để đảm bảo mọi hành trình của bạn diễn ra suôn sẻ và trọn vẹn"
    }
  ];

  return (
    <div className="why-choose-nd-travel">
      <div className="why-choose-nd-travel__container">
        <div className="why-choose-nd-travel__header">
          <h2 className="why-choose-nd-travel__title">5 Lý Do Nên Chọn ND Travel</h2>
        </div>
        
        <div className="why-choose-nd-travel__grid">
          {reasons.map((reason) => (
            <div key={reason.id} className="why-choose-nd-travel__item">
              <div className="why-choose-nd-travel__icon">
              <img src={reason.icon} alt={reason.title} className="why-choose-nd-travel__icon-emoji" loading='lazy'/>
              </div>
              <div className="why-choose-nd-travel__content">
                <h3 className="why-choose-nd-travel__item-title">{reason.title}</h3>
                <p className="why-choose-nd-travel__item-description">{reason.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhyChooseNDTravel;