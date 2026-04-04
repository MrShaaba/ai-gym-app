import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const stats = [
  { label: 'Workouts', value: '24', sub: 'this month', icon: 'barbell-outline' as const },
  { label: 'Volume', value: '42,800', sub: 'kg lifted', icon: 'trending-up-outline' as const },
  { label: 'Streak', value: '7', sub: 'days', icon: 'flame-outline' as const },
  { label: 'PR Count', value: '3', sub: 'this week', icon: 'trophy-outline' as const },
];

const recentPRs = [
  { exercise: 'Bench Press', value: '100 kg', date: 'Today', icon: 'arrow-up-outline' as const },
  { exercise: 'Squat', value: '140 kg', date: 'Yesterday', icon: 'arrow-up-outline' as const },
  { exercise: 'Deadlift', value: '180 kg', date: '3 days ago', icon: 'arrow-up-outline' as const },
];

const weeklyVolume = [
  { day: 'Mon', value: 0.85 },
  { day: 'Tue', value: 0.6 },
  { day: 'Wed', value: 0 },
  { day: 'Thu', value: 0.95 },
  { day: 'Fri', value: 0.4 },
  { day: 'Sat', value: 1.0 },
  { day: 'Sun', value: 0 },
];

export default function Statistics() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Statistics</Text>
        <Text style={styles.subtitle}>Your progress this month</Text>

        <View style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={20} color={colors.accent} style={styles.statIcon} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statSub}>{s.sub}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Weekly Volume</Text>
        <Card style={styles.chartCard}>
          <View style={styles.chartContainer}>
            {weeklyVolume.map((w) => (
              <View key={w.day} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.max(w.value * 100, 4)}%` },
                      w.value === 0 && styles.barEmpty,
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{w.day}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Recent PRs</Text>

        {recentPRs.map((pr) => (
          <Card key={pr.exercise} style={styles.prCard}>
            <View style={styles.prRow}>
              <View style={styles.prIcon}>
                <Ionicons name={pr.icon} size={16} color={colors.accent} />
              </View>
              <View style={styles.prInfo}>
                <Text style={styles.prExercise}>{pr.exercise}</Text>
                <Text style={styles.prDate}>{pr.date}</Text>
              </View>
              <Text style={styles.prValue}>{pr.value}</Text>
            </View>
          </Card>
        ))}
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
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: spacing.xs,
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
  chartCard: {
    marginBottom: spacing.xl,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  barTrack: {
    flex: 1,
    width: 20,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
  },
  barEmpty: {
    backgroundColor: colors.border,
  },
  barLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  prCard: {
    marginBottom: spacing.sm,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  prInfo: {
    flex: 1,
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
});
