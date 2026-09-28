import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '../../../constants/Colors';

export function HealthEventOptionGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<[T, string]>;
  value?: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map(([key, label]) => (
        <HealthEventToggle
          key={key}
          text={label}
          active={value === key}
          onPress={() => onChange(key)}
        />
      ))}
    </View>
  );
}

export function HealthEventOptionsWrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

export function HealthEventToggle({
  text,
  active,
  onPress,
}: {
  text: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: {
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 17,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
});
