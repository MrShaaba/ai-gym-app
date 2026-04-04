import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const plans = [
  {
    name: 'Free',
    monthly: '$0',
    annual: '$0',
    features: ['3 workouts/week', 'Basic tracking', 'Community access'],
    current: true,
  },
  {
    name: 'Pro',
    monthly: '$9.99',
    annual: '$7.99',
    features: ['Unlimited workouts', 'AI program builder', 'Advanced statistics', 'Priority support'],
    current: false,
    recommended: true,
  },
  {
    name: 'Elite',
    monthly: '$19.99',
    annual: '$15.99',
    features: ['Everything in Pro', '1-on-1 trainer access', 'Video analysis', 'Custom meal plans'],
    current: false,
  },
];

export default function Subscription() {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Unlock your full potential</Text>

        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, !annual && styles.toggleBtnActive]}
            onPress={() => setAnnual(false)}
          >
            <Text style={[styles.toggleText, !annual && styles.toggleTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, annual && styles.toggleBtnActive]}
            onPress={() => setAnnual(true)}
          >
            <Text style={[styles.toggleText, annual && styles.toggleTextActive]}>Annual</Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveText}>-20%</Text>
            </View>
          </TouchableOpacity>
        </View>

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
              <Text style={styles.price}>{annual ? plan.annual : plan.monthly}</Text>
              <Text style={styles.period}>/month</Text>
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
          Subscriptions are demo placeholders. No real payments are processed.
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
    fontSize: fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.xl,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  toggleBtnActive: {
    backgroundColor: colors.accent + '20',
  },
  toggleText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.accent,
  },
  saveBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  saveText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '700',
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
