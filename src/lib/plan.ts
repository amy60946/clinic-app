import { supabase } from './supabase';
import catalog from '../data/careTemplates.json';

// Takip planı: çocuk hedefleri (clinic_goals) + aile programı (care_modules) + ebeveynin uygulama kaydı (care_module_logs).
// ortak/sozlesme/akislar.md 12, proposed/20261026100000_family_invite_links.sql. Plan bir paylaşıma (link) ya da
// henüz kullanılmamış bir davete (taslak) bağlıdır; aile çocuğu paylaşınca taslak o çocuğa taşınır.

export type Measure = 'yesno' | 'percent' | 'frequency' | 'duration' | 'level';
export type GoalStatus = 'active' | 'achieved' | 'paused';
export type ModuleStatus = 'planned' | 'active' | 'done';
export type PlanTarget = { kind: 'link'; linkId: string; clinicId: string } | { kind: 'invite'; code: string; clinicId: string };

export type GoalRating = { week: string; rating: number; note: string };
export type PlanGoal = {
  id: string; title: string; description: string; archived: boolean; created_at: string;
  domain: string; measure: Measure; baseline: string; target: string; weeks: number | null; home_support: string;
  shared: boolean; status: GoalStatus; position: number; template_key: string | null; ratings: GoalRating[];
};
export type PlanModule = {
  id: string; title: string; aim: string; practice: string; checklist: string[]; position: number;
  status: ModuleStatus; template_key: string | null; created_at: string;
};
export type ModuleLog = { module_id: string; day: string; practiced: boolean; difficulty: number | null; barrier: string | null; note: string };

/* ---------- Şablon kataloğu ---------- */
export type DomainT = { key: string; label: string; task_category: string };
export type GoalT = { key: string; domain: string; title: string; measure: Measure; target: string; weeks: number; home_support: string; modules: string[] };
export type ModuleT = { key: string; title: string; aim: string; skills: string[]; practice: string; checklist: string[]; weeks: number; note: string; sources: string[] };
export type PackageT = { key: string; title: string; goals: string[]; modules: string[]; weeks: number };

export const DOMAINS = catalog.domains as DomainT[];
export const GOAL_TEMPLATES = catalog.goals as GoalT[];
export const MODULE_TEMPLATES = catalog.modules as ModuleT[];
export const PACKAGES = catalog.packages as PackageT[];
export const MEASURES = catalog.measures as { key: Measure; label: string; hint: string }[];
export const TARGET_HINTS = catalog.targets as string[];
export const domainLabel = (k: string) => DOMAINS.find((d) => d.key === k)?.label ?? k;
export const measureLabel = (k: string) => MEASURES.find((m) => m.key === k)?.label ?? k;

export const BARRIERS: Record<string, string> = {
  no_time: 'Vakit yoktu', forgot: 'Unuttum', child_resisted: 'Çocuk direndi', unsure: 'Nasıl yapacağımı bilemedim',
};

/* ---------- Okuma ---------- */
const GOAL_COLS = 'id, title, description, archived, created_at, domain, measure, baseline, target, weeks, home_support, shared, status, position, template_key';
const OLD_GOAL_COLS = 'id, title, description, archived, created_at';

export class PlanSchemaMissing extends Error {}
const isMissing = (e: { code?: string } | null) => e?.code === '42703' || e?.code === 'PGRST204' || e?.code === '42P01' || e?.code === 'PGRST205';

function scope<T extends { eq: (c: string, v: string) => T }>(q: T, t: PlanTarget): T {
  return t.kind === 'link' ? q.eq('link_id', t.linkId) : q.eq('invite_code', t.code);
}

