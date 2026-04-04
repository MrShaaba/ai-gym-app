import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const stats = [
  { label: 'Workouts', value: '24', sub: 'this month' },
  { label: 'Volume', value: '42,800', sub: 'kg lifted' },
  { label: 'Streak', value: '7', sub: 'days' },
  { label: 'PR Count', value: '3', sub: 'this week' },
];

const recentPRs = [
  { exercise: 'Bench Press', value: '100 kg', date: 'Today' },
  { exercise: 'Squat', value: '140 kg', date: 'Yesterday' },
  { exercise: 'Deadlift', value: '180 kg', date: '3 days ago' },
];

export default function Statistics() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Statistics</Text>

        <View style={styles.grid}>
          {stats.map((s) => (
            <Card key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statSub}>{s.sub}</Text>
            </Card>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent PRs</Text>

        {recentPRs.map((pr) => (
          <Card key={pr.exercise} style={styles.prCard}>
            <View style={styles.prRow}>
              <View>
                <Text style={styles.prExercise}>{pr.exercise}</Text>
                <Text style={styles.prDate}>{pr.date}</Text>
              </View>
              <Text style={styles.prValue}>{pr.value}</Text>
            </View>
          </Card>
        ))}

        <Card style={styles.chartPlaceholder}>
          <Text style={styles.chartText}>📊 Charts coming in Phase 2</Text>
        </Card>
      </ScrollView>
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
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statValue: {
    color: colors.accent,
    fontSize: fontSize.hero,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  statSub: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  prCard: {
    marginBottom: spacing.sm,
  },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prExercise: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  prDate: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  prValue: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  chartPlaceholder: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  chartText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
});
