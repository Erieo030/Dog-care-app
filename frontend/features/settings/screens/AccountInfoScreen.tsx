import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：設定中的登入帳號資訊；由 ProfileStack 的 AccountInfo route 開啟。 */
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useAuth } from '../../../contexts/AuthContext';

export function AccountInfoScreen() {
  const { session, deleteAccount } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const requestDeleteAccount = () => {
    Alert.alert(
      '永久刪除帳號？',
      '這會永久刪除帳號及伺服器上的毛孩資料、照護紀錄、AI 用量與照片，並撤銷所有登入 session，且無法復原。AI 對話只保存在各裝置；目前裝置的對話快取會清除，其他裝置上的本機副本無法遠端抹除。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '繼續',
          style: 'destructive',
          onPress: () => {
            setPassword('');
            setConfirmationText('');
            setDeleteError('');
            setConfirmVisible(true);
          },
        },
      ],
    );
  };

  const submitDeleteAccount = async () => {
    if (!password || confirmationText.trim() !== '刪除帳號' || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount(password);
      setConfirmVisible(false);
    } catch (error) {
      setDeleteError((error as Error).message || '刪除失敗，請確認網路後重試。');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
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
        <Text style={s.section}>永久性操作</Text>
        <View style={s.dangerGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="永久刪除帳號及所有相關資料"
            style={s.deleteRow}
            onPress={requestDeleteAccount}
          >
            <View style={s.deleteIcon}>
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            </View>
            <View style={s.deleteCopy}>
              <Text style={s.deleteTitle}>刪除帳號</Text>
              <Text style={s.deleteHint}>永久刪除帳號與所有相關資料</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.danger} />
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setConfirmVisible(false)}
      >
        <KeyboardAvoidingView
          style={s.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.confirmPanel}>
            <View style={s.confirmIcon}>
              <Ionicons name="warning-outline" size={26} color={Colors.danger} />
            </View>
            <Text style={s.confirmTitle}>最後確認</Text>
            <Text style={s.confirmDescription}>
              請輸入目前密碼，並輸入「刪除帳號」確認。伺服器上的帳號、毛孩、照護紀錄、AI 用量與照片會永久移除，所有登入 session 會撤銷。目前裝置的 AI 對話快取會清除；其他裝置上的本機副本不會被遠端抹除。
            </Text>
            <TextInput
              accessibilityLabel="目前密碼"
              style={s.confirmInput}
              placeholder="目前密碼"
              placeholderTextColor={Colors.subtext}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              editable={!deleting}
            />
            <TextInput
              accessibilityLabel="輸入刪除帳號以確認"
              style={s.confirmInput}
              placeholder="輸入「刪除帳號」"
              placeholderTextColor={Colors.subtext}
              value={confirmationText}
              onChangeText={setConfirmationText}
              autoCapitalize="none"
              editable={!deleting}
            />
            {!!deleteError && <Text style={s.deleteError}>{deleteError}</Text>}
            <View style={s.confirmActions}>
              <Pressable
                accessibilityRole="button"
                style={s.cancelButton}
                onPress={() => setConfirmVisible(false)}
                disabled={deleting}
              >
                <Text style={s.cancelLabel}>取消</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[
                  s.confirmDeleteButton,
                  (!password || confirmationText.trim() !== '刪除帳號' || deleting) && s.disabledButton,
                ]}
                onPress={submitDeleteAccount}
                disabled={!password || confirmationText.trim() !== '刪除帳號' || deleting}
              >
                <Text style={s.confirmDeleteLabel}>{deleting ? '刪除中…' : '永久刪除'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 120 },
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
  dangerGroup: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#E9C9BE',
    borderRadius: 16,
    overflow: 'hidden',
  },
  deleteRow: { minHeight: 72, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  deleteIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#FBE9E5', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  deleteCopy: { flex: 1 },
  deleteTitle: { color: Colors.danger, fontSize: 15, fontWeight: '800' },
  deleteHint: { color: Colors.subtext, fontSize: 12, lineHeight: 17, marginTop: 3 },
  modalBackdrop: { flex: 1, padding: 22, justifyContent: 'center', backgroundColor: 'rgba(45, 35, 29, 0.42)' },
  confirmPanel: { backgroundColor: Colors.surface, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: Colors.border },
  confirmIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FBE9E5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  confirmTitle: { color: Colors.text, fontSize: 22, fontWeight: '900' },
  confirmDescription: { color: Colors.subtext, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 16 },
  confirmInput: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background, paddingHorizontal: 14, color: Colors.text, fontSize: 15, marginBottom: 10 },
  deleteError: { color: Colors.danger, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  cancelLabel: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  confirmDeleteButton: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center' },
  confirmDeleteLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabledButton: { opacity: 0.45 },
});
