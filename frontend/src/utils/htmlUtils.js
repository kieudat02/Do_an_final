
export const decodeHtmlEntities = (str) => {
  if (!str || typeof str !== 'string') return str;
  
  // Create a temporary textarea element to decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
};

export const processHtmlContent = (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string') return '';
  
  // First decode any HTML entities
  const decoded = decodeHtmlEntities(htmlContent);
  
  // Additional processing can be added here if needed
  return decoded;
};

export const containsHtml = (content) => {
  if (!content || typeof content !== 'string') return false;
  
  // Simple regex to check for HTML tags
  const htmlRegex = /<[^>]*>/;
  return htmlRegex.test(content);
};

export const stripHtmlTags = (content) => {
  if (!content || typeof content !== 'string') return '';
  
  // Create a temporary div element to strip HTML tags
  const div = document.createElement('div');
  div.innerHTML = content;
  return div.textContent || div.innerText || '';
};
