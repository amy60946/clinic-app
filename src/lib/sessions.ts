// Seans planlama: sunucu çağrıları. Sözleşme ortak sozlesme/veritabani.md 29 (öneri proposed/20261105100000_sessions.sql).
// Tablolar/işlevler sunucuda yoksa SessionsNotInstalled: ekranlar "veritabanı güncellemesi bekleniyor" der, panelin geri kalanı çalışır.
import { supabase } from './supabase';
import type { Session, SessionRecord, Room, Availability, SessionSettings, SessionPackage, WaitItem, ExternalEvent, Busy, SessionKind, SessionMode, SessionStatus } from './sessionCore';
import { DEFAULT_SETTINGS } from './sessionCore';

export class SessionsNotInstalled extends Error {}

type Err = { code?: string; message: string } | null;
const MISSING = ['PGRST202', 'PGRST205', '42883', '42P01'];
function check<T>(data: T, error: Err): T {
  if (error) {
    if (error.code && MISSING.includes(error.code)) throw new SessionsNotInstalled('Seans veritabanı henüz kurulmadı');
    throw new Error(errorText(error.message));
  }
  return data;
}

// Sunucu hata anahtarları → kısa Türkçe (ortak durumlar.md P18)
const ERRORS: Record<string, string> = {
  session_not_found: 'Seans bulunamadı ya da artık görünmüyor.',
  session_not_started: 'Seans henüz başlamadı; "Yapıldı" ya da "Gelmedi" seans saatinden sonra yazılır.',
  session_has_record: 'Kaydı olan seans silinmez. İstersen durumunu "İptal" yap.',
  link_not_visible: 'Bu danışanın paylaşımı etkin değil ya da sana açık değil.',
  only_owner: 'Bunu yalnız klinik sahibi değiştirebilir.',
  only_owner_assigns: 'Başka bir uzmana seansı yalnız klinik sahibi atayabilir.',
  room_not_in_clinic: 'Oda bu kliniğe ait değil.',
  package_link_mismatch: 'Paket bu danışana ait değil.',
  waitlist_not_found: 'Bekleme kaydı bulunamadı.',
  offer_in_past: 'Teklif edilen saat geçmişte olamaz.',
  calendar_url_not_allowed: 'Bu adres desteklenmiyor. Google, Apple (iCloud) ya da Outlook takviminin gizli iCal adresini yapıştır.',
  too_many_sources: 'En çok 3 dış takvim eklenebilir.',
  event_not_found: 'Etkinlik bulunamadı.',
};
export const errorText = (m: string) => {
  const k = Object.keys(ERRORS).find((x) => m.includes(x));
  return k ? ERRORS[k] : m;
};

const COLS = 'id, clinic_id, clinician_id, link_id, title, series_id, starts_at, duration_min, kind, mode, room_id, status, cancel_reason, visible_to_family, booked_by, family_response, family_note, family_responded_at, package_id, waitlist_id, offer_expires_at, external_uid, created_at, updated_at';

/* ---------- Seanslar ---------- */
export async function loadSessions(fromIso: string, toIso: string): Promise<Session[]> {
  const { data, error } = await supabase.from('clinic_sessions').select(COLS).gte('starts_at', fromIso).lt('starts_at', toIso).order('starts_at').limit(1500);
  return check((data ?? []) as unknown as Session[], error);
}
export async function loadSession(id: string): Promise<Session | null> {
  const { data, error } = await supabase.from('clinic_sessions').select(COLS).eq('id', id).maybeSingle();
  return check((data ?? null) as unknown as Session | null, error);
}
export async function loadLinkSessions(linkId: string): Promise<Session[]> {
  const { data, error } = await supabase.from('clinic_sessions').select(COLS).eq('link_id', linkId).order('starts_at', { ascending: false }).limit(400);
  return check((data ?? []) as unknown as Session[], error);
}
export async function loadRecords(ids: string[]): Promise<Record<string, SessionRecord>> {
  if (!ids.length) return {};
  const out: Record<string, SessionRecord> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from('clinic_session_records').select('*').in('session_id', ids.slice(i, i + 200));
    for (const r of check((data ?? []) as SessionRecord[], error)) out[r.session_id] = r;
  }
  return out;
}

