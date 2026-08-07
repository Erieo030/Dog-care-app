/** 用途：集中管理登入、註冊與登出狀態；安全持久化依目前範圍暫緩。 */
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';

import * as authService from '../services/authService';
import { normalizePets } from '../services/petService';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = async (
    request: typeof authService.login,
    email: string,
    password: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await request(email, password);
      const rawPets = result.pets ?? (result.petData ? [result.petData] : []);
      setSession({
        userId: result.userId,
        email: email.trim(),
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
      login: (email, password) =>
        authenticate(authService.login, email, password),
      register: (email, password) =>
        authenticate(authService.register, email, password),
      logout: () => {
        setSession(null);
        setError(null);
      },
      clearError: () => setError(null),
    }),
    [session, isLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth 必須在 AuthProvider 內使用');
  return context;
}
