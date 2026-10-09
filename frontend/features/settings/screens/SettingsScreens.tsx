import Constants from 'expo-constants';
import React, { useCallback, useState } from 'react';
import {
  AppState,
  Alert,
  Linking,
  Platform,
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
import { useAuth } from '../../../contexts/AuthContext';
import { usePet } from '../../../contexts/PetContext';
import { useSettings } from '../../../contexts/SettingsContext';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { MainTabParamList, ProfileStackParamList } from '../../../navigation/types';
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  NotificationPermissionState,
} from '../../../services/notificationService';
import {
  SettingsDocumentHero,
  SettingsDocumentParagraph,
  SettingsDocumentSection,
  SettingsPage as Page,
  SettingsRow as Row,
  settingsPalette as palette,
} from '../components/SettingsLayout';
import { PetIdentityCarousel } from '../../pets/components/PetIdentityCarousel';

export function PetManagementScreen({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, 'PetManagement'>) {
  const { pets, selectedPet, selectPet } = usePet();
  const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
  return (
    <Page>
      <PetIdentityCarousel
        pets={pets}
        selectedPet={selectedPet}
        onSelect={selectPet}
        onEdit={(pet) => {
          selectPet(pet.id);
          navigation.navigate('EditPet');
        }}
      />
      <TouchableOpacity
        style={s.primary}
        onPress={() => parent?.navigate('Home', { screen: 'AddPet' })}
      >
        <Text style={s.primaryText}>＋ 加入另一位毛孩</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="毛孩身份卡"
        style={s.identityAction}
        onPress={() => navigation.navigate('LostPetSettings')}
      >
        <Ionicons name="qr-code-outline" size={19} color={palette.primary} />
        <Text style={s.identityActionText}>設定毛孩身份 QR</Text>
      </TouchableOpacity>
    </Page>
  );
}

export function NotificationSettingsScreen() {
  const { session } = useAuth();
  const { settings, update, saving } = useSettings();
  const [permission, setPermission] = useState<NotificationPermissionState>('undetermined');
  const [photoPermission, setPhotoPermission] = useState('尚未詢問');
  const [cameraPermission, setCameraPermission] = useState('尚未詢問');
  const [locationPermission, setLocationPermission] = useState('尚未詢問');
  const refreshPermissions = useCallback(async () => {
    const [notification, photos, camera, location] = await Promise.all([
      getNotificationPermissionState(),
      ImagePicker.getMediaLibraryPermissionsAsync(),
      ImagePicker.getCameraPermissionsAsync(),
      Location.getForegroundPermissionsAsync().catch(() => null),
    ]);
    setPermission(notification);
    setPhotoPermission(
      photos.accessPrivileges === 'limited'
        ? '僅允許所選照片'
        : photos.granted
          ? '已開啟'
          : photos.status === 'denied'
            ? '未開啟'
            : '尚未詢問',
    );
    setCameraPermission(
      camera.granted ? '已開啟' : camera.status === 'denied' ? '未開啟' : '尚未詢問',
    );
    setLocationPermission(
      !location
        ? '暫時無法讀取'
        : location.granted
          ? '已開啟'
          : location.status === 'denied'
            ? '未開啟'
            : '尚未詢問',
    );
  }, []);
  useFocusEffect(
    useCallback(() => {
      refreshPermissions().catch(() => undefined);
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') refreshPermissions().catch(() => undefined);
      });
      return () => subscription.remove();
    }, [refreshPermissions]),
  );
  const toggle = async (value: boolean) => {
    if (!session?.userId) return;
    try {
      await update({ localNotificationsEnabled: value });
      if (value) setPermission(await requestNotificationPermission());
    } catch {
      Alert.alert('設定失敗', '請稍後再試');
    }
  };
  return (
    <Page>
      <Text style={s.heading}>手機權限與提醒</Text>
      <Text style={s.note}>在這裡查看 MEGO 使用通知、相簿、相機與定位的權限狀態。</Text>
      <Text style={s.subheading}>通知與照護提醒</Text>
      <Text style={s.sectionDescription}>讓 MEGO 在用藥、回診與日常照護時間提醒你。</Text>
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
      {permission !== 'granted' ? (
        <Text style={s.note}>手機通知尚未開啟，你仍可在 App 內查看提醒。</Text>
      ) : null}
      <Text style={s.subheading}>照片與相機</Text>
      <Text style={s.sectionDescription}>
        只有在你選擇照片或拍照時才會請求權限；MEGO 不會自行瀏覽整個相簿。
      </Text>
      <View style={s.notificationCard}>
        <Row
          title="相簿照片"
          value={photoPermission}
          rowStyle={s.notificationInnerRow}
          icon="images-outline"
        />
        <Row
          title="相機權限"
          value={cameraPermission}
          rowStyle={[s.notificationInnerRow, s.lastPermissionRow]}
          icon="camera-outline"
        />
      </View>
      <Text style={s.subheading}>就醫地圖定位</Text>
      <Text style={s.sectionDescription}>
        只有點選就醫地圖的「使用目前位置」時才會詢問授權與取得位置，用於醫院距離排序。不開啟仍可瀏覽及搜尋醫院；不使用背景定位。
      </Text>
      <View style={s.notificationCard}>
        <Row
          title="定位權限"
          value={locationPermission}
          rowStyle={[s.notificationInnerRow, s.lastPermissionRow]}
          icon="location-outline"
        />
      </View>
      <Row
        title="前往手機設定管理權限"
        icon="settings-outline"
        onPress={() => Linking.openSettings()}
        rowStyle={s.roundedActionRow}
      />
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
      {__DEV__ ? (
        <>
          <Text style={s.heading}>版本資訊</Text>
          <Row
            title="App 開發版本"
            value={String(Constants.expoConfig?.sdkVersion || '尚未確認')}
            rowStyle={s.whiteSettingRow}
          />
          <Row
            title="裝置平台"
            value={Platform.OS === 'ios' ? 'iPhone' : 'Android'}
            rowStyle={s.whiteSettingRow}
          />
          <Row title="服務環境" value="由 App 設定提供" rowStyle={s.whiteSettingRow} />
        </>
      ) : null}
    </Page>
  );
}

