import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

interface BadgeProps {
  label: string;
  color?: string;
  size?: 'sm' | 'md';
}

export function Badge({ label, color = colors.accent, size = 'sm' }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }, size === 'md' && styles.badgeMd]}>
      <Text style={[styles.text, { color }, size === 'md' && styles.textMd]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textMd: {
    fontSize: fontSize.xs,
  },
});
