// Seans planlama: saf yardımcılar (sunucusuz; testleri tests/sessions.test.mjs). Sözleşme: ortak sozlesme/veritabani.md 29,
// durumlar.md P18, akislar.md 20. Saatler Türkiye saatiyle gösterilir (Europe/Istanbul, UTC+3, yaz saati yok).
import { observations, addDays as addDay, type Task, type Completion, type AbcEvent } from './metrics.ts';

export type SessionStatus = 'planned' | 'done' | 'no_show' | 'late_cancel' | 'cancelled' | 'postponed' | 'offered';
export type SessionKind = 'individual' | 'family' | 'parent' | 'group' | 'intake' | 'other';
export type SessionMode = 'in_person' | 'online' | 'home';

export type Session = {
  id: string; clinic_id: string; clinician_id: string | null; link_id: string | null; title: string | null; series_id: string | null;
  starts_at: string; duration_min: number; kind: SessionKind; mode: SessionMode; room_id: string | null; status: SessionStatus;
  cancel_reason: string | null; visible_to_family: boolean; booked_by: 'clinic' | 'family';
  family_response: 'ok' | 'unavailable' | null; family_note: string | null; family_responded_at: string | null;
  package_id: string | null; waitlist_id: string | null; offer_expires_at: string | null; external_uid: string | null;
  created_at: string; updated_at: string;
};
export type AgendaItem = { text: string; done: boolean; source?: string };
export type HomeworkItem = { kind: 'suggestion' | 'module' | 'goal'; id: string; title: string };
export type SessionRecord = {
  session_id: string; attendees: string[]; observation: string | null; worked: string | null; next_step: string | null;
  agenda: AgendaItem[]; homework: HomeworkItem[]; author_id: string | null; updated_at: string;
};
export type Room = { id: string; name: string; location: string | null; active: boolean };
export type Availability = { id: string; clinician_id: string; weekday: number; start_time: string; end_time: string; room_id: string | null; bookable: boolean };
export type SessionSettings = {
  cancel_hours: number; count_late_cancel: boolean; count_no_show: boolean; reminders: number[];
  booking_enabled: boolean; booking_notice_hours: number; booking_horizon_days: number; slot_minutes: number;
};
export type SessionPackage = { id: string; link_id: string; title: string; total: number; starts_on: string | null; ends_on: string | null; note: string | null; closed_at: string | null; created_at: string };
export type WaitItem = { id: string; link_id: string; clinician_id: string | null; note: string | null; status: 'waiting' | 'offered' | 'booked' | 'removed'; created_at: string };
export type ExternalEvent = { id: string; source_id: string; uid: string; starts_at: string; ends_at: string; summary: string | null; session_id: string | null; ignored: boolean };
export type Busy = { clinician_id: string | null; room_id: string | null; starts_at: string; ends_at: string };

export const DEFAULT_SETTINGS: SessionSettings = {
  cancel_hours: 24, count_late_cancel: true, count_no_show: true, reminders: [1440, 120],
  booking_enabled: false, booking_notice_hours: 24, booking_horizon_days: 21, slot_minutes: 45,
};

export const STATUS_META: Record<SessionStatus, { label: string; bg: string; fg: string; line: string }> = {
  planned: { label: 'Planlandı', bg: '#FFFFFF', fg: '#0F1B3D', line: '#0F1B3D' },
  done: { label: 'Yapıldı', bg: '#E6F4EA', fg: '#2F7D4A', line: '#2F7D4A' },
  no_show: { label: 'Gelmedi', bg: '#FDE7EA', fg: '#B3263E', line: '#B3263E' },
  late_cancel: { label: 'Geç iptal', bg: '#FFF3D6', fg: '#9A6B00', line: '#9A6B00' },
  cancelled: { label: 'İptal', bg: '#ECEEF3', fg: '#5D6680', line: '#C5C9D3' },
  postponed: { label: 'Ertelendi', bg: '#ECEEF3', fg: '#5D6680', line: '#C5C9D3' },
  offered: { label: 'Teklif edildi', bg: '#E6EAF5', fg: '#2C4A9A', line: '#2C4A9A' },
};
export const KIND_LABEL: Record<SessionKind, string> = {
  individual: 'Bireysel seans', family: 'Aile görüşmesi', parent: 'Ebeveyn görüşmesi', group: 'Grup seansı', intake: 'İlk görüşme', other: 'Diğer',
};
export const MODE_LABEL: Record<SessionMode, string> = { in_person: 'Yüz yüze', online: 'Online', home: 'Ev ziyareti' };
export const RESPONSE_LABEL = { ok: 'Aile gelecek', unavailable: 'Aile uygun değil dedi' } as const;
export const isClosed = (s: SessionStatus) => s === 'cancelled' || s === 'late_cancel' || s === 'postponed';
export const WEEKDAY_LONG = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

