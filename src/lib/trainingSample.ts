// Örnek aile (Deniz) için ebeveyn eğitimi deneme alanı (11 Kasım 2026, lansman odağı "A"): ilk kullanıcı aile bağlamadan
// Ebeveyn Eğitimi'ni dolu haliyle görür ve dener. Veri cihaz belleğinde tutulur, sunucuya gitmez, örnek her açıldığında sıfırlanır.
// training.ts'teki her işlev, kimlik örnek aileye aitse (isSample) buradaki karşılığını çağırır.
import LIB from '../data/trainingLibrary.json';
import type { Training, TModule, TTask, TLog, TTodo, TData, Detail, Measure, Parent, Answer, TrainingStatus } from './training';

export const SAMPLE_LINK_ID = 'sample';                 // sample.ts SAMPLE_LINK ile aynı
export const SAMPLE_PARENT = 'Ayşe (örnek)';
const PREFIX = 'sample-';
export const isSample = (id?: string | null) => !!id && (id === SAMPLE_LINK_ID || id.startsWith(PREFIX));

type Store = { trainings: Training[]; modules: TModule[]; tasks: TTask[]; logs: TLog[]; todos: TTodo[]; data: TData[] };
let st: Store | null = null;
let seq = 0;
const nid = () => `${PREFIX}${++seq}`;
const iso = (daysAgo: number, minutes = 0) => new Date(Date.now() - daysAgo * 864e5 - minutes * 60e3).toISOString();
const day = (daysAgo: number) => iso(daysAgo).slice(0, 10);
const item = (key: string) => ((LIB as any).items as any[]).find((i) => i.key === key);

