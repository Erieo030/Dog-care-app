/** 用途：MEGO 統一設定中心。 */
import Constants from 'expo-constants';
import React, { useRef, useState } from 'react';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { Colors } from '../constants/Colors';
import { ProfileStackParamList } from '../navigation/types';
import { cancelAccountNotifications } from '../services/notificationService';
import { AIUsage, getAIUsage } from '../services/aiService';
type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileOverview'>;
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View>
    <Text style={s.section}>{title}</Text>
    <View style={s.group}>{children}</View>
  </View>
);
const Row = ({
  title,
  value,
  onPress,
  danger = false,
  icon = 'ellipse-outline',
  imageUri,
}: {
  title: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  imageUri?: string;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
  <Animated.View style={{ transform: [{ scale }] }}>
  <TouchableOpacity accessibilityRole="button" accessibilityLabel={value ? `${title} ${value}` : title} style={s.row} onPress={onPress} onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}>
    <View style={s.rowIcon}>{imageUri ? <Image source={{ uri: imageUri }} style={s.rowAvatar} /> : <Ionicons name={icon} size={19} color={danger ? Colors.danger : Colors.success} />}</View>
    <Text numberOfLines={1} ellipsizeMode="tail" style={[s.title, danger && s.danger]}>{title}</Text>
    <View style={s.accessory}>
      {value ? <Text numberOfLines={1} ellipsizeMode="tail" style={[s.value, danger && s.danger]}>{value}</Text> : null}
      <Text style={[s.chevron, danger && s.danger]}>›</Text>
    </View>
  </TouchableOpacity>
  </Animated.View>
  );
};


export default function SettingsHomeScreen({ navigation }: Props) {
  const { session, logout } = useAuth();
  const { selectedPet } = usePet();
  const [loggingOut, setLoggingOut] = useState(false);
  const [aiUsageText, setAiUsageText] = useState('不限次數');
  useFocusEffect(React.useCallback(() => {
    if (!session?.userId) return undefined;
    getAIUsage(session.userId).then((usage) => setAiUsageText(usage.unlimited ? '不限次數' : `剩餘 ${usage.remaining} 次`)).catch(() => undefined);
    return undefined;
  }, [session?.userId]));
  const confirmLogout = () =>
    Alert.alert('登出帳號', '登出後會取消此帳號在本機排程的 MEGO 通知；後端健康資料不會刪除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '登出',
        style: 'destructive',
        onPress: async () => {
          if (loggingOut) return;
          setLoggingOut(true);
          try {
            if (session?.userId)
              await cancelAccountNotifications(session.userId).catch(() => undefined);
            logout();
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.profileBrand}><Image source={require('../assets/home-scene/logo.png')} style={s.profileLogo} /><Text style={s.hero}>設定</Text></View>
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
            imageUri={selectedPet?.avatarUrl}
          />
        </Section>
        <Section title="一般設定">
          <Row title="手機通知" icon="notifications-outline" onPress={() => navigation.navigate('NotificationSettings')} />
        </Section>
        <Section title="AI 助手">
          <Row
            title="今日 AI 整理次數"
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
          <Row title="隱私政策" icon="lock-closed-outline" onPress={() => navigation.navigate('PrivacyPolicy')} />
          <Row title="使用條款" icon="document-text-outline" onPress={() => navigation.navigate('TermsOfUse')} />
        </Section>
        <Section title="帳號操作">
          <Row title={loggingOut ? '登出中…' : '登出'} icon="log-out-outline" danger onPress={confirmLogout} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
export function AIUsageScreen() {
  const { session } = useAuth();
  const [usage, setUsage] = useState<AIUsage | null>(null);
  useFocusEffect(React.useCallback(() => {
    if (!session?.userId) return undefined;
    getAIUsage(session.userId).then(setUsage).catch(() => undefined);
    return undefined;
  }, [session?.userId]));
  const used = usage?.used ?? 0;
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <Text style={s.usageHero}>{usage?.unlimited ? '∞' : (usage?.remaining ?? 0)}</Text><Text style={s.usageLabel}>{usage?.unlimited ? '每日不限次數' : '今天還可以詢問幾次'}</Text>
    <View style={s.usageCard}><Text style={s.usageTitle}>今日使用</Text><Text style={s.usageValue}>{usage?.unlimited ? `${used} 次 · 不限次數` : `${used} / ${usage?.dailyLimit || 0} 次`}</Text><Text style={s.usageHint}>{usage?.unlimited ? '目前沒有開啟每日次數限制' : '每日額度會在每天午夜更新'}</Text></View>

    <Text style={s.section}>你可以詢問</Text><Text style={s.paragraph}>・今天有什麼提醒？
・最近體重如何？
・最近有哪些健康異常？</Text>
  </ScrollView></SafeAreaView>;
}
export function AccountInfoScreen() {
  const { session } = useAuth();
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Text style={s.section}>帳號</Text>
        <View style={s.group}>
          <View style={s.row}>
            <Text style={s.title}>Email</Text>
            <Text style={s.value}>{session?.email || '尚未確認'}</Text>
          </View>
        </View>
        <Text style={s.note}>本階段不提供修改 Email、密碼或 Email 驗證。</Text>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 45 },
  profileBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  profileLogo: { width: 36, height: 34, resizeMode: 'contain' },
  hero: { fontSize: 28, fontWeight: '900', color: Colors.text, marginBottom: 12 },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.subtext,
    marginTop: 20,
    marginBottom: 7,
    marginLeft: 5,
  },
  group: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    minHeight: 56,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' },
  rowAvatar: { width: 32, height: 32, resizeMode: 'cover' },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  accessory: { maxWidth: '58%', flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  value: { flexShrink: 1, fontSize: 13, color: Colors.subtext, textAlign: 'right' },
  chevron: { marginLeft: 8, fontSize: 22, lineHeight: 22, color: Colors.subtext },
  danger: { color: Colors.danger },
  usageHero: { fontSize: 48, fontWeight: '900', color: '#5F9274', textAlign: 'center', marginTop: 24 },
  usageLabel: { textAlign: 'center', color: Colors.text, fontSize: 16, fontWeight: '700', marginBottom: 20 },
  usageCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  usageTitle: { color: Colors.subtext, fontSize: 13, fontWeight: '700' },
  usageValue: { color: Colors.text, fontSize: 20, fontWeight: '900', marginTop: 6 },
  usageHint: { color: Colors.subtext, fontSize: 12, marginTop: 5 },
  paragraph: { color: Colors.text, fontSize: 15, lineHeight: 25 },
  note: { fontSize: 13, lineHeight: 19, color: Colors.subtext, marginTop: 14 },
});
