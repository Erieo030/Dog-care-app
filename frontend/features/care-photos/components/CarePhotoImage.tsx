import React, { useEffect, useRef, useState } from 'react';
import { Image, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, getValidAccessToken } from '../../../services/api';
import { Colors } from '../../../constants/Colors';
import type { CarePhoto } from '../carePhotoContent';
import { styles } from '../carePhotoStyles';

export default function CarePhotoImage({
  photo,
  userId,
  token,
  thumbnail = false,
  hidden = false,
  style,
}: {
  photo: CarePhoto;
  userId: string;
  token: string | null;
  thumbnail?: boolean;
  hidden?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [freshToken, setFreshToken] = useState(token);
  const generation = useRef(0);
  useEffect(() => {
    generation.current += 1;
    setFailed(false);
    setRetry(0);
    setFreshToken(token);
    return () => {
      generation.current += 1;
    };
  }, [photo.id, userId, token]);
  const source = `${API_BASE_URL}/api/attachments/${encodeURIComponent(photo.id)}/${thumbnail ? 'thumbnail' : 'content'}?userId=${encodeURIComponent(userId)}&retry=${retry}`;
  const retryImage = async () => {
    const requestGeneration = generation.current;
    try {
      const nextToken = await getValidAccessToken();
      if (generation.current !== requestGeneration) return;
      setFreshToken(nextToken);
      setRetry((value) => value + 1);
      setFailed(false);
    } catch {
      if (generation.current === requestGeneration) setFailed(true);
    }
  };
  return (
    <View style={[styles.image, style]}>
      {hidden ? (
        <View style={styles.placeholder}>
          <Ionicons name="eye-off-outline" size={24} color={Colors.subtext} />
          <Text style={styles.placeholderText}>照護照片已隱藏{'\n'}點選查看</Text>
        </View>
      ) : failed || !freshToken ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="重新載入照片"
          style={styles.placeholder}
          onPress={() => void retryImage()}
        >
          <Ionicons name="image-outline" size={24} color={Colors.subtext} />
          <Text style={styles.placeholderText}>照片暫時無法顯示{'\n'}點選重試</Text>
        </TouchableOpacity>
      ) : (
        <Image
          style={{ width: '100%', height: '100%' }}
          resizeMode={thumbnail ? 'cover' : 'contain'}
          source={{ uri: source, headers: { Authorization: `Bearer ${freshToken}` } }}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}
