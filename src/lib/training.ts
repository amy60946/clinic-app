// Ebeveyn eğitimi (kullanıcı isteği 9 Kasım 2026; rakip "Parent training" ekranlarına sadık): uzman bir ebeveyne eğitim verir.
// Eğitim = Özet · Öğrenme modülleri (kütüphaneden) · Uygulama görevleri (ebeveyn evde uygular, kaydeder) · Hızlı yapılacaklar.
// Durum: Taslak (aile görmez) → Etkin → Ustalaştı. Sunucu SQL'i önizleme onayından sonra ortakta yazılacak; önizlemede deneme veritabanı.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import LIB from '../data/trainingLibrary.json';
import { track } from './track';

export type ItemType = 'reading' | 'quiz' | 'short' | 'video' | 'pdf';
export type LibSection = { heading: string; paragraphs?: string[]; bullets?: string[] };
export type LibQuestion = { q: string; options: string[]; answer: number };
export type LibItem = {
  key: string; subject: string; type: ItemType; title: string; desc: string; topics: string[];
  minutes?: number; sections?: LibSection[]; questions?: LibQuestion[]; prompts?: string[];
};

export const TOPICS: { key: string; label: string }[] = (LIB as any).topics;
export const ITEMS: LibItem[] = (LIB as any).items;
const BY_KEY = new Map(ITEMS.map((i) => [i.key, i]));
export const itemByKey = (key: string): LibItem | undefined => BY_KEY.get(key);
export const topicLabel = (key: string) => TOPICS.find((t) => t.key === key)?.label ?? key;

// Tür süzgeci ve kartlardaki simge (rakipteki gibi beş tür; video ve PDF henüz yok)
export const TYPES: { key: ItemType; label: string; icon: string; bg: string; fg: string }[] = [
  { key: 'pdf', label: 'PDF', icon: 'document-text-outline', bg: '#DDF3E4', fg: '#2F7D4A' },
  { key: 'video', label: 'Video', icon: 'videocam-outline', bg: '#FDE3EA', fg: '#B3263E' },
  { key: 'reading', label: 'Okuma', icon: 'book-outline', bg: '#EAF5D5', fg: '#5B7F14' },
  { key: 'short', label: 'Açık uçlu', icon: 'create-outline', bg: '#FFF1C9', fg: '#9A6B00' },
  { key: 'quiz', label: 'Çoktan seçmeli', icon: 'help-circle-outline', bg: '#FFE6D2', fg: '#B5541C' },
];
export const typeMeta = (t: ItemType) => TYPES.find((x) => x.key === t) ?? TYPES[2];

// Ebeveyn tarafındaki giriş kartı: "2 açık uçlu soru", "3 soruluk çoktan seçmeli test"
export function itemIntro(it: LibItem): string {
  if (it.type === 'quiz') return `${it.questions?.length ?? 0} soruluk çoktan seçmeli test`;
  if (it.type === 'short') return `${it.prompts?.length ?? 0} açık uçlu soru`;
  if (it.type === 'reading') return it.minutes ? `${it.minutes} dakikalık okuma` : 'Okuma';
  return typeMeta(it.type).label;
}

export type TrainingStatus = 'draft' | 'active' | 'mastered';
// bölüm başlıkları açık tonlu (koyu çip yalnız durum seçicide)
export const SECTION_TONE: Record<TrainingStatus, { bg: string; fg: string; bar: string }> = {
  draft: { bg: '#FFF6DD', fg: '#7A5A00', bar: '#E9B22B' }, active: { bg: '#E1F1E6', fg: '#2F7D4A', bar: '#2F7D4A' }, mastered: { bg: '#EEE8F7', fg: '#5B3F99', bar: '#7A5BC8' },
};
export const STATUS_META: Record<TrainingStatus, { label: string; bg: string; fg: string; section: string }> = {
  draft: { label: 'Taslak', bg: '#FFF1C9', fg: '#7A5A00', section: 'Taslaklar' },
  active: { label: 'Etkin', bg: '#E1F1E6', fg: '#2F7D4A', section: 'Etkin eğitimler' },
  mastered: { label: 'Ustalaştı', bg: '#EEE8F7', fg: '#5B3F99', section: 'Ustalaşılmış eğitimler' },
};

