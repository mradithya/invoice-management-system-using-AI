import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService, profileService } from '../services/apiService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await authService.checkAuth();
      if (response.success && response.data?.logged_in) {
        setUser({
          user_id: response.data.user_id,
          email: response.data.email,
          full_name: response.data.full_name,
          role: response.data.role || 'staff',
          profile_photo: response.data.profile_photo || null
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    if (response.success) {
      setUser(response.data);
      return response;
    }
    throw new Error(response.message);
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    if (response.success) {
      return response;
    }
    throw new Error(response.message);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const response = await profileService.update(profileData);
    if (response.success) {
      setUser((previous) => ({
        ...(previous || {}),
        ...response.data,
        role: response.data?.role || previous?.role || 'staff'
      }));
      return response;
    }
    throw new Error(response.message);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user
    ,
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
