import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTrainerClients } from '@/hooks/useTrainerClients';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useAuthStore } from '@/store/authStore';
import { useUserId } from '@/hooks/useUserId';
import { usePrograms } from '@/hooks/usePrograms';
import { fetchTrainerRoutines } from '@/services/programs';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

function getGreeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const userId = useUserId();
  const { clients } = useTrainerClients(userId);
  const assignments = useAssignmentStore((s) => s.assignments);
  const { programs } = usePrograms('trainer', userId);

  // Routines count — uses existing fetchTrainerRoutines from programs service
  const [routineCount, setRoutineCount] = useState(0);
  useEffect(() => {
    if (!userId) return;
    fetchTrainerRoutines(userId)
      .then((r) => setRoutineCount(r.length))
      .catch(() => {});
  }, [userId]);

  const greeting = useMemo(() => getGreeting(), []);

  const activeClients = clients.filter((c) => c.active).length;
  const activeAssignments = assignments.filter((a) => a.status !== 'completed').length;
  const recentAssignments = assignments
    .filter((a) => a.status !== 'completed')
    .slice(0, 3);
  const hasMoreAssignments = assignments.filter((a) => a.status !== 'completed').length > 3;

  const quickStats = [
    { label: 'Active Clients', value: String(activeClients), icon: 'people-outline' as const },
    { label: 'Active Plans', value: String(activeAssignments), icon: 'clipboard-outline' as const },
    { label: 'Programs', value: String(programs.length), icon: 'albums-outline' as const },
    { label: 'Routines', value: String(routineCount), icon: 'barbell-outline' as const },
  ];

  const getClientName = (clientId: string) =>
    clients.find((c) => c.clientId === clientId)?.clientName ?? 'Unknown';

  const statusColor: Record<string, string> = {
    assigned: '#60A5FA',
    in_progress: '#FACC15',
  };

  const isNewTrainer = activeClients === 0;
  const hasClientsNoAssignments = activeClients > 0 && recentAssignments.length === 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>{greeting}, {profile?.full_name?.split(' ')[0] ?? 'Trainer'}</Text>

        {/* Quick Stats */}
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

        {/* Welcome state — new trainer with zero clients */}
        {isNewTrainer && (
          <Card style={styles.welcomeCard}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="hand-right-outline" size={32} color={colors.accent} />
            </View>
            <Text style={styles.welcomeTitle}>Welcome to AI Gym</Text>
            <Text style={styles.welcomeText}>
              Start by inviting your first client. Once linked, you can assign routines and track their progress.
            </Text>
            <Button
              title="Invite Your First Client"
              icon="person-add-outline"
              onPress={() => router.push('/(trainer)/invite-client')}
              style={styles.welcomeBtn}
            />
          </Card>
        )}

        {/* Has clients but no assignments yet */}
        {hasClientsNoAssignments && (
          <Card style={styles.welcomeCard}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="clipboard-outline" size={28} color={colors.accent} />
            </View>
            <Text style={styles.welcomeTitle}>Ready to Assign</Text>
            <Text style={styles.welcomeText}>
              You have {activeClients} client{activeClients !== 1 ? 's' : ''} linked. Assign a workout to get started.
            </Text>
            <Button
              title="View Clients"
              icon="people-outline"
              onPress={() => router.push('/(trainer)/clients')}
              style={styles.welcomeBtn}
            />
          </Card>
        )}

        {/* Active Assignments */}
        {!isNewTrainer && (
          <>
            <SectionHeader
              title="Active Assignments"
              trailing={hasMoreAssignments ? 'View All →' : undefined}
            />

            {hasMoreAssignments && (
              <TouchableOpacity
                style={styles.viewAllHitArea}
                onPress={() => router.push('/(trainer)/clients')}
              />
            )}

            {recentAssignments.length === 0 && !hasClientsNoAssignments && (
              <Card style={styles.sessionCard}>
                <Text style={styles.emptyText}>All assignments completed. Nice work!</Text>
              </Card>
            )}

            {recentAssignments.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => router.push({ pathname: '/(trainer)/client-detail', params: { id: a.clientId } })}
              >
                <Card style={styles.sessionCard}>
                  <View style={styles.sessionRow}>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionClient}>{getClientName(a.clientId)}</Text>
                      <Text style={styles.sessionType}>{a.routineName}</Text>
                    </View>
                    <View style={styles.sessionRight}>
                      <Text style={styles.sessionDays}>{a.scheduleDays.join(', ')}</Text>
                      <Badge label={a.status.replace('_', ' ')} color={statusColor[a.status] ?? colors.accent} size="sm" />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
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
  welcomeCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  welcomeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  welcomeTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  welcomeText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  welcomeBtn: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
    marginHorizontal: spacing.md,
  },
  viewAllHitArea: {
    position: 'absolute',
    right: spacing.lg,
    top: 0,
    width: 80,
    height: 24,
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
  sessionDays: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
