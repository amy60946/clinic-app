import { Linking } from 'react-native';
import Purchases, {
  LOG_LEVEL, PRODUCT_CATEGORY, PURCHASES_ERROR_CODE,
  type CustomerInfo, type PurchasesPackage, type PurchasesStoreProduct,
} from 'react-native-purchases';
import type { StorePrices, StoreResult } from './storeTypes';

// App Store üyeliği (RevenueCat; ortak CANLIYA_ALMA.md 1.8 D, 2.4). Mağazayla konuşan tek dosya; web: store.ts.
// Anahtar: EXPO_PUBLIC_REVENUECAT_IOS_KEY = RevenueCat'in herkese açık iOS anahtarı (appl_…), GitHub Secrets → CI .env.
// Gizli anahtar (sk_…) uygulamaya ve depoya asla girmez. Anahtar yoksa mağaza kapalı: üyelik ekranı "henüz açık değil" der.
// Kimlik: RevenueCat app_user_id = Supabase kullanıcı kimliği. Satın almadan ve geri yüklemeden hemen önce abone niteliği
// `clinic_id` = seçili çalışma alanı (billing-webhook üyeliği o kliniğe yazar; yoksa uzmanın varsayılan kliniğine).
// Üyeliği sunucu yazar (billing-webhook → billing_apply); uygulama yalnız satın alır ve sonra clinician_me'yi yeniden okur.
const KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ENTITLEMENT = 'clinic';
const OFFERING = 'clinic';   // proje ParentApp ile ortak; varsayılan (current) offering ParentApp'in, bu değil
const PREFIX = 'com.clinicapp.uzman.';
export const MANAGE_URL = 'https://apps.apple.com/account/subscriptions';

export const storeKind: 'web' | 'app_store' = 'app_store';
export const storeEnabled = KEY.startsWith('appl_');

let configured = false;
let current: string | null = null;
let queue: Promise<unknown> = Promise.resolve();
const pkgs: Record<string, PurchasesPackage> = {};
const products: Record<string, PurchasesStoreProduct> = {};

// Kimlik değişimleri sırayla: ilk seferde configure(appUserID), kullanıcı değiştiyse logIn
function identify(userId: string): Promise<boolean> {
  const p = queue.then(async () => {
    if (!configured) {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG).catch(() => {});
      Purchases.configure({ apiKey: KEY, appUserID: userId });
      configured = true;
      current = userId;
    } else if (current !== userId) {
      await Purchases.logIn(userId);
      current = userId;
    }
  });
  queue = p.catch(() => {});
  return p.then(() => true, () => false);
}
const ready = async (userId: string) => storeEnabled && !!userId && (await identify(userId));

// Çıkışta mağaza kimliği bırakılır (anonim kullanıcıda logOut hata verir, atlanır)
export async function storeLogOut(): Promise<void> {
  if (!storeEnabled || !configured) return;
  const p = queue.then(async () => {
    current = null;
    if (!(await Purchases.isAnonymous())) await Purchases.logOut();
  });
  queue = p.catch(() => {});
  await p.catch(() => {});
}

// Fiyatlar mağazadan, kullanıcının para biriminde (ürün kimliği → fiyat). Hiçbiri gelmezse null.
export async function storePrices(userId: string, productIds: string[]): Promise<StorePrices | null> {
  if (!(await ready(userId))) return null;
  const out: StorePrices = {};
  const put = (p: PurchasesStoreProduct) => {
    products[p.identifier] = p;
    out[p.identifier] = { price: p.price, priceString: p.priceString, perMonth: p.pricePerMonthString ?? undefined, currency: p.currencyCode };
  };
  try {
    const off = (await Purchases.getOfferings()).all[OFFERING];
    off?.availablePackages.forEach((x) => {
      if (!productIds.includes(x.product.identifier)) return;
      pkgs[x.product.identifier] = x;
      put(x.product);
    });
  } catch { /* ürünlere doğrudan sor */ }
  const missing = productIds.filter((id) => !out[id]);
  if (missing.length) {
    try { (await Purchases.getProducts(missing, PRODUCT_CATEGORY.SUBSCRIPTION)).forEach(put); } catch { /* yok */ }
  }
  return Object.keys(out).length ? out : null;
}

const hasClinic = (ci: CustomerInfo, productId?: string) =>
  !!ci.entitlements.active[ENTITLEMENT]
  || ci.activeSubscriptions.some((s) => (productId ? s === productId : s.startsWith(PREFIX)));

const fail = (e: any): StoreResult => {
  if (e?.userCancelled || e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { ok: false, reason: 'canceled' };
  if (e?.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { ok: false, reason: 'pending' };
  return { ok: false, reason: 'failed', message: e?.message };
};

// Üyelik hangi klinik için: webhook bu niteliği okur (satın almayla birlikte RevenueCat'e gider)
const tagClinic = (clinicId: string) => Purchases.setAttributes({ clinic_id: clinicId }).catch(() => {});

export async function storePurchase(userId: string, productId: string, clinicId: string): Promise<StoreResult> {
  if (!(await ready(userId))) return { ok: false, reason: 'not_connected' };
  if (!pkgs[productId] && !products[productId]) await storePrices(userId, [productId]);
  const pkg = pkgs[productId];
  const product = products[productId];
  if (!pkg && !product) return { ok: false, reason: 'unavailable' };
  try {
    await tagClinic(clinicId);
    const r = pkg ? await Purchases.purchasePackage(pkg) : await Purchases.purchaseStoreProduct(product);
    return hasClinic(r.customerInfo, productId) ? { ok: true } : { ok: false, reason: 'pending' };
  } catch (e) {
    return fail(e);
  }
}

// Geri yükle: bu Apple hesabındaki ClinicApp aboneliği bu kullanıcıya bağlanır (RevenueCat aktarır, webhook yazar)
export async function storeRestore(userId: string, clinicId: string): Promise<StoreResult> {
  if (!(await ready(userId))) return { ok: false, reason: 'not_connected' };
  try {
    await tagClinic(clinicId);
    return hasClinic(await Purchases.restorePurchases()) ? { ok: true } : { ok: false, reason: 'none' };
  } catch (e) {
    return fail(e);
  }
}

// Aboneliği yönet: uygulama içinde Apple'ın abonelik sayfası; olmazsa App Store bağlantısı
export async function storeManage(userId: string): Promise<void> {
  if (await ready(userId)) {
    try { await Purchases.showManageSubscriptions(); return; } catch { /* bağlantıya düş */ }
  }
  Linking.openURL(MANAGE_URL).catch(() => {});
}
