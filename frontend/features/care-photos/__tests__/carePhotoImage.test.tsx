Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import CarePhotoImage from '../components/CarePhotoImage';
import { getValidAccessToken } from '../../../services/api';
import { photo } from './carePhotoFixture';

jest.mock('react-native', () => ({
  Image: 'Image',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../../../services/api', () => ({
  API_BASE_URL: 'http://localhost:8000',
  getValidAccessToken: jest.fn(),
}));

let screen: ReactTestRenderer;
const mount = async (hidden = false) => {
  await act(async () => {
    screen = create(
      <CarePhotoImage photo={photo('a')} userId="u1" token="old-token" thumbnail hidden={hidden} />,
    );
  });
};
const retry = () => screen.root.findByType('TouchableOpacity' as never);
const image = () => screen.root.findByType('Image' as never);
beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test('masked photos do not render an Image or request credentials', async () => {
  await mount(true);
  expect(screen.root.findAllByType('Image' as never)).toHaveLength(0);
  expect(getValidAccessToken).not.toHaveBeenCalled();
});

test('thumbnails carry authorization and retry failures with a refreshed token', async () => {
  await mount();
  expect(image().props.source).toEqual({
    uri: 'http://localhost:8000/api/attachments/a/thumbnail?userId=u1&retry=0',
    headers: { Authorization: 'Bearer old-token' },
  });
  await act(async () => image().props.onError());
  (getValidAccessToken as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await act(async () => retry().props.onPress());
  expect(screen.root.findAllByType('Image' as never)).toHaveLength(0);
  (getValidAccessToken as jest.Mock).mockResolvedValueOnce('fresh-token');
  await act(async () => retry().props.onPress());
  expect(image().props.source.headers.Authorization).toBe('Bearer fresh-token');
  expect(image().props.source.uri).toContain('retry=1');
});

test('a late retry cannot overwrite credentials after changing the photo or account', async () => {
  let resolve!: (token: string) => void;
  (getValidAccessToken as jest.Mock).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  await mount();
  await act(async () => image().props.onError());
  await act(async () => retry().props.onPress());
  await act(async () =>
    screen.update(<CarePhotoImage photo={photo('b')} userId="u2" token="other-token" thumbnail />),
  );
  await act(async () => resolve('late-token'));
  expect(image().props.source.uri).toContain('/b/thumbnail?userId=u2');
  expect(image().props.source.headers.Authorization).toBe('Bearer other-token');
});
