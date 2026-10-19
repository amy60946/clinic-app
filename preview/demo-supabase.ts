// ÖNİZLEME İÇİN DENEME VERİTABANI
// Kaynak: parent-app/preview/demo-supabase.ts (ikisi aynı tutulur; ParentApp ile ortak önizleme için).
// Web önizlemesi derlenirken src/lib/supabase.ts yerine bu dosya kullanılır
// (bkz. preview/build.sh). Supabase istemcisinin uygulamada kullanılan kısmını
// taklit eder; veriler tarayıcıda (localStorage) saklanır. Uygulamanın
// gerçek sürümünde kullanılmaz.

import type { SupabaseClient } from '@supabase/supabase-js';

type Row = Record<string, any>;
type Err = { message: string; code?: string } | null;
type Db = { users: Row[]; blobs: Record<string, string>; sessions: Record<string, Row | null> } & Record<string, any>;

// ParentApp ve ClinicApp önizlemeleri aynı sayfada (aynı tarayıcı deposunda) birlikte çalışabilir:
// veri ortak, oturum her uygulamaya ayrı. Uygulama adını paketleyici yazar (window.__PREVIEW_APP__).
const APP: string = (globalThis as any).__PREVIEW_APP__ ?? 'parent';
const KEY = 'pofi-onizleme-v4';
const TABLES = ['profiles', 'families', 'children', 'tasks', 'task_assignments', 'completions', 'messages', 'saved_templates', 'invite_codes',
  'clinics', 'clinicians', 'clinic_invites', 'clinic_links', 'clinic_notes', 'clinic_goals', 'goal_ratings', 'abc_events',
  'clinic_task_suggestions', 'family_subscriptions'];

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
const now = () => new Date().toISOString();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const ago = (min: number) => new Date(Date.now() - min * 60e3).toISOString();

/* ---------- Örnek aile ---------- */