export function PrivacyPolicyScreen() {
  return (
    <Page>
      <SettingsDocumentHero
        title="MEGO 隱私政策"
        subtitle="了解你提供的資料如何用於毛孩照護記錄與 App 功能。"
        icon="shield-checkmark-outline"
      />
      <SettingsDocumentSection title="資料與用途" index={1} icon="folder-open-outline">
        <SettingsDocumentParagraph label="處理的資料">
          MEGO
          會依本政策處理你為照護毛孩而提供的資料，包括帳號資訊、毛孩基本資料、健康事件、體重、用藥、疫苗、驅蟲、就醫紀錄、提醒、附件與照片。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph label="使用目的">
          這些資料只用於建立時間軸、提供提醒、產生匯出報告，以及在你主動使用 AI
          助手時整理照護資訊。AI 回覆僅供紀錄整理與一般資訊參考，不代表醫療診斷。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
      <SettingsDocumentSection title="MEGO AI 資料使用" index={2} icon="sparkles-outline">
        <SettingsDocumentParagraph label="對話資料">
          首次開始 MEGO AI 對話前，App 會請你確認資料使用說明。使用生成式 AI
          回答時，你輸入的問題與同一對話最近最多 10 則訊息會傳送至 MEGO 設定的 AI
          服務，以延續對話脈絡；不同對話不會互相帶入。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph label="照護紀錄的選取">
          若問題需要個人化照護資訊，系統會依問題選取必要的毛孩基本資料或相關照護紀錄，例如過敏、慢性病、日常觀察、就醫或用藥紀錄，不會一併傳送所有紀錄。一般生活問題不會附帶毛孩紀錄。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph label="服務處理與選擇">
          選擇稍後或關閉確認視窗時，不會開始該次 AI 對話或送出問題。AI 服務由 MEGO
          設定的服務提供者處理，資料的處理與保存方式可能依實際服務及部署設定而異；本政策不承諾服務提供者的特定保存期限或使用方式。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph>
          你可以在「設定 → AI 助手 → AI
          資料使用說明」查看資料使用內容。請避免在問題或紀錄中提供完成照護整理不需要的敏感資訊。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
      <SettingsDocumentSection title="資料分享與安全" index={3} icon="lock-closed-outline">
        <SettingsDocumentParagraph>
          MEGO
          不會將你的資料用於廣告販售。使用同步或匯出功能時，必要資料可能傳送至提供該功能的服務；我們會依部署環境採取適當的存取控制與傳輸保護。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph label="照片與附件">
          當你主動上傳毛孩頭像或照護紀錄照片時，照片檔案會傳送並保存在 MEGO
          後端設定的檔案儲存區；MongoDB
          保存照片的索引與所屬毛孩／紀錄等中繼資料，不直接保存照片檔案本身。刪除照片、相關毛孩或照護紀錄，或刪除帳號時，系統會一併清除對應照片檔案及中繼資料。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
      <SettingsDocumentSection title="你的權利" index={4} icon="person-circle-outline">
        <SettingsDocumentParagraph>
          你可以在 App 中查看、編輯、匯出或刪除自己建立的毛孩與照護紀錄；永久刪除帳號可前往「設定 →
          我的帳號」。如有隱私問題，請透過產品提供的聯絡方式與我們聯繫。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph emphasis>
          本政策會在資料處理方式或服務功能重大變更時更新。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
    </Page>
  );
}

