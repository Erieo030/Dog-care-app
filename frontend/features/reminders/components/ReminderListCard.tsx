import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../../components/AppButton';
import { Colors } from '../../../constants/Colors';
import { Reminder } from '../../../types';
import { REMINDER_STATUS_LABELS } from '../reminderListContent';

type Props = {
  item: Reminder;
  focused: boolean;
  busyId: string | null;
  onEdit: () => void;
  onComplete: () => void;
  onSnooze: () => void;
  onSkip: () => void;
  onRemove: () => void;
};

export default function ReminderListCard({
  item,
  focused,
  busyId,
  onEdit,
  onComplete,
  onSnooze,
  onSkip,
  onRemove,
}: Props) {
  const active = item.status === 'pending' || item.status === 'snoozed';
  const busy = busyId !== null;
  return (
    <View style={[styles.card, focused && styles.focusCard]}>
      <Text numberOfLines={2} style={styles.title}>
        {item.title}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          {new Date(item.scheduledAt).toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <Text style={[styles.statusBadge, styles[`status_${item.status}` as keyof typeof styles]]}>
          {REMINDER_STATUS_LABELS[item.status]}
        </Text>
      </View>
      {!!item.notes && (
        <Text numberOfLines={2} style={styles.notes}>
          {item.notes}
        </Text>
      )}
      <View style={styles.row}>
        {active ? (
          <>
            {item.sourceType !== 'medical_visit' ? (
              <Action label="編輯" disabled={busy} onPress={onEdit} />
            ) : null}
            <Action label="完成" disabled={busy} onPress={onComplete} />
            <Action label="延後" disabled={busy} onPress={onSnooze} />
            <Action label="略過" disabled={busy} onPress={onSkip} />
          </>
        ) : null}
        <Action
          label={busyId === item.id ? '處理中…' : '刪除'}
          disabled={busy}
          danger
          onPress={onRemove}
        />
      </View>
    </View>
  );
}

function Action({
  label,
  onPress,
  danger = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <AppButton
      title={label}
      variant={danger ? 'danger' : 'secondary'}
      fullWidth={false}
      disabled={disabled}
      busy={disabled}
      style={[danger ? styles.dangerAction : styles.action, disabled && styles.disabled]}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  focusCard: { borderColor: Colors.primary, borderWidth: 2 },
  title: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  meta: { color: Colors.subtext },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  status_pending: { color: Colors.primary, backgroundColor: Colors.primarySoft },
  status_snoozed: { color: '#8A6A32', backgroundColor: '#F7EBCF' },
  status_completed: { color: Colors.success, backgroundColor: Colors.successSoft },
  status_skipped: { color: Colors.subtext, backgroundColor: '#EEEAE4' },
  notes: { color: Colors.text, marginTop: 9 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
  },
  dangerAction: {
    minHeight: 44,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionText: { color: Colors.text, fontWeight: '700' },
  danger: { color: '#B34A42' },
  disabled: { opacity: 0.5 },
});
