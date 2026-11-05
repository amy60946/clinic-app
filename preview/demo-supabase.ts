// ÖNİZLEME İÇİN DENEME VERİTABANI (ClinicApp)
// Web önizlemesi derlenirken src/lib/supabase.ts yerine bu dosya kullanılır
// (bkz. preview/build.sh). Supabase istemcisinin uygulamada kullanılan kısmını
// taklit eder; veriler tarayıcıda (localStorage) saklanır. Uygulamanın
// gerçek sürümünde kullanılmaz.
// Kaynak: parent-app/preview/demo-supabase.ts (ParentApp önizlemesiyle aynı depo anahtarı ve örnek veri;
// iki önizleme aynı sayfada birlikte çalışır). ClinicApp eklemeleri: ilişkili tablo gömme (embed),
// sıralama, uzman için satır düzeyi görünürlük (rıza), ebeveyn onay zamanı.

import type { SupabaseClient } from '@supabase/supabase-js';
import { SESSION_TABLES, seedSessions, sessionVisible, sessionRpc } from './demo-sessions';
import { getWorkspace } from './workspace';

type Row = Record<string, any>;
type Err = { message: string; code?: string } | null;
type Db = { users: Row[]; blobs: Record<string, string>; sessions: Record<string, Row | null> } & Record<string, any>;

// ParentApp ve ClinicApp önizlemeleri aynı sayfada (aynı tarayıcı deposunda) birlikte çalışabilir:
// veri ortak, oturum her uygulamaya ayrı. Uygulama adını paketleyici yazar (window.__PREVIEW_APP__).
const APP: string = (globalThis as any).__PREVIEW_APP__ ?? 'parent';
// Depo anahtarı ParentApp önizlemesindeki ve önizleme çerçevesindeki ile aynı kalmalı (eski ad, yalnız teknik)
const KEY = 'pofi-onizleme-v4';
const TABLES = ['profiles', 'families', 'children', 'tasks', 'task_assignments', 'completions', 'messages', 'saved_templates', 'invite_codes',
  'clinics', 'clinicians', 'clinic_invites', 'clinic_links', 'clinic_notes', 'clinic_goals', 'goal_ratings', 'abc_events',
  'clinic_task_suggestions', 'clinic_routines', 'family_subscriptions', 'notifications', 'push_tokens', 'user_activity', 'app_events', 'billing_plans', 'clinic_link_access',
  'care_modules', 'care_module_logs', 'clinic_link_history', 'clinician_surveys', 'legal_acceptances', 'kvkk_requests',
  'care_module_goals', 'clinic_plan_templates', 'clinic_members', 'clinician_codes', 'clinic_member_requests', ...SESSION_TABLES];

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
      // Ebeveyn kararı "Yaptım"dan 1–3 saat sonra (uzman panelindeki onay gecikmesi)
      reviewed_at: status === 'approved' && d < 0 ? at(d, hhmm, jitter + 60 + ((d * -37) % 120)) : null,
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
    description: 'Yatmadan önce yarın giyeceklerini sandalyeye koy.', category: 'self', template_key: null, coins: 5, start_date: null,
    repeat_kind: 'weekly', repeat_days: [1, 2, 3, 4, 5], end_date: null, reminder: '20:00', requires_review: true, updated_at: null,
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
      return upgrade(x);
    }
  } catch { /* depolama kapalıysa her açılışta örnek aile */ }
  return upgrade(seed());
}

/* ---------- ClinicApp eklemeleri: ekip üyesi deneme hesabı, uzman bildirimleri ---------- */

const MEMBER = 'demo-clinician-2';

// Eski önizleme verisine de uygulanır (iki uygulama aynı depoyu paylaşır)
function upgrade(x: Db): Db {
  if (!x.users.some((u: Row) => u.email === 'ekip@clinicapp.app') && x.clinicians.some((m: Row) => m.id === MEMBER)) {
    x.users.push({ id: MEMBER, email: 'ekip@clinicapp.app', password: '12345678' });
    const owner = x.clinicians.find((m: Row) => m.clinic_id === 'demo-clinic' && m.role === 'owner');
    x.clinic_invites.push({ code: 'EKP4MA', clinic_id: 'demo-clinic', clinician_id: owner?.id ?? 'demo-clinician', kind: 'clinician', label: '',
      created_at: ago(4 * 1440 + 60), expires_at: ago(-3 * 1440), used_at: ago(4 * 1440), used_by: MEMBER });
  }
  // Üyelik (ortak 20261022000000): paket kataloğu, 7 günlük deneme, süresi dolmuş örnek hesap
  if (!x.billing_plans.length) {
    x.billing_plans.push(
      { id: 'solo_monthly', package: 'solo', period: 'monthly', seat_limit: 1, price_try: 749.99, apple_product_id: 'com.clinicapp.uzman.solo.monthly', iyzico_plan_ref: 'demo', sort: 1, active: true },
      { id: 'solo_yearly', package: 'solo', period: 'yearly', seat_limit: 1, price_try: 7499.99, apple_product_id: 'com.clinicapp.uzman.solo.yearly', iyzico_plan_ref: 'demo', sort: 2, active: true },
      { id: 'clinic_monthly', package: 'clinic', period: 'monthly', seat_limit: 10, price_try: 2999.99, apple_product_id: 'com.clinicapp.uzman.clinic.monthly', iyzico_plan_ref: 'demo', sort: 3, active: true },
      { id: 'clinic_yearly', package: 'clinic', period: 'yearly', seat_limit: 10, price_try: 29999.99, apple_product_id: 'com.clinicapp.uzman.clinic.yearly', iyzico_plan_ref: 'demo', sort: 4, active: true },
    );
    x.clinics.forEach((c: Row) => {
      if (c.plan === 'trial') {
        c.seat_limit = 10;
        if (c.trial_ends_at > new Date(Date.now() + 7 * 864e5).toISOString()) c.trial_ends_at = new Date(Date.now() + 5 * 864e5).toISOString();
      }
    });
  }
  // Takip planı (ortak 20261026100000): örnek hedef alanları + aile programı ve ebeveyn kaydı
  if (!x.care_modules.length && x.clinic_links.some((l: Row) => l.id === 'demo-link')) {
    x.clinic_goals.forEach((g: Row) => {
      if (g.id === 'g-sabah') Object.assign(g, { domain: 'routine', measure: 'yesno', baseline: 'Haftada 2 gün', target: "7 günün 5'i", weeks: 8, home_support: 'Resimli sabah çizelgesi; bitince kısa övgü.', shared: true, status: 'active', position: 0 });
      if (g.id === 'g-gecis') Object.assign(g, { domain: 'rules', measure: 'percent', baseline: '%30', target: '%80', weeks: 8, home_support: '5 dakika önce uyarı ve zamanlayıcı.', shared: true, status: 'active', position: 1 });
    });
    x.care_modules.push(
      { id: 'm-ovgu', clinic_id: 'demo-clinic', link_id: 'demo-link', invite_code: null, title: 'Övgü ve olumlu pekiştirme', aim: 'İstenen davranışı fark edip hemen ve adıyla övmek.', practice: 'Her gün hedef davranışı en az 5 kez fark et ve öv.', checklist: ['Davranışı adıyla övdüm', 'Hemen övdüm', 'Küçük bir adımı da fark ettim'], position: 0, status: 'active', template_key: 'm_praise', created_by: 'demo-clinician', created_at: ago(20 * 1440) },
      { id: 'm-gecis', clinic_id: 'demo-clinic', link_id: 'demo-link', invite_code: null, title: 'Geçişlere hazırlık', aim: 'Etkinlik değişimlerini önceden haber verip kolaylaştırmak.', practice: 'Günün en zor geçişinde uygula (ör. ekran kapatma).', checklist: ['Önceden uyardım', 'Zamanlayıcı kullandım', 'Geçişi övdüm'], position: 1, status: 'planned', template_key: 'm_transitions', created_by: 'demo-clinician', created_at: ago(20 * 1440) },
    );
    [1, 2, 3, 5, 6, 8, 9, 10].forEach((d, i) => x.care_module_logs.push({ id: uuid(), module_id: 'm-ovgu', family_id: 'demo-family', day: day(-d), practiced: i !== 3, difficulty: i % 3 === 0 ? 3 : 2, barrier: i === 3 ? 'no_time' : null, note: '', created_by: 'demo-user', created_at: ago(d * 1440) }));
  }
  if (!x.users.some((u: Row) => u.email === 'bitti@clinicapp.app')) {
    x.users.push({ id: 'demo-expired', email: 'bitti@clinicapp.app', password: '12345678' });
    x.clinics.push({ id: 'demo-clinic-expired', name: 'Deneme Süresi Biten Klinik', plan: 'trial', seat_limit: 10,
      trial_ends_at: ago(1440), created_by: 'demo-expired', created_at: ago(8 * 1440) });
    x.clinicians.push({ id: 'demo-expired', clinic_id: 'demo-clinic-expired', name: 'Dr. Can Demir', title: 'Ergoterapist', role: 'owner', created_at: ago(8 * 1440) });
  }
  // Çalışma alanları (ortak proposed/20261105090000_workspaces.sql): üyelik, bireysel alan, örnek istek
  if (!x.workspacesSeeded) {
    x.clinicians.forEach((m: Row) => {
      if (!x.clinic_members.some((y: Row) => y.clinic_id === m.clinic_id && y.clinician_id === m.id)) {
        const used = x.clinic_invites.find((v: Row) => v.used_by === m.id && v.kind === 'clinician');
        x.clinic_members.push({ clinic_id: m.clinic_id, clinician_id: m.id, role: m.role, status: 'active', invited_by: used?.clinician_id ?? null, joined_at: m.created_at, left_at: null });
      }
    });
    // Ada Yıldız: bireysel uzman (ada@clinicapp.app); Mavi'nin sahibi kodu ADAKD24M ile ekleyebilir
    if (!x.users.some((u: Row) => u.email === 'ada@clinicapp.app')) {
      x.users.push({ id: 'demo-ada', email: 'ada@clinicapp.app', password: '12345678' });
      x.clinics.push({ id: 'demo-ada-ws', name: 'Ada Yıldız', plan: 'trial', seat_limit: 10, personal_of: 'demo-ada', members_can_invite: true,
        trial_ends_at: new Date(Date.now() + 6 * 864e5).toISOString(), created_by: 'demo-ada', created_at: ago(1440) });
      x.clinicians.push({ id: 'demo-ada', clinic_id: 'demo-ada-ws', name: 'Ada Yıldız', title: 'Dil ve Konuşma Terapisti', role: 'owner', created_at: ago(1440) });
      x.clinic_members.push({ clinic_id: 'demo-ada-ws', clinician_id: 'demo-ada', role: 'owner', status: 'active', invited_by: null, joined_at: ago(1440), left_at: null });
      x.clinician_codes.push({ clinician_id: 'demo-ada', code: 'ADAKD24M', created_at: ago(1440) });
    }
    // Yeşil Gelişim Merkezi, ekip@ hesabını ekibine eklemek istiyor (bekleyen istek)
    if (!x.clinics.some((c: Row) => c.id === 'demo-yesil')) {
      x.clinics.push({ id: 'demo-yesil', name: 'Yeşil Gelişim Merkezi', plan: 'clinic', seat_limit: 10, members_can_invite: true,
        trial_ends_at: ago(30 * 1440), period_end: new Date(Date.now() + 20 * 864e5).toISOString(), created_by: 'demo-yesil-owner', created_at: ago(60 * 1440) });
      x.clinicians.push({ id: 'demo-yesil-owner', clinic_id: 'demo-yesil', name: 'Dr. Selin Aydın', title: 'Çocuk Psikiyatristi', role: 'owner', created_at: ago(60 * 1440) });
      x.clinic_members.push({ clinic_id: 'demo-yesil', clinician_id: 'demo-yesil-owner', role: 'owner', status: 'active', invited_by: null, joined_at: ago(60 * 1440), left_at: null });
      x.clinic_member_requests.push({ id: 'demo-req-yesil', clinic_id: 'demo-yesil', clinician_id: MEMBER, requested_by: 'demo-yesil-owner', status: 'pending',
        created_at: ago(120), expires_at: new Date(Date.now() + 7 * 864e5 - 120 * 60e3).toISOString(), decided_at: null });
      x.notifications.push({ id: Date.now(), user_id: MEMBER, app: 'clinic', kind: 'team_request', title: 'Yeşil Gelişim Merkezi seni ekibine eklemek istiyor',
        body: 'Dr. Selin Aydın', data: { request_id: 'demo-req-yesil' }, created_at: ago(120), read_at: null });
    }
    x.clinics.forEach((c: Row) => { if (c.members_can_invite === undefined) c.members_can_invite = true; });
    x.workspacesSeeded = true;
  }
  if (!x.clinicNotifSeeded) {
    // Örnek verinin geçmiş olayları okunmuş sayılır; yalnız en yeni davranış kaydı okunmamış (zil ve rozet görünsün)
    deriveClinicNotifications(x, () => true);
    const latest = [...x.abc_events].sort((a: Row, b: Row) => String(b.occurred_at).localeCompare(String(a.occurred_at)))[0];
    x.notifications.forEach((n: Row) => { if (n.app === 'clinic' && latest && n.data?.abc_id === latest.id) n.read_at = null; });
    x.clinicNotifSeeded = true;
  }
  // Takip planı yeniden tasarımı (ortak migrations/20261102100000): örnek programlar hedeflerine bağlı, plan bir kez gönderilmiş
  TABLES.forEach((t) => { x[t] = x[t] ?? []; });
  if (!x.planRedesignSeeded) {
    if (x.care_modules.some((m: Row) => m.id === 'm-ovgu') && x.clinic_goals.some((g: Row) => g.id === 'g-sabah')) {
      x.care_module_goals.push({ module_id: 'm-ovgu', goal_id: 'g-sabah', clinic_id: 'demo-clinic', created_at: ago(20 * 1440) });
    }
    if (x.care_modules.some((m: Row) => m.id === 'm-gecis') && x.clinic_goals.some((g: Row) => g.id === 'g-gecis')) {
      x.care_module_goals.push({ module_id: 'm-gecis', goal_id: 'g-gecis', clinic_id: 'demo-clinic', created_at: ago(20 * 1440) });
    }
    x.clinic_task_suggestions.forEach((r: Row) => { r.kind = r.kind ?? 'new'; r.target_task_id = r.target_task_id ?? null; r.change_remove = !!r.change_remove; });
    x.clinic_links.filter((l: Row) => l.status === 'active').forEach((l: Row) => snapshot(x, l.id));
    x.planRedesignSeeded = true;
  }
  // Seans planlama (ortak 20261105100000): örnek seanslar, odalar, çalışma saatleri, bekleme listesi, paket, dış takvim
  seedSessions(x);
  // Motive etmek (ortak 20261027130000): örnek ailenin onaylı görevlerine ebeveyn gözlemi (eskiler zor, yeniler kolay; bazıları yanıtsız)
  if (!x.motivationSeeded) {
    x.completions.filter((c: Row) => c.child_id === 'c-nazli' && c.status === 'approved' && c.motivation == null).forEach((c: Row, i: number) => {
      const age = (Date.now() - Date.parse(c.date)) / 864e5;
      if (i % 4 !== 3) c.motivation = age > 14 ? 3 + (i % 3) : 1 + (i % 2) + (c.task_id === 'k-kitap' ? 2 : 0);
    });
    x.motivationSeeded = true;
  }
  // Karşılama anketi (ortak 20261027100000): hazır örnek uzmanlara sorulmaz; önizlemede yeni kayıt olan uzman görür
  x.clinician_surveys = x.clinician_surveys ?? [];
  x.clinicians.filter((m: Row) => !String(m.id).match(/^[0-9a-f]{8}-/) && !x.clinician_surveys.some((s: Row) => s.clinician_id === m.id))
    .forEach((m: Row) => x.clinician_surveys.push({ clinician_id: m.id, profession: null, challenges: [], features: [], intent: null, skipped: true, updated_at: now() }));
  // Yasal metinler (ortak 20261027200000): hazır örnek uzmanlar ilk sürümü onaylamış sayılır; yeni kayıt kayıt ekranında onaylar.
  // Yeniden onay ekranını görmek için konsolda onizlemeSozlesmeGuncelle()
  x.legal_acceptances = x.legal_acceptances ?? [];
  x.kvkk_requests = x.kvkk_requests ?? [];
  if (!x.legalSeeded) {
    x.clinicians.forEach((m: Row) => ['sozlesme-uzman', 'veri-isleme-eki', 'aydinlatma-uzman'].forEach((k) =>
      x.legal_acceptances.push({ user_id: m.id, doc_key: k, version: 'v1', app: 'clinic', accepted_at: ago(3 * 1440) })));
    x.legalSeeded = true;
  }
  // Önizleme deposu tarayıcıda günlerce kalır: deneme süreleri açılış gününe göre yazıldığı için zamanla "deneme bitti"ye düşüyordu
  // (kullanıcı, 3 Kasım 2026). Önizlemede deneme bitmez; bitmiş deneme yalnız bitti@clinicapp.app hesabında gösterilir.
  x.clinics.forEach((c: Row) => {
    if (c.plan === 'trial' && c.id !== 'demo-clinic-expired' && c.trial_ends_at < new Date(Date.now() + 2 * 864e5).toISOString()) {
      c.trial_ends_at = new Date(Date.now() + 5 * 864e5).toISOString();
    }
  });
  return x;
}

