// Utility function to get the base server URL
export const getServerBaseUrl = (): string => {
  const currentHost = window.location.hostname;

  // If accessing via IP address (like 192.168.0.10), use the same IP for backend
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    return `http://${currentHost}:3002`;
  }

  // Default to localhost
  return 'http://localhost:3002';
};

// Utility function to get the API base URL
export const getApiBaseUrl = (): string => {
  return `${getServerBaseUrl()}/api`;
};

// Utility function to resolve image URLs with proxy support
export const resolveImageUrl = (url: string): string => {
  if (!url) return '';

  // If it's a local/uploaded image path, prepend the server base URL
  if (url.startsWith('/uploads/') || url.startsWith('/')) {
    return `${getServerBaseUrl()}${url}`;
  }

  // If it's an external URL, use the image proxy to avoid CORS issues
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const proxyUrl = `${getServerBaseUrl()}/api/proxy/image?url=${encodeURIComponent(url)}`;
    return proxyUrl;
  }

  return url;
};