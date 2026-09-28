/** 用途：集中處理圖片選取、壓縮、上傳、刪除與內容 URL。 */
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { ATTACHMENT_ALLOWED_MIME, ATTACHMENT_MAX_BYTES } from '../constants/Attachments';
import { Attachment, AttachmentSourceType } from '../types';
import { API_BASE_URL, apiData, apiRequest, ApiError } from './api';
import { requestMediaPermission } from './mediaPermissionService';

export type AttachmentPickSource = 'camera' | 'library';

const ensurePermission = async (source: AttachmentPickSource) => {
  const result = await requestMediaPermission(source);
  if (!result.granted)
    throw new ApiError(
      source === 'camera' ? '請允許相機權限後再拍照' : '請允許相簿權限後再選擇照片',
    );
};

const compress = async (asset: ImagePicker.ImagePickerAsset) => {
  const format =
    asset.mimeType === 'image/png'
      ? ImageManipulator.SaveFormat.PNG
      : ImageManipulator.SaveFormat.JPEG;
  const actions = asset.width > 1800 ? [{ resize: { width: 1800 } }] : [];
  const result = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: 0.78,
    format,
  });
  const file = new FileSystem.File(result.uri);
  if (!file.exists || file.size == null) throw new ApiError('無法讀取處理後的圖片');
  if (file.size > ATTACHMENT_MAX_BYTES)
    throw new ApiError('圖片壓縮後仍超過 10 MB，請選擇較小的圖片');
  const mimeType = format === ImageManipulator.SaveFormat.PNG ? 'image/png' : 'image/jpeg';
  if (!(ATTACHMENT_ALLOWED_MIME as readonly string[]).includes(mimeType))
    throw new ApiError('只支援 JPG、JPEG、PNG 圖片');
  return { uri: result.uri, width: result.width, height: result.height, mimeType };
};

export async function pickAndUploadAttachments(input: {
  source: AttachmentPickSource;
  userId: string;
  petId: string;
  sourceType: AttachmentSourceType;
  remaining: number;
}): Promise<Attachment[]> {
  if (input.remaining <= 0) throw new ApiError('已達此紀錄的照片上限');
  await ensurePermission(input.source);
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.85,
    allowsMultipleSelection: input.source === 'library',
    selectionLimit: input.remaining,
  };
  const result =
    input.source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return [];
  const selected = result.assets.slice(0, input.remaining);
  const uploaded: Attachment[] = [];
  for (const asset of selected) {
    const prepared = await compress(asset);
    const form = new FormData();
    form.append(
      'file',
      new FileSystem.File(prepared.uri),
      asset.fileName || `mego-${Date.now()}.${prepared.mimeType === 'image/png' ? 'png' : 'jpg'}`,
    );
    form.append('width', String(prepared.width));
    form.append('height', String(prepared.height));
    const body = await apiRequest<{ data: Attachment }>(
      `/api/pets/${input.petId}/attachments?userId=${encodeURIComponent(input.userId)}`,
      { method: 'POST', headers: { Accept: 'application/json' }, body: form },
    );
    uploaded.push(body.data);
  }
  return uploaded;
}

export const attachmentUri = (item: Attachment, userId: string, retry = 0) => {
  if (/^file:|^content:|^https?:/.test(item.contentPath)) return item.contentPath;
  return `${API_BASE_URL}${item.contentPath}?userId=${encodeURIComponent(userId)}&retry=${retry}`;
};

export async function deleteAttachment(userId: string, item: Attachment) {
  try {
    await apiData(`/api/attachments/${item.id}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
  } catch (error) {
    if ((error as ApiError).status !== 404) throw error;
  }
}
