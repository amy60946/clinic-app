// Mağaza katmanının ortak türleri (store.ios.ts: RevenueCat, store.ts: web, satış yok).
export type StorePrice = { price: number; priceString: string; perMonth?: string; currency: string };
export type StorePrices = Record<string, StorePrice>;   // ürün kimliği → mağazadaki fiyat
export type StoreResult =
  | { ok: true }
  | { ok: false; reason: 'not_connected' | 'unavailable' | 'canceled' | 'pending' | 'none' | 'failed'; message?: string };
// App Store aboneliğinin mağazadaki durumu (RevenueCat müşteri bilgisi, `clinic` hakkı). Abonelik yoksa ve web'de null.
// willRenew false + expiresAt → kendiliğinden yenileme kapatıldı (iptal edildi, dönem sonuna kadar açık);
// billingIssueAt → Apple ücreti alamadı (kullanıcının seçimi değil).
export type StoreSubscription = {
  productId: string | null;
  willRenew: boolean;
  expiresAt: string | null;
  billingIssueAt: string | null;
};
