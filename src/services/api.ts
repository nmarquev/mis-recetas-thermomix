import { Recipe, ImportRecipeResponse } from '@/types/recipe';
import { getApiBaseUrl } from '@/utils/api';

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

    register: async (email: string, password: string, name: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
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
};