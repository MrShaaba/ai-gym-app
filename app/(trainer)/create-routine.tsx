import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EXERCISES } from '@/data/exercises';
import { createRoutine } from '@/services/programs';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { Difficulty, WorkoutExercise, Exercise } from '@/types/workout';

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const difficultyColor: Record<string, string> = {
  beginner: '#4ADE80',
  intermediate: '#FACC15',
  advanced: '#F87171',
};

export default function CreateRoutine() {
  const { programId, programName } = useLocalSearchParams<{
    programId: string;
    programName: string;
  }>();
  const router = useRouter();

  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [selectedExercises, setSelectedExercises] = useState<
    { exercise: Exercise; setsCount: number; reps: number; weight: number }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const filteredExercises = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const selectedIds = new Set(selectedExercises.map((s) => s.exercise.id));
    return EXERCISES.filter(
      (e) =>
        !selectedIds.has(e.id) &&
        (e.name.toLowerCase().includes(q) ||
          e.muscleGroups.some((mg) => mg.includes(q)) ||
          e.equipment.includes(q)),
    );
  }, [searchQuery, selectedExercises]);

  const addExercise = (exercise: Exercise) => {
    setSelectedExercises((prev) => [
      ...prev,
      { exercise, setsCount: 3, reps: 10, weight: 0 },
    ]);
    setSearchQuery('');
    setShowPicker(false);
  };

  const removeExercise = (exerciseId: string) => {
    setSelectedExercises((prev) => prev.filter((s) => s.exercise.id !== exerciseId));
  };

  const updateExercise = (
    exerciseId: string,
    field: 'setsCount' | 'reps' | 'weight',
    value: number,
  ) => {
    setSelectedExercises((prev) =>
      prev.map((s) =>
        s.exercise.id === exerciseId ? { ...s, [field]: value } : s,
      ),
    );
  };

  const canSubmit = name.trim() && selectedExercises.length > 0;

  const handleCreate = async () => {
    if (!canSubmit || !programId) return;
    setBusy(true);

    const exercises: WorkoutExercise[] = selectedExercises.map((s) => ({
      exercise: s.exercise,
      sets: Array.from({ length: s.setsCount }, () => ({
        reps: s.reps,
        weight: s.weight || undefined,
        restSeconds: 90,
      })),
    }));

    try {
      await createRoutine({
        programId,
        name: name.trim(),
        difficulty,
        durationMinutes: parseInt(durationMinutes, 10) || 45,
        exercises,
      });

      Alert.alert('Routine Created', `"${name.trim()}" has been added to ${programName}.`, [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create routine.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Routine</Text>
        <Text style={styles.subtitle}>for {programName}</Text>

        {/* Name */}
        <Text style={styles.sectionTitle}>Routine Name</Text>
        <Card style={styles.fieldCard}>
          <Input
            placeholder="e.g. Push Day — Chest Focus"
            value={name}
            onChangeText={setName}
          />
        </Card>

        {/* Difficulty */}
        <Text style={styles.sectionTitle}>Difficulty</Text>
        <View style={styles.diffRow}>
          {DIFFICULTIES.map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.diffChip,
                difficulty === d && {
                  backgroundColor: difficultyColor[d] + '20',
                  borderColor: difficultyColor[d],
                },
              ]}
              onPress={() => setDifficulty(d)}
            >
              <Text
                style={[
                  styles.diffText,
                  difficulty === d && { color: difficultyColor[d] },
                ]}
              >
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Duration */}
        <Text style={styles.sectionTitle}>Duration (minutes)</Text>
        <Card style={styles.fieldCard}>
          <Input
            placeholder="45"
            keyboardType="number-pad"
            value={durationMinutes}
            onChangeText={setDurationMinutes}
          />
        </Card>

        {/* Exercises */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Exercises ({selectedExercises.length})
          </Text>
          <TouchableOpacity onPress={() => setShowPicker(!showPicker)}>
            <Ionicons
              name={showPicker ? 'close-circle' : 'add-circle'}
              size={28}
              color={colors.accent}
            />
          </TouchableOpacity>
        </View>

        {/* Exercise picker */}
        {showPicker && (
          <Card style={styles.pickerCard}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises…"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <ScrollView style={styles.pickerList} nestedScrollEnabled>
              {filteredExercises.slice(0, 10).map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={styles.pickerItem}
                  onPress={() => addExercise(ex)}
                >
                  <View style={styles.pickerItemInfo}>
                    <Text style={styles.pickerItemName}>{ex.name}</Text>
                    <Text style={styles.pickerItemMeta}>
                      {ex.muscleGroups.slice(0, 2).join(', ')}  ·  {ex.equipment}
                    </Text>
                  </View>
                  <Ionicons name="add" size={20} color={colors.accent} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>
        )}

        {/* Selected exercises */}
        {selectedExercises.length === 0 && !showPicker && (
          <Card style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={24} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              Tap + to add exercises
            </Text>
          </Card>
        )}

        {selectedExercises.map((item, index) => (
          <Card key={item.exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseIndex}>{index + 1}</Text>
                <View>
                  <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                  <Text style={styles.exerciseMuscles}>
                    {item.exercise.muscleGroups.slice(0, 2).join(', ')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => removeExercise(item.exercise.id)}>
                <Ionicons name="close-circle" size={22} color="#F87171" />
              </TouchableOpacity>
            </View>
            <View style={styles.setConfig}>
              <View style={styles.setField}>
                <Text style={styles.setLabel}>Sets</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    onPress={() =>
                      updateExercise(item.exercise.id, 'setsCount', Math.max(1, item.setsCount - 1))
                    }
                  >
                    <Ionicons name="remove-circle-outline" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{item.setsCount}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      updateExercise(item.exercise.id, 'setsCount', Math.min(10, item.setsCount + 1))
                    }
                  >
                    <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.setField}>
                <Text style={styles.setLabel}>Reps</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    onPress={() =>
                      updateExercise(item.exercise.id, 'reps', Math.max(1, item.reps - 1))
                    }
                  >
                    <Ionicons name="remove-circle-outline" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{item.reps}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      updateExercise(item.exercise.id, 'reps', Math.min(30, item.reps + 1))
                    }
                  >
                    <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.setField}>
                <Text style={styles.setLabel}>Weight</Text>
                <TextInput
                  style={styles.weightInput}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  value={item.weight ? String(item.weight) : ''}
                  onChangeText={(v) =>
                    updateExercise(item.exercise.id, 'weight', parseInt(v, 10) || 0)
                  }
                />
              </View>
            </View>
          </Card>
        ))}

        {/* Submit */}
        <Button
          title={busy ? 'Creating…' : `Create Routine (${selectedExercises.length} exercises)`}
          icon="checkmark-circle-outline"
          onPress={handleCreate}
          disabled={!canSubmit || busy}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  fieldCard: {
    marginBottom: spacing.sm,
  },
  diffRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  diffChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  diffText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  pickerCard: {
    marginBottom: spacing.md,
    maxHeight: 300,
  },
  searchInput: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  pickerList: {
    maxHeight: 240,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  pickerItemInfo: {
    flex: 1,
  },
  pickerItemName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  pickerItemMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  exerciseCard: {
    marginBottom: spacing.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exerciseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exerciseIndex: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: '700',
    width: 24,
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  exerciseMuscles: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  setConfig: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
    paddingLeft: 32,
  },
  setField: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  setLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperValue: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  weightInput: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 2,
    width: 48,
  },
  submitBtn: {
    marginTop: spacing.xl,
  },
});
