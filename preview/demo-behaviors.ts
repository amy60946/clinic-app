// ÖNİZLEME: davranışlar ve olaylar (kullanıcı isteği 9 Kasım 2026; ortak proposed/20261110110000_target_behaviors.sql) deneme veritabanı karşılığı.
// demo-supabase.ts'ten çağrılır: tablolar, uzman görünürlüğü ve örnek veri. Gerçek sürümde kullanılmaz.
type Row = Record<string, any>;

export const BEHAVIOR_TABLES = ['clinic_target_behaviors', 'behavior_incidents'];

export const BEHAVIOR_DEFAULTS: Record<string, Row> = {
  clinic_target_behaviors: { description: '', strategies: [], status: 'baselining', parent_logging: true, log_type: 'frequency', archived: false,
    created_by: 'demo-clinician', updated_at: null },
  behavior_incidents: { behavior_id: null, log_type: null, log_types: null, other_behavior: '', count: null, duration_min: null, antecedent: '', consequence: '',
    strategy: '', response: null, reporter_name: '' },
};

const uid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); });
const ago = (min: number) => new Date(Date.now() - min * 60e3).toISOString();
// n gün önce, saat hh:mm (yerel)
const at = (n: number, hh: number, mm = 0) => { const d = new Date(Date.now() - n * 864e5); d.setHours(hh, mm, 0, 0); return d.toISOString(); };

// Uzman yalnız kendi kliniğinin, görebildiği (etkin) paylaşımlardaki hedef davranışları ve olayları görür (sunucudaki RLS).
// Aile hedef davranışları family_target_behaviors() işleviyle okur; önizlemede ParentApp tarafı yok.
export function behaviorVisible(table: string, r: Row, m: Row | null, db: Row, linkVisible: (m: Row, l: Row) => boolean): boolean | undefined {
  if (!BEHAVIOR_TABLES.includes(table)) return undefined;
  const link = db.clinic_links.find((l: Row) => l.id === r.link_id);
  if (!m) return table === 'clinic_target_behaviors' ? !r.archived && r.parent_logging && link?.status === 'active' : false;
  if (!link || link.clinic_id !== m.clinic_id) return false;
  if (table === 'clinic_target_behaviors') return r.clinic_id === m.clinic_id && linkVisible(m, link);
  return link.status === 'active' && linkVisible(m, link);
}

// Kayıt türü çoklu seçim (ortak 20261123100000): sunucudaki tetikleyicilerin karşılığı. Uygulama yalnız log_types yazar;
// log_types yoksa (eski kayıt, ParentApp önizlemesinin eski olayı) [log_type], varsa sabit sıra ve tekil, log_type = ilk tür.
const ORDER = ['frequency', 'abc', 'duration'];
const norm = (list: unknown) => ORDER.filter((t) => Array.isArray(list) && list.includes(t));
function syncLogTypes(x: Row) {
  (x.clinic_target_behaviors ?? []).forEach((b: Row) => {
    const list = norm(b.log_types);
    b.log_types = list.length ? list : [b.log_type ?? 'frequency'];
    b.log_type = b.log_types[0];
  });
  (x.behavior_incidents ?? []).forEach((i: Row) => {
    const list = norm(i.log_types);
    i.log_types = list.length ? list : i.log_type ? [i.log_type] : null;
    if (i.log_types) i.log_type = i.log_types[0];
  });
}

