/** 用途：首頁「今天想做什麼」與「健康管理」共用操作按鈕。 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SoftButton } from '../../../components/SoftMotion';
import type { HomeStackParamList } from '../../../navigation/types';
import type { HomeIcon } from '../homeContent';
import { getHomeActionCategory } from '../homeContent';
import {
  RECORD_CATEGORY_COLORS,
  RECORD_CATEGORY_SURFACES,
} from '../../../constants/RecordCategoryColors';
import { Colors } from '../../../constants/Colors';

type Props = {
  icon: HomeIcon;
  label: string;
  route: keyof HomeStackParamList;
  onOpen: (route: keyof HomeStackParamList) => void;
  variant: 'daily' | 'care';
  compact: boolean;
};

export const HomeAction = React.memo(function HomeAction({
  icon,
  label,
  route,
  onOpen,
  variant,
  compact,
}: Props) {
  const category = getHomeActionCategory(route);
  return (
    <SoftButton
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.shortcut,
        variant === 'daily' ? styles.dailyAction : styles.careAction,
        compact && (variant === 'daily' ? styles.dailyActionCompact : styles.careActionCompact),
      ]}
      onPress={() => onOpen(route)}
    >
      <View
        style={[
          styles.primaryIcon,
          compact ? styles.primaryIconCompact : styles.primaryIconRegular,
          variant === 'care' && styles.careIcon,
          {
            backgroundColor:
              variant === 'care' ? RECORD_CATEGORY_SURFACES[category] : Colors.surface,
            borderColor: RECORD_CATEGORY_COLORS[category],
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={23}
          color={RECORD_CATEGORY_COLORS[category]}
        />
      </View>
      <Text style={styles.shortcutLabel} numberOfLines={1}>
        {label}
      </Text>
    </SoftButton>
  );
});

const styles = StyleSheet.create({
  shortcut: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  dailyAction: { minHeight: 80, gap: 6, paddingVertical: 5 },
  careAction: { minHeight: 76, gap: 6, paddingVertical: 5 },
  dailyActionCompact: { minHeight: 72, gap: 5, paddingVertical: 3 },
  careActionCompact: { minHeight: 68, gap: 4, paddingVertical: 3 },
  primaryIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.25,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  primaryIconRegular: { width: 54, height: 54, borderRadius: 27 },
  primaryIconCompact: { width: 48, height: 48, borderRadius: 24 },
  careIcon: { borderRadius: 17, borderWidth: 1.5 },
  shortcutLabel: {
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    backgroundColor: 'rgba(255, 249, 242, 0.94)',
    color: Colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
