import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const mockPrograms = [
  { id: '1', name: 'Beginner Strength', weeks: 8, difficulty: 'Beginner', days: 3 },
  { id: '2', name: 'Hypertrophy Split', weeks: 12, difficulty: 'Intermediate', days: 5 },
  { id: '3', name: 'Powerlifting Peak', weeks: 6, difficulty: 'Advanced', days: 4 },
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

        {mockPrograms.map((p) => (
          <Card key={p.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.meta}>
                  {p.weeks} weeks · {p.days} days/week
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: difficultyColor[p.difficulty] + '20' }]}>
                <Text style={[styles.badgeText, { color: difficultyColor[p.difficulty] }]}>
                  {p.difficulty}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        <Button
          title="AI Program Builder"
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
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
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
  aiBtn: {
    marginTop: spacing.md,
  },
});
