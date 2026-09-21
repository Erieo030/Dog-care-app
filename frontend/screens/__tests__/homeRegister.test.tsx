Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import HomeScreen from '../HomeScreen';
import RegisterScreen from '../RegisterScreen';
import { getHealthDashboard } from '../../services/dashboardService';
import { getTodayReminders } from '../../services/reminderService';
import { getHealthMonitor } from '../../services/aiService';

jest.mock('react-native', () => {
  const React = require('react');
  return {
    ...Object.fromEntries(
      [
        'ActivityIndicator',
        'Image',
        'ScrollView',
        'Text',
        'TouchableOpacity',
        'View',
        'KeyboardAvoidingView',
      ].map((name) => [name, name]),
    ),
    TextInput: React.forwardRef((props: object, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({ focus: jest.fn() }));
      return React.createElement('TextInput', props);
    }),
    StyleSheet: { create: (value: object) => value, hairlineWidth: 1 },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    Platform: { OS: 'ios' },
    Keyboard: { dismiss: jest.fn() },
    Alert: { alert: jest.fn() },
  };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('expo-status-bar', () => ({ StatusBar: 'StatusBar' }));
jest.mock('../../components/SoftMotion', () => ({
  SoftButton: 'SoftButton',
  SoftEntrance: 'SoftEntrance',
  SoftField: 'SoftField',
}));
jest.mock('../../components/home/HomeBackgroundScene', () => ({
  HomeBackgroundScene: 'Background',
}));
jest.mock('../../assets/home-scene/logo.png', () => 1);
const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, getParent: () => ({ navigate: mockNavigate }) };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
const mockSession = { userId: 'account-a' };
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ session: mockSession }) }));
const mockPets = [
  { id: 'a', name: '毛孩A' },
  { id: 'b', name: '毛孩B' },
];
let mockSelectedPet = mockPets[0];
jest.mock('../../contexts/PetContext', () => ({
  usePet: () => ({
    pets: mockPets,
    selectedPet: mockSelectedPet,
    selectPet: jest.fn(),
    refreshPets: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
    error: null,
  }),
}));
jest.mock('../../services/dashboardService', () => ({ getHealthDashboard: jest.fn() }));
jest.mock('../../services/reminderService', () => ({ getTodayReminders: jest.fn() }));
jest.mock('../../services/aiService', () => ({ getHealthMonitor: jest.fn() }));
jest.mock('../../services/notificationService', () => ({
  reconcileAccountNotifications: jest.fn().mockResolvedValue(undefined),
}));

let screen: ReactTestRenderer;
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
const byLabel = (label: string) =>
  screen.root.findAll(
    (node) => node.props.accessibilityLabel === label && typeof node.type === 'string',
  )[0];
const text = () => JSON.stringify(screen.toJSON());
beforeEach(() => {
  jest.clearAllMocks();
  mockSelectedPet = mockPets[0];
  (getHealthDashboard as jest.Mock).mockResolvedValue({});
  (getHealthMonitor as jest.Mock).mockResolvedValue({ alerts: [] });
  (getTodayReminders as jest.Mock).mockResolvedValue([]);
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test('switching pets ignores a late reminder response from the previous pet', async () => {
  let resolveOld!: (value: object[]) => void;
  (getTodayReminders as jest.Mock).mockImplementation((_user, pet) =>
    pet === 'a'
      ? new Promise((resolve) => {
          resolveOld = resolve;
        })
      : Promise.resolve([{ status: 'pending' }]),
  );
  await act(async () => {
    screen = create(<HomeScreen />);
  });
  await flush();
  mockSelectedPet = mockPets[1];
  await act(async () => screen.update(<HomeScreen />));
  await flush();
  expect(text()).toContain('1 項');
  await act(async () => resolveOld(Array(9).fill({ status: 'pending' })));
  expect(text()).not.toContain('9 項');
  expect(text()).toContain('毛孩B');
});

test('today and observation entries navigate directly to their own destinations', async () => {
  await act(async () => {
    screen = create(<HomeScreen />);
  });
  await act(async () => byLabel('查看今日待辦').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('ReminderList', { upcomingDays: 0 });
  await act(async () => byLabel('查看健康觀察紀錄').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('HealthEventList');
});

test('failed secondary data is not presented as zero reminders', async () => {
  (getTodayReminders as jest.Mock).mockRejectedValue(new Error('offline'));
  await act(async () => {
    screen = create(<HomeScreen />);
  });
  await flush();
  expect(text()).toContain('部分照護資料更新失敗');
  expect(text()).not.toContain('無待辦');
});

const fillRegistration = async (password = 'password8', confirmation = password) => {
  await act(async () => {
    byLabel('電子郵件').props.onChangeText('owner@example.com');
    byLabel('密碼').props.onChangeText(password);
    byLabel('確認密碼').props.onChangeText(confirmation);
  });
};
const submit = () =>
  screen.root.findAll((node) => node.type === ('SoftButton' as never))[0].props.onPress();

test('registration keeps minimum length and matching rules', async () => {
  const register = jest.fn();
  await act(async () => {
    screen = create(<RegisterScreen onRegisterSuccess={register} onGoToLogin={jest.fn()} />);
  });
  await fillRegistration('short');
  await act(async () => submit());
  expect(register).not.toHaveBeenCalled();
  expect(text()).toContain('密碼至少需要 8 個字元');
  await fillRegistration('password8', 'different');
  await act(async () => submit());
  expect(register).not.toHaveBeenCalled();
  expect(text()).toContain('兩次輸入的密碼不一致');
});

test('registration locks immediate duplicate submissions and permits retry after failure', async () => {
  let rejectRequest!: (error: Error) => void;
  const register = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject;
        }),
    )
    .mockResolvedValue(undefined);
  await act(async () => {
    screen = create(<RegisterScreen onRegisterSuccess={register} onGoToLogin={jest.fn()} />);
  });
  await fillRegistration();
  await act(async () => {
    void submit();
    void submit();
  });
  expect(register).toHaveBeenCalledTimes(1);
  expect(text()).toContain('建立中…');
  await act(async () => rejectRequest(new Error('連線失敗')));
  await act(async () => submit());
  expect(register).toHaveBeenCalledTimes(2);
  expect(register).toHaveBeenLastCalledWith('owner@example.com', 'password8');
});
