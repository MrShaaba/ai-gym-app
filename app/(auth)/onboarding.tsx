import { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const { width } = Dimensions.get('window');

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const slides: { title: string; subtitle: string; icon: IoniconsName }[] = [
  {
    title: 'Train Smarter',
    subtitle: 'AI-powered workout programs designed for your goals — day, week, month, or quarter.',
    icon: 'barbell-outline',
  },
  {
    title: 'Track Everything',
    subtitle: 'Log workouts, monitor progress, and see your streaks grow over time.',
    icon: 'analytics-outline',
  },
  {
    title: 'Work with Real Trainers',
    subtitle: 'Connect with certified trainers or follow pre-built programs at your own pace.',
    icon: 'people-outline',
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const router = useRouter();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const isLast = current === slides.length - 1;

  const next = () => {
    if (isLast) {
      completeOnboarding();
      router.replace('/(auth)/login');
    } else {
      setCurrent(current + 1);
    }
  };

  const skip = () => {
    completeOnboarding();
    router.replace('/(auth)/login');
  };

  const slide = slides[current];

  return (
    <Screen style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>AI Gym</Text>
        {!isLast && (
          <Text style={styles.skip} onPress={skip}>Skip</Text>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name={slide.icon} size={48} color={colors.accent} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
          ))}
        </View>
        <Button title={isLast ? 'Get Started' : 'Next'} onPress={next} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: '700',
    letterSpacing: 1,
  },
  skip: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
});
