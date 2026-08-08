import { apiData } from './api';
export interface LostProfile {
  id?: string;
  enabled: boolean;
  hasToken?: boolean;
  publicToken?: string;
  contactName: string;
  contactPhone: string;
  alternatePhone?: string;
  contactMessage?: string;
  showBreed: boolean;
  showSex: boolean;
  showNeutered: boolean;
  showCoatColor: boolean;
  showDistinctiveFeatures: boolean;
  showAvatar: boolean;
  lostMode: boolean;
  lostSince?: string | null;
  lostLocationText?: string;
  lostMessage?: string;
}
const q = (u: string) => `userId=${encodeURIComponent(u)}`;
export const getLostProfile = (u: string, p: string) =>
  apiData<{ profile: LostProfile | null }>(`/api/pets/${p}/lost-profile?${q(u)}`);
export const saveLostProfile = (u: string, p: string, d: Partial<LostProfile>) => {
  // 後端 schema 僅接受可編輯欄位；token 與資料庫 ID 只能由後端管理。
  const payload = {
    enabled: d.enabled ?? false,
    contactName: d.contactName ?? '',
    contactPhone: d.contactPhone ?? '',
    alternatePhone: d.alternatePhone ?? '',
    contactMessage: d.contactMessage ?? '',
    showBreed: d.showBreed ?? true,
    showSex: d.showSex ?? true,
    showNeutered: d.showNeutered ?? false,
    showCoatColor: d.showCoatColor ?? true,
    showDistinctiveFeatures: d.showDistinctiveFeatures ?? true,
    showAvatar: d.showAvatar ?? true,
    lostMode: d.lostMode ?? false,
    lostSince: d.lostSince ?? null,
    lostLocationText: d.lostLocationText ?? '',
    lostMessage: d.lostMessage ?? '',
  };
  return apiData<{ profile: LostProfile }>(`/api/pets/${p}/lost-profile?${q(u)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};
export const rotateLostToken = (u: string, p: string) =>
  apiData<{ publicToken: string }>(`/api/pets/${p}/lost-profile/rotate-token?${q(u)}`, {
    method: 'POST',
  });
export const disableLostProfile = (u: string, p: string) =>
  apiData(`/api/pets/${p}/lost-profile?${q(u)}`, { method: 'DELETE' });
