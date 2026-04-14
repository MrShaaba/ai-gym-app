import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { usePreferencesStore } from '@/store/preferencesStore';
import { colors, fontSize } from '@/config/theme';

/**
 * Compact inline weight-unit selector.
 * Renders as "kg ▾" or "lb ▾" — tap to toggle the global preference.
 * Designed to be visually quiet while still interactive.
 */
export function WeightUnitToggle() {
  const weightUnit = usePreferencesStore((s) => s.weightUnit);
  const toggle = usePreferencesStore((s) => s.toggleWeightUnit);

  return (
    <TouchableOpacity onPress={toggle} hitSlop={8} activeOpacity={0.6} style={styles.container}>
      <Text style={styles.label}>{weightUnit} ▾</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