export type Measure = 'frequency' | 'accuracy' | 'duration' | 'none';
export const MEASURES: { key: Measure; label: string; hint: string }[] = [
  { key: 'frequency', label: 'Sıklık', hint: 'Davranışın toplam kaç kez olduğunu belirt' },
  { key: 'accuracy', label: 'Doğruluk', hint: 'Görev başına başarılı ve toplam deneme sayısını belirt' },
  { key: 'duration', label: 'Süre', hint: 'Her olayın ne kadar sürdüğünü belirt' },
  { key: 'none', label: 'Ölçüm yok', hint: 'Ebeveynden yalnız görevle ilgili düşüncelerini yazması istenir' },
];
export const measureLabel = (m: Measure) => MEASURES.find((x) => x.key === m)?.label ?? '';

export type Training = {
  id: string; clinic_id: string; link_id: string; parent_name: string; title: string; status: TrainingStatus;
  criterion: string | null; created_at: string; started_at: string; updated_at: string | null; seen_at: string | null;
};
export type Answer = { pick?: number; text?: string };
export type TModule = {
  id: string; training_id: string; item_key: string; position: number; archived: boolean;
  completed_at: string | null; correct: number | null; total: number | null; answers: Answer[] | null; created_at: string;
  reviewed_at?: string | null;   // uzman "incele" penceresini açtı
};
export type TTask = { id: string; training_id: string; title: string; description: string; measure: Measure; position: number; archived: boolean; created_at: string };
export type TLog = {
  id: string; task_id: string; training_id: string; day: string; count: number | null; successes: number | null; attempts: number | null;
  minutes: number | null; reflection: string; created_at: string;
};
export type TTodo = {
  id: string; training_id: string; title: string; description: string; done_at: string | null; archived: boolean; created_at: string;
  rating?: number | null; reflection?: string; reviewed_at?: string | null;   // ebeveynin "Nasıl geçti?" (1–5) ve düşüncesi
};
// "Nasıl geçti?" (ebeveyn: Çok kötü … Harika); uzmanın gördüğü etiket
export const RATING_LABELS = ['', 'Çok kötü geçti', 'Daha iyi olabilirdi', 'Beklendiği gibi', 'Beklenenden iyi', 'Harika geçti'];
export const RATING_COLORS = ['', '#B3263E', '#D9822B', '#8A91A3', '#2F7D4A', '#2C4A9A'];
export type TData = { id: string; training_id: string; day: string; value: number; created_at: string };
export type Detail = { modules: TModule[]; tasks: TTask[]; logs: TLog[]; todos: TTodo[]; data: TData[] };

// Örnek aile (Deniz): kimlik örnek aileye aitse veri cihazdaki deneme alanından gelir, sunucuya gidilmez (trainingSample.ts)
import * as SMP from './trainingSample';

export class TrainingNotInstalled extends Error {}

function check<T>(data: T, error: { code?: string; message: string } | null): T {
  if (error) {
    if (['PGRST202', 'PGRST205', '42883', '42P01'].includes(error.code ?? '')) throw new TrainingNotInstalled(error.message);
    throw new Error(error.message);
  }
  return data;
}

export async function loadTrainings(linkId: string): Promise<Training[]> {
  if (SMP.isSample(linkId)) return SMP.trainings();
  const { data, error } = await supabase.from('parent_trainings').select('*').eq('link_id', linkId).order('created_at', { ascending: false });
  return check((data ?? []) as Training[], error);
}

export async function loadTrainingsFor(linkIds: string[]): Promise<Training[]> {
  if (!linkIds.length) return [];
  const { data, error } = await supabase.from('parent_trainings').select('*').in('link_id', linkIds);
  return check((data ?? []) as Training[], error);
}

