export type BillingEnvironment = 'test' | 'production';

function parseCsv(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveBillingEnvironment(value: string | undefined): BillingEnvironment {
  return value === 'production' ? 'production' : 'test';
}

const environment = resolveBillingEnvironment(process.env.EXPO_PUBLIC_BILLING_ENV);

export const billingConfig = {
  environment,
  environmentLabel: environment === 'production' ? 'Production' : 'Test Store',
  revenueCat: {
    iosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '',
    androidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '',
    entitlementId: process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? 'premium',
    offeringId: process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID ?? 'default',
    expectedProductIds: parseCsv(process.env.EXPO_PUBLIC_REVENUECAT_EXPECTED_PRODUCT_IDS),
    expectedPackageIds: parseCsv(process.env.EXPO_PUBLIC_REVENUECAT_EXPECTED_PACKAGE_IDS),
  },
} as const;
