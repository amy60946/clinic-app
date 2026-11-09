// ÖNİZLEME: ebeveyn eğitimi (kullanıcı isteği 9 Kasım 2026; ortak SQL önizleme onayından sonra yazılacak) deneme veritabanı karşılığı.
// demo-supabase.ts'ten çağrılır: tablolar, uzman görünürlüğü ve örnek veri. Gerçek sürümde kullanılmaz.
import LIB from '../data/trainingLibrary.json';

type Row = Record<string, any>;

export const TRAINING_TABLES = ['parent_trainings', 'parent_training_modules', 'parent_training_tasks', 'parent_training_logs',
  'parent_training_todos', 'parent_training_data'];

export const TRAINING_DEFAULTS: Record<string, Row> = {
  parent_trainings: { status: 'draft', criterion: null, seen_at: null },
  parent_training_modules: { archived: false, completed_at: null, correct: null, total: null, answers: null },
  parent_training_tasks: { description: '', measure: 'none', archived: false },
  parent_training_todos: { description: '', done_at: null, archived: false },
};

const uid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); });
const ago = (min: number) => new Date(Date.now() - min * 60e3).toISOString();
const dayAgo = (n: number) => { const d = new Date(Date.now() - n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Uzman yalnız kendi kliniğinin, görebildiği paylaşımlardaki eğitimleri görür; aile tablolara doğrudan bakmaz (gerçekte işlevle)
export function trainingVisible(table: string, r: Row, m: Row | null, db: Row, linkVisible: (m: Row, l: Row) => boolean): boolean | undefined {
  if (!TRAINING_TABLES.includes(table)) return undefined;
  if (!m) return false;
  const tr = table === 'parent_trainings' ? r : db.parent_trainings.find((t: Row) => t.id === r.training_id);
  if (!tr || tr.clinic_id !== m.clinic_id) return false;
  return linkVisible(m, db.clinic_links.find((l: Row) => l.id === tr.link_id));
}

const item = (key: string) => (LIB as any).items.find((i: Row) => i.key === key);

// Örnek aile (Nazlı): etkin bir eğitim (tamamlanan modüller, uygulama kayıtları, yapılacaklar, gözlem verisi), bir taslak, bir ustalaşılan
export function seedTraining(x: Row) {
  if (x.trainingSeeded) return;
  const link = x.clinic_links.find((l: Row) => l.id === 'demo-link');
  if (!link) return;
  const parent = x.profiles.filter((p: Row) => p.family_id === link.family_id)
    .sort((a: Row, b: Row) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((p: Row) => String(p.name ?? '').trim() || p.nickname)[0] || 'Ebeveyn';
  const base = { clinic_id: link.clinic_id, link_id: link.id, parent_name: parent, created_by: 'demo-clinician' };
  const T1 = uid(), T2 = uid(), T3 = uid();
  x.parent_trainings.push(
    { id: T1, ...base, title: 'Davranışları ABC ile anlamak', status: 'active', created_at: ago(22 * 1440), started_at: ago(21 * 1440), updated_at: ago(2 * 1440),
      criterion: 'Ebeveyn, zorlayıcı bir davranışın öncülünü ve sonucunu fırsatların %80\'inde doğru belirler; art arda 3 seansta.', seen_at: ago(3 * 1440) },
    { id: T2, ...base, title: 'Geçişlere hazırlık', status: 'draft', created_at: ago(1440), started_at: ago(1440), updated_at: ago(1440), criterion: null, seen_at: ago(1440) },
    { id: T3, ...base, title: 'Sözel övgü', status: 'mastered', created_at: ago(60 * 1440), started_at: ago(58 * 1440), updated_at: ago(25 * 1440),
      criterion: 'Ebeveyn özel zamanda 5 dakikada en az 5 etiketli övgü yapar; art arda 3 gözlemde.', seen_at: ago(24 * 1440) },
  );
  // Modül tamamlama: test yanıtları içerikten (doğru sayısı içerikteki cevaba göre)
  const mod = (training: string, key: string, position: number, doneMin: number | null, picks?: number[], texts?: string[]) => {
    const it = item(key);
    if (!it) return;
    let answers: Row[] | null = null, correct: number | null = null, total: number | null = null;
    if (doneMin !== null && it.type === 'quiz') {
      const qs = it.questions ?? [];
      answers = qs.map((q: Row, i: number) => ({ pick: picks?.[i] ?? q.answer }));
      correct = qs.filter((q: Row, i: number) => answers![i].pick === q.answer).length; total = qs.length;
    }
    if (doneMin !== null && it.type === 'short') answers = (it.prompts ?? []).map((_: string, i: number) => ({ text: texts?.[i] ?? '' }));
    x.parent_training_modules.push({ id: uid(), training_id: training, item_key: key, position, archived: false,
      completed_at: doneMin === null ? null : ago(doneMin), correct, total, answers, created_at: ago(21 * 1440) });
  };
  const abcQ = item('abc_q');
  const wrongFirst = abcQ ? abcQ.questions.map((q: Row, i: number) => (i === 0 ? (q.answer + 1) % 4 : q.answer)) : [];
  mod(T1, 'abc_r', 0, 20 * 1440);
  mod(T1, 'abc_q', 1, 20 * 1440 - 10, wrongFirst);
  mod(T1, 'abc_s', 2, 19 * 1440, undefined, [
    'Akşam tableti kapatmasını istedim (öncesi). Tableti yere attı ve bağırdı (davranış). Beş dakika daha verdim (sonrası).',
    'Sonrasını değiştirebilirim: süre dolunca söylediğimi yapıp sakin kalmak. Öncesinde de iki dakika kala haber verebilirim.',
  ]);
  mod(T1, 'islev_r', 3, 2 * 1440);
  mod(T1, 'islev_s', 4, null);
  mod(T1, 'gunluk_cizelge_r', 5, null);
  mod(T2, 'gecis_uyari_r', 0, null);
  mod(T2, 'gecis_uyari_q', 1, null);
  mod(T3, 'sozel_ovgu_r', 0, 50 * 1440);
  mod(T3, 'sozel_ovgu_q', 1, 50 * 1440 - 8);
  mod(T3, 'sozel_ovgu_s', 2, 49 * 1440, undefined, ['Ayakkabılarını dolaba koyması, kardeşine sıra vermesi, ilk istekte sofraya gelmesi.', '"Ayakkabılarını kendin dolaba koyman çok hoşuma gitti."']);

  // Uygulama görevleri ve kayıtlar
  const K1 = uid(), K2 = uid();
  x.parent_training_tasks.push(
    { id: K1, training_id: T1, title: 'Zorlayıcı davranışı ABC ile kaydet', description: 'Gün içinde zorlayıcı bir davranış olduğunda, aynı gün öncesini, davranışı ve sonrasını kısa cümlelerle yaz. Kaç davranış kaydettiğini gir.', measure: 'frequency', position: 0, archived: false, created_at: ago(20 * 1440) },
    { id: K2, training_id: T1, title: 'Geçişten önce iki uyarı', description: 'Ekranı kapatma ya da sofraya gelme gibi zor bir geçişte 5 dakika ve 2 dakika kala haber ver. Kaç geçişte uyardığını ve kaçında çocuğun sakin geçtiğini gir.', measure: 'accuracy', position: 1, archived: false, created_at: ago(12 * 1440) },
    { id: uid(), training_id: T3, title: 'Günde 5 etiketli övgü', description: 'Beğendiğin davranışı adıyla ve hemen öv. Gün sonunda kaç kez övdüğünü gir.', measure: 'frequency', position: 0, archived: false, created_at: ago(56 * 1440) },
  );
  const reflections = ['Akşam yemeğinden önce iki kez oldu, ikisinde de acıkmıştı.', '', 'Bugün sakin geçti, sadece servis öncesi bir kez.', '', 'Babaannesinin yanındayken kaydetmeyi unuttum.', '', 'Öncesini yazmak kolaylaştı.'];
  [13, 11, 10, 8, 6, 4, 3, 1].forEach((d, i) => x.parent_training_logs.push({ id: uid(), task_id: K1, training_id: T1, day: dayAgo(d),
    count: [3, 2, 2, 1, 2, 1, 1, 1][i], successes: null, attempts: null, minutes: null, reflection: reflections[i % reflections.length], created_at: ago(d * 1440 - 600) }));
  [9, 7, 5, 2, 1].forEach((d, i) => x.parent_training_logs.push({ id: uid(), task_id: K2, training_id: T1, day: dayAgo(d),
    count: null, successes: [1, 2, 2, 3, 2][i], attempts: [3, 3, 3, 3, 2][i], minutes: null,
    reflection: ['Zamanlayıcıyı görünce itiraz azaldı.', '', 'İkinci uyarıyı unuttum.', 'Üçünde de sakin geçti!', ''][i], created_at: ago(d * 1440 - 540) }));

  // Hızlı yapılacaklar
  x.parent_training_todos.push(
    { id: uid(), training_id: T1, title: 'İlk davranış kaydını gir', description: 'Uygulamada «Davranış kaydı ekle» ile bu haftaki bir davranışı kaydet.', done_at: ago(19 * 1440), archived: false, created_at: ago(20 * 1440) },
    { id: uid(), training_id: T1, title: 'Bir zamanlayıcı ya da kum saati hazırla', description: 'Geçiş uyarılarında kullanmak için çocuğun görebileceği bir zamanlayıcı.', done_at: null, archived: false, created_at: ago(12 * 1440) },
  );

  // Ustalık ölçütüne doğru gözlem verisi (uzman seansta girer)
  [[21, 40], [14, 55], [7, 70], [1, 80]].forEach(([d, v]) => x.parent_training_data.push({ id: uid(), training_id: T1, day: dayAgo(d), value: v, created_at: ago(d * 1440) }));
  [[56, 50], [49, 75], [42, 90], [35, 100]].forEach(([d, v]) => x.parent_training_data.push({ id: uid(), training_id: T3, day: dayAgo(d), value: v, created_at: ago(d * 1440) }));
  x.trainingSeeded = true;
}
