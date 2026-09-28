/** 用途：設定中的登入帳號資訊；由 ProfileStack 的 AccountInfo route 開啟。 */
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useAuth } from '../../../contexts/AuthContext';

export function AccountInfoScreen() {
  const { session } = useAuth();
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <View style={s.accountIntro}>
          <View style={s.accountIntroIcon}>
            <Ionicons name="person-outline" size={24} color={Colors.primary} />
          </View>
          <View style={s.accountIntroCopy}>
            <Text style={s.usageEyebrow}>帳號資料</Text>
            <Text style={s.accountHeading}>登入帳號</Text>
            <Text style={s.accountHint}>此帳號用於同步你的毛孩與照護紀錄。</Text>
          </View>
        </View>
        <Text style={s.section}>帳號資訊</Text>
        <View style={s.group}>
          <View style={s.row}>
            <Ionicons
              name="mail-outline"
              size={19}
              color={Colors.success}
              style={s.accountRowIcon}
            />
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
  accountIntro: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 14 },
  accountIntroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountIntroCopy: { flex: 1 },
  usageEyebrow: { color: Colors.primary, fontSize: 13, fontWeight: '800', marginBottom: 2 },
  accountHeading: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  accountHint: { color: Colors.subtext, fontSize: 13, lineHeight: 19, marginTop: 3 },
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
  accountRowIcon: { marginRight: 10 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  value: { flexShrink: 1, fontSize: 13, color: Colors.subtext, textAlign: 'right' },
  note: { fontSize: 13, lineHeight: 19, color: Colors.subtext, marginTop: 14 },
});
