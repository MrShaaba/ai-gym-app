import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useRoutines } from '@/hooks/useRoutines';
import { deleteProgram, deleteRoutine } from '@/services/programs';
import { deleteFutureTrainerAssignmentsForRoutines } from '@/services/assignments';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useUserId } from '@/hooks/useUserId';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const difficultyColor: Record<string, string> = {
  beginner: '#4ADE80',
  intermediate: '#FACC15',
  advanced: '#F87171',
};

export default function ProgramDetail() {
  const { id, name, difficulty, daysPerWeek } = useLocalSearchParams<{
    id: string;
    name: string;
    difficulty: string;
    daysPerWeek: string;
  }>();
  const router = useRouter();
  const trainerId = useUserId();
  const { routines, loading, refetch } = useRoutines(id);
  const hydrateAssignments = useAssignmentStore((s) => s.hydrate);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteProgram = () => {
    Alert.alert(
      'Delete Program',
      `Are you sure you want to delete "${name}"? This will also delete all routines in it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              if (trainerId) {
                await deleteFutureTrainerAssignmentsForRoutines(
                  trainerId,
                  routines.map((routine) => routine.id),
                );
              }
              await deleteProgram(id!);
              if (trainerId) {
                await hydrateAssignments('trainer', trainerId);
              }
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to delete program.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteRoutine = (routineId: string, routineName: string) => {
    Alert.alert('Delete Routine', `Delete "${routineName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (trainerId) {
              await deleteFutureTrainerAssignmentsForRoutines(trainerId, [routineId]);
            }
            await deleteRoutine(routineId);
            if (trainerId) {
              await hydrateAssignments('trainer', trainerId);
            }
            refetch();
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Failed to delete routine.');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          <Text style={styles.backText}>Programs</Text>
        </TouchableOpacity>

        {/* Program Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{name}</Text>
          <View style={styles.metaRow}>
            {difficulty && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: (difficultyColor[difficulty] ?? colors.accent) + '20' },
                ]}
              >
                <Text
                  style={[styles.badgeText, { color: difficultyColor[difficulty] ?? colors.accent }]}
                >
                  {difficulty}
                </Text>
              </View>
            )}
            {daysPerWeek && (
              <Text style={styles.meta}>{daysPerWeek} days/week</Text>
            )}
          </View>
        </View>

        {/* Routines */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Routines ({routines.length})
          </Text>
          <Button
            title="Add Routine"
            icon="add-outline"
            variant="outline"
            onPress={() =>
              router.push({
                pathname: '/(trainer)/create-routine',
                params: { programId: id!, programName: name! },
              })
            }
            style={styles.addBtn}
          />
        </View>

        {loading && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Loading routines…</Text>
          </Card>
        )}

        {!loading && routines.length === 0 && (
          <Card style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyText}>No routines yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first routine to this program.
            </Text>
          </Card>
        )}

        {routines.map((r) => (
          <Card key={r.id} style={styles.routineCard}>
            <View style={styles.routineRow}>
              <View style={styles.routineInfo}>
                <Text style={styles.routineName}>{r.name}</Text>
                <Text style={styles.routineMeta}>
                  {(r.exercises_json ?? []).length} exercises  ·  {r.duration_minutes} min
                </Text>
                <Badge
                  label={r.difficulty}
                  color={difficultyColor[r.difficulty] ?? colors.accent}
                  size="sm"
                />
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteRoutine(r.id, r.name)}
              >
                <Ionicons name="trash-outline" size={18} color="#F87171" />
              </TouchableOpacity>
            </View>

            {/* Exercise list preview */}
            {(r.exercises_json ?? []).slice(0, 4).map((ex, i) => (
              <Text key={i} style={styles.exercisePreview}>
                • {ex.exercise.name} — {ex.sets.length} sets
              </Text>
            ))}
            {(r.exercises_json ?? []).length > 4 && (
              <Text style={styles.moreExercises}>
                +{(r.exercises_json ?? []).length - 4} more
              </Text>
            )}
          </Card>
        ))}

        {/* Delete Program */}
        <Button
          title={deleting ? 'Deleting…' : 'Delete Program'}
          icon="trash-outline"
          variant="outline"
          onPress={handleDeleteProgram}
          disabled={deleting || loading}
          style={styles.deleteProgramBtn}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  backText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addBtn: {
    paddingHorizontal: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  routineCard: {
    marginBottom: spacing.md,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  routineInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  routineMeta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  deleteBtn: {
    padding: spacing.sm,
  },
  exercisePreview: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  moreExercises: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  deleteProgramBtn: {
    marginTop: spacing.xl,
    borderColor: '#F87171',
  },
});
