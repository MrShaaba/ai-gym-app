import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ClientTabSwipeView } from '@/components/navigation/ClientTabSwipeView';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { useWorkoutStore } from '@/store/workoutStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { convertKgToUnit } from '@/services/units';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

export default function Statistics() {
  const router = useRouter();
  const history = useWorkoutStore((s) => s.history);
  const weightUnit = usePreferencesStore((s) => s.weightUnit);

  const totalWorkouts = history.length;
  const totalVolume = history.reduce((sum, w) => sum + w.totalVolume, 0);
  const totalSets = history.reduce((sum, w) => sum + w.totalSets, 0);
  const totalReps = history.reduce((sum, w) => sum + w.totalReps, 0);

  const totalVolumeInUnit = convertKgToUnit(totalVolume, weightUnit);

  const stats = [
    { label: 'Workouts', value: String(totalWorkouts || '—'), sub: 'all time', icon: 'barbell-outline' as const },
    { label: 'Volume', value: totalVolumeInUnit > 0 ? `${(totalVolumeInUnit / 1000).toFixed(1)}k` : '—', sub: `${weightUnit} lifted`, icon: 'trending-up-outline' as const },
    { label: 'Sets', value: String(totalSets || '—'), sub: 'completed', icon: 'layers-outline' as const },
    { label: 'Reps', value: String(totalReps || '—'), sub: 'total', icon: 'repeat-outline' as const },
  ];

  // Build recent workouts list (last 5)
  const recentWorkouts = history.slice(0, 5);
  return (
    <Screen>
      <ClientTabSwipeView routeKey="statistics">
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Statistics</Text>
          <Text style={styles.subtitle}>
            {totalWorkouts > 0 ? `${totalWorkouts} workout${totalWorkouts === 1 ? '' : 's'} completed` : 'Complete a workout to see stats'}
          </Text>

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

        <Text style={styles.sectionTitle}>Recent Workouts</Text>

        {recentWorkouts.length === 0 && (
          <Card style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No workouts yet — start one from the Workout tab!</Text>
          </Card>
        )}

          {recentWorkouts.map((w) => {
            const mins = Math.round(w.durationSeconds / 60);
            const date = new Date(w.completedAt);
            const timeAgo = getTimeAgo(date);
            return (
              <TouchableOpacity
                key={w.id}
                onPress={() => router.push({ pathname: '/(workout)/edit', params: { workoutId: w.id } })}
              >
                <Card style={styles.prCard}>
                  <View style={styles.prRow}>
                    <View style={styles.prIcon}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                    </View>
                    <View style={styles.prInfo}>
                      <Text style={styles.prExercise}>{w.routineName}</Text>
                     <Text style={styles.prDate}>{timeAgo}  ·  {mins} min  ·  {w.totalSets} sets</Text>
                   </View>
                   <Text style={styles.prValue}>{(convertKgToUnit(w.totalVolume, weightUnit) / 1000).toFixed(1)}k {weightUnit}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ClientTabSwipeView>
    </Screen>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
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
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
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