function seed(): Db {
  const U = 'demo-user', F = 'demo-family';
  const db: Db = { users: [], blobs: {}, sessions: {} };
  TABLES.forEach((t) => { db[t] = []; });
  db.users.push({ id: U, email: 'demo@parentapp.app', password: '12345678' });
  db.families.push({ id: F, name: 'Ailem', created_at: now() });
  db.profiles.push({ id: U, family_id: F, nickname: 'Anne', name: 'Ayşe', avatar: 'kadın', created_at: now() });
  db.children.push(
    { id: 'c-nazli', family_id: F, name: 'Nazlı', avatar: 'flamingo', gender: 'kız', birthday: '2018-04-12', age_band: 'A', user_id: 'demo-child', coins_spent: 15, created_at: ago(9000) },
    { id: 'c-arven', family_id: F, name: 'Arven', avatar: 'keçi', gender: 'erkek', birthday: '2020-09-03', user_id: null, created_at: ago(8000) },
  );
  const task = (id: string, title: string, emoji: string, skill: string, start: number, recurring: boolean, reminder: string | null, review: boolean, kids: [string, string, number][]) => {
    db.tasks.push({
      id, family_id: F, title, emoji, skill, description: '', start_date: day(start), recurring, end_date: null, reminder,
      requires_review: review, created_at: ago(5000 - db.tasks.length), repeat_kind: 'daily', repeat_days: [], sort_order: db.tasks.length,
    });
    kids.forEach(([child_id, difficulty, coins]) => db.task_assignments.push({ task_id: id, child_id, family_id: F, difficulty, coins }));
  };
  task('k-yatak', 'Yatağını topla', '🛏️', 'Takım Çalışması', -14, true, '08:00', true, [['c-nazli', 'easy', 5], ['c-arven', 'easy', 5]]);
  task('k-kitap', '10 dakika kitap oku', '📖', 'Odaklanma', -10, true, null, true, [['c-nazli', 'medium', 10]]);
  task('k-dis', 'Dişlerini fırçala', '🪥', 'Öz Bakım', -20, true, '21:00', false, [['c-nazli', 'easy', 5], ['c-arven', 'easy', 5]]);
  task('k-cicek', 'Çiçekleri sula', '🪴', 'Sorumluluk', 0, false, null, true, [['c-arven', 'easy', 5]]);
  // Çocuğun "Yaptım" dediği an: görevin hatırlatma saatine göre biraz önce ya da sonra
  const at = (d: number, hhmm: string, jitterMin: number) => {
    const [h, m] = hhmm.split(':').map(Number);
    const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, m + jitterMin, 0, 0);
    return x.toISOString();
  };
  const done = (task_id: string, child_id: string, d: number, status = 'approved', hhmm = '18:00', jitter = 0, decline_reason: string | null = null) =>
    db.completions.push({
      id: uuid(), family_id: F, task_id, child_id, date: day(d), status, created_at: now(),
      child_done_at: at(d, hhmm, jitter), decline_reason,
    });
  done('k-dis', 'c-nazli', 0, 'approved', '21:00', -10);
  done('k-yatak', 'c-nazli', 0, 'pending', '08:00', 15);
  done('k-kitap', 'c-nazli', -1, 'pending', '19:00', 0);
  // Nazlı: ilk haftalarda düzensiz, son haftalarda belirgin şekilde daha düzenli (uzman paneli grafikleri için)
  for (let n = 1; n <= 56; n++) {
    const early = n > 28;
    const r = (n * 37) % 100; // tekrarlanabilir sözde rastgele
    if (!early || r < 60) done('k-dis', 'c-nazli', -n, 'approved', '21:00', (r % 50) - 20);
    if (r < (early ? 35 : 75)) done('k-yatak', 'c-nazli', -n, 'approved', '08:00', (r % 130) - 30);
    if (n <= 10 && r < 70) done('k-kitap', 'c-nazli', -n, 'approved', '19:00', r % 60);
    else if (n <= 10) done('k-kitap', 'c-nazli', -n, 'declined', '19:00', 0, n % 2 ? 'hard' : 'no_time');
    if (n <= 12 && n % 3) done('k-dis', 'c-arven', -n);
  }
  const msg = (child_id: string, sender: string, body: string, min: number) =>
    db.messages.push({ id: uuid(), family_id: F, child_id, sender, sender_id: sender === 'parent' ? U : null, kind: 'text', body, media_path: null, duration_ms: null, created_at: ago(min) });
  msg('c-nazli', 'parent', 'Bugün kitabını okudun mu? 📖', 180);
  msg('c-nazli', 'child', 'Evet anne, 2 bölüm okudum!', 150);
  msg('c-nazli', 'parent', 'Harikasın! Akşam birlikte devam edelim 🌱', 140);
  db.saved_templates.push({ id: uuid(), family_id: F, template_key: 't1', is_custom: false, saved: true, created_at: now() });
  // Tekrarlayan görevlerin başlangıcı 8 haftalık geçmişe yayılır (uzman paneli)
  db.tasks.forEach((t: Row) => { if (t.recurring && t.id !== 'k-kitap') t.start_date = day(-60); });

  // Örnek klinik: uzman hesabı + Nazlı için ebeveyn rızası
  const K = 'demo-clinic', D = 'demo-clinician', L = 'demo-link';
  db.users.push({ id: D, email: 'uzman@clinicapp.app', password: '12345678' });
  db.clinics.push({ id: K, name: 'Mavi Çocuk ve Aile Merkezi', plan: 'trial', seat_limit: 3, trial_ends_at: new Date(Date.now() + 11 * 864e5).toISOString(), created_by: D, created_at: ago(5 * 1440) });
  db.clinicians.push({ id: D, clinic_id: K, name: 'Dr. Elif Kaya', title: 'Klinik Psikolog', role: 'owner', created_at: ago(5 * 1440) });
  db.clinicians.push({ id: 'demo-clinician-2', clinic_id: K, name: 'Mert Aydın', title: 'Ergoterapist', role: 'member', created_at: ago(4 * 1440) });
  db.clinic_links.push({ id: L, clinic_id: K, clinician_id: D, family_id: F, child_id: 'c-nazli', label: 'Sabah rutini', status: 'active', consent_by: U, consent_at: ago(40 * 1440), revoked_at: null, created_at: ago(40 * 1440) });
  const monday = (w: number) => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * w); return iso(d); };
  db.clinic_goals.push(
    { id: 'g-sabah', link_id: L, clinic_id: K, title: 'Sabah rutinini hatırlatmasız başlatır', description: '-2: hiç başlatmaz · 0: haftada 3 gün · +2: her gün', archived: false, created_by: D, created_at: ago(40 * 1440) },
    { id: 'g-gecis', link_id: L, clinic_id: K, title: 'Ekran kapatma geçişinde sakin kalır', description: '-2: her geçişte kriz · 0: haftada 1–2 · +2: hiç', archived: false, created_by: D, created_at: ago(40 * 1440) },
  );
  [-2, -1, -1, 0, 0, 1].forEach((r, i) => db.goal_ratings.push({ goal_id: 'g-sabah', clinic_id: K, week: monday(5 - i), rating: r, note: '', rated_by: D, created_at: now() }));
  [-1, -1, 0, 0, 1, 1].forEach((r, i) => db.goal_ratings.push({ goal_id: 'g-gecis', clinic_id: K, week: monday(5 - i), rating: r, note: '', rated_by: D, created_at: now() }));
  db.clinic_notes.push(
    { id: uuid(), link_id: L, clinic_id: K, author_id: D, body: 'İlk görüşme. Aile sabah rutini ve ekran geçişlerinde zorlandığını belirtti. Hedefler birlikte belirlendi.', created_at: ago(40 * 1440) },
    { id: uuid(), link_id: L, clinic_id: K, author_id: D, body: 'Yatak toplama hatırlatmayla düzenli hale geliyor. Kitap okumada "zor" yanıtları var; süre 5 dakikaya inebilir.', created_at: ago(9 * 1440) },
  );
  const abc = (d: number, a: string, b: string, c: string, intensity: number) =>
    db.abc_events.push({ id: uuid(), family_id: F, child_id: 'c-nazli', occurred_at: at(-d, '19:30', 0), antecedent: a, behavior: b, consequence: c, intensity, created_by: U, created_at: now() });
  abc(38, 'Tablet süresi bitti', 'Ağladı, tableti bırakmadı', 'Tablet elinden alındı', 5);
  abc(33, 'Tablet süresi bitti', 'Bağırdı, kapıyı çarptı', 'Odasına gitti', 4);
  abc(27, 'Ödev zamanı geldi', 'Masaya oturmayı reddetti', 'Ödev ertelendi', 3);
  abc(20, 'Tablet süresi bitti', 'Söylendi ama kapattı', 'Övgü aldı', 2);
  abc(12, 'Tablet süresi bitti', 'Biraz itiraz etti, 2 dakikada kapattı', 'Birlikte oyun oynandı', 2);
  abc(4, 'Kardeşi oyuncağını aldı', 'Kardeşine vurdu', 'Sakinleşme köşesine gitti', 3);
  db.clinic_task_suggestions.push({
    id: uuid(), link_id: L, clinic_id: K, family_id: F, child_id: 'c-nazli', title: 'Kıyafetini akşamdan hazırla', emoji: '👕',
    skill: 'Planlama', difficulty: 'easy', recurring: true, note: 'Sabah rutinini kısaltmak için.', status: 'pending', created_by: D, created_at: ago(300), decided_at: null,
  });

  // İki uygulama aynı anda ilk kez açılabilir: hangisi kurarsa kursun her ikisinin hazır oturumu olsun
  db.sessions = {
    clinic: { user: { id: D, email: 'uzman@clinicapp.app' }, access_token: 'demo' },
    parent: { user: { id: U, email: 'demo@parentapp.app' }, access_token: 'demo' },
  };
  return db;
}

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const x = JSON.parse(raw);
      TABLES.forEach((t) => { x[t] = x[t] ?? []; });
      x.sessions = x.sessions ?? {};
      return x;
    }
  } catch { /* depolama kapalıysa her açılışta örnek aile */ }
  return seed();
}