/* ---------- Yasal metinler (ortak hukuk/, 20261027200000_legal.sql): önizlemede taslak sürümler ---------- */

const LEGAL_DOCS: Row[] = [
  { key: 'sozlesme-uzman', title: 'ClinicApp Uzman Hizmet Sözleşmesi', apps: ['clinic'], requires_acceptance: true },
  { key: 'veri-isleme-eki', title: 'Veri İşleme Eki (ClinicApp Uzman Hizmet Sözleşmesi, Ek-1)', apps: ['clinic'], requires_acceptance: true },
  { key: 'aydinlatma-uzman', title: 'ClinicApp Uzman Aydınlatma Metni', apps: ['clinic'], requires_acceptance: true },
  { key: 'gizlilik', title: 'Gizlilik Politikası', apps: ['parent', 'child', 'clinic', 'web'], requires_acceptance: false },
  { key: 'alt-isleyenler', title: 'Hizmet Sağlayıcılar (Alt İşleyenler) Listesi', apps: ['parent', 'child', 'clinic', 'web'], requires_acceptance: false },
  { key: 'kvkk-basvuru', title: 'KVKK Başvuru Usulü', apps: ['parent', 'child', 'clinic', 'web'], requires_acceptance: false },
  { key: 'cerez-clinicapp-web', title: 'ClinicApp Web Çerez Politikası', apps: ['clinic', 'web'], requires_acceptance: false },
];
const LEGAL_V2 = 'demo.legal_v2';   // tarayıcı deposunda '1' → sözleşme v2 (yeniden onay ekranı)
function legalDocs(): Row[] {
  let v2 = false;
  try { v2 = localStorage.getItem(LEGAL_V2) === '1'; } catch { /* yok say */ }
  return LEGAL_DOCS.map((d) => (v2 && d.key === 'sozlesme-uzman'
    ? { ...d, version: 'v2', status: 'draft', summary: 'Örnek: Fesih ve dışa aktarma süresi netleşti (madde 14).' }
    : { ...d, version: 'v1', status: 'draft', summary: null }));
}
function legalFor(uid: string | undefined, app: string): Row[] {
  return legalDocs().filter((d) => d.apps.includes(app)).map((d) => ({
    key: d.key, version: d.version, title: d.title, status: d.status, summary: d.summary, requires_acceptance: d.requires_acceptance,
    published_at: null, accepted_at: db.legal_acceptances.find((a: Row) => a.user_id === uid && a.doc_key === d.key && a.version === d.version)?.accepted_at ?? null,
  }));
}
(globalThis as any).onizlemeSozlesmeGuncelle = () => { try { localStorage.setItem(LEGAL_V2, '1'); } catch { /* yok say */ } location.reload(); };

// Sunucudaki bildirim tetikleyicilerinin (ortak 20261019130000_notifications.sql) önizleme karşılığı. ParentApp önizlemesi
// tetikleyici çalıştırmaz; bu yüzden ClinicApp her eşitlemede uzmana gidecek bildirimleri satırlardan türetir.
function deriveClinicNotifications(x: Db, isOld?: (createdAt: string) => boolean): boolean {
  const seeding = !!isOld;
  const before = x.notifications.length;
  let nextId = x.notifications.reduce((a: number, n: Row) => Math.max(a, Number(n.id) || 0), 0) + 1;
  const has = (kind: string, test: (d: Row) => boolean) => x.notifications.some((n: Row) => n.app === 'clinic' && n.kind === kind && test(n.data ?? {}));
  const name = (childId: string) => x.children.find((c: Row) => c.id === childId)?.name ?? 'Çocuk';
  const push = (user: string, kind: string, title: string, body: string, data: Row, childId: string | null, createdAt: string) => {
    x.notifications.push({ id: nextId++, user_id: user, app: 'clinic', kind, title, body, data, family_id: null, child_id: childId,
      created_at: createdAt, read_at: isOld?.(createdAt) ? createdAt : null });
  };
  // sunucudaki clinic_link_recipients: sorumlu + atananlar; kimse yoksa klinik sahibi
  const recipients = (l: Row) => {
    const r = [...new Set([l.clinician_id, ...(x.clinic_link_access ?? []).filter((a: Row) => a.link_id === l.id).map((a: Row) => a.clinician_id)]
      .filter((id) => id && x.clinicians.some((m: Row) => m.id === id && m.clinic_id === l.clinic_id)))];
    return r.length ? r : x.clinicians.filter((m: Row) => m.clinic_id === l.clinic_id && m.role === 'owner').map((m: Row) => m.id);
  };
  x.clinic_links.forEach((l: Row) => {
    if (!has('clinic_shared', (d) => (d.links ?? []).some((k: Row) => k.link_id === l.id))) {
      recipients(l).forEach((u: string) => push(u, 'clinic_shared', `Yeni paylaşım: ${name(l.child_id)}`,
        `Aile rıza verdi: ${name(l.child_id)}. Görev ve kayıtları artık görebilirsin.`,
        { links: [{ link_id: l.id, child_id: l.child_id }], family_id: l.family_id }, l.child_id, l.consent_at ?? l.created_at));
    }
    const byParent = x.profiles.some((p: Row) => p.id === l.revoked_by && p.family_id === l.family_id);
    if (l.status === 'revoked' && byParent && !has('clinic_revoked', (d) => d.link_id === l.id)) {
      recipients(l).forEach((u: string) => push(u, 'clinic_revoked', `Paylaşım durduruldu: ${name(l.child_id)}`,
        'Aile bu çocuğun paylaşımını sonlandırdı.', { link_id: l.id, child_id: l.child_id }, l.child_id, l.revoked_at ?? now()));
    }
  });
  x.abc_events.forEach((e: Row) => {
    if (has('abc_event', (d) => d.abc_id === e.id || (d.items ?? []).some((k: Row) => k.abc_id === e.id))) return;
    x.clinic_links.filter((l: Row) => l.child_id === e.child_id && l.status === 'active').forEach((l: Row) => {
      recipients(l).forEach((u: string) => push(u, 'abc_event', `Yeni davranış kaydı: ${name(e.child_id)}`,
        `Şiddet ${e.intensity}/5${e.audio_path ? ' · 🎤 sesli kayıt' : ''}`, { abc_id: e.id, child_id: e.child_id }, e.child_id,
        // örnek verinin kayıtları hep "şimdi" eklenmiş: geçmiş olay zamanı kullanılır
        seeding && e.occurred_at < (e.created_at ?? now()) ? e.occurred_at : e.created_at ?? now()));
    });
  });
  x.clinic_task_suggestions.forEach((s: Row) => {
    if (!['accepted', 'declined'].includes(s.status) || has('suggestion_decided', (d) => d.suggestion_id === s.id)) return;
    push(s.created_by, 'suggestion_decided', `${s.status === 'accepted' ? 'Öneri kabul edildi: ' : 'Öneri şimdilik eklenmedi: '}${s.title}`,
      name(s.child_id), { suggestion_id: s.id, child_id: s.child_id }, s.child_id, s.decided_at ?? now());
  });
  return x.notifications.length !== before;
}

