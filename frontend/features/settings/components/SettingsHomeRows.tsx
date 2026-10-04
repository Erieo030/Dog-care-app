import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import AuthenticatedPetAvatar from '../../../components/AuthenticatedPetAvatar';

export function SettingsHomeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={styles.section}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

type RowProps = {
  title: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  imageAttachmentId?: string;
  imageUserId?: string;
};

export function SettingsHomeRow({
  title,
  value,
  onPress,
  danger = false,
  icon = 'ellipse-outline',
  imageAttachmentId,
  imageUserId,
}: RowProps) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={value ? `${title} ${value}` : title}
        style={styles.row}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      >
        <View style={styles.rowIcon}>
          {imageAttachmentId && imageUserId ? (
            <AuthenticatedPetAvatar
              attachmentId={imageAttachmentId}
              userId={imageUserId}
              style={styles.rowAvatar}
              fallback={<Ionicons name={icon} size={19} color={danger ? Colors.danger : Colors.success} />}
            />
          ) : (
            <Ionicons name={icon} size={19} color={danger ? Colors.danger : Colors.success} />
          )}
        </View>
        <Text style={[styles.title, danger && styles.danger]}>{title}</Text>
        <View style={styles.accessory}>
          {value ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.value, danger && styles.danger]}
            >
              {value}
            </Text>
          ) : null}
          <Text style={[styles.chevron, danger && styles.danger]}>›</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  rowAvatar: { width: 32, height: 32, borderRadius: 10 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  accessory: { maxWidth: '42%', flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  value: { flexShrink: 1, fontSize: 13, color: Colors.subtext, textAlign: 'right' },
  chevron: { marginLeft: 8, fontSize: 22, lineHeight: 22, color: Colors.subtext },
  danger: { color: Colors.danger },
});
