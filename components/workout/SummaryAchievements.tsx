import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

export function SummaryAchievements({ achievements }: { achievements: { label: string; value: string }[] }) {
  if (!achievements.length) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Achievements</Text>
      <View style={styles.list}>
        {achievements.map((a) => (
          <View key={a.label} style={styles.item}>
            <Text style={styles.achLabel}>{a.label}</Text>
            <Text style={styles.achValue}>{a.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  list: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  achLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: 2,
  },
  achValue: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
