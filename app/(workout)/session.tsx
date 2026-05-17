import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/workout/ProgressBar';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { ExerciseGroupCard } from '@/components/workout/ExerciseGroupCard';
import { RestTimer } from '@/components/workout/RestTimer';
import { ReflectionSheet } from '@/components/workout/ReflectionSheet';
import { WeightUnitToggle } from '@/components/ui/WeightUnitToggle';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useAuthStore } from '@/store/authStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { ExerciseLog, WorkoutExerciseGroupType, WorkoutReflection } from '@/types/workout';

const REST_SECONDS = 90;

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

function isWorkoutBlockComplete(block: WorkoutBlock) {
  if (block.type === 'single') {
    return block.exercise.sets.every((set) => set.completed);
  }

  const roundCount = block.exercises[0]?.sets.length ?? 0;
  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    if (!block.exercises.every((exercise) => exercise.sets[roundIndex]?.completed)) {
      return false;
    }
  }

  return roundCount > 0;
}

function getElapsedSeconds(session: NonNullable<ReturnType<typeof useWorkoutStore.getState>['activeSession']>) {
  const baseSeconds = session.elapsedSeconds ?? 0;
  if ((session.status ?? 'running') === 'paused') {
    return baseSeconds;
  }

  const resumedAt = session.lastResumedAt ?? session.startedAt;
  return baseSeconds + Math.max(0, Math.floor((Date.now() - resumedAt) / 1000));
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function WorkoutSession() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const session = useWorkoutStore((s) => s.activeSession);
  const restTimerEnd = useWorkoutStore((s) => s.restTimerEnd);
  const goToExercise = useWorkoutStore((s) => s.goToExercise);
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const toggleSetComplete = useWorkoutStore((s) => s.toggleSetComplete);
  const addSet = useWorkoutStore((s) => s.addSet);
  const addGroupRound = useWorkoutStore((s) => s.addGroupRound);
  const removeSet = useWorkoutStore((s) => s.removeSet);
  const startRestTimer = useWorkoutStore((s) => s.startRestTimer);
  const clearRestTimer = useWorkoutStore((s) => s.clearRestTimer);
  const finishWorkout = useWorkoutStore((s) => s.finishWorkout);
  const cancelWorkout = useWorkoutStore((s) => s.cancelWorkout);
  const pauseWorkout = useWorkoutStore((s) => s.pauseWorkout);
  const resumeWorkout = useWorkoutStore((s) => s.resumeWorkout);
  const restartWorkout = useWorkoutStore((s) => s.restartWorkout);
  const setActiveSessionAssignmentStatus = useWorkoutStore((s) => s.setActiveSessionAssignmentStatus);
  const updateAssignmentStatus = useAssignmentStore((s) => s.updateAssignmentStatus);

  const [elapsedDisplay, setElapsedDisplay] = useState('0:00');
  const [showReflection, setShowReflection] = useState(false);

  React.useEffect(() => {
    if (!session) return;
    const tick = () => {
      setElapsedDisplay(formatElapsed(getElapsedSeconds(session)));
    };
    tick();
    if ((session.status ?? 'running') === 'paused') return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  React.useEffect(() => {
    if (!session?.assignmentId || session.assignmentStatus !== 'assigned') return;

    setActiveSessionAssignmentStatus('in_progress');

    void updateAssignmentStatus(session.assignmentId, 'in_progress').catch((error) => {
      console.warn('[WorkoutSession] failed to mark assignment in progress', error);
      Alert.alert(
        'Assignment Sync Delayed',
        'The workout started, but we could not update the assignment status right now.',
      );
    });
  }, [
    session?.assignmentId,
    session?.assignmentStatus,
    setActiveSessionAssignmentStatus,
    updateAssignmentStatus,
  ]);

  const workoutBlocks = useMemo(() => {
    if (!session) return [] as WorkoutBlock[];
    return buildWorkoutBlocks(session.exercises);
  }, [session]);

  const completedBlocks = useMemo(
    () => workoutBlocks.filter((block) => isWorkoutBlockComplete(block)).length,
    [workoutBlocks],
  );

  const handleFinish = useCallback(() => {
    setShowReflection(true);
  }, []);

  const handleReflection = useCallback((reflection?: WorkoutReflection) => {
    const linkedAssignmentId = session?.assignmentId;
    const result = finishWorkout(userId, reflection);
    setShowReflection(false);
    if (result) {
      if (linkedAssignmentId) {
        void updateAssignmentStatus(linkedAssignmentId, 'completed').catch((error) => {
          console.warn('[WorkoutSession] failed to mark assignment completed', error);
          Alert.alert(
            'Workout Saved',
            'Your workout was completed, but the assignment status could not be updated right now.',
          );
        });
      }
      router.replace('/(workout)/summary');
    }
  }, [finishWorkout, router, session?.assignmentId, updateAssignmentStatus, userId]);

  const handleReflectionSkip = useCallback(() => {
    handleReflection(undefined);
  }, [handleReflection]);

  const handleCancel = useCallback(() => {
    const linkedAssignmentId = session?.assignmentId;
    const linkedAssignmentStatus = session?.assignmentStatus;
    if (linkedAssignmentId && linkedAssignmentStatus === 'in_progress') {
      setActiveSessionAssignmentStatus('assigned');
      void updateAssignmentStatus(linkedAssignmentId, 'assigned').catch((error) => {
        console.warn('[WorkoutSession] failed to roll back assignment on cancel', error);
      });
    }
    cancelWorkout();
    router.replace('/(client)/workout');
  }, [cancelWorkout, router, session?.assignmentId, session?.assignmentStatus, setActiveSessionAssignmentStatus, updateAssignmentStatus]);

  const handlePause = useCallback(() => {
    pauseWorkout();
    router.replace('/(client)/workout');
  }, [pauseWorkout, router]);

  const handleResume = useCallback(() => {
    resumeWorkout();
  }, [resumeWorkout]);

  const handleRestart = useCallback(() => {
    Alert.alert(
      'Restart Workout',
      'Restarting will clear recorded sets and rounds for this workout session. This cannot be undone.',
      [
        { text: 'Keep Workout', style: 'cancel' },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: () => restartWorkout(),
        },
      ],
    );
  }, [restartWorkout]);

  if (!session) {
    return (
      <Screen style={styles.empty}>
        <Text style={styles.emptyText}>No active workout</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const currentIndex = session.currentExerciseIndex;
  const total = workoutBlocks.length;
  const isLast = currentIndex === total - 1;

  return (
    <>
      <Screen edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.routineName} numberOfLines={1}>{session.routineName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 }}>
            <Text style={styles.elapsed}>{elapsedDisplay}</Text>
            <WeightUnitToggle />
          </View>
          {session.status === 'paused' ? <Text style={styles.statusLabel}>Paused</Text> : null}
        </View>
        <TouchableOpacity onPress={handleFinish} style={styles.headerBtn}>
          <Text style={styles.finishLabel}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <ProgressBar current={completedBlocks} total={total} />
        <Text style={styles.progressText}>
          Block {Math.min(currentIndex + 1, Math.max(total, 1))} of {total}
        </Text>
      </View>

      <View style={styles.lifecycleRow}>
        <Button
          title={session.status === 'paused' ? 'Resume Workout' : 'Pause Workout'}
          variant="secondary"
          onPress={session.status === 'paused' ? handleResume : handlePause}
          style={styles.lifecycleBtn}
        />
        <Button
          title="Restart"
          variant="outline"
          onPress={handleRestart}
          style={styles.lifecycleBtn}
        />
      </View>

      {/* Rest Timer */}
      {restTimerEnd && (
        <View style={styles.timerWrap}>
          <RestTimer endTime={restTimerEnd} onDismiss={clearRestTimer} />
        </View>
      )}

      {/* Exercises */}
      <ScrollView contentContainerStyle={styles.body}>
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
                isActive={blockIndex === currentIndex}
                onPress={() => goToExercise(blockIndex)}
                onUpdateSet={(flatExerciseIndex, setIndex, data) => updateSet(flatExerciseIndex, setIndex, data)}
                onToggleSet={(flatExerciseIndex, setIndex) => toggleSetComplete(flatExerciseIndex, setIndex)}
                onAddRound={() => addGroupRound(block.flatIndices)}
                onRestTimer={() => startRestTimer(REST_SECONDS)}
              />
            );
          }

          return (
            <ExerciseCard
              key={block.key}
              exerciseLog={block.exercise}
              exerciseIndex={blockIndex}
              isActive={blockIndex === currentIndex}
              onPress={() => goToExercise(blockIndex)}
              onUpdateSet={(setIndex, data) => updateSet(block.flatIndices[0], setIndex, data)}
              onToggleSet={(setIndex) => toggleSetComplete(block.flatIndices[0], setIndex)}
              onAddSet={() => addSet(block.flatIndices[0])}
              onRemoveSet={(setIndex) => removeSet(block.flatIndices[0], setIndex)}
              onRestTimer={() => startRestTimer(REST_SECONDS)}
            />
          );
        })}
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.bottomBar}>
        <Button
          title="Previous"
          variant="secondary"
          icon="arrow-back"
          onPress={() => goToExercise(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          style={styles.navBtn}
        />
        {isLast ? (
          <Button
            title="Finish Workout"
            icon="checkmark-done"
            onPress={handleFinish}
            style={styles.navBtn}
          />
        ) : (
          <Button
            title="Next Exercise"
            icon="arrow-forward"
            onPress={() => goToExercise(currentIndex + 1)}
            style={styles.navBtn}
          />
        )}
      </View>
      </Screen>
      <ReflectionSheet
        visible={showReflection}
        onSubmit={handleReflection}
        onSkip={handleReflectionSkip}
      />
    </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    padding: spacing.sm,
  },
  headerCenter: {
    alignItems: 'center',
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  elapsed: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  statusLabel: {
    color: colors.warning,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.xs,
  },
  finishLabel: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  progressSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  lifecycleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  lifecycleBtn: {
    flex: 1,
  },
  progressText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerWrap: {
    paddingHorizontal: spacing.lg,
  },
  body: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  navBtn: {
    flex: 1,
  },
});