let db = load();
// Aynı sayfadaki öteki uygulama yazmış olabilir: her işlemden önce depodan tazele
const sync = () => {
  try { if (localStorage.getItem(KEY)) db = load(); } catch { /* yok say */ }
};
const sess = () => db.sessions[APP] ?? null;
const setSess = (s: Row | null) => { db.sessions[APP] = s; };
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* sığmazsa (ör. büyük fotoğraflar) yalnızca bu oturumda kalır */ }
};

/* ---------- Tablo sorguları ---------- */

const PK: Record<string, string[]> = {
  task_assignments: ['task_id', 'child_id'],
  completions: ['task_id', 'child_id', 'date'],
  invite_codes: ['code'],
  clinic_invites: ['code'],
  goal_ratings: ['goal_id', 'week'],
  family_subscriptions: ['family_id'],
};

function cascade(table: string, removed: Row[]) {
  const ids = new Set(removed.map((r) => r.id));
  if (table === 'tasks') {
    ['task_assignments', 'completions'].forEach((t) => { db[t] = db[t].filter((r: Row) => !ids.has(r.task_id)); });
  }
  if (table === 'children') {
    ['task_assignments', 'completions', 'messages', 'invite_codes'].forEach((t) => { db[t] = db[t].filter((r: Row) => !ids.has(r.child_id)); });
  }
  if (table === 'families') {
    TABLES.filter((t) => t !== 'families' && t !== 'profiles').forEach((t) => { db[t] = db[t].filter((r: Row) => !ids.has(r.family_id)); });
    db.profiles.forEach((p: Row) => { if (ids.has(p.family_id)) p.family_id = null; });
  }
  if (table === 'clinic_goals') db.goal_ratings = db.goal_ratings.filter((r: Row) => !ids.has(r.goal_id));
}

