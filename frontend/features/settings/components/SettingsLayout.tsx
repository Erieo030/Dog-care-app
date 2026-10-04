import { SafeAreaView } from 'react-native-safe-area-context';
/**
 * 用途：設定子頁共用底色、可捲動容器與設定列。
 * 使用頁：SettingsScreens.tsx；之後新增設定頁也應使用此元件。
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

export function SettingsDocumentHero({
  title,
  subtitle,
  icon = 'document-text-outline',
}: {
  title: string;
  subtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={documentStyles.hero}>
      <View style={documentStyles.heroIcon}>
        <Ionicons name={icon} size={23} color={settingsPalette.primary} />
      </View>
      <Text style={documentStyles.title}>{title}</Text>
      <Text style={documentStyles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export function SettingsDocumentSection({
  title,
  index,
  icon = 'information-circle-outline',
  children,
}: {
  title: string;
  index: number;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={documentStyles.section}>
      <View style={documentStyles.sectionHeader}>
        <View style={documentStyles.sectionIcon}>
          <Ionicons name={icon} size={18} color={settingsPalette.primary} />
        </View>
        <View style={documentStyles.copy}>
          <Text style={documentStyles.number}>說明 {index}</Text>
          <Text style={documentStyles.sectionTitle}>{title}</Text>
        </View>
      </View>
      <View style={documentStyles.rows}>{children}</View>
    </View>
  );
}

export function SettingsDocumentParagraph({
  label,
  children,
  emphasis = false,
}: {
  label?: string;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <View style={[documentStyles.infoRow, emphasis && documentStyles.emphasisRow]}>
      <View style={[documentStyles.infoMarker, emphasis && documentStyles.emphasisMarker]} />
      <View style={documentStyles.infoCopy}>
        {label ? (
          <Text style={[documentStyles.infoLabel, emphasis && documentStyles.emphasisLabel]}>
            {label}
          </Text>
        ) : null}
        <Text style={[documentStyles.body, emphasis && documentStyles.emphasisBody]}>
          {children}
        </Text>
      </View>
    </View>
  );
}

const documentStyles = StyleSheet.create({
  hero: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: settingsPalette.surface,
    borderWidth: 1,
    borderColor: settingsPalette.border,
    marginBottom: 14,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3E1D5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { color: settingsPalette.text, fontSize: 21, fontWeight: '800' },
  subtitle: { color: settingsPalette.sub, fontSize: 14, lineHeight: 21, marginTop: 6 },
  section: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: settingsPalette.surface,
    borderWidth: 1,
    borderColor: settingsPalette.border,
    marginBottom: 10,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E1D5',
    marginRight: 12,
  },
  number: { color: settingsPalette.primary, fontSize: 11, fontWeight: '800', marginBottom: 2 },
  copy: { flex: 1 },
  sectionTitle: { color: settingsPalette.text, fontSize: 16, fontWeight: '800' },
  rows: { gap: 11 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoMarker: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: settingsPalette.primary,
    marginTop: 7,
  },
  infoCopy: { flex: 1 },
  infoLabel: { color: settingsPalette.text, fontSize: 13, fontWeight: '800', marginBottom: 2 },
  body: { color: settingsPalette.sub, fontSize: 14, lineHeight: 22 },
  emphasisRow: { padding: 11, borderRadius: 13, backgroundColor: '#FFF4E8' },
  emphasisMarker: { backgroundColor: settingsPalette.primary },
  emphasisLabel: { color: settingsPalette.primary },
  emphasisBody: { color: settingsPalette.text },
});

export function SettingsPage({ children }: { children: React.ReactNode }) {
  const bottomContentPadding = useTabContentBottomPadding();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
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
