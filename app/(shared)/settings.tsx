import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FEATURE_GATES, FREE_CUSTOM_ROUTINE_LIMIT } from '@/config/featureGates';
import { useEntitlement } from '@/hooks/useEntitlement';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import {
  getDevScenarioCustomRoutineCount,
  getDevScenarioLabel,
  type DevEntitlementScenario,
  useDevEntitlementStore,
} from '@/store/devEntitlementStore';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';
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

const DEV_SCENARIOS: DevEntitlementScenario[] = [
  'use_real',
  'free_under_cap',
  'free_at_cap',
  'trial_active',
  'premium_active',
  'admin_override',
  'expired_trial',
];

export default function Settings() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const entitlement = useEntitlement();
  const gate = usePremiumGate();
  const scenario = useDevEntitlementStore((s) => s.scenario);
  const setScenario = useDevEntitlementStore((s) => s.setScenario);
  const mockGenerationEnabled = useDevEntitlementStore((s) => s.mockGenerationEnabled);
  const setMockGenerationEnabled = useDevEntitlementStore((s) => s.setMockGenerationEnabled);
  const resetDevHarness = useDevEntitlementStore((s) => s.reset);
  const weightUnit = usePreferencesStore((s) => s.weightUnit);
  const toggleWeightUnit = usePreferencesStore((s) => s.toggleWeightUnit);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    notifications: true,
    darkMode: true,
    metric: weightUnit === 'kg',
  });

  const handleToggle = useCallback((key: string) => {
    if (key === 'metric') {
      toggleWeightUnit();
      setToggles((prev) => ({ ...prev, metric: weightUnit !== 'kg' }));
      return;
    }
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, [toggleWeightUnit, weightUnit]);

  const handleSignOut = async () => {
    await logout();
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
                      value={row.key === 'metric' ? weightUnit === 'kg' : row.key ? toggles[row.key] : false}
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

        {__DEV__ ? (
          <>
            <Text style={styles.sectionTitle}>Developer Entitlement Harness</Text>
            <Card style={styles.card}>
              <View style={styles.devHeaderRow}>
                <Text style={styles.devTitle}>Current State</Text>
                <Text style={styles.devSubtitle}>
                  {entitlement.isUsingDevOverride && entitlement.devScenarioLabel
                    ? entitlement.devScenarioLabel
                    : 'Real entitlement state'}
                </Text>
              </View>

              <Text style={styles.devMeta}>
                Effective entitlement: {entitlement.state.replace('_', ' ')}
              </Text>
              <Text style={styles.devMeta}>
                AI usage: {gate.used}/{FEATURE_GATES.ai_generation.freeLimit ?? gate.limit}
              </Text>
              <Text style={styles.devMeta}>
                Custom routines: {getDevScenarioCustomRoutineCount(scenario, FREE_CUSTOM_ROUTINE_LIMIT)}/{FREE_CUSTOM_ROUTINE_LIMIT}
              </Text>

              <View style={styles.devScenarioWrap}>
                {DEV_SCENARIOS.map((item) => {
                  const active = scenario === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.devChip, active && styles.devChipActive]}
                      onPress={() => setScenario(item)}
                    >
                      <Text style={[styles.devChipText, active && styles.devChipTextActive]}>
                        {getDevScenarioLabel(item)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.row, styles.rowBorder, styles.devToggleRow]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="flask-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.rowLabel}>Mock Generation</Text>
                </View>
                <Switch
                  value={mockGenerationEnabled}
                  onValueChange={setMockGenerationEnabled}
                  trackColor={{ false: colors.border, true: colors.accent + '60' }}
                  thumbColor={mockGenerationEnabled ? colors.accent : colors.textMuted}
                />
              </View>

              <Text style={styles.devMeta}>
                {mockGenerationEnabled
                  ? 'Generate and Regenerate will use deterministic local mock plans.'
                  : 'Generate and Regenerate will use the real edge-function path.'}
              </Text>

              <View style={styles.devActions}>
                <Button
                  title="Refresh Usage"
                  variant="secondary"
                  onPress={gate.refresh}
                  style={styles.devActionBtn}
                />
                <Button
                  title="Reset Dev Harness"
                  variant="outline"
                  onPress={resetDevHarness}
                  style={styles.devActionBtn}
                />
              </View>
            </Card>
          </>
        ) : null}

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
  devHeaderRow: {
    marginBottom: spacing.sm,
  },
  devTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  devSubtitle: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  devMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  devScenarioWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  devChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  devChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '20',
  },
  devChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  devChipTextActive: {
    color: colors.accent,
  },
  devToggleRow: {
    marginTop: spacing.sm,
  },
  devActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  devActionBtn: {
    flex: 1,
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
