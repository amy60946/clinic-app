// Davranışlar ve Olaylar: saf yardımcılar (sunucu çağrısı yok; testi tests/behaviors.test.mjs).
// "Diğer bildirilen olaylar" iki kaynağı tarih sırasıyla birleştirir (kullanıcı kararı 23 Kasım 2026):
// hedef davranışa bağlı olmayan olaylar (behavior_incidents) ve ebeveynin Moyo'daki "Davranış kaydı" (abc_events).
// Kayıt türü çoklu seçim (kullanıcı kararı 23 Kasım 2026; ortak akislar.md 27.3, veritabani.md 40.3): tür listesi, tablo sütunları, olay formu.
import type { TargetBehavior, Incident, LogType } from './behaviors';
import type { AbcEvent, DayPart } from './metrics';
import { dayPart } from './metrics.ts';

// ---------------------------------------------------------------- kayıt türleri
// Sabit sıra sıklık · ABC · süre (sunucu da bu sıraya dizer, tekrarı düşürür; log_type = ilk tür)
export const LOG_TYPE_ORDER: readonly LogType[] = ['frequency', 'abc', 'duration'];
type Types = readonly (string | null | undefined)[] | null | undefined;
// Tekil, sabit sırada; bilinmeyen değer düşer
export const normLogTypes = (list: Types): LogType[] => { const have = new Set(list ?? []); return LOG_TYPE_ORDER.filter((t) => have.has(t)); };

// Hedef davranışın türleri: log_types; sunucuda sütun yoksa (eski sunucu) ya da boşsa eski tek log_type
export function behaviorTypes(b: { log_type?: string | null; log_types?: Types }): LogType[] {
  const list = normLogTypes(b.log_types);
  if (list.length) return list;
  const one = normLogTypes([b.log_type]);
  return one.length ? one : ['frequency'];
}
// Olayın kendi türleri (bildirim anının kopyası): log_types, yoksa eski log_type, o da yoksa davranışın türleri
export function incidentTypes(i: { log_type?: string | null; log_types?: Types }, fallback: LogType[]): LogType[] {
  const list = normLogTypes(i.log_types);
  if (list.length) return list;
  const one = normLogTypes([i.log_type]);
  return one.length ? one : fallback;
}
// Olay tablosunun türleri: davranışın seçili bütün türleri + olayların kendi türleri (tür sonradan değişse de eski olay kendi alanlarıyla görünür)
export function typesShown(b: { log_type?: string | null; log_types?: Types }, incidents: { log_type?: string | null; log_types?: Types }[]): LogType[] {
  const own = behaviorTypes(b);
  return normLogTypes([...own, ...incidents.flatMap((i) => incidentTypes(i, own))]);
}
// Türlere göre ayrıntı sütunları: sıklık → Sayı, ABC → Öncül + Sonuç, süre → Süre
export type DetailCol = 'count' | 'antecedent' | 'consequence' | 'duration';
const DETAIL: Record<LogType, DetailCol[]> = { frequency: ['count'], abc: ['antecedent', 'consequence'], duration: ['duration'] };
export const detailCols = (types: Types): DetailCol[] => normLogTypes(types).flatMap((t) => DETAIL[t]);

// Formdaki çoklu seçim: dokunulan tür eklenir ya da çıkar; en az biri seçili kalır
export function toggleLogType(list: Types, t: LogType): LogType[] {
  const cur = normLogTypes(list);
  const next = cur.includes(t) ? cur.filter((x) => x !== t) : normLogTypes([...cur, t]);
  return next.length ? next : cur;
}

// Olay formunun 2. adımı (sunucudaki family_incident_report): seçili her türün alanı zorunlu; eksik olan türler
export type IncidentFields = { count: string; minutes: string; before: string; after: string };
export const missingFields = (types: Types, f: IncidentFields): LogType[] => normLogTypes(types).filter((t) =>
  t === 'frequency' ? !(Number(f.count) >= 1) : t === 'abc' ? !(f.before.trim() && f.after.trim()) : f.minutes === '');

