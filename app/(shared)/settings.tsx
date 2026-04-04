import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingRow {
  icon: IoniconsName;
  label: string;
  type: 'nav' | 'toggle';
  value?: boolean;
}

const sections: { title: string; rows: SettingRow[] }[] = [
  {
    title: 'Account',
    rows: [
      { icon: 'person-outline', label: 'Edit Profile', type: 'nav' },
      { icon: 'card-outline', label: 'Subscription', type: 'nav' },
      { icon: 'lock-closed-outline', label: 'Privacy', type: 'nav' },
    ],
  },
  {
    title: 'Preferences',
    rows: [
      { icon: 'notifications-outline', label: 'Push Notifications', type: 'toggle', value: true },
      { icon: 'moon-outline', label: 'Dark Mode', type: 'toggle', value: true },
      { icon: 'barbell-outline', label: 'Metric Units', type: 'toggle', value: true },
    ],
  },
  {
    title: 'Support',
    rows: [
      { icon: 'help-circle-outline', label: 'Help Center', type: 'nav' },
      { icon: 'chatbubble-ellipses-outline', label: 'Contact Us', type: 'nav' },
      { icon: 'document-text-outline', label: 'Terms of Service', type: 'nav' },
    ],
  },
];

export default function Settings() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const handleSignOut = () => {
    logout();
    router.replace('/');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Card style={styles.card}>
              {section.rows.map((row, i) => (
                <TouchableOpacity
                  key={row.label}
                  style={[styles.row, i < section.rows.length - 1 && styles.rowBorder]}
                  disabled={row.type === 'toggle'}
                >
                  <View style={styles.rowLeft}>
                    <Ionicons name={row.icon} size={20} color={colors.textSecondary} />
                    <Text style={styles.rowLabel}>{row.label}</Text>
                  </View>
                  {row.type === 'nav' ? (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  ) : (
                    <Switch
                      value={row.value}
                      trackColor={{ false: colors.border, true: colors.accent + '60' }}
                      thumbColor={row.value ? colors.accent : colors.textMuted}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        <Button title="Sign Out" variant="outline" onPress={handleSignOut} style={styles.signOut} />

        <Text style={styles.version}>AI Gym v0.1.0 · Phase 1 MVP</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  signOut: {
    marginTop: spacing.xl,
  },
  version: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
