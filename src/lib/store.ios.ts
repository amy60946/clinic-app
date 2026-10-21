import {
  initConnection, fetchProducts, requestPurchase, purchaseUpdatedListener, purchaseErrorListener, finishTransaction,
  getAvailablePurchases, deepLinkToSubscriptions, isUserCancelledError,
} from 'expo-iap';
import type { Purchase } from 'expo-iap';

// App Store aboneliği (StoreKit 2). Satın alma klinik kimliğiyle (appAccountToken) yapılır; sunucu
// (clinic-billing/apple-verify) işlemi Apple'a sorup doğruladıktan sonra işlem kapatılır.
export const storeKind: 'web' | 'app_store' = 'app_store';
const PREFIX = 'com.clinicapp.uzman.';

let ready: Promise<unknown> | null = null;
const connect = () => (ready ??= initConnection().catch((e) => { ready = null; throw e; }));

// Mağazadaki yerel fiyat metinleri (ürün kimliği → "₺749,99")
export async function storePrices(skus: string[]): Promise<Record<string, string>> {
  await connect();
  const list = ((await fetchProducts({ skus, type: 'subs' })) ?? []) as { id: string; displayPrice: string }[];
  return Object.fromEntries(list.map((p) => [p.id, p.displayPrice]));
}

export async function buy(sku: string, clinicId: string, verify: (transactionId: string) => Promise<unknown>): Promise<'ok' | 'cancelled'> {
  await connect();
  return new Promise((resolve, reject) => {
    const done = () => { up.remove(); err.remove(); };
    const up = purchaseUpdatedListener(async (p: Purchase) => {
      if (p.productId !== sku) return;
      try {
        await verify(p.id);
        await finishTransaction({ purchase: p, isConsumable: false });
        done();
        resolve('ok');
      } catch (e) {
        done();
        reject(e);
      }
    });
    const err = purchaseErrorListener((e) => {
      done();
      if (isUserCancelledError(e)) resolve('cancelled');
      else reject(new Error(e.message || 'Satın alma tamamlanamadı'));
    });
    requestPurchase({ request: { apple: { sku, appAccountToken: clinicId } }, type: 'subs' }).catch((e: Error) => {
      done();
      if (isUserCancelledError(e)) resolve('cancelled');
      else reject(e);
    });
  });
}

// Satın alımları geri yükle: bu Apple hesabındaki ClinicApp abonelikleri sunucuda yeniden doğrulanır
export async function restore(verify: (transactionId: string) => Promise<unknown>): Promise<number> {
  await connect();
  const list = await getAvailablePurchases();
  let n = 0;
  for (const p of list) {
    if (!p.productId.startsWith(PREFIX)) continue;
    await verify(p.id);
    await finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
    n++;
  }
  return n;
}

export const manage = () => deepLinkToSubscriptions({});
