import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewProps,
} from 'react-native';
import { Colors } from '../constants/Colors';

function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    let changed = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active && !changed) setReduced(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      changed = true;
      setReduced(value);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

export function SoftEntrance({ children, style, ...props }: ViewProps) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const played = useRef(false);
  useEffect(() => {
    if (reduced) {
      opacity.stopAnimation();
      opacity.setValue(1);
      return;
    }
    if (played.current) return;
    played.current = true;
    opacity.setValue(0.5);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity, reduced]);
  return (
    <Animated.View {...props} style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
}

export function SoftField({
  focused,
  invalid,
  style,
  ...props
}: ViewProps & { focused: boolean; invalid: boolean }) {
  const reduced = useReducedMotion();
  const focus = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    focus.stopAnimation();
    if (reduced) {
      focus.setValue(focused ? 1 : 0);
      return;
    }
    const animation = Animated.timing(focus, {
      toValue: focused ? 1 : 0,
      duration: 140,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [focus, focused, reduced]);
  const borderColor = invalid
    ? Colors.danger
    : focus.interpolate({ inputRange: [0, 1], outputRange: ['#E8DDD4', Colors.primary] });
  return <Animated.View {...props} style={[style, { borderColor }]} />;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
export function SoftButton({ onPressIn, onPressOut, style, ...props }: TouchableOpacityProps) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced || props.disabled) {
      scale.stopAnimation();
      scale.setValue(1);
    }
    return () => scale.stopAnimation();
  }, [reduced, scale, props.disabled]);
  const animate = (value: number) => {
    if (!reduced && !props.disabled)
      Animated.spring(scale, {
        toValue: value,
        speed: 35,
        bounciness: 0,
        useNativeDriver: true,
      }).start();
  };
  return (
    <AnimatedTouchable
      {...props}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(event) => {
        animate(0.97);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(1);
        onPressOut?.(event);
      }}
    />
  );
}