export type SessionInput = {
  link_id: string | null; clinician_id?: string | null; title?: string | null; starts_at: string; duration_min: number;
  kind: SessionKind; mode: SessionMode; room_id?: string | null; visible_to_family: boolean; package_id?: string | null;
  repeat?: 'none' | 'weekly' | 'biweekly'; count?: number;
};
export type Conflict = { starts_at: string; room: boolean; clinician: boolean };
export async function createSession(p: SessionInput): Promise<{ ids: string[]; conflicts: Conflict[] }> {
  const { data, error } = await supabase.rpc('clinic_session_create', { p });
  return check(data as { ids: string[]; conflicts: Conflict[] }, error);
}
export async function updateSession(id: string, p: Partial<SessionInput>, scope: 'one' | 'following' = 'one'): Promise<{ updated: number; conflicts: Conflict[] }> {
  const { data, error } = await supabase.rpc('clinic_session_update', { p_id: id, p, p_scope: scope });
  return check(data as { updated: number; conflicts: Conflict[] }, error);
}
export async function setSessionStatus(id: string, status: Exclude<SessionStatus, 'offered'>, reason?: string | null, waive = false): Promise<SessionStatus> {
  const { data, error } = await supabase.rpc('clinic_session_set_status', { p_id: id, p_status: status, p_reason: reason ?? null, p_waive: waive });
  return check(data as SessionStatus, error);
}
export async function deleteSession(id: string, scope: 'one' | 'following' = 'one'): Promise<number> {
  const { data, error } = await supabase.rpc('clinic_session_delete', { p_id: id, p_scope: scope });
  return check(data as number, error);
}
export async function saveRecord(sessionId: string, r: Pick<SessionRecord, 'attendees' | 'observation' | 'worked' | 'next_step' | 'agenda' | 'homework'>): Promise<void> {
  const { error } = await supabase.rpc('clinic_session_record_save', { p_session: sessionId, p: r });
  check(null, error);
}
// Dolu saatler: seçili alandaki seanslar + ekibin başka çalışma alanlarındaki seansları (yalnız "dolu"; ortak akislar.md 21)
export async function loadBusy(fromIso: string, toIso: string): Promise<Busy[]> {
  const [{ data, error }, other] = await Promise.all([
    supabase.rpc('clinic_busy', { p_from: fromIso, p_to: toIso }),
    loadBusyElsewhere(fromIso, toIso),
  ]);
  return [...check((data ?? []) as Busy[], error), ...other.map((b) => ({ clinician_id: b.clinician_id, room_id: null, starts_at: b.starts_at, ends_at: b.ends_at }))];
}
export type BusyElsewhere = { clinician_id: string; starts_at: string; ends_at: string; clinic: string | null };
// Sunucuda çalışma alanları yoksa boş
export async function loadBusyElsewhere(fromIso: string, toIso: string): Promise<BusyElsewhere[]> {
  const { data, error } = await supabase.rpc('clinic_busy_elsewhere', { p_from: fromIso, p_to: toIso });
  if (error) return [];
  return (data ?? []) as BusyElsewhere[];
}

/* ---------- Ayar, oda, çalışma saati ---------- */
export async function loadSettings(): Promise<SessionSettings> {
  const { data, error } = await supabase.rpc('clinic_session_settings');
  return { ...DEFAULT_SETTINGS, ...(check(data as SessionSettings | null, error) ?? {}) };
}
export async function saveSettings(p: Partial<SessionSettings>): Promise<void> {
  const { error } = await supabase.rpc('clinic_session_settings_save', { p });
  check(null, error);
}
export async function listRooms(): Promise<Room[]> {
  const { data, error } = await supabase.from('clinic_rooms').select('id, name, location, active').order('name');
  return check((data ?? []) as Room[], error);
}
export async function saveRoom(id: string | null, name: string, location: string, active = true): Promise<string> {
  const { data, error } = await supabase.rpc('clinic_room_save', { p_id: id, p_name: name, p_location: location || null, p_active: active });
  return check(data as string, error);
}
export async function listAvailability(): Promise<Availability[]> {
  const { data, error } = await supabase.from('clinic_availability').select('id, clinician_id, weekday, start_time, end_time, room_id, bookable').order('weekday').order('start_time');
  return check(((data ?? []) as Availability[]).map((a) => ({ ...a, start_time: a.start_time.slice(0, 5), end_time: a.end_time.slice(0, 5) })), error);
}
export async function addAvailability(clinicId: string, a: Omit<Availability, 'id'>): Promise<void> {
  const { error } = await supabase.from('clinic_availability').insert({ clinic_id: clinicId, ...a });
  check(null, error);
}
export async function updateAvailability(id: string, p: Partial<Omit<Availability, 'id' | 'clinician_id'>>): Promise<void> {
  const { error } = await supabase.from('clinic_availability').update(p).eq('id', id);
  check(null, error);
}
export async function deleteAvailability(id: string): Promise<void> {
  const { error } = await supabase.from('clinic_availability').delete().eq('id', id);
  check(null, error);
}

