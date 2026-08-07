/** 用途：封裝登入與註冊 API；安全 Token 流程依目前範圍暫緩。 */
import { apiRequest } from './api';
import { Pet } from '../types';

export interface AuthResponse {
  success: boolean;
  userId: string;
  hasPet: boolean;
  petData: Pet | null;
  pets?: Pet[];
}

const submitCredentials = (path: string, email: string, password: string) =>
  apiRequest<AuthResponse>(path, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const login = (email: string, password: string) =>
  submitCredentials('/api/login', email, password);

export const register = (email: string, password: string) =>
  submitCredentials('/api/register', email, password);
