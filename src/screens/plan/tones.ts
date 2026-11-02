// Takip planı renk ayrımı (kullanıcı kararı 2 Kasım 2026, "C1"): aileye GİTMEYEN her şey bej zemin + "göz kapalı" simgesi
// (GAS, gönderilmemiş taslak, Planlandı program, yalnız sende olan hedef etiketi); açık hedef satırının başlığı açık lacivert.
export const PRIVATE = { bg: '#F7F1E6', line: '#E7D9BD', fg: '#7A5A1E', text: '#5A4A2A', card: '#FBF8F1' };
export const HEAD = '#F1F4FA';
export const STATUS_TONE = {
  active: { bg: '#E6EAF5', fg: '#2C4A9A' },
  achieved: { bg: '#E6F4EA', fg: '#2F7D4A' },
  paused: { bg: '#ECEEF3', fg: '#5D6680' },
  planned: { bg: PRIVATE.bg, fg: PRIVATE.fg },
  done: { bg: '#E6F4EA', fg: '#2F7D4A' },
} as const;
