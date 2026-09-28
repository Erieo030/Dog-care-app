import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Adds a fixed gap after the floating tab capsule for scrollable tab screens. */
export function useTabContentBottomPadding(extra = 24, includeBottomInset = false) {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  // SafeAreaView screens already exclude the bottom inset. Full-height stack
  // screens need that inset added so the gap remains the same in screen space.
  return (
    Math.max(0, tabBarHeight - insets.bottom) + extra + (includeBottomInset ? insets.bottom : 0)
  );
}
