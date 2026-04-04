import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const { isAuthenticated, role, hasOnboarded } = useAuthStore();

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
