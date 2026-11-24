import AsyncStorage from '@react-native-async-storage/async-storage';

// Dikkat panosunda "Ebeveynden yeni" görüldü işareti (bu cihazda; danışan başına son görülme zamanı).
// Danışanın sayfası hangi yoldan açılırsa açılsın (pano, bildirim, takvim, ayarlar) işaret buradan yazılır; pano dönüşte okur.
// Bellekteki kopya asıl kaynaktır: art arda iki yazma birbirini ezmez.
const KEY = (id: string) => `clinic.attention.seen.v1.${id}`;
const cache: Record<string, Record<string, string>> = {};
const reading: Record<string, Promise<Record<string, string>>> = {};

export const peekSeen = (meId: string): Record<string, string> => cache[meId] ?? {};

// Depodan bir kez okunur (aynı anda gelen çağrılar tek okumayı bekler), sonra bellekten
export function loadSeen(meId: string): Promise<Record<string, string>> {
  if (cache[meId]) return Promise.resolve(cache[meId]);
  reading[meId] ??= AsyncStorage.getItem(KEY(meId))
    .then((v) => (v ? JSON.parse(v) as Record<string, string> : {})).catch(() => ({}))
    .then((stored) => { cache[meId] ??= stored; return cache[meId]; });
  return reading[meId];
}

export async function markSeen(meId: string, linkId: string): Promise<Record<string, string>> {
  await loadSeen(meId);
  const next = { ...cache[meId], [linkId]: new Date().toISOString() };   // okuma bittikten sonraki güncel kopya
  cache[meId] = next;
  AsyncStorage.setItem(KEY(meId), JSON.stringify(next)).catch(() => {});
  return next;
}
