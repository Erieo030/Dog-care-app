import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { TIMELINE_META } from '../../../constants/Timeline';
import { TimelineItem } from '../../../types';
import { getTimelineCategory, TIMELINE_CATEGORIES } from '../timelineContent';

type Props = { item: TimelineItem; onPress: () => void };

const TimelineCard = React.memo(function TimelineCard({ item, onPress }: Props) {
  const meta = TIMELINE_META[item.type] ?? TIMELINE_META.life_event;
  const category = getTimelineCategory(item.type);
  const categoryColor =
    TIMELINE_CATEGORIES.find((entry) => entry.key === category)?.color ?? Colors.primary;
  const occurredAt = new Date(item.occurredAt);
  const timeLabel =
    occurredAt.getHours() === 0 && occurredAt.getMinutes() === 0
      ? '當日紀錄'
      : occurredAt.toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`查看紀錄：${meta.label}`}
      style={styles.card}
      onPress={onPress}
    >
      <View style={[styles.icon, { backgroundColor: `${categoryColor}18` }]}>
        <Ionicons
          name={meta.icon as keyof typeof Ionicons.glyphMap}
          size={19}
          color={categoryColor}
        />
      </View>
      <View style={styles.flex}>
        <View style={styles.cardMeta}>
          <Text style={[styles.kind, { color: categoryColor }]}>{meta.label}</Text>
          <Text numberOfLines={1} style={styles.date}>
            {timeLabel}
          </Text>
        </View>
        <Text style={styles.itemTitle}>{item.title}</Text>
        {!!item.description && <Text style={styles.description}>{item.description}</Text>}
        {item.attachmentCount > 0 && (
          <Text style={styles.description}>照片 {item.attachmentCount} 張</Text>
        )}
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
});

export default TimelineCard;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  kind: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  date: { color: Colors.subtext, fontSize: 11, flexShrink: 1, textAlign: 'right' },
  itemTitle: { color: Colors.text, fontWeight: '800', marginTop: 5, lineHeight: 20 },
  description: { color: Colors.subtext, marginTop: 4, lineHeight: 19 },
  arrow: { color: Colors.subtext, fontSize: 24, marginLeft: 5 },
});
