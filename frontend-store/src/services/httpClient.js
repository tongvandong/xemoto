// Lớp hạ tầng HTTP & phiên đăng nhập.
// - Tạo axios instance dùng chung (gắn interceptor 1 lần).
// - Quản lý token/người dùng trong storage (session ưu tiên, localStorage cho "ghi nhớ").
// Không chứa logic gọi endpoint nghiệp vụ (xem api.js) và không map dữ liệu (xem normalizers.js).
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const AUTH_CHANGED_EVENT = 'basecore:auth-changed';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ===== Storage helpers =====

const getStorage = (type) => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window[type];
  } catch {
    return null;
  }
};

const sessionAuthStorage = {
  getItem(key) {
    return getStorage('sessionStorage')?.getItem(key) ?? null;
  },

  setItem(key, value) {
    getStorage('sessionStorage')?.setItem(key, value);
  },

  removeItem(key) {
    getStorage('sessionStorage')?.removeItem(key);
  },
};

const legacyAuthStorage = {
  getItem(key) {
    return getStorage('localStorage')?.getItem(key) ?? null;
  },

  setItem(key, value) {
    getStorage('localStorage')?.setItem(key, value);
  },

  removeItem(key) {
    getStorage('localStorage')?.removeItem(key);
  },
};

// Lấy phần body của response axios.
export const responseData = (response) => response.data;

// ===== Token & JWT =====

export function getToken() {
  const token = sessionAuthStorage.getItem(TOKEN_KEY);

  if (token) {
    return token;
  }

  const legacyToken = legacyAuthStorage.getItem(TOKEN_KEY);
  if (legacyToken) {
    return legacyToken;
  }

  return null;
}

export const decodeJwtPayload = (token) => {
  if (!token) {
    return null;
  }

  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = decodeURIComponent(
      atob(normalizedPayload)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );

    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
};

export const getClaim = (claims, key) => claims?.[key] || claims?.[`http://schemas.xmlsoap.org/ws/2005/05/identity/claims/${key}`];

export const isTokenExpired = (token) => {
  const claims = decodeJwtPayload(token);
  const expiresAt = Number(claims?.exp);

  if (!Number.isFinite(expiresAt)) {
    return true;
  }

  return Date.now() >= expiresAt * 1000;
};

// ===== Phiên đăng nhập (lưu/đọc/xóa người dùng) =====

const notifyAuthChanged = (user = null) => {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: { user } }));
};

export const clearAuthStorage = (notify = true) => {
  sessionAuthStorage.removeItem(TOKEN_KEY);
  sessionAuthStorage.removeItem(USER_KEY);
  legacyAuthStorage.removeItem(TOKEN_KEY);
  legacyAuthStorage.removeItem(USER_KEY);

  if (notify) {
    notifyAuthChanged(null);
  }
};

export const getStoredUser = () => {
  const rawUser = sessionAuthStorage.getItem(USER_KEY) || legacyAuthStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
};

export const normalizeLoginResponse = (data) => {
  const user = data?.user || data;
  const roles = user?.roles || [];
  const role = data?.role || roles[0];

  return {
    token: data?.token,
    userId: data?.userId || user?.id,
    username: data?.username || user?.email,
    name: data?.name || user?.fullName,
    email: data?.email || user?.email,
    phone: data?.phoneNumber || data?.phone || user?.phoneNumber,
    role,
    roles,
    userType: data?.userType,
    expiresIn: data?.expiresIn,
    expiresAt: data?.expiresAt,
    raw: data,
  };
};

export const saveAuthUser = (user, rememberMe = false) => {
  if (!user?.token) {
    throw new Error('Không nhận được token đăng nhập từ máy chủ');
  }

  const targetStorage = rememberMe ? legacyAuthStorage : sessionAuthStorage;
  const staleStorage = rememberMe ? sessionAuthStorage : legacyAuthStorage;

  targetStorage.setItem(TOKEN_KEY, user.token);
  targetStorage.setItem(USER_KEY, JSON.stringify(user));
  staleStorage.removeItem(TOKEN_KEY);
  staleStorage.removeItem(USER_KEY);

  notifyAuthChanged(user);
};

export const mergeStoredUser = (data = {}) => {
  const currentUser = getStoredUser();
  const token = currentUser?.token || getToken();

  if (!token) {
    return null;
  }

  const nextUser = {
    ...currentUser,
    ...data,
    token,
  };

  const targetStorage = sessionAuthStorage.getItem(TOKEN_KEY) ? sessionAuthStorage : legacyAuthStorage;
  targetStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  notifyAuthChanged(nextUser);
  return nextUser;
};

// ===== Interceptors =====

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.response?.data?.Message;
    if (message) {
      error.message = message;
    }

    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (!isLoginRequest && error.response?.status === 401) {
      clearAuthStorage();
    }

    return Promise.reject(error);
  },
);

export { api };
export default api;
