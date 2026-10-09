Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useCarePhotos } from '../useCarePhotos';
import { getCarePhotos, type CarePhotoPage } from '../../../services/carePhotoService';
import { photo } from './carePhotoFixture';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../../services/carePhotoService', () => ({ getCarePhotos: jest.fn() }));
jest.mock('../../../services/api', () => ({
  getValidAccessToken: jest.fn().mockResolvedValue('token'),
}));

let current: ReturnType<typeof useCarePhotos>;
let screen: ReactTestRenderer;
const page = (id: string, hasMore = false): CarePhotoPage => ({
  items: [photo(id)],
  total: 2,
  hasMore,
});

test('refreshing after an initial failure retries the same scope and clears the error', async () => {
  (getCarePhotos as jest.Mock)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(page('recovered'));
  await act(async () => {
    screen = create(<Harness />);
  });
  expect(current.error).toBe('offline');
  const oldSignal = (getCarePhotos as jest.Mock).mock.calls[0][3] as AbortSignal;
  await act(async () => current.refresh());
  expect(oldSignal.aborted).toBe(true);
  expect(current.error).toBe('');
  expect(current.page.items.map((item) => item.id)).toEqual(['recovered']);
});
function Harness({ petId = 'p1', month = '2026-10' }: { petId?: string; month?: string }) {
  current = useCarePhotos('u1', petId, month, 'all');
  return null;
}
function pending() {
  let resolve!: (value: CarePhotoPage) => void;
  const promise = new Promise<CarePhotoPage>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test('changing pets hides old photos and aborts late results', async () => {
  const old = pending();
  const next = pending();
  (getCarePhotos as jest.Mock).mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
  await act(async () => {
    screen = create(<Harness />);
  });
  const oldSignal = (getCarePhotos as jest.Mock).mock.calls[0][3] as AbortSignal;
  await act(async () => screen.update(<Harness petId="p2" />));
  expect(oldSignal.aborted).toBe(true);
  expect(current.page.items).toEqual([]);
  await act(async () => next.resolve(page('new')));
  await act(async () => old.resolve(page('old')));
  expect(current.page.items.map((item) => item.id)).toEqual(['new']);
});

test('changing month and leaving the screen cancel unfinished requests', async () => {
  (getCarePhotos as jest.Mock)
    .mockResolvedValueOnce(page('first'))
    .mockReturnValue(new Promise(() => undefined));
  await act(async () => {
    screen = create(<Harness />);
  });
  await act(async () => screen.update(<Harness month="2026-09" />));
  expect(current.loading).toBe(true);
  expect(current.page.items).toEqual([]);
  const signal = (getCarePhotos as jest.Mock).mock.calls[1][3] as AbortSignal;
  await act(async () => screen.unmount());
  expect(signal.aborted).toBe(true);
});

test('pagination ignores duplicate taps, keeps existing photos on failure, and can retry', async () => {
  let reject!: (error: Error) => void;
  (getCarePhotos as jest.Mock)
    .mockResolvedValueOnce(page('first', true))
    .mockReturnValueOnce(
      new Promise((_yes, no) => {
        reject = no;
      }),
    )
    .mockResolvedValueOnce(page('next'));
  await act(async () => {
    screen = create(<Harness />);
  });
  await act(async () => {
    void current.loadMore();
    void current.loadMore();
  });
  expect(getCarePhotos).toHaveBeenCalledTimes(2);
  await act(async () => reject(new Error('網路中斷')));
  expect(current.page.items).toHaveLength(1);
  expect(current.error).toBe('網路中斷');
  await act(async () => current.loadMore());
  expect(current.page.items.map((item) => item.id)).toEqual(['first', 'next']);
  expect(current.error).toBe('');
  expect((getCarePhotos as jest.Mock).mock.calls[2][2].skip).toBe(1);
});
