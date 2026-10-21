// Web (ve Android): App Store yok; üyelik web'de iyzico ile alınır (billing.ts → startWebCheckout).
// iOS sürümü: store.ios.ts.
export const storeKind: 'web' | 'app_store' = 'web';

export async function storePrices(_skus: string[]): Promise<Record<string, string>> {
  return {};
}
export async function buy(_sku: string, _clinicId: string, _verify: (id: string) => Promise<unknown>): Promise<'ok' | 'cancelled'> {
  throw new Error('Bu cihazda mağaza satın alması yok');
}
export async function restore(_verify: (id: string) => Promise<unknown>): Promise<number> {
  return 0;
}
export async function manage(): Promise<void> {}
