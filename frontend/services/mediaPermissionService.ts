/** 用途：集中請求相簿與相機權限，所有圖片入口先取得飼主同意再開啟系統 UI。 */
import * as ImagePicker from 'expo-image-picker';

export type MediaPermissionSource = 'camera' | 'library';

export function requestMediaPermission(source: MediaPermissionSource) {
  return source === 'camera'
    ? ImagePicker.requestCameraPermissionsAsync()
    : ImagePicker.requestMediaLibraryPermissionsAsync();
}

export function getMediaPermissionCopy(source: MediaPermissionSource) {
  return source === 'camera'
    ? {
        title: '需要相機權限',
        message: '允許 MEGO 使用相機，才能拍攝毛孩照片或照護紀錄照片。',
      }
    : {
        title: '需要相簿權限',
        message: '允許 MEGO 存取相簿，才能選取毛孩照片或照護紀錄照片；只有你選取的照片會加入 App。',
      };
}
