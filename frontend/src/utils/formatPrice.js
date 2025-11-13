export const formatPrice = (price) => {
  // Return empty string for null, undefined, 0, or empty string
  if (!price || price === 0 || price === '0' || price === '') return '';

  // If already formatted with currency symbol, check if it's zero
  if (typeof price === 'string' && (price.includes('đ') || price.includes('VNĐ'))) {
    // Extract number from formatted string
    const numValue = parseFloat(price.replace(/[^\d.-]/g, ''));
    if (!numValue || numValue === 0) return '';
    return price;
  }

  // Convert to number
  const numPrice = typeof price === 'string'
    ? parseFloat(price.replace(/[^\d.-]/g, ''))
    : price;

  if (isNaN(numPrice) || numPrice === 0) return '';

  return `${numPrice.toLocaleString('vi-VN')} đ`;
};
