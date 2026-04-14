export type BillingPlanInterval = 'week' | 'month' | 'year' | 'lifetime' | 'custom';

export interface BillingPlan {
  id: string;
  productIdentifier: string;
  name: string;
  description?: string;
  priceLabel: string;
  interval: BillingPlanInterval;
  featured?: boolean;
  offeringId?: string;
}

export interface BillingCustomerState {
  premiumActive: boolean;
  entitlementId: string | null;
  managementUrl: string | null;
  activeProductIds: string[];
  latestExpirationDate: string | null;
}

export interface BillingPurchaseResult {
  success: boolean;
  cancelled?: boolean;
  restored?: boolean;
  message?: string;
}

export interface BillingAdapter {
  isAvailable(): Promise<boolean>;
  configure(appUserId?: string): Promise<void>;
  listPlans(): Promise<BillingPlan[]>;
  purchase(planId: string): Promise<BillingPurchaseResult>;
  restorePurchases(): Promise<BillingPurchaseResult>;
  getCustomerState(): Promise<BillingCustomerState | null>;
  openManageSubscription(managementUrl?: string | null): Promise<void>;
  logOut(): Promise<void>;
}