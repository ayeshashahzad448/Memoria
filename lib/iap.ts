/**
 * In-app purchase boundary for the "Infinite Cosmos" Premium tier.
 *
 * This module is structured so a real StoreKit (iOS) / Google Play Billing
 * (Android) integration can drop in without touching the UI. When payments are
 * enabled for this project, wire `expo-iap` / `@biltme/iap` inside the marked
 * functions and return the live products / purchase result.
 *
 * Until then these return a placeholder product and a not-implemented purchase
 * so the paywall renders and the upgrade flow can be exercised end to end.
 */

export const PREMIUM_PRODUCT_ID = 'memoria.premium.infinite.monthly';

export interface IapProduct {
  id: string;
  title: string;
  /** Localized display price, e.g. "$4.99". Placeholder until payments are live. */
  displayPrice: string;
  period: string;
}

export interface PurchaseResult {
  success: boolean;
  /** True when the purchase flow is not yet wired (payments not enabled). */
  notAvailable?: boolean;
}

/**
 * Fetch the Premium product. Replace the placeholder with a real product fetch
 * once payments are enabled (StoreKit / Play Billing return localized pricing).
 */
export async function getPremiumProduct(): Promise<IapProduct> {
  // TODO(native): fetch real product via expo-iap once payments are enabled.
  return {
    id: PREMIUM_PRODUCT_ID,
    title: 'Memoria Premium',
    displayPrice: 'PRICE_TBD',
    period: 'month',
  };
}

/**
 * Start the purchase flow. Replace with the real StoreKit / Play Billing call
 * once payments are enabled. Returns notAvailable=true until then.
 */
export async function purchasePremium(): Promise<PurchaseResult> {
  // TODO(native): trigger expo-iap requestPurchase + verify receipt server-side.
  return { success: false, notAvailable: true };
}

/**
 * Restore previously purchased entitlements (required by App Store review).
 */
export async function restorePremium(): Promise<PurchaseResult> {
  // TODO(native): call expo-iap getAvailablePurchases / restore.
  return { success: false, notAvailable: true };
}