let db = load();
// Aynı sayfadaki öteki uygulama yazmış olabilir: her işlemden önce depodan tazele
const sync = () => {
  try { if (localStorage.getItem(KEY)) db = load(); } catch { /* yok say */ }
  if (APP === 'clinic' && deriveClinicNotifications(db)) save();
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
  care_module_goals: ['module_id', 'goal_id'],
};

// Aileye gönderilen sürüm (sunucudaki care_plan_snapshot): hedefte aileye açık olan, programda "Planlandı" olmayan
// hold: bu gönderimde bekletilen hedef/program kimlikleri (ortak care_plan_snapshot_hold); program yalnız gönderilmiş hedefleri anar
function snapshot(x: Db, linkId: string, hold: Set<string> = new Set()) {
  x.clinic_goals.filter((g: Row) => g.link_id === linkId && !hold.has(g.id)).forEach((g: Row) => {
    g.pub = g.shared && !g.archived ? { title: g.title, description: g.description ?? '', domain: g.domain ?? '', measure: g.measure, baseline: g.baseline ?? '',
      target: g.target ?? '', weeks: g.weeks ?? null, home_support: g.home_support ?? '', status: g.status, position: g.position ?? 0 } : null;
  });
  x.care_modules.filter((m: Row) => m.link_id === linkId && !hold.has(m.id)).forEach((m: Row) => {
    const goals = (x.care_module_goals ?? []).filter((c: Row) => c.module_id === m.id).map((c: Row) => c.goal_id)
      .filter((id: string) => x.clinic_goals.some((g: Row) => g.id === id && g.pub));
    m.pub = m.status !== 'planned' ? { title: m.title, aim: m.aim ?? '', practice: m.practice ?? '', checklist: m.checklist ?? [], status: m.status,
      position: m.position ?? 0, goal_ids: goals } : null;
  });
  return x.clinic_goals.filter((g: Row) => g.link_id === linkId && g.pub).length + x.care_modules.filter((m: Row) => m.link_id === linkId && m.pub).length;
}

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
  if (table === 'clinic_goals') {
    db.goal_ratings = db.goal_ratings.filter((r: Row) => !ids.has(r.goal_id));
    db.care_module_goals = db.care_module_goals.filter((r: Row) => !ids.has(r.goal_id));
    db.clinic_task_suggestions.forEach((r: Row) => { if (ids.has(r.goal_id)) r.goal_id = null; });
  }
  if (table === 'care_modules') {
    db.care_module_logs = db.care_module_logs.filter((r: Row) => !ids.has(r.module_id));
    db.care_module_goals = db.care_module_goals.filter((r: Row) => !ids.has(r.module_id));
  }
}

// İlişkili tablo gömme: select('…, children(name)') gibi (PostgREST embed). Sütun seçimi yapılmaz, satır bütün döner.
const EMBEDS: Record<string, Record<string, (r: Row) => any>> = {
  clinic_links: { children: (r) => db.children.find((c: Row) => c.id === r.child_id) ?? null },
  task_assignments: { tasks: (r) => db.tasks.find((t: Row) => t.id === r.task_id) ?? null },
  clinic_task_suggestions: { tasks: (r) => (r.task_id ? db.tasks.find((t: Row) => t.id === r.task_id) ?? null : null) },
  clinic_notes: { clinicians: (r) => db.clinicians.find((m: Row) => m.id === r.author_id) ?? null },
  clinic_goals: { goal_ratings: (r) => db.goal_ratings.filter((g: Row) => g.goal_id === r.id) },
};

function embed(table: string, cols: string, r: Row): Row {
  const rels = EMBEDS[table];
  if (!rels) return r;
  const out = { ...r };
  Object.entries(rels).forEach(([name, get]) => { if (cols.includes(`${name}(`)) out[name] = get(r); });
  return out;
}

function clinicActive(id: string) {
  const c = db.clinics.find((x: Row) => x.id === id);
  return !!c && (['small', 'business', 'custom'].includes(c.plan) || (c.plan === 'trial' && c.trial_ends_at > now())
    || (['solo', 'clinic'].includes(c.plan) && (c.period_end ?? '') > now()));
}
function clinicianAccess(m: Row) {
  const c = db.clinics.find((x: Row) => x.id === m.clinic_id);
  return clinicActive(m.clinic_id) && (m.role === 'owner' || (c?.seat_limit ?? 1) > 1);
}

// Klinik içi atama (ortak 20261022100000): sahip hepsini; üye sorumlusu olduğu ve kendisine atanan paylaşımları görür
function linkVisible(m: Row, l: Row) {
  return !!l && l.clinic_id === m.clinic_id && (m.role === 'owner' || l.clinician_id === m.id
    || db.clinic_link_access.some((a: Row) => a.link_id === l.id && a.clinician_id === m.id));
}

// Uzman oturumunda sunucudaki RLS'nin önizleme karşılığı: yalnız kendi kliniği ve etkin rızalı çocuk
const CLINIC_OWN = ['clinics', 'clinicians', 'clinic_invites', 'clinic_links', 'clinic_notes', 'clinic_goals', 'goal_ratings', 'clinic_task_suggestions', 'clinic_routines'];
const CHILD_SHARED = ['children', 'task_assignments', 'completions', 'abc_events'];
function visible(table: string, r: Row): boolean {
  if (['notifications', 'push_tokens'].includes(table)) return r.user_id === sess()?.user.id;
  if (['user_activity', 'app_events'].includes(table)) return false;
  if (table === 'billing_plans') return r.active;
  const m = myClinician();
  const sv = sessionVisible(table, r, m ?? null, db, linkVisible);
  if (sv !== undefined) return sv && (!m || clinicianAccess(m));
  // Aile: taslak öneriyi, program ↔ hedef tablosunu ve uzman şablonlarını görmez (sunucuda RLS)
  if (!m && table === 'clinic_task_suggestions') return r.status !== 'draft';
  if (!m && ['care_module_goals', 'clinic_plan_templates'].includes(table)) return false;
  if (!m && ['clinic_members', 'clinician_codes', 'clinic_member_requests'].includes(table)) return false;
  if (!m) return true;
  if (table === 'clinician_codes') return false;
  if (table === 'clinic_members') return r.clinician_id === m.id || r.clinic_id === m.clinic_id;
  if (table === 'clinic_member_requests') return r.clinician_id === m.id || (r.clinic_id === m.clinic_id && m.role === 'owner');
  if (table === 'clinicians') return r.id === m.id || db.clinic_members.some((y: Row) => y.clinician_id === r.id && y.clinic_id === m.clinic_id);
  if (table === 'care_module_goals') { const mod = db.care_modules.find((x: Row) => x.id === r.module_id); return r.clinic_id === m.clinic_id && !!mod && (!mod.link_id || linkVisible(m, db.clinic_links.find((l: Row) => l.id === mod.link_id))); }
  if (table === 'clinic_plan_templates') return r.clinic_id === m.clinic_id && (r.shared || r.created_by === m.id || m.role === 'owner');
  // Deneme/üyelik bitince çocuk verisi ve klinik çalışma alanı kapanır (sunucudaki clinician_access)
  if (!clinicianAccess(m) && [...CHILD_SHARED, 'tasks', 'clinic_notes', 'clinic_goals', 'goal_ratings', 'clinic_task_suggestions', 'care_modules', 'care_module_logs'].includes(table)) return false;
  if (table === 'clinic_link_access') return r.clinic_id === m.clinic_id && (m.role === 'owner' || r.clinician_id === m.id);
  const byLink = (id: string) => linkVisible(m, db.clinic_links.find((l: Row) => l.id === id));
  if (table === 'clinic_links') return linkVisible(m, r);
  const myInvite = (code: string) => db.clinic_invites.some((i: Row) => i.code === code && i.clinic_id === m.clinic_id && (i.clinician_id === m.id || m.role === 'owner'));
  if (['clinic_goals', 'care_modules'].includes(table) && r.invite_code) return r.clinic_id === m.clinic_id && myInvite(r.invite_code);
  if (table === 'care_modules') return r.clinic_id === m.clinic_id && byLink(r.link_id);
  if (table === 'care_module_logs') { const mod = db.care_modules.find((x: Row) => x.id === r.module_id); return !!mod && mod.clinic_id === m.clinic_id && byLink(mod.link_id); }
  if (table === 'clinic_invites') return r.clinic_id === m.clinic_id && (r.clinician_id === m.id || m.role === 'owner');
  if (['clinic_notes', 'clinic_goals', 'clinic_task_suggestions'].includes(table)) return r.clinic_id === m.clinic_id && byLink(r.link_id);
  if (table === 'goal_ratings') return r.clinic_id === m.clinic_id && byLink(db.clinic_goals.find((g: Row) => g.id === r.goal_id)?.link_id);
  if (CLINIC_OWN.includes(table)) return (table === 'clinics' ? r.id : r.clinic_id) === m.clinic_id;
  const sees = (childId: string) => db.clinic_links.some((l: Row) => l.child_id === childId && l.status === 'active' && linkVisible(m, l));
  if (CHILD_SHARED.includes(table)) return sees(table === 'children' ? r.id : r.child_id);
  if (table === 'tasks') return db.task_assignments.some((a: Row) => a.task_id === r.id && sees(a.child_id));
  return false; // posta, coin defteri, aile tabloları uzmanla paylaşılmaz
}

// Sunucudaki sütun varsayılanları (yalnız uygulamanın eklerken boş bıraktıkları)
const DEFAULTS: Record<string, Row> = {
  clinic_task_suggestions: { status: 'pending', decided_at: null, task_id: null, updated_at: null, kind: 'new', target_task_id: null, change_remove: false, goal_id: null },
  clinic_plan_templates: { archived: false, shared: false },
  clinic_goals: { link_id: null, invite_code: null, description: '', archived: false, domain: '', measure: 'level', baseline: '', target: '', weeks: null,
    home_support: '', shared: false, status: 'active', position: 0, template_key: null },
  care_modules: { link_id: null, invite_code: null, aim: '', practice: '', checklist: [], position: 0, status: 'planned', template_key: null },
};

