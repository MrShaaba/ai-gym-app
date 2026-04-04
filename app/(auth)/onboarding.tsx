import { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { colors, fontSize, spacing } from '@/config/theme';

const { width } = Dimensions.get('window');

const slides = [
  {
    title: 'Train Smarter',
    subtitle: 'AI-powered workout programs designed for your goals — day, week, month, or quarter.',
    icon: '🏋️',
  },
  {
    title: 'Track Everything',
    subtitle: 'Log workouts, monitor progress, and see your streaks grow over time.',
    icon: '📊',
  },
  {
    title: 'Work with Real Trainers',
    subtitle: 'Connect with certified trainers or follow pre-built programs at your own pace.',
    icon: '🤝',
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

  const slide = slides[current];

  return (
    <Screen style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.icon}>{slide.icon}</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  icon: {
    fontSize: 80,
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
