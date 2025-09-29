/**
 * Resolves image URLs for PDF generation
 * Makes external URLs absolute and local paths accessible
 */

const getServerBaseUrl = (): string => {
  return 'https://tastebox.local:3006';
};

export const resolveImageUrl = (url: string): string => {
  if (!url) return '';

  // If it's a local/uploaded image path, prepend the server base URL
  if (url.startsWith('/uploads/') || url.startsWith('/')) {
    return `${getServerBaseUrl()}${url}`;
  }

  // If it's already a fully qualified URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return url;
};