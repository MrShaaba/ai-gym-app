import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const mockPrograms = [
  { id: '1', name: 'Marko\'s Strength Foundation', clients: 4, weeks: 8, difficulty: 'Beginner', muscles: 'Full Body, Compound Lifts' },
  { id: '2', name: 'Hypertrophy Blueprint', clients: 3, weeks: 12, difficulty: 'Intermediate', muscles: 'Chest, Back, Legs, Arms' },
  { id: '3', name: 'Competition Prep Elite', clients: 1, weeks: 16, difficulty: 'Advanced', muscles: 'Squat, Bench, Deadlift' },
];

const difficultyColor: Record<string, string> = {
  Beginner: '#4ADE80',
  Intermediate: '#FACC15',
  Advanced: '#F87171',
};

export default function TrainerPrograms() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Programs</Text>
        <Text style={styles.subtitle}>{mockPrograms.length} programs created</Text>

        {mockPrograms.map((p) => (
          <Card key={p.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{p.name}</Text>
              <View style={[styles.badge, { backgroundColor: difficultyColor[p.difficulty] + '20' }]}>
                <Text style={[styles.badgeText, { color: difficultyColor[p.difficulty] }]}>
                  {p.difficulty}
                </Text>
              </View>
            </View>
            <Text style={styles.muscles}>{p.muscles}</Text>
            <Text style={styles.meta}>
              {p.weeks} weeks  ·  {p.clients} client{p.clients !== 1 ? 's' : ''} assigned
            </Text>
          </Card>
        ))}

        <Button title="Create New Program" icon="add-outline" onPress={() => {}} style={styles.createBtn} />
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
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
  muscles: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  createBtn: {
    marginTop: spacing.md,
  },
});
