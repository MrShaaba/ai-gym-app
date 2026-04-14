import type { BillingAdapter, BillingCustomerState, BillingPlan } from '@/services/billing/BillingAdapter';

const PLANS: BillingPlan[] = [
  {
    id: 'premium_monthly',
    productIdentifier: 'premium_monthly',
    name: 'Premium Monthly',
    description: 'Unlimited premium features billed monthly.',
    priceLabel: '$9.99',
    interval: 'month',
    featured: true,
    offeringId: 'default',
  },
  {
    id: 'premium_annual',
    productIdentifier: 'premium_annual',
    name: 'Premium Annual',
    description: 'Unlimited premium features billed annually.',
    priceLabel: '$79.99',
    interval: 'year',
    offeringId: 'default',
  },
];

export class MockBillingAdapter implements BillingAdapter {
  async isAvailable() {
    return false;
  }

  async configure() {
    return;
  }

  async listPlans() {
    return PLANS;
  }

  async purchase(_planId: string) {
    return { success: false, message: 'Billing is still using the mock adapter.' };
  }

  async restorePurchases() {
    return { success: false, restored: false, message: 'No purchases to restore in mock mode.' };
  }

  async getCustomerState(): Promise<BillingCustomerState | null> {
    return {
      premiumActive: false,
      entitlementId: null,
      managementUrl: null,
      activeProductIds: [],
      latestExpirationDate: null,
    };
  }

  async openManageSubscription() {
    return;
  }

  async logOut() {
    return;
  }
}