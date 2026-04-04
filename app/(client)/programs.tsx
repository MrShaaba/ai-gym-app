import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const mockPrograms = [
  { id: '1', name: 'Beginner Strength', weeks: 8, difficulty: 'Beginner', days: 3, muscles: 'Full Body', progress: 0.75, assignedBy: 'Marko' },
  { id: '2', name: 'Hypertrophy Split', weeks: 12, difficulty: 'Intermediate', days: 5, muscles: 'Chest, Back, Legs, Shoulders, Arms', progress: 0.3, assignedBy: 'Marko' },
  { id: '3', name: 'Powerlifting Peak', weeks: 6, difficulty: 'Advanced', days: 4, muscles: 'Squat, Bench, Deadlift', progress: 0, assignedBy: 'Marko' },
  { id: '4', name: 'Athletic Performance', weeks: 10, difficulty: 'Intermediate', days: 4, muscles: 'Legs, Core, Plyometrics', progress: 0.1, assignedBy: 'Marko' },
];

const difficultyColor: Record<string, string> = {
  Beginner: '#4ADE80',
  Intermediate: '#FACC15',
  Advanced: '#F87171',
};

export default function Programs() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Programs</Text>
        <Text style={styles.subtitle}>{mockPrograms.length} programs available</Text>

        {mockPrograms.map((p) => (
          <Card key={p.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.muscles}>{p.muscles}</Text>
                <Text style={styles.meta}>
                  {p.weeks} weeks  ·  {p.days} days/week
                </Text>
                {p.assignedBy && (
                  <View style={styles.trainerBadge}>
                    <Ionicons name="person-circle-outline" size={12} color={colors.accent} />
                    <Text style={styles.trainerText}>Assigned by {p.assignedBy}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.badge, { backgroundColor: difficultyColor[p.difficulty] + '20' }]}>
                <Text style={[styles.badgeText, { color: difficultyColor[p.difficulty] }]}>
                  {p.difficulty}
                </Text>
              </View>
            </View>
            {p.progress > 0 && (
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${p.progress * 100}%` }]} />
                </View>
                <Text style={styles.progressLabel}>{Math.round(p.progress * 100)}%</Text>
              </View>
            )}
          </Card>
        ))}

        <Button
          title="AI Program Builder"
          icon="sparkles-outline"
          variant="outline"
          onPress={() => {}}
          style={styles.aiBtn}
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
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  muscles: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
    width: 32,
    textAlign: 'right',
  },
  aiBtn: {
    marginTop: spacing.md,
  },
  trainerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  trainerText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '500',
  },
});
