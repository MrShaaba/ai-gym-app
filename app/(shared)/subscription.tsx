import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    features: ['3 workouts/week', 'Basic tracking', 'Community access'],
    current: true,
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    features: ['Unlimited workouts', 'AI program builder', 'Advanced stats', 'Priority support'],
    current: false,
    recommended: true,
  },
  {
    name: 'Elite',
    price: '$19.99',
    period: '/month',
    features: ['Everything in Pro', '1-on-1 trainer access', 'Video analysis', 'Custom meal plans'],
    current: false,
  },
];

export default function Subscription() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Unlock your full potential</Text>

        {plans.map((plan) => (
          <Card
            key={plan.name}
            style={[styles.card, plan.recommended && styles.cardRecommended]}
          >
            {plan.recommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>
            )}
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{plan.price}</Text>
              <Text style={styles.period}>{plan.period}</Text>
            </View>
            {plan.features.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
            {plan.current ? (
              <View style={styles.currentBadge}>
                <Text style={styles.currentText}>Current Plan</Text>
              </View>
            ) : (
              <Button title="Upgrade" onPress={() => {}} style={styles.upgradeBtn} />
            )}
          </Card>
        ))}

        <Text style={styles.disclaimer}>
          Subscriptions are mock placeholders. No real payments in Phase 1.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardRecommended: {
    borderColor: colors.accent,
    borderWidth: 1,
  },
  recommendedBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  recommendedText: {
    color: colors.background,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  planName: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: spacing.sm,
  },
  price: {
    color: colors.accent,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  period: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  featureText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  currentBadge: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  currentText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  upgradeBtn: {
    marginTop: spacing.lg,
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
