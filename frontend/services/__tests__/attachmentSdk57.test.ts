import { pickAndUploadAttachments, uploadPetAvatarImage } from '../attachmentService';
import * as ImagePicker from 'expo-image-picker';

jest.mock('../api', () => ({
  API_BASE_URL: 'http://localhost:8000',
  ApiError: Error,
  apiData: jest.fn(),
  apiRequest: (path: string, options: RequestInit) =>
    global.fetch(`http://localhost:8000${path}`, options).then((response) => response.json()),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///photo.jpg',
        fileName: 'photo.jpg',
        width: 400,
        height: 400,
        mimeType: 'image/jpeg',
      },
    ],
  }),
}));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { PNG: 'png', JPEG: 'jpeg' },
  manipulateAsync: jest
    .fn()
    .mockResolvedValue({ uri: 'file:///compressed.jpg', width: 400, height: 400 }),
}));
jest.mock('expo-file-system', () => ({
  File: class extends Blob {
    exists = true;
    constructor() {
      super(['photo'], { type: 'image/jpeg' });
    }
  },
}));

test('photo upload uses a real Blob with filename for the SDK 57 fetch implementation', async () => {
  const originalFetch = global.fetch;
  const fetchMock = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ data: { id: 'photo-1' } }) });
  global.fetch = fetchMock;
  try {
    const result = await pickAndUploadAttachments({
      source: 'library',
      userId: 'u1',
      petId: 'p1',
      sourceType: 'health_event',
      remaining: 1,
    });
    const body = fetchMock.mock.calls[0][1].body as FormData;
    const uploaded = body.get('file') as File;
    expect(uploaded).toBeInstanceOf(Blob);
    expect(uploaded.name).toBe('photo.jpg');
    expect(uploaded.type).toBe('image/jpeg');
    expect(await uploaded.text()).toBe('photo');
    expect(body.get('width')).toBe('400');
    expect(result).toEqual([{ id: 'photo-1' }]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('pet avatar is converted to compressed JPEG and uploaded through the pet attachment endpoint', async () => {
  const originalFetch = global.fetch;
  const fetchMock = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ data: { id: 'avatar-1' } }) });
  global.fetch = fetchMock;
  try {
    const result = await uploadPetAvatarImage('u1', 'p1', 'file:///picked.png');
    const [url, options] = fetchMock.mock.calls[0];
    const body = options?.body as FormData;
    const uploaded = body.get('file') as File;
    expect(String(url)).toContain('/api/pets/p1/attachments?userId=u1');
    expect(uploaded.name).toMatch(/^mego-avatar-\d+\.jpg$/);
    expect(uploaded.type).toBe('image/jpeg');
    expect(body.get('width')).toBe('400');
    expect(result).toEqual({ id: 'avatar-1' });
  } finally {
    global.fetch = originalFetch;
  }
});

test('a denied library permission prevents opening the system photo picker', async () => {
  const requestPermission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
  const openLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;
  requestPermission.mockResolvedValueOnce({ granted: false, canAskAgain: true });
  openLibrary.mockClear();

  await expect(
    pickAndUploadAttachments({
      source: 'library',
      userId: 'u1',
      petId: 'p1',
      sourceType: 'health_event',
      remaining: 1,
    }),
  ).rejects.toThrow('請允許相簿權限');
  expect(openLibrary).not.toHaveBeenCalled();
});
