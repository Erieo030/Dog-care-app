import React, { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  ScrollView,
  Share,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import type { ProfileStackParamList } from '../navigation/types';
import {
  getLostProfile,
  LostProfile,
  saveLostProfile,
  rotateLostToken,
} from '../services/lostPetService';
const BASE = (
  process.env.EXPO_PUBLIC_LOST_PET_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  ''
).replace(/\/$/, '');
type Props = NativeStackScreenProps<ProfileStackParamList, 'LostPetSettings'>;

export function LostPetSettingsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [p, setP] = useState<LostProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (session?.userId && selectedPet)
      getLostProfile(session.userId, selectedPet.id)
        .then((x) => setP(x.profile))
        .finally(() => setLoading(false));
  }, [session?.userId, selectedPet]);
  const save = async () => {
    if (!session?.userId || !selectedPet || saving) return;
    if (!p?.contactName?.trim() || !p.contactPhone?.trim())
      return Alert.alert('請填寫聯絡人姓名與電話');
    setSaving(true);
    try {
      const x = await saveLostProfile(session.userId, selectedPet.id, { ...p, enabled: true });
      setP(x.profile);
      Alert.alert('已儲存', '毛孩身份 QR 已更新');
    } catch (e) {
      Alert.alert('儲存失敗', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <Text>載入中…</Text>;
  const d = p || {
    enabled: false,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    showBreed: true,
    showSex: true,
    showNeutered: false,
    showCoatColor: true,
    showDistinctiveFeatures: true,
    showAvatar: true,
    showContactName: true,
    showContactEmail: false,
    showContactPhone: true,
    showAlternatePhone: false,
    showContactMessage: true,
    lostMode: false,
  };
  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.headerRow}>
        <View style={s.iconBadge}><Ionicons name="paw" size={24} color="#b96843" /></View>
        <View style={s.headerCopy}><Text style={s.title}>毛孩身份 QR</Text><Text style={s.subtitle}>讓家人或獸醫快速認識 {selectedPet?.name || '毛孩'}</Text></View>
      </View>
      <View style={s.petCard}>
        <View style={s.petAvatar}><Ionicons name="paw" size={30} color="#b96843" /></View>
        <View style={s.petInfo}><Text style={s.petName}>{selectedPet?.name || '尚未選擇毛孩'}</Text><Text style={s.petMeta}>{[selectedPet?.breed, selectedPet?.gender].filter(Boolean).join(' · ') || '補充毛孩基本資料'}</Text></View>
      </View>
      <View style={s.infoBox}><Ionicons name="shield-checkmark-outline" size={20} color="#5d9279" /><Text style={s.infoText}>QR 只分享你選擇的資料，不會公開帳號、密碼或完整健康紀錄。</Text></View>
      <Text style={s.sectionTitle}>聯絡方式</Text>
      <Text style={s.note}>姓名與主要電話是建立身份頁的必要資料；其他欄位可留空。</Text>
      {(['contactName','contactEmail','contactPhone','alternatePhone','contactMessage'] as const).map((k) => {
        const labels = { contactName: '聯絡人姓名（必填）', contactEmail: '主人 Email（選填）', contactPhone: '主要電話（必填）', alternatePhone: '備用電話（選填）', contactMessage: '聯絡留言（選填）' };
        const hints = { contactName: '掃描者知道要找誰聯絡', contactEmail: '方便使用 Email 聯絡', contactPhone: '建議填可接聽的手機號碼', alternatePhone: '主要電話無法接通時使用', contactMessage: '例如：請先簡訊告知再來電' };
        return <View key={k} style={s.fieldGroup}><Text style={s.fieldLabel}>{labels[k]}</Text><Text style={s.fieldHint}>{hints[k]}</Text><TextInput style={s.input} placeholder={k === 'contactMessage' ? '想留給掃描者的訊息' : '請輸入'} placeholderTextColor="#A49A90" value={String(d[k as keyof LostProfile] ?? '')} onChangeText={(v) => setP({ ...d, [k]: v })} /></View>;
      })}
      <Text style={s.sectionTitle}>公開資料</Text>
      <Text style={s.note}>建議開啟毛孩基本資料與主要聯絡方式；Email、備用電話與留言可依需要選擇。關閉的資料不會出現在掃描頁。</Text>
      {[['showBreed','品種'],['showSex','性別'],['showNeutered','結紮狀態'],['showCoatColor','毛色'],['showDistinctiveFeatures','明顯特徵'],['showAvatar','毛孩照片'],['showContactName','聯絡人姓名'],['showContactPhone','主要電話'],['showAlternatePhone','備用電話'],['showContactEmail','Email'],['showContactMessage','聯絡留言']].map(([key,label]) => (
        <View key={key} style={s.optionRow}><View style={s.optionCopy}><Text style={s.optionLabel}>{label}</Text><Text style={s.optionState}>{Boolean(d[key as keyof LostProfile]) ? '掃描頁會顯示' : '不公開'}</Text></View><Switch trackColor={{false:'#B8B1AA',true:'#9DCAB4'}} ios_backgroundColor='#D8D2CB' thumbColor={Boolean(d[key as keyof LostProfile]) ? '#3f8064' : '#F8F5F0'} value={Boolean(d[key as keyof LostProfile])} onValueChange={(value) => setP({ ...d, [key]: value })} /></View>
      ))}
      <TouchableOpacity style={s.primary} disabled={saving} onPress={save}><Text style={s.primaryText}>{saving ? '儲存中…' : '儲存身份資料'}</Text></TouchableOpacity>
      {d.enabled && <TouchableOpacity style={s.secondary} onPress={() => navigation.navigate('LostPetQr')}><Ionicons name="qr-code-outline" size={19} color="#3f8064" /><Text style={s.secondaryText}>查看身份 QR</Text></TouchableOpacity>}
    </ScrollView>
  );
}
export function LostPetQrScreen() {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [p, setP] = useState<LostProfile | null>(null);
  const [token, setToken] = useState('');
  useEffect(() => {
    if (session?.userId && selectedPet)
      getLostProfile(session.userId, selectedPet.id).then(async (x) => {
        setP(x.profile);
        if (x.profile?.publicToken) setToken(x.profile.publicToken);
      });
  }, [session?.userId, selectedPet]);
  const url = token && BASE ? `${BASE}/api/public/lost-pets/${token}/page` : '';
  if (!p || !url)
    return (
      <View style={s.center}>
        <Text>公開連結尚未準備好，請確認 PUBLIC URL 設定。</Text>
      </View>
    );
  const rotate = () => Alert.alert('更新安全連結？', '更新後舊 QR 將立即失效，需要重新分享新的 QR。', [{ text: '取消' }, { text: '更新', onPress: async () => { if (!session?.userId || !selectedPet) return; try { const x = await rotateLostToken(session.userId, selectedPet.id); setToken(x.publicToken); Alert.alert('已更新', '新的身份 QR 已產生'); } catch (e) { Alert.alert('更新失敗', (e as Error).message); } } }]);
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>{selectedPet?.name || '毛孩'} 的身份 QR</Text>
      <Text style={s.note}>出示此 QR，讓家人、照護者或獸醫快速查看你選擇的毛孩資料。</Text>
      <View style={s.qrCard}><QRCode value={url} size={230} /><Text style={s.qrCaption}>掃描即可查看公開身份頁</Text></View>
      <View style={s.infoBox}><Ionicons name="lock-closed-outline" size={20} color="#5d9279" /><Text style={s.infoText}>公開內容可在上一頁調整；更新資料後不必重新列印 QR。</Text></View>
      <TouchableOpacity style={s.primary} onPress={() => Share.share({ message: `這是 ${selectedPet?.name} 的毛孩身份資訊：${url}` })}><Ionicons name="share-outline" size={20} color="#fff" /><Text style={s.primaryText}>分享毛孩身份 QR</Text></TouchableOpacity>
      <TouchableOpacity style={s.secondary} onPress={rotate}><Ionicons name="refresh-outline" size={19} color="#3f8064" /><Text style={s.secondaryText}>更新安全連結</Text></TouchableOpacity>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 20, gap: 14, paddingBottom: 36 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBadge: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#f7e4d8', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  subtitle: { color: '#887d74', marginTop: 3 },
  petCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#eee5dc' },
  petAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#f7e4d8', alignItems: 'center', justifyContent: 'center' },
  petInfo: { flex: 1, minWidth: 0, marginLeft: 14 },
  petName: { fontSize: 22, fontWeight: '800', color: '#3f342c' },
  petMeta: { color: '#887d74', marginTop: 3 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#eef7f2', borderRadius: 14, padding: 12 },
  infoText: { flex: 1, color: '#526d60', lineHeight: 20 },
  qrCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 22, borderWidth: 1, borderColor: '#eee5dc' },
  qrCaption: { marginTop: 12, color: '#887d74' },
  secondary: { minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: '#cfe3d8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  secondaryText: { color: '#3f8064', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '800' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 8, color: '#3f342c' },
  optionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee5dc' },
  optionCopy: { flex: 1 },
  optionLabel: { fontSize: 16, color: '#3f342c' },
  optionState: { fontSize: 12, color: '#887d74', marginTop: 2 },
  note: { color: '#666', lineHeight: 22 },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 15, fontWeight: '700', color: '#3f342c' },
  fieldHint: { fontSize: 12, color: '#887d74', marginBottom: 2 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, minHeight: 52, backgroundColor: '#fff' },
  primary: {
    backgroundColor: '#3f8064',
    padding: 14,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  danger: { color: '#b42318', textAlign: 'center', padding: 18 },
  url: { color: '#555' },
});
