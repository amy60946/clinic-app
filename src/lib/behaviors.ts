// Davranışlar ve olaylar (kullanıcı isteği 9 Kasım 2026: rakibin "Target behaviors & reported incidents" ekranlarına sadık;
// mevcut "Davranış hedefi" (clinic_goals) ve "Davranış kaydı" (abc_events) ile BİRLEŞTİRİLMEDİ).
// Uzman hedef davranışı tanımlar (ad, açıklama, stratejiler, durum, ebeveyn kaydı, kayıt türü); ebeveyn olay bildirir (ParentApp).
// Sunucu: ortak/supabase/proposed/20261110110000_target_behaviors.sql (clinic_target_behaviors, behavior_incidents). Uzman olayları yalnız okur.
import { supabase } from './supabase';
import { track } from './track';

export type BehaviorStatus = 'baselining' | 'stable' | 'improving' | 'regressing' | 'mastered';
export type LogType = 'frequency' | 'abc' | 'duration';

// Durum: renk çubuğu (bar), çip zemini (bg) ve yazısı (fg)
export const STATUS: { key: BehaviorStatus; label: string; bar: string; bg: string; fg: string }[] = [
  { key: 'baselining', label: 'Başlangıç ölçümü', bar: '#8A91A3', bg: '#ECEEF3', fg: '#4A5268' },
  { key: 'stable', label: 'Durağan', bar: '#3A6FD8', bg: '#E3ECFA', fg: '#24489A' },
  { key: 'improving', label: 'İyileşiyor', bar: '#2F9A55', bg: '#E1F1E6', fg: '#2F7D4A' },
  { key: 'regressing', label: 'Geriliyor', bar: '#E07B24', bg: '#FFEBD9', fg: '#A4501A' },
  { key: 'mastered', label: 'Ustalaştı', bar: '#7C52C8', bg: '#EEE7FA', fg: '#5A3797' },
];
export const statusMeta = (s: BehaviorStatus) => STATUS.find((x) => x.key === s) ?? STATUS[0];

export const LOG_TYPES: { key: LogType; label: string; hint: string }[] = [
  { key: 'frequency', label: 'Sıklık sayısı', hint: 'Bu davranışın toplam kaç kez olduğunu belirt' },
  { key: 'abc', label: 'ABC', hint: 'Bu davranışın öncülünü ve sonucunu belirt' },
  { key: 'duration', label: 'Süre', hint: 'Her olayın ne kadar sürdüğünü belirt' },
];
export const logTypeLabel = (t: LogType | null) => LOG_TYPES.find((x) => x.key === t)?.label ?? '';

// Çocuğun tepkisi (ebeveynin gözlemi; puan değildir)
export const RESPONSES: { value: number; label: string }[] = [
  { value: 1, label: 'Kötü' }, { value: 2, label: 'Zayıf' }, { value: 3, label: 'Orta' }, { value: 4, label: 'İyi' }, { value: 5, label: 'Çok iyi' },
];
export const responseLabel = (n: number | null) => RESPONSES.find((r) => r.value === n)?.label ?? '';

export const MAX_STRATEGIES = 10;

export type TargetBehavior = {
  id: string; clinic_id: string; link_id: string; title: string; description: string; strategies: string[];
  status: BehaviorStatus; parent_logging: boolean; log_type: LogType; started_at: string; archived: boolean;
  created_by: string | null; created_at: string; updated_at: string | null;
};
export type Incident = {
  id: string; link_id: string; family_id: string; child_id: string; behavior_id: string | null; log_type: LogType | null;
  other_behavior: string; occurred_at: string; count: number | null; duration_min: number | null; antecedent: string; consequence: string;
  strategy: string; response: number | null; reporter_id: string; reporter_name: string; created_at: string;
};
export type BehaviorDraft = Pick<TargetBehavior, 'title' | 'description' | 'strategies' | 'status' | 'parent_logging' | 'log_type'>;

export class BehaviorsNotInstalled extends Error {}

function check<T>(data: T, error: { code?: string; message: string } | null): T {
  if (error) {
    if (['PGRST202', 'PGRST205', '42883', '42P01'].includes(error.code ?? '')) throw new BehaviorsNotInstalled(error.message);
    throw new Error(error.message);
  }
  return data;
}

