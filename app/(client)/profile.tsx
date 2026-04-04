import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const measurements = [
  { label: 'Weight', value: '82 kg' },
  { label: 'Height', value: '178 cm' },
  { label: 'Body Fat', value: '15%' },
];

const activityItems = [
  { label: 'Member Since', value: 'Jan 2025' },
  { label: 'Total Workouts', value: '142' },
  { label: 'Current Streak', value: '7 days' },
  { label: 'Longest Streak', value: '21 days' },
];

export default function Profile() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const handleSignOut = () => {
    logout();
    router.replace('/');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>AJ</Text>
          </View>
          <Text style={styles.name}>Alex Johnson</Text>
          <View style={styles.badgeRow}>
            <View style={styles.proBadge}>
              <Ionicons name="shield-checkmark" size={12} color={colors.accent} />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Measurements</Text>
        <Card style={styles.card}>
          {measurements.map((m, i) => (
            <View key={m.label} style={[styles.row, i < measurements.length - 1 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{m.label}</Text>
              <Text style={styles.rowValue}>{m.value}</Text>
            </View>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>Activity</Text>
        <Card style={styles.card}>
          {activityItems.map((a, i) => (
            <View key={a.label} style={[styles.row, i < activityItems.length - 1 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{a.label}</Text>
              <Text style={styles.rowValue}>{a.value}</Text>
            </View>
          ))}
        </Card>

        <View style={styles.actions}>
          <Button title="Settings" icon="settings-outline" variant="secondary" onPress={() => router.push('/(shared)/settings')} />
          <Button title="Subscription" icon="card-outline" variant="secondary" onPress={() => router.push('/(shared)/subscription')} />
          <Button title="Sign Out" icon="log-out-outline" variant="outline" onPress={handleSignOut} />
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.accent,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  proBadgeText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
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
