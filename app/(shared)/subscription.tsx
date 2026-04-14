import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { billingConfig } from '@/config/billing';
import { useEntitlement } from '@/hooks/useEntitlement';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { getBillingAdapter } from '@/services/entitlements';
import { useAuthStore } from '@/store/authStore';
import { useEntitlementStore } from '@/store/entitlementStore';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { BillingPlan } from '@/services/billing/BillingAdapter';

interface MarketingPlan {
  id: 'free' | 'premium';
  name: string;
  monthly: string;
  annual: string;
  features: string[];
  recommended?: boolean;
}

const marketingPlans: MarketingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    monthly: '$0',
    annual: '$0',
    features: ['Core workout app access', 'Workout history', '3 custom routines', '3 free AI generations'],
  },
  {
    id: 'premium',
    name: 'Premium',
    monthly: '$9.99',
    annual: '$7.99',
    features: ['Unlimited AI generation', 'Unlimited custom routines', 'Grouped routine builder authoring'],
    recommended: true,
  },
];

export default function Subscription() {
  const [annual, setAnnual] = useState(false);
  const [billingAvailable, setBillingAvailable] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [purchaseLoadingId, setPurchaseLoadingId] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [activeProductIds, setActiveProductIds] = useState<string[]>([]);
  const [managementUrl, setManagementUrl] = useState<string | null>(null);
  const entitlement = useEntitlement();
  const gate = usePremiumGate();
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.role);
  const refreshEntitlement = useEntitlementStore((s) => s.refresh);
  const currentPlanId = entitlement.isPremium || entitlement.isAdminOverride ? 'premium' : 'free';
  const billingAdapter = useMemo(() => getBillingAdapter(), []);

  const statusLabel = entitlement.isAdminOverride
    ? 'Admin override active'
    : entitlement.isPremium
      ? 'Premium active'
      : entitlement.isTrialActive
        ? `Trial active until ${entitlement.record?.trialEndsAt ? new Date(entitlement.record.trialEndsAt).toLocaleDateString() : ''}`
        : gate.isAtCap
          ? 'Free plan · AI cap reached'
        : 'Free plan';

  const loadBillingState = useCallback(async (mountedRef?: { current: boolean }) => {
    const isMounted = () => mountedRef ? mountedRef.current : true;

    setPlansLoading(true);
    setBillingError(null);
    try {
      if (userId) {
        await billingAdapter.configure(userId);
      }
      const available = await billingAdapter.isAvailable();
      if (!isMounted()) return;
      setBillingAvailable(available);

      if (!available) {
        setPlans([]);
        setActiveProductIds([]);
        setManagementUrl(null);
        return;
      }

      const customerState = await billingAdapter.getCustomerState();
      if (!isMounted()) return;
      setActiveProductIds(customerState?.activeProductIds ?? []);
      setManagementUrl(customerState?.managementUrl ?? null);

      const livePlans = await billingAdapter.listPlans();
      if (!isMounted()) return;
      setPlans(livePlans);
      if (livePlans.length === 0) {
        setBillingError('No subscription offerings are currently available. Please check your RevenueCat offering setup.');
      }
    } catch (error: any) {
      if (!isMounted()) return;
      setPlans([]);
      setBillingError(error?.message ?? 'Billing is currently unavailable.');
    } finally {
      if (isMounted()) setPlansLoading(false);
    }
  }, [billingAdapter, userId]);

  useEffect(() => {
    const mountedRef = { current: true };

    const loadPlans = async () => {
      await loadBillingState(mountedRef);
    };

    void loadPlans();
    return () => {
      mountedRef.current = false;
    };
  }, [loadBillingState]);

  const handlePurchase = async (planId: string) => {
    setPurchaseLoadingId(planId);
    setBillingError(null);
    try {
      const result = await billingAdapter.purchase(planId);
      if (!result.success) {
        if (!result.cancelled) {
          setBillingError(result.message ?? 'Purchase failed. Please try again.');
        }
        return;
      }

      await refreshEntitlement(userId, role);
      await loadBillingState();
    } catch (error: any) {
      setBillingError(error?.message ?? 'Purchase failed. Please try again.');
    } finally {
      setPurchaseLoadingId(null);
    }
  };

  const handleRestore = async () => {
    setRestoreLoading(true);
    setBillingError(null);
    try {
      const result = await billingAdapter.restorePurchases();
      if (!result.success && !result.restored) {
        setBillingError(result.message ?? 'No purchases were restored.');
      }
      await refreshEntitlement(userId, role);
      await loadBillingState();
    } catch (error: any) {
      setBillingError(error?.message ?? 'Restore failed. Please try again.');
    } finally {
      setRestoreLoading(false);
    }
  };

  const hasLiveOfferings = billingAvailable && plans.length > 0;

  const renderPlans = hasLiveOfferings
    ? plans
    : marketingPlans.map((plan) => ({
      id: plan.id === 'premium' ? 'premium_monthly' : plan.id,
      productIdentifier: plan.id,
      name: plan.name,
      description: plan.features.join(' · '),
      priceLabel: annual ? plan.annual : plan.monthly,
      interval: annual ? 'year' : 'month',
      featured: plan.recommended,
      offeringId: 'fallback',
    } satisfies BillingPlan));

  const isCurrentPlan = (plan: BillingPlan) => {
    if (plan.productIdentifier === 'free') {
      return currentPlanId === 'free';
    }

    if (!hasLiveOfferings) {
      return currentPlanId === 'premium';
    }

    return activeProductIds.includes(plan.productIdentifier);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Unlock your full potential</Text>
        <Text style={styles.status}>{statusLabel}</Text>
        {entitlement.isUsingDevOverride && entitlement.devScenarioLabel ? (
          <Text style={styles.devNotice}>Dev override · {entitlement.devScenarioLabel}</Text>
        ) : null}
        {entitlement.mockGenerationEnabled ? (
          <Text style={styles.devNotice}>Mock generation enabled</Text>
        ) : null}
        <Text style={styles.devNotice}>Billing mode · {billingConfig.environmentLabel}</Text>
        {!billingAvailable && !plansLoading ? (
          <Text style={styles.devNotice}>Billing provider unavailable in {billingConfig.environmentLabel} mode · showing fallback plan copy</Text>
        ) : null}

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

        {plansLoading ? (
          <Card style={styles.card}>
            <Text style={styles.loadingText}>Loading subscription options…</Text>
          </Card>
        ) : null}

        {billingError ? (
          <Card style={styles.card}>
            <Text style={styles.errorText}>{billingError}</Text>
          </Card>
        ) : null}

        {renderPlans.map((plan) => (
          <Card
            key={plan.id}
            style={[styles.card, plan.featured && styles.cardRecommended]}
          >
            {plan.featured && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>
            )}
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{plan.priceLabel}</Text>
              <Text style={styles.period}>/{plan.interval}</Text>
            </View>
            {(plan.description ? plan.description.split(' · ') : []).map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
            {isCurrentPlan(plan) ? (
              <View style={styles.currentBadge}>
                <Text style={styles.currentText}>{entitlement.isTrialActive && plan.productIdentifier === 'free' ? 'Current Plan · Trial Active' : 'Current Plan'}</Text>
              </View>
            ) : (
              <Button
                title={hasLiveOfferings ? 'Upgrade' : 'Unavailable'}
                onPress={() => { void handlePurchase(plan.id); }}
                loading={purchaseLoadingId === plan.id}
                disabled={!hasLiveOfferings || restoreLoading || purchaseLoadingId !== null}
                style={styles.upgradeBtn}
              />
            )}
          </Card>
        ))}

        {managementUrl && entitlement.isPremium ? (
          <Button
            title="Manage Subscription"
            variant="secondary"
            onPress={() => { void billingAdapter.openManageSubscription(managementUrl); }}
            disabled={purchaseLoadingId !== null || restoreLoading}
            style={styles.restoreBtn}
          />
        ) : null}

        <Button
          title="Restore Purchases"
          variant="outline"
          onPress={() => { void handleRestore(); }}
          loading={restoreLoading}
          disabled={!billingAvailable || purchaseLoadingId !== null}
          style={styles.restoreBtn}
        />

        <Text style={styles.disclaimer}>
          Purchases require a native build with RevenueCat configured. Switch between Test Store and production using EXPO_PUBLIC_BILLING_ENV plus matching RevenueCat env values.
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
  status: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  devNotice: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginBottom: spacing.xs,
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
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    lineHeight: 20,
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
  restoreBtn: {
    marginTop: spacing.sm,
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
