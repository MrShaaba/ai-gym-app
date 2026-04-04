import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const trainerStats = [
  { label: 'Active Clients', value: '12' },
  { label: 'Programs Created', value: '8' },
  { label: 'Total Sessions', value: '347' },
  { label: 'Rating', value: '4.9' },
];

const certifications = ['NASM-CPT', 'CSCS', 'Precision Nutrition L1'];

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
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>CT</Text>
          </View>
          <Text style={styles.name}>Coach Taylor</Text>
          <Text style={styles.bio}>Strength & Conditioning Specialist</Text>
          <View style={styles.certRow}>
            {certifications.map((cert) => (
              <View key={cert} style={styles.certBadge}>
                <Ionicons name="ribbon-outline" size={12} color={colors.accent} />
                <Text style={styles.certText}>{cert}</Text>
              </View>
            ))}
          </View>
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
  bio: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  certRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  certText: {
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
