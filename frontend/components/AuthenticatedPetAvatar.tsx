import React, { ReactNode, useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { API_BASE_URL, getValidAccessToken } from '../services/api';

type Props = {
  attachmentId: string;
  userId: string;
  style: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  fallback: ReactNode;
};

export default function AuthenticatedPetAvatar({
  attachmentId,
  userId,
  style,
  imageStyle,
  fallback,
}: Props) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setAccessToken(null);
    setFailed(false);
    void getValidAccessToken()
      .then((token) => {
        if (active) setAccessToken(token);
      })
      .catch(() => {
        if (active) setAccessToken(null);
      });
    return () => {
      active = false;
    };
  }, [attachmentId, userId]);

  const uri = `${API_BASE_URL}/api/attachments/${encodeURIComponent(attachmentId)}/content?userId=${encodeURIComponent(userId)}`;

  return (
    <View style={[style, styles.clip]}>
      {accessToken && !failed ? (
        <Image
          source={{ uri, headers: { Authorization: `Bearer ${accessToken}` } }}
          style={[StyleSheet.absoluteFill, imageStyle]}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        fallback
      )}
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });
