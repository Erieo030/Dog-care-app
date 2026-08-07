/** 用途：提供統一 API Client，集中處理網址、JSON、逾時與錯誤訊息。 */
const rawBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  '';

export const API_BASE_URL = rawBaseUrl.replace(/\/$/, '');

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
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

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError('尚未設定 EXPO_PUBLIC_API_BASE_URL');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new ApiError(
        getErrorMessage(body, `伺服器錯誤 (${response.status})`),
        response.status
      );
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof SyntaxError) throw new ApiError('伺服器回應格式錯誤');
    if ((error as Error).name === 'AbortError') {
      throw new ApiError('連線逾時，請稍後再試');
    }
    throw new ApiError((error as Error).message || '網路連線失敗');
  } finally {
    clearTimeout(timeout);
  }
}
