// ÖNİZLEME: seans planlama (ortak proposed/20261105100000_sessions.sql) deneme veritabanı karşılığı.
// demo-supabase.ts'ten çağrılır: tablolar, uzman görünürlüğü, işlevler ve örnek veri. Gerçek sürümde kullanılmaz.
type Row = Record<string, any>;
type Res = { data: any; error: { message: string } | null };

export const SESSION_TABLES = ['clinic_sessions', 'clinic_session_records', 'clinic_rooms', 'clinic_session_settings', 'clinic_availability',
  'clinic_session_packages', 'clinic_waitlist', 'clinic_calendar_feeds', 'clinic_calendar_sources', 'clinic_external_events'];

const uid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); });
const nowIso = () => new Date().toISOString();
const TR = 3 * 3600e3;
const trDay = (iso: string) => new Date(Date.parse(iso) + TR).toISOString().slice(0, 10);
const at = (day: string, hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return new Date(Date.parse(`${day}T00:00:00Z`) + (h * 60 + m) * 60e3 - TR).toISOString(); };
const addD = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const isoDow = (day: string) => ((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
const nextDow = (from: string, dow: number) => addD(from, (dow - isoDow(from) + 7) % 7);
const DEFAULT_SETTINGS = { cancel_hours: 24, count_late_cancel: true, count_no_show: true, reminders: [1440, 120], booking_enabled: false,
  booking_notice_hours: 24, booking_horizon_days: 21, slot_minutes: 45 };
const when = (iso: string) => { const d = new Date(Date.parse(iso) + TR); return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };

const base = (p: Row): Row => ({
  id: uid(), clinic_id: 'demo-clinic', clinician_id: 'demo-clinician', link_id: null, title: null, series_id: null, duration_min: 45, kind: 'individual',
  mode: 'in_person', room_id: null, status: 'planned', status_at: null, status_by: null, cancel_reason: null, visible_to_family: false, booked_by: 'clinic',
  family_response: null, family_note: null, family_responded_at: null, package_id: null, waitlist_id: null, offer_expires_at: null, external_uid: null,
  created_by: 'demo-clinician', created_at: nowIso(), updated_at: nowIso(), ...p,
});

// Örnek veri: Nazlı her çarşamba 15:00 (geçmiş 6, gelecek 4), Ege iki haftada bir pazartesi 10:00, Defne (Mert) salı 11:00, Kerem ilk görüşme,
// ekip toplantısı, bekleme listesi, paket, dış takvim etkinliği
export function seedSessions(x: Row) {
  SESSION_TABLES.forEach((t) => { x[t] = x[t] ?? []; });
  if (x.sessionsSeeded || !x.clinic_links?.some((l: Row) => l.id === 'demo-link')) return;
  const today = trDay(nowIso());
  const links: Record<string, Row | undefined> = Object.fromEntries(x.clinic_links.map((l: Row) => [l.child_id, l]));
  const L = (child: string) => links[child]?.id ?? null;
  x.clinic_rooms.push({ id: 'room-1', clinic_id: 'demo-clinic', name: 'Oda 1', location: 'Kadıköy', active: true, created_at: nowIso() },
                      { id: 'room-2', clinic_id: 'demo-clinic', name: 'Oyun odası', location: 'Kadıköy', active: true, created_at: nowIso() });
  for (let d = 1; d <= 5; d++) x.clinic_availability.push({ id: uid(), clinic_id: 'demo-clinic', clinician_id: 'demo-clinician', weekday: d, start_time: '10:00', end_time: '18:00', room_id: 'room-1', bookable: d === 2 || d === 4, created_at: nowIso() });
  x.clinic_session_settings.push({ clinic_id: 'demo-clinic', ...DEFAULT_SETTINGS, booking_enabled: true, updated_at: nowIso() });
  const pkg = { id: 'pkg-nazli', clinic_id: 'demo-clinic', link_id: 'demo-link', title: '10 seans', total: 10, starts_on: addD(today, -42), ends_on: null, note: null, closed_at: null, created_by: 'demo-clinician', created_at: nowIso() };
  x.clinic_session_packages.push(pkg);
  const wed = nextDow(addD(today, 1), 3);
  const series = uid();
  const pastStatus = ['done', 'done', 'no_show', 'done', 'postponed', 'done'];
  const notes = ['İlk hedefler aileyle birlikte belirlendi; sabah rutini çizelgesi verildi.', 'Sabah rutininde düzen başladı; ekran geçişinde itiraz sürüyor.', '',
                 'Zamanlayıcı önerildi; ebeveyn uygulamaya istekli.', '', 'Sabah rutini daha kolay; akşam hazırlığı görevi denenecek.'];
  for (let i = 6; i >= 1; i--) {
    const s = base({ link_id: 'demo-link', series_id: series, starts_at: at(addD(wed, -7 * i), '15:00'), visible_to_family: true, room_id: 'room-1',
      status: pastStatus[6 - i], package_id: 'pkg-nazli', status_at: nowIso(), kind: i === 4 ? 'family' : 'individual',
      cancel_reason: pastStatus[6 - i] === 'postponed' ? 'Aile tatilde' : null });
    x.clinic_sessions.push(s);
    if (s.status === 'done') x.clinic_session_records.push({ session_id: s.id, clinic_id: 'demo-clinic', attendees: ['Çocuk', 'Anne'], observation: notes[6 - i],
      worked: 'Resimli çizelge ve geçiş provası.', next_step: i === 1 ? 'Akşam hazırlığı görevi; 2 hafta sonra değerlendir.' : null, agenda: [], homework: [], author_id: 'demo-clinician', updated_at: nowIso() });
  }
  for (let i = 0; i < 4; i++) x.clinic_sessions.push(base({ link_id: 'demo-link', series_id: series, starts_at: at(addD(wed, 7 * i), '15:00'), visible_to_family: true, room_id: 'room-1', package_id: 'pkg-nazli',
    family_response: i === 0 ? 'ok' : null, family_responded_at: i === 0 ? nowIso() : null }));
  const egeL = L('c-ege'), defneL = L('c-defne'), keremL = L('c-kerem');
  if (egeL) {
    const mon = nextDow(addD(today, 0), 1), se = uid();
    [-28, -14, 0, 14].forEach((n, i) => x.clinic_sessions.push(base({ link_id: egeL, series_id: se, starts_at: at(addD(mon, n), '10:00'), kind: i === 1 ? 'parent' : 'individual',
      status: n < 0 ? 'done' : 'planned', visible_to_family: true, room_id: 'room-2' })));
    x.clinic_waitlist.push({ id: 'wait-ege', clinic_id: 'demo-clinic', link_id: egeL, clinician_id: 'demo-clinician', note: 'Hafta içi öğleden sonra, haftalık olsun', status: 'waiting', created_by: 'demo-clinician', created_at: at(addD(today, -9), '12:00'), updated_at: nowIso() });
  }
  if (defneL) {
    const tue = nextDow(addD(today, 0), 2), se = uid();
    [-14, -7, 0, 7].forEach((n) => x.clinic_sessions.push(base({ link_id: defneL, clinician_id: 'demo-clinician-2', series_id: se, starts_at: at(addD(tue, n), '11:00'), duration_min: 50,
      status: n < 0 ? 'done' : 'planned', visible_to_family: true, room_id: 'room-2' })));
  }
  if (keremL) {
    x.clinic_sessions.push(base({ link_id: keremL, starts_at: at(addD(today, -6), '17:00'), duration_min: 60, kind: 'intake', status: 'done' }));
    x.clinic_sessions.push(base({ link_id: keremL, starts_at: at(nextDow(addD(today, 1), 4), '14:00'), visible_to_family: true, family_response: 'unavailable',
      family_note: 'Perşembe okul gezisi var, cuma olabilir mi?', family_responded_at: nowIso() }));
  }
  x.clinic_sessions.push(base({ title: 'Ekip toplantısı', kind: 'other', starts_at: at(nextDow(addD(today, 0), 5), '09:00'), duration_min: 60 }));
  // bugünün sabahı geçmişse bugün yapılmış bir seans (not bekliyor) ve öğleden sonra planlı bir seans
  if (egeL) x.clinic_sessions.push(base({ link_id: egeL, starts_at: at(today, '11:30'), status: Date.parse(at(today, '12:15')) < Date.now() ? 'done' : 'planned', visible_to_family: true }));
  x.clinic_calendar_sources.push({ id: 'src-1', clinician_id: 'demo-clinician', clinic_id: 'demo-clinic', label: 'Kişisel takvim', url: 'https://calendar.google.com/calendar/ical/ornek/basic.ics', last_synced_at: nowIso(), last_error: null, created_at: nowIso() });
  x.clinic_external_events.push({ id: 'ext-1', source_id: 'src-1', clinician_id: 'demo-clinician', clinic_id: 'demo-clinic', uid: 'e1', starts_at: at(nextDow(addD(today, 1), 4), '17:30'), ends_at: at(nextDow(addD(today, 1), 4), '18:30'), summary: 'Süpervizyon', session_id: null, ignored: false, synced_at: nowIso() });
  x.sessionsSeeded = true;
}

type Ctx = { db: Row; me: Row | null; uid: string; linkVisible: (m: Row, l: Row) => boolean; save: () => void; notify: (userId: string, app: string, kind: string, title: string, body: string, data: Row, childId?: string | null) => void };

export function sessionVisible(table: string, r: Row, m: Row | null, db: Row, linkVisible: (m: Row, l: Row) => boolean): boolean | undefined {
  if (!SESSION_TABLES.includes(table)) return undefined;
  if (!m) return false;   // aile tablolara bakmaz, işlevlerle görür
  const byLink = (id: string | null) => !!id && linkVisible(m, db.clinic_links.find((l: Row) => l.id === id));
  const sessionSeen = (s: Row | undefined) => !!s && s.clinic_id === m.clinic_id && (s.link_id ? byLink(s.link_id) : s.clinician_id === m.id || m.role === 'owner');
  if (table === 'clinic_sessions') return sessionSeen(r);
  if (table === 'clinic_session_records') return sessionSeen(db.clinic_sessions.find((s: Row) => s.id === r.session_id));
  if (['clinic_rooms', 'clinic_session_settings', 'clinic_availability'].includes(table)) return r.clinic_id === m.clinic_id;
  if (['clinic_session_packages', 'clinic_waitlist'].includes(table)) return r.clinic_id === m.clinic_id && byLink(r.link_id);
  return r.clinician_id === m.id;
}

const conflicts = (db: Row, clinic: string, clinician: string, room: string | null, start: string, min: number, except?: string) =>
  db.clinic_sessions.filter((s: Row) => s.clinic_id === clinic && s.id !== except && ['planned', 'offered', 'done'].includes(s.status)
    && ((room && s.room_id === room) || s.clinician_id === clinician)
    && Date.parse(s.starts_at) < Date.parse(start) + min * 60e3 && Date.parse(start) < Date.parse(s.starts_at) + s.duration_min * 60e3)
    .map((s: Row) => ({ starts_at: s.starts_at, room: !!room && s.room_id === room, clinician: s.clinician_id === clinician }));

export function sessionRpc(name: string, a: Row, c: Ctx): Res | undefined {
  const { db, me } = c;
  const ok = (data: any): Res => { c.save(); return { data, error: null }; };
  const fail = (message: string): Res => ({ data: null, error: { message } });
  const settingsOf = (clinic: string) => ({ ...DEFAULT_SETTINGS, ...(db.clinic_session_settings.find((s: Row) => s.clinic_id === clinic) ?? {}) });
  const childOf = (linkId: string | null) => { const l = db.clinic_links.find((x: Row) => x.id === linkId); return l ? db.children.find((ch: Row) => ch.id === l.child_id) : null; };
  const familyNotify = (s: Row, kind: string, title: string, body: string) => {
    const l = db.clinic_links.find((x: Row) => x.id === s.link_id);
    if (!l || l.status !== 'active' || !s.visible_to_family) return;
    const child = childOf(s.link_id);
    db.profiles.filter((p: Row) => p.family_id === l.family_id).forEach((p: Row) => c.notify(p.id, 'parent', kind, `${title}: ${child?.name ?? ''}`, body, { session_id: s.id }, l.child_id));
  };
  const clinicNotify = (s: Row, kind: string, title: string, body: string) => {
    const child = childOf(s.link_id);
    db.clinicians.filter((m: Row) => m.clinic_id === s.clinic_id && (!s.clinician_id || m.id === s.clinician_id))
      .forEach((m: Row) => c.notify(m.id, 'clinic', kind, `${title}${child ? `: ${child.name}` : ''}`, body, { session_id: s.id, link_id: s.link_id }, child?.id ?? null));
  };
  const seen = (s: Row | undefined) => !!s && !!me && (sessionVisible('clinic_sessions', s, me, db, c.linkVisible) ?? false);

  if (!me && name.startsWith('clinic_')) {
    if (['clinic_session_create', 'clinic_session_update', 'clinic_session_set_status', 'clinic_session_delete', 'clinic_session_record_save', 'clinic_busy',
         'clinic_session_settings', 'clinic_session_settings_save', 'clinic_room_save', 'clinic_package_save', 'clinic_waitlist_save', 'clinic_waitlist_offer',
         'clinic_calendar_feed', 'clinic_calendar_source_save', 'clinic_external_event_mark'].includes(name)) return fail('Uzman hesabı gerekli');
    return undefined;
  }
  switch (name) {
    case 'clinic_session_settings': return ok(settingsOf(me!.clinic_id));
    case 'clinic_session_settings_save': {
      if (me!.role !== 'owner') return fail('only_owner');
      const cur = db.clinic_session_settings.find((s: Row) => s.clinic_id === me!.clinic_id);
      const next = { ...settingsOf(me!.clinic_id), ...a.p, clinic_id: me!.clinic_id, updated_at: nowIso() };
      if (cur) Object.assign(cur, next); else db.clinic_session_settings.push(next);
      return ok(null);
    }
    case 'clinic_room_save': {
      if (me!.role !== 'owner') return fail('only_owner');
      if (a.p_id) { const r = db.clinic_rooms.find((x: Row) => x.id === a.p_id); if (!r) return fail('room_not_found'); Object.assign(r, { name: a.p_name, location: a.p_location, active: a.p_active }); return ok(r.id); }
      const r = { id: uid(), clinic_id: me!.clinic_id, name: a.p_name, location: a.p_location, active: a.p_active ?? true, created_at: nowIso() };
      db.clinic_rooms.push(r); return ok(r.id);
    }
    case 'clinic_session_create': {
      const p = a.p ?? {};
      if (p.link_id && !c.linkVisible(me!, db.clinic_links.find((l: Row) => l.id === p.link_id))) return fail('link_not_visible');
      const clin = p.clinician_id ?? me!.id;
      if (clin !== me!.id && me!.role !== 'owner') return fail('only_owner_assigns');
      const n = p.repeat && p.repeat !== 'none' ? Math.min(Math.max(p.count ?? 1, 1), 52) : 1;
      const step = (p.repeat === 'biweekly' ? 14 : 7) * 864e5;
      const series = n > 1 ? uid() : null;
      const ids: string[] = []; let conf: Row[] = [];
      for (let i = 0; i < n; i++) {
        const start = new Date(Date.parse(p.starts_at) + step * i).toISOString();
        conf = conf.concat(conflicts(db, me!.clinic_id, clin, p.room_id ?? null, start, p.duration_min ?? 45));
        const s = base({ clinic_id: me!.clinic_id, clinician_id: clin, link_id: p.link_id ?? null, title: p.link_id ? null : p.title ?? null, series_id: series, starts_at: start,
          duration_min: p.duration_min ?? 45, kind: p.kind ?? 'individual', mode: p.mode ?? 'in_person', room_id: p.room_id ?? null,
          visible_to_family: !!p.visible_to_family && !!p.link_id, package_id: p.package_id ?? null, created_by: me!.id });
        db.clinic_sessions.push(s); ids.push(s.id);
      }
      const first = db.clinic_sessions.find((s: Row) => s.id === ids[0]);
      if (first?.visible_to_family) familyNotify(first, 'session_scheduled', 'Yeni randevu', n > 1 ? `${n} seans, ${when(first.starts_at)} başlayarak` : when(first.starts_at));
      return ok({ ids, conflicts: conf });
    }
    case 'clinic_session_update': {
      const s = db.clinic_sessions.find((x: Row) => x.id === a.p_id);
      if (!seen(s)) return fail('session_not_found');
      const p = a.p ?? {};
      const delta = p.starts_at ? Date.parse(p.starts_at) - Date.parse(s.starts_at) : 0;
      const list = db.clinic_sessions.filter((x: Row) => x.id === s.id || (a.p_scope === 'following' && s.series_id && x.series_id === s.series_id && x.starts_at > s.starts_at && x.status === 'planned'));
      let conf: Row[] = [];
      const wasVisible = s.visible_to_family;
      for (const x of list) {
        const start = new Date(Date.parse(x.starts_at) + delta).toISOString();
        Object.assign(x, { starts_at: start, duration_min: p.duration_min ?? x.duration_min, kind: p.kind ?? x.kind, mode: p.mode ?? x.mode,
          room_id: 'room_id' in p ? p.room_id : x.room_id, clinician_id: p.clinician_id ?? x.clinician_id, title: 'title' in p ? p.title : x.title,
          visible_to_family: 'visible_to_family' in p ? !!p.visible_to_family && !!x.link_id : x.visible_to_family, package_id: 'package_id' in p ? p.package_id : x.package_id,
          family_response: delta ? null : x.family_response, family_note: delta ? null : x.family_note, updated_at: nowIso() });
        conf = conf.concat(conflicts(db, x.clinic_id, x.clinician_id, x.room_id, x.starts_at, x.duration_min, x.id));
      }
      if (s.visible_to_family && s.status === 'planned' && (delta || !wasVisible)) familyNotify(s, wasVisible ? 'session_changed' : 'session_scheduled', wasVisible ? 'Randevu değişti' : 'Yeni randevu', when(s.starts_at));
      return ok({ updated: list.length, conflicts: conf });
    }
    case 'clinic_session_set_status': {
      const s = db.clinic_sessions.find((x: Row) => x.id === a.p_id);
      if (!seen(s)) return fail('session_not_found');
      if (['done', 'no_show'].includes(a.p_status) && Date.parse(s.starts_at) > Date.now() + 30 * 60e3) return fail('session_not_started');
      let v = a.p_status;
      if (v === 'cancelled' && !a.p_waive && Date.now() > Date.parse(s.starts_at) - settingsOf(s.clinic_id).cancel_hours * 3600e3) v = 'late_cancel';
      const was = s.status;
      Object.assign(s, { status: v, status_at: nowIso(), status_by: me!.id, cancel_reason: ['cancelled', 'late_cancel', 'postponed'].includes(v) ? a.p_reason ?? null : null, updated_at: nowIso() });
      if (['cancelled', 'late_cancel', 'postponed'].includes(v) && ['planned', 'offered'].includes(was) && Date.parse(s.starts_at) > Date.now())
        familyNotify(s, 'session_cancelled', v === 'postponed' ? 'Randevu ertelendi' : 'Randevu iptal edildi', when(s.starts_at));
      return ok(v);
    }
    case 'clinic_session_delete': {
      const s = db.clinic_sessions.find((x: Row) => x.id === a.p_id);
      if (!seen(s)) return fail('session_not_found');
      if (db.clinic_session_records.some((r: Row) => r.session_id === s.id)) return fail('session_has_record');
      if (s.visible_to_family && Date.parse(s.starts_at) > Date.now()) familyNotify(s, 'session_cancelled', 'Randevu iptal edildi', when(s.starts_at));
      const gone = db.clinic_sessions.filter((x: Row) => (x.id === s.id || (a.p_scope === 'following' && s.series_id && x.series_id === s.series_id && x.starts_at > s.starts_at && x.status === 'planned'))
        && !db.clinic_session_records.some((r: Row) => r.session_id === x.id)).map((x: Row) => x.id);
      db.clinic_sessions = db.clinic_sessions.filter((x: Row) => !gone.includes(x.id));
      return ok(gone.length);
    }
    case 'clinic_session_record_save': {
      const s = db.clinic_sessions.find((x: Row) => x.id === a.p_session);
      if (!seen(s)) return fail('session_not_found');
      const p = a.p ?? {};
      const row = { session_id: s.id, clinic_id: s.clinic_id, attendees: p.attendees ?? [], observation: p.observation || null, worked: p.worked || null,
        next_step: p.next_step || null, agenda: p.agenda ?? [], homework: p.homework ?? [], author_id: me!.id, updated_at: nowIso() };
      const cur = db.clinic_session_records.find((r: Row) => r.session_id === s.id);
      if (cur) Object.assign(cur, row); else db.clinic_session_records.push(row);
      return ok(null);
    }
    case 'clinic_busy':
      return ok(db.clinic_sessions.filter((s: Row) => s.clinic_id === me!.clinic_id && ['planned', 'offered', 'done'].includes(s.status)
        && s.starts_at < a.p_to && new Date(Date.parse(s.starts_at) + s.duration_min * 60e3).toISOString() > a.p_from)
        .map((s: Row) => ({ clinician_id: s.clinician_id, room_id: s.room_id, starts_at: s.starts_at, ends_at: new Date(Date.parse(s.starts_at) + s.duration_min * 60e3).toISOString() })));
    case 'clinic_package_save': {
      if (a.p_id) { const k = db.clinic_session_packages.find((x: Row) => x.id === a.p_id); if (!k) return fail('package_not_found');
        Object.assign(k, { title: a.p_title, total: a.p_total, starts_on: a.p_starts, ends_on: a.p_ends, note: a.p_note, closed_at: a.p_closed ? k.closed_at ?? nowIso() : null }); return ok(k.id); }
      const k = { id: uid(), clinic_id: me!.clinic_id, link_id: a.p_link, title: a.p_title, total: a.p_total, starts_on: a.p_starts, ends_on: a.p_ends, note: a.p_note, closed_at: null, created_by: me!.id, created_at: nowIso() };
      db.clinic_session_packages.push(k); return ok(k.id);
    }
    case 'clinic_waitlist_save': {
      const cur = db.clinic_waitlist.find((w: Row) => w.link_id === a.p_link && ['waiting', 'offered'].includes(w.status));
      if (a.p_remove) { if (cur) cur.status = 'removed'; return ok(cur?.id ?? null); }
      if (cur) { cur.note = a.p_note; cur.updated_at = nowIso(); return ok(cur.id); }
      const w = { id: uid(), clinic_id: me!.clinic_id, link_id: a.p_link, clinician_id: db.clinic_links.find((l: Row) => l.id === a.p_link)?.clinician_id ?? null,
        note: a.p_note, status: 'waiting', created_by: me!.id, created_at: nowIso(), updated_at: nowIso() };
      db.clinic_waitlist.push(w); return ok(w.id);
    }
    case 'clinic_waitlist_offer': {
      const w = db.clinic_waitlist.find((x: Row) => x.id === a.p_waitlist);
      if (!w) return fail('waitlist_not_found');
      if (Date.parse(a.p_starts_at) <= Date.now()) return fail('offer_in_past');
      const s = base({ clinic_id: w.clinic_id, clinician_id: w.clinician_id ?? me!.id, link_id: w.link_id, starts_at: a.p_starts_at, duration_min: a.p_duration ?? 45,
        room_id: a.p_room ?? null, status: 'offered', visible_to_family: true, waitlist_id: w.id,
        offer_expires_at: new Date(Math.min(Date.now() + (a.p_hours ?? 24) * 3600e3, Date.parse(a.p_starts_at))).toISOString(), created_by: me!.id });
      db.clinic_sessions.push(s); w.status = 'offered';
      familyNotify(s, 'session_offer', 'Boşalan saat önerisi', `${when(s.starts_at)} · yanıtlamak için ParentApp › Uzmanım`);
      return ok(s.id);
    }
    case 'clinic_calendar_feed': {
      let f = db.clinic_calendar_feeds.find((x: Row) => x.clinician_id === me!.id);
      if (a.p_action === 'delete') { db.clinic_calendar_feeds = db.clinic_calendar_feeds.filter((x: Row) => x !== f); return ok(null); }
      const tok = () => Array.from({ length: 48 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
      if (!f) { f = { clinician_id: me!.id, clinic_id: me!.clinic_id, token: tok(), show_initials: !!a.p_initials, created_at: nowIso() }; db.clinic_calendar_feeds.push(f); }
      else if (a.p_action === 'rotate') f.token = tok();
      else if (a.p_action === 'set' && a.p_initials != null) f.show_initials = a.p_initials;
      return ok({ token: f.token, show_initials: f.show_initials });
    }
    case 'clinic_calendar_source_save': {
      if (a.p_remove) { db.clinic_calendar_sources = db.clinic_calendar_sources.filter((x: Row) => !(x.id === a.p_remove && x.clinician_id === me!.id)); return ok(a.p_remove); }
      const u = String(a.p_url ?? '').trim().replace(/^webcal:\/\//i, 'https://');
      if (!/^https:\/\/(calendar\.google\.com|p[0-9]{1,3}-caldav\.icloud\.com|outlook\.office365\.com|outlook\.live\.com)\/\S+$/i.test(u)) return fail('calendar_url_not_allowed');
      if (db.clinic_calendar_sources.filter((x: Row) => x.clinician_id === me!.id).length >= 3) return fail('too_many_sources');
      const s = { id: uid(), clinician_id: me!.id, clinic_id: me!.clinic_id, label: a.p_label, url: u, last_synced_at: null, last_error: null, created_at: nowIso() };
      db.clinic_calendar_sources.push(s); return ok(s.id);
    }
    case 'clinic_external_event_mark': {
      const e = db.clinic_external_events.find((x: Row) => x.id === a.p_event && x.clinician_id === me!.id);
      if (!e) return fail('event_not_found');
      if (a.p_ignore) { e.ignored = true; return ok(null); }
      const s = base({ clinic_id: e.clinic_id, clinician_id: e.clinician_id, link_id: a.p_link ?? null, title: a.p_link ? null : e.summary, starts_at: e.starts_at,
        duration_min: Math.max(5, Math.round((Date.parse(e.ends_at) - Date.parse(e.starts_at)) / 60e3)), kind: a.p_kind ?? 'individual', mode: a.p_mode ?? 'in_person', external_uid: e.uid });
      db.clinic_sessions.push(s); e.session_id = s.id; return ok(s.id);
    }
    // Aile (ParentApp önizlemesi aynı depoyu kullanır): görünür randevular ve yanıt
    case 'family_sessions': {
      const fam = db.profiles.find((p: Row) => p.id === c.uid)?.family_id;
      const rows = db.clinic_sessions.filter((s: Row) => s.visible_to_family && (s.status !== 'offered' || s.offer_expires_at > nowIso()) && db.clinic_links.some((l: Row) => l.id === s.link_id && l.status === 'active' && l.family_id === fam))
        .sort((x: Row, y: Row) => x.starts_at.localeCompare(y.starts_at))
        .map((s: Row) => { const l = db.clinic_links.find((x: Row) => x.id === s.link_id); const r = db.clinic_rooms.find((x: Row) => x.id === s.room_id);
          return { id: s.id, link_id: s.link_id, child_id: l.child_id, child: childOf(s.link_id)?.name ?? '', clinician: db.clinicians.find((m: Row) => m.id === s.clinician_id)?.name ?? '',
            clinic: db.clinics.find((k: Row) => k.id === s.clinic_id)?.name ?? '', starts_at: s.starts_at, duration_min: s.duration_min, kind: s.kind, mode: s.mode,
            room: r?.name ?? null, location: r?.location ?? null, status: s.status, family_response: s.family_response, family_note: s.family_note, booked_by: s.booked_by,
            offer_expires_at: s.offer_expires_at, series: !!s.series_id, reminders: settingsOf(s.clinic_id).reminders }; });
      return { data: rows, error: null };
    }
    case 'family_session_respond': {
      const s = db.clinic_sessions.find((x: Row) => x.id === a.p_id && x.visible_to_family);
      if (!s || s.status !== 'planned' || Date.parse(s.starts_at) <= Date.now()) return fail('session_closed');
      Object.assign(s, { family_response: a.p_response, family_note: a.p_note ?? null, family_responded_at: nowIso() });
      if (a.p_response === 'unavailable') clinicNotify(s, 'session_family_response', 'Aile seansa gelemiyor', when(s.starts_at) + (a.p_note ? ` · ${a.p_note}` : ''));
      return ok(null);
    }
    case 'family_offer_respond': {
      const s = db.clinic_sessions.find((x: Row) => x.id === a.p_id && x.status === 'offered');
      if (!s) return fail('offer_not_found');
      s.status = a.p_accept ? 'planned' : 'cancelled'; s.offer_expires_at = null;
      const w = db.clinic_waitlist.find((x: Row) => x.id === s.waitlist_id); if (w) w.status = a.p_accept ? 'booked' : 'waiting';
      clinicNotify(s, 'session_offer_answered', a.p_accept ? 'Aile boşalan saati aldı' : 'Aile boşalan saati almadı', when(s.starts_at));
      return ok(s.status);
    }
    default: return undefined;
  }
}
