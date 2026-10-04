import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordActionButton } from '../../../components/RecordActionButton';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Colors } from '../../../constants/Colors';
import type { AISessionRecord } from '../../../services/aiSessionService';

const DELETE_WIDTH = 100;
const DELETE_SURFACE = '#FBE9E5';

type SwipeableMethods = {
  close: () => void;
  openLeft: () => void;
  openRight: () => void;
  reset: () => void;
};

type Props = {
  item: AISessionRecord;
  openedSessionId: string | null;
  onOpenedChange: (id: string | null) => void;
  onOpen: () => void;
  onDelete: () => void;
};

export const AIConversationSessionRow = React.memo(function AIConversationSessionRow({
  item,
  openedSessionId,
  onOpenedChange,
  onOpen,
  onDelete,
}: Props) {
  const swipeableRef = useRef<SwipeableMethods | null>(null);
  useEffect(() => {
    if (openedSessionId && openedSessionId !== item.id) swipeableRef.current?.close();
  }, [item.id, openedSessionId]);
  const handleOpen = useCallback(() => onOpenedChange(item.id), [item.id, onOpenedChange]);
  const handleClose = useCallback(() => {
    if (openedSessionId === item.id) onOpenedChange(null);
  }, [item.id, onOpenedChange, openedSessionId]);
  const renderDeleteAction = useCallback(
    () => (
      <View style={styles.deleteActionWrap}>
        <RecordActionButton
          kind="delete"
          label="刪除"
          accessibilityLabel={`刪除對話：${item.title}`}
          style={styles.deleteAction}
          onPress={onDelete}
        />
      </View>
    ),
    [item.title, onDelete],
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      containerStyle={styles.sessionWrap}
      childrenContainerStyle={styles.sessionForeground}
      friction={1.5}
      rightThreshold={DELETE_WIDTH * 0.36}
      overshootRight={false}
      renderRightActions={renderDeleteAction}
      onSwipeableWillOpen={handleOpen}
      onSwipeableClose={handleClose}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`開啟對話：${item.title}`}
        style={styles.session}
        onPress={onOpen}
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
    </ReanimatedSwipeable>
  );
});

const styles = StyleSheet.create({
  sessionWrap: {
    height: 68,
    overflow: 'hidden',
    borderRadius: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: DELETE_SURFACE,
  },
  sessionForeground: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  deleteActionWrap: {
    width: DELETE_WIDTH,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DELETE_SURFACE,
  },
  deleteAction: {
    width: DELETE_WIDTH,
    height: 68,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: DELETE_SURFACE,
  },
  session: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.surface,
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
