import React, { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import type { ProfileStackParamList } from '../navigation/types';
import {
  disableLostProfile,
  getLostProfile,
  LostProfile,
  saveLostProfile,
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
      Alert.alert('已啟用', '公開協尋頁已建立');
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
    contactPhone: '',
    showBreed: true,
    showSex: true,
    showNeutered: false,
    showCoatColor: true,
    showDistinctiveFeatures: true,
    showAvatar: true,
    lostMode: false,
  };
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>走失協尋 QR</Text>
      <Text style={s.note}>啟用後，掃描 QR Code 的人可以查看你選擇公開的協尋資訊與電話。</Text>
      {(
        [
          'contactName',
          'contactPhone',
          'alternatePhone',
          'contactMessage',
          'lostLocationText',
          'lostMessage',
        ] as const
      ).map((k) => (
        <TextInput
          key={k}
          style={s.input}
          placeholder={
            {
              contactName: '聯絡人姓名',
              contactPhone: '聯絡電話',
              alternatePhone: '備用電話',
              contactMessage: '聯絡留言',
              lostLocationText: '最後看到地點',
              lostMessage: '協尋留言',
            }[k]
          }
          value={String(d[k as keyof LostProfile] ?? '')}
          onChangeText={(v) => setP({ ...d, [k]: v })}
        />
      ))}
      <TouchableOpacity onPress={() => setP({ ...d, lostMode: !d.lostMode })}>
        <Text>□ 走失模式：{d.lostMode ? '開啟' : '關閉'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.primary} disabled={saving} onPress={save}>
        <Text style={s.primaryText}>
          {saving ? '儲存中…' : d.enabled ? '更新公開資料' : '啟用走失協尋'}
        </Text>
      </TouchableOpacity>
      {d.enabled && (
        <>
          <TouchableOpacity style={s.primary} onPress={() => navigation.navigate('LostPetQr')}>
            <Text style={s.primaryText}>查看 QR Code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Alert.alert('停用公開頁', '停用後掃描 QR 將無法查看資料。', [
                { text: '取消' },
                {
                  text: '停用',
                  style: 'destructive',
                  onPress: async () => {
                    if (session?.userId && selectedPet) {
                      await disableLostProfile(session.userId, selectedPet.id);
                      setP({ ...d, enabled: false });
                    }
                  },
                },
              ])
            }
          >
            <Text style={s.danger}>停用公開協尋頁</Text>
          </TouchableOpacity>
        </>
      )}
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
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>{selectedPet?.name} 的協尋 QR</Text>
      <QRCode value={url} size={240} />
      <Text selectable style={s.url}>
        {url}
      </Text>
      <TouchableOpacity
        style={s.primary}
        onPress={() =>
          Share.share({ message: `這是 ${selectedPet?.name} 的 PawLog 協尋資訊：${url}` })
        }
      >
        <Text style={s.primaryText}>分享協尋連結</Text>
      </TouchableOpacity>
      <Text style={s.note}>QR 只包含公開連結，不包含健康資料或登入資訊。</Text>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 18, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '800' },
  note: { color: '#666', lineHeight: 22 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, minHeight: 52 },
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