export async function loadDetail(trainingIds: string[]): Promise<Detail> {
  if (!trainingIds.length) return { modules: [], tasks: [], logs: [], todos: [], data: [] };
  if (trainingIds.some(SMP.isSample)) return SMP.detail(trainingIds);
  const q = (t: string) => supabase.from(t).select('*').in('training_id', trainingIds);
  const [m, k, l, d, o] = await Promise.all([q('parent_training_modules'), q('parent_training_tasks'), q('parent_training_logs'),
    q('parent_training_todos'), q('parent_training_data')]);
  return {
    modules: check((m.data ?? []) as TModule[], m.error).sort((a, b) => a.position - b.position),
    tasks: check((k.data ?? []) as TTask[], k.error).sort((a, b) => a.position - b.position),
    logs: check((l.data ?? []) as TLog[], l.error).sort((a, b) => b.day.localeCompare(a.day) || b.created_at.localeCompare(a.created_at)),
    todos: check((d.data ?? []) as TTodo[], d.error).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    data: check((o.data ?? []) as TData[], o.error).sort((a, b) => a.day.localeCompare(b.day)),
  };
}

// Ebeveynin son etkinliği (yeni etkinlik noktası): modül tamamlama, uygulama kaydı, yapılacak işareti
export type Activity = { modules: string | null; tasks: string | null; todos: string | null };
export function activityOf(trainingId: string, d: Detail): Activity {
  const max = (xs: (string | null)[]) => xs.filter(Boolean).sort().pop() ?? null;
  return {
    modules: max(d.modules.filter((m) => m.training_id === trainingId).map((m) => m.completed_at)),
    tasks: max(d.logs.filter((l) => l.training_id === trainingId).map((l) => l.created_at)),
    todos: max(d.todos.filter((t) => t.training_id === trainingId).map((t) => t.done_at)),
  };
}
export const isNew = (at: string | null, seen: string | null) => !!at && (!seen || at > seen);

// Paylaşımdaki ailenin ebeveynleri (eğitimi kime atayacağını seçmek için). İşlev yoksa (önizleme / eski sunucu) danışan satırındaki adlar.
export type Parent = { id: string | null; name: string };
export async function loadParents(linkId: string, fallback: string): Promise<Parent[]> {
  if (SMP.isSample(linkId)) return SMP.parents();
  const { data, error } = await supabase.rpc('clinic_link_parents', { p_link: linkId });
  if (!error && Array.isArray(data) && data.length) return (data as { user_id: string; name: string }[]).map((x) => ({ id: x.user_id, name: x.name }));
  return parentsOf(fallback).map((name) => ({ id: null, name }));
}

// "Yeni eğitim oluştur": ebeveyn + eğitim hedefi (hedef başlık olur), Taslak
export async function createTraining(p: { clinic_id: string; link_id: string; parent: Parent; goal: string; created_by: string }): Promise<Training> {
  if (SMP.isSample(p.link_id)) return SMP.create(p.parent, p.goal);
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('parent_trainings')
    .insert({ clinic_id: p.clinic_id, link_id: p.link_id, created_by: p.created_by, ...(p.parent.id ? { parent_id: p.parent.id } : {}),
      parent_name: p.parent.name, title: p.goal.trim().slice(0, 200) || 'Adsız eğitim', status: 'draft', started_at: now, updated_at: now, seen_at: now }).select('*');
  const row = check((data ?? []) as Training[], error)[0];
  track('training.create', {});
  return row;
}

// Uzman ebeveynin tamamladığı modülü / yapılacağı inceledi ("incelemeye hazır" sayısı ve satırdaki nokta kalkar)
export async function markReviewed(table: 'parent_training_modules' | 'parent_training_todos', id: string) {
  if (SMP.isSample(id)) return SMP.reviewed(table, id);
  await supabase.from(table).update({ reviewed_at: new Date().toISOString() }).eq('id', id);
}