// "Ekranı kapatırken ağlama" iki türlü (ABC + Süre): son iki olay sürüyle bildirildi, öncekiler yalnız ABC'yle (tür sonradan eklendi;
// eski olaylar kendi alanlarıyla görünür). Daha önce kurulmuş önizleme verisine de bir kez uygulanır.
function seedTwoTypes(x: Row) {
  if (x.logTypesSeeded) return;
  x.logTypesSeeded = true;
  const b = (x.clinic_target_behaviors ?? []).find((r: Row) => r.link_id === 'demo-link' && r.title === 'Ekranı kapatırken ağlama');
  if (!b) return;
  b.log_types = ['abc', 'duration'];
  b.log_type = 'abc';
  b.description = 'Tablet ya da televizyon kapanınca ağlama ve bağırma. Olduğu her seferi öncesi, sonrası ve ne kadar sürdüğüyle kaydetmenizi istiyorum.';
  (x.behavior_incidents ?? []).filter((i: Row) => i.behavior_id === b.id)
    .sort((p: Row, q: Row) => String(q.occurred_at).localeCompare(String(p.occurred_at)))
    .forEach((i: Row, k: number) => {
      if (k < 2) { i.log_types = ['abc', 'duration']; i.duration_min = k === 0 ? 4 : 9; } else i.log_types = ['abc'];
      i.log_type = 'abc';
    });
}

