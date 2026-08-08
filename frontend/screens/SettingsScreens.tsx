/** 用途：設定中心次頁；重用既有 Pet、通知、匯出、搜尋與本機儲存服務。 */
import Constants from 'expo-constants';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { useSettings } from '../contexts/SettingsContext';
import { MainTabParamList, ProfileStackParamList } from '../navigation/types';
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  NotificationPermissionState,
} from '../services/notificationService';
import { clearSearchHistory } from '../services/searchHistoryService';
import { clearPawLogCache, getStorageUsage } from '../services/storageService';
import { shareFeedbackInfo } from '../services/feedbackService';
const palette = {
  bg: '#F7F4EE',
  surface: '#FFFFFF',
  text: '#2F2925',
  sub: '#746B63',
  border: '#E4DDD4',
  primary: '#B7653B',
  danger: '#C94C4C',
};
const ageText = (birthDate?: string) => {
  if (!birthDate) return '年齡未填';
  const birth = new Date(birthDate);
  if (!Number.isFinite(birth.getTime())) return '年齡未填';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  )
    age--;
  return `${Math.max(age, 0)} 歲`;
};
const formatBytes = (value: number) =>
  value < 1024
    ? `${value} B`
    : value < 1048576
      ? `${(value / 1024).toFixed(1)} KB`
      : `${(value / 1048576).toFixed(1)} MB`;