class Query implements PromiseLike<{ data: any; error: Err; count?: number }> {
  private filters: ((r: Row) => boolean)[] = [];
  private op: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
  private payload: any;
  private cols = '*';
  private one = false;
  private head = false;
  private conflict?: string[];

  constructor(private table: string) {}

  select(cols = '*', opts?: { head?: boolean }) { this.cols = cols; if (opts?.head) this.head = true; return this; }
  eq(k: string, v: any) { this.filters.push((r) => r[k] === v); return this; }
  match(m: Row) { Object.entries(m).forEach(([k, v]) => this.eq(k, v)); return this; }
  neq(k: string, v: any) { this.filters.push((r) => r[k] !== v); return this; }
  in(k: string, vals: any[]) { this.filters.push((r) => vals.includes(r[k])); return this; }
  gte(k: string, v: any) { this.filters.push((r) => String(r[k] ?? '') >= String(v)); return this; }
  lte(k: string, v: any) { this.filters.push((r) => String(r[k] ?? '') <= String(v)); return this; }
  limit() { return this; }
  not(k: string, _op: string, list: string) {
    const vals = list.replace(/[()]/g, '').split(',');
    this.filters.push((r) => !vals.includes(String(r[k])));
    return this;
  }
  order() { return this; }
  maybeSingle() { this.one = true; return this; }
  insert(p: any) { this.op = 'insert'; this.payload = p; return this; }
  upsert(p: any, o?: { onConflict?: string }) { this.op = 'upsert'; this.payload = p; this.conflict = o?.onConflict?.split(','); return this; }
  update(p: Row) { this.op = 'update'; this.payload = p; return this; }
  delete() { this.op = 'delete'; return this; }

  private run() {
    sync();
    const rows: Row[] = db[this.table] ?? (db[this.table] = []);
    const hit = (r: Row) => this.filters.every((f) => f(r));
    if (this.op === 'select') {
      let out = rows.filter(hit).map((r) => ({ ...r }));
      if (this.table === 'tasks' && this.cols.includes('task_assignments(')) {
        out = out.map((t) => ({ ...t, task_assignments: db.task_assignments.filter((a: Row) => a.task_id === t.id) }));
      }
      out.sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')));
      if (this.head) return { data: null, error: null, count: out.length };
      return { data: this.one ? out[0] ?? null : out, error: null, count: out.length };
    }
    if (this.op === 'insert' || this.op === 'upsert') {
      const list: Row[] = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r: Row) => ({
        ...(PK[this.table] ? {} : { id: uuid() }), created_at: now(), ...r,
      }));
      const key = this.conflict ?? PK[this.table] ?? ['id'];
      for (const r of list) {
        const i = rows.findIndex((x) => key.every((k) => x[k] === r[k]));
        if (i >= 0 && this.op === 'upsert') rows[i] = { ...rows[i], ...r };
        else if (i >= 0) return { data: null, error: { message: 'Bu kayıt zaten var.' } };
        else rows.push(r);
      }
    }
    if (this.op === 'update') rows.filter(hit).forEach((r) => Object.assign(r, this.payload));
    if (this.op === 'delete') {
      const removed = rows.filter(hit);
      db[this.table] = rows.filter((r) => !hit(r));
      cascade(this.table, removed);
    }
    save();
    return { data: null, error: null };
  }

  then<A = any, B = never>(ok?: ((v: any) => A | PromiseLike<A>) | null, fail?: ((e: any) => B | PromiseLike<B>) | null) {
    return new Promise((r) => setTimeout(r, 60)).then(() => this.run()).then(ok, fail);
  }
}

