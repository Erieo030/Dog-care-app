import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Adds a fixed gap after the floating tab capsule for scrollable tab screens. */
export function useTabContentBottomPadding(extra = 24, includeBottomInset = true) {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  // App screens now extend through the bottom safe area, so preserve the same
  // scroll clearance above the floating capsule by including that inset here.
  return (
    Math.max(0, tabBarHeight - insets.bottom) + extra + (includeBottomInset ? insets.bottom : 0)
  );
}
