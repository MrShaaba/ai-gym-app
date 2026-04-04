import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const hour = new Date().getHours();
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

const quickStats = [
  { label: 'Active Clients', value: '12', icon: 'people-outline' as const },
  { label: 'Sessions Today', value: '4', icon: 'calendar-outline' as const },
  { label: 'Programs', value: '8', icon: 'clipboard-outline' as const },
  { label: 'Messages', value: '3', icon: 'chatbubbles-outline' as const },
];

const upcomingSessions = [
  { client: 'Sarah M.', time: '10:00 AM', type: 'Upper Body', status: 'confirmed' as const },
  { client: 'James K.', time: '11:30 AM', type: 'HIIT', status: 'confirmed' as const },
  { client: 'Lisa T.', time: '2:00 PM', type: 'Mobility', status: 'pending' as const },
];

const statusColor = {
  confirmed: colors.accent,
  pending: '#FACC15',
};

export default function Dashboard() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>{greeting}, Coach</Text>

        <View style={styles.grid}>
          {quickStats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name={s.icon} size={20} color={colors.accent} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Today's Sessions</Text>

        {upcomingSessions.map((session) => (
          <Card key={session.client} style={styles.sessionCard}>
            <View style={styles.sessionRow}>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionClient}>{session.client}</Text>
                <Text style={styles.sessionType}>{session.type}</Text>
              </View>
              <View style={styles.sessionRight}>
                <Text style={styles.sessionTime}>{session.time}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor[session.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor[session.status] }]}>
                    {session.status}
                  </Text>
                </View>
              </View>
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
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
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
  sessionInfo: {
    flex: 1,
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
  sessionRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  sessionTime: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