function seed(): Store {
  seq = 0;
  const T1 = nid(), T2 = nid();
  const base = { clinic_id: '', link_id: SAMPLE_LINK_ID, parent_name: SAMPLE_PARENT };
  const trainings: Training[] = [
    { id: T1, ...base, title: 'Ebeveyn zor geçişlerden önce iki uyarı verir', status: 'active', created_at: iso(22), started_at: iso(21), updated_at: iso(2),
      criterion: 'Ebeveyn, zor geçişlerin %80\'inde 5 ve 2 dakika kala uyarı verir; art arda 2 hafta.', seen_at: iso(4) },
    { id: T2, ...base, title: 'Ebeveyn özel zamanda etiketli övgü kullanır', status: 'draft', created_at: iso(1), started_at: iso(1), updated_at: iso(1),
      criterion: null, seen_at: iso(1) },
  ];
  const modules: TModule[] = [];
  const mod = (training: string, key: string, position: number, done: number | null, reviewed: boolean, picks?: number[], texts?: string[]) => {
    const it = item(key);
    if (!it) return;
    let answers: Answer[] | null = null, correct: number | null = null, total: number | null = null;
    if (done !== null && it.type === 'quiz') {
      const qs: { answer: number }[] = it.questions ?? [];
      answers = qs.map((q, i) => ({ pick: picks?.[i] ?? q.answer }));
      correct = qs.filter((q, i) => answers![i].pick === q.answer).length; total = qs.length;
    }
    if (done !== null && it.type === 'short') answers = ((it.prompts ?? []) as string[]).map((_, i) => ({ text: texts?.[i] ?? '' }));
    modules.push({ id: nid(), training_id: training, item_key: key, position, archived: false, completed_at: done === null ? null : iso(done),
      correct, total, answers, created_at: iso(21), reviewed_at: done !== null && reviewed ? iso(done, -600) : null });
  };
  const quiz = item('gecis_uyari_q');
  const oneWrong = quiz ? (quiz.questions as { answer: number }[]).map((q, i) => (i === 0 ? (q.answer + 1) % 4 : q.answer)) : [];
  mod(T1, 'gecis_uyari_r', 0, 19, true);
  mod(T1, 'gecis_uyari_q', 1, 18, true, oneWrong);
  mod(T1, 'gecis_uyari_s', 2, 2, false, undefined, [
    'En zor geçiş akşam tableti kapatmak. Parktan ayrılmak da zor oluyor.',
    'Beş dakika kala haber verdim, iki dakika kala kum saatini çevirdim. İlk gün itiraz etti, üçüncü gün kendisi kapattı.',
    'Uyarıyı odanın öbür ucundan değil, yanına gidip göz hizasında söylemek işe yaradı.',
  ]);
  mod(T1, 'gunluk_cizelge_r', 3, null, false);
  mod(T2, 'sozel_ovgu_r', 0, null, false);
  mod(T2, 'sozel_ovgu_q', 1, null, false);

  const K1 = nid(), K2 = nid();
  const tasks: TTask[] = [
    { id: K1, training_id: T1, title: 'Geçişten önce iki uyarı ver', measure: 'accuracy', position: 0, archived: false, created_at: iso(20),
      description: 'Ekranı kapatma ya da sofraya gelme gibi zor bir geçişte 5 dakika ve 2 dakika kala haber ver. Kaç geçişte uyardığını ve kaçında çocuğun sakin geçtiğini gir.' },
    { id: K2, training_id: T1, title: 'Sakin geçişi adıyla öv', measure: 'frequency', position: 1, archived: false, created_at: iso(12),
      description: 'Çocuk geçişi sakin yaptığında hemen ve ne yaptığını söyleyerek öv. Gün sonunda kaç kez övdüğünü gir.' },
  ];
  const logs: TLog[] = [];
  const log = (task: string, d: number, v: Partial<TLog>, reflection = '') =>
    logs.push({ id: nid(), task_id: task, training_id: T1, day: day(d), count: null, successes: null, attempts: null, minutes: null, reflection, created_at: iso(d), ...v });
  ([[17, 2, 5, 'İlk gün uyarıyı unuttum, iki kez hatırladım.'], [14, 3, 5, ''], [11, 3, 4, 'Kum saati işe yaradı.'], [8, 4, 5, ''], [5, 4, 5, 'Parktan ayrılırken de denedim.'], [1, 5, 5, 'Bugün hepsinde sakin geçti.']] as [number, number, number, string][])
    .forEach(([d, s, a, r]) => log(K1, d, { successes: s, attempts: a }, r));
  ([[10, 3], [7, 4], [4, 6], [1, 5]] as [number, number][]).forEach(([d, c]) => log(K2, d, { count: c }));

  const todos: TTodo[] = [
    { id: nid(), training_id: T1, title: 'Görünür bir zamanlayıcı hazırla', description: 'Geçiş uyarılarında kullanmak için çocuğun görebileceği bir kum saati ya da zamanlayıcı.',
      done_at: iso(15), archived: false, created_at: iso(20), rating: 4, reflection: 'Kum saati aldık, çevirmeyi çok sevdi.', reviewed_at: iso(14) },
    { id: nid(), training_id: T1, title: 'Akşam rutinini buzdolabına as', description: 'Akşam yemeğinden yatağa kadarki adımları resimli bir listeye dök.',
      done_at: null, archived: false, created_at: iso(6) },
  ];
  const data: TData[] = [[14, 40], [7, 60], [1, 75]].map(([d, v]) => ({ id: nid(), training_id: T1, day: day(d), value: v, created_at: iso(d) }));
  return { trainings, modules, tasks, logs, todos, data };
}

const S = () => (st ??= seed());
export const resetSampleTraining = () => { st = null; };
const touch = (trainingId: string) => { const t = S().trainings.find((x) => x.id === trainingId); if (t) t.updated_at = new Date().toISOString(); };

export const trainings = (): Training[] => [...S().trainings].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((t) => ({ ...t }));
export function detail(ids: string[]): Detail {
  const has = (x: { training_id: string }) => ids.includes(x.training_id);
  const s = S();
  return {
    modules: s.modules.filter(has).map((m) => ({ ...m })).sort((a, b) => a.position - b.position),
    tasks: s.tasks.filter(has).map((k) => ({ ...k })).sort((a, b) => a.position - b.position),
    logs: s.logs.filter(has).map((l) => ({ ...l })).sort((a, b) => b.day.localeCompare(a.day) || b.created_at.localeCompare(a.created_at)),
    todos: s.todos.filter(has).map((t) => ({ ...t })).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    data: s.data.filter(has).map((d) => ({ ...d })).sort((a, b) => a.day.localeCompare(b.day)),
  };
}
export const parents = (): Parent[] => [{ id: null, name: SAMPLE_PARENT }];

