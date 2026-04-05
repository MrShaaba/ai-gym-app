import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { DayOfWeek } from '@/types/assignment';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DayPickerProps {
  selected: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
}

export function DayPicker({ selected, onChange }: DayPickerProps) {
  const toggle = (day: DayOfWeek) => {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day]);
    }
  };

  return (
    <View style={styles.row}>
      {DAYS.map((day) => {
        const active = selected.includes(day);
        return (
          <TouchableOpacity
            key={day}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => toggle(day)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{day}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.accent,
  },
});