const Page = ({ children }: { children: React.ReactNode }) => {
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>{children}</ScrollView>
    </SafeAreaView>
  );
};
const Row = ({
  title,
  value,
  onPress,
  danger = false,
}: {
  title: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) => (
  <TouchableOpacity
    disabled={!onPress}
    onPress={onPress}
    style={s.row}
    accessibilityRole={onPress ? 'button' : undefined}
  >
    <Text numberOfLines={1} ellipsizeMode="tail" style={[s.rowTitle, danger && s.danger]}>{title}</Text>
    <View style={s.accessory}>
      {value ? <Text numberOfLines={1} ellipsizeMode="tail" style={[s.value, danger && s.danger]}>{value}</Text> : null}
      {onPress ? <Text style={[s.chevron, danger && s.danger]}>›</Text> : null}
    </View>
  </TouchableOpacity>
);
export function PetManagementScreen({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, 'PetManagement'>) {
  const { pets, selectedPet, selectPet } = usePet();
  const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
  return (
    <Page>
      <Text style={s.note}>切換目前毛孩；新增與編輯沿用既有毛孩資料表單。</Text>
      {pets.map((p) => (
        <View key={p.id} style={s.pet}>
          {p.avatarUrl ? (
            <Image source={{ uri: p.avatarUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarText}>{p.name.slice(0, 1)}</Text>
            </View>
          )}
          <TouchableOpacity style={s.petInfo} onPress={() => selectPet(p.id)}>
            <Text style={s.rowTitle}>{p.name}</Text>
            <Text numberOfLines={2} ellipsizeMode="tail" style={s.value}>
              {p.breed || '未填品種'} · {p.gender || '未填性別'} · {ageText(p.birthDate)}
              {selectedPet?.id === p.id ? ' · 目前毛孩' : ''}
            </Text>
          </TouchableOpacity>
          {selectedPet?.id === p.id && (
            <TouchableOpacity onPress={() => parent?.navigate('Home', { screen: 'EditPet' })}>
              <Text style={s.link}>編輯</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity
        style={s.primary}
        onPress={() => parent?.navigate('Home', { screen: 'AddPet' })}
      >
        <Text style={s.primaryText}>新增毛孩</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.primary} onPress={() => navigation.navigate('LostPetSettings')}>
        <Text style={s.primaryText}>走失協尋 QR</Text>
      </TouchableOpacity>
    </Page>
  );
}
export function NotificationSettingsScreen() {
  const { session } = useAuth();
  const { settings, update, saving } = useSettings();
  const [permission, setPermission] = useState<NotificationPermissionState>('undetermined');
  useFocusEffect(
    useCallback(() => {
      getNotificationPermissionState().then(setPermission);
    }, []),
  );
  const toggle = async (value: boolean) => {
    if (!session?.userId) return;
    try {
      await update({ localNotificationsEnabled: value });
      if (value) {
        const state = await requestNotificationPermission();
        setPermission(state);
      }
    } catch {
      Alert.alert('設定失敗', '請稍後再試');
    }
  };
  return (
    <Page>
      <Row
        title="系統通知權限"
        value={
          permission === 'granted' ? '已開啟' : permission === 'denied' ? '未開啟' : '尚未決定'
        }
      />
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle}>PawLog 手機提醒</Text>
          <Text style={s.value}>只控制 Local Notification，不刪除提醒資料。</Text>
        </View>
        <Switch
          accessibilityLabel="PawLog 手機提醒"
          disabled={saving}
          value={settings.localNotificationsEnabled}
          onValueChange={toggle}
        />
      </View>
      {permission !== 'granted' && (
        <Text style={s.note}>目前無法發送手機通知，但仍可以在 PawLog 內查看提醒。</Text>
      )}
      <Row title="前往系統設定" onPress={() => Linking.openSettings()} />
    </Page>
  );
}
export function ReminderPreferencesScreen() {
  const { settings, update, saving } = useSettings();
  const [normal, setNormal] = useState(settings.defaultReminderTime);
  const [tonight, setTonight] = useState(settings.tonightTime);
  const save = async () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normal) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(tonight))
      return Alert.alert('格式錯誤', '請使用 24 小時 HH:mm 格式');
    try {
      await update({ defaultReminderTime: normal, tonightTime: tonight });
      Alert.alert('已儲存', '提醒偏好已更新');
    } catch {
      Alert.alert('儲存失敗', '請稍後再試');
    }
  };
  return (
    <Page>
      <Text style={s.label}>新增提醒預設時間</Text>
      <TextInput
        style={s.input}
        value={normal}
        onChangeText={setNormal}
        placeholder="09:00"
        maxLength={5}
      />
      <Text style={s.label}>「今晚」延後時間</Text>
      <TextInput
        style={s.input}
        value={tonight}
        onChangeText={setTonight}
        placeholder="20:00"
        maxLength={5}
      />
      <TouchableOpacity disabled={saving} style={s.primary} onPress={save}>
        <Text style={s.primaryText}>{saving ? '儲存中…' : '儲存偏好'}</Text>
      </TouchableOpacity>
    </Page>
  );
}
export function StorageSettingsScreen() {
  const { session } = useAuth();
  const [usage, setUsage] = useState<{
    attachmentCount: number;
    attachmentBytes: number;
    exportCacheBytes: number;
  } | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    if (!session?.userId) return;
    setError('');
    getStorageUsage(session.userId)
      .then(setUsage)
      .catch((e) => setError((e as Error).message));
  }, [session?.userId]);
  useFocusEffect(load);
  const clearCache = () =>
    Alert.alert('清除暫存資料', '清除暫存不會刪除你的健康紀錄。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        onPress: async () => {
          await clearPawLogCache();
          load();
          Alert.alert('已清除', '匯出暫存已清除');
        },
      },
    ]);
  return (
    <Page>
      {!usage && !error ? (
        <ActivityIndicator />
      ) : error ? (
        <>
          <Text style={s.danger}>{error}</Text>
          <Row title="重試" onPress={load} />
        </>
      ) : (
        <>
          <Row
            title="附件"
            value={`${usage!.attachmentCount} 個 · ${formatBytes(usage!.attachmentBytes)}`}
          />
          <Row title="匯出暫存" value={formatBytes(usage!.exportCacheBytes)} />
          <Row
            title="可可靠計算總量"
            value={formatBytes(usage!.attachmentBytes + usage!.exportCacheBytes)}
          />
        </>
      )}
      <Text style={s.note}>
        React Native 圖片內部 cache 無可靠統一容量 API，目前無法計算完整圖片快取。
      </Text>
      <Row title="清除匯出暫存" onPress={clearCache} danger />
    </Page>
  );
}
export function AboutScreen() {
  const version = Constants.expoConfig?.version || '尚未確認';
  const build =
    Constants.expoConfig?.android?.versionCode ||
    Constants.expoConfig?.ios?.buildNumber ||
    '開發版本';
  return (
    <Page>
      <Text style={s.hero}>PawLog</Text>
      <Text style={s.paragraph}>
        PawLog 是協助飼主低負擔記錄毛孩健康、提醒、體重與就醫資訊的行動 App。
      </Text>
      <Row title="App Version" value={version} />
      <Row title="Build Version" value={String(build)} />
      <Text style={s.heading}>健康資訊聲明</Text>
      <Text style={s.paragraph}>
        PawLog
        是紀錄與資訊整理工具，不提供疾病診斷、獸醫診斷替代、藥物處方或緊急醫療服務。若毛孩出現嚴重或持續惡化症狀，請聯絡合格動物醫院。
      </Text>
      {__DEV__ && (
        <>
          <Text style={s.heading}>開發資訊</Text>
          <Row title="Expo SDK" value={String(Constants.expoConfig?.sdkVersion || '尚未確認')} />
          <Row title="Platform" value={Platform.OS} />
          <Row title="API Environment" value="由 App 環境設定提供" />
        </>
      )}
    </Page>
  );
}
export function PrivacyPolicyScreen() {
  return (
    <Page>
      <Text style={s.heading}>專題開發版本隱私說明</Text>
      <Text style={s.paragraph}>
        PawLog
        可能處理使用者帳號資訊、毛孩基本資料、健康事件、體重、就醫紀錄、提醒及使用者選擇的附件或照片。健康圖片只用於使用者建立的紀錄與匯出，不作為正式醫療診斷。
      </Text>
      <Text style={s.paragraph}>
        使用者可在 App
        內管理自己的紀錄。正式資料保存位置、保留期間、刪除流程與部署安全措施仍需依實際發布環境確認。
      </Text>
      <Text style={s.note}>
        TODO：此為專題開發版本隱私說明，正式發布前需依實際部署環境完成法律審閱。
      </Text>
    </Page>
  );
}
export function TermsOfUseScreen() {
  return (
    <Page>
      <Text style={s.heading}>使用條款</Text>
      <Text style={s.paragraph}>
        PawLog
        用於保存使用者自行輸入的毛孩照護資料。健康資訊僅供紀錄與整理，不取代獸醫診斷、處方或緊急醫療判斷。使用者應確認輸入資料正確，並在需要醫療協助時聯絡合格動物醫院。
      </Text>
      <Text style={s.note}>TODO：正式發布前需完成法律審閱與版本、生效日期確認。</Text>
    </Page>
  );
}
export function FeedbackScreen() {
  const [busy, setBusy] = useState(false);
  const share = async () => {
    try {
      setBusy(true);
      await shareFeedbackInfo();
    } catch (e) {
      Alert.alert('無法分享', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Text style={s.paragraph}>
        系統會建立不含帳號、User ID、密碼、token、API key
        或健康紀錄的環境資訊。請在分享後自行補充問題描述。
      </Text>
      <TouchableOpacity disabled={busy} style={s.primary} onPress={share}>
        <Text style={s.primaryText}>{busy ? '準備中…' : '分享問題資訊'}</Text>
      </TouchableOpacity>
    </Page>
  );
}
export function LocalDataSettingsScreen() {
  const { session } = useAuth();
  const { reset, saving } = useSettings();
  const clearSearch = () =>
    Alert.alert('清除搜尋紀錄', '只會刪除此裝置的搜尋關鍵字。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        onPress: async () => {
          if (session?.userId) await clearSearchHistory(session.userId);
          Alert.alert('已清除', '搜尋紀錄已清除');
        },
      },
    ]);
  const resetPrefs = () =>
    Alert.alert('重設提醒偏好', '會重設提醒偏好，不會刪除健康資料。', [
      { text: '取消', style: 'cancel' },
      {
        text: '重設',
        style: 'destructive',
        onPress: async () => {
          await reset();
          Alert.alert('已重設', '提醒偏好已恢復預設值');
        },
      },
    ]);
  return (
    <Page>
      <Row title="清除搜尋紀錄" onPress={clearSearch} />
      <Row
        title={saving ? '重設中…' : '重設提醒偏好'}
        onPress={saving ? undefined : resetPrefs}
        danger
      />
    </Page>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  content: { padding: 18, paddingBottom: 42 },
  row: {
    minHeight: 64,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: palette.text },
  accessory: { maxWidth: '58%', flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  value: { flexShrink: 1, color: palette.sub, fontSize: 13, textAlign: 'right' },
  chevron: { marginLeft: 8, color: palette.sub, fontSize: 22, lineHeight: 22 },
  note: { color: palette.sub, lineHeight: 19, fontSize: 13, marginVertical: 14 },
  link: { color: palette.primary, fontWeight: '800' },
  danger: { color: palette.danger },
  pet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  petInfo: { flex: 1, minWidth: 0 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: palette.border },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: palette.text, fontWeight: '800' },
  primary: {
    marginTop: 18,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: palette.primary,
  },
  primaryText: { color: '#fff', fontWeight: '800' },
  label: { color: palette.text, fontWeight: '700', marginTop: 16, marginBottom: 7 },
  input: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 14,
    color: palette.text,
  },
  hero: {
    fontSize: 30,
    fontWeight: '900',
    color: palette.text,
    textAlign: 'center',
    marginVertical: 20,
  },
  heading: { fontSize: 19, fontWeight: '800', color: palette.text, marginTop: 24, marginBottom: 9 },
  paragraph: { fontSize: 15, lineHeight: 24, color: palette.text, marginBottom: 12 },
});
