import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { UserRole } from '@/types/user';

export default function Register() {
  const router = useRouter();
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
        <Input label="Password" placeholder="••••••••" secureTextEntry />

        <Text style={styles.roleLabel}>I am a:</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, selectedRole === 'client' && styles.roleBtnActive]}
            onPress={() => setSelectedRole('client')}
          >
            <Text style={[styles.roleText, selectedRole === 'client' && styles.roleTextActive]}>Client</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, selectedRole === 'trainer' && styles.roleBtnActive]}
            onPress={() => setSelectedRole('trainer')}
          >
            <Text style={[styles.roleText, selectedRole === 'trainer' && styles.roleTextActive]}>Trainer</Text>
          </TouchableOpacity>
        </View>

        <Button title="Create Account" onPress={() => router.push('/(auth)/otp-verify')} />
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
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
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
