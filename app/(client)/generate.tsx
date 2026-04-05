import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { generatePlan } from '@/services/generation';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { Difficulty, MuscleGroup, Equipment } from '@/types/workout';
import type { GenerationRequest, GenerationHorizon } from '@/types/generation';
import { GOAL_OPTIONS, HORIZON_OPTIONS, DURATION_OPTIONS } from '@/types/generation';

const EQUIPMENT_OPTIONS: Equipment[] = [
  'barbell', 'dumbbell', 'kettlebell', 'machine', 'bodyweight', 'cable', 'resistance_band', 'pull_up_bar',
];

const FOCUS_OPTIONS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs',
];

const DIFFICULTY_OPTIONS: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

function chipLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function GenerateScreen() {
  const router = useRouter();
  const gate = usePremiumGate();

  const [goal, setGoal] = useState('');
  const [horizon, setHorizon] = useState<GenerationHorizon>('week');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [duration, setDuration] = useState(60);
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [equipment, setEquipment] = useState<Equipment[]>(['barbell', 'dumbbell', 'machine', 'cable']);
  const [focusAreas, setFocusAreas] = useState<MuscleGroup[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const toggleChip = <T extends string>(list: T[], item: T, setter: (v: T[]) => void) => {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const canSubmit = goal !== '' && equipment.length > 0;

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setGenerating(true);
    setError('');
    try {
      const request: GenerationRequest = {
        goal,
        horizon,
        daysPerWeek,
        durationMinutes: duration,
        difficulty,
        equipment,
        focusAreas: focusAreas.length > 0 ? focusAreas : ['chest', 'back', 'shoulders', 'quadriceps'],
      };
      const plan = await generatePlan(request);
      // Navigate to review screen with the plan as a serialized param
      router.push({
        pathname: '/(client)/review-plan',
        params: { plan: JSON.stringify(plan) },
      });
      gate.refresh();
    } catch (e: any) {
      if (e?.code === 'generation_limit_reached') {
        gate.refresh();
      } else {
        setError(e.message ?? 'Generation failed. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>AI Plan Generator</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Premium gate badge */}
        {!gate.loading && (
          <View style={styles.usageBadge}>
            <Ionicons name="sparkles" size={14} color={colors.accent} />
            <Text style={styles.usageText}>
              {gate.remaining} of {gate.limit} free generations remaining
            </Text>
          </View>
        )}

        <PremiumGate used={gate.used} limit={gate.limit} remaining={gate.remaining}>
          {/* Goal */}
          <Text style={styles.sectionTitle}>What's your goal?</Text>
          <View style={styles.chipRow}>
            {GOAL_OPTIONS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, goal === g && styles.chipActive]}
                onPress={() => setGoal(g)}
              >
                <Text style={[styles.chipText, goal === g && styles.chipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Horizon */}
          <Text style={styles.sectionTitle}>Time Horizon</Text>
          <View style={styles.horizonRow}>
            {HORIZON_OPTIONS.map((h) => (
              <TouchableOpacity
                key={h.value}
                style={[styles.horizonCard, horizon === h.value && styles.horizonCardActive]}
                onPress={() => setHorizon(h.value)}
              >
                <Text style={[styles.horizonLabel, horizon === h.value && styles.horizonLabelActive]}>
                  {h.label}
                </Text>
                <Text style={styles.horizonDesc}>{h.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Days per week */}
          {horizon !== 'today' && (
            <>
              <Text style={styles.sectionTitle}>Days Per Week</Text>
              <View style={styles.chipRow}>
                {[2, 3, 4, 5, 6].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, styles.chipSmall, daysPerWeek === d && styles.chipActive]}
                    onPress={() => setDaysPerWeek(d)}
                  >
                    <Text style={[styles.chipText, daysPerWeek === d && styles.chipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Duration */}
          <Text style={styles.sectionTitle}>Session Duration</Text>
          <View style={styles.chipRow}>
            {DURATION_OPTIONS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, duration === m && styles.chipActive]}
                onPress={() => setDuration(m)}
              >
                <Text style={[styles.chipText, duration === m && styles.chipTextActive]}>{m} min</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Difficulty */}
          <Text style={styles.sectionTitle}>Difficulty</Text>
          <View style={styles.chipRow}>
            {DIFFICULTY_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, difficulty === d && styles.chipActive]}
                onPress={() => setDifficulty(d)}
              >
                <Text style={[styles.chipText, difficulty === d && styles.chipTextActive]}>
                  {chipLabel(d)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Equipment */}
          <Text style={styles.sectionTitle}>Available Equipment</Text>
          <View style={styles.chipRow}>
            {EQUIPMENT_OPTIONS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.chip, equipment.includes(e) && styles.chipActive]}
                onPress={() => toggleChip(equipment, e, setEquipment)}
              >
                <Text style={[styles.chipText, equipment.includes(e) && styles.chipTextActive]}>
                  {chipLabel(e)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Focus Areas */}
          <Text style={styles.sectionTitle}>Focus Areas (optional)</Text>
          <View style={styles.chipRow}>
            {FOCUS_OPTIONS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, focusAreas.includes(m) && styles.chipActive]}
                onPress={() => toggleChip(focusAreas, m, setFocusAreas)}
              >
                <Text style={[styles.chipText, focusAreas.includes(m) && styles.chipTextActive]}>
                  {chipLabel(m)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Error */}
          {error !== '' && (
            <Card style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError('')}>
                <Text style={styles.retryText}>Dismiss</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Generate */}
          <Button
            title={generating ? 'Generating…' : 'Generate Plan'}
            icon="sparkles-outline"
            onPress={handleGenerate}
            disabled={!canSubmit || generating}
            style={styles.generateBtn}
          />
        </PremiumGate>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl + 40,
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
  usageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'center',
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  usageText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSmall: {
    minWidth: 44,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  horizonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  horizonCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  horizonCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '15',
  },
  horizonLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  horizonLabelActive: {
    color: colors.accent,
  },
  horizonDesc: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  errorCard: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    flex: 1,
  },
  retryText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: spacing.md,
  },
  generateBtn: {
    marginTop: spacing.xl,
  },
});
