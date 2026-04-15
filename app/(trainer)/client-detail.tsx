import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTrainerClients } from '@/hooks/useTrainerClients';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useAuthStore } from '@/store/authStore';
import { fetchClientPrograms, endorseProgram, type ProgramRow } from '@/services/programs';
import { TRAINER_LOOP } from '@/config/copy';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const statusColor: Record<string, string> = {
  assigned: '#FACC15',
  in_progress: '#60A5FA',
  completed: colors.accent,
};

const statusLabel: Record<string, string> = {
  assigned: TRAINER_LOOP.statusAwaitingClient,
  in_progress: TRAINER_LOOP.statusInProgress,
  completed: TRAINER_LOOP.statusCompleted,
};

const statusIcon: Record<string, string> = {
  assigned: 'time-outline',
  in_progress: 'fitness-outline',
  completed: 'checkmark-circle',
};

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const trainerId = useAuthStore((s) => s.user?.id);
  const { clients, loading } = useTrainerClients(trainerId);
  const client = clients.find((c) => c.clientId === (id ?? ''));
  const allAssignments = useAssignmentStore((s) => s.assignments);
  const assignments = useMemo(
    () => allAssignments.filter((a) => a.clientId === (id ?? '')),
    [allAssignments, id],
  );

  // AI-generated programs for this client
  const [clientPrograms, setClientPrograms] = useState<ProgramRow[]>([]);
  const [endorsing, setEndorsing] = useState<string | null>(null);

  const loadClientPrograms = useCallback(async () => {
    if (!id) {
      setClientPrograms([]);
      return;
    }

    try {
      const all = await fetchClientPrograms(id);
      setClientPrograms(all.filter((p) => p.source === 'ai' || p.source === 'ai_endorsed'));
    } catch {
      setClientPrograms([]);
    }
  }, [id]);

  useEffect(() => {
    loadClientPrograms();
  }, [loadClientPrograms]);

  // Compute real stats from local data
  const activeAssignments = useMemo(
    () => assignments.filter((a) => a.status !== 'completed'),
    [assignments],
  );
  const completedAssignments = useMemo(
    () => assignments.filter((a) => a.status === 'completed'),
    [assignments],
  );
  const realAssignmentCount = activeAssignments.length;

  if (loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Loading…</Text>
        </View>
      </Screen>
    );
  }

  if (!client) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Client not found</Text>
        </View>
      </Screen>
    );
  }

  const handleEndorse = async (programId: string) => {
    if (!trainerId) return;
    setEndorsing(programId);
    try {
      await endorseProgram(programId, trainerId);
      Alert.alert('Endorsed', 'Program marked as trainer-endorsed.');
      loadClientPrograms();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to endorse');
    } finally {
      setEndorsing(null);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          <Text style={styles.backText}>Clients</Text>
        </TouchableOpacity>

        {/* Client Header */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{client.clientInitials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.clientName}>{client.clientName}</Text>
              <Badge
                label={client.active ? 'Active' : 'Inactive'}
                color={client.active ? colors.accent : colors.textMuted}
                size="sm"
              />
            </View>
            <Text style={styles.clientGoal}>{client.goal}</Text>
            <Text style={styles.memberSince}>
              Member since {client.memberSince}
              {client.lastActive ? `  ·  ${client.lastActive === 'New' ? 'No workouts yet' : `Last active ${client.lastActive}`}` : ''}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{client.workoutCount}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{realAssignmentCount}</Text>
            <Text style={styles.statLabel}>Active Plans</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{completedAssignments.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.textMuted }]}>—</Text>
            <Text style={styles.statLabel}>Adherence</Text>
          </View>
        </View>

        {/* Assign Button */}
        <Button
          title={realAssignmentCount > 0 ? 'Assign Another Workout' : 'Assign Workout'}
          icon="add-circle-outline"
          onPress={() => router.push({ pathname: '/(trainer)/assign', params: { clientId: client.clientId, clientName: client.clientName } })}
          style={styles.assignBtn}
        />

        {/* AI Programs to Endorse */}
        {clientPrograms.length > 0 && (
          <>
            <SectionHeader title={`AI Programs (${clientPrograms.length})`} />
            {clientPrograms.map((p) => (
              <Card key={p.id} style={styles.assignmentCard}>
                <View style={styles.assignmentHeader}>
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentName}>{p.name}</Text>
                    {p.description && (
                      <Text style={styles.programLabel}>{p.description}</Text>
                    )}
                  </View>
                  {p.source === 'ai_endorsed' ? (
                    <Badge label="Endorsed" color="#4ADE80" />
                  ) : (
                    <TouchableOpacity
                      style={styles.endorseBtn}
                      onPress={() => handleEndorse(p.id)}
                      disabled={endorsing === p.id}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} />
                      <Text style={styles.endorseText}>
                        {endorsing === p.id ? '…' : 'Endorse'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Active Assignments */}
        <SectionHeader title={`Active Assignments (${activeAssignments.length})`} />

        {activeAssignments.length === 0 && (
          <Card style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyText}>No active assignments</Text>
          </Card>
        )}

        {activeAssignments.map((a) => (
          <Card
            key={a.id}
            style={[
              styles.assignmentCard,
              { borderLeftWidth: 3, borderLeftColor: statusColor[a.status] ?? colors.border },
            ]}
          >
            <View style={styles.assignmentHeader}>
              <View style={styles.assignmentInfo}>
                <Text style={styles.assignmentName}>{a.routineName}</Text>
                {a.programName && (
                  <Text style={styles.programLabel}>{a.programName}</Text>
                )}
              </View>
              <Badge label={statusLabel[a.status]} color={statusColor[a.status]} />
            </View>
            {a.scheduleDays.length > 0 && (
              <View style={styles.daysRow}>
                {a.scheduleDays.map((day) => (
                  <View key={day} style={styles.dayChip}>
                    <Text style={styles.dayChipText}>{day.slice(0, 3)}</Text>
                  </View>
                ))}
              </View>
            )}
            {a.note && (
              <View style={styles.noteRow}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.textMuted} />
                <Text style={styles.noteText}>{a.note}</Text>
              </View>
            )}
          </Card>
        ))}

        {/* Completed */}
        {completedAssignments.length > 0 && (
          <>
            <SectionHeader title={`Completed (${completedAssignments.length})`} />
            {completedAssignments.map((a) => (
              <View key={a.id} style={styles.completedRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                <Text style={styles.completedName} numberOfLines={1}>{a.routineName}</Text>
                {a.programName ? (
                  <Text style={styles.completedProgram} numberOfLines={1}>{a.programName}</Text>
                ) : null}
              </View>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  backText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accent,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clientName: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  clientGoal: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  memberSince: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  assignBtn: {
    marginBottom: spacing.xl,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  assignmentCard: {
    marginBottom: spacing.md,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  completedName: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  completedProgram: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    maxWidth: 100,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  assignmentInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  assignmentName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  programLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dayChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent + '15',
  },
  dayChipText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noteText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    flex: 1,
  },
  endorseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  endorseText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
