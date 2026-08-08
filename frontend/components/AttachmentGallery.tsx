/** 用途：詳細頁可水平滑動查看附件，並在載入失敗時提供 placeholder 與重試。 */
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Attachment } from '../types';
import { attachmentUri } from '../services/attachmentService';
import { Colors } from '../constants/Colors';
export default function AttachmentGallery({
  items,
  userId,
}: {
  items: Attachment[];
  userId: string;
}) {
  const { width } = useWindowDimensions();
  const [failed, setFailed] = useState<Record<string, number>>({});
  if (!items.length) return <Text style={s.empty}>目前沒有照片</Text>;
  const w = Math.min(width - 44, 420);
  return (
    <View>
      <Text style={s.count}>📷 {items.length} 張照片</Text>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {items.map((x) => (
          <View key={x.id} style={{ width, alignItems: 'center' }}>
            {failed[x.id] ? (
              <View style={[s.placeholder, { width: w }]}>
                <Text>圖片載入失敗</Text>
                <TouchableOpacity onPress={() => setFailed((v) => ({ ...v, [x.id]: 0 }))}>
                  <Text style={s.retry}>重新載入</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Image
                resizeMode="contain"
                source={{ uri: attachmentUri(x, userId, failed[x.id] || 0) }}
                style={[s.image, { width: w }]}
                onError={() => setFailed((v) => ({ ...v, [x.id]: (v[x.id] || 0) + 1 }))}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  count: { fontWeight: '700', color: Colors.text, marginBottom: 8 },
  image: { height: 280, borderRadius: 14, backgroundColor: Colors.surface },
  placeholder: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
  },
  retry: { color: Colors.primary, fontWeight: '800', marginTop: 8 },
  empty: { color: Colors.subtext },
});
