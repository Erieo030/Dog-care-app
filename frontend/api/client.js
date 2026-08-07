/** 用途：集中處理 API 基底網址、JSON 解析與錯誤訊息。 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

const getErrorMessage = (result, fallback) => {
  if (typeof result?.detail === 'string') {
    return result.detail;
  }
  if (Array.isArray(result?.detail) && result.detail.length > 0) {
    const error = result.detail[0];
    const field = error?.loc?.at(-1);
    if (field === 'password' && error?.type === 'string_too_short') {
      return '密碼至少需要 8 個字元';
    }
    return error?.msg || fallback;
  }
  return result?.detail?.message || result?.message || fallback;
};

export const requestJson = async (path, options = {}) => {
  if (!API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_URL 尚未設定');
  }
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(result, `伺服器錯誤 (${response.status})`));
  }
  return result;
};
