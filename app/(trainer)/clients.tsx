import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTrainerClients } from '@/hooks/useTrainerClients';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useAuthStore } from '@/store/authStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

export default function Clients() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const { clients, loading } = useTrainerClients(userId);
  const assignments = useAssignmentStore((s) => s.assignments);

  const getActiveCount = (clientId: string) =>
    assignments.filter((a) => a.clientId === clientId && a.status !== 'completed').length;

  const active = clients.filter((c) => c.active);
  const inactive = clients.filter((c) => !c.active);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Clients</Text>
        <Text style={styles.subtitle}>{clients.length} total  ·  {active.length} active</Text>

        <Text style={styles.sectionTitle}>Active ({active.length})</Text>
        {active.map((client) => {
          const activeCount = getActiveCount(client.clientId);
          return (
            <TouchableOpacity
              key={client.clientId}
              onPress={() => router.push({ pathname: '/(trainer)/client-detail', params: { id: client.clientId } })}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{client.clientInitials}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.clientName}>{client.clientName}</Text>
                    <Text style={styles.clientGoal}>{client.goal}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.lastActive}>Active {client.lastActive}</Text>
                      {activeCount > 0 && (
                        <Badge label={`${activeCount} active`} color={colors.accent} />
                      )}
                    </View>
                  </View>
                  <View style={styles.workoutBadge}>
                    <Text style={styles.workoutCount}>{client.workoutCount}</Text>
                    <Text style={styles.workoutLabel}>sessions</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        {inactive.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Inactive ({inactive.length})</Text>
            {inactive.map((client) => (
              <TouchableOpacity
                key={client.clientId}
                onPress={() => router.push({ pathname: '/(trainer)/client-detail', params: { id: client.clientId } })}
              >
                <Card style={[styles.card, styles.cardInactive]}>
                  <View style={styles.row}>
                    <View style={[styles.avatarCircle, styles.avatarInactive]}>
                      <Text style={styles.avatarText}>{client.clientInitials}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.clientName}>{client.clientName}</Text>
                      <Text style={styles.clientGoal}>{client.goal}</Text>
                      <Text style={styles.lastActive}>Last seen {client.lastActive}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
