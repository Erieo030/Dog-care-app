import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：MEGO 統一設定中心。 */
import Constants from 'expo-constants';
import React, { useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { useSettings } from '../contexts/SettingsContext';
import { HOME_THEMES } from '../constants/HomeThemes';
import { Colors } from '../constants/Colors';
import { ProfileStackParamList } from '../navigation/types';
import { getAIUsage } from '../services/aiService';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import {
  SettingsHomeRow as Row,
  SettingsHomeSection as Section,
} from '../features/settings/components/SettingsHomeRows';
type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileOverview'>;

export default function SettingsHomeScreen({ navigation }: Props) {
  const { session, logout } = useAuth();
  const { selectedPet } = usePet();
  const { settings } = useSettings();
  const [loggingOut, setLoggingOut] = useState(false);
  const [aiUsageText, setAiUsageText] = useState('正在載入…');
  const bottomContentPadding = useTabContentBottomPadding();
  const loadedUsageUserRef = useRef('');
  useFocusEffect(
    React.useCallback(() => {
      const controller = new AbortController();
      let active = true;
      if (!session?.userId) {
        setAiUsageText('暫時無法取得');
        return undefined;
      }
      if (loadedUsageUserRef.current !== session.userId) setAiUsageText('正在載入…');
      getAIUsage(session.userId, controller.signal)
        .then((usage) => {
          if (active) {
            loadedUsageUserRef.current = session.userId;
            setAiUsageText(`今日已用 ${usage.used} 次`);
          }
        })
        .catch(() => {
          if (active) {
            loadedUsageUserRef.current = session.userId;
            setAiUsageText('暫時無法取得');
          }
        });
      return () => {
        active = false;
        controller.abort();
      };
    }, [session?.userId]),
  );
  const confirmLogout = () =>
    Alert.alert('登出帳號', '登出只會清除登入狀態；已排程的 MEGO 通知與照護資料會保留。', [
      { text: '取消', style: 'cancel' },
      {
        text: '登出',
        style: 'destructive',
        onPress: async () => {
          if (loggingOut) return;
          setLoggingOut(true);
          try {
            logout();
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomContentPadding }]}>
        <View style={s.profileBrand}>
          <Image source={require('../assets/home-scene/logo.webp')} style={s.profileLogo} />
          <Text style={s.hero}>設定</Text>
        </View>
        <Section title="帳號與毛孩">
          <Row
            title="我的帳號"
            value={session?.email || '尚未確認'}
            onPress={() => navigation.navigate('AccountInfo')}
            icon="person-outline"
          />
          <Row
            title="我的毛孩"
            value={selectedPet?.name}
            onPress={() => navigation.navigate('PetManagement')}
            icon="paw-outline"
            imageAttachmentId={selectedPet?.avatarAttachmentId}
            imageUserId={session?.userId}
          />
        </Section>
        <Section title="一般設定">
          <Row
            title="手機權限與提醒"
            value="通知、相簿與相機"
            icon="phone-portrait-outline"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <Row
            title="照護小屋風格"
            value={HOME_THEMES[settings.homeTheme].title}
            icon="color-palette-outline"
            onPress={() => navigation.navigate('HomeTheme')}
          />
        </Section>
        <Section title="AI 助手">
          <Row
            title="AI 資料使用說明"
            value="查看資料如何用於問答"
            onPress={() => navigation.navigate('AIDataUseInfo')}
            icon="lock-closed-outline"
          />
          <Row
            title="AI 使用紀錄"
            value={aiUsageText}
            onPress={() => navigation.navigate('AIUsage')}
            icon="sparkles-outline"
          />
        </Section>
        <Section title="資料">
          <Row
            title="匯出照護紀錄"
            value="PDF"
            onPress={() => navigation.navigate('ExportCenter')}
            icon="share-outline"
          />
        </Section>
        <Section title="關於">
          <Row
            title="關於 MEGO"
            value={Constants.expoConfig?.version || '尚未確認'}
            onPress={() => navigation.navigate('About')}
            icon="information-circle-outline"
          />
          <Row
            title="隱私政策"
            icon="lock-closed-outline"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <Row
            title="使用條款"
            icon="document-text-outline"
            onPress={() => navigation.navigate('TermsOfUse')}
          />
        </Section>
        <Section title="帳號操作">
          <Row
            title={loggingOut ? '登出中…' : '登出'}
            icon="log-out-outline"
            danger
            onPress={confirmLogout}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 18, paddingTop: 18 },
  profileBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  profileLogo: { width: 36, height: 34, resizeMode: 'contain' },
  hero: { fontSize: 28, fontWeight: '900', color: Colors.text, marginBottom: 12 },
});
