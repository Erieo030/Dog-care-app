Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import VetMapScreen from '../VetMapScreen';

const mockAnimate = jest.fn();
const mockScroll = jest.fn();
jest.mock('react-native', () => {
  const React = require('react');
  return {
    ...Object.fromEntries(
      ['ActivityIndicator', 'Text', 'TextInput', 'TouchableOpacity', 'View'].map((name) => [
        name,
        name,
      ]),
    ),
    ScrollView: React.forwardRef((props: object, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({ scrollTo: mockScroll }));
      return React.createElement('ScrollView', props);
    }),
    Alert: { alert: jest.fn() },
    Linking: { openURL: jest.fn().mockResolvedValue(undefined) },
    Keyboard: { dismiss: jest.fn() },
    Platform: { OS: 'ios', select: (options: { ios: string }) => options.ios },
    StyleSheet: { create: (value: object) => value },
  };
});
jest.mock('react-native-maps', () => {
  const React = require('react');
  return {
    __esModule: true,
    Marker: 'Marker',
    default: React.forwardRef((props: object, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({ animateToRegion: mockAnimate }));
      return React.createElement('MapView', props);
    }),
  };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('../../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 96,
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

let screen: ReactTestRenderer;
const popTo = jest.fn();
const navigate = jest.fn();
const byLabel = (label: string) =>
  screen.root.findAll(
    (node) => node.props.accessibilityLabel === label && typeof node.type === 'string',
  )[0];
const mount = async () => {
  await act(async () => {
    screen = create(
      <VetMapScreen
        navigation={{ popTo, navigate, goBack: jest.fn() } as never}
        route={{ params: { selectForVisit: true } } as never}
      />,
    );
  });
};
beforeEach(() => {
  jest.clearAllMocks();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 24.15, longitude: 120.68 },
  });
  globalThis.requestAnimationFrame = (callback) => {
    callback(0);
    return 0;
  };
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.useRealTimers();
});

test('selecting a hospital returns to the existing visit form and merges its parameters', async () => {
  await mount();
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  await act(async () => byLabel('查看仁愛犬醫院位置').props.onPress());
  expect(mockScroll).toHaveBeenCalledWith({ y: 0, animated: true });
  await act(async () => byLabel('將仁愛犬醫院帶入就醫紀錄').props.onPress());
  expect(popTo).toHaveBeenCalledWith(
    'MedicalVisitForm',
    { clinicName: '仁愛犬醫院' },
    { merge: true },
  );
  expect(navigate).not.toHaveBeenCalled();
});

test('map touches suspend outer scrolling until the touch ends or is cancelled', async () => {
  await mount();
  const map = byLabel('動物醫院地圖');
  const scroll = () => screen.root.findByType('ScrollView' as never);
  await act(async () => map.props.onTouchStart());
  expect(scroll().props.scrollEnabled).toBe(false);
  await act(async () => map.props.onTouchCancel());
  expect(scroll().props.scrollEnabled).toBe(true);
});

test('unverified locations remain selectable without creating a false map marker', async () => {
  await mount();
  expect(screen.root.findAllByType('Marker' as never)).toHaveLength(10);
  await act(async () => byLabel('查看永昌動物醫院位置').props.onPress());
  expect(byLabel('動物醫院地圖')).toBeUndefined();
  expect(byLabel('將永昌動物醫院帶入就醫紀錄')).toBeDefined();
});

test('leaving the map ignores a location result that arrives later', async () => {
  let resolve!: (position: object) => void;
  (Location.getCurrentPositionAsync as jest.Mock).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  await mount();
  await act(async () => byLabel('使用目前位置').props.onPress());
  mockAnimate.mockClear();
  await act(async () => screen.unmount());
  await act(async () => resolve({ coords: { latitude: 24.15, longitude: 120.68 } }));
  expect(mockAnimate).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
});

test('denied location permission does not hide the hospital roster', async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
  await mount();
  await act(async () => byLabel('使用目前位置').props.onPress());
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('尚未開啟定位', expect.any(String));
  expect(byLabel('查看仁愛犬醫院位置')).toBeDefined();
});

test('location timeout releases the button for retry', async () => {
  jest.useFakeTimers();
  (Location.getCurrentPositionAsync as jest.Mock).mockReturnValue(new Promise(() => undefined));
  await mount();
  await act(async () => byLabel('使用目前位置').props.onPress());
  expect(byLabel('使用目前位置').props.disabled).toBe(true);
  await act(async () => jest.advanceTimersByTime(12000));
  expect(byLabel('使用目前位置').props.disabled).toBe(false);
  expect(Alert.alert).toHaveBeenCalledWith('無法取得目前位置', expect.any(String));
});
