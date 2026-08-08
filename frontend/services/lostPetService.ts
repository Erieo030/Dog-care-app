import { apiRequest } from './api';
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
  apiRequest<{ profile: LostProfile | null }>(`/api/pets/${p}/lost-profile?${q(u)}`);
export const saveLostProfile = (u: string, p: string, d: Partial<LostProfile>) =>
  apiRequest<{ profile: LostProfile }>(`/api/pets/${p}/lost-profile?${q(u)}`, {
    method: 'PUT',
    body: JSON.stringify(d),
  });
export const rotateLostToken = (u: string, p: string) =>
  apiRequest<{ publicToken: string }>(`/api/pets/${p}/lost-profile/rotate-token?${q(u)}`, {
    method: 'POST',
  });
export const disableLostProfile = (u: string, p: string) =>
  apiRequest(`/api/pets/${p}/lost-profile?${q(u)}`, { method: 'DELETE' });
