import React, { useCallback, useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../../constants/Colors';
import type { AISessionRecord } from '../../../services/aiSessionService';

const DELETE_WIDTH = 72;

type Props = {
  item: AISessionRecord;
  onOpen: () => void;
  onDelete: () => void;
};

export const AIConversationSessionRow = React.memo(function AIConversationSessionRow({
  item,
  onOpen,
  onDelete,
}: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opened = useRef(false);
  const settle = useCallback(
    (open: boolean) => {
      opened.current = open;
      Animated.spring(translateX, {
        toValue: open ? -DELETE_WIDTH : 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    },
    [translateX],
  );
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          const origin = opened.current ? -DELETE_WIDTH : 0;
          translateX.setValue(Math.max(-DELETE_WIDTH, Math.min(0, origin + gesture.dx)));
        },
        onPanResponderRelease: (_, gesture) =>
          settle(gesture.dx < -24 || (opened.current && gesture.dx < 24)),
        onPanResponderTerminate: () => settle(opened.current),
      }),
    [settle, translateX],
  );

  return (
    <View style={styles.sessionWrap}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`刪除對話：${item.title}`}
        style={styles.deleteAction}
        onPress={onDelete}
      >
        <Text style={styles.deleteText}>刪除</Text>
      </TouchableOpacity>
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.sessionForeground, { transform: [{ translateX }] }]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`開啟對話：${item.title}`}
          style={styles.session}
          onPress={() => (opened.current ? settle(false) : onOpen())}
        >
          <View style={styles.sessionIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={19} color={Colors.success} />
          </View>
          <View style={styles.sessionBody}>
            <Text style={styles.sessionTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.sessionMeta}>
              {new Date(item.updatedAt).toLocaleDateString('zh-TW')} · {item.messages.length} 則訊息
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  sessionWrap: { minHeight: 68, overflow: 'hidden', borderRadius: 18, marginBottom: 8 },
  sessionForeground: { backgroundColor: Colors.surface },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: '#FFF', fontWeight: '700' },
  session: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sessionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionBody: { flex: 1 },
  sessionTitle: { color: Colors.text, fontWeight: '700' },
  sessionMeta: { color: Colors.subtext, fontSize: 12, marginTop: 3 },
  chevron: { color: Colors.subtext, fontSize: 24 },
});
