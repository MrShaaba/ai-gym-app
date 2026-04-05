import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useTrainerClients } from '@/hooks/useTrainerClients';
import { usePrograms } from '@/hooks/usePrograms';
import { useUserId } from '@/hooks/useUserId';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

export default function TrainerProfile() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const profile = useAuthStore((s) => s.profile);
  const userId = useUserId();
  const { clients } = useTrainerClients(userId);
  const { programs } = usePrograms('trainer', userId);

  const initials = (profile?.full_name ?? 'T')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const certs = profile?.certifications ?? [];
  const specs = profile?.specialties ?? [];
  const stats = [
    { label: 'Active Clients', value: String(clients.filter((c) => c.active).length) },
    { label: 'Programs Created', value: String(programs.length) },
    { label: 'Rating', value: profile?.rating_avg ? profile.rating_avg.toFixed(1) : '—' },
    { label: 'Reviews', value: String(profile?.rating_count ?? 0) },
  ];

  const handleSignOut = () => {
    logout();
    router.replace('/');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile?.full_name ?? 'Trainer'}</Text>
          {profile?.username && (
            <Text style={styles.username}>@{profile.username}</Text>
          )}
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          {profile?.is_public && (
            <Badge label="Public Profile" color={colors.accent} />
          )}
        </View>

        {specs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Specialties</Text>
            <View style={styles.tagRow}>
              {specs.map((s) => (
                <View key={s} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{s}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {certs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Certifications</Text>
            <View style={styles.certRow}>
              {certs.map((cert) => (
                <View key={cert} style={styles.certBadge}>
                  <Ionicons name="ribbon-outline" size={12} color={colors.accent} />
                  <Text style={styles.certText}>{cert}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Overview</Text>
        <Card style={styles.card}>
          {stats.map((s, i) => (
            <View key={s.label} style={[styles.row, i < stats.length - 1 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{s.label}</Text>
              <Text style={styles.rowValue}>{s.value}</Text>
            </View>
          ))}
        </Card>

        <View style={styles.actions}>
          <Button title="Edit Profile" icon="create-outline" variant="secondary" onPress={() => router.push('/(trainer)/edit-profile')} />
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
  username: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  bio: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tagBadge: {
    backgroundColor: colors.accent + '18',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  tagText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
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