/* ---------- Oturum ---------- */

type Listener = (event: string, session: Row | null) => void;
const listeners: Listener[] = [];
const emit = (event: string) => listeners.forEach((l) => l(event, sess()));
const fail = (message: string, code?: string) => ({ data: { session: null, user: null }, error: { message, code } });
const myProfile = () => db.profiles.find((p: Row) => p.id === sess()?.user.id);
const myClinician = () => db.clinicians.find((m: Row) => m.id === sess()?.user.id);

function newFamilyFor(userId: string, name: string) {
  const fid = uuid();
  db.families.push({ id: fid, name: 'Ailem', created_at: now() });
  db.profiles.push({ id: userId, family_id: fid, nickname: 'Ben', name, avatar: 'erkek', created_at: now() });
}

const auth = {
  async getSession() { sync(); return { data: { session: sess() }, error: null }; },
  onAuthStateChange(cb: Listener) {
    listeners.push(cb);
    return { data: { subscription: { unsubscribe() { listeners.splice(listeners.indexOf(cb), 1); } } } };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    sync();
    const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
    if (!u) return fail('Invalid login credentials', 'invalid_credentials');
    setSess({ user: { id: u.id, email: u.email }, access_token: 'demo' });
    save(); emit('SIGNED_IN');
    return { data: { session: sess() }, error: null };
  },
  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Row } }) {
    sync();
    if (db.users.some((x) => x.email.toLowerCase() === email.toLowerCase())) return fail('User already registered', 'user_already_exists');
    const id = uuid();
    const meta = options?.data ?? {};
    // Sunucudaki handle_new_user ile aynı: uzman hesabı aile açmaz, klinik açar ya da ekibe katılır
    if (meta.account === 'clinician') {
      let cid: string;
      let role = 'owner';
      if (String(meta.team_code ?? '').trim()) {
        const inv = db.clinic_invites.find((i: Row) => i.code === String(meta.team_code).trim().toUpperCase() && i.kind === 'clinician' && !i.used_at && i.expires_at > now());
        if (!inv) return fail('Ekip kodu geçersiz ya da süresi dolmuş');
        const clinic = db.clinics.find((c: Row) => c.id === inv.clinic_id);
        if (db.clinicians.filter((m: Row) => m.clinic_id === inv.clinic_id).length >= clinic.seat_limit) return fail('Kliniğin uzman koltuğu dolu');
        inv.used_at = now(); inv.used_by = id;
        cid = inv.clinic_id; role = 'member';
      } else {
        cid = uuid();
        db.clinics.push({ id: cid, name: String(meta.clinic_name || 'Kliniğim'), plan: 'trial', seat_limit: 3, trial_ends_at: new Date(Date.now() + 14 * 864e5).toISOString(), created_by: id, created_at: now() });
      }
      db.clinicians.push({ id, clinic_id: cid, name: meta.name ?? '', title: meta.title ?? '', role, created_at: now() });
    } else {
      newFamilyFor(id, meta.name ?? '');
    }
    db.users.push({ id, email, password });
    setSess({ user: { id, email }, access_token: 'demo' });
    save(); emit('SIGNED_IN');
    return { data: { session: sess(), user: sess()!.user }, error: null };
  },
  async signInAnonymously() {
    const id = uuid();
    db.users.push({ id, email: '', password: '', anonymous: true });
    setSess({ user: { id, email: null, is_anonymous: true }, access_token: 'demo' });
    save(); emit('SIGNED_IN');
    return { data: { session: sess() }, error: null };
  },
  async signOut() { sync(); setSess(null); save(); emit('SIGNED_OUT'); return { error: null }; },
  async updateUser({ password }: { password?: string }) {
    const u = db.users.find((x) => x.id === sess()?.user.id);
    if (u && password) u.password = password;
    save();
    return { data: {}, error: null };
  },
  async resetPasswordForEmail() { return { data: {}, error: null }; },
  async resend() { return { data: {}, error: null }; },
  async setSession() { return { data: {}, error: null }; },
  async verifyOtp() { return { data: {}, error: null }; },
  async exchangeCodeForSession() { return { data: {}, error: null }; },
  startAutoRefresh() {},
  stopAutoRefresh() {},
};

