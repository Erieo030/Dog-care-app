/** 用途：PawLog 統一設定中心。 */
import Constants from 'expo-constants';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { ProfileStackParamList } from '../navigation/types';
import { cancelAccountNotifications } from '../services/notificationService';
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
}: {
  title: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) => (
  <TouchableOpacity accessibilityRole="button" style={s.row} onPress={onPress}>
    <Text numberOfLines={1} ellipsizeMode="tail" style={[s.title, danger && s.danger]}>{title}</Text>
    <View style={s.accessory}>
      {value ? <Text numberOfLines={1} ellipsizeMode="tail" style={[s.value, danger && s.danger]}>{value}</Text> : null}
      <Text style={[s.chevron, danger && s.danger]}>›</Text>
    </View>
  </TouchableOpacity>
);
export default function ProfileScreen({ navigation }: Props) {
  const { session, logout } = useAuth();
  const { selectedPet } = usePet();
  const [loggingOut, setLoggingOut] = useState(false);
  const confirmLogout = () =>
    Alert.alert('登出帳號', '登出後會取消此帳號在本機排程的 PawLog 通知；後端健康資料不會刪除。', [
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
        <Text style={s.hero}>設定</Text>
        <Section title="帳號與毛孩">
          <Row
            title="帳號"
            value={session?.email || '尚未確認'}
            onPress={() => navigation.navigate('AccountInfo')}
          />
          <Row
            title="毛孩管理"
            value={selectedPet?.name}
            onPress={() => navigation.navigate('PetManagement')}
          />
        </Section>
        <Section title="一般設定">
          <Row title="通知" onPress={() => navigation.navigate('NotificationSettings')} />
          <Row title="提醒偏好" onPress={() => navigation.navigate('ReminderPreferences')} />
        </Section>
        <Section title="資料">
          <Row
            title="資料匯出"
            value="PDF、CSV、JSON"
            onPress={() => navigation.navigate('ExportCenter')}
          />
          <Row title="儲存空間" onPress={() => navigation.navigate('StorageSettings')} />
          <Row title="本機資料與偏好" onPress={() => navigation.navigate('LocalDataSettings')} />
        </Section>
        <Section title="關於">
          <Row
            title="關於 PawLog"
            value={Constants.expoConfig?.version || '尚未確認'}
            onPress={() => navigation.navigate('About')}
          />
          <Row title="隱私政策" onPress={() => navigation.navigate('PrivacyPolicy')} />
          <Row title="使用條款" onPress={() => navigation.navigate('TermsOfUse')} />
          <Row title="問題回報" onPress={() => navigation.navigate('Feedback')} />
        </Section>
        <Section title="帳號">
          <Row title={loggingOut ? '登出中…' : '登出'} danger onPress={confirmLogout} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
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
  safe: { flex: 1, backgroundColor: '#FCFAF1' },
  content: { padding: 18, paddingBottom: 45 },
  hero: { fontSize: 28, fontWeight: '900', color: '#6A4D3E', marginBottom: 12 },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: '#887A6D',
    marginTop: 20,
    marginBottom: 7,
    marginLeft: 5,
  },
  group: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E0D4',
  },
  row: {
    minHeight: 56,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D4',
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: '#6A4D3E' },
  accessory: { maxWidth: '58%', flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  value: { flexShrink: 1, fontSize: 13, color: '#887A6D', textAlign: 'right' },
  chevron: { marginLeft: 8, fontSize: 22, lineHeight: 22, color: '#887A6D' },
  danger: { color: '#C94C4C' },
  note: { fontSize: 13, lineHeight: 19, color: '#887A6D', marginTop: 14 },
});
