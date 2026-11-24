// Davranışlar ve olaylar (kullanıcı isteği 9 Kasım 2026: rakibin "Target behaviors & reported incidents" ekranlarına sadık;
// mevcut "Davranış hedefi" (clinic_goals) ile BİRLEŞTİRİLMEDİ).
// Uzman hedef davranışı tanımlar (ad, açıklama, stratejiler, ebeveyn kaydı, kayıt türü); ebeveyn olay bildirir (ParentApp).
// Durum alanı arayüzden kalktı (kullanıcı kararı 23 Kasım 2026); sütun durur, yeni kayıtta sunucunun varsayılanı (baselining) kalır.
// Sunucu: ortak/supabase/migrations/20261110110000_target_behaviors.sql (clinic_target_behaviors, behavior_incidents). Uzman olayları yalnız okur.
// Ebeveynin Moyo'daki "Davranış kaydı" (abc_events) da bu bölümde, "Diğer bildirilen olaylar"da görünür (23 Kasım 2026; okuma clinic.ts).
// Kayıt türü çoklu seçim (kullanıcı kararı 23 Kasım 2026; ortak migrations/20261123100000_mercek_updates.sql, veritabani.md 40.3):
// uygulama yalnız log_types yazar, sunucu tetikleyicisi log_type'ı ilk türe eşitler. Sütun yoksa (eski sunucu) eski log_type ile.
import { supabase } from './supabase';
import { track } from './track';
import { behaviorTypes, normLogTypes } from './behaviorRows';

export type BehaviorStatus = 'baselining' | 'stable' | 'improving' | 'regressing' | 'mastered';
export type LogType = 'frequency' | 'abc' | 'duration';

export const LOG_TYPES: { key: LogType; label: string; hint: string }[] = [
  { key: 'frequency', label: 'Sıklık sayısı', hint: 'Bu davranışın toplam kaç kez olduğunu belirt' },
  { key: 'abc', label: 'ABC', hint: 'Bu davranışın öncülünü ve sonucunu belirt' },
  { key: 'duration', label: 'Süre', hint: 'Her olayın ne kadar sürdüğünü belirt' },
];

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
  log_types: LogType[];   // okurken her zaman dolu (eski sunucuda [log_type]); sabit sıra, log_type = ilk tür
};
export type Incident = {
  id: string; link_id: string; family_id: string; child_id: string; behavior_id: string | null; log_type: LogType | null;
  other_behavior: string; occurred_at: string; count: number | null; duration_min: number | null; antecedent: string; consequence: string;
  strategy: string; response: number | null; reporter_id: string; reporter_name: string; created_at: string;
  behavior_title?: string;   // ortak 20261120200000: hedef davranışın adı (hedef silinse de kalır)
  log_types?: LogType[] | null;   // bildirim anındaki türler (diğer olayda boş); eski sunucuda yok
};
// Durum (status) gönderilmez: yeni kayıtta sunucunun varsayılanı, düzenlemede eski değer kalır. Tür yalnız log_types (log_type gönderilmez)
export type BehaviorDraft = Pick<TargetBehavior, 'title' | 'description' | 'strategies' | 'parent_logging' | 'log_types'>;

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
  return check((data ?? []) as TargetBehavior[], error)
    .map((b) => ({ ...b, strategies: Array.isArray(b.strategies) ? b.strategies : [], log_types: behaviorTypes(b) }));
}

export async function loadIncidents(linkId: string): Promise<Incident[]> {
  const { data, error } = await supabase.from('behavior_incidents').select('*').eq('link_id', linkId).order('occurred_at', { ascending: false });
  return check((data ?? []) as Incident[], error).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

// Boş stratejiler düşer; her biri en çok 200 karakter, en çok 10 (sunucudaki kural)
export const cleanStrategies = (list: string[]) => list.map((s) => s.trim().slice(0, 200)).filter(Boolean).slice(0, MAX_STRATEGIES);

// Sütun yok: PostgREST şema önbelleğinde yok (PGRST204) ya da PostgreSQL (42703)
const noColumn = (e: { code?: string } | null) => !!e && ['PGRST204', '42703'].includes(e.code ?? '');

export async function saveBehavior(p: { id?: string; clinic_id: string; link_id: string } & BehaviorDraft): Promise<void> {
  const { id, clinic_id, link_id, ...rest } = p;
  const types = normLogTypes(rest.log_types);
  const body = { ...rest, log_types: types.length ? types : ['frequency' as LogType], title: rest.title.trim().slice(0, 80),
    description: rest.description.trim().slice(0, 1000), strategies: cleanStrategies(rest.strategies) };
  const write = (b: Record<string, unknown>) => (id
    ? supabase.from('clinic_target_behaviors').update(b).eq('id', id)
    : supabase.from('clinic_target_behaviors').insert({ ...b, clinic_id, link_id, started_at: new Date().toISOString() }));
  let { error } = await write(body);
  // Eski sunucu (log_types sütunu yok): yalnız ilk tür, eski log_type ile
  if (noColumn(error)) { const { log_types, ...old } = body; ({ error } = await write({ ...old, log_type: log_types[0] })); }
  check(null, error);
  track(id ? 'behavior.update' : 'behavior.create', { log_type: body.log_types[0], log_types: body.log_types.join('+'), parent_logging: body.parent_logging, strategies: body.strategies.length });
}

export async function archiveBehavior(id: string) {
  const { error } = await supabase.from('clinic_target_behaviors').update({ archived: true }).eq('id', id);
  check(null, error);
  track('behavior.archive', {});
}

// Arşivden geri al: etkin listeye döner, ebeveyn yeniden bildirebilir (RLS "hedef davranış: klinik" for all; tetikleyici archived'a karışmaz)
export async function restoreBehavior(id: string) {
  const { error } = await supabase.from('clinic_target_behaviors').update({ archived: false }).eq('id', id);
  check(null, error);
  track('behavior.restore', {});
}

// Tarih biçimleri, kayıt türleri (tablo sütunları, çoklu seçim) ve "Diğer bildirilen olaylar"ın birleşik listesi saf dosyada
// (testi tests/behaviors.test.mjs)
export { dayLabel, timeLabel, typesShown, behaviorTypes, incidentTypes, detailCols, toggleLogType, missingFields } from './behaviorRows';
