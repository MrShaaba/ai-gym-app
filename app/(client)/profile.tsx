import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
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
  { label: 'Current Streak', value: '7 days 🔥' },
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
        <View style={styles.avatar}>
          <Ionicons name="person-circle" size={80} color={colors.textMuted} />
          <Text style={styles.name}>Alex Johnson</Text>
          <Text style={styles.role}>Client</Text>
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
