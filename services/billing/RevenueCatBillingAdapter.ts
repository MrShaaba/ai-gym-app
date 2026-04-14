import { Linking, Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import type {
  BillingAdapter,
  BillingCustomerState,
  BillingPlan,
  BillingPlanInterval,
  BillingPurchaseResult,
} from '@/services/billing/BillingAdapter';

interface RevenueCatBillingAdapterOptions {
  iosApiKey?: string;
  androidApiKey?: string;
  entitlementId: string;
  offeringId?: string;
  expectedProductIds?: string[];
  expectedPackageIds?: string[];
  environmentLabel?: string;
}

function packageTypeToInterval(packageType: PACKAGE_TYPE): BillingPlanInterval {
  switch (packageType) {
    case PACKAGE_TYPE.MONTHLY:
      return 'month';
    case PACKAGE_TYPE.ANNUAL:
      return 'year';
    case PACKAGE_TYPE.WEEKLY:
      return 'week';
    case PACKAGE_TYPE.LIFETIME:
      return 'lifetime';
    default:
      return 'custom';
  }
}

function offeringToPackages(offering: PurchasesOffering | null): PurchasesPackage[] {
  return offering?.availablePackages ?? [];
}

function selectPreferredOffering(
  offerings: { current: PurchasesOffering | null; all: Record<string, PurchasesOffering> },
  preferredOfferingId?: string,
) {
  return (preferredOfferingId ? offerings.all[preferredOfferingId] : null)
    ?? offerings.current
    ?? offerings.all.default
    ?? Object.values(offerings.all)[0]
    ?? null;
}

export class RevenueCatBillingAdapter implements BillingAdapter {
  private readonly entitlementId: string;
  private readonly apiKey: string;
  private readonly offeringId: string;
  private readonly expectedProductIds: string[];
  private readonly expectedPackageIds: string[];
  private readonly environmentLabel: string;
  private configuredUserId: string | null = null;
  private initialized = false;
  private packageCache = new Map<string, PurchasesPackage>();

  constructor(options: RevenueCatBillingAdapterOptions) {
    this.entitlementId = options.entitlementId;
    this.offeringId = options.offeringId ?? 'default';
    this.expectedProductIds = options.expectedProductIds ?? [];
    this.expectedPackageIds = options.expectedPackageIds ?? [];
    this.environmentLabel = options.environmentLabel ?? 'RevenueCat';
    this.apiKey = Platform.OS === 'ios'
      ? options.iosApiKey ?? ''
      : options.androidApiKey ?? '';
  }

  async isAvailable() {
    return Platform.OS !== 'web' && this.apiKey.length > 0;
  }

  async configure(appUserId?: string) {
    if (!(await this.isAvailable())) return;

    if (!this.initialized) {
      Purchases.configure({ apiKey: this.apiKey, appUserID: appUserId });
      await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
      this.initialized = true;
      this.configuredUserId = appUserId ?? null;
      return;
    }

    if (appUserId && appUserId !== this.configuredUserId) {
      await Purchases.logIn(appUserId);
      this.configuredUserId = appUserId;
    }
  }

  async listPlans(): Promise<BillingPlan[]> {
    if (!(await this.isAvailable())) return [];

    const offerings = await Purchases.getOfferings();
    const currentOffering = selectPreferredOffering(offerings, this.offeringId);

    if (!offerings.all[this.offeringId] && Object.keys(offerings.all).length > 0) {
      console.warn(`[Billing] Preferred RevenueCat offering "${this.offeringId}" was not found in ${this.environmentLabel}. Falling back to the available offering.`);
    }

    const packages = offeringToPackages(currentOffering);

    this.packageCache = new Map(packages.map((pkg) => [pkg.identifier, pkg]));

    if (this.expectedProductIds.length > 0) {
      const returnedProductIds = packages.map((pkg) => pkg.product.identifier);
      const hasExpectedProduct = returnedProductIds.some((productId) => this.expectedProductIds.includes(productId));
      if (!hasExpectedProduct) {
        console.warn(`[Billing] RevenueCat returned unexpected product identifiers for ${this.environmentLabel}. Expected one of: ${this.expectedProductIds.join(', ') || 'n/a'}. Received: ${returnedProductIds.join(', ') || 'none'}.`);
      }
    }

    if (this.expectedPackageIds.length > 0) {
      const returnedPackageIds = packages.map((pkg) => pkg.identifier);
      const hasExpectedPackage = returnedPackageIds.some((packageId) => this.expectedPackageIds.includes(packageId));
      if (!hasExpectedPackage) {
        console.warn(`[Billing] RevenueCat returned unexpected package identifiers for ${this.environmentLabel}. Expected one of: ${this.expectedPackageIds.join(', ') || 'n/a'}. Received: ${returnedPackageIds.join(', ') || 'none'}.`);
      }
    }

    return packages.map((pkg) => ({
      id: pkg.identifier,
      productIdentifier: pkg.product.identifier,
      name: pkg.product.title,
      description: pkg.product.description,
      priceLabel: pkg.product.priceString,
      interval: packageTypeToInterval(pkg.packageType),
      featured: pkg.packageType === PACKAGE_TYPE.MONTHLY || pkg.packageType === PACKAGE_TYPE.ANNUAL,
      offeringId: pkg.presentedOfferingContext?.offeringIdentifier ?? pkg.offeringIdentifier,
    }));
  }

  async purchase(planId: string): Promise<BillingPurchaseResult> {
    if (!(await this.isAvailable())) {
      return { success: false, message: 'Billing is not available on this build.' };
    }

    const cached = this.packageCache.get(planId);
    const targetPackage = cached ?? (await this.findPackage(planId));

    if (!targetPackage) {
      return { success: false, message: 'Selected subscription is no longer available.' };
    }

    try {
      await Purchases.purchasePackage(targetPackage);
      return { success: true };
    } catch (error) {
      return this.toPurchaseResult(error);
    }
  }

  async restorePurchases(): Promise<BillingPurchaseResult> {
    if (!(await this.isAvailable())) {
      return { success: false, restored: false, message: 'Billing is not available on this build.' };
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      const premiumActive = this.extractPremiumState(customerInfo).premiumActive;
      return {
        success: premiumActive,
        restored: premiumActive,
        message: premiumActive ? 'Purchases restored.' : 'No active premium subscription found to restore.',
      };
    } catch (error) {
      return this.toPurchaseResult(error);
    }
  }

  async getCustomerState(): Promise<BillingCustomerState | null> {
    if (!(await this.isAvailable())) return null;

    const customerInfo = await Purchases.getCustomerInfo();
    return this.extractPremiumState(customerInfo);
  }

  async openManageSubscription(managementUrl?: string | null) {
    const url = managementUrl ?? (await this.getCustomerState())?.managementUrl ?? null;
    if (!url) return;
    await Linking.openURL(url);
  }

  async logOut() {
    if (!this.initialized || !(await this.isAvailable())) return;
    await Purchases.logOut();
    this.configuredUserId = null;
  }

  private async findPackage(planId: string) {
    const plans = await this.listPlans();
    return this.packageCache.get(planId) ?? this.packageCache.get(plans.find((plan) => plan.id === planId)?.id ?? '');
  }

  private extractPremiumState(customerInfo: CustomerInfo): BillingCustomerState {
    const entitlement = customerInfo.entitlements.active[this.entitlementId]
      ?? customerInfo.entitlements.all[this.entitlementId]
      ?? null;

    return {
      premiumActive: Boolean(entitlement?.isActive),
      entitlementId: entitlement?.identifier ?? null,
      managementUrl: customerInfo.managementURL,
      activeProductIds: customerInfo.activeSubscriptions,
      latestExpirationDate: customerInfo.latestExpirationDate,
    };
  }

  private toPurchaseResult(error: unknown): BillingPurchaseResult {
    const purchasesError = error as PurchasesError;
    if (purchasesError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, cancelled: true, message: 'Purchase cancelled.' };
    }

    if (purchasesError?.code === PURCHASES_ERROR_CODE.NETWORK_ERROR || purchasesError?.code === PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR) {
      return { success: false, message: 'Could not reach the billing service. Please try again.' };
    }

    if (purchasesError?.code === PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR) {
      return { success: false, message: 'This subscription is not currently available for purchase.' };
    }

    return {
      success: false,
      message: purchasesError?.message ?? 'Purchase failed. Please try again.',
    };
  }
}