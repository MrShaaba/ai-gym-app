import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/workout/ProgressBar';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { RestTimer } from '@/components/workout/RestTimer';
import { useWorkoutStore } from '@/store/workoutStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const REST_SECONDS = 90;

export default function WorkoutSession() {
  const router = useRouter();
  const session = useWorkoutStore((s) => s.activeSession);
  const restTimerEnd = useWorkoutStore((s) => s.restTimerEnd);
  const goToExercise = useWorkoutStore((s) => s.goToExercise);
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const toggleSetComplete = useWorkoutStore((s) => s.toggleSetComplete);
  const addSet = useWorkoutStore((s) => s.addSet);
  const removeSet = useWorkoutStore((s) => s.removeSet);
  const startRestTimer = useWorkoutStore((s) => s.startRestTimer);
  const clearRestTimer = useWorkoutStore((s) => s.clearRestTimer);
  const finishWorkout = useWorkoutStore((s) => s.finishWorkout);
  const cancelWorkout = useWorkoutStore((s) => s.cancelWorkout);

  const [elapsedDisplay, setElapsedDisplay] = useState('0:00');

  React.useEffect(() => {
    if (!session) return;
    const tick = () => {
      const secs = Math.floor((Date.now() - session.startedAt) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      setElapsedDisplay(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session?.startedAt]);

  const completedExercises = useMemo(() => {
    if (!session) return 0;
    return session.exercises.filter((e) => e.sets.every((s) => s.completed)).length;
  }, [session]);

  const handleFinish = useCallback(() => {
    const result = finishWorkout();
    if (result) {
      router.replace('/(workout)/summary');
    }
  }, [finishWorkout, router]);

  const handleCancel = useCallback(() => {
    Alert.alert('Cancel Workout', 'Are you sure? Progress will be lost.', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: () => {
          cancelWorkout();
          router.back();
        },
      },
    ]);
  }, [cancelWorkout, router]);

  if (!session) {
    return (
      <Screen style={styles.empty}>
        <Text style={styles.emptyText}>No active workout</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const currentIndex = session.currentExerciseIndex;
  const total = session.exercises.length;
  const isLast = currentIndex === total - 1;

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.routineName} numberOfLines={1}>{session.routineName}</Text>
          <Text style={styles.elapsed}>{elapsedDisplay}</Text>
        </View>
        <TouchableOpacity onPress={handleFinish} style={styles.headerBtn}>
          <Text style={styles.finishLabel}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <ProgressBar current={completedExercises} total={total} />
        <Text style={styles.progressText}>
          Exercise {currentIndex + 1} of {total}
        </Text>
      </View>

      {/* Rest Timer */}
      {restTimerEnd && (
        <View style={styles.timerWrap}>
          <RestTimer endTime={restTimerEnd} onDismiss={clearRestTimer} />
        </View>
      )}

      {/* Exercises */}
      <ScrollView contentContainerStyle={styles.body}>
        {session.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.exerciseId}
            exerciseLog={ex}
            exerciseIndex={i}
            isActive={i === currentIndex}
            onPress={() => goToExercise(i)}
            onUpdateSet={(si, data) => updateSet(i, si, data)}
            onToggleSet={(si) => toggleSetComplete(i, si)}
            onAddSet={() => addSet(i)}
            onRemoveSet={(si) => removeSet(i, si)}
            onRestTimer={() => startRestTimer(REST_SECONDS)}
          />
        ))}
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
