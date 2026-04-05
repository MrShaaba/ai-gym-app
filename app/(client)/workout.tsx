import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useAuthStore } from '@/store/authStore';
import { ROUTINES } from '@/data/routines';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const now = new Date();
const startOfWeek = new Date(now);
startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));

const WEEK_DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(startOfWeek);
  d.setDate(startOfWeek.getDate() + i);
  return {
    label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    date: d.getDate(),
    isToday: d.toDateString() === now.toDateString(),
    hasWorkout: [0, 1, 3, 5].includes(i),
  };
});

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const todayLabel = DAY_LABELS[now.getDay()];

export default function Workout() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const notifications = useAssignmentStore((s) => s.notifications);
  const allAssignments = useAssignmentStore((s) => s.assignments);
  const markAllRead = useAssignmentStore((s) => s.markAllNotificationsRead);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  // Derive today's routines from assignments (fallback to local catalog)
  const todayRoutines = useMemo(() => {
    const myAssignments = allAssignments.filter(
      (a) => a.clientId === userId && a.status !== 'completed' && a.scheduleDays.includes(todayLabel as any),
    );
    if (myAssignments.length > 0) {
      return myAssignments
        .map((a) => ROUTINES.find((r) => r.name === a.routineName))
        .filter(Boolean) as typeof ROUTINES;
    }
    return ROUTINES.slice(0, 3);
  }, [allAssignments, userId]);

  const handlePlay = (routineName: string) => {
    const routine = ROUTINES.find((r) => r.name === routineName);
    if (!routine) return;
    startWorkout(routine);
    router.push('/(workout)/session');
  };

  const handleResume = () => {
    router.push('/(workout)/session');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Workout</Text>
        <Text style={styles.dateSubtitle}>
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        <View style={styles.calendarStrip}>
          {WEEK_DAYS.map((day) => (
            <View key={day.label} style={[styles.dayCol, day.isToday && styles.dayColActive]}>
              <Text style={[styles.dayLabel, day.isToday && styles.dayLabelActive]}>{day.label.toUpperCase()}</Text>
              <Text style={[styles.dayDate, day.isToday && styles.dayDateActive]}>{day.date}</Text>
              {day.hasWorkout && <View style={[styles.dayDot, day.isToday && styles.dayDotActive]} />}
            </View>
          ))}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity style={styles.notifBanner} onPress={markAllRead}>
            <View style={styles.notifLeft}>
              <Ionicons name="notifications" size={18} color="#60A5FA" />
              <Text style={styles.notifText}>
                {unreadCount} new notification{unreadCount !== 1 ? 's' : ''} from your trainer
              </Text>
            </View>
            <Text style={styles.notifDismiss}>Dismiss</Text>
          </TouchableOpacity>
        )}

        {activeSession && (
          <TouchableOpacity style={styles.resumeBanner} onPress={handleResume}>
            <View style={styles.resumeLeft}>
              <Ionicons name="play-circle" size={24} color={colors.accent} />
              <View>
                <Text style={styles.resumeTitle}>In Progress</Text>
                <Text style={styles.resumeRoutine}>{activeSession.routineName}</Text>
              </View>
            </View>
            <Text style={styles.resumeAction}>Resume →</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Today's Routines</Text>

        {todayRoutines.map((routine) => (
          <Card key={routine.id} accent style={styles.routineCard}>
            <View style={styles.routineRow}>
              <View style={styles.routineInfo}>
                <Text style={styles.routineName}>{routine.name}</Text>
                <Text style={styles.routineMuscles}>
                  {[...new Set(routine.exercises.flatMap((e) => e.exercise.muscleGroups))].slice(0, 3).join(', ')}
                </Text>
                <Text style={styles.routineMeta}>
                  {routine.exercises.length} exercises  ·  {routine.durationMinutes} min
                </Text>
                {routine.assignedBy && (
                  <View style={styles.trainerBadge}>
                    <Ionicons name="person-circle-outline" size={12} color={colors.accent} />
                    <Text style={styles.trainerText}>Assigned by {routine.assignedBy}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => handlePlay(routine.name)}
                disabled={!!activeSession}
              >
                <Ionicons name="play" size={20} color={colors.background} />
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <Button
            title="Generate Workout"
            icon="sparkles-outline"
            onPress={() => {}}
            style={styles.actionBtn}
          />
          <Button
            title="Browse Routines"
            icon="library-outline"
            variant="secondary"
            onPress={() => {}}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  dateSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xl,
  },
  dayCol: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  dayColActive: {
    backgroundColor: colors.accent + '20',
  },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dayLabelActive: {
    color: colors.accent,
  },
  dayDate: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  dayDateActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent + '60',
  },
  dayDotActive: {
    backgroundColor: colors.accent,
  },
  notifBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#60A5FA' + '15',
    borderColor: '#60A5FA' + '40',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  notifLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  notifText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    flex: 1,
  },
  notifDismiss: {
    color: '#60A5FA',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  routineCard: {
    marginBottom: spacing.md,
  },
  routineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  routineMuscles: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  routineMeta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  trainerText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '500',
  },
  resumeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.accent + '15',
    borderColor: colors.accent + '40',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  resumeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resumeTitle: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resumeRoutine: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  resumeAction: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  quickActions: {
    gap: spacing.md,
  },
  actionBtn: {
    // full width default
  },
});
