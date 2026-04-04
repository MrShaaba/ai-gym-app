import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { UserRole } from '@/types/user';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const roles: { key: UserRole; label: string; desc: string; icon: IoniconsName }[] = [
  { key: 'client', label: 'Client', desc: 'Track workouts & follow programs', icon: 'fitness-outline' },
  { key: 'trainer', label: 'Trainer', desc: 'Manage clients & build programs', icon: 'clipboard-outline' },
];

export default function Register() {
  const router = useRouter();
  const setPendingRole = useAuthStore((s) => s.setPendingRole);
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start your fitness journey</Text>
      </View>

      <View style={styles.form}>
        <Input label="Full Name" placeholder="Your name" autoCapitalize="words" />
        <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Password" placeholder="Create a password" secureTextEntry />

        <Text style={styles.roleLabel}>I am a:</Text>
        <View style={styles.roleRow}>
          {roles.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.roleBtn, selectedRole === r.key && styles.roleBtnActive]}
              onPress={() => setSelectedRole(r.key)}
            >
              <Ionicons
                name={r.icon}
                size={24}
                color={selectedRole === r.key ? colors.accent : colors.textMuted}
              />
              <Text style={[styles.roleText, selectedRole === r.key && styles.roleTextActive]}>
                {r.label}
              </Text>
              <Text style={styles.roleDesc}>{r.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title="Create Account" onPress={() => { setPendingRole(selectedRole); router.push('/(auth)/otp-verify'); }} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Text style={styles.footerLink} onPress={() => router.back()}>
          Sign In
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.md,
  },
  roleLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  roleBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '15',
  },
  roleText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  roleTextActive: {
    color: colors.accent,
  },
  roleDesc: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  footerLink: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