// "Hatırlatma gönder": atanan ebeveyne bildirim; eğitim başına 12 saatte bir. 'sent' | 'recent' | 'missing'
export async function remindTraining(id: string): Promise<'sent' | 'recent' | 'missing' | 'sample'> {
  if (SMP.isSample(id)) return 'sample';
  const { data, error } = await supabase.rpc('clinic_training_remind', { p_training: id });
  if (error) {
    if (['PGRST202', '42883'].includes(error.code ?? '')) return 'missing';
    throw new Error(error.message);
  }
  track('training.remind', { sent: !!data });
  return data ? 'sent' : 'recent';
}

export async function updateTraining(id: string, patch: Partial<Pick<Training, 'title' | 'status' | 'criterion' | 'seen_at' | 'parent_name'>>) {
  if (SMP.isSample(id)) return SMP.update(id, patch);
  const { error } = await supabase.from('parent_trainings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  check(null, error);
  if (patch.status) track('training.status', { status: patch.status });
}

export async function deleteTraining(id: string) {
  if (SMP.isSample(id)) return SMP.remove(id);
  const { error } = await supabase.from('parent_trainings').delete().eq('id', id);
  check(null, error);
  track('training.delete', {});
}

// Seçilen öğeler eğitimin sonuna eklenir; eğitimde (arşivlenmemiş) olan öğe ikinci kez eklenmez
export async function addModules(trainingId: string, keys: string[], existing: TModule[]) {
  if (SMP.isSample(trainingId)) return SMP.addModules(trainingId, keys);
  const have = new Set(existing.filter((m) => !m.archived).map((m) => m.item_key));
  let pos = existing.reduce((n, m) => Math.max(n, m.position + 1), 0);
  const rows = keys.filter((k) => !have.has(k)).map((k) => ({ training_id: trainingId, item_key: k, position: pos++ }));
  if (!rows.length) return 0;
  const { error } = await supabase.from('parent_training_modules').insert(rows);
  check(null, error);
  track('training.modules', { n: rows.length });
  return rows.length;
}

export async function moveModule(list: TModule[], id: string, dir: -1 | 1) {
  const i = list.findIndex((m) => m.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  const a = list[i], b = list[j];
  if (SMP.isSample(a.id)) return SMP.moveModule(a.id, b.id);
  await Promise.all([
    supabase.from('parent_training_modules').update({ position: b.position }).eq('id', a.id),
    supabase.from('parent_training_modules').update({ position: a.position }).eq('id', b.id),
  ]);
}

export async function archiveModule(id: string) {
  if (SMP.isSample(id)) return SMP.archive('modules', id);
  const { error } = await supabase.from('parent_training_modules').update({ archived: true }).eq('id', id);
  check(null, error);
}

export async function saveTask(t: { id?: string; training_id: string; title: string; description: string; measure: Measure; position?: number }) {
  if (SMP.isSample(t.training_id)) return SMP.saveTask(t);
  const { id, ...rest } = t;
  const { error } = id
    ? await supabase.from('parent_training_tasks').update({ title: rest.title, description: rest.description, measure: rest.measure }).eq('id', id)
    : await supabase.from('parent_training_tasks').insert({ ...rest, position: rest.position ?? 0 });
  check(null, error);
  if (!id) track('training.task', { measure: t.measure });
}

export async function archiveTask(id: string) {
  if (SMP.isSample(id)) return SMP.archive('tasks', id);
  const { error } = await supabase.from('parent_training_tasks').update({ archived: true }).eq('id', id);
  check(null, error);
}

export async function saveTodo(t: { id?: string; training_id: string; title: string; description: string }) {
  if (SMP.isSample(t.training_id)) return SMP.saveTodo(t);
  const { id, ...rest } = t;
  const { error } = id
    ? await supabase.from('parent_training_todos').update({ title: rest.title, description: rest.description }).eq('id', id)
    : await supabase.from('parent_training_todos').insert(rest);
  check(null, error);
  if (!id) track('training.todo', {});
}

export async function archiveTodo(id: string) {
  if (SMP.isSample(id)) return SMP.archive('todos', id);
  const { error } = await supabase.from('parent_training_todos').update({ archived: true }).eq('id', id);
  check(null, error);
}

export async function addData(trainingId: string, day: string, value: number) {
  if (SMP.isSample(trainingId)) return SMP.addData(trainingId, day, value);
  const { error } = await supabase.from('parent_training_data').insert({ training_id: trainingId, day, value });
  check(null, error);
  track('training.data', {});
}

export async function deleteData(id: string) {
  if (SMP.isSample(id)) return SMP.deleteData(id);
  const { error } = await supabase.from('parent_training_data').delete().eq('id', id);
  check(null, error);
}

// Kütüphanede favoriler (cihazda)
const favKey = (uid: string) => `clinic.library.fav.v1.${uid}`;
export async function loadFavorites(uid: string): Promise<string[]> {
  try { return JSON.parse((await AsyncStorage.getItem(favKey(uid))) ?? '[]'); } catch { return []; }
}
export async function saveFavorites(uid: string, keys: string[]) {
  try { await AsyncStorage.setItem(favKey(uid), JSON.stringify(keys)); } catch { /* cihaz deposu yoksa favori kalmaz */ }
}

// Eğitimin ebeveyn listesi: danışan satırındaki ebeveyn adları
export const parentsOf = (parents: string): string[] => parents.split(/,\s*/).map((s) => s.trim()).filter(Boolean);

// Uygulama kaydının tek satırlık değeri
export function logValue(l: TLog, m: Measure): string {
  if (m === 'frequency') return `${l.count ?? 0} kez`;
  if (m === 'accuracy') return `${l.successes ?? 0} / ${l.attempts ?? 0}`;
  if (m === 'duration') return `${l.minutes ?? 0} dk`;
  return '—';
}

// "Not oluştur" (rakipteki "Generate progress note"): seçilen tarih aralığında ebeveyne atananlar; kurallı, yapay zekâ yok.
const NOTE_TYPE: Record<string, string> = { reading: 'Okuma', quiz: 'Test', short: 'Açık uçlu', video: 'Video', pdf: 'PDF' };
export function trainingNote(t: Training, d: Detail, from: string, to: string, fmtLong: (iso: string) => string): string {
  const inRange = (iso: string) => iso.slice(0, 10) >= from && iso.slice(0, 10) <= to;
  const mods = d.modules.filter((m) => m.training_id === t.id && !m.archived && inRange(m.created_at));
  const tasks = d.tasks.filter((k) => k.training_id === t.id && !k.archived && inRange(k.created_at));
  const todos = d.todos.filter((k) => k.training_id === t.id && !k.archived && inRange(k.created_at));
  const lines: string[] = [];
  lines.push(`${t.title} (${fmtLong(from)} – ${fmtLong(to)})`);
  lines.push(`Oluşturuldu: ${fmtLong(new Date().toISOString())}`);
  lines.push('');
  lines.push('Atananlar');
  lines.push(`${fmtLong(from)} ile ${fmtLong(to)} arasında ebeveyne şunlar atandı:`);
  if (!mods.length && !tasks.length && !todos.length) lines.push('Bu aralıkta atama yok.');
  mods.forEach((m) => {
    const it = itemByKey(m.item_key);
    lines.push(`${NOTE_TYPE[it?.type ?? 'reading']}: ${it?.title ?? m.item_key}`);
    lines.push(`Atanma tarihi: ${m.created_at.slice(0, 10)}`);
  });
  tasks.forEach((k) => { lines.push(`Uygulama görevi: ${k.title}`); lines.push(`Atanma tarihi: ${k.created_at.slice(0, 10)}`); });
  todos.forEach((k) => { lines.push(`Yapılacak: ${k.title}`); lines.push(`Atanma tarihi: ${k.created_at.slice(0, 10)}`); });
  return lines.join('\n');
}

// CSV satırları: uygulama kayıtları ve gözlem verisi (indirme simgeleri)
export function logRows(t: Training, d: Detail): string[][] {
  return d.logs.filter((l) => l.training_id === t.id).map((l) => {
    const k = d.tasks.find((x) => x.id === l.task_id);
    return [l.day, k?.title ?? '', k ? measureLabel(k.measure) : '', k ? logValue(l, k.measure) : '', l.reflection];
  });
}
