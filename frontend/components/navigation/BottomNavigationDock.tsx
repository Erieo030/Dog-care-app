import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export function BottomNavigationDock() {
  const insets = useSafeAreaInsets();
  return <View pointerEvents="none" accessible={false} style={[styles.dock, { bottom: Math.max(insets.bottom - 4, 8) }]} />;
}

const styles = StyleSheet.create({
  dock: {
    ...StyleSheet.absoluteFill,
    left: 20,
    right: 20,
    top: 2,
    bottom: 2,
    borderRadius: 28,
    backgroundColor: 'rgba(247, 244, 238, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(183, 101, 59, 0.10)',
    shadowColor: '#2F2925',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
