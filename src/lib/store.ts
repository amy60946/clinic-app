// Web (ve Android): App Store yok; web'de satış yok (kullanıcı kararı 22 Ekim 2026): üyelik iPhone/iPad'deki
// ClinicApp'ten alınır, hesaba bağlıdır, web'de de açılır. iOS sürümü: store.ios.ts (RevenueCat).
import type { StorePrices, StoreResult } from './storeTypes';

export const storeKind: 'web' | 'app_store' = 'web';
export const storeEnabled = false;
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
