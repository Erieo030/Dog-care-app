import React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../../components/AppButton';
import { Colors } from '../../../constants/Colors';
import { SoftEntrance } from '../../../components/SoftMotion';

type Props = {
  text: string;
  artwork?: ImageSourcePropType;
  onAction?: () => void;
};

export default function ReminderListState({ text, artwork, onAction }: Props) {
  return (
    <View style={styles.center}>
      {artwork ? (
        <SoftEntrance>
          <Image
            accessible={false}
            resizeMode="contain"
            source={artwork}
            style={styles.emptyArtwork}
          />
        </SoftEntrance>
      ) : null}
      <Text style={styles.empty}>{text}</Text>
      {onAction ? (
        <AppButton title="重試" variant="primary" style={styles.primary} onPress={onAction} />
      ) : null}
    </View>
  );
}

export function ReminderListLoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.primary} />
      <Text style={styles.empty}>載入提醒中…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  empty: { color: Colors.subtext, textAlign: 'center', marginTop: 10 },
  emptyArtwork: { width: 76, height: 70, marginBottom: 2 },
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryText: { color: '#FFF', fontWeight: '800' },
});