// ---------------------------------------------------------------- tarih
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const pad = (n: number) => String(n).padStart(2, '0');
// "9 Kas" ve "17:00" (yerel saat)
export const dayLabel = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const timeLabel = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

const PART_LABEL: Record<DayPart, string> = { sabah: 'Sabah', 'öğle': 'Öğle', 'akşam': 'Akşam', gece: 'Gece' };
// Davranış kaydında saat temsilîdir (ebeveyn gün bölümünü seçer): gün bölümü; gün bölümü olmayan eski kayıtta saat
export const abcWhen = (e: Pick<AbcEvent, 'occurred_at' | 'day_part'>) => (e.day_part ? PART_LABEL[dayPart(e)] : timeLabel(e.occurred_at));

export const OTHER = '__other__';   // "Diğer bildirilen olaylar" kartının kimliği
export const incidentKey = (id: string) => `incident:${id}`;
export const abcKey = (id: string) => `abc:${id}`;

export type OtherRow =
  | { kind: 'incident'; key: string; at: string; incident: Incident }
  | { kind: 'abc'; key: string; at: string; abc: AbcEvent };

// Hedef davranışa bağlı olmayan (ya da hedefi silinmiş) olaylar + ebeveynin davranış kayıtları, yeniden eskiye.
// Arşivlenen hedef davranışın olayları burada değil, "Arşivlenenler"deki kartında.
export function otherRows(incidents: Incident[], behaviors: Pick<TargetBehavior, 'id'>[], abc: AbcEvent[]): OtherRow[] {
  const known = new Set(behaviors.map((b) => b.id));
  const rows: OtherRow[] = [
    ...incidents.filter((i) => !i.behavior_id || !known.has(i.behavior_id))
      .map((i) => ({ kind: 'incident' as const, key: incidentKey(i.id), at: i.occurred_at, incident: i })),
    ...abc.map((e) => ({ kind: 'abc' as const, key: abcKey(e.id), at: e.occurred_at, abc: e })),
  ];
  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

// Bildirimden gelen kayıt: abc_event → data.abc_id (çok çocuklu kayıtta data.items[].abc_id), behavior_incident → data.incident_id
export type BehaviorFocus = { kind: 'abc' | 'incident'; id: string };
// Kaydın yeri: açılacak kart (hedef davranış kimliği ya da OTHER), arşivde mi, vurgulanacak satır
export type FocusPlace = { card: string; archived: boolean; row: string };

// Bildirimden odak: abc_event → data.abc_id (toplu bildirimde data.items[] çocuk başına), behavior_incident → data.incident_id
export function focusFromNotification(n: { kind: string; data: Record<string, any> }, childId: string): BehaviorFocus | null {
  if (n.kind === 'abc_event') {
    const item = Array.isArray(n.data?.items) ? n.data.items.find((i: any) => i?.child_id === childId) : null;
    const id = item?.abc_id ?? n.data?.abc_id;
    return typeof id === 'string' ? { kind: 'abc', id } : null;
  }
  if (n.kind === 'behavior_incident' && typeof n.data?.incident_id === 'string') return { kind: 'incident', id: n.data.incident_id };
  return null;
}

export function locateFocus(f: BehaviorFocus, behaviors: Pick<TargetBehavior, 'id' | 'archived'>[], incidents: Incident[], abc: AbcEvent[]): FocusPlace | null {
  if (f.kind === 'abc') return abc.some((e) => e.id === f.id) ? { card: OTHER, archived: false, row: abcKey(f.id) } : null;
  const i = incidents.find((x) => x.id === f.id);
  if (!i) return null;
  const b = i.behavior_id ? behaviors.find((x) => x.id === i.behavior_id) : undefined;
  return b ? { card: b.id, archived: b.archived, row: incidentKey(i.id) } : { card: OTHER, archived: false, row: incidentKey(i.id) };
}
