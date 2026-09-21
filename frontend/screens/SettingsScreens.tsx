/** 用途：設定中心次頁；重用既有 Pet、通知、匯出、搜尋與本機儲存服務。 */
import Constants from 'expo-constants';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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
  rowStyle,
  icon,
}: {
  title: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  rowStyle?: object;
  icon?: keyof typeof Ionicons.glyphMap;
}) => (
  <TouchableOpacity
    disabled={!onPress}
    onPress={onPress}
    style={[s.row, rowStyle]}
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={value ? `${title} ${value}` : title}
  >
    {icon ? <Ionicons name={icon} size={20} color={danger ? palette.danger : palette.primary} style={s.rowIcon} /> : null}
    <Text style={[s.rowTitle, danger && s.danger]}>{title}</Text>
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
      <Text style={s.note}>選擇要一起照顧的毛孩，建立牠專屬的生活與健康紀錄。</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.petCards} snapToInterval={362} decelerationRate="fast" disableIntervalMomentum onMomentumScrollEnd={(event) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / 362);
        const pet = pets[index];
        if (pet && pet.id !== selectedPet?.id) selectPet(pet.id);
      }}>
      {pets.map((p) => (
        <View key={p.id} style={s.pet}>
          <Ionicons name="paw-outline" size={112} color="#5F9274" style={s.idWatermark} />
          <View style={s.idAccent} />
          <View style={s.idCardTop}><Text style={s.idCardBrand}>MEGO PET ID</Text></View>
          <View style={s.idCardBody}>
          {p.avatarUrl ? (
            <Image source={{ uri: p.avatarUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarText}>{p.name.slice(0, 1)}</Text>
            </View>
          )}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`選擇毛孩：${p.name}`} style={s.petInfo} onPress={() => selectPet(p.id)}>
            <Text style={s.idPetName}>{p.name}</Text>
            <Text style={s.idPetBreed}>{p.breed || '品種未設定'} · {p.gender || '性別未設定'} · {ageText(p.birthDate)}</Text>
            {selectedPet?.id === p.id && <Text style={s.currentBadge}>● 目前毛孩</Text>}
          </TouchableOpacity>
          </View>
          <View style={s.idCardFooter}><Text style={s.idCode}>MEGO-PET-{p.id.slice(-8).toUpperCase()}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={`編輯毛孩：${p.name}`} onPress={() => { selectPet(p.id); navigation.navigate('EditPet'); }}>
            <Text style={s.link}>編輯資料</Text>
          </TouchableOpacity></View>
        </View>
      ))}
      </ScrollView>
      {pets.length > 1 && <>
        <Text style={s.cardSwipeHint}>左右滑動・點選卡片切換毛孩</Text>
        <View style={s.cardDots}>{pets.map((p) => <View key={p.id} style={[s.cardDot, selectedPet?.id === p.id && s.cardDotActive]} />)}</View>
      </>}
      <TouchableOpacity
        style={s.primary}
        onPress={() => parent?.navigate('Home', { screen: 'AddPet' })}
      >
        <Text style={s.primaryText}>＋ 加入另一位毛孩</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="毛孩身份卡" style={s.primary} onPress={() => navigation.navigate('LostPetSettings')}>
        <Ionicons name="paw-outline" size={19} color="#FFF" />
        <Text style={s.primaryText}>毛孩身份卡</Text>
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
      <Text style={s.heading}>照護提醒</Text>
      <Text style={s.note}>讓 MEGO 在用藥、回診與日常照護時間提醒你。</Text>
      <View style={s.notificationCard}>
      <Row
        title="手機通知權限"
        value={
          permission === 'granted' ? '已開啟' : permission === 'denied' ? '未開啟' : '尚未決定'
        }
        rowStyle={s.notificationInnerRow}
        icon="notifications-outline"
      />
      <View style={[s.row, s.notificationInnerRow]}>
        <Ionicons name="paw-outline" size={20} color={palette.primary} style={s.rowIcon} />
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle}>照護提醒</Text>
          <Text style={s.notificationDescription}>開啟後，MEGO 會在重要照護時間提醒你。</Text>
        </View>
        <Switch
          style={s.notificationSwitch}
          accessibilityLabel="照護提醒"
          disabled={saving}
          value={settings.localNotificationsEnabled}
          onValueChange={toggle}
        />
      </View>
      </View>
      {permission !== 'granted' && (
        <Text style={s.note}>手機通知尚未開啟，你仍可在 App 內查看提醒。</Text>
      )}
      <Row title="開啟手機通知權限" icon="settings-outline" onPress={() => Linking.openSettings()} rowStyle={s.roundedActionRow} />
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
      <Text style={s.aboutHero}>MEGO</Text>
      <Text style={s.aboutParagraph}>
        MEGO 是協助飼主低負擔記錄毛孩健康、提醒、體重與就醫資訊的行動 App。
      </Text>
      <Row title="App 版本" value={version} rowStyle={s.whiteSettingRow} />
      <Row title="建置版本" value={String(build)} rowStyle={s.whiteSettingRow} />
      <Text style={s.heading}>健康資訊聲明</Text>
      <Text style={s.aboutParagraph}>
        MEGO
        是紀錄與資訊整理工具，不提供疾病診斷、獸醫診斷替代、藥物處方或緊急醫療服務。若毛孩出現嚴重或持續惡化症狀，請聯絡合格動物醫院。
      </Text>
      {__DEV__ && (
        <>
          <Text style={s.heading}>版本資訊</Text>
          <Row title="App 開發版本" value={String(Constants.expoConfig?.sdkVersion || '尚未確認')} rowStyle={s.whiteSettingRow} />
          <Row title="裝置平台" value={Platform.OS === 'ios' ? 'iPhone' : 'Android'} rowStyle={s.whiteSettingRow} />
          <Row title="服務環境" value="由 App 設定提供" rowStyle={s.whiteSettingRow} />
        </>
      )}
    </Page>
  );
}
export function PrivacyPolicyScreen() {
  return (
    <Page>
      <Text style={s.heading}>MEGO 隱私政策</Text>
      <Text style={s.paragraph}>MEGO 會依本政策處理你為照護毛孩而提供的資料，包括帳號資訊、毛孩基本資料、健康事件、體重、用藥、疫苗、驅蟲、就醫紀錄、提醒、附件與照片。</Text>
      <Text style={s.heading}>資料用途</Text>
      <Text style={s.paragraph}>這些資料只用於建立時間軸、提供提醒、產生匯出報告，以及在你主動使用 AI 助手時整理照護資訊。AI 回覆僅供紀錄整理與一般資訊參考，不代表醫療診斷。</Text>
      <Text style={s.heading}>資料分享與安全</Text>
      <Text style={s.paragraph}>MEGO 不會將你的資料用於廣告販售。使用 AI、同步或匯出功能時，必要資料可能傳送至提供該功能的服務；我們會依部署環境採取適當的存取控制與傳輸保護。請勿在紀錄中輸入不必要的敏感資訊。</Text>
      <Text style={s.heading}>你的權利</Text>
      <Text style={s.paragraph}>你可以在 App 中查看、編輯、匯出或刪除自己建立的毛孩與照護紀錄。若要刪除帳號或提出隱私問題，請透過產品提供的聯絡方式與我們聯繫。</Text>
      <Text style={s.note}>本政策會在資料處理方式或服務功能重大變更時更新。</Text>
    </Page>
  );
}
export function TermsOfUseScreen() {
  return (
    <Page>
      <Text style={s.heading}>使用條款</Text>
      <Text style={s.paragraph}>使用 MEGO 即表示你同意使用本 App 建立與管理毛孩資料、健康紀錄、提醒、匯出及相關功能。你應提供真實且不侵害他人權利的內容，並妥善保管帳號登入資訊。</Text>
      <Text style={s.heading}>健康資訊限制</Text>
      <Text style={s.paragraph}>MEGO 是照護紀錄與整理工具，不提供疾病診斷、獸醫診斷替代、藥物處方或緊急醫療服務。用藥、疫苗、驅蟲與提醒內容請由飼主確認；毛孩出現嚴重或持續惡化症狀時，應立即聯絡合格動物醫院。</Text>
      <Text style={s.heading}>AI 助手與資料</Text>
      <Text style={s.paragraph}>AI 助手僅在需要模型整理或回覆時使用相關服務。AI 內容可能不完整或不準確，不能取代獸醫專業判斷；請勿將 AI 回覆視為診斷或治療指示。</Text>
      <Text style={s.heading}>內容與服務</Text>
      <Text style={s.paragraph}>你對自己上傳的資料負責。不得利用本 App 從事違法、侵害他人權利或干擾服務的行為。功能可能因維護、版本更新或第三方服務狀態而調整。</Text>
      <Text style={s.note}>如不同意本條款，請停止使用 MEGO。</Text>
    </Page>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  content: { padding: 18, paddingBottom: 42 },
  notificationSwitch: { transform: [{ scale: 0.86 }], alignSelf: 'center', marginRight: -4 },
  roundedActionRow: { borderRadius: 16, borderWidth: 1, borderColor: '#E8E0D4', backgroundColor: '#FFFFFF' },
  notificationCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E0D4', marginBottom: 12 },
  whiteSettingRow: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 8, borderBottomWidth: 0, overflow: 'hidden' },
  notificationInnerRow: { backgroundColor: '#FFFFFF' },
  notificationDescription: { color: '#887A6D', fontSize: 12, lineHeight: 17, marginTop: 3, textAlign: 'left' },
  row: {
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(228,221,212,0.70)",
    backgroundColor: '#FFF4E8',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: { marginRight: 10 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: palette.text },
  accessory: { maxWidth: '42%', flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  value: { flexShrink: 1, color: palette.sub, fontSize: 13, textAlign: 'right' },
  chevron: { marginLeft: 8, color: palette.sub, fontSize: 22, lineHeight: 22 },
  note: { color: palette.sub, lineHeight: 19, fontSize: 13, marginVertical: 14 },
  link: { color: palette.primary, fontWeight: '800' },
  danger: { color: palette.danger },
  petCards: { gap: 12, paddingVertical: 4 },
  cardSwipeHint: { textAlign: 'center', color: '#887A6D', fontSize: 12, marginTop: 2 },
  cardDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 7, marginBottom: 2 },
  cardDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D8CEC2' },
  cardDotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5F9274' },
  pet: {
    width: 350,
    height: 210,
    flexShrink: 0,
    alignSelf: 'flex-start',
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E0D4',
    overflow: 'hidden',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
    padding: 13,
    backgroundColor: '#FFFDF8',
    borderBottomWidth: 1,
    borderBottomColor: "rgba(228,221,212,0.70)",
  },
  idWatermark: { position: 'absolute', right: 12, bottom: 22, opacity: 0.08 },
  idAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: '#5F9274' },
  idCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  idCardBrand: { color: '#B7653B', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  idCardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#F7F4EE' },
  avatarFallback: { backgroundColor: '#F7F4EE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#4E8A6C', fontSize: 28, fontWeight: '900' },
  idCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingHorizontal: 4 },
  idCode: { color: '#887A6D', fontSize: 10, letterSpacing: 0.6 },
  petInfo: { flex: 1, minWidth: 0, paddingHorizontal: 0, paddingVertical: 0 },
  idPetName: { color: '#3F342C', fontSize: 22, fontWeight: '900' },
  idPetBreed: { color: '#6A4D3E', fontSize: 14, fontWeight: '700', marginTop: 2 },
  currentBadge: { color: '#4E8A6C', fontSize: 11, fontWeight: '800', marginTop: 6 },
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
  aboutHero: { fontSize: 30, fontWeight: '900', color: '#5F9274', textAlign: 'center', marginVertical: 20 },
  aboutParagraph: { fontSize: 15, lineHeight: 24, color: '#4A382E', marginBottom: 12 },
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
