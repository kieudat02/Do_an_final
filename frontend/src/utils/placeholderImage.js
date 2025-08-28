export const generatePlaceholderImage = (
  width = 300, 
  height = 200, 
  text = 'Hình ảnh', 
  bgColor = '#f8f9fa', 
  textColor = '#6c757d'
) => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${bgColor}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="${textColor}" text-anchor="middle" dy=".3em">${text}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};


export const PLACEHOLDER_IMAGES = {
  TOUR_CARD: generatePlaceholderImage(300, 200, 'Hình ảnh Tour'),
  TOUR_GALLERY: generatePlaceholderImage(850, 566, 'Hình ảnh Tour'),
  TOUR_DETAIL: generatePlaceholderImage(800, 534, 'Hình ảnh Tour'),
  TOUR_RELATED: generatePlaceholderImage(800, 400, 'Hình ảnh Tour'),
  USER_AVATAR: generatePlaceholderImage(80, 80, 'Avatar', '#e9ecef', '#495057'),
  NEWS_IMAGE: generatePlaceholderImage(300, 200, 'Hình ảnh Tin tức')
};


export const replacePlaceholderUrl = (url) => {
  if (!url || !url.includes('/api/placeholder/')) {
    return url;
  }
  
  const match = url.match(/\/api\/placeholder\/(\d+)\/(\d+)/);
  if (match) {
    const width = parseInt(match[1]);
    const height = parseInt(match[2]);
    return generatePlaceholderImage(width, height);
  }
  
  return PLACEHOLDER_IMAGES.TOUR_CARD;
}; 