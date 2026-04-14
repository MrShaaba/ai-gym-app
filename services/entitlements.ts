import AsyncStorage from '@react-native-async-storage/async-storage';
import { billingConfig } from '@/config/billing';
import { supabase } from '@/config/supabase';
import { RevenueCatBillingAdapter } from '@/services/billing/RevenueCatBillingAdapter';
import { MockBillingAdapter } from '@/services/billing/MockBillingAdapter';
import type { BillingAdapter, BillingCustomerState } from '@/services/billing/BillingAdapter';
import type { EntitlementRecord, EntitlementState, ResolvedEntitlement } from '@/types/entitlement';
import type { UserRole } from '@/types/user';
import { TRIAL_LENGTH_DAYS } from '@/config/featureGates';

const ENTITLEMENT_PREFIX = 'ai-gym:entitlement:';

function isMissingEntitlementColumns(message: string | undefined) {
  const text = (message ?? '').toLowerCase();
  return text.includes('plan_tier') || text.includes('trial_started_at') || text.includes('trial_ends_at') || text.includes('admin_override');
}

const defaultRecord = (): EntitlementRecord => ({
  planTier: 'free',
  trialStartedAt: null,
  trialEndsAt: null,
  trialUsed: false,
  adminOverride: false,
  source: 'mock',
  updatedAt: new Date().toISOString(),
});

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function resolveState(record: EntitlementRecord, role: UserRole | null): EntitlementState {
  if (record.adminOverride) return 'admin_override';
  if (record.planTier === 'premium') return 'premium_active';

  if (record.trialEndsAt) {
    const expiresAt = new Date(record.trialEndsAt).getTime();
    if (!Number.isNaN(expiresAt) && Date.now() < expiresAt) {
      return 'trial_active';
    }
  }

  return 'free';
}

export async function loadEntitlementRecord(userId: string): Promise<EntitlementRecord> {
  const { data, error } = await supabase
    .from('profiles')
    .select('plan_tier, trial_started_at, trial_ends_at, admin_override')
    .eq('id', userId)
    .single();

  if (!error && data) {
    return {
      planTier: data.plan_tier === 'premium' ? 'premium' : 'free',
      trialStartedAt: data.trial_started_at ?? null,
      trialEndsAt: data.trial_ends_at ?? null,
      trialUsed: Boolean(data.trial_started_at),
      adminOverride: Boolean(data.admin_override),
      source: data.admin_override ? 'admin' : 'manual',
      updatedAt: new Date().toISOString(),
    };
  }

  if (error && !isMissingEntitlementColumns(error.message)) {
    throw error;
  }

  const raw = await AsyncStorage.getItem(`${ENTITLEMENT_PREFIX}${userId}`);
  if (!raw) return defaultRecord();

  try {
    return { ...defaultRecord(), ...JSON.parse(raw) } as EntitlementRecord;
  } catch {
    return defaultRecord();
  }
}

export async function saveEntitlementRecord(userId: string, record: EntitlementRecord): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      plan_tier: record.planTier,
      trial_started_at: record.trialStartedAt,
      trial_ends_at: record.trialEndsAt,
      admin_override: record.adminOverride,
    })
    .eq('id', userId);

  if (!error) {
    return;
  }

  if (!isMissingEntitlementColumns(error.message)) {
    throw error;
  }

  await AsyncStorage.setItem(`${ENTITLEMENT_PREFIX}${userId}`, JSON.stringify(record));
}

export function applyBillingCustomerState(
  record: EntitlementRecord,
  customerState: BillingCustomerState | null,
): EntitlementRecord {
  if (!customerState) {
    return record;
  }

  const shouldSetPremium = customerState.premiumActive;
  return {
    ...record,
    planTier: shouldSetPremium ? 'premium' : record.adminOverride ? record.planTier : 'free',
    source: shouldSetPremium ? 'revenuecat' : record.source,
    updatedAt: new Date().toISOString(),
  };
}

export async function syncBillingEntitlement(userId: string, record?: EntitlementRecord): Promise<EntitlementRecord> {
  const adapter = getBillingAdapter();
  if (!(await adapter.isAvailable())) {
    return record ?? loadEntitlementRecord(userId);
  }

  await adapter.configure(userId);
  const baseRecord = record ?? await loadEntitlementRecord(userId);
  const customerState = await adapter.getCustomerState();
  const nextRecord = applyBillingCustomerState(baseRecord, customerState);

  await saveEntitlementRecord(userId, nextRecord);
  return nextRecord;
}

export async function ensureTrialRecord(userId: string): Promise<EntitlementRecord> {
  const record = await loadEntitlementRecord(userId);
  if (record.planTier === 'premium' || record.adminOverride) {
    return record;
  }
  if (record.trialStartedAt || record.trialUsed) {
    return record;
  }

  const startedAt = new Date();
  const nextRecord: EntitlementRecord = {
    ...record,
    trialStartedAt: startedAt.toISOString(),
    trialEndsAt: addDays(startedAt, TRIAL_LENGTH_DAYS).toISOString(),
    trialUsed: true,
    updatedAt: new Date().toISOString(),
  };
  await saveEntitlementRecord(userId, nextRecord);
  return nextRecord;
}

export function resolveEntitlement(record: EntitlementRecord, role: UserRole | null): ResolvedEntitlement {
  const state = resolveState(record, role);
  const isPremium = state === 'premium_active' || state === 'admin_override';
  const isTrialActive = state === 'trial_active';
  const canUsePremiumFeatures = isPremium || isTrialActive;

  return {
    role,
    state,
    planTier: record.planTier,
    trialStartedAt: record.trialStartedAt,
    trialEndsAt: record.trialEndsAt,
    isTrialActive,
    isPremium,
    isAdminOverride: state === 'admin_override',
    canUsePremiumFeatures,
  };
}

let billingAdapter: BillingAdapter = (() => {
  if (billingConfig.revenueCat.iosApiKey || billingConfig.revenueCat.androidApiKey) {
    return new RevenueCatBillingAdapter({
      iosApiKey: billingConfig.revenueCat.iosApiKey,
      androidApiKey: billingConfig.revenueCat.androidApiKey,
      entitlementId: billingConfig.revenueCat.entitlementId,
      offeringId: billingConfig.revenueCat.offeringId,
      expectedProductIds: billingConfig.revenueCat.expectedProductIds,
      expectedPackageIds: billingConfig.revenueCat.expectedPackageIds,
      environmentLabel: billingConfig.environmentLabel,
    });
  }

  return new MockBillingAdapter();
})();

export function getBillingAdapter() {
  return billingAdapter;
}

export function setBillingAdapter(adapter: BillingAdapter) {
  billingAdapter = adapter;
}