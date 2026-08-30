import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
const CANVAS_WIDTH = 853;
const CANVAS_HEIGHT = 1796;


/** Static full-scene artwork. All layers are decorative and never receive touch input. */
export function HomeBackgroundScene() {
  const { width } = useWindowDimensions();
  // 以螢幕寬度為基準，避免 cover 比例造成左右裁切。
  const scale = width / CANVAS_WIDTH;
  const canvasWidth = CANVAS_WIDTH * scale;
  const canvasHeight = CANVAS_HEIGHT * scale;
  const canvasLeft = (width - canvasWidth) / 2;
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no" style={styles.scene}>
      <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight, left: canvasLeft }]}>
        <Image source={require('../../assets/home-scene/background.webp')} style={[styles.background, { width: canvasWidth, height: canvasHeight }]} resizeMode="stretch" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflow: 'hidden', backgroundColor: '#F1E5CF' },
  canvas: { position: 'absolute', top: 0 },
  background: { position: 'absolute', top: 0, left: 0 },
});

