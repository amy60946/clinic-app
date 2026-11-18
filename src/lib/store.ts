// Web (ve Android): App Store yok; web'de satış yok (kullanıcı kararı 22 Ekim 2026): üyelik iPhone/iPad'deki
// ClinicApp'ten alınır, hesaba bağlıdır, web'de de açılır. iOS sürümü: store.ios.ts (RevenueCat).
import type { StorePrices, StoreResult, StoreSubscription } from './storeTypes';

export const storeKind: 'web' | 'app_store' = 'web';
export const storeEnabled = false;
export const storePreview = false;   // yalnız web önizlemesindeki deneme mağazasında true (preview/demo-store.ts)
export const MANAGE_URL = 'https://apps.apple.com/account/subscriptions';

export async function storeLogOut(): Promise<void> {}
export async function storePrices(_userId: string, _productIds: string[]): Promise<StorePrices | null> {
  return null;
}
export async function storePurchase(_userId: string, _productId: string, _clinicId: string): Promise<StoreResult> {
  return { ok: false, reason: 'not_connected' };
}
export async function storeRestore(_userId: string, _clinicId: string): Promise<StoreResult> {
  return { ok: false, reason: 'not_connected' };
}
export async function storeManage(_userId: string): Promise<void> {}
// Web'de mağaza yok: Apple'ın abonelik sayfası açılamaz (false), abonelik durumu bilinmez (null)
export async function storeOpenSubscriptions(_userId: string): Promise<boolean> {
  return false;
}
export async function storeSubscription(_userId: string, _fresh = false): Promise<StoreSubscription | null> {
  return null;
}
