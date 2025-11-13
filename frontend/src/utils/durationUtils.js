//Tính số ngày và đêm từ ngày bắt đầu và kết thúc
export const calculateDaysNights = (startDate, endDate) => {
  if (!startDate || !endDate) return { days: 0, nights: 0 };

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { days: 0, nights: 0 };
  }

  const diffTime = Math.abs(end - start);
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const nights = Math.max(0, days - 1);

  return { days, nights };
};

//Format duration thành chuỗi hiển thị
export const formatDuration = (days, nights) => {
  if (!days || days <= 0) return '';
  
  if (nights > 0) {
    return `${days} ngày ${nights} đêm`;
  }
  
  return `${days} ngày`;
};

//Tính duration từ mảng tourDetails
export const calculateDurationFromTourDetails = (tourDetails) => {
  if (!Array.isArray(tourDetails) || tourDetails.length === 0) {
    return 'Đang cập nhật';
  }

  const durations = tourDetails.map((detail) => {
    const { days, nights } = calculateDaysNights(detail.dayStart, detail.dayReturn);
    const formatted = formatDuration(days, nights);

    return { days, nights, formatted };
  }).filter(duration => duration.days > 0); 
  
  if (durations.length === 0) {
    return 'Đang cập nhật';
  }

  // Kiểm tra xem tất cả duration có giống nhau không
  const firstDuration = durations[0];
  const allSame = durations.every(duration =>
    duration.days === firstDuration.days &&
    duration.nights === firstDuration.nights
  );

  if (allSame) {
    // Nếu tất cả giống nhau, hiển thị 1 duration
    return firstDuration.formatted;
  }

  // Nếu khác nhau, tạo danh sách unique durations
  const uniqueDurations = [];
  const seen = new Set();

  durations.forEach(duration => {
    const key = `${duration.days}-${duration.nights}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueDurations.push(duration.formatted);
    }
  });

  // Sắp xếp theo số ngày tăng dần
  uniqueDurations.sort((a, b) => {
    const getDays = (str) => parseInt(str.match(/(\d+) ngày/)?.[1] || '0');
    return getDays(a) - getDays(b);
  });

  // Nối các duration bằng dấu phẩy
  return uniqueDurations.join(', ');
};

//Fallback function để tính duration từ các field cũ
export const calculateDurationFallback = (tourData) => {
  if (!tourData) return 'Đang cập nhật';

  // Ưu tiên số ngày/đêm dạng number
  let days = tourData?.durationDays ?? 
             tourData?.days ?? 
             tourData?.duration_day ??
             (typeof tourData?.duration === 'number' ? tourData.duration : undefined);
  
  let nights = tourData?.durationNights ?? 
               tourData?.nights ?? 
               tourData?.duration_night ?? 
               undefined;

  // Nếu có chuỗi "6D5N", "6 ngày 5 đêm", "6d 5n"...
  if (typeof tourData?.duration === 'string' && (!days || nights === undefined)) {
    const nums = tourData.duration.match(/\d+/g);
    if (nums?.length >= 2) {
      days = Number(nums[0]);
      nights = Number(nums[1]);
    } else if (nums?.length === 1) {
      days = Number(nums[0]);
      nights = nights ?? (days > 0 ? days - 1 : 0);
    }
  }

  // Tính từ startDate/endDate nếu có
  if ((!days || nights === undefined) && tourData?.startDate) {
    const { days: calcDays, nights: calcNights } = calculateDaysNights(
      tourData.startDate, 
      tourData.endDate
    );
    days = days ?? calcDays;
    nights = nights ?? calcNights;
  }

  // Từ mảng lịch trình
  if (!days && Array.isArray(tourData?.schedule)) {
    days = tourData.schedule.length;
    nights = nights ?? Math.max(0, days - 1);
  }

  // Fallback cuối
  if (!days) return 'Đang cập nhật';
  if (nights === undefined) nights = Math.max(0, days - 1);

  return formatDuration(days, nights);
};

//Function chính để tính duration, ưu tiên tourDetails trước
export const calculateTourDuration = (tourData) => {
  if (!tourData) return 'Đang cập nhật';

  // Ưu tiên tính từ tourDetails
  if (Array.isArray(tourData.tourDetails) && tourData.tourDetails.length > 0) {
    const durationFromDetails = calculateDurationFromTourDetails(tourData.tourDetails);
    if (durationFromDetails !== 'Đang cập nhật') {
      return durationFromDetails;
    }
  }

  // Fallback về các field cũ
  const fallbackResult = calculateDurationFallback(tourData);
  return fallbackResult;
};
