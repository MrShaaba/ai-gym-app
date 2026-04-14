import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PlanBadge } from '@/components/ui/PlanBadge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { DAY_ROUTINE_REASON_LABEL, EMPTY, HELPER } from '@/config/copy';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserId } from '@/hooks/useUserId';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { DayOfWeek } from '@/types/assignment';
import type { WorkoutPlanSource, WorkoutRoutine } from '@/types/workout';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const todayIndex = new Date().getDay();
const todayLabel = DAYS[(todayIndex + 6) % 7]; // convert Sun=0 to Mon-first

function getPlanBadgeSource(source: WorkoutPlanSource | undefined) {
  if (source === 'trainer') return 'trainer' as const;
  if (source === 'self') return 'self' as const;
  return 'ai' as const;
}

export function ScheduleContent() {
  const router = useRouter();
  const userId = useUserId();
  const allAssignments = useAssignmentStore((s) => s.assignments);
  const daySelections = useAssignmentStore((s) => s.daySelections);
  const resolveDayRoutineForDay = useAssignmentStore((s) => s.resolveDayRoutine);
  const assignments = useMemo(
    () => allAssignments.filter((a) => a.clientId === userId),
    [allAssignments, userId],
  );
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const activeSession = useWorkoutStore((s) => s.activeSession);

  const dayMap = useMemo(
    () => new Map(DAYS.map((day) => [day, resolveDayRoutineForDay(userId, day)])),
    [resolveDayRoutineForDay, userId, assignments, daySelections],
  );
  const activeDayCount = Array.from(dayMap.values()).filter((resolution) => resolution.activeRoutine).length;

  const handleStart = (routine: WorkoutRoutine) => {
    startWorkout(routine);
    router.push('/(workout)/session');
  };

  const statusColor: Record<string, string> = {
    assigned: colors.infoLight,
    in_progress: colors.warningLight,
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Today's Schedule</Text>
          <Text style={styles.subtitle}>
            {activeDayCount > 0
              ? `${activeDayCount} active day owner${activeDayCount !== 1 ? 's' : ''}`
              : EMPTY.noSchedule}
          </Text>

          {DAYS.map((day) => {
            const resolution = dayMap.get(day)!;
            const item = resolution.activeRoutine;
            const isToday = day === todayLabel;
            return (
              <View key={day}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {day}{isToday ? '  ·  Today' : ''}
                </Text>
                {item && (
                  <Text style={styles.dayCount}>{DAY_ROUTINE_REASON_LABEL[resolution.reason]}</Text>
                )}
              </View>

              {!item ? (
                <View style={styles.restCard}>
                  <Ionicons name="bed-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.restText}>Rest day</Text>
                </View>
              ) : (
                <Card style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.info}>
                      <Text style={styles.routineName}>{item.name}</Text>
                      {(resolution.activeAssignment?.programName ?? item.programName) && (
                        <Text style={styles.programName}>{resolution.activeAssignment?.programName ?? item.programName}</Text>
                      )}
                      <View style={styles.badgeRow}>
                        {item.source && (
                          <PlanBadge source={getPlanBadgeSource(item.source)} />
                        )}
                        <Badge
                          label={DAY_ROUTINE_REASON_LABEL[resolution.reason]}
                          color={resolution.isManualOverride ? colors.accent : colors.textSecondary}
                          size="sm"
                        />
                        {resolution.activeAssignment && (
                          <Badge
                            label={resolution.activeAssignment.status.replace('_', ' ')}
                            color={statusColor[resolution.activeAssignment.status] ?? colors.accent}
                            size="sm"
                          />
                        )}
                      </View>
                    </View>
                    {isToday && !activeSession && (
                      <TouchableOpacity
                        style={styles.startBtn}
                        onPress={() => handleStart(item)}
                      >
                        <Ionicons name="play" size={18} color={colors.background} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {resolution.isManualOverride && (
                    <View style={styles.noteRow}>
                      <Ionicons name="swap-horizontal-outline" size={12} color={colors.accent} />
                      <Text style={styles.noteText}>{HELPER.manualOverride}</Text>
                    </View>
                  )}
                  {resolution.activeAssignment?.note && (
                    <View style={styles.noteRow}>
                      <Ionicons name="chatbubble-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.noteText}>{resolution.activeAssignment.note}</Text>
                    </View>
                  )}
                </Card>
              )}
              </View>
            );
          })}
        </ScrollView>
    </>
  );
}

export default function Schedule() {
  return (
    <Screen>
      <ScheduleContent />
    </Screen>
  );
}

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
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  dayLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dayLabelToday: {
    color: colors.accent,
  },
  dayCount: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  restCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  restText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  programName: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  startBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noteText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    flex: 1,
  },
});
