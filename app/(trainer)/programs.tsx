import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const mockPrograms = [
  { id: '1', name: 'Fat Loss Fundamentals', clients: 4, weeks: 8, difficulty: 'Beginner' },
  { id: '2', name: 'Hypertrophy Pro', clients: 3, weeks: 12, difficulty: 'Intermediate' },
  { id: '3', name: 'Competition Prep', clients: 1, weeks: 16, difficulty: 'Advanced' },
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
        <View style={styles.header}>
          <Text style={styles.title}>Programs</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Ionicons name="add" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>

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
            <Text style={styles.meta}>
              {p.weeks} weeks · {p.clients} client{p.clients !== 1 ? 's' : ''} assigned
            </Text>
          </Card>
        ))}

        <Button title="Create New Program" onPress={() => {}} style={styles.createBtn} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
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
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  createBtn: {
    marginTop: spacing.md,
  },
});
