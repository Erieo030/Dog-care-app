/** 用途：提供全應用程式共用按鈕元件與按壓效果。 */
import React, { ReactNode } from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { Colors } from '../constants/Colors';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'tertiary';

interface AppButtonProps {
  title?: string;
  children?: ReactNode;
  onPress: () => void;
  variant?: AppButtonVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  busy?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

export const AppButton = ({
  title,
  children,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
  busy = false,
  fullWidth = true,
  accessibilityLabel,
}: AppButtonProps) => {
  const unavailable = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={unavailable}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: unavailable, busy }}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && !unavailable && styles.pressed,
        unavailable && styles.disabled,
        style,
      ]}
    >
      {children ?? <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>{title}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  fullWidth: { width: '100%', minHeight: 52, borderRadius: 16, paddingVertical: 12 },
  primary: {
    backgroundColor: Colors.primary,
    minHeight: 52,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  secondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.success },
  danger: { backgroundColor: 'transparent' },
  tertiary: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
  text: {
    flexShrink: 1,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 16,
    fontWeight: '700',
  },
  primaryText: { color: '#FFFFFF' },
  secondaryText: { color: Colors.success },
  dangerText: { color: Colors.danger },
  tertiaryText: { color: Colors.subtext },
});
