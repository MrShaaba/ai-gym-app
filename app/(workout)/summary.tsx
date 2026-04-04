import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWorkoutStore } from '@/store/workoutStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatVolume(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${kg.toLocaleString()} kg`;
}

export default function WorkoutSummary() {
  const router = useRouter();
  const history = useWorkoutStore((s) => s.history);
  const latest = history[0] ?? null;

  if (!latest) {
    return (
      <Screen style={styles.empty}>
        <Text style={styles.emptyText}>No workout data</Text>
        <Button title="Go Back" onPress={() => router.replace('/(client)/workout')} />
      </Screen>
    );
  }

  const stats = [
    { label: 'Duration', value: formatDuration(latest.durationSeconds), icon: 'time-outline' as const },
    { label: 'Volume', value: formatVolume(latest.totalVolume), icon: 'barbell-outline' as const },
    { label: 'Sets', value: String(latest.totalSets), icon: 'layers-outline' as const },
    { label: 'Reps', value: String(latest.totalReps), icon: 'repeat-outline' as const },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color={colors.background} />
          </View>
          <Text style={styles.title}>Workout Complete!</Text>
          <Text style={styles.routineName}>{latest.routineName}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={20} color={colors.accent} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Exercise breakdown */}
        <Text style={styles.sectionTitle}>Exercise Breakdown</Text>
        {latest.exercises.map((ex) => {
          const completedSets = ex.sets.filter((s) => s.completed);
          const bestSet = completedSets.reduce<{ reps: number; weight: number } | null>((best, s) => {
            const vol = s.reps * s.weight;
            if (!best || vol > best.reps * best.weight) return s;
            return best;
          }, null);
          return (
            <Card key={ex.exerciseId} style={styles.exCard}>
              <View style={styles.exRow}>
                <View style={styles.exInfo}>
                  <Text style={styles.exName}>{ex.exerciseName}</Text>
                  <Text style={styles.exMeta}>
                    {completedSets.length}/{ex.sets.length} sets completed
                  </Text>
                </View>
                {bestSet && (
                  <View style={styles.bestSet}>
                    <Text style={styles.bestLabel}>BEST</Text>
                    <Text style={styles.bestValue}>{bestSet.weight} kg × {bestSet.reps}</Text>
                  </View>
                )}
              </View>
            </Card>
          );
        })}

        <Button
          title="Done"
          onPress={() => router.replace('/(client)/workout')}
          style={styles.doneBtn}
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
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  routineName: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  exCard: {
    marginBottom: spacing.sm,
  },
  exRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exInfo: {
    flex: 1,
  },
  exName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  exMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  bestSet: {
    alignItems: 'flex-end',
  },
  bestLabel: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bestValue: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  doneBtn: {
    marginTop: spacing.xl,
  },
});