class Query implements PromiseLike<{ data: any; error: Err; count?: number }> {
  private filters: ((r: Row) => boolean)[] = [];
  private op: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
  private payload: any;
  private cols = '*';
  private one = false;
  private head = false;
  private conflict?: string[];

  constructor(private table: string) {}

  private selected = false;
  select(cols = '*', opts?: { head?: boolean }) { this.cols = cols; this.selected = true; if (opts?.head) this.head = true; return this; }
  eq(k: string, v: any) { this.filters.push((r) => r[k] === v); return this; }
  match(m: Row) { Object.entries(m).forEach(([k, v]) => this.eq(k, v)); return this; }
  neq(k: string, v: any) { this.filters.push((r) => r[k] !== v); return this; }
  in(k: string, vals: any[]) { this.filters.push((r) => vals.includes(r[k])); return this; }
  gte(k: string, v: any) { this.filters.push((r) => String(r[k] ?? '') >= String(v)); return this; }
  lte(k: string, v: any) { this.filters.push((r) => String(r[k] ?? '') <= String(v)); return this; }
  lt(k: string, v: any) { this.filters.push((r) => String(r[k] ?? '') < String(v)); return this; }
  gt(k: string, v: any) { this.filters.push((r) => String(r[k] ?? '') > String(v)); return this; }
  limit() { return this; }
  not(k: string, op: string, list: any) {
    if (op === 'is') { this.filters.push((r) => (r[k] ?? null) !== list); return this; }
    const vals = String(list).replace(/[()]/g, '').split(',');
    this.filters.push((r) => !vals.includes(String(r[k])));
    return this;
  }
  private sortBy?: { col: string; asc: boolean };
  order(col: string, o?: { ascending?: boolean }) { this.sortBy = { col, asc: o?.ascending !== false }; return this; }
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
      let out = rows.filter(hit).filter((r) => visible(this.table, r)).map((r) => ({ ...r }));
      if (this.table === 'tasks' && this.cols.includes('task_assignments(')) {
        out = out.map((t) => ({ ...t, task_assignments: db.task_assignments.filter((a: Row) => a.task_id === t.id) }));
      }
      out = out.map((r) => embed(this.table, this.cols, r));
      const { col, asc } = this.sortBy ?? { col: 'created_at', asc: true };
      out.sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * (asc ? 1 : -1));
      if (this.head) return { data: null, error: null, count: out.length };
      return { data: this.one ? out[0] ?? null : out, error: null, count: out.length };
    }
    let inserted: Row[] | null = null;
    if (this.op === 'insert' || this.op === 'upsert') {
      const me = myClinician();
      const list: Row[] = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r: Row) => ({
        ...(PK[this.table] ? {} : { id: uuid() }), created_at: now(), ...DEFAULTS[this.table], ...r,
        // sunucuda tetikleyici yazar: şablonun kliniği ve yazarı
        ...(this.table === 'clinic_plan_templates' && me ? { clinic_id: me.clinic_id, created_by: me.id, updated_at: now() } : {}),
      }));
      if (this.table === 'clinic_task_suggestions' && list.some((r) => r.kind === 'change' && db.clinic_task_suggestions.some((x: Row) =>
        x.kind === 'change' && x.target_task_id === r.target_task_id && ['draft', 'pending'].includes(x.status)))) {
        return { data: null, error: { message: 'Bu macera için açık bir değişiklik önerisi var', code: '23505' } };
      }
      inserted = list;
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
    return { data: inserted && this.selected ? inserted.map((r) => ({ ...r })) : null, error: null };
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
const baseClinician = () => db.clinicians.find((m: Row) => m.id === sess()?.user.id);
// Seçili çalışma alanı (x-clinic-id karşılığı): uzman satırı o alanın kimliği ve alandaki rolüyle döner; geçersizse alan yok
const activeMember = (uid: string, cid: string) => db.clinic_members.find((y: Row) => y.clinic_id === cid && y.clinician_id === uid && y.status === 'active');
function myClinician(): Row | undefined {
  const base = baseClinician();
  if (!base) return undefined;
  const ws = getWorkspace();
  const cid = ws || base.clinic_id;
  const mem = activeMember(base.id, cid);
  return mem ? { ...base, clinic_id: cid, role: mem.role } : { ...base, clinic_id: '__yok__', role: 'member', invalid: true };
}

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
    setSess({ user: { id: u.id, email: u.email, user_metadata: u.meta ?? {} }, access_token: 'demo' });
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
        const solo = meta.practice !== 'clinic';
        db.clinics.push({ id: cid, name: String(meta.clinic_name || meta.name || 'Kliniğim'), plan: 'trial', seat_limit: 10, trial_ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
          created_by: id, created_at: now(), personal_of: solo ? id : null, members_can_invite: true });
      }
      db.clinicians.push({ id, clinic_id: cid, name: meta.name ?? '', title: meta.title ?? '', role, created_at: now() });
      db.clinic_members.push({ clinic_id: cid, clinician_id: id, role, status: 'active', invited_by: null, joined_at: now(), left_at: null });
    } else {
      newFamilyFor(id, meta.name ?? '');
    }
    db.users.push({ id, email, password, meta });
    setSess({ user: { id, email, user_metadata: meta }, access_token: 'demo' });
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
const makeCode = (n = 6) => Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

