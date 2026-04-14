import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

export function TrainerContextBlock({ planSource }: { planSource: string }) {
  let label = '';
  if (planSource === 'trainer') label = 'Completed under Coach Plan';
  else if (planSource === 'ai_endorsed') label = 'Trainer Endorsed session complete';
  else return null;
  return (
    <View style={styles.block}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  text: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
