import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DayPicker } from '@/components/ui/DayPicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchTrainerRoutines, type RoutineRow } from '@/services/programs';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useAuthStore } from '@/store/authStore';
import { useUserId } from '@/hooks/useUserId';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { DayOfWeek } from '@/types/assignment';

export default function Assign() {
  const { clientId, clientName } = useLocalSearchParams<{ clientId: string; clientName: string }>();
  const router = useRouter();
  const trainerId = useUserId();
  const trainerName = useAuthStore((s) => s.profile?.full_name);
  const createAssignment = useAssignmentStore((s) => s.createAssignment);

  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [loadingRoutines, setLoadingRoutines] = useState(true);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!trainerId) return;
    setLoadingRoutines(true);
    fetchTrainerRoutines(trainerId)
      .then(setRoutines)
      .catch(() => {})
      .finally(() => setLoadingRoutines(false));
  }, [trainerId]);

  const selectedRoutine = routines.find((r) => r.id === selectedRoutineId);
  const canSubmit = selectedRoutineId && selectedDays.length > 0;

  const handleAssign = async () => {
    if (!selectedRoutine || !clientId || !trainerId) return;

    try {
      await createAssignment({
        trainerId,
        clientId,
        routineId: selectedRoutine.id,
        routineName: selectedRoutine.name,
        scheduleDays: selectedDays,
        note: note.trim() || undefined,
        programName: trainerName ? `${trainerName}'s Program` : undefined,
        exercisesJson: selectedRoutine.exercises_json,
      });

      Alert.alert(
        'Workout Assigned',
        `"${selectedRoutine?.name}" has been assigned to ${clientName} for ${selectedDays.join(', ')}.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to assign workout. Please try again.');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Assign Workout</Text>
        <Text style={styles.subtitle}>to {clientName}</Text>

        {/* Step 1: Pick Routine */}
        <Text style={styles.sectionTitle}>1. Select Routine</Text>

        {loadingRoutines && (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.md }} />
        )}

        {!loadingRoutines && routines.length === 0 && (
          <>
            <EmptyState
              icon="barbell-outline"
              message="No routines yet. Create a program with routines first, then come back to assign."
            />
            <Button
              title="Go to Programs"
              icon="albums-outline"
              variant="outline"
              onPress={() => router.push('/(trainer)/programs')}
              style={{ marginBottom: spacing.md }}
            />
          </>
        )}

        {routines.map((routine) => {
          const isSelected = selectedRoutineId === routine.id;
          const exerciseCount = routine.exercises_json?.length ?? 0;
          return (
            <TouchableOpacity
              key={routine.id}
              onPress={() => setSelectedRoutineId(routine.id)}
            >
              <Card style={[styles.routineCard, isSelected && styles.routineCardSelected]}>
                <View style={styles.routineRow}>
                  <View style={styles.routineInfo}>
                    <Text style={styles.routineName}>{routine.name}</Text>
                    <Text style={styles.routineMeta}>
                      {exerciseCount} exercises  ·  {routine.duration_minutes} min  ·  {routine.difficulty}
                    </Text>
                  </View>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        {/* Step 2: Pick Days */}
        <Text style={styles.sectionTitle}>2. Schedule Days</Text>
        <Card style={styles.dayPickerCard}>
          <DayPicker selected={selectedDays} onChange={setSelectedDays} />
          {selectedDays.length > 0 && (
            <Text style={styles.daysSummary}>
              {selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''}/week: {selectedDays.join(', ')}
            </Text>
          )}
        </Card>

        {/* Step 3: Optional Note */}
        <Text style={styles.sectionTitle}>3. Trainer Note (Optional)</Text>
        <Card style={styles.noteCard}>
          <TextInput
            style={styles.noteInput}
            placeholder="Add coaching notes for this assignment..."
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={styles.charCount}>{note.length}/200</Text>
        </Card>

        {/* Submit */}
        <Button
          title={canSubmit ? `Assign to ${clientName}` : 'Select routine & days'}
          icon="checkmark-circle-outline"
          onPress={handleAssign}
          disabled={!canSubmit}
          style={styles.submitBtn}
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
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  routineCard: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  routineCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '08',
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routineInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  routineMeta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  dayPickerCard: {
    gap: spacing.sm,
  },
  daysSummary: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  noteCard: {
    gap: spacing.xs,
  },
  noteInput: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'right',
  },
  submitBtn: {
    marginTop: spacing.xl,
  },
});
