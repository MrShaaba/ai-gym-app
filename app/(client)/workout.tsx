import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Modal, FlatList } from 'react-native';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PlanBadge } from '@/components/ui/PlanBadge';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useUserId } from '@/hooks/useUserId';
import { fetchClientRoutines, routineRowToWorkoutRoutine, type RoutineRow } from '@/services/programs';
import { BUTTONS, EMPTY } from '@/config/copy';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { WorkoutRoutine } from '@/types/workout';

const DAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function buildWeekDays() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const todayIdx = (now.getDay() + 6) % 7; // 0=Mon … 6=Sun
  return { days: Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { label: DAY_LABELS_SHORT[i], date: d.getDate(), isToday: i === todayIdx };
  }), todayIdx };
}

export default function Workout() {
  const router = useRouter();
  const userId = useUserId();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const notifications = useAssignmentStore((s) => s.notifications);
  const allAssignments = useAssignmentStore((s) => s.assignments);
  const markAllRead = useAssignmentStore((s) => s.markAllNotificationsRead);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const { days: weekDays, todayIdx } = useMemo(() => buildWeekDays(), []);
  const [selectedDayIdx, setSelectedDayIdx] = useState(todayIdx);
  const selectedDayLabel = DAY_LABELS_SHORT[selectedDayIdx];

  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<WorkoutRoutine | null>(null);
  const [libraryRoutines, setLibraryRoutines] = useState<RoutineRow[]>([]);
  const [loadingRoutines, setLoadingRoutines] = useState(false);

  // Fetch all client-accessible routines (own + trainer's programs)
  const loadRoutines = useCallback(async () => {
    if (!userId) return;
    setLoadingRoutines(true);
    try {
      const rows = await fetchClientRoutines(userId);
      setLibraryRoutines(rows);
    } catch {
      /* ignore */
    } finally {
      setLoadingRoutines(false);
    }
  }, [userId]);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  // Derive routines for the selected day from assignments
  const todayRoutines = useMemo((): (WorkoutRoutine & { source?: string })[] => {
    const myAssignments = allAssignments.filter(
      (a) => a.clientId === userId && a.status !== 'completed' && a.scheduleDays.includes(selectedDayLabel as any),
    );
    return myAssignments
      .filter((a) => a.exercisesJson && a.exercisesJson.length > 0)
      .map((a) => ({
        id: a.id,
        name: a.routineName,
        exercises: a.exercisesJson!,
        difficulty: 'intermediate' as const,
        assignedBy: a.programName,
        source: a.source,
      }));
  }, [allAssignments, userId, selectedDayLabel]);

  const handlePlay = (routine: WorkoutRoutine) => {
    startWorkout(routine);
    router.push('/(workout)/session');
  };

  const handleSelectRoutine = (row: RoutineRow) => {
    const routine = routineRowToWorkoutRoutine(row);
    setSelectedRoutine(routine);
    setPickerVisible(false);
  };

  const handleResume = () => {
    router.push('/(workout)/session');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Workout</Text>
        <Text style={styles.dateSubtitle}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        <View style={styles.calendarStrip}>
          {weekDays.map((day, idx) => {
            const isSelected = idx === selectedDayIdx;
            return (
              <Pressable key={day.label} onPress={() => setSelectedDayIdx(idx)} style={[styles.dayCol, isSelected && styles.dayColActive]}>
                <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>{day.label.toUpperCase()}</Text>
                <Text style={[styles.dayDate, isSelected && styles.dayDateActive]}>{day.date}</Text>
                {day.isToday && <View style={[styles.dayDot, isSelected && styles.dayDotActive]} />}
              </Pressable>
            );
          })}
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
            <Text style={styles.resumeAction}>{BUTTONS.continueWorkout} →</Text>
          </TouchableOpacity>
        )}

        {/* Select a routine row */}
        <View style={styles.routinePickerRow}>
          <TouchableOpacity style={styles.routineDropdown} onPress={() => setPickerVisible(true)}>
            <Text style={styles.routineDropdownText}>
              {selectedRoutine ? selectedRoutine.name : 'Select a routine'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(client)/programs')}>
            <Text style={styles.routinesLink}>Routines</Text>
          </TouchableOpacity>
        </View>

        {/* Start selected routine */}
        {selectedRoutine && (
          <Card style={styles.selectedRoutineCard}>
            <View style={styles.routineRow}>
              <View style={styles.routineInfo}>
                <Text style={styles.routineName}>{selectedRoutine.name}</Text>
                <Text style={styles.routineMeta}>
                  {selectedRoutine.exercises.length} exercises  ·  {selectedRoutine.durationMinutes ?? '—'} min
                </Text>
              </View>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => handlePlay(selectedRoutine)}
                disabled={!!activeSession}
              >
                <Ionicons name="play" size={20} color={colors.background} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {!selectedRoutine && !activeSession && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Hey there!</Text>
            <Text style={styles.emptySubtitle}>
              You've worked out <Text style={{ fontWeight: '700' }}>0 times</Text> so far this week. Time to get started!
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>
          {selectedDayIdx === todayIdx ? "Today's Routines" : `${selectedDayLabel}'s Routines`}
        </Text>

        {todayRoutines.length === 0 && (
          <Card style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md }}>
              {EMPTY.noWorkoutsToday}
            </Text>
          </Card>
        )}

        {todayRoutines.map((routine) => (
          <Card key={routine.id} accent style={styles.routineCard}>
            <View style={styles.routineRow}>
              <View style={styles.routineInfo}>
                <Text style={styles.routineName}>{routine.name}</Text>
                {routine.source && (
                  <PlanBadge source={routine.source as any} />
                )}
                <Text style={styles.routineMuscles}>
                  {[...new Set(routine.exercises.flatMap((e) => e.exercise.muscleGroups))].slice(0, 3).join(', ')}
                </Text>
                <Text style={styles.routineMeta}>
                  {routine.exercises.length} exercises  ·  {routine.durationMinutes ?? '—'} min
                </Text>
                {routine.assignedBy && (
                  <View style={styles.trainerBadge}>
                    <Ionicons name="person-circle-outline" size={12} color={colors.accent} />
                    <Text style={styles.trainerText}>{routine.assignedBy}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => handlePlay(routine)}
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
            title={BUTTONS.generateWorkout}
            icon="sparkles-outline"
            onPress={() => router.push('/(client)/generate')}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>

      {/* Bottom-sheet routine picker */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select a routine</Text>

          {loadingRoutines ? (
            <Text style={styles.modalEmpty}>Loading…</Text>
          ) : libraryRoutines.length === 0 ? (
            <Text style={styles.modalEmpty}>No routines found. Create a program first.</Text>
          ) : (
            <FlatList
              data={libraryRoutines}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSelectRoutine(item)}
                >
                  <Text style={styles.modalItemName}>{item.name}</Text>
                  <Text style={styles.modalItemMeta}>
                    {(item.exercises_json ?? []).length} EXERCISES
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.xxl }}
            />
          )}
        </View>
      </Modal>
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
  // Routine picker row
  routinePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  routineDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginRight: spacing.md,
  },
  routineDropdownText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  routinesLink: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  selectedRoutineCard: {
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modal / bottom sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: '65%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalEmpty: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
    padding: spacing.xl,
  },
  modalItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalItemName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modalItemMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
});
