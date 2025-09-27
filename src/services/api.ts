import { Recipe, ImportRecipeResponse } from '@/types/recipe';
import { getApiBaseUrl } from '@/utils/api';
import {
  PdfUploadResponse,
  PdfExtractResponse,
  PdfPreviewResponse
} from '@/types/pdf';

const API_BASE_URL = getApiBaseUrl();

// Helper function to get auth token
const getAuthToken = (): string | null => {
  // For now, we'll use localStorage. In production, consider more secure methods
  return localStorage.getItem('auth_token');
};

// Helper function to make authenticated requests
const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });
};

export const api = {
  // Auth endpoints
  auth: {
    login: async (email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      return data;
    },

    register: async (email: string, password: string, name: string, alias?: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, alias }),
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      return data;
    },

    logout: () => {
      localStorage.removeItem('auth_token');
    },

    updateProfile: async (profileData: {
      email?: string;
      name?: string;
      alias?: string;
      currentPassword?: string;
      newPassword?: string;
    }) => {
      const response = await authFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      return response.json();
    },

    getProfile: async () => {
      const response = await authFetch('/auth/profile');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get profile');
      }

      const data = await response.json();
      return data.user;
    },
  },

  // Recipe endpoints
  recipes: {
    getAll: async (): Promise<Recipe[]> => {
      const response = await authFetch('/recipes');

      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }

      return response.json();
    },

    getById: async (id: string): Promise<Recipe> => {
      const response = await authFetch(`/recipes/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch recipe');
      }

      return response.json();
    },

    create: async (recipe: Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Recipe> => {
      const response = await authFetch('/recipes', {
        method: 'POST',
        body: JSON.stringify(recipe),
      });

      if (!response.ok) {
        throw new Error('Failed to create recipe');
      }

      return response.json();
    },

    update: async (id: string, recipe: Partial<Recipe>): Promise<Recipe> => {
      const response = await authFetch(`/recipes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(recipe),
      });

      if (!response.ok) {
        throw new Error('Failed to update recipe');
      }

      return response.json();
    },

    delete: async (id: string): Promise<void> => {
      const response = await authFetch(`/recipes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete recipe');
      }
    },
  },

  // Import endpoints
  import: {
    fromUrl: async (url: string): Promise<ImportRecipeResponse> => {
      const response = await authFetch('/import', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import recipe');
      }

      return data;
    },

    validateUrl: async (url: string): Promise<{ valid: boolean; error?: string }> => {
      const response = await authFetch('/import/validate-url', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate URL');
      }

      return response.json();
    },
  },

  // Upload endpoints
  upload: {
    images: async (files: File[]): Promise<{ success: boolean; images: any[] }> => {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('images', file);
      });

      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/upload/images`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload images');
      }

      return response.json();
    },
  },

  // DOCX Import endpoints
  docx: {
    upload: async (file: File): Promise<any> => {
      const formData = new FormData();
      formData.append('docx', file);

      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/import/docx/upload`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload DOCX file');
      }

      return response.json();
    },

    extract: async (fileId: string, startPage: number, endPage: number): Promise<any> => {
      const response = await authFetch('/import/docx/extract', {
        method: 'POST',
        body: JSON.stringify({ fileId, startPage, endPage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract recipes from DOCX');
      }

      return response.json();
    },

    preview: async (fileId: string, startPage: number, endPage: number): Promise<any> => {
      const response = await authFetch('/import/docx/preview', {
        method: 'POST',
        body: JSON.stringify({ fileId, startPage, endPage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to preview DOCX content');
      }

      return response.json();
    },

    cleanup: async (): Promise<any> => {
      const response = await authFetch('/import/docx/cleanup', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cleanup DOCX files');
      }

      return response.json();
    },
  },

  // PDF Import endpoints
  pdf: {
    upload: async (file: File): Promise<PdfUploadResponse> => {
      const formData = new FormData();
      formData.append('pdf', file);

      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/import/pdf/upload`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload PDF file');
      }

      return response.json();
    },

    extract: async (fileId: string, startPage: number, endPage: number): Promise<PdfExtractResponse> => {
      const response = await authFetch('/import/pdf/extract', {
        method: 'POST',
        body: JSON.stringify({ fileId, startPage, endPage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract recipes from PDF');
      }

      return response.json();
    },

    preview: async (fileId: string, startPage?: number, endPage?: number): Promise<PdfPreviewResponse> => {
      const response = await authFetch('/import/pdf/preview', {
        method: 'POST',
        body: JSON.stringify({ fileId, startPage, endPage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF preview');
      }

      return response.json();
    },

    status: async (fileId: string): Promise<any> => {
      const response = await authFetch(`/import/pdf/status/${fileId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get PDF status');
      }

      return response.json();
    },

    cleanup: async (fileId: string): Promise<any> => {
      const response = await authFetch(`/import/pdf/cleanup/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cleanup PDF files');
      }

      return response.json();
    },
  },

  // LLM endpoints
  llm: {
    generateScript: async (prompt: string): Promise<{ success: boolean; script?: string; error?: string }> => {
      const response = await authFetch('/llm/generate-script', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate script');
      }

      return response.json();
    },
  },

  // Generic API methods
  post: async (endpoint: string, data: any) => {
    return authFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put: async (endpoint: string, data: any) => {
    return authFetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  get: async (endpoint: string) => {
    return authFetch(endpoint, {
      method: 'GET',
    });
  },

  delete: async (endpoint: string) => {
    return authFetch(endpoint, {
      method: 'DELETE',
    });
  },
};