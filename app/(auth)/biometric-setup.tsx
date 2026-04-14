import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { getSession } from '@/services/auth';
import { getProfile } from '@/services/profiles';
import { colors, fontSize, spacing } from '@/config/theme';

export default function BiometricSetup() {
  const router = useRouter();
  const [supported, setSupported] = useState<boolean | null>(null);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then(setSupported);
  }, []);

  const proceed = async () => {
    // Ensure we have a real Supabase session with a user object.
    // signUp auto-confirms so a session should exist; recover it if the store is stale.
    let user = useAuthStore.getState().user;
    if (!user) {
      const session = await getSession();
      if (session?.user) {
        useAuthStore.getState().setSession(session);
        const profile = await getProfile(session.user.id);
        if (profile) useAuthStore.getState().setProfile(profile);
        user = session.user;
      }
    }
    if (!user) {
      // No Supabase session at all — must sign in manually
      router.replace('/(auth)/login');
      return;
    }

    setLoading(true);
    router.replace('/');
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
