import React, { useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, View, useWindowDimensions } from 'react-native';
import { HOME_THEMES } from '../../constants/HomeThemes';
import { DEFAULT_HOME_THEME, HomeThemeId } from '../../constants/HomeThemeIds';

/** Static theme artwork. All layers are decorative and never receive touch input. */
export function HomeBackgroundScene({ themeId = DEFAULT_HOME_THEME }: { themeId?: HomeThemeId }) {
  const window = useWindowDimensions();
  const [sceneSize, setSceneSize] = useState({ width: window.width, height: window.height });
  const theme = HOME_THEMES[themeId];
  // 先依素材比例計算高度；容器較高時只延展背景高度，避免底部露出純色底。
  const imageHeight = Math.max(
    (sceneSize.width * theme.canvasHeight) / theme.canvasWidth,
    sceneSize.height,
  );
  const measureScene = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    setSceneSize((current) => {
      if (current.width === layout.width && current.height === layout.height) return current;
      return { width: layout.width, height: layout.height };
    });
  };

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no"
      style={styles.scene}
      onLayout={measureScene}
    >
      <Image
        source={theme.background}
        style={[styles.background, { width: sceneSize.width, height: imageHeight }]}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: '#F1E5CF',
  },
  background: { position: 'absolute', top: 0, left: 0 },
});
