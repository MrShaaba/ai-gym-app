import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { ExerciseGroupCard } from '@/components/workout/ExerciseGroupCard';
import { WeightUnitToggle } from '@/components/ui/WeightUnitToggle';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAuthStore } from '@/store/authStore';
import { colors, fontSize, spacing } from '@/config/theme';
import type { CompletedWorkout, ExerciseLog, SetLog, WorkoutExerciseGroupType } from '@/types/workout';

type WorkoutBlock =
  | {
      key: string;
      type: 'single';
      flatIndices: [number];
      exercise: ExerciseLog;
    }
  | {
      key: string;
      type: 'group';
      groupId: string;
      groupType: Exclude<WorkoutExerciseGroupType, 'single'>;
      flatIndices: number[];
      exercises: ExerciseLog[];
    };

function buildWorkoutBlocks(exercises: ExerciseLog[]): WorkoutBlock[] {
  const blocks: WorkoutBlock[] = [];
  const seenGroups = new Set<string>();

  exercises.forEach((exercise, index) => {
    if (exercise.groupId && exercise.groupType && exercise.groupType !== 'single') {
      if (seenGroups.has(exercise.groupId)) return;

      const grouped = exercises
        .map((item, flatIndex) => ({ item, flatIndex }))
        .filter(({ item }) => item.groupId === exercise.groupId)
        .sort((left, right) => (left.item.groupOrder ?? 0) - (right.item.groupOrder ?? 0));

      seenGroups.add(exercise.groupId);

      blocks.push({
        key: `group-${exercise.groupId}`,
        type: 'group',
        groupId: exercise.groupId,
        groupType: exercise.groupType,
        flatIndices: grouped.map(({ flatIndex }) => flatIndex),
        exercises: grouped.map(({ item }) => item),
      });
      return;
    }

    blocks.push({
      key: `single-${exercise.exerciseId}-${index}`,
      type: 'single',
      flatIndices: [index],
      exercise,
    });
  });

  return blocks;
}

function cloneWorkout(workout: CompletedWorkout): CompletedWorkout {
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((setLog) => ({ ...setLog })),
    })),
  };
}

export default function EditWorkoutScreen() {
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const history = useWorkoutStore((s) => s.history);
  const saveCompletedWorkoutEdits = useWorkoutStore((s) => s.saveCompletedWorkoutEdits);
  const workout = history.find((item) => item.id === workoutId) ?? null;

  const [draft, setDraft] = useState<CompletedWorkout | null>(workout ? cloneWorkout(workout) : null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workout) {
      setDraft(cloneWorkout(workout));
    }
  }, [workout]);

  const workoutBlocks = useMemo(() => (draft ? buildWorkoutBlocks(draft.exercises) : []), [draft]);

  if (!draft) {
    return (
      <Screen style={styles.empty}>
        <Text style={styles.emptyText}>Workout not found</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const updateSet = (exerciseIndex: number, setIndex: number, data: Partial<SetLog>) => {
    setDraft((current) => {
      if (!current) return current;
      const exercises = [...current.exercises];
      const sets = [...exercises[exerciseIndex].sets];
      sets[setIndex] = { ...sets[setIndex], ...data };
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
      return { ...current, exercises };
    });
  };

  const toggleSetComplete = (exerciseIndex: number, setIndex: number) => {
    setDraft((current) => {
      if (!current) return current;
      const exercises = [...current.exercises];
      const sets = [...exercises[exerciseIndex].sets];
      sets[setIndex] = { ...sets[setIndex], completed: !sets[setIndex].completed };
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
      return { ...current, exercises };
    });
  };

  const addSet = (exerciseIndex: number) => {
    setDraft((current) => {
      if (!current) return current;
      const exercises = [...current.exercises];
      const lastSet = exercises[exerciseIndex].sets[exercises[exerciseIndex].sets.length - 1];
      const nextSet: SetLog = lastSet ? { ...lastSet, completed: false } : { reps: 10, weight: 0, completed: false };
      exercises[exerciseIndex] = {
        ...exercises[exerciseIndex],
        sets: [...exercises[exerciseIndex].sets, nextSet],
      };
      return { ...current, exercises };
    });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setDraft((current) => {
      if (!current) return current;
      const exercises = [...current.exercises];
      if (exercises[exerciseIndex].sets.length <= 1) return current;
      exercises[exerciseIndex] = {
        ...exercises[exerciseIndex],
        sets: exercises[exerciseIndex].sets.filter((_, index) => index !== setIndex),
      };
      return { ...current, exercises };
    });
  };

  const addGroupRound = (exerciseIndexes: number[]) => {
    setDraft((current) => {
      if (!current) return current;
      const exercises = [...current.exercises];
      exerciseIndexes.forEach((exerciseIndex) => {
        const lastSet = exercises[exerciseIndex].sets[exercises[exerciseIndex].sets.length - 1];
        const nextSet: SetLog = lastSet ? { ...lastSet, completed: false } : { reps: 10, weight: 0, completed: false };
        exercises[exerciseIndex] = {
          ...exercises[exerciseIndex],
          sets: [...exercises[exerciseIndex].sets, nextSet],
        };
      });
      return { ...current, exercises };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCompletedWorkoutEdits(userId, draft);
      router.back();
    } catch (error) {
      Alert.alert('Save failed', 'Could not update workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.title}>Edit Workout</Text>
            <WeightUnitToggle />
          </View>
          <Text style={styles.subtitle}>Duration stays frozen at {Math.round(draft.durationSeconds / 60)} min.</Text>
        </View>

        {workoutBlocks.map((block, blockIndex) => {
          if (block.type === 'group') {
            return (
              <ExerciseGroupCard
                key={block.key}
                groupType={block.groupType}
                exercises={block.exercises.map((exercise, index) => ({
                  exerciseLog: exercise,
                  flatIndex: block.flatIndices[index],
                }))}
                isActive={blockIndex === activeIndex}
                onPress={() => setActiveIndex(blockIndex)}
                onUpdateSet={(flatExerciseIndex, setIndex, data) => updateSet(flatExerciseIndex, setIndex, data)}
                onToggleSet={(flatExerciseIndex, setIndex) => toggleSetComplete(flatExerciseIndex, setIndex)}
                onAddRound={() => addGroupRound(block.flatIndices)}
              />
            );
          }

          return (
            <ExerciseCard
              key={block.key}
              exerciseLog={block.exercise}
              exerciseIndex={blockIndex}
              isActive={blockIndex === activeIndex}
              onPress={() => setActiveIndex(blockIndex)}
              onUpdateSet={(setIndex, data) => updateSet(block.flatIndices[0], setIndex, data)}
              onToggleSet={(setIndex) => toggleSetComplete(block.flatIndices[0], setIndex)}
              onAddSet={() => addSet(block.flatIndices[0])}
              onRemoveSet={(setIndex) => removeSet(block.flatIndices[0], setIndex)}
            />
          );
        })}

        <Button
          title={saving ? 'Saving…' : 'Save Changes'}
          onPress={handleSave}
          disabled={saving}
          style={styles.saveBtn}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
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
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  saveBtn: {
    marginTop: spacing.lg,
  },
});