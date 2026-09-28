/** 用途：提供不依賴圖片資產的首頁主題識別與驗證。 */
export const HOME_THEME_IDS = ['morning-home', 'afternoon-living-room', 'garden-walk'] as const;

export type HomeThemeId = (typeof HOME_THEME_IDS)[number];

export const DEFAULT_HOME_THEME: HomeThemeId = 'morning-home';

export function isHomeThemeId(value: unknown): value is HomeThemeId {
  return typeof value === 'string' && HOME_THEME_IDS.includes(value as HomeThemeId);
}
