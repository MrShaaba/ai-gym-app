import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useUserId } from '@/hooks/useUserId';
import { usePrograms } from '@/hooks/usePrograms';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const difficultyColor: Record<string, string> = {
  beginner: '#4ADE80',
  intermediate: '#FACC15',
  advanced: '#F87171',
};

export default function Programs() {
  const router = useRouter();
  const userId = useUserId();
  const { programs, loading } = usePrograms('client', userId);
  const allAssignments = useAssignmentStore((s) => s.assignments);
  const assignments = useMemo(
    () => allAssignments.filter((a) => a.clientId === userId),
    [allAssignments, userId],
  );

  // map programName → best status (in_progress > assigned > completed)
  const programStatus = new Map<string, string>();
  for (const a of assignments) {
    if (a.programName) {
      const existing = programStatus.get(a.programName);
      if (!existing || a.status === 'in_progress' || (a.status === 'assigned' && existing === 'completed')) {
        programStatus.set(a.programName, a.status);
      }
    }
  }

  const assignmentStatusColor: Record<string, string> = {
    assigned: '#60A5FA',
    in_progress: '#FACC15',
    completed: '#4ADE80',
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Programs</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Loading…' : `${programs.length} program${programs.length !== 1 ? 's' : ''} available`}
        </Text>

        {programs.map((p) => (
          <Card key={p.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>{p.name}</Text>
                {p.description && (
                  <Text style={styles.muscles}>{p.description}</Text>
                )}
                <Text style={styles.meta}>
                  {p.days_per_week} days/week
                </Text>
                {programStatus.has(p.name) && (
                  <Badge
                    label={programStatus.get(p.name)!.replace('_', ' ')}
                    color={assignmentStatusColor[programStatus.get(p.name)!] ?? colors.accent}
                    size="sm"
                  />
                )}
                {/* AI source badges */}
                {p.source === 'ai' && (
                  <View style={styles.sourceBadge}>
                    <Ionicons name="sparkles" size={12} color={colors.accent} />
                    <Text style={styles.sourceBadgeText}>AI Generated</Text>
                  </View>
                )}
                {p.source === 'ai_endorsed' && (
                  <View style={[styles.sourceBadge, styles.endorsedBadge]}>
                    <Ionicons name="checkmark-circle" size={12} color="#4ADE80" />
                    <Text style={[styles.sourceBadgeText, { color: '#4ADE80' }]}>Trainer Endorsed</Text>
                  </View>
                )}
              </View>
              <View style={[styles.badge, { backgroundColor: (difficultyColor[p.difficulty] ?? colors.accent) + '20' }]}>
                <Text style={[styles.badgeText, { color: difficultyColor[p.difficulty] ?? colors.accent }]}>
                  {p.difficulty}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        <Button
          title="AI Program Builder"
          icon="sparkles-outline"
          variant="outline"
          onPress={() => router.push('/(client)/generate')}
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  muscles: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
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
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  endorsedBadge: {},
  sourceBadgeText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