export async function loadPlan(t: PlanTarget): Promise<{ goals: PlanGoal[]; modules: PlanModule[]; legacy: boolean }> {
  const withRatings = t.kind === 'link' ? `${GOAL_COLS}, goal_ratings(week, rating, note)` : GOAL_COLS;
  let g = await scope(supabase.from('clinic_goals').select(withRatings) as any, t).order('position').order('created_at');
  let legacy = false;
  if (g.error && isMissing(g.error)) {
    if (t.kind === 'invite') throw new PlanSchemaMissing('Takip planı için veritabanı güncellemesi bekleniyor.');
    legacy = true;
    g = await (supabase.from('clinic_goals').select(`${OLD_GOAL_COLS}, goal_ratings(week, rating, note)`) as any).eq('link_id', t.linkId).order('created_at');
  }
  if (g.error) throw new Error(g.error.message);
  const goals = ((g.data ?? []) as any[]).map(({ goal_ratings, ...x }) => ({
    domain: '', measure: 'level', baseline: '', target: '', weeks: null, home_support: '', shared: false, status: 'active',
    position: 0, template_key: null, ...x, ratings: goal_ratings ?? [],
  })) as PlanGoal[];
  if (legacy) return { goals, modules: [], legacy };
  const m = await scope(supabase.from('care_modules').select('id, title, aim, practice, checklist, position, status, template_key, created_at') as any, t)
    .order('position').order('created_at');
  if (m.error) {
    if (isMissing(m.error)) return { goals, modules: [], legacy: true };
    throw new Error(m.error.message);
  }
  return { goals, modules: (m.data ?? []) as PlanModule[], legacy };
}

export async function loadLogs(moduleIds: string[], sinceDays = 28): Promise<ModuleLog[]> {
  if (!moduleIds.length) return [];
  const since = new Date(Date.now() - sinceDays * 864e5).toISOString().slice(0, 10);
  const { data, error } = await supabase.from('care_module_logs').select('module_id, day, practiced, difficulty, barrier, note')
    .in('module_id', moduleIds).gte('day', since).order('day', { ascending: false });
  if (error) return [];
  return (data ?? []) as ModuleLog[];
}

/* ---------- Yazma ---------- */
const owner = (t: PlanTarget) => (t.kind === 'link'
  ? { link_id: t.linkId, clinic_id: t.clinicId }
  : { invite_code: t.code, clinic_id: t.clinicId });

export type GoalInput = Pick<PlanGoal, 'title' | 'description' | 'domain' | 'measure' | 'baseline' | 'target' | 'weeks' | 'home_support' | 'shared' | 'status'> & { template_key?: string | null; position?: number };
export type ModuleInput = Pick<PlanModule, 'title' | 'aim' | 'practice' | 'checklist' | 'status'> & { template_key?: string | null; position?: number };

// Yalnız tablo sütunları gider: düzenlenen hedef tam PlanGoal'dır (id, ratings, created_at…); PostgREST bilinmeyen sütunu reddeder
const GOAL_FIELDS = ['title', 'description', 'domain', 'measure', 'baseline', 'target', 'weeks', 'home_support', 'shared', 'status',
  'position', 'template_key', 'archived'] as const;
const MODULE_FIELDS = ['title', 'aim', 'practice', 'checklist', 'status', 'position', 'template_key'] as const;
const pick = (o: Record<string, unknown>, keys: readonly string[]) =>
  Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

const cleanGoal = (g: Partial<GoalInput> & { archived?: boolean }) => ({
  ...pick(g, GOAL_FIELDS),
  ...(g.title !== undefined && { title: g.title.trim().slice(0, 120) }),
  ...(g.description !== undefined && { description: g.description.trim().slice(0, 600) }),
  ...(g.baseline !== undefined && { baseline: g.baseline.trim().slice(0, 60) }),
  ...(g.target !== undefined && { target: g.target.trim().slice(0, 60) }),
  ...(g.home_support !== undefined && { home_support: g.home_support.trim().slice(0, 400) }),
});
const cleanModule = (m: Partial<ModuleInput>) => ({
  ...pick(m, MODULE_FIELDS),
  ...(m.title !== undefined && { title: m.title.trim().slice(0, 120) }),
  ...(m.aim !== undefined && { aim: m.aim.trim().slice(0, 400) }),
  ...(m.practice !== undefined && { practice: m.practice.trim().slice(0, 600) }),
  ...(m.checklist !== undefined && { checklist: m.checklist.map((c) => c.trim().slice(0, 120)).filter(Boolean).slice(0, 8) }),
});