// ---------- Çalışma alanları (ortak proposed/20261105090000_workspaces.sql) önizleme karşılığı
function workspaceRpc(name: string, args: Row, uid: string): { data: any; error: Err } | null {
  const ok = (data: unknown) => ({ data, error: null });
  const bad = (message: string) => ({ data: null, error: { message } as Err });
  const base = baseClinician();
  const m = myClinician();
  const membersOf = (cid: string) => db.clinic_members.filter((y: Row) => y.clinic_id === cid && y.status === 'active');
  const clinicName = (cid: string) => db.clinics.find((c: Row) => c.id === cid)?.name ?? '';
  const personName = (id: string | null) => db.clinicians.find((x: Row) => x.id === id)?.name ?? '';
  const notifyUser = (user: string, kind: string, title: string, body = '', data: Row = {}) => {
    if (user === uid) return;
    db.notifications.push({ id: Date.now() + Math.floor(Math.random() * 1000), user_id: user, app: 'clinic', kind, title, body, data, created_at: now(), read_at: null });
  };
  const endMember = (cid: string, who: string) => {
    const row = activeMember(who, cid);
    if (row) { row.status = 'left'; row.left_at = now(); }
    db.clinic_link_access = db.clinic_link_access.filter((a: Row) => !(a.clinic_id === cid && a.clinician_id === who));
    db.clinic_links.forEach((l: Row) => { if (l.clinic_id === cid && l.clinician_id === who) l.clinician_id = null; });
    db.clinic_invites.forEach((i: Row) => { if (i.clinic_id === cid && i.clinician_id === who && i.kind === 'family' && !i.used_at && !i.revoked_at) i.revoked_at = now(); });
    const person = db.clinicians.find((x: Row) => x.id === who);
    if (person && person.clinic_id === cid) { person.clinic_id = personalFor(who); person.role = 'owner'; }
  };
  const personalFor = (who: string): string => {
    let c = db.clinics.find((x: Row) => x.personal_of === who);
    if (!c) {
      const trial = db.clinics.filter((x: Row) => x.created_by === who).map((x: Row) => x.trial_ends_at).sort().pop();
      c = { id: uuid(), name: personName(who) || 'Bireysel çalışmam', plan: 'trial', seat_limit: 10, personal_of: who, members_can_invite: true,
        trial_ends_at: trial ?? new Date(Date.now() + 7 * 864e5).toISOString(), created_by: who, created_at: now() };
      db.clinics.push(c);
    }
    const row = db.clinic_members.find((y: Row) => y.clinic_id === c.id && y.clinician_id === who);
    if (row) Object.assign(row, { status: 'active', role: 'owner', left_at: null });
    else db.clinic_members.push({ clinic_id: c.id, clinician_id: who, role: 'owner', status: 'active', invited_by: null, joined_at: now(), left_at: null });
    return c.id;
  };
  switch (name) {
    case 'clinician_workspaces': {
      if (!base) return ok([]);
      const rows = db.clinic_members.filter((y: Row) => y.clinician_id === base.id && y.status === 'active').map((y: Row) => {
        const c = db.clinics.find((x: Row) => x.id === y.clinic_id);
        return { clinic_id: c.id, name: c.name, role: y.role, personal: c.personal_of === base.id, active: clinicActive(c.id),
          access: clinicActive(c.id) && (y.role === 'owner' || c.seat_limit > 1), default: c.id === base.clinic_id,
          members: membersOf(c.id).length, joined_at: y.joined_at };
      });
      return ok(rows.sort((a: Row, b: Row) => Number(b.personal) - Number(a.personal) || String(a.joined_at).localeCompare(String(b.joined_at))));
    }
    case 'clinician_personal_workspace': return base ? ok(personalFor(base.id)) : bad('Yalnızca uzman hesabı');
    case 'clinic_workspace_create': {
      if (!base) return bad('Yalnızca uzman hesabı');
      const nm = String(args.p_name ?? '').trim().slice(0, 120);
      if (!nm) return bad('name_required');
      if (db.clinics.filter((x: Row) => x.created_by === base.id && !x.personal_of).length >= 3) return bad('too_many_clinics');
      const trial = db.clinics.filter((x: Row) => x.created_by === base.id).map((x: Row) => x.trial_ends_at).sort().pop();
      const id = uuid();
      db.clinics.push({ id, name: nm, plan: 'trial', seat_limit: 10, members_can_invite: true, trial_ends_at: trial ?? new Date(Date.now() + 7 * 864e5).toISOString(), created_by: base.id, created_at: now() });
      db.clinic_members.push({ clinic_id: id, clinician_id: base.id, role: 'owner', status: 'active', invited_by: null, joined_at: now(), left_at: null });
      return ok(id);
    }
    case 'clinician_personal_code': {
      if (!base) return bad('Yalnızca uzman hesabı');
      let row = db.clinician_codes.find((x: Row) => x.clinician_id === base.id);
      if (row && !args.p_rotate) return ok(row.code);
      let code = makeCode(8);
      while (db.clinician_codes.some((x: Row) => x.code === code)) code = makeCode(8);
      if (row) Object.assign(row, { code, created_at: now() }); else db.clinician_codes.push(row = { clinician_id: base.id, code, created_at: now() });
      return ok(code);
    }
    case 'clinic_member_request': {
      if (!m || m.invalid || m.role !== 'owner') return bad('only_owner');
      const c = db.clinics.find((x: Row) => x.id === m.clinic_id);
      if (c.personal_of) return ok({ error: 'personal_workspace' });
      const k = String(args.p_code ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const target = db.clinician_codes.find((x: Row) => x.code === k);
      if (!target) return ok({ error: 'invalid_code', hint: 'not_found', message: 'Kod bulunamadı.' });
      const person = db.clinicians.find((x: Row) => x.id === target.clinician_id);
      if (person.id === m.id) return ok({ error: 'self' });
      if (activeMember(person.id, c.id)) return ok({ error: 'already_member', name: person.name });
      const open = db.clinic_member_requests.find((q: Row) => q.clinic_id === c.id && q.clinician_id === person.id && q.status === 'pending' && q.expires_at > now());
      if (open) return ok({ status: 'pending', id: open.id, name: person.name, title: person.title, expires_at: open.expires_at });
      const pending = db.clinic_member_requests.filter((q: Row) => q.clinic_id === c.id && q.status === 'pending' && q.expires_at > now()).length;
      if (membersOf(c.id).length + pending >= c.seat_limit) return ok({ error: 'seat_full' });
      const rq = { id: uuid(), clinic_id: c.id, clinician_id: person.id, requested_by: m.id, status: 'pending', created_at: now(),
        expires_at: new Date(Date.now() + 7 * 864e5).toISOString(), decided_at: null };
      db.clinic_member_requests.push(rq);
      notifyUser(person.id, 'team_request', `${c.name} seni ekibine eklemek istiyor`, m.name, { request_id: rq.id });
      return ok({ status: 'sent', id: rq.id, name: person.name, title: person.title, expires_at: rq.expires_at });
    }
    case 'clinic_member_requests_mine':
      return ok(db.clinic_member_requests.filter((q: Row) => q.clinician_id === base?.id && q.status === 'pending' && q.expires_at > now()).map((q: Row) => {
        const by = db.clinicians.find((x: Row) => x.id === q.requested_by);
        return { id: q.id, clinic_id: q.clinic_id, clinic: clinicName(q.clinic_id), by: by?.name ?? '', by_title: by?.title ?? '',
          members: membersOf(q.clinic_id).length, created_at: q.created_at, expires_at: q.expires_at };
      }));
    case 'clinic_member_respond': {
      const q = db.clinic_member_requests.find((x: Row) => x.id === args.p_request && x.clinician_id === base?.id);
      if (!q || q.status !== 'pending' || q.expires_at <= now()) return ok({ error: 'closed' });
      if (!args.p_accept) {
        Object.assign(q, { status: 'declined', decided_at: now() });
        if (q.requested_by) notifyUser(q.requested_by, 'team_request_declined', `${base!.name} ekibe katılma isteğini kabul etmedi`, '', { clinic_id: q.clinic_id });
        return ok({ status: 'declined' });
      }
      const c = db.clinics.find((x: Row) => x.id === q.clinic_id);
      if (membersOf(c.id).length >= c.seat_limit) return ok({ error: 'seat_full' });
      const row = db.clinic_members.find((y: Row) => y.clinic_id === c.id && y.clinician_id === base!.id);
      if (row) Object.assign(row, { status: 'active', left_at: null, joined_at: now(), invited_by: q.requested_by });
      else db.clinic_members.push({ clinic_id: c.id, clinician_id: base!.id, role: 'member', status: 'active', invited_by: q.requested_by, joined_at: now(), left_at: null });
      Object.assign(q, { status: 'accepted', decided_at: now() });
      membersOf(c.id).filter((y: Row) => y.role === 'owner').forEach((y: Row) => notifyUser(y.clinician_id, 'team_joined', `${base!.name} ekibe katıldı`, '', { clinic_id: c.id }));
      return ok({ status: 'accepted', clinic_id: c.id, clinic: c.name });
    }
    case 'clinic_member_request_cancel': {
      if (!m || m.role !== 'owner') return bad('only_owner');
      const q = db.clinic_member_requests.find((x: Row) => x.id === args.p_request && x.clinic_id === m.clinic_id && x.status === 'pending');
      if (q) Object.assign(q, { status: 'cancelled', decided_at: now() });
      return ok(null);
    }
    case 'clinic_team': {
      if (!m || m.invalid) return ok(null);
      const c = db.clinics.find((x: Row) => x.id === m.clinic_id);
      const members = membersOf(c.id).map((y: Row) => {
        const p = db.clinicians.find((x: Row) => x.id === y.clinician_id);
        return { id: p.id, name: p.name, title: p.title, role: y.role, joined_at: y.joined_at, invited_by_name: personName(y.invited_by) || null };
      }).sort((a: Row, b: Row) => Number(a.role !== 'owner') - Number(b.role !== 'owner') || String(a.joined_at).localeCompare(String(b.joined_at)));
      const requests = m.role !== 'owner' ? [] : db.clinic_member_requests
        .filter((q: Row) => q.clinic_id === c.id && q.status === 'pending' && q.expires_at > now())
        .map((q: Row) => { const p = db.clinicians.find((x: Row) => x.id === q.clinician_id); return { id: q.id, name: p?.name ?? '', title: p?.title ?? '', created_at: q.created_at, expires_at: q.expires_at }; });
      return ok({ members, requests, seat_limit: c.seat_limit, members_can_invite: c.members_can_invite !== false, personal: !!c.personal_of });
    }
    case 'clinic_member_remove': {
      if (!m || m.role !== 'owner') return bad('only_owner');
      if (args.p_clinician === m.id) return bad('owner_cannot_leave');
      if (activeMember(args.p_clinician, m.clinic_id)?.role !== 'member') return bad('not_member');
      endMember(m.clinic_id, args.p_clinician);
      notifyUser(args.p_clinician, 'team_removed', `${clinicName(m.clinic_id)} ekibinden çıkarıldın`, 'Bu kliniğin danışanlarını artık görmüyorsun.');
      return ok(null);
    }
    case 'clinic_leave': {
      if (!m || m.invalid) return bad('not_member');
      if (db.clinics.find((x: Row) => x.id === m.clinic_id)?.personal_of) return bad('personal_workspace');
      if (m.role === 'owner') return bad('owner_cannot_leave');
      const cid = m.clinic_id;
      endMember(cid, m.id);
      membersOf(cid).filter((y: Row) => y.role === 'owner').forEach((y: Row) => notifyUser(y.clinician_id, 'team_left', `${m.name} ekipten ayrıldı`, '', { clinic_id: cid }));
      return ok(null);
    }
    case 'clinic_invite_policy_set': {
      if (!m || m.role !== 'owner') return bad('only_owner');
      const c = db.clinics.find((x: Row) => x.id === m.clinic_id);
      c.members_can_invite = args.p_members_can_invite !== false;
      return ok(null);
    }
    case 'clinic_busy_elsewhere': {
      if (!m || m.invalid) return ok([]);
      const from = String(args.p_from), to = String(args.p_to);
      const team = new Set(membersOf(m.clinic_id).map((y: Row) => y.clinician_id));
      return ok((db.clinic_sessions ?? []).filter((s: Row) => s.clinic_id !== m.clinic_id && team.has(s.clinician_id)
          && ['planned', 'offered', 'done'].includes(s.status) && (s.clinician_id === m.id || m.role === 'owner')
          && s.starts_at < to && new Date(Date.parse(s.starts_at) + s.duration_min * 60e3).toISOString() > from)
        .map((s: Row) => ({ clinician_id: s.clinician_id, starts_at: s.starts_at, ends_at: new Date(Date.parse(s.starts_at) + s.duration_min * 60e3).toISOString(),
          clinic: s.clinician_id === m.id ? clinicName(s.clinic_id) : null })));
    }
    default: return null;
  }
}

async function rpc(name: string, args: Row = {}): Promise<{ data: any; error: Err }> {
  await new Promise((r) => setTimeout(r, 120));
  sync();
  const me = myProfile();
  const uid = sess()?.user.id;
  if (!uid) return { data: null, error: { message: 'Önce giriş yapmalısın' } };
  const wsr = workspaceRpc(name, args, uid);
  if (wsr) { save(); return wsr; }
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
  // GameApp (M4) fonksiyonları: yaş bandı, ret + not, coin bakiyesi, cihaz bağlantısı
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
    Object.assign(row, { status: args.p_status, parent_note: args.p_note ?? null, reviewed_at: now(), reviewed_by: uid,
      // ParentApp İnceleme ayrıntısı (ortak 20261027130000): motive etmek 1–5, Güneş Taşı
      motivation: args.p_motivation ?? null, stones: args.p_stones ?? null });
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
    const cm = myClinician();
    if (cm) {
      const others = db.clinicians.filter((x: Row) => x.clinic_id === cm.clinic_id && x.id !== uid)
        .sort((a: Row, b: Row) => String(a.created_at).localeCompare(String(b.created_at)));
      if (!others.length) {
        const k = cm.clinic_id;
        db.clinics = db.clinics.filter((x: Row) => x.id !== k);
        CLINIC_OWN.filter((t) => t !== 'clinics').forEach((t) => { db[t] = db[t].filter((r: Row) => r.clinic_id !== k); });
      } else {
        if (cm.role === 'owner') others[0].role = 'owner';
        db.clinic_links.forEach((l: Row) => { if (l.clinician_id === uid) l.clinician_id = cm.role === 'owner' ? others[0].id : null; });
        db.clinicians = db.clinicians.filter((x: Row) => x.id !== uid);
      }
    }
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
  const openInvite = (code: string, kind: string) =>
    db.clinic_invites.find((i: Row) => i.code === String(code ?? '').trim().toUpperCase() && i.kind === kind && !i.used_at && i.expires_at > now());
  if (name === 'clinician_me') {
    const m = myClinician();
    if (!m) return { data: null, error: null };
    if (m.invalid) return { data: { id: m.id, name: m.name, title: m.title, workspace_invalid: true, access: false }, error: null };
    const c = db.clinics.find((x: Row) => x.id === m.clinic_id);
    const ownerId = db.clinic_members.find((y: Row) => y.clinic_id === c.id && y.role === 'owner' && y.status === 'active')?.clinician_id;
    const owner = db.clinicians.find((o: Row) => o.id === ownerId);
    const used = db.clinic_invites.filter((v: Row) => v.used_by === m.id && v.kind === 'clinician' && v.clinic_id === c.id)
      .sort((a: Row, b: Row) => String(b.used_at).localeCompare(String(a.used_at)))[0];
    const memRow = activeMember(m.id, c.id);
    const inviter = db.clinicians.find((o: Row) => o.id === (memRow?.invited_by ?? used?.clinician_id));
    return { data: { id: m.id, name: m.name, title: m.title, role: m.role, clinic_id: c.id, clinic: c.name, plan: c.plan, seat_limit: c.seat_limit,
      trial_ends_at: c.trial_ends_at, active: clinicActive(c.id), joined_at: memRow?.joined_at ?? m.created_at, owner_name: owner?.name ?? null, invited_by_name: inviter?.name ?? null,
      access: clinicianAccess(m),
      status: c.plan === 'trial' && c.trial_ends_at > now() ? 'trial' : clinicActive(c.id) ? 'active' : 'expired',
      billing_period: c.billing_period ?? null, period_end: c.period_end ?? null, billing_source: c.billing_source ?? null,
      auto_renew: !!c.auto_renew, member_count: db.clinic_members.filter((x: Row) => x.clinic_id === c.id && x.status === 'active').length,
      personal: c.personal_of === m.id, members_can_invite: c.members_can_invite !== false, default_clinic_id: baseClinician()?.clinic_id,
      workspace_invalid: false, workspaces: db.clinic_members.filter((x: Row) => x.clinician_id === m.id && x.status === 'active').length,
      has_personal: db.clinics.some((x: Row) => x.personal_of === m.id),
      requests: db.clinic_member_requests.filter((q: Row) => q.clinician_id === m.id && q.status === 'pending' && q.expires_at > now()).length }, error: null };
  }
  if (name === 'clinic_join_team') {
    const m = myClinician();
    if (!m) return err('Yalnızca uzman hesabı ekibe katılabilir');
    const inv = openInvite(args.p_code, 'clinician');
    if (!inv) return err('Ekip kodu geçersiz ya da süresi dolmuş');
    if (inv.clinic_id === m.clinic_id) return err('Zaten bu kliniğin ekibindesin');
    const target = db.clinics.find((x: Row) => x.id === inv.clinic_id);
    if (db.clinicians.filter((x: Row) => x.clinic_id === inv.clinic_id).length >= target.seat_limit) return err('Kliniğin uzman koltuğu dolu');
    const old = m.clinic_id;
    if (db.clinicians.some((x: Row) => x.clinic_id === old && x.id !== m.id) || db.clinic_links.some((l: Row) => l.clinic_id === old)
      || db.clinic_notes.some((n: Row) => n.clinic_id === old) || db.clinic_goals.some((g: Row) => g.clinic_id === old)) {
      return err('Mevcut kliniğinde danışan, not ya da başka uzman var; katılırsan kaybolur. Başka bir e-postayla kayıt olup ekip koduyla katıl.');
    }
    Object.assign(m, { clinic_id: inv.clinic_id, role: 'member' });
    inv.used_at = now(); inv.used_by = uid;
    db.clinic_invites = db.clinic_invites.filter((v: Row) => v.clinic_id !== old);
    db.clinics = db.clinics.filter((x: Row) => x.id !== old);
    save();
    return { data: { clinic_id: inv.clinic_id }, error: null };
  }
  if (name === 'mark_notifications_read') {
    let n = 0;
    db.notifications.forEach((r: Row) => {
      if (r.user_id === uid && !r.read_at && (!args.p_ids || args.p_ids.includes(r.id))) { r.read_at = now(); n += 1; }
    });
    save();
    return { data: n, error: null };
  }
  if (name === 'register_push_token' || name === 'unregister_push_token') return { data: null, error: null };
  // Uzaktan uygulama ayarı: önizlemede yalnız değişiklik önerisi açık (denemek için tarayıcı deposuna 'demo.client_config' JSON yazılabilir)
  if (name === 'client_config') {
    let v: Row = { app: {}, flags: { plan_change_suggestions: true } };
    try { v = JSON.parse(localStorage.getItem('demo.client_config') || 'null') ?? v; } catch {}
    return { data: v, error: null };
  }
  if (name === 'track_session') {
    const row = db.user_activity.find((a: Row) => a.user_id === uid && a.app === args.p_app);
    if (row) Object.assign(row, { last_seen_at: now(), sessions: row.sessions + 1 });
    else db.user_activity.push({ user_id: uid, app: args.p_app, first_seen_at: now(), last_seen_at: now(), sessions: 1, active_days: 1, platform: args.p_platform, app_version: args.p_version });
    save();
    return { data: null, error: null };
  }
  if (name === 'track_events') {
    // Önizlemede yalnız son 200 olay tutulur (tarayıcı deposu sınırlı)
    (args.p_events ?? []).forEach((e: Row) => db.app_events.push({ user_id: uid, app: args.p_app, event: e.event, props: e.props ?? {}, created_at: now() }));
    db.app_events = db.app_events.slice(-200);
    save();
    return { data: (args.p_events ?? []).length, error: null };
  }
  if (name === 'clinic_create_invite') {
    const m = myClinician();
    if (!m) return err('Yalnızca uzman hesabı');
    if (!clinicianAccess(m)) return err('Üyelik etkin değil');
    if (args.p_kind === 'clinician' && m.role !== 'owner') return err('Ekibe yalnızca klinik sahibi davet eder');
    if (args.p_kind !== 'clinician' && m.role !== 'owner' && db.clinics.find((x: Row) => x.id === m.clinic_id)?.members_can_invite === false) return err('invite_owner_only');
    const team = args.p_kind === 'clinician';
    if (team && db.clinics.find((x: Row) => x.id === m.clinic_id)?.seat_limit <= 1) return err('Bireysel pakette ekip yok; Klinik paketine geçin');
    let code = makeCode(team ? 8 : 6);
    while (db.clinic_invites.some((i: Row) => i.code === code)) code = makeCode(team ? 8 : 6);
    const token = team ? null : uuid().replace(/-/g, '');
    const row = { code, clinic_id: m.clinic_id, clinician_id: m.id, kind: args.p_kind ?? 'family', label: String(args.p_label ?? '').slice(0, 60),
      created_at: now(), expires_at: new Date(Date.now() + (team ? 15 * 60e3 : 72 * 3600e3)).toISOString(), used_at: null, used_by: null,
      token, parent_name: String(args.p_parent_name ?? '').trim().slice(0, 60), parent_email: (String(args.p_parent_email ?? '').trim().toLowerCase() || null),
      channel: null, opened_at: null, claimed_at: null, claimed_family: null, expired_notified_at: null, revoked_at: null,
      child_name: team ? null : (String(args.p_child_name ?? '').trim().slice(0, 40) || null),
      child_age_group: team ? null : (['K', 'A', 'B', 'C'].includes(String(args.p_child_age_group)) ? args.p_child_age_group : null) };
    db.clinic_invites.push(row);
    save();
    return { data: { code, token, expires_at: row.expires_at }, error: null };
  }
  // Aile davet bağlantısı (ortak 20261026100000)
  const inviteStatus = (i: Row) => (i.revoked_at ? 'revoked' : i.used_at ? 'shared' : i.claimed_at ? 'claimed' : i.expires_at <= now() ? 'expired' : i.opened_at ? 'opened' : 'sent');
  const myInvites = (m: Row) => db.clinic_invites.filter((i: Row) => i.kind === 'family' && i.clinic_id === m.clinic_id && (i.clinician_id === m.id || m.role === 'owner'));
  const hasPlan = (code: string) => db.clinic_goals.some((g: Row) => g.invite_code === code) || db.care_modules.some((x: Row) => x.invite_code === code);
  if (name === 'clinic_invite_mark') {
    const m = myClinician();
    const inv = m && myInvites(m).find((i: Row) => i.code === args.p_code);
    if (!inv) return err('Davet bulunamadı');
    if (args.p_revoke) {
      if (inv.used_at) return err('Kullanılmış davet iptal edilemez');
      inv.revoked_at = inv.revoked_at ?? now();
      inv.child_name = null;
      inv.child_age_group = null;
      db.clinic_goals = db.clinic_goals.filter((g: Row) => g.invite_code !== inv.code);
      db.care_modules = db.care_modules.filter((x: Row) => x.invite_code !== inv.code);
    } else if (args.p_channel) inv.channel = args.p_channel;
    save();
    return { data: null, error: null };
  }
  if (name === 'clinic_invites_list') {
    const m = myClinician();
    if (!m) return { data: [], error: null };
    const since = new Date(Date.now() - (args.p_days ?? 90) * 864e5).toISOString();
    return { data: myInvites(m).filter((i: Row) => i.created_at > since).sort((a: Row, b: Row) => b.created_at.localeCompare(a.created_at)).map((i: Row) => ({
      code: i.code, token: !i.used_at && !i.revoked_at ? i.token ?? null : null, clinician_id: i.clinician_id,
      clinician: db.clinicians.find((x: Row) => x.id === i.clinician_id)?.name ?? '', label: i.label ?? '', parent_name: i.parent_name ?? '',
      parent_email: i.parent_email ?? null, channel: i.channel ?? null, status: inviteStatus(i), created_at: i.created_at, expires_at: i.expires_at,
      opened_at: i.opened_at ?? null, claimed_at: i.claimed_at ?? null, used_at: i.used_at, has_plan: hasPlan(i.code),
      child_name: i.child_name ?? null, child_age_group: i.child_age_group ?? null,
      email_status: i.email_status ?? null, email_count: i.email_count ?? 0, email_sent_at: i.email_sent_at ?? null })), error: null };
  }
  if (name === 'clinic_invite_stats') {
    const m = myClinician();
    if (!m) return { data: [], error: null };
    const since = new Date(Date.now() - (args.p_days ?? 30) * 864e5).toISOString();
    return { data: db.clinicians.filter((x: Row) => x.clinic_id === m.clinic_id && (x.id === m.id || m.role === 'owner')).map((x: Row) => {
      const l = db.clinic_invites.filter((i: Row) => i.kind === 'family' && i.clinician_id === x.id && i.created_at > since);
      return { clinician_id: x.id, clinician: x.name, sent: l.length, opened: l.filter((i: Row) => i.opened_at).length,
        claimed: l.filter((i: Row) => i.claimed_at || i.used_at).length, shared: l.filter((i: Row) => i.used_at).length,
        expired: l.filter((i: Row) => inviteStatus(i) === 'expired').length, open_now: l.filter((i: Row) => ['sent', 'opened', 'claimed'].includes(inviteStatus(i))).length };
    }), error: null };
  }
  if (name === 'clinic_invites_sweep') {
    const m = myClinician();
    if (!m) return { data: 0, error: null };
    let n = 0;
    db.clinic_invites.filter((i: Row) => i.kind === 'family' && i.clinic_id === m.clinic_id && i.expires_at <= now() && !i.claimed_at && !i.used_at && !i.revoked_at && !i.expired_notified_at)
      .forEach((i: Row) => {
        i.expired_notified_at = now();
        const nid = db.notifications.reduce((a: number, x: Row) => Math.max(a, Number(x.id) || 0), 0) + 1;
        db.notifications.push({ id: nid, user_id: i.clinician_id, app: 'clinic', kind: 'invite_expired', title: 'Davetin kullanılmadı, süresi doldu',
          body: `${i.label || i.parent_name ? (i.label || i.parent_name) + ' · ' : ''}İstersen yeni bir davet gönder.`, data: { code: i.code }, family_id: null, child_id: null, created_at: now(), read_at: null });
        n += 1;
      });
    save();
    return { data: n, error: null };
  }
  // Belge incelemesi (ortak 20261026050000): önizlemede tarayıcı deposunda; onay için konsolda onizlemeBelgeOnayla()
  if (name === 'clinician_verification_me') return { data: demoVerification(), error: null };
  // Karşılama anketi (ortak 20261027100000)
  if (name === 'clinician_survey_me') {
    const s = db.clinician_surveys.find((r: Row) => r.clinician_id === sess()?.user.id);
    return { data: s ? { profession: s.profession, challenges: s.challenges, features: s.features, intent: s.intent, skipped: s.skipped } : null, error: null };
  }
  // Yasal metinler ve KVKK başvurusu (ortak 20261027200000)
  if (name === 'legal_documents_for') return { data: legalFor(sess()?.user.id, args.p_app), error: null };
  if (name === 'legal_pending') {
    return { data: legalFor(sess()?.user.id, args.p_app).filter((d) => d.requires_acceptance && !d.accepted_at), error: null };
  }
  if (name === 'legal_accept') {
    const uid = sess()?.user.id;
    const cur = legalFor(uid, args.p_app);
    for (const x of args.p_docs ?? []) {
      if (!cur.some((d) => d.key === x.key && d.version === x.version && d.requires_acceptance)) return err(`Metin güncel değil: ${x.key} ${x.version}`);
      if (!db.legal_acceptances.some((a: Row) => a.user_id === uid && a.doc_key === x.key && a.version === x.version)) {
        db.legal_acceptances.push({ user_id: uid, doc_key: x.key, version: x.version, app: args.p_app, accepted_at: now() });
      }
    }
    save();
    return { data: legalFor(uid, args.p_app).filter((d) => d.requires_acceptance && !d.accepted_at), error: null };
  }
  if (name === 'kvkk_request_create') {
    const uid = sess()?.user.id;
    if (['correct', 'object', 'damages', 'other'].includes(args.p_kind) && String(args.p_detail ?? '').trim().length < 5) return err('Talebini kısaca yaz');
    if (db.kvkk_requests.filter((r: Row) => r.user_id === uid && ['received', 'in_progress'].includes(r.status)).length >= 5) {
      return err('Açık başvurun var; yanıtlanınca yenisini gönderebilirsin');
    }
    const r = { id: uuid(), user_id: uid, app: args.p_app, kind: args.p_kind, detail: args.p_detail ?? '', status: 'received', received_at: now(),
      due_at: new Date(Date.now() + 30 * 864e5).toISOString(), answered_at: null };
    db.kvkk_requests.push(r);
    save();
    return { data: { id: r.id, status: r.status, received_at: r.received_at, due_at: r.due_at }, error: null };
  }
  if (name === 'my_kvkk_requests') {
    return { data: db.kvkk_requests.filter((r: Row) => r.user_id === sess()?.user.id)
      .sort((a: Row, b: Row) => (a.received_at < b.received_at ? 1 : -1))
      .map(({ id, app, kind, status, received_at, due_at, answered_at }: Row) => ({ id, app, kind, child_id: null, status, received_at, due_at, answered_at })), error: null };
  }
  if (name === 'clinician_survey_save') {
    const uid = sess()?.user.id;
    if (!db.clinicians.some((m: Row) => m.id === uid)) return err('Yalnızca uzman hesabı');
    db.clinician_surveys = db.clinician_surveys.filter((r: Row) => r.clinician_id !== uid);
    db.clinician_surveys.push({ clinician_id: uid, profession: args.p_profession ?? null, challenges: args.p_challenges ?? [], features: args.p_features ?? [],
      intent: args.p_intent ?? null, skipped: !!args.p_skipped, updated_at: now() });
    save();
    return { data: null, error: null };
  }
  if (name === 'clinician_verification_start') {
    const v = demoVerification();
    if (!args.p_profession) return err('Meslek seç');
    if (args.p_profession === 'bcba' && !args.p_bacb_number) return err('BACB sicil numarasını yaz');
    const id = uuid();
    v.last = { id, profession: args.p_profession, status: 'pending', reason: null, note: null, submitted: false, checked: false,
      created_at: now(), decided_at: null };
    saveVerification(v);
    return { data: { id, upload_path: `${sess()?.user.id}/${id}.pdf` }, error: null };
  }
  if (name === 'clinician_verification_submit') {
    const v = demoVerification();
    if (!v.last || v.last.id !== args.p_id) return err('Başvuru bulunamadı');
    v.last.submitted = true;
    saveVerification(v);
    return { data: null, error: null };
  }
  // Önceki uzmandan devralınan kayıtlar: önizlemede boş (denemek için tarayıcı deposuna 'demo.inherited' JSON yazılabilir)
  if (name === 'clinic_inherited_records') {
    let v: unknown = [];
    try { v = JSON.parse(localStorage.getItem('demo.inherited') || 'null') ?? v; } catch {}
    return { data: v, error: null };
  }
  // Tek gönderim (ortak migrations/20261102100000): plan anlık görüntüsü + taslak öneriler bekleyen; aileye tek bildirim
  if (name === 'care_plan_publish_selected') {
    const l = db.clinic_links.find((x: Row) => x.id === args.p_link_id);
    if (!l) return err('Paylaşım bulunamadı');
    const hold = new Set<string>((args.p_hold as string[] | null) ?? []);
    const pubs = () => JSON.stringify([...db.clinic_goals, ...db.care_modules].filter((r: Row) => r.link_id === l.id).map((r: Row) => [r.id, r.pub ?? null]));
    const was = pubs();
    const n = snapshot(db, l.id, hold);
    const changed = pubs() !== was;
    const drafts = db.clinic_task_suggestions.filter((s: Row) => s.link_id === l.id && s.status === 'draft' && !hold.has(s.id));
    const k = drafts.filter((s: Row) => s.kind !== 'change').length;
    const ch = drafts.length - k;
    drafts.forEach((s: Row) => { s.status = 'pending'; s.updated_at = now(); });
    if (!n && !drafts.length && !changed) return err('Aileye gösterilecek bir şey yok: "Aile görür" açık bir hedef, etkin bir program ya da bir öneri ekle');
    if (drafts.length || (changed && n)) {
      const child = db.children.find((c: Row) => c.id === l.child_id)?.name ?? '';
      const body = [changed ? 'Hedefler ve aile programı' : '', k ? `${k} macera önerisi` : '', ch ? `${ch} değişiklik önerisi` : ''].filter(Boolean).join(' · ');
      db.profiles.filter((p: Row) => p.family_id === l.family_id).forEach((p: Row) => {
        const nid = db.notifications.reduce((a: number, x: Row) => Math.max(a, Number(x.id) || 0), 0) + 1;
        db.notifications.push({ id: nid, user_id: p.id, app: 'parent', kind: changed ? 'care_plan_shared' : 'clinic_suggestion',
          title: changed ? `Takip planı güncellendi: ${child}` : `Uzmanın ${child} için öneri gönderdi`,
          body: `${body} Uzmanım bölümünde.`, data: { link_id: l.id }, family_id: l.family_id, child_id: l.child_id, created_at: now(), read_at: null });
      });
    }
    l.plan_published_at = now();
    save();
    return { data: null, error: null };
  }
  if (name === 'care_plan_publish') {
    const l = db.clinic_links.find((x: Row) => x.id === args.p_link_id);
    if (!l) return err('Paylaşım bulunamadı');
    const before = db.clinic_goals.filter((g: Row) => g.link_id === l.id && g.pub).length + db.care_modules.filter((m: Row) => m.link_id === l.id && m.pub).length;
    const n = snapshot(db, l.id);
    const drafts = db.clinic_task_suggestions.filter((s: Row) => s.link_id === l.id && s.status === 'draft');
    const k = drafts.filter((s: Row) => s.kind !== 'change').length;
    const ch = drafts.length - k;
    drafts.forEach((s: Row) => { s.status = 'pending'; s.updated_at = now(); });
    if (!n && !before && !drafts.length) return err('Aileye gösterilecek bir şey yok: "Aile görür" açık bir hedef, etkin bir program ya da bir öneri ekle');
    const child = db.children.find((c: Row) => c.id === l.child_id)?.name ?? '';
    const body = [n ? 'Hedefler ve aile programı' : '', k ? `${k} macera önerisi` : '', ch ? `${ch} değişiklik önerisi` : ''].filter(Boolean).join(' · ');
    db.profiles.filter((p: Row) => p.family_id === l.family_id).forEach((p: Row) => {
      const nid = db.notifications.reduce((a: number, x: Row) => Math.max(a, Number(x.id) || 0), 0) + 1;
      db.notifications.push({ id: nid, user_id: p.id, app: 'parent', kind: n || !drafts.length ? 'care_plan_shared' : 'clinic_suggestion',
        title: n ? `Takip planı güncellendi: ${child}` : `Uzmanın ${child} için öneri gönderdi`,
        body: `${body || 'Uzmanının hedefleri ve aile programı'} Uzmanım bölümünde.`, data: { link_id: l.id }, family_id: l.family_id, child_id: l.child_id, created_at: now(), read_at: null });
    });
    l.plan_published_at = now();
    save();
    return { data: null, error: null };
  }
  if (name === 'clinic_set_suggestion_goal') {
    const m = myClinician();
    const ids: string[] = args.p_ids ?? [];
    const rows = db.clinic_task_suggestions.filter((x: Row) => ids.includes(x.id));
    if (!m || rows.length !== ids.length || rows.some((x: Row) => x.clinic_id !== m.clinic_id)) return err('Öneri bulunamadı');
    if (args.p_goal_id && rows.some((x: Row) => !db.clinic_goals.some((g: Row) => g.id === args.p_goal_id && g.link_id === x.link_id))) {
      return err('Hedef bu danışanın takip planında değil');
    }
    rows.forEach((x: Row) => { x.goal_id = args.p_goal_id ?? null; });
    save();
    return { data: rows.length, error: null };
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
      && ((me?.family_id && x.family_id === me.family_id) || (m && linkVisible(m, x))));
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
  // ortak clinic_attention_summary (veritabani.md 23): dikkat panosu için sayılar
  if (name === 'clinic_attention_summary') {
    const m = myClinician();
    if (!m || !clinicianAccess(m)) return { data: [], error: null };
    const t = Date.now();
    const since = t - 7 * 86400000;
    const ms = (v: unknown) => (v ? Date.parse(String(v)) : 0);
    const maxIso = (xs: unknown[]) => { const v = Math.max(0, ...xs.map(ms)); return v ? new Date(v).toISOString() : null; };
    const istToday = new Date(t + 3 * 3600000).toISOString().slice(0, 10);
    const addD = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
    const rows = db.clinic_links.filter((l: Row) => l.status === 'active' && linkVisible(m, l)).map((l: Row) => {
      const comps = db.completions.filter((c: Row) => c.child_id === l.child_id);
      const compAt = (c: Row) => Math.max(ms(c.created_at), ms(c.child_done_at), ms(c.reviewed_at));
      const abc = db.abc_events.filter((e: Row) => e.child_id === l.child_id);
      const mods = db.care_modules.filter((x: Row) => x.link_id === l.id);
      const logs = db.care_module_logs.filter((g: Row) => mods.some((x: Row) => x.id === g.module_id));
      const sug = db.clinic_task_suggestions.filter((x: Row) => x.link_id === l.id);
      const decided = sug.filter((x: Row) => x.status === 'accepted' || x.status === 'declined');
      const goals = db.clinic_goals.filter((g: Row) => g.link_id === l.id);
      const goalWant = (g: Row) => (g.shared && !g.archived ? { title: g.title, description: g.description ?? '', domain: g.domain ?? '', measure: g.measure,
        baseline: g.baseline ?? '', target: g.target ?? '', weeks: g.weeks ?? null, home_support: g.home_support ?? '', status: g.status, position: g.position ?? 0 } : null);
      const modWant = (x: Row) => (x.status !== 'planned' ? { title: x.title, aim: x.aim ?? '', practice: x.practice ?? '', checklist: x.checklist ?? [], status: x.status,
        position: x.position ?? 0, goal_ids: (db.care_module_goals ?? []).filter((c: Row) => c.module_id === x.id).map((c: Row) => c.goal_id)
          .filter((id: string) => db.clinic_goals.some((g: Row) => g.id === id && g.pub)) } : null);
      const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
      const active = goals.filter((g: Row) => g.status === 'active' && !g.archived);
      const due = active.filter((g: Row) => {
        const start = String(g.created_at).slice(0, 10);
        const last = db.goal_ratings.filter((r: Row) => r.goal_id === g.id).map((r: Row) => String(r.week)).sort().pop();
        if ((last ?? start) <= addD(istToday, -28)) return true;
        if (g.weeks) { const end = addD(start, g.weeks * 7); if (istToday >= end && (!last || last < addD(end, -7))) return true; }
        return false;
      }).length;
      return {
        link_id: l.id,
        last_family_at: maxIso([...comps.map((c: Row) => new Date(compAt(c)).toISOString()), ...abc.map((e: Row) => e.created_at),
          ...logs.map((g: Row) => g.created_at), ...decided.map((x: Row) => x.decided_at)]),
        done_7d: comps.filter((c: Row) => Math.max(ms(c.child_done_at || c.created_at), ms(c.reviewed_at || c.created_at)) >= since).length,
        abc_7d: abc.filter((e: Row) => ms(e.created_at) >= since).length, abc_last_at: maxIso(abc.map((e: Row) => e.created_at)),
        logs_7d: logs.filter((g: Row) => ms(g.created_at) >= since).length,
        decided_7d: decided.filter((x: Row) => ms(x.decided_at) >= since).length, decided_last_at: maxIso(decided.map((x: Row) => x.decided_at)),
        pending: sug.filter((x: Row) => x.status === 'pending').length,
        drafts: new Set(sug.filter((x: Row) => x.status === 'draft').map((x: Row) => x.routine_group ?? x.id)).size,
        plan_unsent: goals.filter((g: Row) => !same(goalWant(g), g.pub)).length + mods.filter((x: Row) => !same(modWant(x), x.pub)).length,
        goals_active: active.length, review_due: due, plan_published_at: l.plan_published_at ?? null,
      };
    });
    return { data: rows, error: null };
  }
  if (name === 'clinic_clients') {
    const m = myClinician();
    if (!m || !clinicianAccess(m)) return { data: [], error: null };
    const rows = db.clinic_links.filter((l: Row) => l.status === 'active' && linkVisible(m, l)).map((l: Row) => {
      const c = db.children.find((x: Row) => x.id === l.child_id);
      const parents = db.profiles.filter((p: Row) => p.family_id === l.family_id)
        .sort((a: Row, b: Row) => String(a.created_at).localeCompare(String(b.created_at)))
        .map((p: Row) => String(p.name ?? '').trim() || p.nickname).join(', ');
      return { link_id: l.id, clinic_id: l.clinic_id, family_id: l.family_id, child_id: l.child_id, child_name: c?.name ?? '',
        avatar: c?.avatar ?? null, birthday: c?.birthday ?? null, label: l.label, consent_at: l.consent_at, parents,
        clinician_id: l.clinician_id ?? null, clinician_name: db.clinicians.find((x: Row) => x.id === l.clinician_id)?.name ?? '',
        assigned: db.clinic_link_access.filter((a: Row) => a.link_id === l.id).map((a: Row) => a.clinician_id) };
    }).sort((a: Row, b: Row) => String(b.consent_at).localeCompare(String(a.consent_at)));
    return { data: rows, error: null };
  }
  if (name === 'clinic_assign' || name === 'clinic_set_responsible') {
    const m = myClinician();
    if (!m || m.role !== 'owner') return err('Danışanı yalnız klinik sahibi atar');
    const l = db.clinic_links.find((x: Row) => x.id === args.p_link_id && x.clinic_id === m.clinic_id && x.status === 'active');
    if (!l) return err('Paylaşım bulunamadı');
    if (!db.clinicians.some((x: Row) => x.id === args.p_clinician_id && x.clinic_id === m.clinic_id)) return err('Uzman bu kliniğin ekibinde değil');
    db.clinic_link_access = db.clinic_link_access.filter((a: Row) => !(a.link_id === l.id && a.clinician_id === args.p_clinician_id));
    if (name === 'clinic_set_responsible') l.clinician_id = args.p_clinician_id;
    else if (args.p_assigned) {
      db.clinic_link_access.push({ link_id: l.id, clinician_id: args.p_clinician_id, clinic_id: l.clinic_id, granted_by: m.id, created_at: now() });
      const nid = db.notifications.reduce((a: number, n: Row) => Math.max(a, Number(n.id) || 0), 0) + 1;
      const child = db.children.find((c: Row) => c.id === l.child_id)?.name ?? 'Çocuk';
      db.notifications.push({ id: nid, user_id: args.p_clinician_id, app: 'clinic', kind: 'client_assigned', title: `Yeni danışan atandı: ${child}`,
        body: 'Klinik sahibi bu danışanı sana atadı.', data: { link_id: l.id, child_id: l.child_id }, family_id: null, child_id: l.child_id, created_at: now(), read_at: null });
    }
    save();
    return { data: null, error: null };
  }
  if (name === 'clinic_update_suggestion') {
    const m = myClinician();
    const s = db.clinic_task_suggestions.find((x: Row) => x.id === args.p_id && m && x.clinic_id === m.clinic_id);
    if (!s) return err('Öneri bulunamadı');
    if (s.status !== 'pending' && s.status !== 'draft') return err('Ebeveyn karar verdi; öneri artık değiştirilemez');
    if (!db.clinic_links.some((l: Row) => l.id === s.link_id && l.status === 'active')) return err('Paylaşım sona ermiş');
    const p = { ...(args.p ?? {}) };
    if (s.kind !== 'change') delete p.change_remove;
    Object.assign(s, p, { updated_at: now() });
    save();
    return { data: null, error: null };
  }
  {
    const sr = sessionRpc(name, args, { db, me: myClinician() ?? null, uid, linkVisible, save,
      notify: (u, app, kind, title, body, data, childId) => {
        const nid = db.notifications.reduce((acc: number, n: Row) => Math.max(acc, Number(n.id) || 0), 0) + 1;
        db.notifications.push({ id: nid, user_id: u, app, kind, title, body, data, family_id: null, child_id: childId ?? null, created_at: now(), read_at: null });
      } });
    if (sr) {
      if (sr.error) return sr;
      return sr;
    }
  }
  if (name === 'family_premium') {
    const fid = args.p_family_id ?? me?.family_id;
    const own = db.family_subscriptions.some((s: Row) => s.family_id === fid && s.plan === 'premium');
    return { data: own || db.clinic_links.some((l: Row) => l.family_id === fid && l.status === 'active' && clinicActive(l.clinic_id)), error: null };
  }
  return { data: null, error: null };
}

/* ---------- Belge incelemesi (önizleme: tarayıcı deposu, gerçek belge okunmaz) ---------- */

const VKEY = 'demo.verification';
// Görünürlük bayrağı önizlemede de kapalı; açmak için demo.client_config içinde flags.clinician_verification = true
function demoVerification(): Row {
  let enabled = false;
  try { enabled = JSON.parse(localStorage.getItem('demo.client_config') || '{}')?.flags?.clinician_verification === true; } catch { /* yok say */ }
  try { return { ...(JSON.parse(localStorage.getItem(VKEY) || 'null') ?? { verified_profession: null, verified_label: null, verified_at: null, last: null }), enabled }; }
  catch { return { enabled, verified_profession: null, verified_label: null, verified_at: null, last: null }; }
}
function saveVerification(v: Row) { try { localStorage.setItem(VKEY, JSON.stringify(v)); } catch { /* yok say */ } }
(globalThis as any).onizlemeBelgeOnayla = () => {
  const v = demoVerification();
  const labels: Record<string, string> = { psikolog: 'Psikolog', klinik_psikolog: 'Klinik psikolog', ergoterapist: 'Ergoterapist' };
  Object.assign(v, { verified_profession: v.last?.profession ?? 'psikolog', verified_label: labels[v.last?.profession] ?? 'Psikolog', verified_at: now() });
  if (v.last) v.last.status = 'approved';
  saveVerification(v);
};

/* ---------- Edge Function: clinic-billing (önizlemede gerçek ödeme yok) ---------- */

const functions = {
  async invoke(name: string, opts?: { body?: Row }) {
    await new Promise((r) => setTimeout(r, 300));
    // Yasal metin listesi (Edge Function legal, oturumsuz)
    if (name === 'legal?format=json') {
      return { data: legalDocs().map(({ key, version, title, status, apps }) => ({ key, version, title, status, apps })), error: null };
    }
    // Davet e-postası (ortak invite-email): önizlemede e-posta gitmez, gönderilmiş sayılır
    if (name === 'invite-email') {
      const m = db.clinicians.find((x: Row) => x.id === sess()?.user.id);
      const inv = m && db.clinic_invites.find((i: Row) => i.code === opts?.body?.code && i.kind === 'family' && i.clinic_id === m.clinic_id
        && (i.clinician_id === m.id || m.role === 'owner'));
      if (!inv) return { data: { sent: false, reason: 'not_found' }, error: null };
      if (!inv.parent_email) return { data: { sent: false, reason: 'no_email' }, error: null };
      if (inv.used_at || inv.revoked_at || inv.claimed_at) return { data: { sent: false, reason: 'closed' }, error: null };
      if (inv.expires_at <= now()) return { data: { sent: false, reason: 'expired' }, error: null };
      if ((inv.email_count ?? 0) >= 3) return { data: { sent: false, reason: 'limit_invite' }, error: null };
      if (inv.email_sent_at && Date.now() - new Date(inv.email_sent_at).getTime() < 60e3) return { data: { sent: false, reason: 'too_soon' }, error: null };
      Object.assign(inv, { email_count: (inv.email_count ?? 0) + 1, email_sent_at: now(), email_status: 'sent', channel: 'email' });
      save();
      return { data: { sent: true }, error: null };
    }
    if (name === 'clinician-verify') {
      const v = demoVerification();
      if (v.last) { v.last.checked = true; saveVerification(v); }
      return { data: { status: 'pending', checks: { text: 'ok', edevlet: 'ok', graduate: 'ok', barcode: 'ok', name: 'ok', program: 'ok', degree: 'ok' } }, error: null };
    }
    const uid = sess()?.user.id;
    const m = db.clinicians.find((x: Row) => x.id === uid);
    if (!m || m.role !== 'owner') return { data: null, error: { message: 'Üyeliği yalnız klinik sahibi alır' } };
    const c = db.clinics.find((x: Row) => x.id === m.clinic_id);
    if (name === 'clinic-billing/iyzico-start') {
      const plan = db.billing_plans.find((p: Row) => p.id === opts?.body?.plan_id);
      if (!plan) return { data: null, error: { message: 'Bilinmeyen paket' } };
      // iyzico formu yerine: önizleme ödemesi onaylanınca klinik o pakete geçer
      (globalThis as any).__onizlemeOdeme = () => {
        const end = new Date();
        if (plan.period === 'yearly') end.setFullYear(end.getFullYear() + 1); else end.setMonth(end.getMonth() + 1);
        Object.assign(c, { plan: plan.package, seat_limit: plan.seat_limit, billing_period: plan.period, period_end: end.toISOString(),
          billing_source: 'iyzico', auto_renew: true });
        save();
      };
      // Önizleme sayfası yeniden yüklenmeden: ödeme anında "tamamlandı" sayılır, uygulama ?billing=ok dönüşünü görür
      const script = `<script>window.__onizlemeOdeme(); history.replaceState(null, '', location.pathname + '?billing=ok'); `
        + `window.dispatchEvent(new Event('clinicapp-billing'));</script>`;
      return { data: { token: 'demo', checkoutFormContent: script }, error: null };
    }
    if (name === 'clinic-billing/iyzico-cancel') {
      c.auto_renew = false;
      save();
      return { data: { ok: true, canceled: 1 }, error: null };
    }
    return { data: null, error: { message: 'Önizlemede bu ödeme yolu yok' } };
  },
};

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
    async createSignedUrl(path: string) {
      const url = db.blobs[path];
      return url ? { data: { signedUrl: url }, error: null } : { data: null, error: { message: 'Dosya bulunamadı' } };
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
  functions,
  channel,
  removeChannel() {},
} as unknown as SupabaseClient;

// Önizlemeyi baştan başlatmak için (tarayıcı konsolunda): onizlemeSifirla()
(globalThis as any).onizlemeSifirla = (globalThis as any).clinicappSifirla = () => {
  try { localStorage.removeItem(KEY); } catch { /* yok say */ }
  db = seed();
  location.reload();
};
