import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferencesStore } from '@/store/preferencesStore';
import { Card } from '@/components/ui/Card';
import { SetRow } from '@/components/workout/SetRow';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { ExerciseLog, SetLog, WorkoutExerciseGroupType } from '@/types/workout';

interface GroupExerciseItem {
  flatIndex: number;
  exerciseLog: ExerciseLog;
}

interface ExerciseGroupCardProps {
  groupType: Exclude<WorkoutExerciseGroupType, 'single'>;
  exercises: GroupExerciseItem[];
  isActive: boolean;
  onPress: () => void;
  onUpdateSet: (flatExerciseIndex: number, setIndex: number, data: Partial<SetLog>) => void;
  onToggleSet: (flatExerciseIndex: number, setIndex: number) => void;
  onAddRound: () => void;
  onRestTimer?: () => void;
}

function getGroupTitle(groupType: Exclude<WorkoutExerciseGroupType, 'single'>) {
  return {
    superset: 'Superset',
    triset: 'Tri-set',
    giantset: 'Giant set',
  }[groupType];
}

function getRoundCount(exercises: GroupExerciseItem[]) {
  return exercises[0]?.exerciseLog.sets.length ?? 0;
}

function countCompletedRounds(exercises: GroupExerciseItem[]) {
  const roundCount = getRoundCount(exercises);
  let completed = 0;

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    if (exercises.every((item) => item.exerciseLog.sets[roundIndex]?.completed)) {
      completed += 1;
    }
  }

  return completed;
}

function isRoundComplete(exercises: GroupExerciseItem[], roundIndex: number) {
  return exercises.every((item) => item.exerciseLog.sets[roundIndex]?.completed);
}

function isWarmupRound(exercises: GroupExerciseItem[], roundIndex: number) {
  return exercises.every((item) => item.exerciseLog.sets[roundIndex]?.isWarmup);
}

export function ExerciseGroupCard({
  groupType,
  exercises,
  isActive,
  onPress,
  onUpdateSet,
  onToggleSet,
  onAddRound,
  onRestTimer,
}: ExerciseGroupCardProps) {
  const weightUnit = usePreferencesStore((s) => s.weightUnit);
  const roundCount = getRoundCount(exercises);
  const warmupRoundCount = Array.from({ length: roundCount }, (_, roundIndex) => roundIndex)
    .filter((roundIndex) => isWarmupRound(exercises, roundIndex)).length;
  const completedRounds = countCompletedRounds(exercises) - Array.from({ length: roundCount }, (_, roundIndex) => roundIndex)
    .filter((roundIndex) => isWarmupRound(exercises, roundIndex) && isRoundComplete(exercises, roundIndex)).length;
  const workingRoundCount = roundCount - warmupRoundCount;
  const groupComplete = workingRoundCount > 0 && completedRounds === workingRoundCount;
  const firstIncompleteRoundIndex = Array.from({ length: roundCount }, (_, roundIndex) => roundIndex)
    .find((roundIndex) => !isWarmupRound(exercises, roundIndex) && !isRoundComplete(exercises, roundIndex));

  return (
    <Card style={[styles.card, isActive && styles.cardActive]}>
      <TouchableOpacity onPress={onPress} style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={groupComplete ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={groupComplete ? colors.accent : colors.textMuted}
          />
          <View style={styles.headerText}>
            <Text style={[styles.title, groupComplete && styles.titleDone]}>{getGroupTitle(groupType)}</Text>
            <Text style={styles.subtitle}>
              {exercises.map((item) => item.exerciseLog.exerciseName).join(' + ')}
            </Text>
            <Text style={styles.roundText}>
              {completedRounds}/{workingRoundCount} working rounds complete{warmupRoundCount ? ` · ${warmupRoundCount} warm-up` : ''}
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
          {Array.from({ length: roundCount }, (_, roundIndex) => {
            const roundComplete = isRoundComplete(exercises, roundIndex);
              const warmupRound = isWarmupRound(exercises, roundIndex);
              const isCurrentRound = firstIncompleteRoundIndex === undefined
                ? !warmupRound && roundIndex === roundCount - 1
              : roundIndex === firstIncompleteRoundIndex;

            return (
              <View
                key={`round-${roundIndex}`}
                style={[styles.roundSection, isCurrentRound && styles.roundSectionCurrent]}
              >
                <View style={styles.roundHeader}>
                  <Text style={styles.roundLabel}>{warmupRound ? 'Warm-up' : `Round ${roundIndex + 1 - warmupRoundCount}`}</Text>
                  <View style={[styles.roundStatusBadge, roundComplete && styles.roundStatusBadgeComplete]}>
                    <Text style={[styles.roundStatusText, roundComplete && styles.roundStatusTextComplete]}>
                      {roundComplete ? 'Complete' : 'In Progress'}
                    </Text>
                  </View>
                </View>

                {exercises.map((item) => {
                  const setLog = item.exerciseLog.sets[roundIndex];
                  if (!setLog) return null;

                  return (
                    <View key={`${item.exerciseLog.exerciseId}-${roundIndex}`} style={styles.exerciseSection}>
                      <Text style={styles.exerciseName}>{item.exerciseLog.exerciseName}</Text>
                      <SetRow
                        index={roundIndex}
                        data={setLog}
                        onUpdate={(data) => onUpdateSet(item.flatIndex, roundIndex, data)}
                        onToggleComplete={() => onToggleSet(item.flatIndex, roundIndex)}
                        onRemove={() => {}}
                        canRemove={false}
                      />
                    </View>
                  );
                })}
              </View>
            );
          })}

          <View style={styles.actions}>
            <TouchableOpacity onPress={onAddRound} style={styles.actionBtn}>
              <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
              <Text style={styles.actionText}>Add Round</Text>
            </TouchableOpacity>
            {onRestTimer ? (
              <TouchableOpacity onPress={onRestTimer} style={styles.actionBtn}>
                <Ionicons name="timer-outline" size={18} color={colors.accent} />
                <Text style={styles.actionText}>Rest Timer</Text>
              </TouchableOpacity>
            ) : null}
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
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  titleDone: {
    color: colors.textMuted,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  roundText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  body: {
    marginTop: spacing.md,
  },
  roundSection: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roundSectionCurrent: {
    borderColor: `${colors.accent}66`,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  roundLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  roundStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.textMuted}22`,
  },
  roundStatusBadgeComplete: {
    backgroundColor: `${colors.accent}18`,
  },
  roundStatusText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roundStatusTextComplete: {
    color: colors.accent,
  },
  exerciseSection: {
    marginBottom: spacing.sm,
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
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