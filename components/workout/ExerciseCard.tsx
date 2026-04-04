import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { SetRow } from '@/components/workout/SetRow';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { ExerciseLog, SetLog } from '@/types/workout';

interface ExerciseCardProps {
  exerciseLog: ExerciseLog;
  exerciseIndex: number;
  isActive: boolean;
  onPress: () => void;
  onUpdateSet: (setIndex: number, data: Partial<SetLog>) => void;
  onToggleSet: (setIndex: number) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onRestTimer: () => void;
}

export function ExerciseCard({
  exerciseLog,
  exerciseIndex,
  isActive,
  onPress,
  onUpdateSet,
  onToggleSet,
  onAddSet,
  onRemoveSet,
  onRestTimer,
}: ExerciseCardProps) {
  const completedSets = exerciseLog.sets.filter((s) => s.completed).length;
  const totalSets = exerciseLog.sets.length;
  const allDone = completedSets === totalSets;

  return (
    <Card style={[styles.card, isActive && styles.cardActive]}>
      <TouchableOpacity onPress={onPress} style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={allDone ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={allDone ? colors.accent : colors.textMuted}
          />
          <View style={styles.headerText}>
            <Text style={[styles.name, allDone && styles.nameDone]}>
              {exerciseLog.exerciseName}
            </Text>
            <Text style={styles.setCount}>
              {completedSets}/{totalSets} sets
            </Text>
          </View>
        </View>
        <Ionicons
          name={isActive ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {isActive && (
        <View style={styles.body}>
          <View style={styles.colHeaders}>
            <Text style={[styles.colLabel, { width: 20 }]}>SET</Text>
            <Text style={[styles.colLabel, { flex: 1 }]}>WEIGHT</Text>
            <Text style={[styles.colLabel, { flex: 1 }]}>REPS</Text>
            <Text style={[styles.colLabel, { width: 36 }]} />
          </View>

          {exerciseLog.sets.map((s, si) => (
            <SetRow
              key={si}
              index={si}
              data={s}
              onUpdate={(d) => onUpdateSet(si, d)}
              onToggleComplete={() => onToggleSet(si)}
              onRemove={() => onRemoveSet(si)}
              canRemove={totalSets > 1}
            />
          ))}

          <View style={styles.actions}>
            <TouchableOpacity onPress={onAddSet} style={styles.actionBtn}>
              <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
              <Text style={styles.actionText}>Add Set</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onRestTimer} style={styles.actionBtn}>
              <Ionicons name="timer-outline" size={18} color={colors.accent} />
              <Text style={styles.actionText}>Rest Timer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  cardActive: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  nameDone: {
    color: colors.textMuted,
  },
  setCount: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  body: {
    marginTop: spacing.md,
  },
  colHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  colLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
