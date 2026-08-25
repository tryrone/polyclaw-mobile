import { Platform } from 'react-native';

function apiKey() {
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
  })?.trim();
}

async function purchases() {
  const key = apiKey();
  if (!key) throw new Error('Subscriptions are not configured for this build.');
  const module = await import('react-native-purchases').catch(() => null);
  if (!module) throw new Error('Subscriptions require a PolyClaw development or store build.');
  return { Purchases: module.default, key };
}

export async function purchasePolyClawBot(userId: string) {
  const { Purchases, key } = await purchases();
  Purchases.configure({ apiKey: key, appUserID: userId });
  const offerings = await Purchases.getOfferings();
  const pack = offerings.current?.availablePackages.find((item) => item.product.identifier === (process.env.EXPO_PUBLIC_REVENUECAT_PRODUCT_ID ?? 'polyclaw_bot_monthly'))
    ?? offerings.current?.monthly
    ?? offerings.current?.availablePackages[0];
  if (!pack) throw new Error('The PolyClaw monthly subscription is not available yet.');
  return Purchases.purchasePackage(pack);
}

export async function restorePolyClawBot(userId: string) {
  const { Purchases, key } = await purchases();
  Purchases.configure({ apiKey: key, appUserID: userId });
  return Purchases.restorePurchases();
}