export function TermsOfUseScreen() {
  return (
    <Page>
      <SettingsDocumentHero
        title="使用條款"
        subtitle="使用 MEGO 前，請了解照護資訊、AI 功能與服務使用原則。"
        icon="document-text-outline"
      />
      <SettingsDocumentSection title="帳號與 App 使用" index={1} icon="phone-portrait-outline">
        <SettingsDocumentParagraph>
          使用 MEGO 即表示你同意使用本 App
          建立與管理毛孩資料、健康紀錄、提醒、匯出及相關功能。你應提供真實且不侵害他人權利的內容，並妥善保管帳號登入資訊。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
      <SettingsDocumentSection title="健康資訊限制" index={2} icon="medkit-outline">
        <SettingsDocumentParagraph label="服務範圍">
          MEGO 是照護紀錄與整理工具，不提供疾病診斷、獸醫診斷替代、藥物處方或緊急醫療服務。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph label="照護資訊請自行確認">
          用藥、疫苗、驅蟲與提醒內容請由飼主確認；毛孩出現嚴重或持續惡化症狀時，應立即聯絡合格動物醫院。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
      <SettingsDocumentSection title="AI 助手與資料" index={3} icon="sparkles-outline">
        <SettingsDocumentParagraph label="資料如何使用">
          首次使用生成式 AI，或 AI 資料使用說明更新時，須先確認該版本的說明。你輸入的問題會傳送至
          MEGO 設定的 AI 服務；同一對話最近最多 10
          則訊息可能一併傳送以延續脈絡，不同對話不會互相帶入。只有問題需要個人化照護資訊時，系統才會選取必要的毛孩資料或相關紀錄。選擇稍後或關閉確認視窗，不會開始該次
          AI 對話。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph label="回覆的使用限制" emphasis>
          AI 內容可能不完整或不準確，不能取代獸醫專業判斷；請勿將 AI 回覆視為診斷或治療指示。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
      <SettingsDocumentSection title="內容與服務" index={4} icon="construct-outline">
        <SettingsDocumentParagraph>
          你對自己上傳的資料負責。不得利用本 App
          從事違法、侵害他人權利或干擾服務的行為。功能可能因維護、版本更新或第三方服務狀態而調整。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph emphasis>
          如不同意本條款，請停止使用 MEGO。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
    </Page>
  );
}

const s = StyleSheet.create({
  subheading: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.text,
    marginTop: 16,
    marginBottom: 3,
  },
  sectionDescription: { color: palette.sub, lineHeight: 19, fontSize: 13, marginBottom: 10 },
  lastPermissionRow: { borderBottomWidth: 0 },
  notificationSwitch: { transform: [{ scale: 0.86 }], alignSelf: 'center', marginRight: -4 },
  roundedActionRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E0D4',
    backgroundColor: '#FFFFFF',
  },
  notificationCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D4',
    marginBottom: 12,
  },
  whiteSettingRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 8,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  notificationInnerRow: { backgroundColor: '#FFFFFF' },
  notificationDescription: {
    color: '#887A6D',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
    textAlign: 'left',
  },
  row: {
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(228,221,212,0.70)',
    backgroundColor: '#FFF4E8',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: { marginRight: 10 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: palette.text },
  note: { color: palette.sub, lineHeight: 19, fontSize: 13, marginVertical: 14 },
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
  identityAction: {
    minHeight: 52,
    marginTop: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  identityActionText: { color: palette.primary, fontWeight: '800' },
  aboutHero: {
    fontSize: 30,
    fontWeight: '900',
    color: '#5F9274',
    textAlign: 'center',
    marginVertical: 20,
  },
  aboutParagraph: { fontSize: 15, lineHeight: 24, color: '#4A382E', marginBottom: 12 },
  heading: { fontSize: 19, fontWeight: '800', color: palette.text, marginTop: 24, marginBottom: 9 },
  subsectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.sub,
    marginTop: 9,
    marginBottom: 4,
  },
  paragraph: { fontSize: 15, lineHeight: 24, color: palette.text, marginBottom: 12 },
});
