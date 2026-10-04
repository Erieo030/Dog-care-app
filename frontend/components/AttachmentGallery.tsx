/** 用途：詳細頁可水平滑動查看附件，並在載入失敗時提供 placeholder 與重試。 */
import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  LayoutChangeEvent,
} from 'react-native';
import { Attachment } from '../types';
import { attachmentUri } from '../services/attachmentService';
import { Colors } from '../constants/Colors';
import { getValidAccessToken } from '../services/api';
export default function AttachmentGallery({
  items,
  userId,
}: {
  items: Attachment[];
  userId: string;
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [failed, setFailed] = useState<Record<string, number>>({});
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void getValidAccessToken().then((token) => {
      if (active) setAccessToken(token);
    });
    return () => {
      active = false;
    };
  }, [userId]);
  const onLayout = (event: LayoutChangeEvent) => setContainerWidth(event.nativeEvent.layout.width);
  const imageWidth = Math.min(Math.max(containerWidth - 24, 0), 420);
  return (
    <View style={s.container} onLayout={onLayout}>
      {items.length ? <Text style={s.count}>📷 {items.length} 張照片</Text> : null}
      {items.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {items.map((x) => (
            <View key={x.id} style={{ width: containerWidth, alignItems: 'center' }}>
              {failed[x.id] ? (
                <View style={[s.placeholder, { width: imageWidth }]}>
                  <Text>圖片載入失敗</Text>
                  <TouchableOpacity onPress={() => setFailed((v) => ({ ...v, [x.id]: 0 }))}>
                    <Text style={s.retry}>重新載入</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Image
                  resizeMode="contain"
                  source={{
                    uri: attachmentUri(x, userId, failed[x.id] || 0),
                    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
                  }}
                  style={[s.image, { width: imageWidth }]}
                  onError={() => setFailed((v) => ({ ...v, [x.id]: (v[x.id] || 0) + 1 }))}
                />
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={s.emptyState}>
          <Text style={s.empty}>目前沒有照片</Text>
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { width: '100%', minWidth: 0 },
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
  emptyState: {
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  empty: { color: Colors.subtext },
});
