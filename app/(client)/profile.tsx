import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ClientTabSwipeView } from '@/components/navigation/ClientTabSwipeView';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAuthStore } from '@/store/authStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

export default function Profile() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const profile = useAuthStore((s) => s.profile);

  const initials = (profile?.full_name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : '—';

  const activityItems = [
    { label: 'Member Since', value: memberSince },
    { label: 'Goal', value: profile?.goal ?? '—' },
  ];

  const handleSignOut = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <Screen>
      <ClientTabSwipeView routeKey="profile">
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <Text style={styles.name}>{profile?.full_name ?? 'User'}</Text>
            {profile?.username && (
              <Text style={styles.username}>@{profile.username}</Text>
            )}
          </View>

        <SectionHeader title="Activity" />
        <Card style={styles.card}>
          {activityItems.map((a, i) => (
            <View key={a.label} style={[styles.row, i < activityItems.length - 1 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{a.label}</Text>
              <Text style={styles.rowValue}>{a.value}</Text>
            </View>
          ))}
        </Card>

          <View style={styles.actions}>
            <Button title="Discover Trainers" icon="search-outline" variant="secondary" onPress={() => router.push('/(client)/discover')} />
            <Button title="Settings" icon="settings-outline" variant="secondary" onPress={() => router.push('/(shared)/settings')} />
            <Button title="Subscription" icon="card-outline" variant="secondary" onPress={() => router.push('/(shared)/subscription')} />
            <Button title="Sign Out" icon="log-out-outline" variant="outline" onPress={handleSignOut} />
          </View>
        </ScrollView>
      </ClientTabSwipeView>
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
