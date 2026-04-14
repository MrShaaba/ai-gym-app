import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ClientTabSwipeView } from '@/components/navigation/ClientTabSwipeView';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { useWorkoutStore } from '@/store/workoutStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { convertKgToUnit, formatWeightWithUnit } from '@/services/units';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { CompletedWorkout, ExerciseLog, WorkoutExerciseGroupType } from '@/types/workout';

// ---------------------------------------------------------------------------
// Grouped breakdown helpers (same pattern proven in summary.tsx)
// ---------------------------------------------------------------------------

type BreakdownBlock =
  | { type: 'single'; exercise: ExerciseLog }
  | {
      type: 'group';
      groupId: string;
      groupType: Exclude<WorkoutExerciseGroupType, 'single'>;
      exercises: ExerciseLog[];
    };

function buildBreakdownBlocks(exercises: ExerciseLog[]): BreakdownBlock[] {
  const blocks: BreakdownBlock[] = [];
  const seenGroups = new Set<string>();

  for (const exercise of exercises) {
    if (exercise.groupId && exercise.groupType && exercise.groupType !== 'single') {
      if (seenGroups.has(exercise.groupId)) continue;
      seenGroups.add(exercise.groupId);

      const members = exercises
        .filter((e) => e.groupId === exercise.groupId)
        .sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0));

      blocks.push({
        type: 'group',
        groupId: exercise.groupId,
        groupType: exercise.groupType as Exclude<WorkoutExerciseGroupType, 'single'>,
        exercises: members,
      });
    } else {
      blocks.push({ type: 'single', exercise });
    }
  }

  return blocks;
}

function getGroupLabel(groupType: WorkoutExerciseGroupType | undefined): string | null {
  if (!groupType || groupType === 'single') return null;
  const labels: Record<string, string> = {
    superset: 'Superset',
    triset: 'Tri-set',
    giantset: 'Giant set',
  };
  return labels[groupType] ?? null;
}

