import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUserId } from '@/hooks/useUserId';
import { createProgram } from '@/services/programs';
import type { Difficulty } from '@/types/workout';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const DAYS_OPTIONS = [2, 3, 4, 5, 6];

export default function CreateProgram() {
  const router = useRouter();
  const userId = useUserId();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!userId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Missing Name', 'Please enter a program name.');
      return;
    }
    setBusy(true);
    try {
      await createProgram({
        name: trimmed,
        description: description.trim() || undefined,
        difficulty,
        daysPerWeek,
        createdBy: userId,
      });
      Alert.alert('Created', 'Your program has been created.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create program.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Button
          title="Back"
          variant="outline"
          icon="chevron-back"
          onPress={() => router.back()}
          style={styles.backBtn}
        />

        <Text style={styles.heading}>Create Program</Text>

        <Input label="Program Name" placeholder="My Training Plan" value={name} onChangeText={setName} />

        <Input
          label="Description (optional)"
          placeholder="What this program focuses on…"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />

        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.chipRow}>
          {DIFFICULTIES.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDifficulty(d)}
              style={[styles.chip, difficulty === d && styles.chipActive]}
            >
              <Text style={[styles.chipText, difficulty === d && styles.chipTextActive]}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Days Per Week</Text>
        <View style={styles.chipRow}>
          {DAYS_OPTIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDaysPerWeek(d)}
              style={[styles.chip, daysPerWeek === d && styles.chipActive]}
            >
              <Text style={[styles.chipText, daysPerWeek === d && styles.chipTextActive]}>
                {d}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button
          title={busy ? 'Creating…' : 'Create Program'}
          icon="add-outline"
          onPress={handleCreate}
          disabled={busy || !name.trim()}
          style={styles.createBtn}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  heading: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  chipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  createBtn: {
    marginTop: spacing.md,
  },
});
