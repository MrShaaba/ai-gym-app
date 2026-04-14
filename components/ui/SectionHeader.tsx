import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '@/config/theme';

interface SectionHeaderProps {
  title: string;
  /** Optional right-aligned accessory text */
  trailing?: string;
}

export function SectionHeader({ title, trailing }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  trailing: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
});
