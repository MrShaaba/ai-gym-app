import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { colors, fontSize, spacing } from '@/config/theme';

export default function BiometricSetup() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const pendingRole = useAuthStore((s) => s.pendingRole);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then(setSupported);
  }, []);

  const proceed = () => {
    const role = pendingRole ?? 'client';
    // If a Supabase session exists, store already knows the role. Otherwise fall back.
    if (!isAuthenticated) login(role);
    router.replace(role === 'trainer' ? '/(trainer)/dashboard' : '/(client)/workout');
  };

  const handleEnable = async () => {
    await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable biometric login',
      fallbackLabel: 'Use passcode',
    });
    proceed();
  };

  const handleSkip = () => proceed();

  return (
    <Screen style={styles.screen}>
      <View style={styles.content}>
        <Ionicons name="finger-print-outline" size={80} color={colors.accent} />
        <Text style={styles.title}>Biometric Login</Text>
        {supported === false ? (
          <Text style={styles.subtitle}>
            Biometric authentication is not available on this device.
          </Text>
        ) : (
          <Text style={styles.subtitle}>
            Enable Face ID or fingerprint for quick, secure access.
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        {supported !== false && (
          <Button title="Enable Biometrics" onPress={handleEnable} />
        )}
        <Button title="Skip for now" variant="outline" onPress={handleSkip} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  footer: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
});
