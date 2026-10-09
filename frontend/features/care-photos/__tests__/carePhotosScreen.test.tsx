Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import CarePhotosScreen from '../CarePhotosScreen';
import { photo } from './carePhotoFixture';

const mockNavigate = jest.fn();
const mockRefresh = jest.fn();
const mockLoadMore = jest.fn();
const mockPhoto = photo('a');
let mockLoading = false;
let mockItems = [mockPhoto];
let mockError = '';
let mockSelectedPet: { id: string; name: string } | undefined = { id: 'p1', name: 'Kuro' };
jest.mock('react-native', () => {
  const React = require('react');
  return {
    Text: 'Text',
    View: 'View',
    TouchableOpacity: 'TouchableOpacity',
    ScrollView: 'ScrollView',
    Switch: 'Switch',
    StyleSheet: { create: (styles: object) => styles },
    useWindowDimensions: () => ({ width: 390, fontScale: 1 }),
    SectionList: (props: {
      sections: Array<{ data: unknown[] }>;
      ListHeaderComponent: unknown;
      ListFooterComponent: unknown;
      ListEmptyComponent: unknown;
      renderItem: (args: object) => unknown;
    }) =>
      React.createElement(
        'SectionList',
        props,
        props.ListHeaderComponent,
        props.sections.flatMap((section) =>
          section.data.map((item, index) =>
            React.createElement(React.Fragment, { key: index }, props.renderItem({ item })),
          ),
        ),
        props.sections.length ? null : props.ListEmptyComponent,
        props.ListFooterComponent,
      ),
  };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { userId: 'u1' } }),
}));
jest.mock('../../../contexts/PetContext', () => ({
  usePet: () => ({
    pets: [{ id: 'p1', name: 'Kuro' }],
    selectedPet: mockSelectedPet,
    selectPet: jest.fn(),
  }),
}));
jest.mock('../../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 96,
}));
jest.mock('../useCarePhotos', () => ({
  useCarePhotos: () => ({
    page: { items: mockItems, total: mockItems.length, hasMore: false },
    token: 'token',
    loading: mockLoading,
    error: mockError,
    refresh: mockRefresh,
    loadMore: mockLoadMore,
  }),
}));
jest.mock('../components/CarePhotoImage', () => 'PhotoImage');
jest.mock('../components/CarePhotoViewer', () => 'Viewer');
jest.mock('../components/PhotoMonthPicker', () => 'MonthPicker');

let screen: ReactTestRenderer;
const byLabel = (label: string) =>
  screen.root.findAll(
    (node) => typeof node.type === 'string' && node.props.accessibilityLabel === label,
  )[0];
const viewer = () => screen.root.findByType('Viewer' as never);
const mount = async () => {
  await act(async () => {
    screen = create(
      <CarePhotosScreen navigation={{ navigate: mockNavigate } as never} route={{} as never} />,
    );
  });
};
beforeEach(() => {
  jest.clearAllMocks();
  mockLoading = false;
  mockItems = [mockPhoto];
  mockError = '';
  mockSelectedPet = { id: 'p1', name: 'Kuro' };
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test('sensitive thumbnails start hidden, previews open full screen, and original records remain reachable', async () => {
  await mount();
  expect(screen.root.findByType('PhotoImage' as never).props.hidden).toBe(true);
  await act(async () => byLabel('隱藏健康事件縮圖').props.onValueChange(false));
  expect(screen.root.findByType('PhotoImage' as never).props.hidden).toBe(false);
  await act(async () => byLabel('查看 2026-10-01 健康異常照片').props.onPress());
  expect(viewer().props.photo).toBe(mockPhoto);
  await act(async () => viewer().props.onOpenRecord(mockPhoto));
  expect(mockNavigate).toHaveBeenCalledWith('HealthEventDetail', { eventId: 'record-a' });
  expect(viewer().props.photo).toBeNull();
});

test('changing filters closes the previous preview instead of showing an old category photo', async () => {
  await mount();
  await act(async () => byLabel('查看 2026-10-01 健康異常照片').props.onPress());
  const filter = screen.root
    .findAll((node) => node.type === ('TouchableOpacity' as never))
    .find(
      (node) =>
        node.findAll((child) => child.type === ('Text' as never) && child.props.children === '體重')
          .length,
    );
  await act(async () => filter!.props.onPress());
  expect(viewer().props.photo).toBeNull();
  const allFilter = screen.root
    .findAll((node) => node.type === ('TouchableOpacity' as never))
    .find(
      (node) =>
        node.findAll((child) => child.type === ('Text' as never) && child.props.children === '全部')
          .length,
    );
  await act(async () => allFilter!.props.onPress());
  expect(viewer().props.photo).toBeNull();
});

test('grid widths follow the actual container and leave space above the floating dock', async () => {
  await mount();
  const list = screen.root.findByType('SectionList' as never);
  await act(async () => list.props.onLayout({ nativeEvent: { layout: { width: 320 } } }));
  expect(byLabel('查看 2026-10-01 健康異常照片').props.style.width).toBe(134);
  expect(list.props.contentContainerStyle[1].paddingBottom).toBe(96);
});

test('a failed month load offers retry without claiming that no photos exist', async () => {
  mockItems = [];
  mockError = '網路中斷';
  await mount();
  const text = (label: string) =>
    screen.root.findAll((node) => node.type === ('Text' as never) && node.props.children === label);
  expect(text('照片資料暫時無法讀取')).toHaveLength(1);
  expect(text('這個月份還沒有照護照片')).toHaveLength(0);
  const retry = screen.root
    .findAll((node) => node.type === ('TouchableOpacity' as never))
    .find(
      (node) =>
        node.findAll(
          (child) => child.type === ('Text' as never) && child.props.children === '重新載入',
        ).length,
    );
  await act(async () => retry!.props.onPress());
  expect(mockRefresh).toHaveBeenCalledTimes(1);
});

test('a missing pet explains setup instead of presenting an empty month', async () => {
  mockSelectedPet = undefined;
  mockItems = [];
  await mount();
  expect(
    screen.root.findAll(
      (node) => node.type === ('Text' as never) && node.props.children === '先建立或選擇毛孩',
    ),
  ).toHaveLength(1);
});

test('empty months explain which saved records populate the album', async () => {
  mockItems = [];
  await mount();
  expect(
    screen.root.findAll(
      (node) => node.type === ('Text' as never) && node.props.children === '這個月份還沒有照護照片',
    ),
  ).toHaveLength(1);
  expect(viewer().props.photo).toBeNull();
});
