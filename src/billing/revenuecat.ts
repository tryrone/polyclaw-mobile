import { Linking, Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

let configuredUserId: string | null = null;

function apiKey() {
  if (Platform.OS !== 'ios') throw new Error('PolyClaw subscriptions are disabled on Android for this release.');
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  })?.trim();
}

async function purchases(userId: string) {
  const key = apiKey();
  if (!key) throw new Error('Subscriptions are not configured for this build.');
  const module = await import('react-native-purchases').catch(() => null);
  if (!module) throw new Error('Subscriptions require a PolyClaw development or store build.');
  const Purchases = module.default;
  if (!(await Purchases.isConfigured())) {
    Purchases.configure({ apiKey: key, appUserID: userId });
    configuredUserId = userId;
  } else if (configuredUserId !== userId) {
    await Purchases.logIn(userId);
    configuredUserId = userId;
  }
  return Purchases;
}

async function monthlyPackage(userId: string): Promise<PurchasesPackage> {
  const Purchases = await purchases(userId);
  const offerings = await Purchases.getOfferings();
  const productId = process.env.EXPO_PUBLIC_REVENUECAT_PRODUCT_ID ?? 'polyclaw_bot_monthly';
  const pack = offerings.current?.availablePackages.find((item) => item.product.identifier === productId);
  if (!pack) throw new Error('The PolyClaw monthly subscription is not available yet.');
  return pack;
}

export async function getPolyClawSubscription(userId: string) {
  const Purchases = await purchases(userId);
  const [pack, customerInfo] = await Promise.all([monthlyPackage(userId), Purchases.getCustomerInfo()]);
  return { localizedPrice: pack.product.priceString, productId: pack.product.identifier, active: Boolean(customerInfo.entitlements.active.POLYCLAW_BOT), customerInfo };
}

export async function purchasePolyClawBot(userId: string) {
  const Purchases = await purchases(userId);
  return Purchases.purchasePackage(await monthlyPackage(userId));
}

export async function restorePolyClawBot(userId: string) {
  return (await purchases(userId)).restorePurchases();
}

export async function refreshPolyClawCustomerInfo(userId: string) {
  return (await purchases(userId)).getCustomerInfo();
}

export async function openSubscriptionManagement(userId: string) {
  const info = await refreshPolyClawCustomerInfo(userId);
  if (!info.managementURL) throw new Error('Subscription management is not available for this store account.');
  await Linking.openURL(info.managementURL);
}

export async function listenForCustomerInfo(userId: string, listener: (info: CustomerInfo) => void) {
  const Purchases = await purchases(userId);
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
