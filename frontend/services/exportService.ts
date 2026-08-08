/** 用途：集中建立、輪詢、取消、下載及分享匯出檔案。 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL, apiData } from './api';
import { ExportJob, ExportRequest } from '../types';
const query = (userId: string) => `userId=${encodeURIComponent(userId)}`;
export async function createExport(userId: string, request: ExportRequest) {
  return await apiData<ExportJob>(
    `/api/exports?${query(userId)}`,
    { method: 'POST', body: JSON.stringify(request) },
    30000,
  );
}
export async function getExport(userId: string, id: string) {
  return await apiData<ExportJob>(`/api/exports/${id}?${query(userId)}`);
}
export async function cancelExport(userId: string, id: string) {
  return await apiData<ExportJob>(`/api/exports/${id}?${query(userId)}`, {
    method: 'DELETE',
  });
}
export async function downloadAndShareExport(userId: string, job: ExportJob) {
  if (!job.fileName) throw new Error('匯出檔案尚未完成');
  const directory = `${FileSystem.cacheDirectory}pawlog-exports/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const target = `${directory}${job.fileName}`;
  const result = await FileSystem.downloadAsync(
    `${API_BASE_URL}/api/exports/${job.id}/download?${query(userId)}`,
    target,
  );
  if (result.status < 200 || result.status >= 300) throw new Error('下載匯出檔案失敗');
  if (!(await Sharing.isAvailableAsync())) throw new Error('此裝置不支援系統分享或儲存');
  await Sharing.shareAsync(result.uri, {
    mimeType: job.mimeType,
    dialogTitle: '分享或儲存 PawLog 匯出檔',
  });
  return result.uri;
}
