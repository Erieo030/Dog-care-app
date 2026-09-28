/** 用途：集中管理登入、註冊、SecureStore session 恢復與登出狀態。 */
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import * as authService from '../services/authService';
import { normalizePets } from '../services/petService';
import { ApiError, setAuthExpiredHandler } from '../services/api';
import { clearAuthTokens, readAuthTokens, saveAuthTokens } from '../services/authTokenStorage';
import { Pet } from '../types';

interface Session {
  userId: string;
  email: string;
  pets: Pet[];
}

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const restoreSession = async () => {
      try {
        const tokens = await readAuthTokens();
        if (!tokens?.refreshToken) return;
        const result = await authService.refresh(tokens.refreshToken);
        await saveAuthTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        });
        if (mounted) {
          setSession({
            userId: result.userId,
            email: result.email,
            pets: normalizePets((result.pets ?? (result.petData ? [result.petData] : [])) as unknown[]),
          });
        }
      } catch (restoreError) {
        if ((restoreError as ApiError).status === 401) await clearAuthTokens();
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setAuthExpiredHandler(() => {
      setSession(null);
      setError('登入狀態已失效，請重新登入');
    });
    return () => setAuthExpiredHandler(null);
  }, []);

  const authenticate = async (
    request: typeof authService.login,
    email: string,
    password: string,
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await request(email, password);
      await saveAuthTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
      const rawPets = result.pets ?? (result.petData ? [result.petData] : []);
      setSession({
        userId: result.userId,
        email: result.email || email.trim(),
        pets: normalizePets(rawPets as unknown[]),
      });
    } catch (requestError) {
      const message = (requestError as Error).message || '操作失敗';
      setError(message);
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      error,
      login: (email, password) => authenticate(authService.login, email, password),
      register: (email, password) => authenticate(authService.register, email, password),
      logout: () => {
        void (async () => {
          let refreshToken: string | undefined;
          try {
            const tokens = await readAuthTokens();
            refreshToken = tokens?.refreshToken;
          } catch {
            // Continue clearing local credentials if secure storage is unavailable.
          }
          try { await clearAuthTokens(); } catch { /* Keep local navigation signed out. */ }
          if (refreshToken) {
            try { await authService.logout(refreshToken); } catch { /* Server-side expiry remains the fallback. */ }
          }
        })();
        setSession(null);
        setError(null);
      },
      clearError: () => setError(null),
    }),
    [session, isLoading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth 必須在 AuthProvider 內使用');
  return context;
}
