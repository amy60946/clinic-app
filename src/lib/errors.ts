// Ekranda gösterilecek hata metni (güvenlik denetimi 22 Kasım 2026, ortak DURUM; Moyo'daki src/lib/errors.ts ile aynı kural).
// Bizim sunucu işlevlerimizin bilerek yazdığı Türkçe metin ("raise exception '…'") olduğu gibi gösterilir; tablo, kısıt, tetikleyici
// adı, hata kodu (alt çizgili anahtar) ya da İngilizce sunucu / kütüphane metni ekrana çıkmaz, tek genel metne düşer.
// Ham metin yalnız geliştirmede console'da kalır. Testi tests/errors.test.mjs.
declare const __DEV__: boolean | undefined;
export const GENERIC_ERROR = 'Bir şeyler ters gitti. Biraz sonra tekrar dene.';
export const NETWORK_ERROR = 'İnternet bağlantını kontrol et ve tekrar dene.';
const NETWORK = /network|failed to fetch|fetch failed|timed? ?out|offline/i;
const LETTERS = /[çğıöşüÇĞİÖŞÜ]/; // i bayrağı yok: İngilizce "i/I" Türkçe harf sayılmasın
const WORDS = /(^|[^a-zçğıöşü])(yok|gerekli|verdi|zaten|hesap|kod|kodu|davet|aile|oturum|yetki|yetkisiz|belge|seferde|uzman|klinik|ekip|seans|program|egitim)([^a-zçğıöşü]|$)/i;
const TECHNICAL = /_|\b(relation|constraint|column|table|function|violates|permission denied|duplicate key|syntax|jwt|pgrst|schema|null value|foreign key|trigger|row-level|policy|uuid|invalid input|sqlstate|bucket)\b/i;
export function errorText(e: unknown, fallback = GENERIC_ERROR): string {
  const m = typeof e === 'string' ? e : (e as { message?: unknown } | null | undefined)?.message;
  if (typeof m !== 'string' || !m.trim()) return fallback;
  if (NETWORK.test(m)) return NETWORK_ERROR;
  if ((LETTERS.test(m) || WORDS.test(m)) && !TECHNICAL.test(m) && m.length <= 300) return m.trim();
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('Gösterilmeyen hata metni:', m);
  return fallback;
}
