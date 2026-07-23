import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCookie, removeCookie, setCookie } from './cookie';
import { setUnauthorizedHandler } from '../services/apiClient';
import { normalizeRole } from './roleRoutes';

const TOKEN_COOKIE_KEY = 'vista_token';
const USER_STORAGE_KEY = 'vista_user';
const AuthContext = createContext(null);

function readStoredUser() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      role: normalizeRole(parsed?.role ?? parsed?.role?.name ?? parsed?.role?.display_name),
    };
  } catch (error) {
    console.warn('Failed to parse stored user', error);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getCookie(TOKEN_COOKIE_KEY));
  const [user, setUser] = useState(() => readStoredUser());
  const isAuthenticated = Boolean(token && user);

  const persistAuth = useCallback(
    ({ nextToken, nextUser }) => {
      if (nextToken) {
        setCookie(TOKEN_COOKIE_KEY, nextToken);
      } else {
        removeCookie(TOKEN_COOKIE_KEY);
      }
      setToken(nextToken ?? null);

      if (nextUser) {
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
      } else {
        window.localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
      }
    },
    [setToken, setUser],
  );

  const login = useCallback(
    ({ token: nextToken, user: nextUser }) => {
      persistAuth({ nextToken, nextUser });
    },
    [persistAuth],
  );

  const logout = useCallback(() => {
    persistAuth({ nextToken: null, nextUser: null });
  }, [persistAuth]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo(
    () => ({
      token,
      user,
      role: normalizeRole(user?.role ?? null),
      isAuthenticated,
      login,
      logout,
      hasRole: (allowed) => {
        if (!allowed || allowed.length === 0) return true;
        const normalized = Array.isArray(allowed) ? allowed : [allowed];
        const normalizedRole = normalizeRole(user?.role ?? null);
        if (normalizedRole === 'superadmin') return true;
        return normalized.includes(normalizedRole);
      },
    }),
    [isAuthenticated, login, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
