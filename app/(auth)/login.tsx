import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

export default function Login() {
  const router = useRouter();

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Ionicons name="barbell" size={32} color={colors.accent} />
        </View>
        <Text style={styles.brand}>AI Gym</Text>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue your training</Text>
      </View>

      <View style={styles.form}>
        <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Password" placeholder="Enter your password" secureTextEntry />
        <Text style={styles.forgot}>Forgot Password?</Text>
        <Button title="Sign In" onPress={() => router.push('/(auth)/otp-verify')} />
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.social}>
        <Button
          title="Google"
          variant="outline"
          icon="logo-google"
          onPress={() => router.push('/(auth)/otp-verify')}
          style={styles.socialBtn}
        />
        <Button
          title="Apple"
          variant="outline"
          icon="logo-apple"
          onPress={() => router.push('/(auth)/otp-verify')}
          style={styles.socialBtn}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account?</Text>
        <Text style={styles.footerLink} onPress={() => router.push('/(auth)/register')}>
          Sign Up
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
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  brand: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
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
  forgot: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'right',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  social: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialBtn: {
    flex: 1,
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