export async function loadBehaviors(linkId: string): Promise<TargetBehavior[]> {
  const { data, error } = await supabase.from('clinic_target_behaviors').select('*').eq('link_id', linkId).order('started_at', { ascending: true });
  return check((data ?? []) as TargetBehavior[], error).map((b) => ({ ...b, strategies: Array.isArray(b.strategies) ? b.strategies : [] }));
}

export async function loadIncidents(linkId: string): Promise<Incident[]> {
  const { data, error } = await supabase.from('behavior_incidents').select('*').eq('link_id', linkId).order('occurred_at', { ascending: false });
  return check((data ?? []) as Incident[], error).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

// Boş stratejiler düşer; her biri en çok 200 karakter, en çok 10 (sunucudaki kural)
export const cleanStrategies = (list: string[]) => list.map((s) => s.trim().slice(0, 200)).filter(Boolean).slice(0, MAX_STRATEGIES);

export async function saveBehavior(p: { id?: string; clinic_id: string; link_id: string } & BehaviorDraft): Promise<void> {
  const { id, clinic_id, link_id, ...rest } = p;
  const body = { ...rest, title: rest.title.trim().slice(0, 80), description: rest.description.trim().slice(0, 1000), strategies: cleanStrategies(rest.strategies) };
  const { error } = id
    ? await supabase.from('clinic_target_behaviors').update(body).eq('id', id)
    : await supabase.from('clinic_target_behaviors').insert({ ...body, clinic_id, link_id, started_at: new Date().toISOString() });
  check(null, error);
  track(id ? 'behavior.update' : 'behavior.create', { log_type: body.log_type, parent_logging: body.parent_logging, strategies: body.strategies.length, status: body.status });
}

export async function archiveBehavior(id: string) {
  const { error } = await supabase.from('clinic_target_behaviors').update({ archived: true }).eq('id', id);
  check(null, error);
  track('behavior.archive', {});
}

// Tablo sütunları: hedef davranışın kayıt türüne göre; tür sonradan değiştiyse eski olayların sütunları da görünür
export function typesShown(b: TargetBehavior, incidents: Incident[]): LogType[] {
  const have = new Set<LogType>([b.log_type, ...incidents.map((i) => i.log_type).filter((t): t is LogType => !!t)]);
  return LOG_TYPES.map((t) => t.key).filter((k) => have.has(k));
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const pad = (n: number) => String(n).padStart(2, '0');
// "9 Kas" ve "17:00" (yerel saat)
export const dayLabel = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const timeLabel = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const isoDay = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

// Dışa aktarma (CSV): bütün olaylar, eskiden yeniye. Dosyada çocuğun adı yok.
export const INCIDENT_HEADER = ['Tarih', 'Saat', 'Bildiren', 'Hedef davranış', 'Diğer olay', 'Kayıt türü', 'Sayı', 'Süre (dk)', 'Öncül', 'Sonuç',
  'Uygulanan strateji', 'Çocuğun tepkisi (1 Kötü – 5 Çok iyi)'];

export function incidentRows(incidents: Incident[], behaviors: TargetBehavior[]): string[][] {
  const title = new Map(behaviors.map((b) => [b.id, b.title]));
  return [...incidents].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at)).map((i) => [
    isoDay(i.occurred_at),
    timeLabel(i.occurred_at),
    i.reporter_name || 'Ebeveyn',
    i.behavior_id ? title.get(i.behavior_id) ?? '' : '',
    i.behavior_id ? '' : i.other_behavior,
    logTypeLabel(i.log_type),
    i.count != null ? String(i.count) : '',
    i.duration_min != null ? String(i.duration_min) : '',
    i.antecedent,
    i.consequence,
    i.strategy,
    i.response != null ? `${i.response} ${responseLabel(i.response)}` : '',
  ]);
}

// Dosya adı: baş harf + gün (ad dosya adına yazılmaz)
export function incidentsCsvName(childName: string, today: string) {
  const ini = (childName.trim()[0] || 'x').toLocaleLowerCase('tr-TR');
  return `davranislar-olaylar-${ini}-${today}.csv`;
}
