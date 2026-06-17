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

  async function validateStoredSession() {
    const currentUser = authApi.getCurrentUser();
    if (!currentUser) {
      setUser(null);
      return null;
    }

    const validatedUser = await authApi.validateCurrentUser();
    setUser(validatedUser);
    return validatedUser;
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      try {
        const validatedUser = await validateStoredSession();
        if (cancelled) return;
        setUser(validatedUser);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrapAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    async function revalidateWhenActive() {
      if (document.visibilityState !== 'visible') {
        return;
      }

      try {
        await validateStoredSession();
      } catch {
        setUser(null);
      }
    }

    const timer = window.setInterval(revalidateWhenActive, 15000);
    window.addEventListener('focus', revalidateWhenActive);
    document.addEventListener('visibilitychange', revalidateWhenActive);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', revalidateWhenActive);
      document.removeEventListener('visibilitychange', revalidateWhenActive);
    };
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
