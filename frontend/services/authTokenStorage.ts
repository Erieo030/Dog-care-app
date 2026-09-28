/** Store authentication credentials in iOS Keychain / Android Keystore via SecureStore. */
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'mego.auth.access-token.v1';
const REFRESH_TOKEN_KEY = 'mego.auth.refresh-token.v1';

export type AuthTokens = { accessToken: string; refreshToken: string; expiresAt?: number };
const ACCESS_EXPIRES_AT_KEY = 'mego.auth.access-expires-at.v1';

export async function readAuthTokens(): Promise<AuthTokens | null> {
  const [accessToken, refreshToken, expiresAt] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(ACCESS_EXPIRES_AT_KEY),
  ]);
  return accessToken && refreshToken ? { accessToken, refreshToken, expiresAt: Number(expiresAt) || 0 } : null;
}

export async function saveAuthTokens(tokens: AuthTokens & { expiresIn?: number }): Promise<void> {
  const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken, options),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken, options),
    SecureStore.setItemAsync(ACCESS_EXPIRES_AT_KEY, String(Date.now() + (tokens.expiresIn ?? 900) * 1000), options),
  ]);
}

export async function clearAuthTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(ACCESS_EXPIRES_AT_KEY),
  ]);
}
