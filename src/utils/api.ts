// Utility function to get the base server URL
export const getServerBaseUrl = (): string => {
  // In production (Vercel), use the current domain
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.origin;
  }

  // In development, check if we're in Vercel dev mode or traditional mode
  if (window.location.port === '3000') {
    // Vercel dev mode uses port 3000
    return window.location.origin;
  }

  // Traditional development with separate backend
  const currentHost = window.location.hostname;
  return `http://${currentHost}:3002`;
};

// Utility function to get the API base URL
export const getApiBaseUrl = (): string => {
  const baseUrl = getServerBaseUrl();

  // In Vercel (production or dev), API routes are at /api
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `${baseUrl}/api`;
  }

  // In Vercel dev mode (port 3000), API routes are at /api
  if (window.location.port === '3000') {
    return `${baseUrl}/api`;
  }

  // Traditional development with separate backend
  return `${baseUrl}/api`;
};

// Utility function to resolve image URLs
export const resolveImageUrl = (url: string): string => {
  if (!url) return '';

  // If it's already a full URL (including Vercel Blob URLs), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If it's a relative path to local uploads, prepend the server base URL
  if (url.startsWith('/uploads/')) {
    return `${getServerBaseUrl()}${url}`;
  }

  // If it's just a filename or path, treat as upload
  if (url.startsWith('/')) {
    return `${getServerBaseUrl()}${url}`;
  }

  return url;
};