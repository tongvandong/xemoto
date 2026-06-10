import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

const normalizeAuthMessage = (message) => {
  const normalized = String(message || '').trim().toLowerCase();
  if (normalized === 'email/so dien thoai hoac mat khau khong dung.') {
    return 'Email/số điện thoại hoặc mật khẩu không đúng.';
  }
  if (normalized === 'tai khoan khong o trang thai active.') {
    return 'Tài khoản không ở trạng thái hoạt động.';
  }
  return message;
};

const getUserRoles = (value) => value?.roles || value?.Roles || (value?.role ? [value.role] : []);
const hasAdminAccess = (value) => {
  const roles = getUserRoles(value);
  return roles.includes('Admin') || roles.includes('Staff');
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('admin_user');
    const token = localStorage.getItem('admin_token');
    if (storedUser && token) {
      const parsedUser = JSON.parse(storedUser);
      if (hasAdminAccess(parsedUser)) {
        setUser(parsedUser);
      } else {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const data = response.data;
      const authUser = data.user || data;

      if (!hasAdminAccess(authUser)) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        return { success: false, message: 'Tài khoản không có quyền truy cập trang quản trị.' };
      }

      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(authUser));
      setUser(authUser);

      return { success: true };
    } catch (error) {
      const resp = error.response;
      let message = 'Đăng nhập thất bại. Vui lòng thử lại.';
      if (resp?.status === 401) {
        message = resp.data?.message || 'Email hoặc mật khẩu không đúng.';
      } else if (resp?.status === 400) {
        message = resp.data?.message || 'Thông tin đăng nhập không hợp lệ.';
      } else if (resp?.data?.message) {
        message = resp.data.message;
      }
      return { success: false, message: normalizeAuthMessage(message) };
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setUser(null);
  };

  const isAdmin = () => {
    return getUserRoles(user).includes('Admin');
  };

  const hasRole = (...roles) => {
    const userRoles = getUserRoles(user);
    return roles.some((role) => userRoles.includes(role));
  };

  const value = {
    user,
    login,
    logout,
    isAdmin,
    hasRole,
    isAuthenticated: !!user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
