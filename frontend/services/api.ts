/** 用途：提供統一 API Client，集中處理網址、JSON、逾時與錯誤訊息。 */
import { clearAuthTokens, readAuthTokens, saveAuthTokens } from './authTokenStorage';
// 選填網址留白時，使用啟動腳本提供的網址；保留直接存取供 Expo 靜態替換。
const rawBaseUrl =
  (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim() ||
  (process.env.EXPO_PUBLIC_API_URL || '').trim() ||
  '';

export const API_BASE_URL = rawBaseUrl.replace(/\/$/, '');

export type ApiEnvelope<T> = { success: boolean; message?: string; data: T };

export class ApiError extends Error {
  status?: number;
  code?: 'CANCELLED' | 'TIMEOUT';

  constructor(message: string, status?: number, code?: 'CANCELLED' | 'TIMEOUT') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const getErrorMessage = (body: unknown, fallback: string) => {
  const result = body as {
    detail?: string | Array<{ msg?: string }>;
    message?: string;
  };
  if (typeof result?.detail === 'string') return result.detail;
  if (Array.isArray(result?.detail)) return result.detail[0]?.msg ?? fallback;
  return result?.message ?? fallback;
};

export function unwrapApiEnvelope<T>(body: T | ApiEnvelope<T>): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as ApiEnvelope<T>).data;
  }
  return body as T;
}

let refreshInFlight: Promise<boolean> | null = null;
let authExpiredHandler: (() => void) | null = null;

export function setAuthExpiredHandler(handler: (() => void) | null) {
  authExpiredHandler = handler;
}

const isPublicAuthPath = (path: string) =>
  ['/api/login', '/api/register', '/api/refresh', '/api/logout'].some(
    (endpoint) => path.split('?')[0] === endpoint,
  );

export async function refreshStoredTokens(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const tokens = await readAuthTokens();
    if (!tokens?.refreshToken) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${API_BASE_URL}/api/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        signal: controller.signal,
      });
      const envelope = await response.json();
      if (response.status === 401) return false;
      if (!response.ok) throw new ApiError('暫時無法更新登入狀態，請確認網路後重試', response.status);
      const data = unwrapApiEnvelope(envelope) as { accessToken?: string; refreshToken?: string; expiresIn?: number };
      if (!data.accessToken || !data.refreshToken) return false;
      await saveAuthTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken, expiresIn: data.expiresIn });
      return true;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError((error as Error).name === 'AbortError' ? '更新登入狀態逾時' : '暫時無法連線確認登入狀態');
    } finally {
      clearTimeout(timeout);
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await readAuthTokens();
  if (!tokens) return null;
  if (tokens.expiresAt && tokens.expiresAt < Date.now() + 30_000) {
    if (!(await refreshStoredTokens())) {
      await clearAuthTokens();
      authExpiredHandler?.();
      return null;
    }
    return (await readAuthTokens())?.accessToken ?? null;
  }
  return tokens.accessToken;
}

export async function apiData<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 10000,
): Promise<T> {
  const body = await apiRequest<T | ApiEnvelope<T>>(path, options, timeoutMs);
  return unwrapApiEnvelope(body);
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 10000,
  allowRefresh = true,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError('尚未設定 EXPO_PUBLIC_API_BASE_URL');
  }

  const controller = new AbortController();
  let timedOut = false;
  const callerSignal = options.signal;
  const abortFromCaller = () => controller.abort();
  if (callerSignal?.aborted) controller.abort();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const accessToken = isPublicAuthPath(path) ? null : await getValidAccessToken();
    if (controller.signal.aborted) {
      throw Object.assign(new Error('Request aborted'), { name: 'AbortError' });
    }
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (!(typeof FormData !== 'undefined' && options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    if (response.status === 401 && allowRefresh && !isPublicAuthPath(path)) {
      if (await refreshStoredTokens()) return apiRequest<T>(path, options, timeoutMs, false);
      await clearAuthTokens();
      authExpiredHandler?.();
    }
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new ApiError(getErrorMessage(body, `伺服器錯誤 (${response.status})`), response.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof SyntaxError) throw new ApiError('伺服器回應格式錯誤');
    if (callerSignal?.aborted) {
      throw new ApiError('請求已取消', undefined, 'CANCELLED');
    }
    if (timedOut || (error as Error).name === 'AbortError') {
      throw new ApiError('連線逾時，請稍後再試', undefined, 'TIMEOUT');
    }
    throw new ApiError((error as Error).message || '網路連線失敗');
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}
