/**
 * 用途：設定子頁共用底色、可捲動容器與設定列。
 * 使用頁：SettingsScreens.tsx；之後新增設定頁也應使用此元件。
 */
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTabContentBottomPadding } from '../../../components/navigation/useTabContentBottomPadding';

export const settingsPalette = {
  bg: '#F7F4EE',
  surface: '#FFFFFF',
  text: '#2F2925',
  sub: '#746B63',
  border: '#E4DDD4',
  primary: '#B7653B',
  danger: '#C94C4C',
};

export function SettingsPage({ children }: { children: React.ReactNode }) {
  const bottomContentPadding = useTabContentBottomPadding();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingsRowProps = {
  title: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  rowStyle?: StyleProp<ViewStyle>;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function SettingsRow({
  title,
  value,
  onPress,
  danger = false,
  rowStyle,
  icon,
}: SettingsRowProps) {
  return (
    <TouchableOpacity
      disabled={!onPress}
      onPress={onPress}
      style={[styles.row, rowStyle]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${title} ${value}` : title}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={20}
          color={danger ? settingsPalette.danger : settingsPalette.primary}
          style={styles.rowIcon}
        />
      ) : null}
      <Text style={[styles.rowTitle, danger && styles.danger]}>{title}</Text>
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
        {onPress ? <Text style={[styles.chevron, danger && styles.danger]}>›</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: settingsPalette.bg },
  content: { padding: 18, paddingBottom: 42 },
  row: {
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(228,221,212,0.70)',
    backgroundColor: '#FFF4E8',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: { marginRight: 10 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: settingsPalette.text },
  accessory: { maxWidth: '42%', flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  value: { flexShrink: 1, color: settingsPalette.sub, fontSize: 13, textAlign: 'right' },
  chevron: { marginLeft: 8, color: settingsPalette.sub, fontSize: 22, lineHeight: 22 },
  danger: { color: settingsPalette.danger },
});