/* ---------- Türkiye saati ---------- */
const TR_OFFSET_MS = 3 * 3600e3;
// ISO zaman → Türkiye takvim günü (YYYY-MM-DD) ve dakika
export const trDay = (iso: string) => new Date(Date.parse(iso) + TR_OFFSET_MS).toISOString().slice(0, 10);
export const trMinutes = (iso: string) => { const d = new Date(Date.parse(iso) + TR_OFFSET_MS); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
export const trTime = (iso: string) => { const m = trMinutes(iso); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
// Türkiye günü + "HH:MM" → ISO (UTC)
export const trToIso = (day: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.parse(`${day}T00:00:00Z`) + ((h * 60 + m) * 60e3) - TR_OFFSET_MS).toISOString();
};
export const endIso = (s: Pick<Session, 'starts_at' | 'duration_min'>) => new Date(Date.parse(s.starts_at) + s.duration_min * 60e3).toISOString();
export const weekdayOf = (day: string) => ((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;   // ISO 1 = Pazartesi
export const mondayOfDay = (day: string) => addDay(day, 1 - weekdayOf(day));
export const timeRange = (s: Pick<Session, 'starts_at' | 'duration_min'>) => `${trTime(s.starts_at)}–${trTime(endIso(s))}`;
export const hhmmToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
export const minToHhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/* ---------- Gün düzeni: çakışan seanslar yan yana sütunlara ---------- */
export type Placed<T> = { item: T; top: number; height: number; col: number; cols: number };
export function layoutDay<T extends { starts_at: string; duration_min: number }>(items: T[], fromMin: number, pxPerMin: number, minHeight = 26): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.starts_at.localeCompare(b.starts_at) || b.duration_min - a.duration_min);
  const out: Placed<T>[] = [];
  let group: Placed<T>[] = [], groupEnd = -1, colsEnd: number[] = [];
  const flush = () => { const n = colsEnd.length || 1; group.forEach((p) => { p.cols = n; }); group = []; colsEnd = []; };
  for (const it of sorted) {
    const s = trMinutes(it.starts_at), e = s + it.duration_min;
    if (s >= groupEnd) { flush(); groupEnd = -1; }
    let col = colsEnd.findIndex((end) => end <= s);
    if (col < 0) { col = colsEnd.length; colsEnd.push(e); } else colsEnd[col] = e;
    const p: Placed<T> = { item: it, top: (s - fromMin) * pxPerMin, height: Math.max(minHeight, it.duration_min * pxPerMin - 2), col, cols: 1 };
    group.push(p); out.push(p);
    groupEnd = Math.max(groupEnd, e);
  }
  flush();
  return out;
}

/* ---------- Kurallar ---------- */
// Uzman "iptal" derse sunucu süre içindeyse "geç iptal" yazar; arayüz önceden söyler
export const wouldBeLate = (startsAt: string, now: Date, cancelHours: number) => now.getTime() > Date.parse(startsAt) - cancelHours * 3600e3;
export const canMarkDone = (startsAt: string, now: Date) => Date.parse(startsAt) <= now.getTime() + 30 * 60e3;

// Notu bekleyen: son 14 günde yapılmış, kaydı olmayan ya da üç alanı da boş seans (danışanlı)
export function noteDue(sessions: Session[], records: Record<string, SessionRecord | undefined>, now: Date, days = 14): Session[] {
  const from = now.getTime() - days * 864e5;
  return sessions.filter((s) => s.status === 'done' && s.link_id && Date.parse(s.starts_at) >= from && Date.parse(s.starts_at) <= now.getTime()
    && !hasNote(records[s.id])).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
}
export const hasNote = (r: SessionRecord | undefined) => !!r && !!(r.observation || r.worked || r.next_step);

// Paket kullanımı: yapılan + ayara göre gelmedi / geç iptal
export function packageUsage(pkg: SessionPackage, sessions: Session[], st: Pick<SessionSettings, 'count_late_cancel' | 'count_no_show'>, now: Date) {
  const mine = sessions.filter((s) => s.package_id === pkg.id);
  const used = mine.filter((s) => s.status === 'done' || (s.status === 'no_show' && st.count_no_show) || (s.status === 'late_cancel' && st.count_late_cancel)).length;
  const planned = mine.filter((s) => s.status === 'planned' && Date.parse(s.starts_at) > now.getTime()).length;
  return { used, planned, left: Math.max(0, pkg.total - used), over: used > pkg.total };
}

// Devam: danışanın geçmiş seansları
export function attendance(sessions: Session[], now: Date) {
  const past = sessions.filter((s) => Date.parse(s.starts_at) <= now.getTime() && s.status !== 'offered');
  const c = (st: SessionStatus) => past.filter((s) => s.status === st).length;
  const next = sessions.filter((s) => s.status === 'planned' && Date.parse(s.starts_at) > now.getTime()).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0] ?? null;
  return { done: c('done'), noShow: c('no_show'), late: c('late_cancel'), cancelled: c('cancelled') + c('postponed'), next };
}

