/** 用途：封裝登入與註冊 API，避免畫面直接發送 HTTP 請求。 */
import { requestJson } from '../api/client';

const postCredentials = (path, email, password) =>
  requestJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

export const login = (email, password) =>
  postCredentials('/api/login', email, password);

export const register = (email, password) =>
  postCredentials('/api/register', email, password);
