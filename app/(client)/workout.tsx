import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Modal, FlatList } from 'react-native';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ClientTabSwipeView } from '@/components/navigation/ClientTabSwipeView';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PlanBadge } from '@/components/ui/PlanBadge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useUserId } from '@/hooks/useUserId';
import { fetchClientRoutines, routineRowToWorkoutRoutine, type RoutineRow } from '@/services/programs';
import { BUTTONS, CLIENT_NOTIF, CONFIRM, DAY_ROUTINE_REASON_LABEL, EMPTY, HELPER } from '@/config/copy';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { WorkoutPlanSource, WorkoutRoutine } from '@/types/workout';
import type { Assignment, DayOfWeek } from '@/types/assignment';

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

function getPlanBadgeSource(source: WorkoutPlanSource | undefined) {
  if (source === 'trainer') return 'trainer' as const;
  if (source === 'self') return 'self' as const;
  return 'ai' as const;
}

export default function Workout() {
  const router = useRouter();
  const userId = useUserId();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const resumeWorkout = useWorkoutStore((s) => s.resumeWorkout);
  const notifications = useAssignmentStore((s) => s.notifications);
  const allAssignments = useAssignmentStore((s) => s.assignments);
  const daySelections = useAssignmentStore((s) => s.daySelections);
  const markNotificationRead = useAssignmentStore((s) => s.markNotificationRead);
  const setDayOverride = useAssignmentStore((s) => s.setDayOverride);
  const clearDayOverride = useAssignmentStore((s) => s.clearDayOverride);
  const resolveDayRoutineForDay = useAssignmentStore((s) => s.resolveDayRoutine);
  const unreadNotifs = useMemo(() => notifications.filter((n) => !n.read), [notifications]);
  const unreadCount = unreadNotifs.length;
  const latestNotif = unreadNotifs[0] ?? null;

  const { days: weekDays, todayIdx } = useMemo(() => buildWeekDays(), []);
  const [selectedDayIdx, setSelectedDayIdx] = useState(todayIdx);
  const selectedDayLabel = DAY_LABELS_SHORT[selectedDayIdx];
  const selectedDay = selectedDayLabel as DayOfWeek;

  const [pickerVisible, setPickerVisible] = useState(false);
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

  const activeDayResolution = useMemo(
    () => resolveDayRoutineForDay(userId, selectedDay),
    [resolveDayRoutineForDay, userId, selectedDay, allAssignments, daySelections],
  );
  const activeDayRoutine = activeDayResolution.activeRoutine;
  const activeDayOwnerName = activeDayResolution.activeAssignment?.programName
    ?? activeDayRoutine?.assignedBy
    ?? activeDayRoutine?.programName;

  const handlePlay = (routine: WorkoutRoutine, assignment?: Assignment | null) => {
    startWorkout(
      routine,
      assignment
        ? {
            assignmentId: assignment.id,
            assignmentStatus: assignment.status,
          }
        : undefined,
    );
    router.push('/(workout)/session');
  };

  const handleSelectRoutine = (row: RoutineRow) => {
    const routine = routineRowToWorkoutRoutine(row);
    setDayOverride(selectedDay, routine);
    setPickerVisible(false);
  };

  const handleClearOverride = () => {
    clearDayOverride(selectedDay);
  };

  const handleResume = () => {
    if (activeSession?.status === 'paused') {
      resumeWorkout();
    }
    router.push('/(workout)/session');
  };

  return (
    <Screen>
      <ClientTabSwipeView routeKey="workout" enabled={!pickerVisible}>
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

        {latestNotif && (
          <View style={styles.notifCard}>
            <View style={styles.notifCardHeader}>
              <View style={styles.notifIconCircle}>
                <Ionicons name="barbell" size={16} color={colors.accent} />
              </View>
              <View style={styles.notifCardContent}>
                <Text style={styles.notifCardTitle}>{latestNotif.title}</Text>
                <Text style={styles.notifCardBody}>{latestNotif.body}</Text>
              </View>
            </View>
            <View style={styles.notifCardActions}>
              <TouchableOpacity
                style={styles.notifViewBtn}
                onPress={() => {
                  markNotificationRead(latestNotif.id);
                  // If the assigned routine is for today, stay on workout tab; otherwise go to schedule
                  const linkedAssignment = latestNotif.assignmentId
                    ? allAssignments.find((a) => a.id === latestNotif.assignmentId)
                    : null;
                  const todayLabel = DAY_LABELS_SHORT[todayIdx] as DayOfWeek;
                  const isForToday = linkedAssignment?.scheduleDays.includes(todayLabel);
                  if (!isForToday) {
                    router.push('/(client)/schedule');
                  }
                }}
              >
                <Text style={styles.notifViewText}>{activeDayRoutine ? CLIENT_NOTIF.viewWorkout : CLIENT_NOTIF.viewSchedule}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => markNotificationRead(latestNotif.id)}>
                <Text style={styles.notifDismissText}>{CLIENT_NOTIF.dismiss}</Text>
              </TouchableOpacity>
            </View>
            {unreadCount > 1 && (
              <Text style={styles.notifMore}>{CLIENT_NOTIF.moreNotifications(unreadCount - 1)}</Text>
            )}
          </View>
        )}

        {activeSession && (
          <TouchableOpacity style={styles.resumeBanner} onPress={handleResume}>
            <View style={styles.resumeLeft}>
              <Ionicons name="play-circle" size={24} color={colors.accent} />
              <View>
                <Text style={styles.resumeTitle}>{activeSession.status === 'paused' ? 'Paused' : 'In Progress'}</Text>
                <Text style={styles.resumeRoutine}>{activeSession.routineName}</Text>
              </View>
            </View>
            <Text style={styles.resumeAction}>{activeSession.status === 'paused' ? 'Resume Workout →' : `${BUTTONS.continueWorkout} →`}</Text>
          </TouchableOpacity>
        )}

        {/* Select a routine row */}
        <View style={styles.routinePickerRow}>
          <TouchableOpacity
            style={styles.routineDropdown}
            onPress={() => {
              loadRoutines();
              setPickerVisible(true);
            }}
          >
            <Text style={styles.routineDropdownText}>
              {activeDayRoutine ? activeDayRoutine.name : 'Select a routine'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(client)/programs')}>
            <Text style={styles.routinesLink}>Routines</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader
          title={selectedDayIdx === todayIdx ? "Today's Routine" : `${selectedDayLabel}'s Routine`}
        />

        {activeDayRoutine ? (
          <Card style={styles.selectedRoutineCard}>
            <View style={styles.routineRow}>
              <View style={styles.routineInfo}>
                <Text style={styles.routineName}>{activeDayRoutine.name}</Text>
                <View style={styles.ownerBadgeRow}>
                  {activeDayRoutine.source && (
                    <PlanBadge source={getPlanBadgeSource(activeDayRoutine.source)} />
                  )}
                  <Badge label={DAY_ROUTINE_REASON_LABEL[activeDayResolution.reason]} color={colors.textSecondary} size="sm" />
                </View>
                <Text style={styles.routineMuscles}>
                  {[...new Set(activeDayRoutine.exercises.flatMap((exercise) => exercise.exercise.muscleGroups))].slice(0, 3).join(', ')}
                </Text>
                <Text style={styles.routineMeta}>
                  {activeDayRoutine.exercises.length} exercises  ·  {activeDayRoutine.durationMinutes ?? '—'} min
                </Text>
                {activeDayOwnerName && (
                  <View style={styles.trainerBadge}>
                    <Ionicons name="person-circle-outline" size={12} color={colors.accent} />
                    <Text style={styles.trainerText}>{activeDayOwnerName}</Text>
                  </View>
                )}
                {activeDayResolution.isManualOverride && (
                  <View style={styles.overrideRow}>
                    <Text style={styles.overrideText}>{HELPER.manualOverride}</Text>
                    <TouchableOpacity onPress={handleClearOverride}>
                      <Text style={styles.overrideClear}>{BUTTONS.clearOverride}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => handlePlay(activeDayRoutine, activeDayResolution.activeAssignment)}
                disabled={!!activeSession}
              >
                <Ionicons name="play" size={20} color={colors.background} />
              </TouchableOpacity>
            </View>
          </Card>
        ) : (
          <Card style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md }}>
              {EMPTY.noWorkoutsToday}
            </Text>
          </Card>
        )}

          <SectionHeader title="Quick Actions" />
          <View style={styles.quickActions}>
            <Button
              title={BUTTONS.generateWorkout}
              icon="sparkles-outline"
              variant="outline"
              onPress={() => router.push('/(client)/generate')}
              style={styles.actionBtn}
            />
          </View>
        </ScrollView>
      </ClientTabSwipeView>

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
                  <View style={styles.modalItemRow}>
                    <View style={styles.modalItemInfo}>
                      <Text style={styles.modalItemName}>{item.name}</Text>
                      <Text style={styles.modalItemMeta}>
                        {(item.exercises_json ?? []).length} EXERCISES
                      </Text>
                    </View>
                    {activeDayRoutine?.id === item.id && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                    )}
                  </View>
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
  notifCard: {
    backgroundColor: colors.accent + '10',
    borderColor: colors.accent + '30',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  notifCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  notifIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifCardContent: {
    flex: 1,
    gap: 2,
  },
  notifCardTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  notifCardBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  notifCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  notifViewBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  notifViewText: {
    color: colors.background,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  notifDismissText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  notifMore: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
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
  ownerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  overrideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  overrideText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    flex: 1,
  },
  overrideClear: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
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
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  modalItemInfo: {
    flex: 1,
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