// Son n hafta (pazartesiden), haftada bir durum: en "ağır" olan (yapıldı > gelmedi > geç iptal > iptal > planlı > yok)
export type WeekCell = { start: string; status: SessionStatus | null; count: number };
export function weeklyCells(sessions: Session[], today: string, n = 10): WeekCell[] {
  const order: SessionStatus[] = ['done', 'no_show', 'late_cancel', 'cancelled', 'postponed', 'planned', 'offered'];
  const first = addDay(mondayOfDay(today), -7 * (n - 1));
  return Array.from({ length: n }, (_, i) => {
    const start = addDay(first, 7 * i), end = addDay(start, 7);
    const wk = sessions.filter((s) => { const d = trDay(s.starts_at); return d >= start && d < end; });
    const status = order.find((st) => wk.some((s) => s.status === st)) ?? null;
    return { start, status, count: wk.length };
  });
}

/* ---------- Seans öncesi özet (C): son yapılan seanstan bu yana evde olanlar ---------- */
export type Prep = {
  since: string;           // önceki seansın günü (yoksa 14 gün önce)
  sinceSession: boolean;
  days: number;
  rate: number | null; prevRate: number | null; planned: number; approved: number; declined: number;
  abc: AbcEvent[];
  pending: number;          // ebeveyn kararı bekleyen öneri
  agenda: AgendaItem[];
};
export function prepSummary(target: Pick<Session, 'starts_at' | 'link_id' | 'id'>, linkSessions: Session[],
                            data: { tasks: Task[]; completions: Completion[]; abc: AbcEvent[] },
                            extra: { pending: { title: string }[]; reviewDue: { title: string }[]; declineTop?: string | null }, now: Date): Prep {
  const day = trDay(target.starts_at);
  const prev = linkSessions.filter((s) => s.id !== target.id && s.status === 'done' && s.starts_at < target.starts_at)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
  const since = prev ? trDay(prev.starts_at) : addDay(day, -14);
  const lastDay = addDay(trDay(new Date(Math.min(now.getTime(), Date.parse(target.starts_at))).toISOString()), -1);
  const days = Math.max(1, Math.round((Date.parse(`${lastDay}T12:00:00Z`) - Date.parse(`${since}T12:00:00Z`)) / 864e5) + 1);
  const cur = observations(data.tasks, data.completions, since, lastDay);
  const prevFrom = addDay(since, -days), prevTo = addDay(since, -1);
  const before = observations(data.tasks, data.completions, prevFrom, prevTo);
  const abc = data.abc.filter((e) => { const d = trDay(e.occurred_at); return d >= since && d <= lastDay; })
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  const agenda: AgendaItem[] = [];
  if (cur.declined > 0) agenda.push({ text: `"Yapamam" ${cur.declined} kez${extra.declineTop ? ` · en sık: ${extra.declineTop}` : ''}`, done: false, source: 'Ev rutinleri' });
  if (cur.rate !== null && before.rate !== null && cur.rate < before.rate - 10) agenda.push({ text: `Rutin oranı düştü: %${before.rate} → %${cur.rate}`, done: false, source: 'Ev rutinleri' });
  if (abc.length) agenda.push({ text: `${abc.length} davranış kaydı · en son: ${abc[0].antecedent}`, done: false, source: 'Davranış kayıtları' });
  for (const g of extra.reviewDue.slice(0, 2)) agenda.push({ text: `Değerlendirme zamanı: ${g.title}`, done: false, source: 'Takip Planı' });
  for (const p of extra.pending.slice(0, 2)) agenda.push({ text: `Bekleyen öneri: ${p.title}`, done: false, source: 'Ebeveyn kararı bekliyor' });
  return { since, sinceSession: !!prev, days, rate: cur.rate, prevRate: before.rate, planned: cur.planned, approved: cur.approved,
           declined: cur.declined, abc, pending: extra.pending.length, agenda };
}

