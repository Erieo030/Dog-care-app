/** 用途：封裝登入、註冊、session refresh 與登出 API。 */
import { apiData } from './api';
import { Pet } from '../types';

export interface AuthResponse {
  success: boolean;
  userId: string;
  email: string;
  hasPet: boolean;
  pets: Pet[];
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
}

const submitCredentials = (path: string, email: string, password: string) =>
  apiData<AuthResponse>(path, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const login = (email: string, password: string) =>
  submitCredentials('/api/login', email, password);

export const register = (email: string, password: string) =>
  submitCredentials('/api/register', email, password);

export const refresh = (refreshToken: string) =>
  apiData<AuthResponse>('/api/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

export const logout = (refreshToken: string) =>
  apiData<{ success: boolean }>('/api/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

export const deleteAccount = (password: string) =>
  apiData<{ success: boolean }>('/api/account/delete', {
    method: 'POST',
    body: JSON.stringify({ password }),
  }, 30000);
