import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const quickStats = [
  { label: 'Active Clients', value: '12', icon: 'people' as const },
  { label: 'Sessions Today', value: '4', icon: 'calendar' as const },
  { label: 'Programs', value: '8', icon: 'clipboard' as const },
  { label: 'Messages', value: '3', icon: 'chatbubbles' as const },
];

const upcomingSessions = [
  { client: 'Sarah M.', time: '10:00 AM', type: 'Upper Body' },
  { client: 'James K.', time: '11:30 AM', type: 'HIIT' },
  { client: 'Lisa T.', time: '2:00 PM', type: 'Mobility' },
];

export default function Dashboard() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Good morning, Coach 👋</Text>

        <View style={styles.grid}>
          {quickStats.map((s) => (
            <Card key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={24} color={colors.accent} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </Card>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Today's Sessions</Text>

        {upcomingSessions.map((session) => (
          <Card key={session.client} style={styles.sessionCard}>
            <View style={styles.sessionRow}>
              <View>
                <Text style={styles.sessionClient}>{session.client}</Text>
                <Text style={styles.sessionType}>{session.type}</Text>
              </View>
              <Text style={styles.sessionTime}>{session.time}</Text>
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
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
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
    gap: spacing.xs,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
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
  sessionCard: {
    marginBottom: spacing.md,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionClient: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  sessionType: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  sessionTime: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