/* ---------- Uygun saatler (yeni seans penceresi) ---------- */
// Bir gün için uzmanın çalışma saatlerinden, dolu saatler çıkarılarak "slot" dakikalık başlangıçlar
export function freeStarts(day: string, avail: Availability[], busy: Busy[], clinicianId: string, slot: number, roomId?: string | null): string[] {
  const wd = weekdayOf(day);
  const out: string[] = [];
  for (const a of avail.filter((x) => x.clinician_id === clinicianId && x.weekday === wd)) {
    for (let m = hhmmToMin(a.start_time); m + slot <= hhmmToMin(a.end_time); m += slot) {
      const s = Date.parse(trToIso(day, minToHhmm(m))), e = s + slot * 60e3;
      const clash = busy.some((b) => (b.clinician_id === clinicianId || (!!roomId && b.room_id === roomId))
        && Date.parse(b.starts_at) < e && s < Date.parse(b.ends_at));
      if (!clash) out.push(minToHhmm(m));
    }
  }
  return [...new Set(out)].sort();
}

// Seri önizlemesi
export function seriesDates(startIso: string, repeat: 'none' | 'weekly' | 'biweekly', count: number): string[] {
  const n = repeat === 'none' ? 1 : Math.min(Math.max(count, 1), 52);
  const step = (repeat === 'biweekly' ? 14 : 7) * 864e5;
  return Array.from({ length: n }, (_, i) => new Date(Date.parse(startIso) + step * i).toISOString());
}

/* ---------- Dış takvim etkinliği → danışan önerisi ---------- */
const fold = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function matchClient<C extends { child_name: string; link_id: string }>(summary: string | null, clients: C[]): C | null {
  if (!summary) return null;
  const words = fold(summary).split(/[^a-z0-9]+/).filter(Boolean);
  const hits = clients.filter((c) => { const n = fold(c.child_name).split(/\s+/)[0]; return n.length >= 2 && words.includes(n); });
  return hits.length === 1 ? hits[0] : null;
}

// Türkçe kısa tarih: "11 Kas Çar"
const MON = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const DOW = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
export const shortDay = (day: string) => { const [, m, d] = day.split('-').map(Number); return `${d} ${MON[m - 1]} ${DOW[weekdayOf(day) - 1]}`; };
export const longDay = (day: string) => { const [y, m, d] = day.split('-').map(Number); return `${d} ${['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][m - 1]} ${y}, ${WEEKDAY_LONG[weekdayOf(day) - 1]}`; };
export const sessionWhen = (s: Pick<Session, 'starts_at' | 'duration_min'>) => `${shortDay(trDay(s.starts_at))} · ${timeRange(s)}`;
