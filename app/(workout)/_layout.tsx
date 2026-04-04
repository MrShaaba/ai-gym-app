import { Stack } from 'expo-router';
import { colors } from '@/config/theme';

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        gestureEnabled: false,
      }}
    />
  );
}
