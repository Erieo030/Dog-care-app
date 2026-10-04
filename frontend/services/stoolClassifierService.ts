/** 用途：拍攝或選取糞便照片，取得外觀分類建議；照片不作為附件保存。 */
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { DailyStoolLevel } from '../types';
import { MEGO_UPLOAD_MAX_BYTES, MEGO_UPLOAD_MAX_MB } from '../constants/Attachments';
import { ApiError, apiRequest } from './api';
import { MediaPermissionSource, requestMediaPermission } from './mediaPermissionService';

export type StoolClassification = {
  status: 'ok' | 'low_confidence';
  modelLabel: string | null;
  suggestedStoolLevel: DailyStoolLevel | null;
  suggestedStoolLabel: string | null;
  message: string | null;
  confidence: number;
  probabilities: Record<DailyStoolLevel, number>;
  threshold: number;
  modelVersion: string;
  disclaimer: string;
};

async function preparePhoto(asset: ImagePicker.ImagePickerAsset) {
  const file = new FileSystem.File(asset.uri);
  if (!file.exists) throw new ApiError('無法讀取所選照片');
  const actions =
    Math.max(asset.width, asset.height) > 1024
      ? [
          {
            resize:
              asset.width >= asset.height ? { width: 1024 } : { height: 1024 },
          },
        ]
      : [];
  const result = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const preparedFile = new FileSystem.File(result.uri);
  if (!preparedFile.exists || preparedFile.size == null) {
    throw new ApiError('無法處理所選照片');
  }
  if (preparedFile.size > MEGO_UPLOAD_MAX_BYTES) {
    preparedFile.delete();
    throw new ApiError(`照片仍超過 ${MEGO_UPLOAD_MAX_MB} MB，請選擇較小的照片`);
  }
  return preparedFile;
}

export async function classifyStoolPhoto(input: {
  source: MediaPermissionSource;
  userId: string;
  petId: string;
}): Promise<StoolClassification | null> {
  const permission = await requestMediaPermission(input.source);
  if (!permission.granted) {
    throw new ApiError(input.source === 'camera' ? '請允許相機權限後再拍照' : '請允許相簿權限後再選擇照片');
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
  const picked =
    input.source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (picked.canceled || !picked.assets[0]) return null;

  const preparedFile = await preparePhoto(picked.assets[0]);
  try {
    const form = new FormData();
    form.append('file', preparedFile, `mego-stool-${Date.now()}.jpg`);
    const response = await apiRequest<{ data: StoolClassification }>(
      `/api/pets/${encodeURIComponent(input.petId)}/stool-classifications?userId=${encodeURIComponent(input.userId)}`,
      { method: 'POST', headers: { Accept: 'application/json' }, body: form },
      15000,
    );
    return response.data;
  } finally {
    // Remove only the temporary compressed copy created for this request.
    preparedFile.delete();
  }
}
