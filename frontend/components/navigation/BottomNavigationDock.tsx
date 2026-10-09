import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useNavigationState } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import {
  DOCK_EDGE,
  DOCK_HORIZONTAL_PADDING,
  TAB_ITEM_MARGIN,
  getDockSlotWidth,
} from './bottomNavigationLayout';

export function BottomNavigationDock() {
  const insets = useSafeAreaInsets();
  const activeIndex = useNavigationState((state) => state.index);
  const tabCount = useNavigationState((state) => state.routes.length);
  const reduceMotion = useReducedMotion();
  const hasMounted = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const slotWidth = getDockSlotWidth(size.width, tabCount);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }] as const,
  }));

  useEffect(() => {
    if (slotWidth <= 0) return;

    if (!hasMounted.current) {
      hasMounted.current = true;
      translateX.value = activeIndex * slotWidth;
      return;
    }

    if (reduceMotion) {
      translateX.value = activeIndex * slotWidth;
      scale.value = 1;
      return;
    }

    translateX.value = withSpring(activeIndex * slotWidth, {
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    });
    scale.value = withSequence(
      withTiming(1.045, { duration: 90 }),
      withSpring(1, { damping: 15, stiffness: 260 }),
    );
  }, [activeIndex, reduceMotion, scale, slotWidth, translateX]);

  const bottomInset = Math.max(insets.bottom - 14, 4);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) =>
          current.width === width && current.height === height ? current : { width, height },
        );
      }}
      style={styles.fill}
    >
      <View style={[styles.dock, { bottom: bottomInset }]} />
      <Animated.View
        accessible={false}
        style={[
          styles.activeBubble,
          {
            width: Math.max(slotWidth - TAB_ITEM_MARGIN * 2, 0),
            height: Math.max(size.height - bottomInset - 11, 0),
          },
          bubbleStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
  dock: {
    position: 'absolute',
    left: DOCK_EDGE,
    right: DOCK_EDGE,
    top: 1,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 249, 241, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    shadowColor: Colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  activeBubble: {
    position: 'absolute',
    left: DOCK_HORIZONTAL_PADDING + TAB_ITEM_MARGIN,
    top: 6,
    borderRadius: 21,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(183, 101, 59, 0.24)',
  },
});
