import React, { createContext, useState, useEffect } from 'react';
import { login as apiLogin, getMe } from '../services/api';

export const AuthContext = createContext();

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      getUserInfo();
    } else {
      setLoading(false);
    }
  }, []);

  const getUserInfo = async (setLoadingState = true) => {
    if (setLoadingState) {
      setLoading(true);
    }
    try {
      const response = await getMe();
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching user info:', error);
      localStorage.removeItem('token');
      setUser(null);
      throw error; // Re-throw to let caller handle it
    } finally {
      if (setLoadingState) {
        setLoading(false);
      }
    }
  };

  const login = async (username, password) => {
    try {
      const response = await apiLogin(username, password);
      const { access_token } = response.data;
      
      if (!access_token) {
        return {
          success: false,
          message: 'No access token received from server',
        };
      }
      
      localStorage.setItem('token', access_token);
      
      // Get user info after setting token (don't set loading state here)
      try {
        const userData = await getUserInfo(false);
        setUser(userData);
        return { success: true };
      } catch (error) {
        console.error('Error getting user info after login:', error);
        // Clear token if getUserInfo fails
        localStorage.removeItem('token');
        return {
          success: false,
          message: error.response?.data?.detail || 'Failed to fetch user information. Please try again.',
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || error.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    setUser,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export hook separately
export { useAuth };
