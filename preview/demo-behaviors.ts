// ÖNİZLEME: davranışlar ve olaylar (kullanıcı isteği 9 Kasım 2026; ortak proposed/20261110110000_target_behaviors.sql) deneme veritabanı karşılığı.
// demo-supabase.ts'ten çağrılır: tablolar, uzman görünürlüğü ve örnek veri. Gerçek sürümde kullanılmaz.
type Row = Record<string, any>;

export const BEHAVIOR_TABLES = ['clinic_target_behaviors', 'behavior_incidents'];

export const BEHAVIOR_DEFAULTS: Record<string, Row> = {
  clinic_target_behaviors: { description: '', strategies: [], status: 'baselining', parent_logging: true, log_type: 'frequency', archived: false,
    created_by: 'demo-clinician', updated_at: null },
  behavior_incidents: { behavior_id: null, log_type: null, other_behavior: '', count: null, duration_min: null, antecedent: '', consequence: '',
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

// Örnek aile (Nazlı): üç hedef davranış (ABC · sıklık · süre) ve olayları, iki "diğer" olay
export function seedBehaviors(x: Row) {
  if (x.behaviorsSeeded) return;
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
}