export async function addGoals(t: PlanTarget, list: GoalInput[]): Promise<void> {
  if (!list.length) return;
  const { error } = await supabase.from('clinic_goals').insert(list.map((g) => ({ ...owner(t), ...cleanGoal(g) })));
  if (error) throw new Error(error.message);
}
export async function updateGoal(id: string, g: Partial<GoalInput> & { archived?: boolean }): Promise<void> {
  const { error } = await supabase.from('clinic_goals').update(cleanGoal(g)).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('clinic_goals').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
export async function addModules(t: PlanTarget, list: ModuleInput[]): Promise<void> {
  if (!list.length) return;
  const { error } = await supabase.from('care_modules').insert(list.map((m) => ({ ...owner(t), ...cleanModule(m) })));
  if (error) throw new Error(error.message);
}
export async function updateModule(id: string, m: Partial<ModuleInput>): Promise<void> {
  const { error } = await supabase.from('care_modules').update(cleanModule(m)).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function deleteModule(id: string): Promise<void> {
  const { error } = await supabase.from('care_modules').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
export async function rateGoal(clinicId: string, goalId: string, week: string, rating: number): Promise<void> {
  const { error } = await supabase.from('goal_ratings').upsert({ goal_id: goalId, clinic_id: clinicId, week, rating, note: '' }, { onConflict: 'goal_id,week' });
  if (error) throw new Error(error.message);
}
export async function publishPlan(linkId: string): Promise<void> {
  const { error } = await supabase.rpc('care_plan_publish', { p_link_id: linkId });
  if (error) throw new Error(error.message);
}

/* ---------- Şablondan ---------- */
export const goalFromTemplate = (g: GoalT, position = 0): GoalInput => ({
  title: g.title, description: '', domain: g.domain, measure: g.measure, baseline: '', target: g.target, weeks: g.weeks,
  home_support: g.home_support, shared: true, status: 'active', template_key: g.key, position,
});
export const moduleFromTemplate = (m: ModuleT, position = 0, status: ModuleStatus = 'planned'): ModuleInput => ({
  title: m.title, aim: m.aim, practice: m.practice, checklist: m.checklist, status, template_key: m.key, position,
});

// Paket: seçili hedefler + modüller (ilk modül etkin, diğerleri planlandı; mevcut şablonlar tekrar eklenmez)
export async function applyPackage(t: PlanTarget, p: PackageT, existing: { goals: PlanGoal[]; modules: PlanModule[] }, goalKeys = p.goals) {
  const haveG = new Set(existing.goals.map((g) => g.template_key).filter(Boolean));
  const haveM = new Set(existing.modules.map((m) => m.template_key).filter(Boolean));
  const gs = goalKeys.map((k) => GOAL_TEMPLATES.find((g) => g.key === k)).filter((g): g is GoalT => !!g && !haveG.has(g.key));
  const ms = p.modules.map((k) => MODULE_TEMPLATES.find((m) => m.key === k)).filter((m): m is ModuleT => !!m && !haveM.has(m.key));
  const anyActive = existing.modules.some((m) => m.status === 'active');
  await addGoals(t, gs.map((g, i) => goalFromTemplate(g, existing.goals.length + i)));
  await addModules(t, ms.map((m, i) => moduleFromTemplate(m, existing.modules.length + i, !anyActive && i === 0 ? 'active' : 'planned')));
}

/* ---------- Önceki uzmandan devralınan kayıtlar (ebeveyn rızasıyla, salt okunur, önceki uzman adsız) ---------- */
// ortak akislar.md 11: sunucu adı, unvanı, kliniği ve kimlikleri döndürmez; metinde geçen adlar "[önceki uzman]".
export type InheritedNote = { body: string; created_at: string };
export type InheritedSuggestion = {
  title: string; emoji: string; skill: string; category: string | null; description: string; note: string;
  recurring: boolean; status: string; created_at: string; decided_at: string | null;
};
export type InheritedRecord = {
  key: string; label: string; from: string; to: string | null;
  notes: InheritedNote[]; suggestions: InheritedSuggestion[]; goals: PlanGoal[]; modules: PlanModule[]; logs: ModuleLog[];
};
type RawGoal = Omit<PlanGoal, 'id' | 'shared' | 'position' | 'template_key' | 'ratings'> & { ratings: { week: string; rating: number }[] };
type RawModule = Omit<PlanModule, 'id' | 'position' | 'template_key'> & { logs: Omit<ModuleLog, 'module_id' | 'note'>[] };
type RawRecord = { n: number; label: string; from: string; to: string | null; notes: InheritedNote[]; suggestions: InheritedSuggestion[]; goals: RawGoal[]; modules: RawModule[] };

export async function loadInherited(linkId: string): Promise<InheritedRecord[]> {
  const { data, error } = await supabase.rpc('clinic_inherited_records', { p_link_id: linkId });
  if (error || !Array.isArray(data)) return [];
  return (data as RawRecord[]).map((r) => {
    const key = `h${r.n}`;
    const modules = (r.modules ?? []).map(({ logs, ...m }, i) => ({ ...m, id: `${key}-m${i}`, position: i, template_key: null, logs }));
    return {
      key, label: r.label, from: r.from, to: r.to, notes: r.notes ?? [], suggestions: r.suggestions ?? [],
      goals: (r.goals ?? []).map((g, i) => ({
        ...g, id: `${key}-g${i}`, shared: false, position: i, template_key: null,
        ratings: (g.ratings ?? []).map((x) => ({ ...x, note: '' })),
      })),
      modules: modules.map(({ logs, ...m }) => m),
      logs: modules.flatMap((m) => (m.logs ?? []).map((l) => ({ ...l, module_id: m.id, note: '' }))),
    };
  });
}

/* ---------- Ebeveyn kaydı özeti (uzmana) ---------- */
// Pencere bugüne kadar son `days` gün; devralınan (biten) dönemde modülün son kayıt gününe kadar.
// Zorlanma ebeveynin kendi bildirimi (1 çok kolay … 5 çok zor); ortalama/ölçek olarak gösterilmez, kaç kez olduğu sayılır.
export function logSummary(logs: ModuleLog[], moduleId: string, days = 14, endDay?: string) {
  const end = endDay ? new Date(`${endDay}T12:00:00Z`).getTime() : Date.now();
  const since = new Date(end - days * 864e5).toISOString().slice(0, 10);
  const mine = logs.filter((l) => l.module_id === moduleId && l.day >= since && (!endDay || l.day <= endDay));
  const practiced = new Set(mine.filter((l) => l.practiced).map((l) => l.day)).size;
  const ease = { easy: 0, medium: 0, hard: 0 };
  mine.forEach((l) => {
    if (l.difficulty == null) return;
    if (l.difficulty <= 2) ease.easy += 1; else if (l.difficulty === 3) ease.medium += 1; else ease.hard += 1;
  });
  const barriers: Record<string, number> = {};
  mine.filter((l) => l.barrier).forEach((l) => { barriers[l.barrier!] = (barriers[l.barrier!] ?? 0) + 1; });
  return { practiced, days, ease, barriers };
}

export const lastLogDay = (logs: ModuleLog[], moduleId: string) =>
  logs.filter((l) => l.module_id === moduleId).reduce<string | undefined>((a, l) => (!a || l.day > a ? l.day : a), undefined);