/* ---------- Paket, bekleme listesi ---------- */
export async function listPackages(linkId?: string): Promise<SessionPackage[]> {
  let q = supabase.from('clinic_session_packages').select('id, link_id, title, total, starts_on, ends_on, note, closed_at, created_at').order('created_at', { ascending: false });
  if (linkId) q = q.eq('link_id', linkId);
  const { data, error } = await q;
  return check((data ?? []) as SessionPackage[], error);
}
export async function savePackage(p: { id?: string | null; link_id: string; title: string; total: number; starts_on?: string | null; ends_on?: string | null; note?: string | null; closed?: boolean }): Promise<string> {
  const { data, error } = await supabase.rpc('clinic_package_save', { p_id: p.id ?? null, p_link: p.link_id, p_title: p.title, p_total: p.total,
    p_starts: p.starts_on ?? null, p_ends: p.ends_on ?? null, p_note: p.note ?? null, p_closed: !!p.closed });
  return check(data as string, error);
}
export async function listWaitlist(): Promise<WaitItem[]> {
  const { data, error } = await supabase.from('clinic_waitlist').select('id, link_id, clinician_id, note, status, created_at').in('status', ['waiting', 'offered']).order('created_at');
  return check((data ?? []) as WaitItem[], error);
}
export async function saveWaitlist(linkId: string, note: string, remove = false): Promise<void> {
  const { error } = await supabase.rpc('clinic_waitlist_save', { p_link: linkId, p_note: note || null, p_remove: remove });
  check(null, error);
}
export async function offerSlot(waitlistId: string, startsAt: string, durationMin: number, roomId: string | null, hours: number): Promise<string> {
  const { data, error } = await supabase.rpc('clinic_waitlist_offer', { p_waitlist: waitlistId, p_starts_at: startsAt, p_duration: durationMin, p_room: roomId, p_hours: hours });
  return check(data as string, error);
}

/* ---------- Takvim aboneliği ve dış takvim (E) ---------- */
export type Feed = { token: string; show_initials: boolean } | null;
export async function calendarFeed(action: 'get' | 'rotate' | 'set' | 'delete', initials?: boolean): Promise<Feed> {
  const { data, error } = await supabase.rpc('clinic_calendar_feed', { p_action: action, p_initials: initials ?? null });
  return check(data as Feed, error);
}
export const feedUrl = (token: string) => {
  const base = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://uhelhxqgpcjemadhsifx.supabase.co').replace(/\/$/, '');
  return `${base}/functions/v1/calendar-feed?t=${token}`;
};
export type CalendarSource = { id: string; label: string | null; url: string; last_synced_at: string | null; last_error: string | null };
export async function listSources(): Promise<CalendarSource[]> {
  const { data, error } = await supabase.from('clinic_calendar_sources').select('id, label, url, last_synced_at, last_error').order('created_at');
  return check((data ?? []) as CalendarSource[], error);
}
export async function addSource(url: string, label: string): Promise<void> {
  const { error } = await supabase.rpc('clinic_calendar_source_save', { p_url: url, p_label: label || null, p_remove: null });
  check(null, error);
}
export async function removeSource(id: string): Promise<void> {
  const { error } = await supabase.rpc('clinic_calendar_source_save', { p_url: null, p_label: null, p_remove: id });
  check(null, error);
}
// Dış takvimi şimdi okur (Edge Function calendar-import); işlev yayında değilse null
export async function syncSources(): Promise<{ events: number; failed: number } | null> {
  const { data, error } = await supabase.functions.invoke('calendar-import', { body: {} });
  if (error) return null;
  return data as { events: number; failed: number };
}
export async function loadExternal(fromIso: string, toIso: string): Promise<ExternalEvent[]> {
  const { data, error } = await supabase.from('clinic_external_events').select('id, source_id, uid, starts_at, ends_at, summary, session_id, ignored')
    .gte('starts_at', fromIso).lt('starts_at', toIso).order('starts_at');
  return check((data ?? []) as ExternalEvent[], error);
}
export async function markExternal(eventId: string, p: { link_id?: string | null; kind?: SessionKind; mode?: SessionMode; ignore?: boolean }): Promise<string | null> {
  const { data, error } = await supabase.rpc('clinic_external_event_mark', { p_event: eventId, p_link: p.link_id ?? null, p_kind: p.kind ?? 'individual',
    p_mode: p.mode ?? 'in_person', p_ignore: !!p.ignore });
  return check(data as string | null, error);
}
