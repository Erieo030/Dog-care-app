/** 只查詢既有附件，不新增、複製或刪除圖片。 */
import { apiData } from './api';
import type { CarePhoto, CarePhotoCategory } from '../features/care-photos/carePhotoContent';

export interface CarePhotoPage {
  items: CarePhoto[];
  total: number;
  hasMore: boolean;
}

export function getCarePhotos(
  userId: string,
  petId: string,
  options: { month: string; category: CarePhotoCategory; skip?: number; limit?: number },
  signal?: AbortSignal,
): Promise<CarePhotoPage> {
  const query = new URLSearchParams({
    userId,
    month: options.month,
    category: options.category,
    skip: String(options.skip || 0),
    limit: String(options.limit || 50),
  });
  return apiData(`/api/pets/${encodeURIComponent(petId)}/care-photos?${query}`, { signal });
}
