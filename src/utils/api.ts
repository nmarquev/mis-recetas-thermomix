// Utility function to get the base server URL
export const getServerBaseUrl = (): string => {
  const currentHost = window.location.hostname;

  // If accessing via IP address (like 192.168.0.10), use the same IP for backend
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    return `http://${currentHost}:3001`;
  }

  // Default to localhost
  return 'http://localhost:3001';
};

// Utility function to get the API base URL
export const getApiBaseUrl = (): string => {
  return `${getServerBaseUrl()}/api`;
};

// Utility function to resolve image URLs
export const resolveImageUrl = (url: string): string => {
  if (!url) return '';

  // If it's already a full URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If it's a relative path, prepend the server base URL
  if (url.startsWith('/')) {
    return `${getServerBaseUrl()}${url}`;
  }

  return url;
};