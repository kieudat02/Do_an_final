/**
 * Utility functions for time formatting
 */

/**
 * Format time to 24-hour format for Vietnam timezone
 * @param {string} time - Time string (e.g., "06:30", "6:30", "6")
 * @returns {string} Formatted time in 24-hour format (e.g., "06:30")
 */
export const formatTime24h = (time) => {
  if (!time) return '';
  
  // If time already has colon, return as is
  if (time.includes(':')) {
    return time;
  }
  
  // If time is just a number, add :00
  if (/^\d+$/.test(time)) {
    return `${time.padStart(2, '0')}:00`;
  }
  
  return time;
};

/**
 * Format date and time for Vietnam locale
 * @param {string} date - Date string
 * @param {string} time - Time string
 * @returns {string} Formatted date and time string
 */
export const formatDateTimeVietnam = (date, time) => {
  if (!date) return 'Chưa xác định';
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('vi-VN');
  
  if (time) {
    const formattedTime = formatTime24h(time);
    return `${formattedDate} lúc ${formattedTime}`;
  }
  
  return formattedDate;
};

/**
 * Format time with parentheses for display
 * @param {string} time - Time string
 * @returns {string} Formatted time with parentheses
 */
export const formatTimeWithParentheses = (time) => {
  if (!time) return '';
  
  const formattedTime = formatTime24h(time);
  return ` (${formattedTime})`;
};