function getBestSetForExercise(exercise: ExerciseLog) {
  let best: { reps: number; weight: number; volume: number } | null = null;

  for (const s of exercise.sets) {
    if (!s.completed || s.isWarmup) continue;
    const vol = s.reps * s.weight;
    if (!best || vol > best.volume) {
      best = { reps: s.reps, weight: s.weight, volume: vol };
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Statistics() {
  const router = useRouter();
  const history = useWorkoutStore((s) => s.history);
  const weightUnit = usePreferencesStore((s) => s.weightUnit);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  const totalWorkouts = history.length;
  const totalVolume = history.reduce((sum, w) => sum + w.totalVolume, 0);
  const totalSets = history.reduce((sum, w) => sum + w.totalSets, 0);
  const totalReps = history.reduce((sum, w) => sum + w.totalReps, 0);

  const totalVolumeInUnit = convertKgToUnit(totalVolume, weightUnit);

  const stats = [
    { label: 'Workouts', value: String(totalWorkouts || '—'), sub: 'all time', icon: 'barbell-outline' as const },
    { label: 'Volume', value: totalVolumeInUnit > 0 ? `${(totalVolumeInUnit / 1000).toFixed(1)}k` : '—', sub: `${weightUnit} lifted`, icon: 'trending-up-outline' as const },
    { label: 'Sets', value: String(totalSets || '—'), sub: 'completed', icon: 'layers-outline' as const },
    { label: 'Reps', value: String(totalReps || '—'), sub: 'total', icon: 'repeat-outline' as const },
  ];

  // Build recent workouts list (last 5)
  const recentWorkouts = history.slice(0, 5);

  const toggleExpanded = (workoutId: string) => {
    setExpandedWorkoutId((prev) => (prev === workoutId ? null : workoutId));
  };

  return (
    <Screen>
      <ClientTabSwipeView routeKey="statistics">
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Statistics</Text>
          <Text style={styles.subtitle}>
            {totalWorkouts > 0 ? `${totalWorkouts} workout${totalWorkouts === 1 ? '' : 's'} completed` : 'Complete a workout to see stats'}
          </Text>

        <View style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={20} color={colors.accent} style={styles.statIcon} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statSub}>{s.sub}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Workouts</Text>

        {recentWorkouts.length === 0 && (
          <Card style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No workouts yet — start one from the Workout tab!</Text>
          </Card>
        )}

          {recentWorkouts.map((w) => {
            const mins = Math.round(w.durationSeconds / 60);
            const date = new Date(w.completedAt);
            const timeAgo = getTimeAgo(date);
            const isExpanded = expandedWorkoutId === w.id;

            return (
              <View key={w.id}>
                <TouchableOpacity
                  onPress={() => toggleExpanded(w.id)}
                  onLongPress={() => router.push({ pathname: '/(workout)/edit', params: { workoutId: w.id } })}
                >
                  <Card style={styles.prCard}>
                    <View style={styles.prRow}>
                      <View style={styles.prIcon}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                      </View>
                      <View style={styles.prInfo}>
                        <Text style={styles.prExercise}>{w.routineName}</Text>
                       <Text style={styles.prDate}>{timeAgo}  ·  {mins} min  ·  {w.totalSets} sets</Text>
                     </View>
                     <View style={styles.prRight}>
                       <Text style={styles.prValue}>{(convertKgToUnit(w.totalVolume, weightUnit) / 1000).toFixed(1)}k {weightUnit}</Text>
                       <Ionicons
                         name={isExpanded ? 'chevron-up' : 'chevron-down'}
                         size={14}
                         color={colors.textMuted}
                         style={styles.expandIcon}
                       />
                     </View>
                    </View>
                  </Card>
                </TouchableOpacity>

                {isExpanded && (
                  <WorkoutBreakdown workout={w} weightUnit={weightUnit} />
                )}
              </View>
            );
          })}
        </ScrollView>
      </ClientTabSwipeView>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Workout breakdown sub-component (grouped visibility)
// ---------------------------------------------------------------------------

function WorkoutBreakdown({ workout, weightUnit }: { workout: CompletedWorkout; weightUnit: 'kg' | 'lb' }) {
  const blocks = useMemo(() => buildBreakdownBlocks(workout.exercises), [workout.exercises]);

  if (blocks.length === 0) {
    return (
      <Card style={styles.breakdownCard}>
        <Text style={styles.breakdownEmpty}>No exercise data recorded.</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.breakdownCard}>
      {blocks.map((block, index) => {
        if (block.type === 'group') {
          const groupLabel = getGroupLabel(block.groupType);
          return (
            <View key={`group-${block.groupId}`} style={[styles.breakdownBlock, index > 0 && styles.breakdownBlockBorder]}>
              {groupLabel && (
                <View style={styles.groupBadgeRow}>
                  <View style={styles.groupBadge}>
                    <Ionicons name="git-merge-outline" size={12} color={colors.accent} />
                    <Text style={styles.groupBadgeText}>{groupLabel}</Text>
                  </View>
                  <Text style={styles.groupMemberCount}>{block.exercises.length} exercises</Text>
                </View>
              )}
              {block.exercises.map((exercise) => (
                <ExerciseBreakdownRow
                  key={`${block.groupId}-${exercise.exerciseId}`}
                  exercise={exercise}
                  weightUnit={weightUnit}
                  indented
                />
              ))}
            </View>
          );
        }

        return (
          <View key={`single-${block.exercise.exerciseId}-${index}`} style={[styles.breakdownBlock, index > 0 && styles.breakdownBlockBorder]}>
            <ExerciseBreakdownRow exercise={block.exercise} weightUnit={weightUnit} indented={false} />
          </View>
        );
      })}
    </Card>
  );
}

function ExerciseBreakdownRow({
  exercise,
  weightUnit,
  indented,
}: {
  exercise: ExerciseLog;
  weightUnit: 'kg' | 'lb';
  indented: boolean;
}) {
  const best = getBestSetForExercise(exercise);
  const completedSets = exercise.sets.filter((s) => s.completed && !s.isWarmup).length;

  return (
    <View style={[styles.exerciseRow, indented && styles.exerciseRowIndented]}>
      <View style={styles.exerciseRowInfo}>
        <Text style={styles.exerciseRowName} numberOfLines={1}>{exercise.exerciseName}</Text>
        <Text style={styles.exerciseRowMeta}>
          {completedSets} set{completedSets !== 1 ? 's' : ''}
          {best && best.weight > 0
            ? `  ·  best: ${best.reps} × ${formatWeightWithUnit(best.weight, weightUnit)}`
            : best
              ? `  ·  best: ${best.reps} reps`
              : ''}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: spacing.xs,
  },
  statValue: {
    color: colors.accent,
    fontSize: fontSize.hero,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  statSub: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  prCard: {
    marginBottom: spacing.sm,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  prInfo: {
    flex: 1,
  },
  prExercise: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  prDate: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  prRight: {
    alignItems: 'flex-end',
  },
  prValue: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  expandIcon: {
    marginTop: 2,
  },

  // Breakdown styles
  breakdownCard: {
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
    paddingVertical: spacing.sm,
  },
  breakdownEmpty: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  breakdownBlock: {
    paddingVertical: spacing.xs,
  },
  breakdownBlockBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  groupBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent + '18',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  groupBadgeText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  groupMemberCount: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  exerciseRowIndented: {
    paddingLeft: spacing.md,
  },
  exerciseRowInfo: {
    flex: 1,
  },
  exerciseRowName: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  exerciseRowMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 1,
  },
});