// Örnek aile (Nazlı): üç hedef davranış (ABC + süre · sıklık · süre) ve olayları, iki "diğer" olay
export function seedBehaviors(x: Row) {
  syncLogTypes(x);
  if (x.behaviorsSeeded) { seedTwoTypes(x); return; }
  const link = x.clinic_links.find((l: Row) => l.id === 'demo-link');
  if (!link) return;
  const parent = x.profiles.filter((p: Row) => p.family_id === link.family_id)
    .sort((a: Row, b: Row) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((p: Row) => ({ id: p.id, name: String(p.name ?? '').trim() || p.nickname }))[0] ?? { id: 'demo-parent', name: 'Ebeveyn' };
  const base = { clinic_id: link.clinic_id, link_id: link.id, archived: false, created_by: 'demo-clinician' };
  const B1 = uid(), B2 = uid(), B3 = uid();
  x.clinic_target_behaviors.push(
    { id: B1, ...base, title: 'Ekranı kapatırken ağlama', description: 'Tablet ya da televizyon kapanınca ağlama ve bağırma. Olduğu her seferi, öncesi ve sonrasıyla kaydetmenizi istiyorum.',
      strategies: ['Önce–sonra cümlesi kur', '5 dakika önce uyar', 'Sakin kal, kısa konuş'], status: 'improving', parent_logging: true, log_type: 'abc',
      started_at: ago(21 * 1440), created_at: ago(21 * 1440), updated_at: ago(3 * 1440) },
    { id: B2, ...base, title: 'Kardeşine vurma', description: 'Oyun sırasında kardeşine vurma. Gün içinde kaç kez olduğunu kaydedin.',
      strategies: ['Hemen ve sakin araya gir', 'Sıra beklemeyi öv'], status: 'baselining', parent_logging: true, log_type: 'frequency',
      started_at: ago(10 * 1440), created_at: ago(10 * 1440), updated_at: ago(10 * 1440) },
    { id: B3, ...base, title: 'Yatma saati direnci', description: 'Yatma saatinde yatağa gitmeyi reddetme. Direncin ne kadar sürdüğünü kaydedin.',
      strategies: ['Aynı sırayla yatma rutini'], status: 'stable', parent_logging: true, log_type: 'duration',
      started_at: ago(16 * 1440), created_at: ago(16 * 1440), updated_at: ago(16 * 1440) },
  );
  const inc = (behavior: string | null, logType: string | null, occurred: string, p: Row) => x.behavior_incidents.push({
    id: uid(), link_id: link.id, family_id: link.family_id, child_id: link.child_id, behavior_id: behavior, log_type: logType, other_behavior: '',
    occurred_at: occurred, count: null, duration_min: null, antecedent: '', consequence: '', strategy: '', response: null,
    reporter_id: parent.id, reporter_name: parent.name, created_at: occurred, ...p,
  });
  inc(B1, 'abc', at(13, 19, 40), { antecedent: 'Akşam yemeği için tableti kapatması istendi', consequence: 'Ağladı, tableti yere bıraktı; 5 dakika daha verildi', strategy: '', response: 1 });
  inc(B1, 'abc', at(9, 18, 15), { antecedent: 'Çizgi film bitince televizyon kapatıldı', consequence: 'Bağırdı, sonra odasına gitti', strategy: '5 dakika önce uyar', response: 3 });
  inc(B1, 'abc', at(5, 20, 0), { antecedent: 'Banyo saati geldi, tablet kapatıldı', consequence: 'Kısa ağladı, banyoya geldi', strategy: 'Önce–sonra cümlesi kur', response: 4 });
  inc(B1, 'abc', at(1, 17, 0), { antecedent: 'Ödev için oyun kapatıldı', consequence: 'Söylendi ama ağlamadı, ödevine oturdu', strategy: 'Sakin kal, kısa konuş', response: 5 });
  inc(B2, 'frequency', at(8, 16, 30), { count: 3, strategy: 'Hemen ve sakin araya gir', response: 2 });
  inc(B2, 'frequency', at(4, 17, 45), { count: 2, strategy: 'Sıra beklemeyi öv', response: 4 });
  inc(B2, 'frequency', at(2, 18, 10), { count: 1, strategy: '', response: 3 });
  inc(B3, 'duration', at(6, 21, 30), { duration_min: 25, strategy: 'Aynı sırayla yatma rutini', response: 2 });
  inc(B3, 'duration', at(3, 21, 15), { duration_min: 15, strategy: 'Aynı sırayla yatma rutini', response: 4 });
  inc(null, null, at(7, 10, 0), { other_behavior: 'Markette yere yatma', antecedent: 'Şeker almak istedi, hayır denildi', consequence: 'Yerden kalkana kadar beklendi',
    duration_min: 6, count: 1, strategy: 'Sakin bekledim', response: 3 });
  inc(null, null, at(2, 8, 20), { other_behavior: 'Okula giderken ayakkabı giymeyi reddetme', antecedent: 'Servis gelmek üzereydi', consequence: 'Babası yardım etti',
    duration_min: 10, count: 2, strategy: '', response: 2 });
  x.behaviorsSeeded = true;
  seedTwoTypes(x);
  syncLogTypes(x);
}

// Ebeveynin davranış kayıtları (abc_events) Davranışlar ve Olaylar'da (23 Kasım 2026): örnek ailenin kayıtlarına gün bölümü,
// "Tablet süresi bitti" kayıtlarına davranış hedefi (g-gecis) ve sesli, hedefe bağlı (g-sabah) yeni bir sabah kaydı.
// Bundan sonra ParentApp önizlemesinden bildirilen olaylar uzmana behavior_incident bildirimi düşürür (behaviorNotifications).
export function seedParentRecords(x: Row) {
  if (x.parentRecordsSeeded) return;
  x.behaviorNotifSince = new Date().toISOString();
  x.parentRecordsSeeded = true;
  const link = x.clinic_links.find((l: Row) => l.id === 'demo-link');
  if (!link) return;
  const hasGoal = (id: string) => x.clinic_goals.some((g: Row) => g.id === id && g.link_id === link.id);
  x.abc_events.filter((e: Row) => e.child_id === link.child_id).forEach((e: Row) => {
    if (!e.day_part) e.day_part = 'evening';
    if (e.goal_id === undefined) e.goal_id = e.antecedent === 'Tablet süresi bitti' && hasGoal('g-gecis') ? 'g-gecis' : null;
  });
  const parent = x.profiles.filter((p: Row) => p.family_id === link.family_id)
    .sort((a: Row, b: Row) => String(a.created_at).localeCompare(String(b.created_at)))[0];
  const path = `${link.family_id}/demo-davranis-kaydi.wav`;
  x.blobs = x.blobs ?? {};
  x.blobs[path] = toneWav(4);
  const occurred = at(1, 8, 0);
  x.abc_events.push({ id: uid(), family_id: link.family_id, child_id: link.child_id, occurred_at: occurred, day_part: 'morning',
    antecedent: 'Kahvaltı hazırdı, giyinmesi istendi', behavior: 'Giyinmeyi reddetti, odasına kapandı',
    consequence: 'Sabah çizelgesi gösterildi, 10 dakikada giyindi', intensity: 3, goal_id: hasGoal('g-sabah') ? 'g-sabah' : null,
    audio_path: path, duration_ms: 4000, group_id: null, created_by: parent?.id ?? null, created_at: occurred });
  // Arşivlenenler: olaylarıyla arşivlenmiş bir hedef davranış ("Geri al" denensin)
  const B4 = uid();
  x.clinic_target_behaviors.push({ id: B4, clinic_id: link.clinic_id, link_id: link.id, title: 'Yemekte masadan kalkma',
    description: 'Akşam yemeğinde yemek bitmeden masadan kalkma. Kaç kez olduğunu kaydedin.', strategies: ['Yemek öncesi kısa hatırlatma'],
    status: 'baselining', parent_logging: true, log_type: 'frequency', log_types: ['frequency'], archived: true, created_by: 'demo-clinician',
    started_at: ago(30 * 1440), created_at: ago(30 * 1440), updated_at: ago(12 * 1440) });
  [[26, 4], [20, 2], [14, 1]].forEach(([d, count]) => x.behavior_incidents.push({ id: uid(), link_id: link.id, family_id: link.family_id,
    child_id: link.child_id, behavior_id: B4, log_type: 'frequency', log_types: ['frequency'], other_behavior: '', occurred_at: at(d, 19, 30), count, duration_min: null,
    antecedent: '', consequence: '', strategy: 'Yemek öncesi kısa hatırlatma', response: 3, reporter_id: parent?.id ?? 'demo-parent',
    reporter_name: String(parent?.name ?? '').trim() || parent?.nickname || 'Ebeveyn', created_at: at(d, 19, 30) }));
}

// Sunucudaki behavior_incidents_notify: yeni olay → paylaşımın uzmanlarına, data { incident_id, behavior_id, link_id, child_id }.
// Örnek verinin eski olayları bildirim üretmez (behaviorNotifSince'ten önce eklenmiş).
export function behaviorNotifications(x: Row, has: (kind: string, test: (d: Row) => boolean) => boolean,
  push: (user: string, kind: string, title: string, body: string, data: Row, childId: string | null, createdAt: string) => void,
  recipients: (l: Row) => string[]) {
  if (!x.behaviorNotifSince) return;
  (x.behavior_incidents ?? []).forEach((i: Row) => {
    if (String(i.created_at) < x.behaviorNotifSince || has('behavior_incident', (d) => d.incident_id === i.id)) return;
    const l = x.clinic_links.find((k: Row) => k.id === i.link_id && k.status === 'active');
    if (!l) return;
    const name = x.clinic_target_behaviors.find((b: Row) => b.id === i.behavior_id)?.title || i.other_behavior || 'Davranış olayı';
    recipients(l).forEach((u) => push(u, 'behavior_incident', `Yeni davranış olayı: ${name}`.slice(0, 120),
      `${i.reporter_name || 'Ebeveyn'} yeni bir davranış olayı bildirdi.`,
      { incident_id: i.id, behavior_id: i.behavior_id, link_id: l.id, child_id: l.child_id }, l.child_id, i.created_at));
  });
}

// Önizlemedeki sesli kayıt: kısa, yumuşak iki tonlu ses (8 kHz, 8 bit, tek kanal WAV), veri adresi olarak
function toneWav(seconds: number): string {
  const rate = 8000, n = rate * seconds, bytes = new Uint8Array(44 + n);
  const v = new DataView(bytes.buffer);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) {
    const t = i / rate, f = Math.floor(t * 2) % 2 ? 330 : 262, env = Math.min(1, (t % 0.5) * 20, (0.5 - (t % 0.5)) * 20);
    bytes[44 + i] = 128 + Math.round(18 * env * Math.sin(2 * Math.PI * f * t));
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:audio/wav;base64,${btoa(bin)}`;
}
