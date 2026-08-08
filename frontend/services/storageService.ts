/** 用途：取得 backend 附件容量、計算及清除 PawLog 本機匯出暫存。 */
import { Directory, Paths } from 'expo-file-system';
import { apiRequest } from './api';
interface Usage {
  attachmentCount: number;
  attachmentBytes: number;
  imageCacheBytes: null;
}
type Envelope<T> = { success: boolean; message: string; data: T };
const exportDirectory = () => new Directory(Paths.cache, 'pawlog-exports');
const directoryBytes = (directory: Directory) => {
  if (!directory.exists) return 0;
  return directory
    .list()
    .reduce(
      (sum, item) => sum + ('size' in item && typeof item.size === 'number' ? item.size : 0),
      0,
    );
};
export async function getStorageUsage(userId: string) {
  const remote = (
    await apiRequest<Envelope<Usage>>(`/api/settings/storage?userId=${encodeURIComponent(userId)}`)
  ).data;
  return { ...remote, exportCacheBytes: directoryBytes(exportDirectory()) };
}
export async function clearPawLogCache() {
  const directory = exportDirectory();
  if (directory.exists) directory.delete();
}
