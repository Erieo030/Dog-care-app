/** 用途：提供相機、相簿、多張預覽、單張刪除與失敗重試的共用附件 UI。 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Attachment, AttachmentSourceType } from '../types';
import {
  attachmentUri,
  deleteAttachment,
  pickAndUploadAttachments,
  AttachmentPickSource,
} from '../services/attachmentService';

interface Props {
  userId: string;
  petId: string;
  sourceType: AttachmentSourceType;
  limit: number;
  value: Attachment[];
  onChange: (items: Attachment[]) => void;
  disabled?: boolean;
}
export default function AttachmentPicker({
  userId,
  petId,
  sourceType,
  limit,
  value,
  onChange,
  disabled,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [last, setLast] = useState<AttachmentPickSource | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const pick = async (source: AttachmentPickSource) => {
    if (busy || disabled) return;
    setBusy(true);
    setError('');
    setLast(source);
    try {
      const items = await pickAndUploadAttachments({
        source,
        userId,
        petId,
        sourceType,
        remaining: limit - value.length,
      });
      onChange([...value, ...items]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = (item: Attachment) =>
    Alert.alert('刪除照片', '確定刪除這張照片？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await deleteAttachment(userId, item);
            onChange(value.filter((x) => x.id !== item.id));
          } catch (e) {
            Alert.alert('刪除失敗', (e as Error).message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  return (
    <View style={s.wrap}>
      <Text style={s.title}>照片（{value.length}/{limit}）</Text>
      {value.length > 0 ? <Text style={s.uploaded}>已上傳照片，可新增或移除</Text> : null}
      <View style={s.actions}>
        <TouchableOpacity
          disabled={busy || disabled || value.length >= limit}
          style={s.button}
          onPress={() => pick('camera')}
        >
          <Ionicons name="camera-outline" size={18} color={Colors.text} /><Text style={s.buttonText}>拍照</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={busy || disabled || value.length >= limit}
          style={s.button}
          onPress={() => pick('library')}
        >
          <Ionicons name="images-outline" size={18} color={Colors.text} /><Text style={s.buttonText}>從相簿選擇</Text>
        </TouchableOpacity>
      </View>
      {busy && (
        <View style={s.status}>
          <ActivityIndicator />
          <Text>處理照片中…</Text>
        </View>
      )}
      {error ? (
        <View style={s.error}>
          <Text style={s.errorText}>{error}</Text>
          {last && (
            <TouchableOpacity onPress={() => pick(last)}>
              <Text style={s.retry}>重試</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {value.map((item) => (
          <View key={item.id} style={s.photo}>
            {failed[item.id] ? (
              <View style={s.placeholder}>
                <Text>圖片載入失敗</Text>
                <TouchableOpacity onPress={() => setFailed((x) => ({ ...x, [item.id]: false }))}>
                  <Text style={s.retry}>重試</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Image
                source={{ uri: attachmentUri(item, userId) }}
                style={s.image}
                onError={() => setFailed((x) => ({ ...x, [item.id]: true }))}
              />
            )}
            <TouchableOpacity
              disabled={busy || disabled}
              style={s.remove}
              onPress={() => remove(item)}
            >
              <Text style={s.removeText}>移除</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { marginTop: 16 },
  title: { fontWeight: '700', color: Colors.text, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  button: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonText: { color: Colors.text, fontWeight: '600' },
  status: { flexDirection: 'row', gap: 8, marginTop: 10 },
  error: { marginTop: 10, padding: 10, backgroundColor: '#FFF1F0', borderRadius: 10 },
  errorText: { color: '#A33' },
  retry: { color: Colors.primary, fontWeight: '800', marginTop: 4 },
  photo: { width: 120, height: 120, marginTop: 12, marginRight: 10 },
  image: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: Colors.border },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 8,
  },
  uploaded: { color: Colors.subtext, fontSize: 13, marginBottom: 6 },
  remove: {
    position: 'absolute',
    right: 4,
    top: 4,
    minWidth: 48,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#0009',
    alignItems: 'center',
  },
  removeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
