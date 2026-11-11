// Mağaza katmanının ortak türleri (store.ios.ts: RevenueCat, store.ts: web, satış yok).
export type StorePrice = { price: number; priceString: string; perMonth?: string; currency: string };
export type StorePrices = Record<string, StorePrice>;   // ürün kimliği → mağazadaki fiyat
export type StoreResult =
  | { ok: true }
  | { ok: false; reason: 'not_connected' | 'unavailable' | 'canceled' | 'pending' | 'none' | 'failed'; message?: string };
