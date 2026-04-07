import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Pressable } from 'react-native';
import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PlanBadge } from '@/components/ui/PlanBadge';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useUserId } from '@/hooks/useUserId';
import { usePrograms } from '@/hooks/usePrograms';
import { fetchRoutines, type ProgramRow } from '@/services/programs';
import { BUTTONS, CONFIRM, HELPER, EMPTY } from '@/config/copy';
import type { DayOfWeek, AssignmentSource } from '@/types/assignment';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const difficultyColor: Record<string, string> = {
  beginner: '#4ADE80',
  intermediate: '#FACC15',
  advanced: '#F87171',
};

export default function Programs() {
  const router = useRouter();
  const userId = useUserId();
  const { programs, loading } = usePrograms('client', userId);
  const allAssignments = useAssignmentStore((s) => s.assignments);
  const selfAssign = useAssignmentStore((s) => s.selfAssign);
  const assignments = useMemo(
    () => allAssignments.filter((a) => a.clientId === userId),
    [allAssignments, userId],
  );

  const [pickerProgram, setPickerProgram] = useState<ProgramRow | null>(null);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [assigning, setAssigning] = useState(false);

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

  const handleAssign = async () => {
    if (!pickerProgram || !userId || selectedDays.length === 0) return;
    setAssigning(true);
    try {
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>My Plans</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Loading…' : HELPER.planIntro}
        </Text>

        {!loading && programs.length === 0 && (
          <Card style={styles.card}>
            <Text style={styles.emptyText}>{EMPTY.noPlansCTA}</Text>
          </Card>
        )}

        {programs.map((p) => {
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

        <Button
          title="AI Program Builder"
          icon="sparkles-outline"
          variant="outline"
          onPress={() => router.push('/(client)/generate')}
          style={styles.aiBtn}
        />
      </ScrollView>

      {/* Day picker modal */}
      <Modal
        visible={!!pickerProgram}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerProgram(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerProgram(null)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{BUTTONS.assignToSchedule}</Text>
          {pickerProgram && (
            <Text style={styles.modalSubtitle}>{pickerProgram.name}</Text>
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