/* ---------- Sunucu fonksiyonları ---------- */

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

async function rpc(name: string, args: Row = {}): Promise<{ data: any; error: Err }> {
  await new Promise((r) => setTimeout(r, 120));
  sync();
  const me = myProfile();
  const uid = sess()?.user.id;
  if (!uid) return { data: null, error: { message: 'Önce giriş yapmalısın' } };
  if (name === 'create_invite_code') {
    if (!me?.family_id) return { data: null, error: { message: 'Önce giriş yapmalısın' } };
    if (args.p_kind === 'child') db.invite_codes = db.invite_codes.filter((i: Row) => !(i.child_id === args.p_child_id && !i.used_at));
    const row = {
      code: makeCode(), family_id: me.family_id, kind: args.p_kind ?? 'parent', child_id: args.p_child_id ?? null,
      created_by: uid, created_at: now(), expires_at: new Date(Date.now() + 864e5).toISOString(), used_at: null,
    };
    db.invite_codes.push(row);
    save();
    return { data: [{ code: row.code, expires_at: row.expires_at }], error: null };
  }
  if (name === 'redeem_child_code') {
    const inv = db.invite_codes.find((i: Row) => i.code === String(args.p_code).trim().toUpperCase() && i.kind === 'child');
    if (!inv || inv.used_at || inv.expires_at < now()) return { data: null, error: { message: 'Kod geçersiz ya da süresi dolmuş' } };
    const c = db.children.find((x: Row) => x.id === inv.child_id);
    db.children.forEach((x: Row) => { if (x.user_id === uid) x.user_id = null; });
    c.user_id = uid;
    inv.used_at = now(); inv.used_by = uid;
    save();
    return { data: { child_id: c.id, family_id: c.family_id, name: c.name, avatar: c.avatar }, error: null };
  }
  // Pofi Adası (M4) fonksiyonları: yaş bandı, ret + not, coin bakiyesi, cihaz bağlantısı
  const myChild = (id: string) => db.children.find((x: Row) => x.id === id && x.family_id === me?.family_id);
  if (name === 'set_child_age_band') {
    const c = myChild(args.p_child_id);
    if (!c) return { data: null, error: { message: 'Çocuk bulunamadı' } };
    c.age_band = args.p_band;
    save();
    return { data: null, error: null };
  }
  if (name === 'review_completion') {
    const key = { task_id: args.p_task_id, child_id: args.p_child_id, date: args.p_date };
    let row = db.completions.find((r: Row) => r.task_id === key.task_id && r.child_id === key.child_id && r.date === key.date);
    if (!row) { row = { id: uuid(), family_id: me.family_id, ...key, created_at: now() }; db.completions.push(row); }
    Object.assign(row, { status: args.p_status, parent_note: args.p_note ?? null, reviewed_at: now(), reviewed_by: uid });
    save();
    return { data: null, error: null };
  }
  if (name === 'child_balance') {
    const c = myChild(args.p_child_id);
    if (!c) return { data: null, error: { message: 'Yetki yok' } };
    const earned = db.completions
      .filter((r: Row) => r.child_id === c.id && r.status === 'approved')
      .reduce((sum: number, r: Row) => sum + (db.task_assignments.find((a: Row) => a.task_id === r.task_id && a.child_id === c.id)?.coins ?? 0), 0);
    return { data: earned - (c.coins_spent ?? 0), error: null };
  }
  if (name === 'unlink_child_device') {
    const c = myChild(args.p_child_id);
    if (!c) return { data: null, error: { message: 'Çocuk bulunamadı' } };
    c.user_id = null;
    save();
    return { data: null, error: null };
  }
  if (name === 'join_family') {
    const inv = db.invite_codes.find((i: Row) => i.code === String(args.p_code).trim().toUpperCase() && i.kind === 'parent');
    if (!inv || inv.used_at || inv.expires_at < now()) return { data: null, error: { message: 'Kod geçersiz ya da süresi dolmuş' } };
    if (inv.family_id === me.family_id) return { data: null, error: { message: 'Zaten bu ailedesin' } };
    const old = me.family_id;
    me.family_id = inv.family_id;
    inv.used_at = now(); inv.used_by = uid;
    if (old && !db.profiles.some((p: Row) => p.family_id === old)) {
      const fam = db.families.filter((f: Row) => f.id === old);
      db.families = db.families.filter((f: Row) => f.id !== old);
      cascade('families', fam);
    }
    save();
    return { data: inv.family_id, error: null };
  }
  if (name === 'delete_account') {
    const fid = me?.family_id;
    db.profiles = db.profiles.filter((p: Row) => p.id !== uid);
    if (fid && !db.profiles.some((p: Row) => p.family_id === fid)) {
      const fam = db.families.filter((f: Row) => f.id === fid);
      db.families = db.families.filter((f: Row) => f.id !== fid);
      cascade('families', fam);
    }
    db.users = db.users.filter((u) => u.id !== uid);
    save();
    return { data: null, error: null };
  }
  // Klinik (ClinicApp) fonksiyonları: sunucudaki 20261019000000_clinic.sql ile aynı kurallar
  const err = (message: string) => ({ data: null, error: { message } });
  const clinicActive = (id: string) => {
    const c = db.clinics.find((x: Row) => x.id === id);
    return !!c && (['small', 'business', 'custom'].includes(c.plan) || (c.plan === 'trial' && c.trial_ends_at > now()));
  };
  const openInvite = (code: string, kind: string) =>
    db.clinic_invites.find((i: Row) => i.code === String(code ?? '').trim().toUpperCase() && i.kind === kind && !i.used_at && i.expires_at > now());
  if (name === 'clinician_me') {
    const m = myClinician();
    if (!m) return { data: null, error: null };
    const c = db.clinics.find((x: Row) => x.id === m.clinic_id);
    return { data: { id: m.id, name: m.name, title: m.title, role: m.role, clinic_id: c.id, clinic: c.name, plan: c.plan, seat_limit: c.seat_limit, trial_ends_at: c.trial_ends_at, active: clinicActive(c.id) }, error: null };
  }
  if (name === 'clinic_create_invite') {
    const m = myClinician();
    if (!m) return err('Yalnızca uzman hesabı');
    if (args.p_kind === 'clinician' && m.role !== 'owner') return err('Ekibe yalnızca klinik sahibi davet eder');
    let code = makeCode();
    while (db.clinic_invites.some((i: Row) => i.code === code)) code = makeCode();
    const row = { code, clinic_id: m.clinic_id, clinician_id: m.id, kind: args.p_kind ?? 'family', label: String(args.p_label ?? '').slice(0, 60),
      created_at: now(), expires_at: new Date(Date.now() + 7 * 864e5).toISOString(), used_at: null, used_by: null };
    db.clinic_invites.push(row);
    save();
    return { data: { code, expires_at: row.expires_at }, error: null };
  }
  if (name === 'clinic_invite_preview') {
    if (!me?.family_id) return err('Önce ebeveyn olarak giriş yapmalısın');
    const inv = openInvite(args.p_code, 'family');
    if (!inv) return err('Kod geçersiz ya da süresi dolmuş');
    const m = db.clinicians.find((x: Row) => x.id === inv.clinician_id);
    return { data: { clinic: db.clinics.find((x: Row) => x.id === inv.clinic_id)?.name, clinician: m?.name ?? '', title: m?.title ?? '' }, error: null };
  }
  if (name === 'redeem_clinic_invite') {
    if (!me?.family_id) return err('Önce ebeveyn olarak giriş yapmalısın');
    if (!myChild(args.p_child_id)) return err('Çocuk bulunamadı');
    const inv = openInvite(args.p_code, 'family');
    if (!inv) return err('Kod geçersiz ya da süresi dolmuş');
    if (db.clinic_links.some((l: Row) => l.clinic_id === inv.clinic_id && l.child_id === args.p_child_id && l.status === 'active')) {
      return err('Bu çocuk bu klinikle zaten paylaşılıyor');
    }
    const id = uuid();
    db.clinic_links.push({ id, clinic_id: inv.clinic_id, clinician_id: inv.clinician_id, family_id: me.family_id, child_id: args.p_child_id,
      label: inv.label, status: 'active', consent_by: uid, consent_at: now(), revoked_at: null, created_at: now() });
    inv.used_at = now(); inv.used_by = uid;
    save();
    return { data: { link_id: id }, error: null };
  }
  if (name === 'revoke_clinic_link') {
    const m = myClinician();
    const l = db.clinic_links.find((x: Row) => x.id === args.p_link_id && x.status === 'active'
      && ((me?.family_id && x.family_id === me.family_id) || (m && x.clinic_id === m.clinic_id)));
    if (!l) return err('Paylaşım bulunamadı');
    Object.assign(l, { status: 'revoked', revoked_at: now(), revoked_by: uid });
    save();
    return { data: null, error: null };
  }
  if (name === 'family_clinic_links') {
    const rows = db.clinic_links.filter((l: Row) => l.family_id === me?.family_id && l.status === 'active').map((l: Row) => {
      const m = db.clinicians.find((x: Row) => x.id === l.clinician_id);
      return { link_id: l.id, child_id: l.child_id, clinic: db.clinics.find((x: Row) => x.id === l.clinic_id)?.name ?? '', clinician: m?.name ?? '', title: m?.title ?? '', consent_at: l.consent_at };
    });
    return { data: rows, error: null };
  }
  if (name === 'family_premium') {
    const fid = args.p_family_id ?? me?.family_id;
    const own = db.family_subscriptions.some((s: Row) => s.family_id === fid && s.plan === 'premium');
    return { data: own || db.clinic_links.some((l: Row) => l.family_id === fid && l.status === 'active' && clinicActive(l.clinic_id)), error: null };
  }
  return { data: null, error: null };
}

