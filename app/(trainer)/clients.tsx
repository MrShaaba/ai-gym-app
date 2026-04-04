import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const mockClients = [
  { id: '1', name: 'Sarah Mitchell', goal: 'Weight Loss', workouts: 18, active: true, lastActive: '2h ago' },
  { id: '2', name: 'James Kim', goal: 'Muscle Gain', workouts: 24, active: true, lastActive: '5h ago' },
  { id: '3', name: 'Lisa Torres', goal: 'General Fitness', workouts: 12, active: true, lastActive: '1d ago' },
  { id: '4', name: 'Mark Davis', goal: 'Powerlifting', workouts: 31, active: false, lastActive: '14d ago' },
];

export default function Clients() {
  const active = mockClients.filter((c) => c.active);
  const inactive = mockClients.filter((c) => !c.active);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Clients</Text>
        <Text style={styles.subtitle}>{mockClients.length} total</Text>

        <Text style={styles.sectionTitle}>Active ({active.length})</Text>
        {active.map((client) => (
          <Card key={client.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{client.name[0]}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.clientGoal}>{client.goal}</Text>
                <Text style={styles.lastActive}>Active {client.lastActive}</Text>
              </View>
              <View style={styles.workoutBadge}>
                <Text style={styles.workoutCount}>{client.workouts}</Text>
                <Text style={styles.workoutLabel}>sessions</Text>
              </View>
            </View>
          </Card>
        ))}

        {inactive.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Inactive ({inactive.length})</Text>
            {inactive.map((client) => (
              <Card key={client.id} style={[styles.card, styles.cardInactive]}>
                <View style={styles.row}>
                  <View style={[styles.avatarCircle, styles.avatarInactive]}>
                    <Text style={styles.avatarText}>{client.name[0]}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <Text style={styles.clientGoal}>{client.goal}</Text>
                    <Text style={styles.lastActive}>Last seen {client.lastActive}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
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
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardInactive: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInactive: {
    backgroundColor: colors.border,
  },
  avatarText: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  clientName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  clientGoal: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  lastActive: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  workoutBadge: {
    alignItems: 'center',
  },
  workoutCount: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  workoutLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
});
