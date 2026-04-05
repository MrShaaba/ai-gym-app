import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { signOut } from '@/services/auth';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingRow {
  icon: IoniconsName;
  label: string;
  type: 'nav' | 'toggle';
  key?: string;
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
      { icon: 'notifications-outline', label: 'Push Notifications', type: 'toggle', key: 'notifications' },
      { icon: 'moon-outline', label: 'Dark Mode', type: 'toggle', key: 'darkMode' },
      { icon: 'barbell-outline', label: 'Metric Units', type: 'toggle', key: 'metric' },
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
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    notifications: true,
    darkMode: true,
    metric: true,
  });

  const handleToggle = useCallback((key: string) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // fall through — logout store anyway
    }
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
                      value={row.key ? toggles[row.key] : false}
                      onValueChange={() => { if (row.key) handleToggle(row.key); }}
                      trackColor={{ false: colors.border, true: colors.accent + '60' }}
                      thumbColor={row.key && toggles[row.key] ? colors.accent : colors.textMuted}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        <Button title="Sign Out" icon="log-out-outline" variant="outline" onPress={handleSignOut} style={styles.signOut} />

        <Text style={styles.version}>AI Gym v0.5.0 · Phase 5</Text>
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
