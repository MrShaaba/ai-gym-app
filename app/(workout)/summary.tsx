import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PlanBadge } from '@/components/ui/PlanBadge';
import { useWorkoutStore } from '@/store/workoutStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import { usePreferencesStore } from '@/store/preferencesStore';
import { formatVolumeWithUnit, formatWeightWithUnit } from '@/services/units';
import type { AssignmentSource } from '@/types/assignment';
import type { CompletedWorkout, ExerciseLog, SetLog, WorkoutEffort, WorkoutPlanSource, WorkoutExerciseGroupType } from '@/types/workout';

type CompletedSetRecord = SetLog & {
  exerciseName: string;
  volume: number;
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${seconds}s`;
}

function getGroupTypeLabel(groupType: WorkoutExerciseGroupType): string {
  const labels: Record<string, string> = { superset: 'Superset', triset: 'Tri-set', giantset: 'Giant set' };
  return labels[groupType] ?? groupType;
}

type BreakdownBlock =
  | { key: string; type: 'single'; exercise: ExerciseLog }
  | { key: string; type: 'group'; groupType: Exclude<WorkoutExerciseGroupType, 'single'>; exercises: ExerciseLog[] };

function buildBreakdownBlocks(exercises: ExerciseLog[]): BreakdownBlock[] {
  const blocks: BreakdownBlock[] = [];
  const seenGroups = new Set<string>();

  exercises.forEach((exercise, index) => {
    if (exercise.groupId && exercise.groupType && exercise.groupType !== 'single') {
      if (seenGroups.has(exercise.groupId)) return;

      const grouped = exercises
        .filter((item) => item.groupId === exercise.groupId)
        .sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0));

      seenGroups.add(exercise.groupId);
      blocks.push({
        key: `group-${exercise.groupId}`,
        type: 'group',
        groupType: exercise.groupType,
        exercises: grouped,
      });
      return;
    }

    blocks.push({ key: `single-${exercise.exerciseId}-${index}`, type: 'single', exercise });
  });

  return blocks;
}

function getBadgeSource(source: WorkoutPlanSource | undefined): AssignmentSource {
  if (source === 'trainer') return 'trainer';
  if (source === 'self' || !source) return 'self';
  return 'ai';
}

function getEffortLabel(effort: WorkoutEffort | undefined) {
  if (!effort) return null;

  return {
    easy: 'Easy',
    solid: 'Solid',
    challenging: 'Challenging',
    max_effort: 'Max Effort',
  }[effort];
}

function getCompletedExerciseCount(workout: CompletedWorkout) {
  return workout.exercises.filter((exercise) => exercise.sets.length > 0 && exercise.sets.every((set) => set.completed)).length;
}

function getCompletedSets(workout: CompletedWorkout): CompletedSetRecord[] {
  return workout.exercises.flatMap((exercise) =>
    exercise.sets
      .filter((set) => set.completed)
      .map((set) => ({
        ...set,
        exerciseName: exercise.exerciseName,
        volume: set.reps * set.weight,
      })),
  );
}

export default function WorkoutSummary() {
  const router = useRouter();
  const history = useWorkoutStore((s) => s.history);
  const latest = history[0] ?? null;
  const weightUnit = usePreferencesStore((s) => s.weightUnit);
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!latest) {
    return (
      <Screen style={styles.empty}>
        <Text style={styles.emptyText}>No workout data</Text>
        <Button title="Go Back" onPress={() => router.replace('/(client)/workout')} />
      </Screen>
    );
  }

  const planSource = latest.source ?? 'self';
  const badgeSource = getBadgeSource(planSource);
  const effortLabel = getEffortLabel(latest.reflection?.effort);
  const completedDate = new Date(latest.completedAt);
  const completedExercises = getCompletedExerciseCount(latest);
  const completedSets = getCompletedSets(latest);
  const displayProgramName = latest.programName && latest.programName !== latest.routineName
    ? latest.programName
    : null;

  const completionContext = `${completedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} • ${completedDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;

  const heroMetric = latest.totalVolume > 0
    ? {
        icon: 'barbell-outline' as const,
        label: 'Total Volume',
        value: formatVolumeWithUnit(latest.totalVolume, weightUnit),
        insight: effortLabel
          ? `Felt ${effortLabel.toLowerCase()} · ${latest.totalSets} working sets completed`
          : `${latest.totalSets} working sets · ${completedExercises} exercises completed`,
      }
    : {
        icon: 'time-outline' as const,
        label: 'Duration',
        value: formatDuration(latest.durationSeconds),
        insight: effortLabel
          ? `Felt ${effortLabel.toLowerCase()} · ${latest.totalReps} total reps logged`
          : `${latest.totalSets} working sets completed`,
      };

  const recapItems = [
    { label: 'Duration', value: formatDuration(latest.durationSeconds) },
    { label: 'Sets', value: latest.totalSets.toString() },
    { label: 'Exercises', value: completedExercises.toString() },
    { label: 'Reps', value: latest.totalReps.toString() },
  ];

  const heaviestSet = completedSets
    .filter((set) => set.weight > 0)
    .sort((a, b) => b.weight - a.weight)[0];
  const bestSet = completedSets
    .filter((set) => set.volume > 0)
    .sort((a, b) => b.volume - a.volume)[0];
  const topRepSet = completedSets
    .filter((set) => set.reps > 0)
    .sort((a, b) => b.reps - a.reps)[0];

  const achievements: { label: string; value: string; detail: string }[] = [];

  if (heaviestSet) {
    achievements.push({
      label: 'Heaviest Set',
      value: `${formatWeightWithUnit(heaviestSet.weight, weightUnit)} × ${heaviestSet.reps}`,
      detail: heaviestSet.exerciseName,
    });
  }

  if (bestSet) {
    achievements.push({
      label: 'Best Set',
      value: `${bestSet.reps} reps × ${formatWeightWithUnit(bestSet.weight, weightUnit)}`,
      detail: `${formatVolumeWithUnit(bestSet.volume, weightUnit)} volume · ${bestSet.exerciseName}`,
    });
  }

  if (topRepSet) {
    achievements.push({
      label: 'Top Rep Set',
      value: topRepSet.weight > 0
        ? `${topRepSet.reps} reps @ ${formatWeightWithUnit(topRepSet.weight, weightUnit)}`
        : `${topRepSet.reps} reps`,
      detail: topRepSet.exerciseName,
    });
  }

  let trainerContext: { title: string; detail: string } | null = null;

  if (planSource === 'trainer') {
    trainerContext = {
      title: 'Coach Plan completed',
      detail: displayProgramName
        ? `Finished as part of ${displayProgramName}.`
        : 'Finished under your coach’s programming.',
    };
  } else if (planSource === 'ai_endorsed') {
    trainerContext = {
      title: 'Trainer Endorsed session',
      detail: displayProgramName
        ? `${displayProgramName} was completed under trainer-approved guidance.`
        : 'This AI plan was completed under trainer-approved guidance.',
    };
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color={colors.background} />
          </View>
          <Text style={styles.title}>Workout Complete</Text>
          <Text style={styles.routineName}>{latest.routineName}</Text>
          {displayProgramName ? <Text style={styles.programName}>{displayProgramName}</Text> : null}
          <View style={styles.heroMetaRow}>
            <PlanBadge source={badgeSource} size="md" />
          </View>
          <Text style={styles.completionText}>Completed {completionContext}</Text>
        </View>

        <Card style={styles.heroMetricCard}>
          <View style={styles.heroMetricHeader}>
            <Ionicons name={heroMetric.icon} size={18} color={colors.accent} />
            <Text style={styles.heroMetricLabel}>{heroMetric.label}</Text>
          </View>
          <Text style={styles.heroMetricValue}>{heroMetric.value}</Text>
          <Text style={styles.heroMetricInsight}>{heroMetric.insight}</Text>
        </Card>

        <Card style={styles.recapCard}>
          <View style={styles.recapRow}>
            {recapItems.map((item, index) => (
              <View
                key={item.label}
                style={[styles.recapItem, index < recapItems.length - 1 && styles.recapItemBorder]}
              >
                <Text style={styles.recapValue}>{item.value}</Text>
                <Text style={styles.recapLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {achievements.length > 0 ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {achievements.map((item, index) => (
              <View
                key={item.label}
                style={[styles.achievementRow, index < achievements.length - 1 && styles.sectionRowBorder]}
              >
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementLabel}>{item.label}</Text>
                  <Text style={styles.achievementDetail}>{item.detail}</Text>
                </View>
                <Text style={styles.achievementValue}>{item.value}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {trainerContext ? (
          <Card style={styles.sectionCard}>
            <View style={styles.contextHeader}>
              <Ionicons name="person-circle-outline" size={18} color={colors.accent} />
              <Text style={styles.contextTitle}>{trainerContext.title}</Text>
            </View>
            <Text style={styles.contextDetail}>{trainerContext.detail}</Text>
          </Card>
        ) : null}

        <View style={styles.ctaGroup}>
          <Button
            title="Done"
            onPress={() => router.replace('/(client)/workout')}
            style={styles.doneBtn}
          />

          <View style={styles.secondaryActions}>
            <Button
              title="Edit Workout"
              variant="secondary"
              onPress={() => router.push({ pathname: '/(workout)/edit', params: { workoutId: latest.id } })}
              style={styles.secondaryBtn}
            />
            <Button
              title={showBreakdown ? 'Hide Breakdown' : 'Show Breakdown'}
              variant="secondary"
              onPress={() => setShowBreakdown((current) => !current)}
              style={styles.secondaryBtn}
            />
          </View>

          <View style={styles.secondaryActions}>
            <Button
              title="Go to Schedule"
              variant="outline"
              onPress={() => router.push('/(client)/schedule')}
              style={styles.secondaryBtn}
            />
          </View>
        </View>

        {showBreakdown ? (
          <View style={styles.breakdownSection}>
            <Text style={styles.sectionTitle}>Workout Breakdown</Text>
            {buildBreakdownBlocks(latest.exercises).map((block) => {
              if (block.type === 'group') {
                return (
                  <Card key={block.key} style={styles.breakdownCard}>
                    <View style={styles.breakdownGroupHeader}>
                      <View style={styles.breakdownGroupBadge}>
                        <Text style={styles.breakdownGroupBadgeText}>{getGroupTypeLabel(block.groupType)}</Text>
                      </View>
                      <Text style={styles.breakdownGroupCount}>{block.exercises.length} exercises</Text>
                    </View>
                    {block.exercises.map((exercise) => {
                      const completedExerciseSets = exercise.sets.filter((set) => set.completed);
                      const bestExerciseSet = completedExerciseSets
                        .map((set) => ({ ...set, volume: set.reps * set.weight }))
                        .sort((a, b) => b.volume - a.volume)[0];
                      return (
                        <View key={exercise.exerciseId} style={styles.breakdownGroupMember}>
                          <View style={styles.breakdownRow}>
                            <View style={styles.breakdownInfo}>
                              <Text style={styles.breakdownName}>{exercise.exerciseName}</Text>
                              <Text style={styles.breakdownMeta}>
                                {completedExerciseSets.length}/{exercise.sets.length} sets
                              </Text>
                            </View>
                            {bestExerciseSet ? (
                              <View style={styles.breakdownBestSet}>
                                <Text style={styles.breakdownBestLabel}>Best Set</Text>
                                <Text style={styles.breakdownBestValue}>
                                  {bestExerciseSet.weight > 0
                                    ? `${bestExerciseSet.reps} × ${formatWeightWithUnit(bestExerciseSet.weight, weightUnit)}`
                                    : `${bestExerciseSet.reps} reps`}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </Card>
                );
              }

              const exercise = block.exercise;
              const completedExerciseSets = exercise.sets.filter((set) => set.completed);
              const bestExerciseSet = completedExerciseSets
                .map((set) => ({ ...set, volume: set.reps * set.weight }))
                .sort((a, b) => b.volume - a.volume)[0];

              return (
                <Card key={block.key} style={styles.breakdownCard}>
                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownInfo}>
                      <Text style={styles.breakdownName}>{exercise.exerciseName}</Text>
                      <Text style={styles.breakdownMeta}>
                        {completedExerciseSets.length}/{exercise.sets.length} sets completed
                      </Text>
                    </View>
                    {bestExerciseSet ? (
                      <View style={styles.breakdownBestSet}>
                        <Text style={styles.breakdownBestLabel}>Best Set</Text>
                        <Text style={styles.breakdownBestValue}>
                          {bestExerciseSet.weight > 0
                            ? `${bestExerciseSet.reps} × ${formatWeightWithUnit(bestExerciseSet.weight, weightUnit)}`
                            : `${bestExerciseSet.reps} reps`}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  ctaGroup: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  doneBtn: {
    width: '100%',
    marginBottom: spacing.md,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  programName: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  heroMetaRow: {
    marginTop: spacing.md,
  },
  completionText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  heroMetricCard: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.accent}22`,
  },
  heroMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  heroMetricLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroMetricValue: {
    color: colors.textPrimary,
    fontSize: fontSize.hero,
    fontWeight: '800',
    lineHeight: fontSize.hero + 4,
  },
  heroMetricInsight: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  recapCard: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  recapItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  recapItemBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  recapValue: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  recapLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.xs,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  achievementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  achievementDetail: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  achievementValue: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'right',
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  contextTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  contextDetail: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryBtn: {
    flex: 1,
  },
  breakdownSection: {
    marginTop: spacing.sm,
  },
  breakdownCard: {
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  breakdownMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  breakdownBestSet: {
    alignItems: 'flex-end',
  },
  breakdownBestLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  breakdownBestValue: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  breakdownGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  breakdownGroupBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent}18`,
  },
  breakdownGroupBadgeText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownGroupCount: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  breakdownGroupMember: {
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
