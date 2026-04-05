import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { ROUTINES } from '@/data/routines';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { DayOfWeek } from '@/types/assignment';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const todayIndex = new Date().getDay();
const todayLabel = DAYS[(todayIndex + 6) % 7]; // convert Sun=0 to Mon-first

const CLIENT_ID = 'cl-05'; // Alex

export default function Schedule() {
  const router = useRouter();
  const allAssignments = useAssignmentStore((s) => s.assignments);
  const assignments = useMemo(
    () => allAssignments.filter((a) => a.clientId === CLIENT_ID),
    [allAssignments],
  );
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const activeSession = useWorkoutStore((s) => s.activeSession);

  const active = assignments.filter((a) => a.status !== 'completed');

  const dayMap = new Map<DayOfWeek, typeof active>();
  for (const day of DAYS) {
    dayMap.set(day, active.filter((a) => a.scheduleDays.includes(day)));
  }

  const handleStart = (routineId: string) => {
    const routine = ROUTINES.find((r) => r.id === routineId);
    if (!routine) return;
    startWorkout(routine);
    router.push('/(workout)/session');
  };

  const statusColor: Record<string, string> = {
    assigned: '#60A5FA',
    in_progress: '#FACC15',
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.subtitle}>
          {active.length} active assignment{active.length !== 1 ? 's' : ''}
        </Text>

        {DAYS.map((day) => {
          const items = dayMap.get(day) ?? [];
          const isToday = day === todayLabel;
          return (
            <View key={day}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {day}{isToday ? '  ·  Today' : ''}
                </Text>
                {items.length > 0 && (
                  <Text style={styles.dayCount}>{items.length}</Text>
                )}
              </View>

              {items.length === 0 ? (
                <View style={styles.restCard}>
                  <Ionicons name="bed-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.restText}>Rest day</Text>
                </View>
              ) : (
                items.map((a) => (
                  <Card key={a.id} style={styles.card}>
                    <View style={styles.row}>
                      <View style={styles.info}>
                        <Text style={styles.routineName}>{a.routineName}</Text>
                        {a.programName && (
                          <Text style={styles.programName}>{a.programName}</Text>
                        )}
                        <Badge
                          label={a.status.replace('_', ' ')}
                          color={statusColor[a.status] ?? colors.accent}
                          size="sm"
                        />
                      </View>
                      {isToday && !activeSession && (
                        <TouchableOpacity
                          style={styles.startBtn}
                          onPress={() => handleStart(a.routineId)}
                        >
                          <Ionicons name="play" size={18} color={colors.background} />
                        </TouchableOpacity>
                      )}
                    </View>
                    {a.note && (
                      <View style={styles.noteRow}>
                        <Ionicons name="chatbubble-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.noteText}>{a.note}</Text>
                      </View>
                    )}
                  </Card>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>
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
