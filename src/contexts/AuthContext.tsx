import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/services/api';

interface User {
  id: string;
  email: string;
  name: string;
  alias?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string, alias?: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('thermomix_user');
    const authToken = localStorage.getItem('auth_token');

    // Both user data and token must exist for a valid session
    if (savedUser && authToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        // Clear invalid data
        localStorage.removeItem('thermomix_user');
        localStorage.removeItem('auth_token');
      }
    } else {
      // Clear any partial data
      localStorage.removeItem('thermomix_user');
      localStorage.removeItem('auth_token');
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await api.auth.login(email, password);
      const userData = { id: response.user.id, email: response.user.email, name: response.user.name, alias: response.user.alias };
      setUser(userData);
      localStorage.setItem('thermomix_user', JSON.stringify(userData));
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string, alias?: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await api.auth.register(email, password, name, alias);
      const userData = { id: response.user.id, email: response.user.email, name: response.user.name, alias: response.user.alias };
      setUser(userData);
      localStorage.setItem('thermomix_user', JSON.stringify(userData));
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Register error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('thermomix_user');
    api.auth.logout();
  };

  const refreshUser = async () => {
    try {
      const userData = await api.auth.getProfile();
      setUser(userData);
      localStorage.setItem('thermomix_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error refreshing user data:', error);
      // If refresh fails, try to get user from localStorage
      const savedUser = localStorage.getItem('thermomix_user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        } catch (parseError) {
          console.error('Error parsing saved user data:', parseError);
        }
      }
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    refreshUser,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};