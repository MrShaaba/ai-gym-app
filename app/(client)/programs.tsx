import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Pressable } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ClientTabSwipeView } from '@/components/navigation/ClientTabSwipeView';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PlanBadge } from '@/components/ui/PlanBadge';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useUserId } from '@/hooks/useUserId';
import { usePrograms } from '@/hooks/usePrograms';
import {
  CUSTOM_ROUTINE_CONTAINER_NAME,
  deleteRoutine,
  fetchRoutines,
  isCustomRoutineContainerProgram,
  type ProgramRow,
  type RoutineRow,
} from '@/services/programs';
import { BUTTONS, CONFIRM, DAY_ROUTINE_REASON_LABEL, HELPER, EMPTY } from '@/config/copy';
import type { DayOfWeek, AssignmentSource } from '@/types/assignment';
import { deleteSelfAssignmentsForRoutine } from '@/services/assignments';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const difficultyColor: Record<string, string> = {
  beginner: '#4ADE80',
  intermediate: '#FACC15',
  advanced: '#F87171',
};

export default function Programs() {
  const router = useRouter();
  const { refresh } = useLocalSearchParams<{ refresh?: string }>();
  const userId = useUserId();
  const { programs, loading, refetch } = usePrograms('client', userId);
  const allAssignments = useAssignmentStore((s) => s.assignments);
  const daySelections = useAssignmentStore((s) => s.daySelections);
  const selfAssign = useAssignmentStore((s) => s.selfAssign);
  const hydrateAssignments = useAssignmentStore((s) => s.hydrate);
  const removeRoutineReferences = useAssignmentStore((s) => s.removeRoutineReferences);
  const resolveDayRoutineForDay = useAssignmentStore((s) => s.resolveDayRoutine);
  const assignments = useMemo(
    () => allAssignments.filter((a) => a.clientId === userId),
    [allAssignments, userId],
  );

  const [pickerProgram, setPickerProgram] = useState<ProgramRow | null>(null);
  const [pickerRoutine, setPickerRoutine] = useState<RoutineRow | null>(null);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [customRoutines, setCustomRoutines] = useState<RoutineRow[]>([]);
  const [deletingRoutineId, setDeletingRoutineId] = useState<string | null>(null);

  const visiblePrograms = useMemo(
    () => programs.filter((program) => !userId || !isCustomRoutineContainerProgram(program, userId)),
    [programs, userId],
  );

  // map programName → best status (in_progress > assigned > completed)
  const programStatus = new Map<string, string>();
  for (const a of assignments) {
    if (a.programName) {
      const existing = programStatus.get(a.programName);
      if (!existing || a.status === 'in_progress' || (a.status === 'assigned' && existing === 'completed')) {
        programStatus.set(a.programName, a.status);
      }
    }
  }

  const assignmentStatusColor: Record<string, string> = {
    assigned: '#60A5FA',
    in_progress: '#FACC15',
    completed: '#4ADE80',
  };

  const toggleDay = (d: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const incomingSource: AssignmentSource | null = useMemo(() => {
    if (pickerRoutine) return 'self';
    if (!pickerProgram) return null;
    return pickerProgram.source === 'ai' || pickerProgram.source === 'ai_endorsed' ? 'ai' : 'self';
  }, [pickerProgram, pickerRoutine]);

  const selectedDayInsights = useMemo(() => {
    if (!incomingSource || !userId) return [];

    return selectedDays.map((day) => {
      const resolution = resolveDayRoutineForDay(userId, day);
      let impactText = 'Will become the active owner for this day.';

      if (resolution.reason === 'manual_override') {
        impactText = 'Manual override stays active until cleared.';
      } else if (resolution.reason === 'coach_assigned') {
        impactText = 'Coach-assigned routine remains the active owner.';
      } else if (resolution.reason === 'self_scheduled' || resolution.reason === 'ai_scheduled') {
        impactText = 'Will replace the current non-coach owner as the default.';
      }

      return {
        day,
        reasonLabel: DAY_ROUTINE_REASON_LABEL[resolution.reason],
        impactText,
      };
    });
  }, [incomingSource, resolveDayRoutineForDay, selectedDays, userId, assignments, daySelections]);

  const handleAssign = async () => {
    if (!userId || selectedDays.length === 0) return;
    setAssigning(true);
    try {
      if (pickerRoutine) {
        await selfAssign({
          clientId: userId,
          routineId: pickerRoutine.id,
          routineName: pickerRoutine.name,
          programName: CUSTOM_ROUTINE_CONTAINER_NAME,
          scheduleDays: selectedDays,
          exercisesJson: pickerRoutine.exercises_json,
          source: 'self',
        });

        Alert.alert('Done', CONFIRM.addedToSchedule);
        setPickerRoutine(null);
        setSelectedDays([]);
        return;
      }

      if (!pickerProgram) return;

      const routines = await fetchRoutines(pickerProgram.id);
      const source: AssignmentSource =
        pickerProgram.source === 'ai' || pickerProgram.source === 'ai_endorsed' ? 'ai' : 'self';

      for (const r of routines) {
        await selfAssign({
          clientId: userId,
          routineId: r.id,
          routineName: r.name,
          programName: pickerProgram.name,
          scheduleDays: selectedDays,
          exercisesJson: r.exercises_json,
          source,
        });
      }
      Alert.alert('Done', CONFIRM.addedToSchedule);
      setPickerProgram(null);
      setSelectedDays([]);
    } catch (e) {
      Alert.alert('Error', 'Could not assign. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const getSourceForProgram = (p: ProgramRow): AssignmentSource => {
    if (p.source === 'ai' || p.source === 'ai_endorsed') return 'ai';
    if (p.created_by === userId) return 'self';
    return 'trainer';
  };

  const handleEditRoutine = (routine: RoutineRow) => {
    router.push({ pathname: '/(client)/create-routine', params: { routineId: routine.id } });
  };

  const handleDeleteRoutine = (routine: RoutineRow) => {
    if (!userId) return;

    Alert.alert(
      'Delete Routine',
      `"${routine.name}" will be removed from My Routines. Any self-scheduled references for this routine will also be removed from your week before delete. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingRoutineId(routine.id);
            try {
              await deleteSelfAssignmentsForRoutine(userId, routine.id);
              removeRoutineReferences(userId, routine.id);
              await deleteRoutine(routine.id);
              setCustomRoutines((prev) => prev.filter((item) => item.id !== routine.id));
              await hydrateAssignments('client', userId);
              await refetch();
              Alert.alert('Routine Deleted', `"${routine.name}" has been removed from My Routines.`);
            } catch (error: any) {
              Alert.alert('Delete Failed', error?.message ?? 'Could not delete this routine.');
            } finally {
              setDeletingRoutineId(null);
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (!refresh) return;
    refetch();
  }, [refresh, refetch]);

  useEffect(() => {
    if (!userId) {
      setCustomRoutines([]);
      return;
    }

    const containerProgram = programs.find((program) => isCustomRoutineContainerProgram(program, userId));
    if (!containerProgram) {
      setCustomRoutines([]);
      return;
    }

    let cancelled = false;

    fetchRoutines(containerProgram.id)
      .then((routines) => {
        if (!cancelled) {
          setCustomRoutines(routines);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCustomRoutines([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [programs, userId]);

  return (
    <Screen>
      <ClientTabSwipeView routeKey="programs" enabled={!pickerProgram && !pickerRoutine}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>My Plans</Text>
          <Text style={styles.subtitle}>
            {loading ? 'Loading…' : HELPER.planIntro}
          </Text>

        <Button
          title="Create Routine"
          icon="add-outline"
          onPress={() => router.push('/(client)/create-routine')}
          style={styles.createRoutineBtn}
        />

        {!loading && visiblePrograms.length === 0 && customRoutines.length === 0 && (
          <Card style={styles.card}>
            <Text style={styles.emptyText}>{EMPTY.noPlansCTA}</Text>
          </Card>
        )}

        {visiblePrograms.map((p) => {
          const src = getSourceForProgram(p);
          return (
            <Card key={p.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.info}>
                  <Text style={styles.name}>{p.name}</Text>
                  <PlanBadge source={src} />
                  {p.description && (
                    <Text style={styles.muscles}>{p.description}</Text>
                  )}
                  <Text style={styles.meta}>
                    {p.days_per_week} days/week
                  </Text>
                  {programStatus.has(p.name) && (
                    <Badge
                      label={programStatus.get(p.name)!.replace('_', ' ')}
                      color={assignmentStatusColor[programStatus.get(p.name)!] ?? colors.accent}
                      size="sm"
                    />
                  )}
                </View>
                <View style={[styles.diffBadge, { backgroundColor: (difficultyColor[p.difficulty] ?? colors.accent) + '20' }]}>
                  <Text style={[styles.diffBadgeText, { color: difficultyColor[p.difficulty] ?? colors.accent }]}>
                    {p.difficulty}
                  </Text>
                </View>
              </View>
              {/* Self-assign button (only for own or AI programs) */}
              {(src === 'self' || src === 'ai') && (
                <TouchableOpacity
                  style={styles.assignBtn}
                  onPress={() => {
                    setPickerProgram(p);
                    setSelectedDays([]);
                  }}
                >
                  <Ionicons name="calendar-outline" size={14} color={colors.accent} />
                  <Text style={styles.assignBtnText}>{BUTTONS.assignToSchedule}</Text>
                </TouchableOpacity>
              )}
            </Card>
          );
        })}

        {customRoutines.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{CUSTOM_ROUTINE_CONTAINER_NAME}</Text>
            {customRoutines.map((routine) => (
              <Card key={routine.id} style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.info}>
                    <Text style={styles.name}>{routine.name}</Text>
                    <PlanBadge source="self" />
                    <Text style={styles.meta}>
                      {(routine.exercises_json ?? []).length} exercises · {routine.duration_minutes} min
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.assignBtn}
                  onPress={() => {
                    setPickerRoutine(routine);
                    setPickerProgram(null);
                    setSelectedDays([]);
                  }}
                >
                  <Ionicons name="calendar-outline" size={14} color={colors.accent} />
                  <Text style={styles.assignBtnText}>{BUTTONS.assignToSchedule}</Text>
                </TouchableOpacity>
                <View style={styles.manageRow}>
                  <TouchableOpacity
                    style={styles.manageBtn}
                    onPress={() => handleEditRoutine(routine)}
                    disabled={deletingRoutineId === routine.id}
                  >
                    <Ionicons name="create-outline" size={14} color={colors.textPrimary} />
                    <Text style={styles.manageBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.manageBtn, styles.deleteBtn]}
                    onPress={() => handleDeleteRoutine(routine)}
                    disabled={deletingRoutineId === routine.id}
                  >
                    <Ionicons name="trash-outline" size={14} color="#F87171" />
                    <Text style={styles.deleteBtnText}>{deletingRoutineId === routine.id ? 'Deleting…' : 'Delete'}</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </>
        )}

          <Button
            title="AI Program Builder"
            icon="sparkles-outline"
            variant="outline"
            onPress={() => router.push('/(client)/generate')}
            style={styles.aiBtn}
          />
        </ScrollView>
      </ClientTabSwipeView>

      {/* Day picker modal */}
      <Modal
        visible={!!pickerProgram || !!pickerRoutine}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setPickerProgram(null);
          setPickerRoutine(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setPickerProgram(null);
            setPickerRoutine(null);
          }}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{BUTTONS.assignToSchedule}</Text>
          {(pickerProgram || pickerRoutine) && (
            <Text style={styles.modalSubtitle}>{pickerProgram?.name ?? pickerRoutine?.name}</Text>
          )}

          <View style={styles.dayRow}>
            {ALL_DAYS.map((d) => {
              const active = selectedDays.includes(d);
              return (
                <Pressable
                  key={d}
                  onPress={() => toggleDay(d)}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                >
                  <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                    {d}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectedDayInsights.length > 0 && (
            <View style={styles.impactList}>
              {selectedDayInsights.map((item) => (
                <View key={item.day} style={styles.impactRow}>
                  <Text style={styles.impactDay}>{item.day}</Text>
                  <View style={styles.impactCopy}>
                    <Text style={styles.impactReason}>{item.reasonLabel}</Text>
                    <Text style={styles.impactText}>{item.impactText}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.confirmBtn, selectedDays.length === 0 && styles.confirmBtnDisabled]}
            disabled={selectedDays.length === 0 || assigning}
            onPress={handleAssign}
          >
            <Text style={styles.confirmBtnText}>
              {assigning ? 'Assigning…' : `Assign to ${selectedDays.length} day${selectedDays.length !== 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
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
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  createRoutineBtn: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
    gap: spacing.xs,
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  muscles: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  diffBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  diffBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent + '15',
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  assignBtnText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  manageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manageBtnText: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  deleteBtn: {
    borderColor: '#F87171' + '60',
    backgroundColor: '#F87171' + '12',
  },
  deleteBtnText: {
    color: '#F87171',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  aiBtn: {
    marginTop: spacing.md,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000060',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
  },
  dayRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
  },
  dayChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  dayChipTextActive: {
    color: colors.accent,
  },
  impactList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  impactRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  impactDay: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    width: 28,
  },
  impactCopy: {
    flex: 1,
    gap: 2,
  },
  impactReason: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  impactText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  confirmBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
