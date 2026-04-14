import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '@/config/theme';
import type { WorkoutEffort, WorkoutReflection } from '@/types/workout';

const OPTIONS = [
  { label: 'Easy', value: 'easy' },
  { label: 'Solid', value: 'solid' },
  { label: 'Challenging', value: 'challenging' },
  { label: 'Max Effort', value: 'max_effort' },
];

export function ReflectionSheet({
  visible,
  onSubmit,
  onSkip,
}: {
  visible: boolean;
  onSubmit: (result: WorkoutReflection) => void;
  onSkip: () => void;
}) {
  const [effort, setEffort] = useState<WorkoutEffort | null>(null);

  useEffect(() => {
    if (!visible) {
      setEffort(null);
    }
  }, [visible]);

  const handleSubmit = () => {
    if (effort) onSubmit({ effort });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onSkip}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onSkip} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>Session Reflection</Text>
          <Text style={styles.title}>How did that session feel?</Text>
          <Text style={styles.helper}>Your feedback helps improve future plans and trainer guidance.</Text>

          <View style={styles.optionsGrid}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionBtn, effort === opt.value && styles.optionBtnActive]}
                onPress={() => setEffort(opt.value as WorkoutEffort)}
                activeOpacity={0.85}
              >
                <View style={[styles.optionDot, effort === opt.value && styles.optionDotActive]} />
                <Text style={[styles.optionLabel, effort === opt.value && styles.optionLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
              <Text style={styles.skipLabel}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, !effort && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={!effort}
            >
              <Text style={styles.submitLabel}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  helper: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  optionBtn: {
    width: '48%',
    minHeight: 74,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'space-between',
  },
  optionBtnActive: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}14`,
  },
  optionDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
  },
  optionDotActive: {
    backgroundColor: colors.accent,
  },
  optionLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  optionLabelActive: {
    color: colors.accent,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  skipBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  skipLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    minWidth: 108,
    alignItems: 'center',
  },
  submitLabel: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
