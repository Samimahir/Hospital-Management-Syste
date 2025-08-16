import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Create context
const AuthContext = createContext();

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  error: null,
  isInitialized: false,
  sessionExpiry: null,
  lastActivity: Date.now()
};

// Action types
const AUTH_ACTIONS = {
  SET_INITIALIZED: 'SET_INITIALIZED',
  USER_LOADING: 'USER_LOADING',
  USER_LOADED: 'USER_LOADED',
  AUTH_ERROR: 'AUTH_ERROR',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAIL: 'LOGIN_FAIL',
  LOGOUT: 'LOGOUT',
  LOGOUT_SILENT: 'LOGOUT_SILENT',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAIL: 'REGISTER_FAIL',
  UPDATE_ACTIVITY: 'UPDATE_ACTIVITY',
  SESSION_WARNING: 'SESSION_WARNING',
  TOKEN_REFRESH: 'TOKEN_REFRESH'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_INITIALIZED:
      return {
        ...state,
        isInitialized: true,
        loading: false
      };

    case AUTH_ACTIONS.USER_LOADING:
      return {
        ...state,
        loading: true,
        error: null
      };

    case AUTH_ACTIONS.USER_LOADED:
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload,
        error: null,
        isInitialized: true,
        lastActivity: Date.now()
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false,
        error: null,
        isInitialized: true,
        sessionExpiry: action.payload.expiresIn ? Date.now() + (action.payload.expiresIn * 1000) : null,
        lastActivity: Date.now()
      };

    case AUTH_ACTIONS.TOKEN_REFRESH:
      return {
        ...state,
        token: action.payload.token,
        sessionExpiry: action.payload.expiresIn ? Date.now() + (action.payload.expiresIn * 1000) : null,
        lastActivity: Date.now()
      };

    case AUTH_ACTIONS.AUTH_ERROR:
    case AUTH_ACTIONS.LOGIN_FAIL:
    case AUTH_ACTIONS.REGISTER_FAIL:
      return {
        ...state,
        token: null,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
        isInitialized: true,
        sessionExpiry: null
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        token: null,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        isInitialized: true,
        sessionExpiry: null
      };

    case AUTH_ACTIONS.LOGOUT_SILENT:
      return {
        ...state,
        token: null,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        sessionExpiry: null
      };

    case AUTH_ACTIONS.UPDATE_ACTIVITY:
      return {
        ...state,
        lastActivity: Date.now()
      };

    case AUTH_ACTIONS.CLEAR_ERRORS:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.SESSION_WARNING:
      return {
        ...state,
        error: 'Session will expire soon. Please save your work.'
      };

    default:
      return state;
  }
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const sessionTimeoutRef = useRef(null);
  const activityTimeoutRef = useRef(null);
  const initialized = useRef(false);

  // Constants
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
  const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minute

  // Set auth token in axios headers with validation
  const setAuthToken = useCallback((token) => {
    if (token && typeof token === 'string' && token.length > 0) {
      // Validate token format (basic JWT validation)
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('token', token);
        return true;
      } else {
        console.error('Invalid token format');
        return false;
      }
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      return false;
    }
  }, []);

  // Enhanced token validation
  const isTokenValid = useCallback((token) => {
    if (!token) return false;
    
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return false;
      
      const payload = JSON.parse(atob(tokenParts[1]));
      const currentTime = Date.now() / 1000;
      
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }, []);

  // Activity tracking
  const updateActivity = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.UPDATE_ACTIVITY });
  }, []);

  // Setup activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [updateActivity]);

  // Session timeout management
  useEffect(() => {
    if (state.isAuthenticated && state.token) {
      // Clear existing timeouts
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }

      // Set session warning
      sessionTimeoutRef.current = setTimeout(() => {
        dispatch({ type: AUTH_ACTIONS.SESSION_WARNING });
        toast.error('Your session will expire in 5 minutes. Please save your work.', {
          duration: 5000
        });
      }, SESSION_TIMEOUT - WARNING_TIME);

      // Set auto logout
      activityTimeoutRef.current = setTimeout(() => {
        logoutSilent();
        toast.error('Session expired due to inactivity. Please log in again.');
      }, SESSION_TIMEOUT);
    }

    return () => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [state.isAuthenticated, state.lastActivity]);

  // Load user from token with enhanced error handling
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      dispatch({ type: AUTH_ACTIONS.SET_INITIALIZED });
      return;
    }

    if (!isTokenValid(token)) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      dispatch({ type: AUTH_ACTIONS.SET_INITIALIZED });
      return;
    }

    if (!setAuthToken(token)) {
      dispatch({ type: AUTH_ACTIONS.SET_INITIALIZED });
      return;
    }

    try {
      dispatch({ type: AUTH_ACTIONS.USER_LOADING });
      
      const res = await axios.get('/api/auth/me', {
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status < 500 // Don't reject for 4xx errors
      });

      if (res.status === 200 && res.data.user) {
        dispatch({
          type: AUTH_ACTIONS.USER_LOADED,
          payload: res.data.user
        });
      } else {
        throw new Error('Invalid user data received');
      }
    } catch (error) {
      console.error('Load user error:', error);
      
      // Handle different error types
      if (error.response) {
        if (error.response.status === 401) {
          // Token is invalid/expired
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        } else if (error.response.status >= 500) {
          // Server error - keep token but show error
          console.error('Server error during authentication');
        }
      } else if (error.code === 'ECONNABORTED') {
        // Timeout error
        console.error('Authentication request timed out');
      } else {
        // Network or other errors
        console.error('Network error during authentication');
      }

      dispatch({
        type: AUTH_ACTIONS.AUTH_ERROR,
        payload: error.response?.data?.message || 'Authentication verification failed'
      });
    }
  }, [isTokenValid, setAuthToken]);

  // Enhanced register function
  const register = async (formData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.USER_LOADING });

      // Input validation
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.role) {
        throw new Error('All required fields must be filled');
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Password strength validation
      if (formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const config = {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      };

      const res = await axios.post('/api/auth/register', formData, config);

      if (res.data.token && setAuthToken(res.data.token)) {
        dispatch({
          type: AUTH_ACTIONS.REGISTER_SUCCESS,
          payload: res.data
        });

        toast.success(`Welcome to the hospital management system, ${res.data.user.firstName}!`);
        return { success: true, user: res.data.user };
      } else {
        throw new Error('Registration succeeded but token is invalid');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      const message = error.response?.data?.message || error.message || 'Registration failed';
      
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAIL,
        payload: message
      });

      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Enhanced login function
  const login = async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.USER_LOADING });

      // Input validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      const config = {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      };

      const body = JSON.stringify({ 
        email: email.toLowerCase().trim(), 
        password 
      });
      
      const res = await axios.post('/api/auth/login', body, config);

      if (res.data.token && setAuthToken(res.data.token)) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: res.data
        });

        toast.success(`Welcome back, ${res.data.user.firstName}!`);
        return { success: true, user: res.data.user };
      } else {
        throw new Error('Login succeeded but token is invalid');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      const message = error.response?.data?.message || error.message || 'Login failed';
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAIL,
        payload: message
      });

      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Silent logout (for timeouts)
  const logoutSilent = useCallback(() => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    
    // Clear timeouts
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    
    dispatch({ type: AUTH_ACTIONS.LOGOUT_SILENT });
  }, []);

  // Regular logout
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    
    // Clear timeouts
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    toast.success('Logged out successfully');
  }, []);

  // Clear errors
  const clearErrors = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERRORS });
  }, []);

  // Enhanced profile update
  const updateProfile = async (formData) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      };

      const res = await axios.put('/api/auth/profile', formData, config);

      dispatch({
        type: AUTH_ACTIONS.USER_LOADED,
        payload: res.data.user
      });

      toast.success('Profile updated successfully');
      return { success: true, user: res.data.user };
    } catch (error) {
      console.error('Profile update error:', error);
      
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Enhanced password change
  const changePassword = async (currentPassword, newPassword) => {
    try {
      // Password validation
      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      const config = {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      };

      const body = JSON.stringify({ currentPassword, newPassword });
      await axios.post('/api/auth/change-password', body, config);

      toast.success('Password changed successfully. Please log in again.');
      
      // Force re-login for security
      setTimeout(() => {
        logout();
      }, 2000);
      
      return { success: true };
    } catch (error) {
      console.error('Password change error:', error);
      
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Token refresh function
  const refreshToken = async () => {
    try {
      const res = await axios.post('/api/auth/refresh');
      
      if (res.data.token && setAuthToken(res.data.token)) {
        dispatch({
          type: AUTH_ACTIONS.TOKEN_REFRESH,
          payload: res.data
        });
        return { success: true };
      } else {
        throw new Error('Invalid refresh token response');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logoutSilent();
      return { success: false };
    }
  };

  // Check if user has specific role
  const hasRole = useCallback((role) => {
    return state.user?.role === role;
  }, [state.user]);

  // Check if user has any of the specified roles
  const hasAnyRole = useCallback((roles) => {
    return roles.includes(state.user?.role);
  }, [state.user]);

  // Initialize auth on component mount
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      loadUser();
    }
  }, [loadUser]);

  // Axios interceptor for handling 401 responses
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && state.isAuthenticated) {
          // Try to refresh token first
          const refreshResult = await refreshToken();
          if (!refreshResult.success) {
            logoutSilent();
            toast.error('Session expired. Please log in again.');
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [state.isAuthenticated]);

  // Context value
  const value = {
    ...state,
    register,
    login,
    logout,
    logoutSilent,
    loadUser,
    clearErrors,
    updateProfile,
    changePassword,
    refreshToken,
    hasRole,
    hasAnyRole,
    updateActivity
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for role-based access
export const withRoleAccess = (allowedRoles) => (Component) => {
  return function RoleRestrictedComponent(props) {
    const { user, hasAnyRole } = useAuth();
    
    if (!user || !hasAnyRole(allowedRoles)) {
      return (
        <div className="alert alert-warning">
          <h4>Access Denied</h4>
          <p>You don't have permission to access this page.</p>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};

export default AuthContext;