import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getClient } from '@/data/clients';
import { useAssignmentStore } from '@/store/assignmentStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const statusColor: Record<string, string> = {
  assigned: '#60A5FA',
  in_progress: '#FACC15',
  completed: colors.accent,
};

const statusLabel: Record<string, string> = {
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const client = getClient(id ?? '');
  const allAssignments = useAssignmentStore((s) => s.assignments);
  const assignments = useMemo(
    () => allAssignments.filter((a) => a.clientId === (id ?? '')),
    [allAssignments, id],
  );

  if (!client) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Client not found</Text>
        </View>
      </Screen>
    );
  }

  const activeAssignments = assignments.filter((a) => a.status !== 'completed');
  const completedAssignments = assignments.filter((a) => a.status === 'completed');

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
            <Text style={styles.clientName}>{client.clientName}</Text>
            <Text style={styles.clientGoal}>{client.goal}</Text>
            <Text style={styles.memberSince}>Member since {client.memberSince}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{client.workoutCount}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{client.assignmentCount}</Text>
            <Text style={styles.statLabel}>Programs</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: client.adherencePercent >= 80 ? colors.accent : '#FACC15' }]}>
              {client.adherencePercent}%
            </Text>
            <Text style={styles.statLabel}>Adherence</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{client.active ? '✓' : '—'}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* Assign Button */}
        <Button
          title="Assign Workout"
          icon="add-circle-outline"
          onPress={() => router.push({ pathname: '/(trainer)/assign', params: { clientId: client.clientId, clientName: client.clientName } })}
          style={styles.assignBtn}
        />

        {/* Active Assignments */}
        <Text style={styles.sectionTitle}>
          Active Assignments ({activeAssignments.length})
        </Text>

        {activeAssignments.length === 0 && (
          <Card style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyText}>No active assignments</Text>
          </Card>
        )}

        {activeAssignments.map((a) => (
          <Card key={a.id} style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <View style={styles.assignmentInfo}>
                <Text style={styles.assignmentName}>{a.routineName}</Text>
                {a.programName && (
                  <Text style={styles.programLabel}>{a.programName}</Text>
                )}
              </View>
              <Badge label={statusLabel[a.status]} color={statusColor[a.status]} />
            </View>
            <View style={styles.daysRow}>
              {a.scheduleDays.map((day) => (
                <View key={day} style={styles.dayChip}>
                  <Text style={styles.dayChipText}>{day}</Text>
                </View>
              ))}
            </View>
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
            <Text style={styles.sectionTitle}>
              Completed ({completedAssignments.length})
            </Text>
            {completedAssignments.map((a) => (
              <Card key={a.id} style={[styles.assignmentCard, styles.completedCard]}>
                <View style={styles.assignmentHeader}>
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentName}>{a.routineName}</Text>
                  </View>
                  <Badge label="Completed" color={colors.accent} />
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
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  assignBtn: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
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
  completedCard: {
    opacity: 0.7,
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
});
