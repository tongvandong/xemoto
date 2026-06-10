import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AUTH_CHANGED_EVENT, authApi } from '../services/api.js';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function syncUser() {
    setUser(authApi.getCurrentUser());
  }

  useEffect(() => {
    syncUser();
    setLoading(false);
  }, []);

  useEffect(() => {
    function handleStorage(event) {
      if (!event.key || event.key === 'token' || event.key === 'user') {
        syncUser();
      }
    }

    window.addEventListener('storage', handleStorage);
    window.addEventListener(AUTH_CHANGED_EVENT, syncUser);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(AUTH_CHANGED_EVENT, syncUser);
    };
  }, []);

  async function login(credentials) {
    const nextUser = await authApi.login(credentials);
    setUser(nextUser);
    return nextUser;
  }

  function register(payload) {
    return authApi.register(payload);
  }

  function logout() {
    authApi.logout();
    setUser(null);
  }

  function updateUser(data) {
    const nextUser = authApi.updateStoredUser(data);
    setUser(nextUser);
    return nextUser;
  }

  function isAdmin() {
    return user?.role === 'Admin' || user?.userType === 1;
  }

  const isAuthenticated = Boolean(user?.token);

  const value = useMemo(
    () => ({
      user,
      login,
      register,
      logout,
      updateUser,
      isAdmin,
      isAuthenticated,
      loading,
    }),
    [user, isAuthenticated, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
