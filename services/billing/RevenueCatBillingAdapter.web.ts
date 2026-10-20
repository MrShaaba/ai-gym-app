import type {
  BillingAdapter,
  BillingCustomerState,
  BillingPlan,
  BillingPurchaseResult,
} from './BillingAdapter';

/**
 * The local web workspace has no billing provider. Expo still discovers the
 * native routes, so resolving this module must never initialize a payment SDK.
 * Native builds continue to resolve RevenueCatBillingAdapter.ts.
 */
export class RevenueCatBillingAdapter implements BillingAdapter {
  constructor(_options?: unknown) {}

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async configure(_appUserId?: string): Promise<void> {}

  async listPlans(): Promise<BillingPlan[]> {
    return [];
  }

  async purchase(_planId: string): Promise<BillingPurchaseResult> {
    return {
      success: false,
      message: 'Payments are not connected in this local web workspace.',
    };
  }

  async restorePurchases(): Promise<BillingPurchaseResult> {
    return {
      success: false,
      restored: false,
      message:
        'Purchase restoration is unavailable in this local web workspace.',
    };
  }

  async getCustomerState(): Promise<BillingCustomerState | null> {
    return null;
  }

  async openManageSubscription(_managementUrl?: string | null): Promise<void> {
    throw new Error(
      'Subscription management is not connected in this local web workspace.',
    );
  }

  async logOut(): Promise<void> {}
}
