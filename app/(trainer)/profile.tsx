import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { colors, fontSize, spacing } from '@/config/theme';

const trainerStats = [
  { label: 'Active Clients', value: '12' },
  { label: 'Programs Created', value: '8' },
  { label: 'Total Sessions', value: '347' },
  { label: 'Rating', value: '4.9 ⭐' },
];

export default function TrainerProfile() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const handleSignOut = () => {
    logout();
    router.replace('/');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatar}>
          <Ionicons name="person-circle" size={80} color={colors.textMuted} />
          <Text style={styles.name}>Coach Taylor</Text>
          <Text style={styles.role}>Trainer</Text>
          <Text style={styles.bio}>Certified PT · Strength & Conditioning Specialist</Text>
        </View>

        <Text style={styles.sectionTitle}>Overview</Text>
        <Card style={styles.card}>
          {trainerStats.map((s, i) => (
            <View key={s.label} style={[styles.row, i < trainerStats.length - 1 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{s.label}</Text>
              <Text style={styles.rowValue}>{s.value}</Text>
            </View>
          ))}
        </Card>

        <View style={styles.actions}>
          <Button title="Settings" variant="secondary" onPress={() => router.push('/(shared)/settings')} />
          <Button title="Sign Out" variant="outline" onPress={handleSignOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  avatar: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  role: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  bio: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
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
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
