import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePrograms } from '@/hooks/usePrograms';
import { useAuthStore } from '@/store/authStore';
import { useUserId } from '@/hooks/useUserId';
import { supabase } from '@/config/supabase';
import { createProgram } from '@/services/programs';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { Difficulty } from '@/types/workout';

const difficultyColor: Record<string, string> = {
  beginner: '#4ADE80',
  intermediate: '#FACC15',
  advanced: '#F87171',
};

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

export default function TrainerPrograms() {
  const router = useRouter();
  const userId = useUserId();
  const { programs, loading, refetch } = usePrograms('trainer', userId);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDiff, setNewDiff] = useState<Difficulty>('intermediate');
  const [newDays, setNewDays] = useState('4');
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    // Get user ID — try store first, then Supabase session directly
    let uid = useAuthStore.getState().user?.id;
    if (!uid) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        useAuthStore.getState().setSession(session);
        uid = session.user.id;
      }
    }
    if (!uid) {
      Alert.alert('Error', 'Not signed in. Please close the app and sign in again.');
      return;
    }
    const userId = uid;
    setBusy(true);
    try {
      await createProgram({
        name: newName.trim(),
        difficulty: newDiff,
        daysPerWeek: parseInt(newDays, 10) || 4,
        createdBy: userId,
      });
      setNewName('');
      setShowCreate(false);
      refetch();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create program.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Programs</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Loading…' : `${programs.length} program${programs.length !== 1 ? 's' : ''} created`}
        </Text>

        {programs.map((p) => (
          <TouchableOpacity
            key={p.id}
            onPress={() =>
              router.push({
                pathname: '/(trainer)/program-detail',
                params: { id: p.id, name: p.name, difficulty: p.difficulty, daysPerWeek: String(p.days_per_week) },
              })
            }
          >
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{p.name}</Text>
                <View style={[styles.badge, { backgroundColor: (difficultyColor[p.difficulty] ?? colors.accent) + '20' }]}>
                  <Text style={[styles.badgeText, { color: difficultyColor[p.difficulty] ?? colors.accent }]}>
                    {p.difficulty}
                  </Text>
                </View>
              </View>
              {p.description && <Text style={styles.muscles}>{p.description}</Text>}
              <Text style={styles.meta}>
                {p.days_per_week} days/week
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevron} />
            </Card>
          </TouchableOpacity>
        ))}

        {!showCreate && (
          <Button
            title="Create New Program"
            icon="add-outline"
            onPress={() => setShowCreate(true)}
            style={styles.createBtn}
          />
        )}

        {showCreate && (
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>New Program</Text>
            <Input
              placeholder="Program name"
              value={newName}
              onChangeText={setNewName}
            />
            <View style={styles.diffRow}>
              {DIFFICULTIES.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.diffChip,
                    newDiff === d && {
                      backgroundColor: difficultyColor[d] + '20',
                      borderColor: difficultyColor[d],
                    },
                  ]}
                  onPress={() => setNewDiff(d)}
                >
                  <Text
                    style={[
                      styles.diffText,
                      newDiff === d && { color: difficultyColor[d] },
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input
              placeholder="Days per week"
              keyboardType="number-pad"
              value={newDays}
              onChangeText={setNewDays}
            />
            <View style={styles.formActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowCreate(false)}
                style={styles.formBtn}
              />
              <Button
                title={busy ? 'Creating…' : 'Create'}
                onPress={handleCreate}
                disabled={!newName.trim() || busy}
                style={styles.formBtn}
              />
            </View>
          </Card>
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
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
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
  muscles: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  chevron: {
    position: 'absolute',
    right: 0,
    top: '50%',
  },
  createBtn: {
    marginTop: spacing.md,
  },
  formCard: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  formTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  diffRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  diffChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  diffText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formBtn: {
    flex: 1,
  },
});
