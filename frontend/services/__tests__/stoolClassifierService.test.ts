import { classifyStoolPhoto } from '../stoolClassifierService';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../api';

jest.mock('../api', () => ({ ApiError: Error, apiRequest: jest.fn() }));
jest.mock('../mediaPermissionService', () => ({
  requestMediaPermission: jest.fn().mockResolvedValue({ granted: true }),
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'file:///cache/stool.jpg' }),
}));
jest.mock('expo-file-system', () => ({
  File: class extends Blob {
    exists = true;
    size = 16;
    delete = jest.fn();
    constructor(uri: string) {
      super(['photo'], { type: 'image/jpeg' });
      void uri;
    }
  },
}));

const pickerResult = {
  canceled: false,
  assets: [{ uri: 'file:///camera/photo.heic', width: 1600, height: 1200 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue(pickerResult);
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(pickerResult);
});

test('classifies a selected image through MEGO API and returns the suggestion envelope', async () => {
  const suggestion = { status: 'ok', suggestedStoolLevel: 'soft' };
  (apiRequest as jest.Mock).mockResolvedValue({ data: suggestion });

  const result = await classifyStoolPhoto({ source: 'library', userId: 'u 1', petId: 'p/1' });

  expect(result).toEqual(suggestion);
  expect(apiRequest).toHaveBeenCalledWith(
    '/api/pets/p%2F1/stool-classifications?userId=u%201',
    expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    15000,
  );
  expect((apiRequest as jest.Mock).mock.calls[0][1].body.get('file')).toBeInstanceOf(Blob);
});

test('returns null when the user cancels photo selection without calling the API', async () => {
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
  await expect(classifyStoolPhoto({ source: 'library', userId: 'u1', petId: 'p1' })).resolves.toBeNull();
  expect(apiRequest).not.toHaveBeenCalled();
});

test('does not open the picker when media permission is denied', async () => {
  const { requestMediaPermission } = jest.requireMock('../mediaPermissionService') as {
    requestMediaPermission: jest.Mock;
  };
  requestMediaPermission.mockResolvedValueOnce({ granted: false });
  await expect(classifyStoolPhoto({ source: 'camera', userId: 'u1', petId: 'p1' })).rejects.toThrow('相機權限');
  expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
});
