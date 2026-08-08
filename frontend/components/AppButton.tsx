/** 用途：提供全應用程式共用按鈕元件與按壓效果。 */
import React from 'react';
import { Text, StyleSheet, Pressable, ViewStyle, StyleProp, Platform } from 'react-native';
import { Colors } from '../constants/Colors';

// 1. 定義 Props 的型別
interface AppButtonProps {
  title: string; // 標題:字串
  onPress: () => void; // onPress 不回傳數值的函式
  style?: StyleProp<ViewStyle>; // style 是選填的 (?)，型別為 React Native 的 View 樣式
}

// 2. 將型別套用到組件上
export const AppButton = ({ title, onPress, style }: AppButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      // 加入按壓縮放效果
      style={({ pressed }) => [
        styles.button,
        {
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        style,
      ]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    // 增加陰影讓按鈕更有立體感
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
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
