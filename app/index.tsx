import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/config/theme';

export default function Index() {
  const { isAuthenticated, role, hasOnboarded, loading } = useAuthStore();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!hasOnboarded) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  if (!isAuthenticated || !role) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === 'trainer') {
    return <Redirect href="/(trainer)/dashboard" />;
  }

  return <Redirect href="/(client)/workout" />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
