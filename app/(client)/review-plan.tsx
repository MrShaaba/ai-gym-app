import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { saveGeneratedPlan } from '@/services/programs';
import { useAuthStore } from '@/store/authStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { GeneratedPlan, GeneratedRoutine } from '@/types/generation';
import type { WorkoutExercise } from '@/types/workout';

function ExerciseCard({ exercise, index }: { exercise: WorkoutExercise; index: number }) {
  const repsSummary = exercise.sets.length > 0
    ? exercise.sets.map((s) => s.reps).join('/')
    : '—';
  const restSec = exercise.sets[0]?.restSeconds;

  return (
    <View style={styles.exerciseRow}>
      <View style={styles.exerciseIndex}>
        <Text style={styles.exerciseIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
        <Text style={styles.exerciseDetail}>
          {exercise.sets.length} sets × {repsSummary} reps
          {restSec ? ` · ${restSec}s rest` : ''}
        </Text>
      </View>
    </View>
  );
}

function RoutineSection({ routine, index }: { routine: GeneratedRoutine; index: number }) {
  return (
    <Card style={styles.routineCard}>
      <View style={styles.routineHeader}>
        <Text style={styles.routineName}>{routine.name}</Text>
        <View style={styles.routineMeta}>
          <Badge label={routine.difficulty} />
          <Text style={styles.routineDuration}>{routine.durationMinutes} min</Text>
        </View>
      </View>
      {routine.exercises.map((ex, i) => (
        <ExerciseCard key={`${index}-${i}`} exercise={ex} index={i} />
      ))}
    </Card>
  );
}

export default function ReviewPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plan: string }>();
  const userId = useAuthStore((s) => s.profile?.id);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  let plan: GeneratedPlan | null = null;
  try {
    plan = params.plan ? JSON.parse(params.plan) : null;
  } catch {
    plan = null;
  }

  if (!plan) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.errorText}>No plan data found.</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const handleSave = async () => {
    if (!userId || !plan) return;
    setSaving(true);
    try {
      await saveGeneratedPlan(userId, plan);
      setSaved(true);
      Alert.alert('Saved!', 'Your AI plan has been added to your programs.', [
        { text: 'View Programs', onPress: () => router.replace('/(client)/programs') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Review Plan</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* AI badge */}
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={14} color={colors.accent} />
          <Text style={styles.aiBadgeText}>AI Generated · {plan.model}</Text>
        </View>

        {/* Plan summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planGoal}>{plan.goal}</Text>
          <Text style={styles.planSummary}>{plan.summary}</Text>
          <View style={styles.planMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {plan.horizon === 'today'
                  ? 'Single workout'
                  : plan.horizon === 'week'
                    ? `${plan.daysPerWeek} days/week`
                    : `${plan.daysPerWeek} days/week · 4 weeks`}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="barbell-outline" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>{plan.routines.length} routines</Text>
            </View>
          </View>
        </Card>

        {/* Routines */}
        {plan.routines.map((routine, i) => (
          <RoutineSection key={i} routine={routine} index={i} />
        ))}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title={saved ? 'Saved!' : saving ? 'Saving…' : 'Save to My Programs'}
            icon={saved ? 'checkmark-circle' : 'download-outline'}
            onPress={handleSave}
            disabled={saving || saved}
            style={styles.saveBtn}
          />
          <Button
            title="Regenerate"
            icon="refresh-outline"
            onPress={() => router.back()}
            variant="outline"
            style={styles.regenBtn}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl + 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'center',
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  aiBadgeText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  planTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  planGoal: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  planSummary: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  planMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  routineCard: {
    marginBottom: spacing.md,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  routineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routineDuration: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exerciseIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  exerciseIndexText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  exerciseDetail: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  exerciseNotes: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontStyle: 'italic',
    marginTop: 2,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  saveBtn: {},
  regenBtn: {},
});