export function create(parent: Parent, goal: string): Training {
  const now = new Date().toISOString();
  const t: Training = { id: nid(), clinic_id: '', link_id: SAMPLE_LINK_ID, parent_name: parent.name, title: goal.trim().slice(0, 200) || 'Adsız eğitim',
    status: 'draft', criterion: null, created_at: now, started_at: now, updated_at: now, seen_at: now };
  S().trainings.push(t);
  return { ...t };
}
export function update(id: string, patch: Partial<Pick<Training, 'title' | 'status' | 'criterion' | 'seen_at' | 'parent_name'>> & { status?: TrainingStatus }) {
  const t = S().trainings.find((x) => x.id === id);
  if (t) Object.assign(t, patch, { updated_at: new Date().toISOString() });
}
export function remove(id: string) {
  const s = S();
  s.trainings = s.trainings.filter((t) => t.id !== id);
  (['modules', 'tasks', 'logs', 'todos', 'data'] as const).forEach((k) => { (s as any)[k] = (s[k] as { training_id: string }[]).filter((x) => x.training_id !== id); });
}
export function reviewed(table: 'parent_training_modules' | 'parent_training_todos', id: string) {
  const row = (table === 'parent_training_modules' ? S().modules : S().todos).find((x) => x.id === id);
  if (row) row.reviewed_at = new Date().toISOString();
}
export function addModules(trainingId: string, keys: string[]): number {
  const s = S();
  const mine = s.modules.filter((m) => m.training_id === trainingId);
  const have = new Set(mine.filter((m) => !m.archived).map((m) => m.item_key));
  let pos = mine.reduce((n, m) => Math.max(n, m.position + 1), 0);
  const add = keys.filter((k) => !have.has(k));
  add.forEach((k) => s.modules.push({ id: nid(), training_id: trainingId, item_key: k, position: pos++, archived: false, completed_at: null,
    correct: null, total: null, answers: null, created_at: new Date().toISOString(), reviewed_at: null }));
  touch(trainingId);
  return add.length;
}
export function moveModule(a: string, b: string) {
  const s = S(); const x = s.modules.find((m) => m.id === a), y = s.modules.find((m) => m.id === b);
  if (x && y) { const p = x.position; x.position = y.position; y.position = p; }
}
export const archive = (kind: 'modules' | 'tasks' | 'todos', id: string) => { const r = (S()[kind] as { id: string; archived: boolean }[]).find((x) => x.id === id); if (r) r.archived = true; };
export function saveTask(t: { id?: string; training_id: string; title: string; description: string; measure: Measure; position?: number }) {
  const s = S();
  const cur = t.id ? s.tasks.find((x) => x.id === t.id) : undefined;
  if (cur) Object.assign(cur, { title: t.title, description: t.description, measure: t.measure });
  else s.tasks.push({ id: nid(), training_id: t.training_id, title: t.title, description: t.description, measure: t.measure, position: t.position ?? 0, archived: false, created_at: new Date().toISOString() });
  touch(t.training_id);
}
export function saveTodo(t: { id?: string; training_id: string; title: string; description: string }) {
  const s = S();
  const cur = t.id ? s.todos.find((x) => x.id === t.id) : undefined;
  if (cur) Object.assign(cur, { title: t.title, description: t.description });
  else s.todos.push({ id: nid(), training_id: t.training_id, title: t.title, description: t.description, done_at: null, archived: false, created_at: new Date().toISOString() });
  touch(t.training_id);
}
export const addData = (trainingId: string, d: string, value: number) => { S().data.push({ id: nid(), training_id: trainingId, day: d, value, created_at: new Date().toISOString() }); };
export const deleteData = (id: string) => { const s = S(); s.data = s.data.filter((x) => x.id !== id); };