/* ---------- Dosyalar (Posta fotoğraf/ses) ---------- */

function toDataUrl(body: ArrayBuffer, type: string) {
  const bytes = new Uint8Array(body);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${type};base64,${btoa(bin)}`;
}

const storage = {
  from: () => ({
    async upload(path: string, body: ArrayBuffer, opts?: { contentType?: string }) {
      db.blobs[path] = toDataUrl(body, opts?.contentType ?? 'application/octet-stream');
      save();
      return { data: { path }, error: null };
    },
    async createSignedUrls(paths: string[]) {
      return { data: paths.map((path) => ({ path, signedUrl: db.blobs[path] ?? '' })), error: null };
    },
    async list(prefix: string) {
      return { data: Object.keys(db.blobs).filter((k) => k.startsWith(`${prefix}/`)).map((k) => ({ name: k.slice(prefix.length + 1) })), error: null };
    },
    async remove(paths: string[]) {
      paths.forEach((p) => delete db.blobs[p]);
      save();
      return { data: paths.map((name) => ({ name })), error: null };
    },
  }),
};

/* ---------- Dışa açılan istemci ---------- */

const channel = () => {
  const c: any = { on: () => c, subscribe: () => c };
  return c;
};

export const isSupabaseConfigured = true;
export const MAIL_BUCKET = 'mail';
// Uygulama kodu gerçek istemcinin tipleriyle derlensin diye SupabaseClient olarak sunulur
export const supabase = {
  auth,
  from: (t: string) => new Query(t),
  rpc,
  storage,
  channel,
  removeChannel() {},
} as unknown as SupabaseClient;

// Önizlemeyi baştan başlatmak için (tarayıcı konsolunda): parentappSifirla()
(globalThis as any).onizlemeSifirla = (globalThis as any).parentappSifirla = () => {
  try { localStorage.removeItem(KEY); } catch { /* yok say */ }
  db = seed();
  location.reload();
};
